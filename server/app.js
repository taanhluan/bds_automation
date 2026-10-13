import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { renderCover } from './images.js';
import { facebookPost } from '../shared/facebook.js';
import { config } from './config.js';
import { demoArticles } from './demo.js';

export function createApp(store, worker) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    let host;
    try { host = new URL(`http://${req.headers.host}`).hostname; } catch { return res.status(403).json({ error: 'Địa chỉ truy cập không hợp lệ.' }); }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return res.status(403).json({ error: 'Ứng dụng này phục vụ trên localhost.' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Yêu cầu từ trang ngoài bị từ chối.' });
      if (origin) {
        try {
          const parsed = new URL(origin);
          if (!['http:', 'https:'].includes(parsed.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error();
        } catch { return res.status(403).json({ error: 'Nguồn yêu cầu không hợp lệ.' }); }
      }
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/state', (_req, res) => {
    const articles = store.articles();
    const drafts = store.drafts().map((draft) => {
      const article = store.article(draft.articleId);
      if (article?.sourceUpdated && (draft.sourceSummary !== article.summary || draft.sourceTitle !== article.title)) return { ...draft, reviewFlags: [...draft.reviewFlags, 'Nguồn đã được cập nhật sau khi tạo bài; cần đối chiếu lại.'] };
      return draft;
    });
    res.json({ articles, drafts, jobs: store.jobs(), settings: store.settings(), status: { aiConfigured: config.aiConfigured, lowCostMode: config.lowCostMode, textModel: config.textModel, imageModel: config.imageModel, lastFetchedAt: store.meta('lastFetchedAt'), feedError: store.meta('feedError') || null, workerBusy: worker.busy }, stats: { articles: articles.length, drafts: drafts.filter((d) => d.status === 'draft').length, posted: drafts.filter((d) => d.status === 'posted').length, todayGenerated: store.draftUsage(), todayImages: store.usage('image') } });
  });
  app.post('/api/feeds/refresh', async (_req, res, next) => { try { res.json(await worker.refresh()); } catch (error) { next(error); } });
  app.post('/api/demo', (_req, res) => {
    const added = store.importArticles(demoArticles());
    res.json({ message: added ? `Đã thêm ${added} tin mẫu để anh thử ứng dụng.` : 'Tin mẫu đã có trong danh sách.' });
  });
  app.post('/api/articles/:id/generate', (req, res, next) => {
    try {
      if (req.body?.force !== undefined && typeof req.body.force !== 'boolean') throw new Error('Lựa chọn tạo lại không hợp lệ.');
      res.status(202).json({ jobId: worker.enqueueDraft(req.params.id, { force: req.body?.force === true }).id });
    } catch (error) { next(error); }
  });
  app.post('/api/drafts/:id/image', (req, res, next) => {
    try {
      if (req.body?.templateOnly !== undefined && typeof req.body.templateOnly !== 'boolean') throw new Error('Lựa chọn hình không hợp lệ.');
      if (req.body?.useAI !== undefined && typeof req.body.useAI !== 'boolean') throw new Error('Lựa chọn ảnh AI không hợp lệ.');
      res.status(202).json({ jobId: worker.enqueueImage(req.params.id, { templateOnly: req.body?.templateOnly === true, useAI: req.body?.useAI === true }).id });
    } catch (error) { next(error); }
  });
  app.get('/api/drafts/:id/export', (req, res) => {
    const draft = store.draft(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Không tìm thấy bài nháp.' });
    res.attachment(`facebook-${draft.id}.txt`).type('text/plain; charset=utf-8').send(facebookPost(draft, store.article(draft.articleId)));
  });
  app.post('/api/drafts/:id/photo', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '8mb' }), async (req, res, next) => {
    try {
      const draft = store.draft(req.params.id);
      if (!draft) return res.status(404).json({ error: 'Không tìm thấy bài nháp.' });
      if (!Buffer.isBuffer(req.body) || !req.body.length) throw new Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 8 MB.');
      const metadata = await sharp(req.body, { limitInputPixels: 30_000_000 }).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Chỉ hỗ trợ JPG, PNG hoặc WebP.');
      const article = store.article(draft.articleId);
      const image = await renderCover({ title: draft.title, topic: article?.topic, background: req.body, source: article?.source, sourceUrl: article?.url, sourceSummary: draft.sourceSummary || article?.summary, publishedAt: article?.publishedAt, imageKind: 'upload' });
      const filename = `${randomUUID()}.png`;
      await fs.writeFile(path.join(store.assetsDir, filename), image);
      const latest = store.draft(draft.id);
      res.json(store.saveDraft({ ...latest, imageUrl: `/api/assets/${filename}`, imageKind: 'upload', imageStatus: (latest.contentRevision || 1) === (draft.contentRevision || 1) ? 'ready' : 'stale', imageError: null, imageContentRevision: draft.contentRevision || 1, updatedAt: new Date().toISOString() }));
    } catch (error) { next(error); }
  });
  app.patch('/api/drafts/:id', (req, res, next) => {
    try {
      const draft = store.draft(req.params.id);
      if (!draft) return res.status(404).json({ error: 'Không tìm thấy bài nháp.' });
      if (!req.body || typeof req.body !== 'object') throw new Error('Nội dung cập nhật không hợp lệ.');
      if ('content' in req.body && (typeof req.body.content !== 'string' || !req.body.content.trim() || req.body.content.length > 20000)) throw new Error('Nội dung cần từ 1 đến 20.000 ký tự.');
      if ('status' in req.body && !['draft', 'posted'].includes(req.body.status)) throw new Error('Trạng thái bài không hợp lệ.');
      const changed = 'content' in req.body && req.body.content !== draft.content;
      let content = req.body.content ?? draft.content;
      const article = store.article(draft.articleId);
      if (!draft.isDemo && !content.includes(article.url)) content += `\n\nNguồn: ${article.source}\n${article.url}`;
      const nextDraft = { ...draft, content, status: req.body.status ?? draft.status, contentRevision: (draft.contentRevision || 1) + (changed ? 1 : 0), updatedAt: new Date().toISOString(), imageStatus: changed && draft.imageUrl ? 'stale' : draft.imageStatus, imageError: changed && draft.imageUrl ? 'Nội dung đã sửa. Kiểm tra ảnh minh họa trước khi dùng.' : draft.imageError };
      res.json(store.saveDraft(nextDraft));
    } catch (error) { next(error); }
  });
  app.post('/api/drafts/:id/copy', (req, res) => {
    const draft = store.draft(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Không tìm thấy bài nháp.' });
    store.saveDraft({ ...draft, copiedAt: new Date().toISOString() });
    res.json({ ok: true });
  });
  app.put('/api/settings', (req, res, next) => { try { res.json(store.saveSettings(req.body)); } catch (error) { next(error); } });
  app.get('/api/assets/:filename', (req, res) => {
    if (!/^[\da-f-]{36}\.png$/.test(req.params.filename)) return res.status(404).json({ error: 'Không tìm thấy hình.' });
    res.setHeader('Cache-Control', 'private, max-age=86400');
    if (req.query.download === '1') res.setHeader('Content-Disposition', `attachment; filename="dia-oc-${req.params.filename}"`);
    res.sendFile(path.join(store.assetsDir, req.params.filename), (error) => { if (error && !res.headersSent) res.status(404).json({ error: 'Không tìm thấy hình.' }); });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy chức năng.' }));
  if (config.production) {
    const dist = path.resolve('dist');
    app.use(express.static(dist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    const message = error.type === 'entity.parse.failed' ? 'Nội dung JSON không hợp lệ.' : error.type === 'entity.too.large' ? 'Nội dung vượt giới hạn cho phép.' : error.message || 'Có lỗi xảy ra. Anh thử lại nhé.';
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: message });
  });
  return app;
}
