import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { renderCover } from './images.js';
import { facebookPost } from '../shared/facebook.js';
import { config } from './config.js';
import { demoArticles } from './demo.js';
import { approvalDigest, reviewDraft, dailyPrepared } from './editorial.js';
import { importArticleLink } from './rss.js';

export function createApp(store, worker) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    let host;
    try { host = new URL(`http://${req.headers.host}`).hostname; } catch { return res.status(403).json({ error: 'Địa chỉ truy cập không hợp lệ.' }); }
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(host);
    const publicHost = config.production && (host.endsWith('.onrender.com') || host === process.env.PUBLIC_HOST);
    if (!localHost && !publicHost) return res.status(403).json({ error: 'Địa chỉ truy cập không hợp lệ.' });
    if (config.production && req.path !== '/api/health') {
      const username = process.env.ACCESS_USERNAME || '';
      const password = process.env.ACCESS_PASSWORD || '';
      if (!username || !password) return res.status(503).send('Dịch vụ chưa được cấu hình mật khẩu truy cập.');
      const authorization = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
      let suppliedUser = '';
      let suppliedPassword = '';
      try {
        const decoded = Buffer.from(authorization?.[1] || '', 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator >= 0) { suppliedUser = decoded.slice(0, separator); suppliedPassword = decoded.slice(separator + 1); }
      } catch {}
      const matches = (actual, expected) => {
        const left = Buffer.from(actual);
        const right = Buffer.from(expected);
        return left.length === right.length && timingSafeEqual(left, right);
      };
      if (!matches(suppliedUser, username) || !matches(suppliedPassword, password)) {
        res.setHeader('WWW-Authenticate', 'Basic realm="BDS Automation test", charset="UTF-8"');
        return res.status(401).send('Cần tài khoản và mật khẩu để thử ứng dụng.');
      }
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Yêu cầu từ trang ngoài bị từ chối.' });
      if (origin) {
        try {
          const parsed = new URL(origin);
          const originIsLocal = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
          const originIsSameHost = config.production && parsed.host === req.headers.host && parsed.protocol === 'https:';
          if (!['http:', 'https:'].includes(parsed.protocol) || (!originIsLocal && !originIsSameHost)) throw new Error();
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
      const reviewed = { ...draft, review: reviewDraft(draft, article), approvalDigest: approvalDigest(draft) };
      if (article?.sourceUpdated && (draft.sourceSummary !== article.summary || draft.sourceTitle !== article.title)) return { ...reviewed, reviewFlags: [...(draft.reviewFlags || []), 'Nguồn đã được cập nhật sau khi tạo bài; cần đối chiếu lại.'] };
      return reviewed;
    });
    res.json({ articles, drafts, jobs: store.jobs(), settings: store.settings(), status: { aiConfigured: config.aiConfigured, lowCostMode: config.lowCostMode, textModel: config.textModel, imageModel: config.imageModel, lastFetchedAt: store.meta('lastFetchedAt'), feedError: store.meta('feedError') || null, workerBusy: worker.busy, publishingEnabled: false, targetProfile: 'https://www.facebook.com/vuong.nguyen.8694', temporaryStorage: config.production && config.dataDir.startsWith('/tmp/') }, stats: { articles: articles.length, drafts: drafts.filter((d) => d.status === 'draft').length, posted: drafts.filter((d) => d.status === 'posted').length, todayGenerated: store.draftUsage(), todayPrepared: dailyPrepared(store), approved: drafts.filter(d => d.review.status === 'approved').length, todayImages: store.usage('image') } });
  });
  app.post('/api/articles/import', async (req, res, next) => {
    try {
      const article = await importArticleLink(req.body?.url);
      store.importArticles([article]);
      res.status(201).json({ articleId: article.id, message: 'Đã thêm tin nguồn. Studio tự chọn bài theo khu vực và hạn mức; có thể mở tin để tạo ngay.' });
    } catch (error) { next(error); }
  });
  app.post('/api/drafts/:id/approve', (req, res, next) => {
    try {
      const draft = store.draft(req.params.id);
      if (!draft || draft.status !== 'draft') throw new Error('Chỉ duyệt được bài nháp đang chuẩn bị.');
      if (req.body?.revision !== (draft.contentRevision || 1) || req.body?.digest !== approvalDigest(draft)) return res.status(409).json({ error: 'Bài hoặc hình vừa thay đổi. Tải lại và kiểm tra trước khi duyệt.' });
      if (req.body?.sourceChecked !== true) throw new Error('Xác nhận đã đọc nguồn và kiểm tra nội dung trước khi duyệt.');
      const review = reviewDraft(draft, store.article(draft.articleId));
      if (!review.ready) throw new Error(`Cần xử lý: ${review.checks.filter(check => !check.ok).map(check => check.label).join(', ')}.`);
      res.json(store.saveDraft({ ...draft, approval: { revision: draft.contentRevision || 1, digest: approvalDigest(draft), approvedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }));
    } catch (error) { next(error); }
  });
  app.post('/api/drafts/:id/image/confirm', (req, res, next) => {
    try {
      const draft = store.draft(req.params.id);
      if (!draft?.imageUrl || !['stale', 'ready'].includes(draft.imageStatus)) throw new Error('Cần có hình đã tạo trước khi xác nhận.');
      if (req.body?.revision !== (draft.contentRevision || 1)) return res.status(409).json({ error: 'Bài vừa thay đổi. Kiểm tra lại hình.' });
      res.json(store.saveDraft({ ...draft, approval: null, imageStatus: 'ready', imageError: null, imageContentRevision: draft.contentRevision || 1 }));
    } catch (error) { next(error); }
  });
  app.post('/api/drafts/:id/archive', (req, res, next) => {
    try {
      const draft = store.draft(req.params.id);
      if (!draft || draft.status === 'posted') throw new Error('Không thể loại bài này khỏi hàng chờ.');
      res.json(store.saveDraft({ ...draft, status: 'archived', approval: null, updatedAt: new Date().toISOString() }));
    } catch (error) { next(error); }
  });
  app.put('/api/drafts/:id/metrics', (req, res, next) => {
    try {
      const draft = store.draft(req.params.id);
      if (!draft || draft.isDemo || draft.status !== 'posted') throw new Error('Chỉ nhập kết quả cho bài thật đã được xác nhận đăng.');
      const metrics = {};
      for (const key of ['views', 'followers', 'clicks', 'inquiries']) {
        const value = req.body?.[key];
        if (value === null || value === undefined) metrics[key] = null;
        else {
          if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) throw new Error('Chỉ số cần là số nguyên không âm hoặc để trống.');
          metrics[key] = value;
        }
      }
      res.json(store.saveDraft({ ...draft, metrics: { ...metrics, source: 'manual', recordedAt: new Date().toISOString() } }));
    } catch (error) { next(error); }
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
      const image = await renderCover({ title: draft.title, topic: article?.topic, background: req.body, source: article?.source, sourceUrl: article?.url, sourceSummary: draft.sourceSummary || article?.summary, publishedAt: article?.publishedAt, imageKind: 'upload', style: store.settings().imageStyle, brandName: store.settings().brandName });
      const filename = `${randomUUID()}.png`;
      await fs.writeFile(path.join(store.assetsDir, filename), image);
      const latest = store.draft(draft.id);
      res.json(store.saveDraft({ ...latest, approval: null, imageUrl: `/api/assets/${filename}`, imageKind: 'upload', imageStatus: (latest.contentRevision || 1) === (draft.contentRevision || 1) ? 'ready' : 'stale', imageError: null, imageContentRevision: draft.contentRevision || 1, updatedAt: new Date().toISOString() }));
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
      const nextDraft = { ...draft, content, approval: changed ? null : draft.approval, status: req.body.status ?? draft.status, contentRevision: (draft.contentRevision || 1) + (changed ? 1 : 0), updatedAt: new Date().toISOString(), imageStatus: changed && draft.imageUrl ? 'stale' : draft.imageStatus, imageError: changed && draft.imageUrl ? 'Nội dung đã sửa. Kiểm tra ảnh minh họa trước khi dùng.' : draft.imageError };
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
