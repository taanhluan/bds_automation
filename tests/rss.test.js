import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanFeedText, FEED_URL, MAX_FEED_BYTES, normalizeArticleUrl, parseFeed, fetchFeed } from '../server/rss.js';

const NOW = new Date('2026-10-13T12:00:00.000Z');
const article = (title, slug, description = '', date = '') => `
  <item><title>${title}</title><link>https://vnexpress.net/${slug}.html</link>
  <description><![CDATA[${description}]]></description>${date ? `<pubDate>${date}</pubDate>` : ''}</item>`;
const feed = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Test feed</title><link>https://vnexpress.net</link><description>Fictive test fixtures</description>${items}</channel></rss>`;

test('canonicalizes publisher URLs and preserves meaningful query parameters', () => {
  assert.equal(normalizeArticleUrl('http://www.vnexpress.net/gia-nha-12345.html?utm_source=fb&foo=bar&fbclid=123#comments'), 'https://vnexpress.net/gia-nha-12345.html?foo=bar');
  assert.equal(normalizeArticleUrl('https://vnexpress.net/gia-nha-12345.html?b=2&a=1'), 'https://vnexpress.net/gia-nha-12345.html?a=1&b=2');
});

test('rejects arbitrary links, credentials, nonstandard ports and non-article URLs', () => {
  for (const url of [
    'javascript:alert(1)', 'file:///etc/passwd', 'https://vnexpress.net.evil.test/tin-12345.html',
    'https://evil.test/tin-12345.html', 'https://vnexpress.net@evil.test/tin-12345.html',
    'https://user:pass@vnexpress.net/tin-12345.html', 'https://vnexpress.net:8443/tin-12345.html',
    'https://vnexpress.net', 'https://vnexpress.net/rss/bat-dong-san.rss', '/tin-12345.html',
  ]) assert.equal(normalizeArticleUrl(url), null, url);
});

test('cleans encoded HTML, thumbnails, scripts, and numeric entities to plain text', () => {
  assert.equal(cleanFeedText('&lt;a href="https://example.test"&gt;&lt;img src="x" /&gt;&lt;/a&gt;Giá&nbsp;nhà &#x1edf; Hà Nội &amp; TP HCM<script>alert(1)</script>'), 'Giá nhà ở Hà Nội & TP HCM');
  assert.equal(cleanFeedText('&amp;lt;script&amp;gt;steal()&amp;lt;/script&amp;gt;Thông tin an toàn'), 'Thông tin an toàn');
  assert.equal(cleanFeedText('Tin &#0; &#xD800; &#x110000; mới'), 'Tin mới');
});

test('normalizes a real-shaped RSS item without inventing full article content', async () => {
  const [item] = await parseFeed(feed(article('Giá căn hộ &amp; nhà ở', 'gia-can-ho-12345', '<a href="x"><img src="thumb.jpg"></a> Giá nhà tăng &amp; nguồn cung giảm.', 'Tue, 13 Oct 2026 10:00:00 +0700')), { now: NOW });
  assert.equal(item.title, 'Giá căn hộ & nhà ở');
  assert.equal(item.summary, 'Giá nhà tăng & nguồn cung giảm.');
  assert.equal(item.source, 'VnExpress');
  assert.equal(item.publishedAt, '2026-10-13T03:00:00.000Z');
  assert.equal(item.fetchedAt, NOW.toISOString());
  assert.equal(item.topic, 'Nhà ở');
  assert.equal(item.contentScope, 'rss');
  assert.equal(item.isDemo, false);
  assert.equal(item.status, 'new');
  assert.match(item.id, /^[\da-f]{64}$/);
});

test('deduplicates canonical article URLs with deterministic IDs', async () => {
  const xml = feed(`<item><title>Thị trường địa ốc</title><link>http://www.vnexpress.net/thi-truong-12345.html?utm_source=feed</link></item><item><title>Thị trường địa ốc lần hai</title><link>https://vnexpress.net/thi-truong-12345.html#comments</link></item>`);
  const first = await parseFeed(xml, { now: NOW });
  const second = await parseFeed(xml, { now: new Date('2026-10-14T00:00:00Z') });
  assert.equal(first.length, 1);
  assert.equal(first[0].id, second[0].id);
});

test('skips malformed links and empty titles; dates remain null when absent or invalid', async () => {
  const xml = feed(article('Tin nguồn không ngày', 'khong-ngay-12345') + article('Tin ngày không hợp lệ', 'ngay-sai-23456', '', 'not a date') + '<item><title>Không dùng link lạ</title><link>https://evil.test/tin-12345.html</link></item>' + article(' ', 'khong-tieu-de-34567'));
  const items = await parseFeed(xml, { now: NOW });
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((item) => item.publishedAt), [null, null]);
});

test('rejects impossible calendar dates instead of rolling them into the next month', async () => {
  const xml = feed(article('Tin ngày không tồn tại', 'ngay-khong-ton-tai-12345', '', 'Mon, 30 Feb 2026 10:00:00 +0700') + article('Tin ngày ISO không tồn tại', 'ngay-iso-sai-23456', '', '2026-02-30T10:00:00+07:00'));
  assert.deepEqual((await parseFeed(xml)).map((item) => item.publishedAt), [null, null]);
});

test('assigns the four supported real estate topics', async () => {
  const xml = feed(article('Chính sách thuế mới', 'chinh-sach-12345') + article('Quy hoạch đường vành đai', 'quy-hoach-23456') + article('Căn hộ có thêm nguồn cung', 'can-ho-34567') + article('Thị trường địa ốc tăng trưởng', 'thi-truong-45678'));
  assert.deepEqual((await parseFeed(xml)).map((item) => item.topic), ['Chính sách', 'Quy hoạch', 'Nhà ở', 'Thị trường']);
});

test('caps feed output to 100 articles', async () => {
  const xml = feed(Array.from({ length: 110 }, (_, i) => article(`Thông tin BĐS số ${i}`, `tin-${i + 10000}`)).join(''));
  assert.equal((await parseFeed(xml)).length, 100);
});

test('rejects oversized feeds, malformed XML and malicious entity declarations', async () => {
  await assert.rejects(parseFeed('x'.repeat(MAX_FEED_BYTES + 1)), /2 MB/);
  await assert.rejects(parseFeed('<rss><broken>'), /Không đọc được/);
  await assert.rejects(parseFeed('<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' + feed('')), /khai báo XML/);
  await assert.rejects(parseFeed('<!ENTITY xxe SYSTEM "https://evil.test/secret">' + feed('')), /khai báo XML/);
});

test('fetches only the fixed feed with bounded timeout and redirects disabled', async (t) => {
  const calls = [];
  const stub = async (url, options) => {
    calls.push({ url, options });
    return new Response(feed(article('Nguồn tin bất động sản', 'nguon-tin-12345')), { status: 200 });
  };
  t.mock.method(globalThis, 'fetch', stub);
  const items = await fetchFeed();
  assert.equal(items.length, 1);
  assert.equal(calls[0].url, FEED_URL);
  assert.equal(calls[0].options.redirect, 'error');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

test('rejects oversized HTTP feed before parsing its body', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('too large', { headers: { 'content-length': String(MAX_FEED_BYTES + 1) } }));
  await assert.rejects(fetchFeed(), /2 MB/);
});

test('enforces the streaming size limit even without Content-Length', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array(MAX_FEED_BYTES + 1)));
  await assert.rejects(fetchFeed(), /2 MB/);
});
