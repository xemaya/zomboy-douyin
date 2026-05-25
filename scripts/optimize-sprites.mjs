import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'fs/promises';
import { join } from 'path';

const SPRITES_DIR = 'assets/sprites';
const TARGET_SIZE = 128;

async function compressWithAlpha(path) {
  const tmpPath = path + '.tmp';

  // First try palette mode with alpha
  await sharp(path)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toFile(tmpPath);

  // Verify alpha survived
  const meta = await sharp(tmpPath).metadata();
  if (!meta.hasAlpha) {
    // Fall back to non-palette RGBA PNG
    console.log(`  ${path}: palette mode dropped alpha, retrying with RGBA PNG`);
    await unlink(tmpPath);
    await sharp(path)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .ensureAlpha()
      .png({ palette: false, compressionLevel: 9, adaptiveFiltering: true })
      .toFile(tmpPath);
  }

  await unlink(path);
  await rename(tmpPath, path);
}

async function optimizeOne(path) {
  const before = (await stat(path)).size;
  await compressWithAlpha(path);
  const after = (await stat(path)).size;
  const ratio = ((1 - after / before) * 100).toFixed(1);
  const meta = await sharp(path).metadata();
  console.log(`  ${path}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (-${ratio}%) ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha}`);
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

  // Final verification: all files MUST have alpha
  for (const f of files) {
    const meta = await sharp(join(SPRITES_DIR, f)).metadata();
    if (!meta.hasAlpha) {
      console.error(`❌ ${f} STILL has no alpha channel after retry!`);
      process.exit(1);
    }
  }
  console.log('✅ All 7 sprites have transparent alpha.');
}

main().catch(e => { console.error(e); process.exit(1); });
