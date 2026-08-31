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
    coverage: {
      provider: 'v8',
      // src/core/** ONLY. M10 is about physics and control logic; view/, hud/,
      // audio/, ui/ and app/ have their own suites and are explicitly out of
      // scope (docs/VERIFICATION-PLAN.md § Scope).
      // A file with no tests at all still counts against the number: in Vitest 4
      // that is the default for everything matched by `include`, and the old
      // `all: true` flag is gone (svelte-check rejects it — CoverageOptions has
      // no such property). Verified rather than assumed: `version.ts` is
      // imported by no test and reports 0% line, so untested files are counted.
      include: ['src/core/**'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      // Thresholds land at M10.8, deliberately not here: M10.1 only measures,
      // and a threshold invented before the baseline is a guess with a number
      // painted on it.
    },
  },
});
