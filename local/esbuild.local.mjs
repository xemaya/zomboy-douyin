// local/esbuild.local.mjs — 本地浏览器构建（iife，含 tt 垫片）。与生产构建（dist/game.js）独立。
import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['local/entry.ts'],
  bundle: true,
  outfile: 'local/dist/game.local.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2017',
  sourcemap: 'inline',
  logLevel: 'info'
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[local] watching...');
} else {
  await esbuild.build(config);
}
