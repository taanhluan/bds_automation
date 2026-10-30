import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createStore, localDay, validateSettings } from '../server/store.js';
import { createWorker } from '../server/worker.js';
import { demoArticles } from '../server/demo.js';
import { renderCover } from '../server/images.js';
import { parseFeed } from '../server/rss.js';

async function setup(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fbct-store-test-'));
  let store = createStore(directory);
  t.after(async () => {
    if (store.db.open) store.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  return {
    get store() { return store; },
    reopen() { store.close(); store = createStore(directory); return store; },
  };
}

const noNetwork = async () => { throw new Error('Tests must not make network or paid calls.'); };

test('50 daily requests are permitted and the next request is blocked', async (t) => {
  const { store } = await setup(t);
  store.saveSettings({ dailyDraftLimit: 50 });
  for (let index = 0; index < 50; index++) store.reserve({ id: `limit-${index}` }, 'text', store.settings().dailyDraftLimit);
  assert.equal(store.usage('text'), 50);
  assert.throws(() => store.reserve({ id: 'over-limit' }, 'text', store.settings().dailyDraftLimit), { code: 'quota' });
});

test('persistent cache avoids a second paid request, while explicit regenerate uses quota', async (t) => {
  const fixture = await setup(t);
  const article = { ...demoArticles()[0], isDemo: false };
  fixture.store.importArticles([article]);
  fixture.store.saveSettings({ autoGenerate: false, autoImage: false });
  let calls = 0;
  const build = async () => { calls++; return { title: article.title, content: article.summary, facts: [], reviewFlags: [], imageBrief: 'Nhà và cây xanh' }; };
  let worker = createWorker(fixture.store, { aiConfigured: true, buildDraft: build });
  worker.enqueueDraft(article.id);
  await worker.runOnce();
  const store = fixture.reopen();
  worker = createWorker(store, { aiConfigured: true, buildDraft: build });
  worker.enqueueDraft(article.id);
  await worker.runOnce();
  assert.equal(calls, 1);
  assert.equal(store.usage('text'), 1);
  assert.equal(store.drafts()[0].cacheHit, true);
  worker.enqueueDraft(article.id, { force: true });
  await worker.runOnce();
  assert.equal(calls, 2);
  assert.equal(store.usage('text'), 2);
  store.saveSettings({ tone: 'Giọng văn mới' });
  worker.enqueueDraft(article.id);
  await worker.runOnce();
  assert.equal(calls, 3);
});

test('explicit template mode creates real-article cover without image API or image quota', async (t) => {
  const { store } = await setup(t);
  const article = { ...demoArticles()[0], isDemo: false };
  store.importArticles([article]);
  store.saveSettings({ autoGenerate: false });
  const draft = draftFor(article);
  store.saveDraft(draft);
  const worker = createWorker(store, { aiConfigured: false, lowCostMode: true, generateBackground: noNetwork });
  worker.enqueueImage(draft.id, { templateOnly: true });
  await worker.runOnce();
  assert.equal(store.draft(draft.id).imageKind, 'template');
  assert.equal(store.draft(draft.id).imageStatus, 'ready');
  assert.equal(store.usage('image'), 0);
});

function draftFor(article, overrides = {}) {
  return {
    id: `draft-${article.id}`, articleId: article.id, revision: 1, contentRevision: 1,
    title: article.title, content: 'Bài nháp ban đầu để kiểm tra lưu trữ và xử lý ảnh.',
    aiContent: 'Bài nháp ban đầu để kiểm tra lưu trữ và xử lý ảnh.',
    facts: [], reviewFlags: [], imageBrief: 'Minh họa nhà ở và cây xanh',
    imageUrl: null, imageStatus: 'none', imageError: null,
    status: 'draft', isDemo: article.isDemo,
    sourceTitle: article.title, sourceSummary: article.summary,
    createdAt: '2026-10-13T00:00:00.000Z', updatedAt: '2026-10-13T00:00:00.000Z', copiedAt: null,
    ...overrides,
  };
}

test('persists articles, edited drafts, settings, metadata and quota across reopen', async (t) => {
  const context = await setup(t);
  const article = demoArticles()[0];
  const { store } = context;
  store.importArticles([article]);
  const draft = draftFor(article, { content: 'Nội dung do người dùng sửa và lưu.', contentRevision: 3, status: 'posted' });
  store.saveDraft(draft);
  store.saveSettings({ dailyDraftLimit: 7, autoFetch: false });
  store.setMeta('lastFetchedAt', '2026-10-13T05:00:00.000Z');
  const job = store.addJob('build_draft', { articleId: article.id });
  store.reserve(job, 'text', 7);

  const reopened = context.reopen();
  assert.deepEqual(reopened.article(article.id), article);
  assert.deepEqual(reopened.draft(draft.id), draft);
  assert.equal(reopened.settings().dailyDraftLimit, 7);
  assert.equal(reopened.settings().autoFetch, false);
  assert.equal(reopened.meta('lastFetchedAt'), '2026-10-13T05:00:00.000Z');
  assert.equal(reopened.usage('text'), 1);
  assert.equal(reopened.pendingJobs()[0].id, job.id);
});

test('canonical RSS imports deduplicate tracking URLs across successive refreshes', async (t) => {
  const { store } = await setup(t);
  const xml = (url) => `<rss version="2.0"><channel><title>Fictive source</title><link>https://vnexpress.net</link><description>Test</description><item><title>Thông tin thị trường bất động sản</title><link>${url}</link><description>Tóm tắt giả lập chỉ dùng cho kiểm thử, không phải nội dung báo.</description></item></channel></rss>`;
  const first = await parseFeed(xml('http://www.vnexpress.net/tin-thi-truong-12345.html?utm_source=facebook'));
  const second = await parseFeed(xml('https://vnexpress.net/tin-thi-truong-12345.html?fbclid=abc#comments'));
  assert.equal(store.importArticles(first), 1);
  assert.equal(store.importArticles(second), 0);
  assert.equal(store.articles().length, 1);
  assert.equal(store.articles()[0].url, 'https://vnexpress.net/tin-thi-truong-12345.html');
  assert.equal(store.articles()[0].id, first[0].id);
});

test('news list keeps newest publication first regardless of RSS insertion order', async (t) => {
  const { store } = await setup(t);
  const base = demoArticles()[0];
  store.importArticles([
    { ...base, id: 'newest', url: 'demo:newest', publishedAt: '2026-10-13T08:00:00.000Z' },
    { ...base, id: 'middle', url: 'demo:middle', publishedAt: '2026-10-12T08:00:00.000Z' },
    { ...base, id: 'oldest', url: 'demo:oldest', publishedAt: '2026-10-11T08:00:00.000Z' },
  ]);
  assert.deepEqual(store.articles().map(article => article.id), ['newest', 'middle', 'oldest']);
});

test('daily quotas reserve each job once, enforce the cap and survive failure/reopen', async (t) => {
  const context = await setup(t);
  const { store } = context;
  const first = store.addJob('build_draft', { articleId: 'quota-1' });
  const second = store.addJob('build_draft', { articleId: 'quota-2' });
  const third = store.addJob('build_draft', { articleId: 'quota-3' });
  store.reserve(first, 'text', 2);
  store.reserve(first, 'text', 2);
  store.reserve(second, 'text', 2);
  assert.equal(store.usage('text'), 2);
  assert.throws(() => store.reserve(third, 'text', 2), (error) => error.code === 'quota');
  store.saveJob({ ...first, status: 'failed', error: 'Provider response uncertain' });
  const reopened = context.reopen();
  assert.equal(reopened.usage('text'), 2);
  assert.throws(() => reopened.reserve(third, 'text', 2), (error) => error.code === 'quota');
  const image = reopened.addJob('generate_image', { articleId: 'quota-1', draftId: 'image-1' });
  reopened.reserve(image, 'image', 1);
  assert.equal(reopened.usage('image'), 1);
  assert.equal(reopened.usage('text'), 2);
});

test('quota day follows Vietnam time across UTC midnight boundaries', () => {
  assert.equal(localDay(new Date('2026-10-12T16:59:59Z')), '2026-10-12');
  assert.equal(localDay(new Date('2026-10-12T17:00:00Z')), '2026-10-13');
});

test('settings validate types and bounds, preserve previous values and exclude unknown keys', async (t) => {
  const { store } = await setup(t);
  const original = store.settings();
  const saved = store.saveSettings({ autoGenerate: false, dailyDraftLimit: 8, tone: '  Gần gũi  ', apiKey: 'do-not-store', unknown: true });
  assert.equal(saved.autoGenerate, false);
  assert.equal(saved.dailyDraftLimit, 8);
  assert.equal(saved.tone, 'Gần gũi');
  assert.equal(saved.audience, original.audience);
  assert.equal('apiKey' in saved, false);
  assert.equal('unknown' in saved, false);
  for (const invalid of [null, [], { autoFetch: 'true' }, { fetchIntervalMinutes: 4 }, { dailyDraftLimit: 0 }, { dailyImageLimit: 101 }, { dailyDraftLimit: 2.5 }, { tone: '' }, { audience: 'x'.repeat(201) }]) {
    assert.throws(() => validateSettings(invalid));
  }
  assert.deepEqual(store.settings(), saved);
});

test('enqueue returns the same active job and permits a new revision after completion', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  store.saveSettings({ autoImage: false });
  const worker = createWorker(store, { aiConfigured: false, fetchFeed: noNetwork, generateBackground: noNetwork });
  const first = worker.enqueueDraft(article.id);
  assert.equal(worker.enqueueDraft(article.id).id, first.id);
  assert.equal(store.jobs().length, 1);
  await worker.runOnce();
  const next = worker.enqueueDraft(article.id);
  assert.notEqual(next.id, first.id);
  await worker.runOnce();
  assert.deepEqual(store.drafts().map((draft) => draft.revision).sort(), [1, 2]);

  const draft = store.drafts()[0];
  const image = worker.enqueueImage(draft.id);
  assert.equal(worker.enqueueImage(draft.id).id, image.id);
  assert.equal(store.pendingJobs().filter((job) => job.type === 'generate_image').length, 1);
});

test('demo pipeline creates a persisted draft and a valid 1080px PNG without API access', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  const worker = createWorker(store, { aiConfigured: false, fetchFeed: noNetwork, generateBackground: noNetwork });
  // Any accidental paid/network call fails the test immediately.
  t.mock.method(globalThis, 'fetch', noNetwork);
  worker.enqueueDraft(article.id);
  await worker.runOnce();
  const draftBeforeImage = store.drafts()[0];
  assert.equal(draftBeforeImage.isDemo, true);
  assert.match(draftBeforeImage.content, /Nội dung mẫu/);
  assert.equal(draftBeforeImage.imageStatus, 'pending');
  await worker.runOnce();
  const draft = store.draft(draftBeforeImage.id);
  assert.equal(draft.imageStatus, 'ready');
  assert.equal(draft.imageKind, 'template');
  assert.match(draft.imageUrl, /^\/api\/assets\/[\da-f-]{36}\.png$/);
  const bytes = await fs.readFile(path.join(store.assetsDir, path.basename(draft.imageUrl)));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1350);
  assert.equal(metadata.format, 'png');
  assert.equal(store.usage('text'), 0);
  assert.equal(store.usage('image'), 0);
  assert.equal(store.article(article.id).status, 'generated');
  assert.ok(store.jobs().every((job) => job.status === 'completed'));
});

test('image failure retains the existing draft content and exposes the failure', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  const original = draftFor(article, { content: 'Bài viết của tôi đã chỉnh xong, không được mất khi lỗi tạo ảnh.' });
  store.saveDraft(original);
  const worker = createWorker(store, { aiConfigured: false, fetchFeed: noNetwork, generateBackground: noNetwork, renderCover: async () => { throw new Error('Lỗi xử lý ảnh giả lập'); } });
  const job = worker.enqueueImage(original.id);
  await worker.runOnce();
  const draft = store.draft(original.id);
  assert.equal(store.drafts().length, 1);
  assert.equal(draft.content, original.content);
  assert.equal(draft.aiContent, original.aiContent);
  assert.equal(draft.imageUrl, null);
  assert.equal(draft.imageStatus, 'error');
  assert.equal(draft.imageError, 'Lỗi xử lý ảnh giả lập');
  assert.equal(store.jobs().find((item) => item.id === job.id).status, 'failed');
});

test('manual edits made during asynchronous image generation survive and mark the image stale', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  const original = draftFor(article);
  store.saveDraft(original);
  let release;
  let imageStarted;
  const started = new Promise((resolve) => { imageStarted = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  const worker = createWorker(store, {
    aiConfigured: false, fetchFeed: noNetwork, generateBackground: noNetwork,
    renderCover: async (options) => { imageStarted(); await gate; return renderCover(options); },
  });
  worker.enqueueImage(original.id);
  const processing = worker.runOnce();
  await started;
  const edited = { ...store.draft(original.id), content: 'Nội dung tôi vừa sửa khi hình đang được dựng.', contentRevision: 2, status: 'posted', copiedAt: '2026-10-13T12:00:00.000Z' };
  store.saveDraft(edited);
  release();
  await processing;
  const final = store.draft(original.id);
  assert.equal(final.content, edited.content);
  assert.equal(final.contentRevision, 2);
  assert.equal(final.status, 'posted');
  assert.equal(final.copiedAt, edited.copiedAt);
  assert.equal(final.imageStatus, 'stale');
  assert.equal(final.imageContentRevision, 1);
  assert.match(final.imageError, /Bài đã được sửa/);
  assert.ok(final.imageUrl);
});

test('updated RSS source does not overwrite an existing manually edited draft', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  store.saveArticle({ ...article, status: 'generated' });
  const edited = draftFor(article, { content: 'Quan điểm riêng tôi đã chỉnh sửa.', contentRevision: 4 });
  store.saveDraft(edited);
  assert.equal(store.importArticles([{ ...article, id: 'different-source-id', title: 'Tiêu đề nguồn đã được cập nhật', summary: 'Nguồn cập nhật bổ sung thông tin mới, cần đọc lại để đối chiếu.' }]), 0);
  assert.equal(store.article(article.id).sourceUpdated, true);
  assert.equal(store.article(article.id).status, 'generated');
  assert.equal(store.article(article.id).title, 'Tiêu đề nguồn đã được cập nhật');
  assert.deepEqual(store.draft(edited.id), edited);
  assert.equal(store.articles().length, 1);
});

test('interrupted processing jobs become failed without automatically retrying paid work', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  const draft = draftFor(article, { imageStatus: 'processing' });
  store.saveDraft(draft);
  const job = store.addJob('generate_image', { articleId: article.id, draftId: draft.id });
  store.saveJob({ ...job, status: 'processing' });
  store.reserve(job, 'image', 3);
  store.recoverJobs();
  assert.equal(store.pendingJobs().length, 0);
  assert.equal(store.jobs()[0].status, 'failed');
  assert.match(store.jobs()[0].error, /Ứng dụng đã dừng/);
  assert.equal(store.draft(draft.id).imageStatus, 'error');
  assert.equal(store.draft(draft.id).content, draft.content);
  assert.equal(store.usage('image'), 1);
});

test('automatic generation only processes recent real articles up to the daily cap', async (t) => {
  const { store } = await setup(t);
  store.saveSettings({ dailyDraftLimit: 2, autoGenerate: true, autoImage: false });
  const now = new Date();
  const titles = ['Quy hoạch công viên ven sông tại An Phú', 'Căn hộ dành cho gia đình trẻ tại Bình Chánh', 'Chính sách thuế đất được nghiên cứu thay đổi', 'Thị trường văn phòng cho thuê khu trung tâm'];
  const entries = Array.from({ length: 4 }, (_, index) => ({ ...demoArticles()[0], title: titles[index], id: `real-${index}`, url: `https://vnexpress.net/test-${10000 + index}.html`, source: 'VnExpress', summary: `Nội dung nguồn độc lập cho bản tin kiểm thử ${index}.`, isDemo: false, contentScope: 'rss', publishedAt: now.toISOString() }));
  entries.push({ ...entries[0], id: 'too-old', url: 'https://vnexpress.net/too-old-20000.html', publishedAt: new Date(now.getTime() - 72 * 3600000).toISOString() });
  entries.push({ ...entries[0], id: 'missing-date', url: 'https://vnexpress.net/no-date-20001.html', publishedAt: null });
  store.importArticles(entries);
  const processed = [];
  const worker = createWorker(store, {
    aiConfigured: true, fetchFeed: noNetwork, generateBackground: noNetwork,
    buildDraft: async (article) => {
      processed.push(article.id);
      return { title: article.title, content: 'Nội dung kiểm thử chỉ lấy từ tóm tắt nguồn.', reviewFlags: [], facts: [] };
    },
  });
  await worker.runOnce();
  await worker.runOnce();
  await worker.runOnce();
  assert.equal(processed.length, 2);
  assert.equal(new Set(processed).size, 2);
  assert.ok(processed.every((id) => id.startsWith('real-')));
  assert.equal(store.usage('text'), 2);
  assert.equal(store.drafts().length, 2);
  assert.ok(store.drafts().every((draft) => draft.content.includes(store.article(draft.articleId).url)));
  assert.equal(store.pendingJobs().length, 0);
});

test('concurrent worker ticks and duplicate enqueue do not run the same API job twice', async (t) => {
  const { store } = await setup(t);
  const article = demoArticles()[0];
  store.importArticles([article]);
  store.saveSettings({ autoGenerate: false, autoImage: false });
  let release;
  let signalStarted;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { signalStarted = resolve; });
  let calls = 0;
  const worker = createWorker(store, {
    aiConfigured: false, fetchFeed: noNetwork, generateBackground: noNetwork,
    buildDraft: async () => { calls++; signalStarted(); await gate; return { title: article.title, content: 'Bản nháp được xây đúng một lần.', reviewFlags: [], facts: [] }; },
  });
  const job = worker.enqueueDraft(article.id);
  const firstTick = worker.runOnce();
  await started;
  assert.equal(worker.enqueueDraft(article.id).id, job.id);
  await worker.runOnce();
  assert.equal(calls, 1);
  release();
  await firstTick;
  assert.equal(store.drafts().length, 1);
  assert.equal(store.jobs().length, 1);
  assert.equal(store.jobs()[0].status, 'completed');
});

test('free pipeline creates a real draft and PNG without API key, with a shared 50-draft cap', async t => {
  const { store } = await setup(t);
  const article = { ...demoArticles()[0], isDemo: false };
  store.importArticles([article]);
  store.saveSettings({ writingMode: 'free', autoGenerate: false, dailyDraftLimit: 2 });
  t.mock.method(globalThis, 'fetch', noNetwork);
  const worker = createWorker(store, { aiConfigured: false, lowCostMode: false, generateBackground: noNetwork });
  worker.enqueueDraft(article.id);
  await worker.runOnce();
  await worker.runOnce();
  const draft = store.drafts()[0];
  assert.equal(draft.generationProvider, 'local');
  assert.equal(draft.generationModel, null);
  assert.equal(draft.imageStatus, 'ready');
  assert.equal(draft.imageKind, 'template');
  assert.equal(store.usage('text'), 0);
  assert.equal(store.usage('local-text'), 1);
  assert.equal(store.usage('image'), 0);
  store.reserve({ id: 'paid-and-local-share-cap' }, 'text', 2);
  assert.throws(() => store.reserve({ id: 'extra-local' }, 'local-text', 2), { code: 'quota' });
  assert.equal(store.draftUsage(), 2);
});

test('queued writing mode is preserved and changing relevant project context invalidates cache', async t => {
  const { store } = await setup(t);
  const article = { ...demoArticles()[0], title: 'Tin quy hoạch tại An Phú', isDemo: false };
  store.importArticles([article]);
  store.saveSettings({ autoGenerate: false, autoImage: false, writingMode: 'free' });
  const worker = createWorker(store, { aiConfigured: true, generateBackground: noNetwork });
  const job = worker.enqueueDraft(article.id);
  store.saveSettings({ writingMode: 'ai' });
  assert.equal(job.settingsSnapshot.writingMode, 'free');
  t.mock.method(globalThis, 'fetch', noNetwork);
  await worker.runOnce();
  assert.equal(store.drafts()[0].generationProvider, 'local');
  let calls = 0;
  const paid = createWorker(store, { aiConfigured: true, buildDraft: async () => {
    calls++;
    return { title: article.title, content: article.summary, facts: [], reviewFlags: [] };
  }});
  paid.enqueueDraft(article.id); await paid.runOnce();
  paid.enqueueDraft(article.id); await paid.runOnce();
  assert.equal(calls, 1);
  store.saveSettings({ projectContext: 'Liên hệ: An Phú\nDự án: Nhà mẫu kiểm thử' });
  paid.enqueueDraft(article.id); await paid.runOnce();
  assert.equal(calls, 2);
  store.saveSettings({ focusArea: 'Khu Đông' });
  paid.enqueueDraft(article.id); await paid.runOnce();
  assert.equal(calls, 3);
});
