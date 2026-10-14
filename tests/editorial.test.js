import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore, validateSettings } from '../server/store.js';
import { createWorker } from '../server/worker.js';
import { createApp } from '../server/app.js';
import { selectDailyArticles, reviewDraft, approvalDigest } from '../server/editorial.js';
import { importArticleLink } from '../server/rss.js';
import { validateGroundedDraft } from '../server/ai.js';

const article = { id: 'article', title: 'Đề xuất mở công viên ven sông tại An Phú', summary: 'Khu vực An Phú đang nghiên cứu bổ sung công viên ven sông để phục vụ nhu cầu sinh hoạt của cư dân.', url: 'https://vnexpress.net/test-123456.html', source: 'VnExpress', topic: 'Quy hoạch', publishedAt: new Date().toISOString(), status: 'new', isDemo: false };
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fbct-editorial-'));
  const store = createStore(dir);
  t.after(async () => { store.close(); await fs.rm(dir, { recursive: true, force: true }); });
  store.importArticles([article]);
  store.saveSettings({ autoGenerate: false, autoImage: false });
  return store;
}
function draftFor() {
  return { id: 'draft', articleId: article.id, revision: 1, contentRevision: 1, title: article.title, content: article.summary, sourceTitle: article.title, sourceSummary: article.summary, imageUrl: '/api/assets/11111111-1111-4111-8111-111111111111.png', imageStatus: 'ready', imageContentRevision: 1, status: 'draft', isDemo: false, createdAt: new Date().toISOString() };
}

test('automatic selection excludes stale, missing dates, unrelated areas and duplicate events', () => {
  const entries = [article, { ...article, id: 'duplicate', url: 'https://vnexpress.net/duplicate-123457.html' }, { ...article, id: 'old', publishedAt: '2020-01-01T00:00:00Z' }, { ...article, id: 'no-date', publishedAt: null }, { ...article, id: 'outside', title: 'Quy hoạch khu đô thị tại Hà Nội', summary: 'Một bản tin không nhắc địa danh ưu tiên trong cấu hình người dùng.' }];
  assert.equal(selectDailyArticles(entries, [], { focusArea: 'An Phú' }).length, 1);
  assert.equal(selectDailyArticles(entries, [article], { focusArea: 'An Phú' }).length, 0);
});

test('target caps preparation even when regenerated cache hits do not use API quota', async t => {
  const store = await fixture(t);
  store.saveSettings({ autoGenerate: true, dailyTarget: 3 });
  for (let i = 0; i < 3; i++) store.saveDraft({ ...draftFor(), id: `existing-${i}`, revision: i + 1 });
  store.importArticles([{ ...article, id: 'new', title: 'Chính sách thuế đất cho doanh nghiệp', url: 'https://vnexpress.net/new-765432.html' }]);
  let calls = 0;
  const worker = createWorker(store, { aiConfigured: true, buildDraft: async () => { calls++; return { content: article.summary }; } });
  await worker.runOnce();
  assert.equal(calls, 0);
  assert.equal(store.pendingJobs().length, 0);
});

test('style reference changes invalidate the cache, while identical requests stay cached', async t => {
  const store = await fixture(t); let calls = 0;
  const worker = createWorker(store, { aiConfigured: true, buildDraft: async () => { calls++; return { title: article.title, content: article.summary }; } });
  worker.enqueueDraft(article.id); await worker.runOnce();
  worker.enqueueDraft(article.id); await worker.runOnce();
  assert.equal(calls, 1);
  store.saveSettings({ styleSamples: 'Cách viết mới do chủ kênh lựa chọn.' });
  worker.enqueueDraft(article.id); await worker.runOnce();
  assert.equal(calls, 2);
});

test('approved content is revoked when image, revision or source changes', () => {
  const draft = draftFor();
  draft.approval = { revision: 1, digest: approvalDigest(draft) };
  assert.equal(reviewDraft(draft, article).status, 'approved');
  assert.notEqual(reviewDraft({ ...draft, imageUrl: '/api/assets/replaced.png' }, article).status, 'approved');
  assert.equal(reviewDraft({ ...draft, imageStatus: 'stale' }, article).ready, false);
  assert.equal(reviewDraft(draft, { ...article, sourceUpdated: true, summary: 'Nguồn đã đổi.' }).ready, false);
});

test('approval endpoint requires explicit review and rejects concurrent edits', async t => {
  const store = await fixture(t); store.saveDraft(draftFor());
  const worker = createWorker(store, { aiConfigured: false });
  const app = createApp(store, worker);
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const send = (url, body, method = 'POST') => fetch(endpoint + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const valid = { sourceChecked: true, revision: 1, digest: approvalDigest(store.draft('draft')) };
  assert.equal((await send('/api/drafts/draft/approve', { ...valid, sourceChecked: false })).status, 400);
  assert.equal((await send('/api/drafts/draft/approve', { ...valid, revision: 2 })).status, 409);
  assert.equal((await send('/api/drafts/draft/approve', valid)).status, 200);
  assert.ok(store.draft('draft').approval.approvedAt);
  assert.equal(store.draft('draft').status, 'draft'); // Approval is not publication.
  assert.equal((await send('/api/drafts/draft', { content: `${article.summary} Cần theo dõi tiến độ.` }, 'PATCH')).status, 200);
  assert.equal(store.draft('draft').approval, null);
  assert.equal((await send('/api/drafts/draft/approve', valid)).status, 409);
  const next = { ...valid, revision: 2, digest: approvalDigest(store.draft('draft')) };
  assert.equal((await send('/api/drafts/draft/approve', next)).status, 400); // Image must be rechecked.
  assert.equal((await send('/api/drafts/draft/image/confirm', { revision: 2 })).status, 200);
  assert.equal((await send('/api/drafts/draft/approve', next)).status, 200);
  assert.equal((await send('/api/drafts/draft/metrics', { views: 10 }, 'PUT')).status, 400);
  await send('/api/drafts/draft', { status: 'posted' }, 'PATCH');
  assert.equal((await send('/api/drafts/draft/metrics', { views: -1 }, 'PUT')).status, 400);
  assert.equal((await send('/api/drafts/draft/metrics', { views: 120, clicks: 0, inquiries: 3 }, 'PUT')).status, 200);
  assert.equal(store.draft('draft').metrics.followers, null);
  assert.equal(store.draft('draft').metrics.clicks, 0);
  assert.equal(store.draft('draft').metrics.source, 'manual');
});

test('new analytical fields cannot smuggle numbers from style examples', () => {
  const base = { status: 'ready', title: article.title, benefits: [{ condition: 'công viên được triển khai theo nhu cầu', benefit: 'cải thiện môi trường sống' }], watchpoint: 'Cần theo dõi tiến độ.', question: 'Bạn quan tâm tiêu chí nào của công viên?', hashtags: ['#AnPhu'], contextUsed: false, reviewFlags: [], imageBrief: 'Minh họa cây xanh.', audienceNote: '', mechanism: 'Công viên có thể bổ sung không gian sinh hoạt nếu được triển khai phù hợp.' };
  assert.ok(validateGroundedDraft(base, article).mechanism);
  assert.throws(() => validateGroundedDraft({ ...base, mechanism: 'Giá căn hộ chỉ từ 1,58 tỷ.' }, article), { code: 'needs_context' });
  const normalized = validateGroundedDraft({ ...base, benefits: [{ condition: 'nếu công viên được triển khai', benefit: 'có thể cải thiện môi trường sống' }] }, article);
  assert.ok(!normalized.content.includes('Nếu nếu'));
  assert.ok(!normalized.content.includes('có thể có thể'));
});

test('settings reject targets outside 3–5 and credentials embedded in website links', () => {
  assert.throws(() => validateSettings({ dailyTarget: 20 }));
  assert.throws(() => validateSettings({ websiteUrl: 'https://user:pass@example.org' }));
  assert.throws(() => validateSettings({ websiteUrl: 'javascript:alert(1)' }));
  assert.equal(validateSettings({ dailyTarget: 3 }).dailyTarget, 3);
});

test('link import rejects arbitrary hosts before network and bounds source metadata', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls++; assert.equal(options.redirect, 'error'); return new Response(`<html><meta property="og:title" content="${article.title}"><meta property="og:description" content="${article.summary}"></html>`, { headers: { 'content-type': 'text/html' } }); });
  await assert.rejects(importArticleLink('http://127.0.0.1/admin'));
  assert.equal(calls, 0);
  const imported = await importArticleLink(article.url);
  assert.equal(imported.summary, article.summary);
  assert.equal(imported.publishedAt, null);
  assert.equal(imported.contentScope, 'metadata');
  assert.equal(calls, 1);
});
