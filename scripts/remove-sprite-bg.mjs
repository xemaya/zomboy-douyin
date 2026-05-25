// scripts/remove-sprite-bg.mjs
// 抠掉 AI 生成 sprite 烤进像素的「假透明」棋盘格 / 纯色背景。
//
// 判据：背景 = 高亮度 + 低饱和度（灰/白），且与图像边缘连通。
//   - 棋盘格的灰/白是无彩色（max-min≈0）→ 删
//   - 米色砖、红顶、黄墙、蓝衣、绿脸等有彩色物体 → 保留
//   - 暗色描边亮度低 → 不算背景，flood 在此停下，保护物体内部浅色像素
//
// 用法：node scripts/remove-sprite-bg.mjs [file ...]   （默认修 4 张坏图）

import sharp from 'sharp';
import { join } from 'path';

const DIR = 'assets/sprites';
// house_empty.png 渲染未用到，且其棋盘格是暗灰（低于亮度阈值），故不在默认列表
const DEFAULT = ['survivor_blue.png', 'house_tile.png', 'start_tile.png'];

const BRIGHT_MIN = 150;  // 背景至少这么亮
const SAT_MAX = 36;      // 背景饱和度上限（max-min）

function isBgColor(r, g, b) {
  const bright = Math.max(r, g, b);
  const sat = bright - Math.min(r, g, b);
  return bright >= BRIGHT_MIN && sat <= SAT_MAX;
}

async function processFile(file) {
  const path = join(DIR, file);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ch = info.channels;
  const idx = (x, y) => (y * W + x) * ch;

  const removed = new Uint8Array(W * H);
  const queue = [];
  const seed = (x, y) => {
    const p = y * W + x;
    if (removed[p]) return;
    const i = idx(x, y);
    if (data[i + 3] === 0) { removed[p] = 1; return; } // 已透明，照样作为可穿越的“背景”
    if (isBgColor(data[i], data[i + 1], data[i + 2])) { removed[p] = 1; queue.push(p); }
  };
  // 从四条边播种
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }

  // BFS 4-邻接向内扩散
  while (queue.length) {
    const p = queue.pop();
    const x = p % W, y = (p / W) | 0;
    const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of nb) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const np = ny * W + nx;
      if (removed[np]) continue;
      const i = idx(nx, ny);
      if (data[i + 3] === 0) { removed[np] = 1; continue; }
      if (isBgColor(data[i], data[i + 1], data[i + 2])) { removed[np] = 1; queue.push(np); }
    }
  }

  // 应用：背景像素 alpha=0
  let cleared = 0;
  for (let p = 0; p < W * H; p++) {
    if (removed[p]) { data[idx(p % W, (p / W) | 0) + 3] = 0; cleared++; }
  }

  await sharp(data, { raw: { width: W, height: H, channels: ch } })
    .png({ palette: false, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path + '.tmp');

  const { rename, unlink } = await import('fs/promises');
  await unlink(path);
  await rename(path + '.tmp', path);

  console.log(`  ${file}: 抠掉背景 ${(cleared / (W * H) * 100).toFixed(1)}%`);
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
console.log(`去背景：${files.join(', ')}`);
for (const f of files) await processFile(f);
console.log('完成。');
