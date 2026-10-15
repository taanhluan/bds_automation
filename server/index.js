import { config, defaults } from './config.js';
import { createStore } from './store.js';
import { createWorker } from './worker.js';
import { createApp } from './app.js';

const port = Number(config.production ? process.env.PORT || 3000 : process.env.API_PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port không hợp lệ.');
const store = createStore(config.dataDir);
if (config.lowCostMode !== false && !store.meta('lowCostDefaultsV1')) {
  store.saveSettings({ autoGenerate: false });
  store.setMeta('lowCostDefaultsV1', 'applied');
}
if (!store.meta('editorialV2')) {
  store.saveSettings({ autoGenerate: true, dailyTarget: 5, contentMix: 'mixed', imageStyle: 'premium' });
  store.setMeta('editorialV2', 'applied');
}
if (!store.meta('realisticImagesV3')) {
  const settings = store.settings();
  const next = { imageStyle: 'photo', imageMode: 'ai', imageQuality: 'high' };
  if (settings.dailyImageLimit === 3) next.dailyImageLimit = 5;
  if (settings.brandName === 'Đức Vượng · Góc nhìn bất động sản') next.brandName = defaults.brandName;
  if (settings.tone === 'Dễ hiểu, điềm tĩnh, có nhận xét thận trọng') next.tone = defaults.tone;
  if (settings.styleGuide.startsWith('Giọng Đức Vượng: rõ ràng, gần gũi,')) next.styleGuide = defaults.styleGuide;
  store.saveSettings(next);
  store.setMeta('realisticImagesV3', 'applied');
}
const worker = createWorker(store);
const app = createApp(store, worker);
const host = config.production ? '0.0.0.0' : '127.0.0.1';
const server = app.listen(port, host, () => {
  console.log(`Địa Ốc API: http://localhost:${port} · ${config.aiConfigured ? 'API key đã cấu hình' : 'Sẵn sàng thử bằng dữ liệu mẫu'}`);
  worker.start();
});
server.on('error', (error) => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} đang được sử dụng. Dừng ứng dụng cũ rồi chạy lại.` : error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    worker.stop();
    server.close(() => { store.close(); process.exit(0); });
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
