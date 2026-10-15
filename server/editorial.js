import { localDay } from './store.js';
import { createHash } from 'node:crypto';

const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gu, 'd').toLowerCase().replace(/[^a-z0-9]+/gu, ' ').trim();
const words = text => new Set(fold(text).split(' ').filter(word => word.length > 2 && !['cac', 'cua', 'cho', 'trong', 'nhung', 'mot', 'voi', 'tai', 'nhieu', 'duoc', 'den'].includes(word)));
export function similarEvent(a, b) {
  if (a.url === b.url) return true;
  if (fold(a.title) === fold(b.title)) return true;
  const left = words(a.title), right = words(b.title);
  if (Math.min(left.size, right.size) < 5) return false;
  const intersection = [...left].filter(word => right.has(word)).length;
  return intersection / new Set([...left, ...right]).size >= 0.72;
}

export function selectDailyArticles(articles, existing = [], settings = {}, now = new Date()) {
  const focus = String(settings.focusArea || '').split(/[,;\n]/u).map(fold).filter(Boolean);
  const ranked = articles.map(article => {
    const age = now.getTime() - new Date(article.publishedAt).getTime();
    const text = ` ${fold(`${article.title} ${article.summary}`)} `;
    let reason = null;
    if (article.isDemo || article.status !== 'new') reason = 'Đã xử lý hoặc là dữ liệu mẫu';
    else if (!article.publishedAt || !Number.isFinite(age) || age < -3600000 || age > 48 * 3600000) reason = 'Thiếu thời điểm hoặc ngoài khoảng 48 giờ';
    else if (!article.summary || article.summary.length < 40) reason = 'Nguồn chưa đủ tóm tắt';
    else if (focus.length && !focus.some(term => text.includes(` ${term} `))) reason = 'Ngoài khu vực ưu tiên';
    else if (existing.some(other => similarEvent(article, other))) reason = 'Trùng sự kiện đã chuẩn bị';
    const score = (article.topic === 'Quy hoạch' ? 30 : article.topic === 'Nhà ở' ? 20 : 10) + Math.max(0, 48 - age / 3600000);
    return { article, score, reason };
  }).sort((a, b) => b.score - a.score);
  const selected = [];
  for (const candidate of ranked) {
    if (candidate.reason || selected.some(other => similarEvent(candidate.article, other.article))) continue;
    selected.push(candidate);
  }
  return selected;
}

export function dailyPrepared(store, now = new Date()) {
  const day = localDay(now);
  return store.drafts().filter(draft => !draft.isDemo && localDay(new Date(draft.createdAt)) === day).length;
}

export function reviewDraft(draft, article) {
  const source = `${article?.title || ''} ${article?.summary || ''} ${draft.sourceContext || ''}`;
  const text = `${draft.title || ''} ${draft.content || ''}`.replace(/https?:\/\/\S+/gu, '');
  const sourceNumbers = new Set(source.match(/\d+(?:[.,]\d+)*/gu) || []);
  const supportedNumbers = (text.match(/\d+(?:[.,]\d+)*/gu) || []).every(value => sourceNumbers.has(value));
  const unsupportedClaims = ['cam kết lợi nhuận', 'cháy hàng', 'không lo kẹt xe', 'đảm bảo tăng giá', 'chắc chắn tăng giá'];
  const checks = [
    { id: 'content', label: 'Nội dung và nguồn', ok: Boolean(draft.content?.trim().length >= 30 && article?.summary?.length >= 35) },
    { id: 'source', label: 'Nguồn chưa thay đổi', ok: !article?.sourceUpdated || (draft.sourceTitle === article.title && draft.sourceSummary === article.summary) },
    { id: 'numbers', label: 'Số liệu khớp nguồn đã lưu', ok: supportedNumbers },
    { id: 'claims', label: 'Không thêm cam kết ngoài nguồn', ok: !unsupportedClaims.some(claim => text.toLowerCase().includes(claim) && !source.toLowerCase().includes(claim)) },
    { id: 'style', label: 'Giọng viết chuyên nghiệp, không xưng mình', ok: !/góc nhìn của mình|với mình|theo mình|mình cho rằng|mình nghĩ|mình thấy|theo quan điểm của mình|(?:^|[^\p{L}])mình(?:$|[^\p{L}])|anh em/iu.test(text.replace(draft.sourceSummary || article?.summary || '\u0000', '')) },
    { id: 'image', label: 'Hình đã sẵn sàng', ok: Boolean(draft.imageUrl && draft.imageStatus === 'ready') },
    { id: 'version', label: 'Hình khớp phiên bản bài', ok: (draft.imageContentRevision || 1) === (draft.contentRevision || 1) },
    { id: 'real', label: 'Bài từ nguồn thật', ok: !draft.isDemo && !article?.isDemo },
  ];
  return { checks, ready: checks.every(check => check.ok), status: draft.status === 'posted' ? 'posted' : draft.approval?.revision === (draft.contentRevision || 1) && draft.approval.digest === approvalDigest(draft) && checks.every(check => check.ok) ? 'approved' : checks.every(check => check.ok) ? 'review' : 'attention' };
}

export function approvalDigest(draft) {
  return createHash('sha256').update(JSON.stringify({ content: draft.content, title: draft.title, imageUrl: draft.imageUrl, contentRevision: draft.contentRevision || 1 })).digest('hex');
}
