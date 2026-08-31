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
      // `json` as well as the summary: the text table TRUNCATES its uncovered
      // line column (primitives.ts prints as `...2,416,453,457-465`), and
      // json-summary carries totals only. M10.5 and M10.6 have to target
      // specific uncovered branches, and the plan's reproduction check claims
      // identical uncovered line numbers — neither is possible without the
      // per-line data in coverage-final.json.
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      /**
       * M10.8 — the number cannot regress.
       *
       * Every figure below was MEASURED (M10.1 established the baseline, M10.3
       * to M10.7 raised it) and is set at or just under what the suite actually
       * achieves, so a real regression fails the gate rather than being
       * absorbed by slack. The per-module floors are the ones M10.1 derived and
       * argued for; the aggregate is deliberately the weakest of the four,
       * because a headline percentage is the easiest thing to hold up while a
       * single module rots underneath it.
       *
       * NOT 100%, on purpose. Some branches are defensive — clamps that fire
       * only on inputs no caller can produce — and the last few points are
       * where the incentive inverts: a test written to reach a line without
       * asserting anything scores exactly the same as a real one, and is worse
       * than an uncovered branch because it reads as covered. Where a branch
       * turns out to be genuinely unreachable the rule is to document it in
       * docs/VERIFICATION-PLAN.md with the argument, not to manufacture a test
       * that executes it.
       *
       * A note on the two modules reporting 0/0 branches: `thermal.ts`,
       * `prediction.ts`, `rng.ts`, `units.ts` and `constants.ts` have no
       * branches at all, so a branch threshold on them is vacuous. They are
       * held by line coverage and by their own tests. `version.ts` is
       * permanently 0% line — a version string no test imports — and stays in
       * scope rather than being excluded to flatter the aggregate, which is why
       * the global line floor is 98 and not 99.
       */
      thresholds: {
        // Aggregate over src/core/**. Measured 97.4 branch / 99.1 line.
        branches: 96,
        lines: 98,
        functions: 98,
        statements: 98,

        // Physics is fully covered and must stay that way: it is the layer
        // whose errors are least visible in a trajectory.
        'src/core/physics/**': { branches: 100, lines: 100, functions: 100, statements: 98 },

        // The two densest control modules, at the floors M10.1 set.
        'src/core/control/**': { branches: 95, lines: 95, functions: 95, statements: 95 },
        'src/core/autopilot/**': { branches: 95, lines: 99, functions: 100, statements: 99 },
      },
    },
  },
});
