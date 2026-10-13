import { createHash } from 'node:crypto';
import Parser from 'rss-parser';

export const FEED_URL = 'https://vnexpress.net/rss/bat-dong-san.rss';
export const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_FEED_ENTRIES = 100;

const parser = new Parser({
  customFields: { item: ['description'] },
});

const HTML_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', ndash: '–', mdash: '—', bull: '•', middot: '·',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', yen: '¥',
};

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name[0] !== '#') return HTML_ENTITIES[name.toLowerCase()] ?? entity;
    const isHex = name[1]?.toLowerCase() === 'x';
    const point = Number.parseInt(name.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (!Number.isFinite(point) || point < 0x20 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) {
      return ' ';
    }
    return String.fromCodePoint(point);
  });
}

/** RSS descriptions can contain HTML; only plain text is returned to consumers. */
export function cleanFeedText(value, maxLength = 5000) {
  if (typeof value !== 'string') return '';
  let text = value;
  for (let pass = 0; pass < 3; pass += 1) {
    text = decodeEntities(text);
  }
  return text
    .replace(/<(script|style|iframe|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Canonicalize only the publisher's article URLs, never arbitrary remote URLs. */
export function normalizeArticleUrl(input) {
  if (typeof input !== 'string' || input.length > 4096) return null;
  try {
    const url = new URL(input.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!['vnexpress.net', 'www.vnexpress.net'].includes(url.hostname.toLowerCase())) return null;
    if (url.username || url.password || (url.port && !['80', '443'].includes(url.port))) return null;
    // VnExpress article links end in a numeric story ID. Feed/homepage links are not stories.
    if (!/\/[\w%.-]+-\d+\.html$/i.test(url.pathname)) return null;
    url.protocol = 'https:';
    url.hostname = 'vnexpress.net';
    url.port = '';
    url.hash = '';
    for (const name of [...url.searchParams.keys()]) {
      if (/^(utm_.+|vn_(source|campaign|medium)|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|_gl)$/i.test(name)) {
        url.searchParams.delete(name);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function articleTopic(title, summary) {
  const text = `${title} ${summary}`.toLocaleLowerCase('vi');
  if (/chính sách|pháp lý|thuế|nghị định|thông tư|\bluật\b|sổ đỏ|sổ hồng|cấp phép|đất đai/u.test(text)) return 'Chính sách';
  if (/quy hoạch|hạ tầng|cao tốc|vành đai|metro|đường sắt|cầu đường|đô thị mới/u.test(text)) return 'Quy hoạch';
  if (/nhà ở|căn hộ|chung cư|biệt thự|nhà phố|nhà đất|mua nhà|thuê nhà/u.test(text)) return 'Nhà ở';
  return 'Thị trường';
}

function publishedDate(item) {
  // Do not substitute the fetch time when the source omits or malforms its publication date.
  const raw = item.pubDate || item.isoDate;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const iso = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const rfc = raw.match(/\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b/i);
  if (!iso && !rfc) return null;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const year = Number(iso ? iso[1] : rfc[3]);
  const month = iso ? Number(iso[2]) : months.indexOf(rfc[2].slice(0, 3).toLowerCase()) + 1;
  const day = Number(iso ? iso[3] : rfc[1]);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Parse the feed only. No full article requests or scraping are performed. */
export async function parseFeed(xml, { now = new Date() } = {}) {
  if (typeof xml !== 'string') throw new Error('RSS phải là nội dung XML.');
  if (Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES) throw new Error('RSS vượt giới hạn 2 MB.');
  // rss-parser uses an XML parser, but publisher feeds do not need DTDs or custom entities.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('RSS chứa khai báo XML không được hỗ trợ.');

  let feed;
  try {
    feed = await parser.parseString(xml);
  } catch {
    throw new Error('Không đọc được RSS từ nguồn báo.');
  }

  const fetchedAt = new Date(now).toISOString();
  const urls = new Set();
  const entries = [];
  for (const item of feed.items ?? []) {
    const url = normalizeArticleUrl(item.link);
    const title = cleanFeedText(item.title, 300);
    if (!url || urls.has(url) || title.length < 5 || !/[\p{L}\p{N}]/u.test(title)) continue;
    const summary = cleanFeedText(item.description || item.content || item.contentSnippet || '');
    urls.add(url);
    entries.push({
      id: createHash('sha256').update(url).digest('hex'),
      title,
      summary,
      url,
      source: 'VnExpress',
      publishedAt: publishedDate(item),
      fetchedAt,
      topic: articleTopic(title, summary),
      contentScope: 'rss',
      isDemo: false,
      status: 'new',
    });
    if (entries.length >= MAX_FEED_ENTRIES) break;
  }
  return entries;
}

export async function fetchFeed() {
  const response = await fetch(FEED_URL, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Nguồn RSS phản hồi lỗi HTTP ${response.status}.`);
  if (!response.body) throw new Error('Nguồn RSS không trả về nội dung.');
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) {
    await response.body.cancel();
    throw new Error('RSS vượt giới hạn 2 MB.');
  }
  const reader = response.body.getReader();
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error('RSS vượt giới hạn 2 MB.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return parseFeed(Buffer.concat(chunks, total).toString('utf8'));
}
