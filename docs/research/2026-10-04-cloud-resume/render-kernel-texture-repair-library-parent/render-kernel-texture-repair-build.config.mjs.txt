/** Research-only isolated ESM output; never overwrite the application dist. */
import { defineConfig } from 'vite';
import path from 'node:path';
const repo = '/workspace/StarShipSimulator';
const output = process.env.RENDER_KERNEL_OUTPUT;
if (!output || !/^\/tmp\/starship-render-kernel\.[A-Za-z0-9]+\/compiled$/.test(output)) throw Error('Exact fresh owned research output directory required');
export default defineConfig({
  root: repo, base: './', publicDir: false,
  resolve: { alias: Object.fromEntries(['core','app','view','hud','ui','audio'].map(name => [`$${name}`,path.join(repo,'src',name)])) },
  build: { target: 'es2022', sourcemap: true, outDir: output, emptyOutDir: false,
    lib: { entry: path.join(repo,'docs/research/2026-10-04-cloud-resume/render-kernel-texture-repair-entry.ts'), formats: ['es'], fileName: () => 'kernel.js' },
  },
});
