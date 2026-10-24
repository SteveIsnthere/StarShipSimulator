import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      $core: fileURLToPath(new URL('./src/core', import.meta.url)),
      $app: fileURLToPath(new URL('./src/app', import.meta.url)),
      $view: fileURLToPath(new URL('./src/view', import.meta.url)),
      $hud: fileURLToPath(new URL('./src/hud', import.meta.url)),
      $ui: fileURLToPath(new URL('./src/ui', import.meta.url)),
      $audio: fileURLToPath(new URL('./src/audio', import.meta.url)),
      // flight_sim's kit, vendored byte-for-byte; it imports itself as @ui.
      '@ui': fileURLToPath(new URL('./src/ui/kit', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      output: {
        // The live app and optional diagnostics share the simulation. Keep its
        // static dependency graph together instead of compressing state and
        // stepping separately; it remains in the measured first load.
        manualChunks(id) {
          if (id.includes('/src/core/') || id.endsWith('/src/app/loop.ts')) return 'simulation';
        },
      },
    },
  },
});
