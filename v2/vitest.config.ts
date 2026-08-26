import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      $core: fileURLToPath(new URL('./src/core', import.meta.url)),
      $app: fileURLToPath(new URL('./src/app', import.meta.url)),
      $view: fileURLToPath(new URL('./src/view', import.meta.url)),
      $hud: fileURLToPath(new URL('./src/hud', import.meta.url)),
      $ui: fileURLToPath(new URL('./src/ui', import.meta.url)),
      $audio: fileURLToPath(new URL('./src/audio', import.meta.url)),
    },
  },
  test: {
    // core/ must run in plain Node with no browser. Keeping the default
    // environment enforces that: a DOM leak into core/ fails here, not in review.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
