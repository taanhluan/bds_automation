import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { facebookPost } from '../shared/facebook.js';
import { makePhotoCoverSvg, renderCover } from '../server/images.js';

const article = { source: 'Báo mẫu', url: 'https://vnexpress.net/tin-12345.html', summary: 'Nguồn giả lập cho kiểm thử, không phải bài báo thật.' };
const draft = { title: 'Bản tin thử nghiệm', content: 'Nội dung đã sửa.', facts: ['Dữ kiện mẫu. — RSS: Bằng chứng nội bộ.'], isDemo: false };

test('Facebook post includes title, edited content, concise details and full source URL', () => {
  const post = facebookPost(draft, article);
  assert.ok(post.startsWith(draft.title));
  assert.ok(post.includes(draft.content));
  assert.ok(post.includes('• Dữ kiện mẫu.'));
  assert.ok(post.endsWith(article.url));
  assert.ok(!post.includes('Bằng chứng nội bộ'));
});

test('exporting an already formatted Facebook post does not repeat titles, details or source', () => {
  const first = facebookPost(draft, article);
  assert.equal(facebookPost({ ...draft, content: first }, article), first);
  assert.equal(first.split(article.url).length, 2);
});

test('demo content never gets a fake publisher link', () => {
  assert.equal(facebookPost({ ...draft, isDemo: true }, { ...article, isDemo: true }), draft.content);
});

test('photo cover contains source, dates, details and distinct AI/upload labels', () => {
  const opts = { title: '<Tin thử>', topic: 'Nhà ở', source: article.source, sourceUrl: article.url, sourceSummary: article.summary, publishedAt: '2026-10-13T00:00:00Z' };
  const svg = makePhotoCoverSvg(opts);
  assert.ok(svg.includes('Nguồn: Báo mẫu'));
  assert.ok(svg.includes('13/10/2026'));
  assert.ok(svg.includes('vnexpress.net'));
  assert.ok(svg.includes(article.summary));
  assert.ok(svg.includes('&lt;Tin thử&gt;'));
  assert.ok(svg.includes('Ảnh minh họa AI'));
  assert.ok(makePhotoCoverSvg({ ...opts, imageKind: 'upload' }).includes('Ảnh do người dùng cung cấp'));
});

test('photo layout preserves a visible photo and exports a valid square PNG', async () => {
  const background = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#dfcbb7' } }).png().toBuffer();
  const cover = await renderCover({ title: draft.title, topic: 'Nhà ở', source: article.source, sourceUrl: article.url, sourceSummary: article.summary, background });
  const metadata = await sharp(cover).metadata();
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1080);
  const top = await sharp(cover).extract({ left: 500, top: 300, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.deepEqual([...top], [223, 203, 183]);
});
