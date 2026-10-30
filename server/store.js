import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaults } from './config.js';
import { defaultLandingCms, validateLandingCms } from './landing.js';

export function localDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function createStore(dataDir) {
  fs.mkdirSync(path.join(dataDir, 'assets'), { recursive: true });
  const db = new Database(path.join(dataDir, 'studio.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, url TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id), revision INTEGER NOT NULL, data TEXT NOT NULL, UNIQUE(article_id, revision));
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, job_key TEXT UNIQUE NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS landing_content (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quota_events (job_id TEXT PRIMARY KEY, kind TEXT NOT NULL, day TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS generation_cache (key TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_quota_day ON quota_events(day, kind);
  `);
  db.prepare('INSERT OR IGNORE INTO settings(id,data) VALUES(1,?)').run(JSON.stringify(defaults));
  db.prepare('INSERT OR IGNORE INTO landing_content(id,data) VALUES(1,?)').run(JSON.stringify(defaultLandingCms));
  const decode = (rows) => rows.map((r) => JSON.parse(r.data));

  const store = {
    db,
    dataDir,
    assetsDir: path.join(dataDir, 'assets'),
    close: () => db.close(),
    cachedGeneration(key) { const row = db.prepare('SELECT data FROM generation_cache WHERE key=?').get(key); return row ? JSON.parse(row.data) : null; },
    cacheGeneration(key, value) { db.prepare('INSERT INTO generation_cache(key,data) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data').run(key, JSON.stringify(value)); },
    settings: () => ({ ...defaults, ...JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get().data) }),
    saveSettings(value) {
      const next = validateSettings(value, store.settings());
      db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(next));
      return next;
    },
    landingCms() {
      const row = db.prepare('SELECT data FROM landing_content WHERE id=1').get();
      return row ? validateLandingCms(JSON.parse(row.data), defaultLandingCms) : defaultLandingCms;
    },
    saveLandingCms(value) {
      const next = validateLandingCms(value, store.landingCms());
      db.prepare('UPDATE landing_content SET data=? WHERE id=1').run(JSON.stringify(next));
      return next;
    },
    resetLandingCms() {
      db.prepare('UPDATE landing_content SET data=? WHERE id=1').run(JSON.stringify(defaultLandingCms));
      return defaultLandingCms;
    },
    meta(key) { return db.prepare('SELECT value FROM meta WHERE key=?').get(key)?.value ?? null; },
    setMeta(key, value) { db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value)); },
    articles() {
      return decode(db.prepare('SELECT data FROM articles ORDER BY rowid DESC').all()).sort((a, b) =>
        new Date(b.publishedAt || b.fetchedAt).getTime() - new Date(a.publishedAt || a.fetchedAt).getTime());
    },
    article(id) { const r = db.prepare('SELECT data FROM articles WHERE id=?').get(id); return r ? JSON.parse(r.data) : null; },
    importArticles(articles) {
      return db.transaction(() => {
        let added = 0;
        for (const article of articles) {
          const existing = db.prepare('SELECT id,data FROM articles WHERE url=?').get(article.url);
          if (!existing) {
            db.prepare('INSERT INTO articles(id,url,data) VALUES(?,?,?)').run(article.id, article.url, JSON.stringify(article));
            added++;
          } else {
            const old = JSON.parse(existing.data);
            if (old.title !== article.title || old.summary !== article.summary) {
              store.saveArticle({ ...old, ...article, id: old.id, status: old.status, sourceUpdated: true });
            }
          }
        }
        return added;
      })();
    },
    saveArticle(article) { db.prepare('UPDATE articles SET data=? WHERE id=?').run(JSON.stringify(article), article.id); return article; },
    drafts() { return decode(db.prepare('SELECT data FROM drafts ORDER BY rowid DESC').all()); },
    draft(id) { const r = db.prepare('SELECT data FROM drafts WHERE id=?').get(id); return r ? JSON.parse(r.data) : null; },
    nextRevision(articleId) { return (db.prepare('SELECT MAX(revision) AS revision FROM drafts WHERE article_id=?').get(articleId).revision || 0) + 1; },
    saveDraft(draft) {
      db.prepare('INSERT INTO drafts(id,article_id,revision,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(draft.id, draft.articleId, draft.revision, JSON.stringify(draft));
      return draft;
    },
    jobs() { return decode(db.prepare('SELECT data FROM jobs ORDER BY rowid DESC LIMIT 100').all()); },
    pendingJobs() { return decode(db.prepare("SELECT data FROM jobs WHERE status='pending' ORDER BY rowid").all()); },
    activeJob(articleId, type, draftId = null) {
      return decode(db.prepare("SELECT data FROM jobs WHERE status IN ('pending','processing') AND type=?").all(type)).find((j) => j.articleId === articleId && (draftId == null || j.draftId === draftId));
    },
    addJob(type, data, key = randomUUID()) {
      const active = store.activeJob(data.articleId, type, data.draftId);
      if (active) return active;
      const now = new Date().toISOString();
      const job = { id: randomUUID(), type, status: 'pending', error: null, createdAt: now, updatedAt: now, ...data };
      db.prepare('INSERT INTO jobs(id,job_key,type,status,data) VALUES(?,?,?,?,?)').run(job.id, key, type, job.status, JSON.stringify(job));
      return job;
    },
    saveJob(job) {
      job.updatedAt = new Date().toISOString();
      db.prepare('UPDATE jobs SET status=?,data=? WHERE id=?').run(job.status, JSON.stringify(job), job.id);
      return job;
    },
    usage(kind, day = localDay()) { return db.prepare('SELECT COUNT(*) AS n FROM quota_events WHERE kind=? AND day=?').get(kind, day).n; },
    draftUsage() { return store.usage('text') + store.usage('local-text'); },
    reserve(job, kind, limit) {
      return db.transaction(() => {
        if (db.prepare('SELECT job_id FROM quota_events WHERE job_id=?').get(job.id)) return;
        if ((['text', 'local-text'].includes(kind) ? store.draftUsage() : store.usage(kind)) >= limit) {
          const error = new Error(kind !== 'image' ? 'Đã đạt hạn mức tạo bài hôm nay. Tăng hạn mức trong Cài đặt hoặc thử vào ngày mai.' : 'Đã đạt hạn mức tạo ảnh hôm nay. Tăng hạn mức trong Cài đặt hoặc thử vào ngày mai.');
          error.code = 'quota';
          throw error;
        }
        db.prepare('INSERT INTO quota_events(job_id,kind,day,data) VALUES(?,?,?,?)').run(job.id, kind, localDay(), JSON.stringify({ createdAt: new Date().toISOString(), status: 'reserved' }));
      })();
    },
    recordUsage(job, data) { db.prepare('UPDATE quota_events SET data=? WHERE job_id=?').run(JSON.stringify(data), job.id); },
    recoverJobs() {
      for (const job of decode(db.prepare("SELECT data FROM jobs WHERE status='processing'").all())) {
        store.saveJob({ ...job, status: 'failed', error: 'Ứng dụng đã dừng giữa tác vụ. Kết quả API có thể chưa xác định; kiểm tra bài/ảnh trước khi tạo lại.' });
        if (job.type === 'build_draft') {
          const article = store.article(job.articleId);
          if (article) store.saveArticle({ ...article, status: 'uncertain' });
        }
        const draft = job.draftId && store.draft(job.draftId);
        if (draft?.imageStatus === 'processing') store.saveDraft({ ...draft, imageStatus: 'error', imageError: 'Tác vụ ảnh bị gián đoạn. Có thể thử lại sau khi kiểm tra kết quả.' });
      }
    },
  };
  return store;
}

export function validateSettings(input, previous = defaults) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Cài đặt không hợp lệ.');
  const next = { ...previous };
  for (const key of ['autoFetch', 'autoGenerate', 'autoImage']) {
    if (key in input) {
      if (typeof input[key] !== 'boolean') throw new Error(`${key} phải là bật hoặc tắt.`);
      next[key] = input[key];
    }
  }
  for (const [key, min, max] of [['fetchIntervalMinutes', 5, 1440], ['dailyDraftLimit', 1, 100], ['dailyImageLimit', 1, 100], ['dailyTarget', 3, 5]]) {
    if (key in input) {
      if (!Number.isInteger(input[key]) || input[key] < min || input[key] > max) throw new Error(`${key} phải là số nguyên từ ${min} đến ${max}.`);
      next[key] = input[key];
    }
  }
  for (const key of ['tone', 'audience']) {
    if (key in input) {
      if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 200) throw new Error(`${key} cần từ 1 đến 200 ký tự.`);
      next[key] = input[key].trim();
    }
  }
  if ('writingMode' in input) {
    if (!['ai', 'free'].includes(input.writingMode)) throw new Error('Chọn chế độ OpenAI hoặc mẫu miễn phí.');
    next.writingMode = input.writingMode;
  }
  for (const [key, max] of [['focusArea', 140], ['projectContext', 6000], ['styleSamples', 4000], ['styleGuide', 1200], ['brandName', 70], ['websiteUrl', 1000]]) {
    if (key in input) {
      if (typeof input[key] !== 'string' || input[key].length > max) throw new Error(`${key} tối đa ${max} ký tự.`);
      next[key] = input[key].trim();
    }
  }
  for (const [key, values] of [['contentMix', ['mixed', 'analysis', 'project']], ['imageStyle', ['photo', 'premium', 'editorial']], ['imageMode', ['ai', 'template']], ['imageModel', ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-1.5', 'gpt-image-1']], ['imageQuality', ['medium', 'high']]]) {
    if (key in input) {
      if (!values.includes(input[key])) throw new Error(`${key} không hợp lệ.`);
      next[key] = input[key];
    }
  }
  if (next.websiteUrl) {
    try {
      const url = new URL(next.websiteUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { throw new Error('Website cần là link HTTPS, không chứa thông tin đăng nhập.'); }
  }
  return next;
}
