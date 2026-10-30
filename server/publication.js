import { approvalDigest, reviewDraft } from './editorial.js';

export function publicPosts(store) {
  const seen = new Set();
  return store.drafts().filter(draft => {
    const article = store.article(draft.articleId);
    if (!article || draft.isDemo || article.isDemo || !['draft', 'posted'].includes(draft.status)) return false;
    return draft.approval?.revision === (draft.contentRevision || 1)
      && draft.approval.digest === approvalDigest(draft) && reviewDraft(draft, article).ready;
  }).sort((a, b) => new Date(b.approval.approvedAt) - new Date(a.approval.approvedAt)).filter(draft => {
    if (seen.has(draft.articleId)) return false;
    seen.add(draft.articleId); return true;
  }).map(draft => {
    const article = store.article(draft.articleId);
    return { id: draft.id, contentMode: draft.contentMode === 'project' ? 'project' : 'analysis', title: draft.title, content: draft.content, topic: article.topic || 'Thị trường', imageUrl: draft.imageUrl?.match(/^\/api\/assets\/[\da-f-]{36}\.png$/) ? draft.imageUrl.replace('/api/assets/', '/api/public/assets/') : null, imageKind: draft.imageKind, publishedAt: draft.approval.approvedAt, source: article.source, sourceUrl: article.url };
  });
}

// RSS metadata already collected by the admin. Never expose unapproved draft text.
export function publicNews(store) {
  const approved = publicPosts(store).map(post => ({ ...post, kind: 'editorial' }));
  const approvedSources = new Set(approved.map(post => post.sourceUrl));
  const text = value => String(value || '').replace(/<[^>]*>/gu, '').trim();
  const timestamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const sources = store.articles().filter(article => {
    if (article.isDemo || approvedSources.has(article.url) || !text(article.title) || !text(article.summary)) return false;
    try {
      const url = new URL(article.url);
      return url.protocol === 'https:' && ['vnexpress.net', 'www.vnexpress.net'].includes(url.hostname)
        && !url.username && !url.password && !url.port && /^\/[\w/-]+-\d+\.html$/u.test(url.pathname);
    } catch { return false; }
  }).map(article => ({
    id: `source-${article.id}`, kind: 'source', contentMode: 'source',
    title: text(article.title).slice(0, 500), content: text(article.summary).slice(0, 4000),
    topic: article.topic || 'Thị trường', imageUrl: null, imageKind: null,
    publishedAt: timestamp(article.publishedAt), source: article.source || 'VnExpress', sourceUrl: article.url,
  }));
  return [...approved, ...sources].sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
}
