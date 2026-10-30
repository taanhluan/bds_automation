import fs from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
for (const name of await fs.readdir('dist/assets')) {
  if (!/\.(js|css)$/.test(name)) continue;
  const filename = path.join('dist/assets', name), data = await fs.readFile(filename);
  await Promise.all([fs.writeFile(filename + '.br', brotliCompressSync(data)), fs.writeFile(filename + '.gz', gzipSync(data, { level: 9 }))]);
}
console.log('Static JS/CSS compression complete.');
