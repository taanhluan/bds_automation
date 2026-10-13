import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStore } from '../server/store.js';
import { createWorker } from '../server/worker.js';

function fixture(context) {
  const dir = mkdtempSync(path.join(tmpdir(), 'fb-ct-worker-test-'));
  let store = createStore(dir);
  store.saveSettings({ autoFetch: false, autoGenerate: true, autoImage: false, dailyDraftLimit: 3 });
  const article = {
    id: 'recovery-source',
    title: 'Không gian sinh hoạt chung trong khu nhà ở',
    summary: 'Một khu nhà ở điều chỉnh thiết kế để bổ sung diện tích cây xanh và không gian sinh hoạt chung.',
    url: 'https://example.org/recovery-source',
    source: 'Nguồn thử nghiệm',
    topic: 'Nhà ở',
    publishedAt: new Date().toISOString(),
    status: 'new',
    isDemo: false,
  };
  store.importArticles([article]);
  context.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return {
    get store() { return store; },
    article,
    restart() { store.close(); store = createStore(dir); store.recoverJobs(); return store; },
  };
}

const generated = (article) => ({ title: article.title, content: article.summary, facts: [], reviewFlags: [], imageBrief: 'Nhà ở và cây xanh.' });

test('a crashed paid text request is never automatically resubmitted after restart', async (context) => {
  const fixtureData = fixture(context);
  const { article } = fixtureData;
  const job = fixtureData.store.addJob('build_draft', { articleId: article.id, draftId: null, articleSnapshot: article });
  fixtureData.store.reserve(job, 'text', 3);
  fixtureData.store.saveJob({ ...job, status: 'processing' });
  const store = fixtureData.restart();
  let providerCalls = 0;
  const worker = createWorker(store, { aiConfigured: true, buildDraft: async () => { providerCalls += 1; return generated(article); } });
  assert.equal(store.article(article.id).status, 'uncertain');
  assert.equal(store.jobs()[0].status, 'failed');
  await worker.runOnce();
  await worker.runOnce();
  assert.equal(providerCalls, 0);
  assert.equal(store.jobs().length, 1);
  assert.equal(store.usage('text'), 1);
});

test('unstarted queued work survives restart and reserves quota exactly once', async (context) => {
  const fixtureData = fixture(context);
  const { article } = fixtureData;
  fixtureData.store.addJob('build_draft', { articleId: article.id, draftId: null, articleSnapshot: article });
  const store = fixtureData.restart();
  let providerCalls = 0;
  const worker = createWorker(store, { aiConfigured: true, buildDraft: async () => { providerCalls += 1; return generated(article); } });
  assert.equal(store.jobs()[0].status, 'pending');
  await worker.runOnce();
  await worker.runOnce();
  assert.equal(providerCalls, 1);
  assert.equal(store.jobs().length, 1);
  assert.equal(store.jobs()[0].status, 'completed');
  assert.equal(store.drafts().length, 1);
  assert.equal(store.usage('text'), 1);
  assert.match(store.drafts()[0].content, /Nguồn: Nguồn thử nghiệm/u);
  assert.ok(store.drafts()[0].content.includes(article.url));
});

test('uncertain network failures consume one attempt and stop automatic retries', async (context) => {
  const { store, article } = fixture(context);
  let providerCalls = 0;
  const worker = createWorker(store, {
    aiConfigured: true,
    buildDraft: async () => {
      providerCalls += 1;
      const error = new Error('Kết quả chưa xác định; không tự gửi lại.');
      error.code = 'uncertain';
      throw error;
    },
  });
  await worker.runOnce();
  await worker.runOnce();
  assert.equal(providerCalls, 1);
  assert.equal(store.usage('text'), 1);
  assert.equal(store.jobs()[0].status, 'failed');
  assert.notEqual(store.article(article.id).status, 'new');
  assert.deepEqual(store.drafts(), []);
});

test('duplicate manual submissions coalesce and daily caps block extra paid calls', async (context) => {
  const { store, article } = fixture(context);
  store.saveSettings({ autoGenerate: false, dailyDraftLimit: 1 });
  let providerCalls = 0;
  const worker = createWorker(store, { aiConfigured: true, buildDraft: async () => { providerCalls += 1; return generated(article); } });
  const first = worker.enqueueDraft(article.id);
  assert.equal(worker.enqueueDraft(article.id).id, first.id);
  await worker.runOnce();
  worker.enqueueDraft(article.id, { force: true });
  await worker.runOnce();
  assert.equal(providerCalls, 1);
  assert.equal(store.usage('text'), 1);
  assert.equal(store.drafts().length, 1);
  assert.equal(store.jobs()[0].status, 'failed');
  assert.match(store.jobs()[0].error, /hạn mức/u);
});
