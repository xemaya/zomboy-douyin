import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['game-entry.ts'],
  bundle: true,
  outfile: 'dist/game.js',
  platform: 'neutral',
  format: 'cjs',
  target: 'es2017',
  logLevel: 'info',
  sourcemap: 'inline',
  loader: { '.png': 'file' }
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('watching...');
} else {
  await esbuild.build(config);
}
