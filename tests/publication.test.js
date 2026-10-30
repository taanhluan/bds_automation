import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';
import { approvalDigest } from '../server/editorial.js';
import { publicPosts } from '../server/publication.js';

const article = { id: 'source', title: 'Nghiên cứu công viên ven sông', summary: 'Khu vực đang nghiên cứu bổ sung công viên ven sông để phục vụ nhu cầu sinh hoạt của cư dân.', url: 'https://vnexpress.net/cong-vien-123456.html', topic: 'Quy hoạch', source: 'VnExpress', status: 'new' };
const filename = '11111111-1111-4111-8111-111111111111.png';
function draft(extra = {}) {
  const d = { id: 'draft', createdAt: '2026-10-30T01:00:00Z', articleId: article.id, revision: 1, contentRevision: 1, title: article.title, content: article.summary, imageUrl: `/api/assets/${filename}`, imageStatus: 'ready', imageContentRevision: 1, status: 'draft', ...extra };
  return { ...d, approval: { revision: d.contentRevision, digest: approvalDigest(d), approvedAt: '2026-10-30T01:00:00Z' } };
}
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vincente-test-'));
  const store = createStore(dir);
  t.after(async () => { store.close(); await fs.rm(dir, { recursive: true, force: true }); });
  store.importArticles([article]); return store;
}
test('public feed exposes only an allowlisted view of real approved content', async t => {
  const store = await fixture(t); store.saveDraft(draft({ secret: 'never-expose', contentMode: 'project' }));
  const post = publicPosts(store)[0];
  assert.equal(post.id, 'draft'); assert.equal(post.contentMode, 'project'); assert.equal(post.imageUrl, `/api/public/assets/${filename}`);
  assert.equal(post.secret, undefined); assert.equal(post.approval, undefined); assert.equal(post.articleId, undefined);
  for (const extra of [{ isDemo: true }, { status: 'archived' }, { approval: null }, { imageStatus: 'stale' }, { imageContentRevision: 2 }, { content: 'Unreviewed change' }]) {
    store.saveDraft({ ...draft(), ...extra }); assert.equal(publicPosts(store).length, 0);
  }
});
test('changing a source withdraws its published analysis and duplicate source revisions collapse', async t => {
  const store = await fixture(t);
  store.saveDraft(draft()); store.saveDraft(draft({ id: 'new', revision: 2 }));
  assert.equal(publicPosts(store).length, 1);
  store.importArticles([{ ...article, summary: 'Nguồn cập nhật nội dung mới cần được kiểm tra lại trước khi đưa ra công chúng.' }]);
  assert.equal(publicPosts(store).length, 0);
});
test('HTTP access: public feed works, private APIs and unpublished assets stay protected, sessions revoke on logout', async t => {
  const store = await fixture(t); store.saveDraft(draft());
  await fs.writeFile(path.join(store.assetsDir, filename), 'test-image');
  const previous = { user: process.env.ACCESS_USERNAME, password: process.env.ACCESS_PASSWORD };
  process.env.ACCESS_USERNAME = 'test-owner'; process.env.ACCESS_PASSWORD = 'test-password';
  t.after(() => { for (const [key, value] of [['ACCESS_USERNAME', previous.user], ['ACCESS_PASSWORD', previous.password]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const app = createApp(store, { busy: false });
  const server = await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.on('error', reject); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = url => fetch(base + url);
  const send = (url, body, cookie) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  assert.equal((await get('/api/public/posts')).status, 200);
  assert.equal((await get('/api/state')).status, 401);
  assert.equal((await get(`/api/assets/${filename}`)).status, 401);
  assert.equal((await get(`/api/public/assets/${filename}`)).status, 200);
  assert.equal((await get('/api/public/assets/22222222-2222-4222-8222-222222222222.png')).status, 404);
  assert.equal((await send('/api/settings', {})).status, 401);
  assert.equal((await send('/api/auth/login', { username: 'test-owner', password: 'wrong' })).status, 401);
  const login = await send('/api/auth/login', { username: 'test-owner', password: 'test-password' });
  assert.equal(login.status, 200); const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/); assert.match(login.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await fetch(base + '/api/state', { headers: { Cookie: cookie } })).status, 200);
  const cross = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://outside.example' } });
  assert.equal(cross.status, 403);
  assert.equal((await send('/api/auth/logout', {}, cookie)).status, 200);
  assert.equal((await fetch(base + '/api/state', { headers: { Cookie: cookie } })).status, 401);
  store.saveDraft({ ...draft(), approval: null });
  assert.equal((await get(`/api/public/assets/${filename}`)).status, 404);
  delete process.env.ACCESS_PASSWORD;
  assert.equal((await get('/api/state')).status, 503);
  assert.equal((await get('/api/public/posts')).status, 200);
  assert.equal((await send('/api/auth/login', { username: 'anything', password: 'anything' })).status, 503);
});

test('news sync exposes RSS metadata when no approved draft exists, never private draft content', async t => {
  const { publicNews } = await import('../server/publication.js');
  const store = await fixture(t);
  store.saveDraft({ ...draft(), approval: null, content: 'PRIVATE DRAFT TEXT', sourceContext: 'PRIVATE CONTEXT' });
  const news = publicNews(store);
  assert.equal(news.length, 1);
  assert.equal(news[0].kind, 'source');
  assert.equal(news[0].content, article.summary);
  assert.equal(news[0].sourceUrl, article.url);
  assert.equal(news[0].publishedAt, null);
  assert.equal(news[0].sourceContext, undefined);
  assert.equal(news[0].imageUrl, null);
  assert.doesNotMatch(JSON.stringify(news), /PRIVATE/);
});

test('approved editorial replaces RSS duplicate; revoking it restores only public source summary', async t => {
  const { publicNews } = await import('../server/publication.js');
  const store = await fixture(t);
  store.saveDraft(draft());
  assert.equal(publicNews(store).length, 1);
  assert.equal(publicNews(store)[0].kind, 'editorial');
  store.saveDraft({ ...draft(), approval: null });
  assert.equal(publicNews(store).length, 1);
  assert.equal(publicNews(store)[0].kind, 'source');
});

test('news sync excludes demos, malformed links, unsafe hosts, empty sources and private fields', async t => {
  const { publicNews } = await import('../server/publication.js');
  const store = await fixture(t);
  store.importArticles([
    { ...article, id: 'demo', isDemo: true, url: 'https://vnexpress.net/demo-123457.html' },
    { ...article, id: 'unsafe', url: 'https://attacker.example/news-123458.html' },
    { ...article, id: 'empty', summary: '', url: 'https://vnexpress.net/empty-123459.html' },
    { ...article, id: 'invalid', url: 'javascript:alert(1)' },
  ]);
  assert.equal(publicNews(store).length, 1);
});
