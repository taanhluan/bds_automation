import { config } from '../server/config.js';
import { requireOpenAIKey, buildDraft } from '../server/ai.js';
import { fetchFeed } from '../server/rss.js';
import { renderCover } from '../server/images.js';
import { createStore } from '../server/store.js';
import { facebookPost } from '../shared/facebook.js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

let store;
let attempt;
try {
  requireOpenAIKey();
  store = createStore(config.dataDir);
  store.saveSettings({ autoGenerate: false });
  if (store.jobs().some(job => ['pending', 'processing'].includes(job.status) && !job.articleSnapshot?.isDemo && !job.draftSnapshot?.isDemo)) throw new Error('Đang có tác vụ thật chờ xử lý. Đợi chúng hoàn tất trước khi chạy test một bài.');
  const article = (await fetchFeed()).find(item => item.summary.length >= 40);
  if (!article) throw new Error('Chưa có tin RSS đủ thông tin để thử.');
  store.importArticles([article]);
  attempt = { id: randomUUID() };
  // Explicit one-off test allowance; persisted application limit remains unchanged.
  const extraAttempt = process.argv.includes('--extra-attempt') ? 1 : 0;
  store.reserve(attempt, 'text', store.settings().dailyDraftLimit + extraAttempt);
  console.log(`Đang thử đúng 1 bài với ${config.textModel}; không gọi API ảnh, không retry.`);
  const result = await buildDraft(article, { ...store.settings(), writingMode: 'ai' });
  store.recordUsage(attempt, { status: 'completed', model: config.textModel, ...result.usage });
  const content = `${result.content}\n\nNguồn: ${article.source}\n${article.url}`;
  const png = await renderCover({ title: result.title, topic: article.topic, isDemo: false });
  const id = randomUUID();
  const filename = `${id}.png`;
  await fs.writeFile(path.join(store.assetsDir, filename), png);
  const now = new Date().toISOString();
  const savedDraft = store.saveDraft({ ...result, generationProvider: result.provider, id, articleId: article.id, title: result.title, content, aiContent: content, facts: result.facts, reviewFlags: result.reviewFlags, imageBrief: result.imageBrief, imageUrl: `/api/assets/${filename}`, imageStatus: 'ready', imageError: null, imageKind: 'template', status: 'draft', isDemo: false, revision: store.nextRevision(article.id), contentRevision: 1, imageContentRevision: 1, sourceTitle: article.title, sourceSummary: article.summary, createdAt: now, updatedAt: now, copiedAt: null, generationModel: config.textModel, cacheHit: false });
  store.saveArticle({ ...store.article(article.id), status: 'generated' });
  const output = path.join(config.dataDir, 'live-test');
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'draft.txt'), content);
  await fs.writeFile(path.join(output, 'perspective-post.txt'), facebookPost(savedDraft, article));
  await fs.writeFile(path.join(output, 'cover.png'), png);
  const estimatedUsd = config.textModel === 'gpt-4o-mini' && result.usage ? (result.usage.inputTokens * 0.15 + result.usage.outputTokens * 0.60) / 1_000_000 : null;
  const report = { result: 'PASS', model: config.textModel, draftId: id, source: article.url, usage: result.usage, estimatedUsd, imageApiCalls: 0, output };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('Bài đã nằm trong tab Bài nháp. Ước tính giá theo bảng giá standard; hóa đơn nhà cung cấp là số chính thức.');
} catch (error) {
  if (store && attempt) store.recordUsage(attempt, { status: 'failed', code: error.code || 'error', ...error.usage });
  if (error.draftPreview) {
    const output = path.join(config.dataDir, 'live-test');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'unapproved-diagnostic.json'), JSON.stringify({ error: error.message, usage: error.usage, unapprovedDraft: error.draftPreview }, null, 2));
  }
  console.error(error.message);
  process.exitCode = 1;
} finally { store?.close(); }
