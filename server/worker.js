import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { config } from './config.js';
import { fetchFeed } from './rss.js';
import { buildDraft } from './ai.js';
import { perspectiveVersion, selectProjectContext } from './perspective.js';
import { generateBackground, renderCover } from './images.js';

export function createWorker(store, dependencies = {}) {
  const deps = { fetchFeed, buildDraft, generateBackground, renderCover, aiConfigured: config.aiConfigured, lowCostMode: config.lowCostMode, ...dependencies };
  let processing = false;
  let refreshing = null;
  let timer;
  let stopped = false;
  let lastAttempt = 0;

  function enqueueDraft(articleId, { force = false } = {}) {
    const article = store.article(articleId);
    if (!article) throw new Error('Không tìm thấy tin nguồn.');
    if (!article.isDemo && store.settings().writingMode !== 'free' && !deps.aiConfigured) throw new Error('Cần OPENAI_API_KEY trong .env.local để viết bài từ tin thật. Anh có thể thử dữ liệu mẫu trước.');
    if (!article.summary || article.summary.length < 40) throw new Error('Tin này chưa đủ nội dung RSS để tạo bài chính xác.');
    return store.addJob('build_draft', { articleId, draftId: null, articleSnapshot: article, settingsSnapshot: store.settings(), force });
  }

  function enqueueImage(draftId, { templateOnly = false, useAI = false } = {}) {
    templateOnly = templateOnly || (deps.lowCostMode && !useAI);
    const draft = store.draft(draftId);
    if (!draft) throw new Error('Không tìm thấy bài nháp.');
    const article = store.article(draft.articleId);
    if (!article?.isDemo && !templateOnly && !deps.aiConfigured) throw new Error('Cần OPENAI_API_KEY để tạo ảnh AI.');
    const job = store.addJob('generate_image', { articleId: draft.articleId, draftId, draftSnapshot: draft, templateOnly });
    store.saveDraft({ ...draft, imageStatus: 'pending', imageError: null });
    return job;
  }

  function queueAutomatic() {
    const settings = store.settings();
    if (!settings.autoGenerate || (settings.writingMode !== 'free' && !deps.aiConfigured)) return;
    const active = store.jobs().filter((j) => j.type === 'build_draft' && ['pending', 'processing'].includes(j.status)).length;
    let remaining = settings.dailyDraftLimit - store.draftUsage() - active;
    const draftedIds = new Set(store.drafts().map((d) => d.articleId));
    for (const article of store.articles()) {
      if (remaining <= 0) break;
      if (article.isDemo || article.status !== 'new' || draftedIds.has(article.id)) continue;
      const published = new Date(article.publishedAt).getTime();
      if (!article.publishedAt || !Number.isFinite(published) || Date.now() - published > 48 * 3600000 || published > Date.now() + 3600000) continue;
      try { enqueueDraft(article.id); remaining--; }
      catch { store.saveArticle({ ...article, status: 'needs_context' }); }
    }
  }

  async function refresh() {
    if (refreshing) return refreshing;
    lastAttempt = Date.now();
    refreshing = (async () => {
      try {
        const articles = await deps.fetchFeed();
        if (articles.length === 0) throw new Error('RSS chưa có tin hợp lệ. Thử lấy lại sau hoặc dùng dữ liệu mẫu.');
        const added = store.importArticles(articles);
        store.setMeta('lastFetchedAt', new Date().toISOString());
        store.setMeta('feedError', '');
        queueAutomatic();
        return { added, message: added ? `Đã lấy ${added} tin mới từ VnExpress.` : 'Nguồn đã được cập nhật. Chưa có tin mới.' };
      } catch (error) {
        const message = `Không lấy được RSS VnExpress. ${error.message === 'fetch failed' ? 'Kiểm tra kết nối mạng rồi thử lại.' : error.message}`;
        store.setMeta('feedError', message);
        throw new Error(message);
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function doDraft(job) {
    const article = job.articleSnapshot || store.article(job.articleId);
    if (!article) throw new Error('Tin nguồn đã bị xóa.');
    const settings = job.settingsSnapshot || store.settings();
    const free = settings.writingMode === 'free';
    const cacheKey = createHash('sha256').update(JSON.stringify({ version: perspectiveVersion, writingMode: settings.writingMode, focusArea: settings.focusArea, projectContext: selectProjectContext(article, settings), model: config.textModel, title: article.title, summary: article.summary, tone: settings.tone, audience: settings.audience })).digest('hex');
    const cached = !article.isDemo && !job.force ? store.cachedGeneration(cacheKey) : null;
    if (!article.isDemo && !cached) store.reserve(job, free ? 'local-text' : 'text', store.settings().dailyDraftLimit);
    const result = cached || await deps.buildDraft(article, settings);
    if (!result?.content?.trim()) throw new Error('AI chưa trả về nội dung hợp lệ.');
    if (!article.isDemo && !cached) store.cacheGeneration(cacheKey, result);
    const now = new Date().toISOString();
    let content = result.content.trim();
    if (!article.isDemo && !content.includes(article.url)) content += `\n\nNguồn: ${article.source}\n${article.url}`;
    const draft = {
      id: randomUUID(), articleId: article.id,
      title: result.title || article.title, content, aiContent: content,
      summary: result.summary || null, perspective: result.perspective || null, watchpoint: result.watchpoint || null, question: result.question || null, hashtags: result.hashtags || [],
      contextUsed: Boolean(result.contextUsed), contextSources: result.contextSources || [], skillVersion: result.skillVersion || perspectiveVersion, generationProvider: result.provider || (free ? 'local' : 'openai'),
      facts: result.facts || [], reviewFlags: result.reviewFlags || [],
      imageBrief: result.imageBrief || `Minh họa trung tính về ${article.topic}`,
      imageUrl: null, imageStatus: 'none', imageError: null,
      status: 'draft', isDemo: article.isDemo,
      cacheHit: Boolean(cached), generationModel: article.isDemo || free ? null : config.textModel,
      revision: store.nextRevision(article.id), contentRevision: 1,
      sourceTitle: article.title, sourceSummary: article.summary,
      createdAt: now, updatedAt: now, copiedAt: null,
    };
    store.saveDraft(draft);
    job.draftId = draft.id;
    const current = store.article(article.id);
    store.saveArticle({ ...current, status: 'generated' });
    if (!article.isDemo && !cached) store.recordUsage(job, { status: 'completed', model: free ? null : config.textModel, ...result.usage });
    const blockedImage = result.reviewFlags?.some((flag) => /không đủ|mâu thuẫn|chưa xác minh dữ kiện/i.test(flag));
    if (settings.autoImage && !blockedImage) enqueueImage(draft.id, { templateOnly: free });
  }

  async function doImage(job) {
    const current = store.draft(job.draftId);
    if (!current) throw new Error('Không tìm thấy bài nháp.');
    const draft = job.draftSnapshot || current;
    store.saveDraft({ ...current, imageStatus: 'processing', imageError: null });
    let background;
    if (!draft.isDemo && !job.templateOnly) {
      store.reserve(job, 'image', store.settings().dailyImageLimit);
      const result = await deps.generateBackground(draft.imageBrief);
      background = result.buffer;
      store.recordUsage(job, { status: 'completed', ...(result.usage || {}) });
    }
    const article = store.article(draft.articleId);
    const png = await deps.renderCover({ title: draft.title, topic: article?.topic || 'Bất động sản', isDemo: draft.isDemo, background, source: article?.source, sourceUrl: article?.url, sourceSummary: draft.sourceSummary || article?.summary, publishedAt: article?.publishedAt });
    const filename = `${job.id}.png`;
    await fs.writeFile(`${store.assetsDir}/${filename}`, png, { flag: 'wx' });
    const latest = store.draft(draft.id);
    const changed = (latest.contentRevision || 1) !== (draft.contentRevision || 1);
    store.saveDraft({ ...latest, imageUrl: `/api/assets/${filename}`, imageStatus: changed ? 'stale' : 'ready', imageError: changed ? 'Bài đã được sửa trong lúc tạo ảnh. Kiểm tra hình trước khi sử dụng.' : null, imageContentRevision: draft.contentRevision || 1, imageKind: background ? 'ai' : 'template' });
  }

  async function runOnce() {
    if (processing || stopped) return;
    queueAutomatic();
    const job = store.pendingJobs()[0];
    if (!job) return;
    processing = true;
    store.saveJob({ ...job, status: 'processing' });
    try {
      if (job.type === 'build_draft') await doDraft(job);
      else if (job.type === 'generate_image') await doImage(job);
      else throw new Error('Loại công việc không hợp lệ.');
      store.saveJob({ ...job, status: 'completed', error: null });
    } catch (error) {
      store.saveJob({ ...job, status: 'failed', error: error.message || 'Tác vụ chưa hoàn tất.' });
      if (job.type === 'build_draft') {
        const article = store.article(job.articleId);
        if (article) store.saveArticle({ ...article, status: error.code === 'needs_context' ? 'needs_context' : 'error' });
      } else {
        const draft = store.draft(job.draftId);
        if (draft) store.saveDraft({ ...draft, imageStatus: error.code === 'uncertain' ? 'uncertain' : 'error', imageError: error.message });
      }
    } finally { processing = false; }
  }

  function start() {
    store.recoverJobs();
    timer = setInterval(() => {
      const settings = store.settings();
      if (settings.autoFetch && !refreshing && Date.now() - lastAttempt >= settings.fetchIntervalMinutes * 60000) refresh().catch(() => {});
      runOnce().catch((error) => console.error('Worker:', error.message));
    }, 1000);
    timer.unref();
  }

  return { enqueueDraft, enqueueImage, refresh, runOnce, start, stop: () => { stopped = true; clearInterval(timer); }, get busy() { return processing || Boolean(refreshing); } };
}
