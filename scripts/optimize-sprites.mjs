import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'fs/promises';
import { join } from 'path';

const SPRITES_DIR = 'assets/sprites';
const TARGET_SIZE = 128;

async function optimizeOne(path) {
  const before = (await stat(path)).size;
  const tmpPath = path + '.tmp';

  await sharp(path)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ palette: true, compressionLevel: 9, quality: 80 })
    .toFile(tmpPath);

  await unlink(path);
  await rename(tmpPath, path);

  const after = (await stat(path)).size;
  const ratio = ((1 - after / before) * 100).toFixed(1);
  console.log(`  ${path}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (-${ratio}%)`);
  return after;
}

async function main() {
  const files = (await readdir(SPRITES_DIR)).filter(f => f.endsWith('.png'));
  console.log(`Optimizing ${files.length} sprites in ${SPRITES_DIR}...\n`);

  let totalAfter = 0;
  for (const f of files) {
    totalAfter += await optimizeOne(join(SPRITES_DIR, f));
  }

  console.log(`\nTotal after: ${(totalAfter / 1024).toFixed(0)}KB (${(totalAfter / 1024 / 1024).toFixed(2)}MB)`);
  if (totalAfter > 3 * 1024 * 1024) {
    console.error(`❌ Total exceeds 3MB target.`);
    process.exit(1);
  }
  console.log('✅ Within 3MB budget.');
}

main().catch(e => { console.error(e); process.exit(1); });
