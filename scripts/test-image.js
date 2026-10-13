import { config } from '../server/config.js';
import { requireOpenAIKey } from '../server/ai.js';
import { generateBackground, renderCover } from '../server/images.js';
import { createStore } from '../server/store.js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

let store;
let attempt;
let receivedImage = false;
try {
  requireOpenAIKey();
  store = createStore(config.dataDir);
  const draft = store.drafts().find(item => !item.isDemo);
  if (!draft) throw new Error('Cần một bài nháp thật trước khi thử API ảnh.');
  if (store.jobs().some(job => job.type === 'generate_image' && ['pending', 'processing'].includes(job.status))) throw new Error('Đang có tác vụ tạo ảnh. Đợi tác vụ đó hoàn tất trước khi test.');
  const article = store.article(draft.articleId);
  attempt = { id: randomUUID() };
  store.reserve(attempt, 'image', store.settings().dailyImageLimit);
  console.log(`Gọi đúng 1 ảnh ${config.imageModel}, 1024×1024, quality=low. Không retry; giữ LOW_COST_MODE=${config.lowCostMode}.`);
  const result = await generateBackground(draft.imageBrief);
  receivedImage = true;
  store.recordUsage(attempt, { status: 'completed', model: config.imageModel, ...(result.usage || {}) });
  const output = path.join(config.dataDir, 'live-test');
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'ai-background.png'), result.buffer);
  const png = await renderCover({ title: draft.title, topic: article?.topic, isDemo: false, background: result.buffer, source: article?.source, sourceUrl: article?.url, sourceSummary: draft.sourceSummary || article?.summary, publishedAt: article?.publishedAt });
  const filename = `${attempt.id}.png`;
  await fs.writeFile(path.join(store.assetsDir, filename), png);
  await fs.writeFile(path.join(output, 'ai-cover.png'), png);
  const latest = store.draft(draft.id);
  const changed = (latest.contentRevision || 1) !== (draft.contentRevision || 1);
  store.saveDraft({ ...latest, imageUrl: `/api/assets/${filename}`, imageKind: 'ai', imageStatus: changed ? 'stale' : 'ready', imageError: changed ? 'Bài đã được sửa trong lúc tạo ảnh. Kiểm tra hình trước khi sử dụng.' : null, imageContentRevision: draft.contentRevision || 1, updatedAt: new Date().toISOString() });
  const report = { result: 'PASS', model: config.imageModel, draftId: draft.id, imageApiCalls: 1, quality: 'low', usage: result.usage || null, background: path.join(output, 'ai-background.png'), cover: path.join(output, 'ai-cover.png'), lowCostModeUnchanged: config.lowCostMode };
  await fs.writeFile(path.join(output, 'image-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (store && attempt && !receivedImage) store.recordUsage(attempt, { status: error.code === 'uncertain' ? 'uncertain' : 'failed', code: error.code || 'error' });
  console.error(error.message);
  if (receivedImage) console.error('API đã trả ảnh; không gọi lại. Kiểm tra data/live-test/ai-background.png.');
  process.exitCode = 1;
} finally { store?.close(); }
