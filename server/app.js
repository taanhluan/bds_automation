import express from 'express';
import { publicPosts, publicNews } from './publication.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return res.status(404).end(); }
    if (/(?:^|\/)(?:\.[^/]+|node_modules|server|client|shared|tests?|test-results|playwright-report|coverage|reports|scripts|data)(?:\/|$)/i.test(pathname) || /\.(?:md|ya?ml|log|sqlite(?:-wal|-shm)?|pem|key|map|env)$/i.test(pathname) || /(?:^|\/)(?:package(?:-lock)?\.json|vite\.config\.js)$/i.test(pathname)) return res.status(404).end();
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://rsms.me; font-src 'self' https://rsms.me; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    }
    next();
  });
  const sessions = new Map();
  const loginAttempts = new Map();
  const matches = (actual, expected) => {
    const left = Buffer.from(actual), right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  };
  const authenticated = req => {
    const token = /(?:^|;\s*)vincente_session=([a-f0-9-]+)/.exec(req.headers.cookie || '')?.[1];
    return token && sessions.get(token) > Date.now();
  };
  app.use((req, res, next) => {
    let host;
    try { host = new URL(`http://${req.headers.host}`).hostname; } catch { return res.status(403).json({ error: 'Địa chỉ truy cập không hợp lệ.' }); }
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(host);
    const publicHost = config.production && (host.endsWith('.onrender.com') || host === process.env.PUBLIC_HOST);
    if (!localHost && !publicHost) return res.status(403).json({ error: 'Địa chỉ truy cập không hợp lệ.' });
    const publicPath = ['/api/health', '/api/auth/login', '/api/auth/session'].includes(req.path) || (['GET', 'HEAD'].includes(req.method) && (req.path === '/api/public/posts' || /^\/api\/public\/assets\/[a-f0-9-]+\.png$/.test(req.path)));
    if (req.path.startsWith('/api/') && !publicPath && !authenticated(req)) {
      const username = process.env.ACCESS_USERNAME || '';
      const password = process.env.ACCESS_PASSWORD || '';
      if (!username || !password) return res.status(503).json({ error: 'Cần cấu hình ACCESS_USERNAME và ACCESS_PASSWORD trong .env.local hoặc môi trường máy chủ.' });
      const authorization = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
      const decoded = Buffer.from(authorization?.[1] || '', 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      const now = Date.now();
      for (const [ip, value] of loginAttempts) if (now > value.until) loginAttempts.delete(ip);
      const attempt = loginAttempts.get(req.ip) || { count: 0, until: now + 15 * 60 * 1000 };
      if (attempt.count >= 10) return res.status(429).json({ error: 'Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
      if (separator < 0 || !matches(decoded.slice(0, separator), username) || !matches(decoded.slice(separator + 1), password)) {
        if (authorization) { attempt.count++; loginAttempts.set(req.ip, attempt); }
        return res.status(401).json({ error: 'Vui lòng đăng nhập quản trị.' });
      }
      loginAttempts.delete(req.ip);
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
  app.get('/api/auth/session', (req, res) => res.json({ authenticated: Boolean(authenticated(req)) }));
  app.post('/api/auth/login', (req, res) => {
    const username = process.env.ACCESS_USERNAME, password = process.env.ACCESS_PASSWORD;
    if (!username || !password) return res.status(503).json({ error: 'Cấu hình ACCESS_USERNAME và ACCESS_PASSWORD trong .env.local hoặc môi trường máy chủ để mở quản trị.' });
    const key = req.ip;
    const now = Date.now();
    for (const [ip, value] of loginAttempts) if (now > value.until) loginAttempts.delete(ip);
    const attempt = loginAttempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (attempt.count >= 10) return res.status(429).json({ error: 'Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    if (typeof req.body?.username !== 'string' || typeof req.body?.password !== 'string' || !matches(req.body.username, username) || !matches(req.body.password, password)) {
      attempt.count++; loginAttempts.set(key, attempt);
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu chưa đúng.' });
    }
    loginAttempts.delete(key);
    for (const [token, expiry] of sessions) if (expiry <= now) sessions.delete(token);
    const token = randomUUID(); sessions.set(token, now + 8 * 60 * 60 * 1000);
    res.setHeader('Set-Cookie', `vincente_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${config.production ? '; Secure' : ''}`);
    res.json({ ok: true });
  });
  app.post('/api/auth/logout', (req, res) => {
    const token = /(?:^|;\s*)vincente_session=([a-f0-9-]+)/.exec(req.headers.cookie || '')?.[1];
    sessions.delete(token);
    res.setHeader('Set-Cookie', `vincente_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.production ? '; Secure' : ''}`);
    res.json({ ok: true });
  });
  app.get('/api/public/posts', (_req, res) => res.json({ posts: publicNews(store) }));
  app.get('/api/public/assets/:filename', (req, res) => {
    if (!publicPosts(store).some(post => post.imageUrl === `/api/public/assets/${req.params.filename}`)) return res.status(404).end();
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(store.assetsDir, req.params.filename), error => { if (error && !res.headersSent) res.status(404).end(); });
  });

  app.get('/api/state', (_req, res) => {
    const articles = store.articles();
    const drafts = store.drafts().map((draft) => {
      const article = store.article(draft.articleId);
      const reviewed = { ...draft, review: reviewDraft(draft, article), approvalDigest: approvalDigest(draft) };
      if (article?.sourceUpdated && (draft.sourceSummary !== article.summary || draft.sourceTitle !== article.title)) return { ...reviewed, reviewFlags: [...(draft.reviewFlags || []), 'Nguồn đã được cập nhật sau khi tạo bài; cần đối chiếu lại.'] };
      return reviewed;
    });
    res.json({ articles, drafts, jobs: store.jobs(), settings: store.settings(), status: { aiConfigured: config.aiConfigured, lowCostMode: config.lowCostMode, textModel: config.textModel, imageModel: store.settings().imageModel, imageQuality: store.settings().imageQuality, lastFetchedAt: store.meta('lastFetchedAt'), feedError: store.meta('feedError') || null, workerBusy: worker.busy, publishingEnabled: false, targetProfile: 'https://www.facebook.com/vuong.nguyen.8694', temporaryStorage: config.production && config.dataDir.startsWith('/tmp/') }, stats: { articles: articles.length, drafts: drafts.filter((d) => d.status === 'draft').length, posted: drafts.filter((d) => d.status === 'posted').length, todayGenerated: store.draftUsage(), todayPrepared: dailyPrepared(store), approved: drafts.filter(d => d.review.status === 'approved').length, todayImages: store.usage('image') } });
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
      res.json(store.saveDraft({ ...latest, approval: null, imageUrl: `/api/assets/${filename}`, imageKind: 'upload', imageModel: null, imageQuality: null, imageStyle: store.settings().imageStyle, imageStatus: (latest.contentRevision || 1) === (draft.contentRevision || 1) ? 'ready' : 'stale', imageError: null, imageContentRevision: draft.contentRevision || 1, updatedAt: new Date().toISOString() }));
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
    app.use('/assets', (req, res, next) => {
      if (!/^\/[a-zA-Z0-9_.-]+\.(?:js|css)$/.test(req.path)) return next();
      const filename = path.join(dist, 'assets', req.path.slice(1));
      res.vary('Accept-Encoding');
      const coding = req.acceptsEncodings('br', 'gzip', 'identity');
      const suffix = coding === 'br' ? '.br' : coding === 'gzip' ? '.gz' : '';
      if (!suffix || !existsSync(filename + suffix)) return next();
      res.setHeader('Content-Encoding', coding);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.type(req.path.endsWith('.js') ? 'application/javascript' : 'text/css');
      res.sendFile(filename + suffix);
    });
    app.use(express.static(dist, { dotfiles: 'deny', setHeaders: (res, file) => {
      res.setHeader('Cache-Control', file.endsWith('.html') ? 'no-cache' : file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
    } }));
    app.get('/{*splat}', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(dist, 'index.html')); });
  }
  app.use((error, _req, res, _next) => {
    const message = error.type === 'entity.parse.failed' ? 'Nội dung JSON không hợp lệ.' : error.type === 'entity.too.large' ? 'Nội dung vượt giới hạn cho phép.' : error.message || 'Có lỗi xảy ra. Anh thử lại nhé.';
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: message });
  });
  return app;
}
