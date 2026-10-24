import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * The seven walls (`sim-core-conventions`). Each maps to a specific 2021 wound:
 *
 *   1. core/ imports nothing from view/ ui/ hud/ app/ — the boundary itself.
 *   2. no document/window/PIXI in core/ — getElementById ran inside the physics loop.
 *   3. no Math.random in core/ — unseeded randomness makes golden fixtures impossible.
 *   4. no Date.now/performance.now in core/ — time enters the sim only as dt.
 *   5. no setTimeout/setInterval in core/ — engine ignition ran on wall-clock timers.
 *   6. no globalThis assignment anywhere in the repo — the old tree had 355 globals.
 *   7. core/ imports nothing from audio/ — sound is an OUTPUT of the simulation.
 *
 * Walls 1-5 and 7 are scoped to src/core. Wall 6 is repo-wide.
 * tests/lint-walls/ feeds one violating fixture per wall to ESLint and asserts it fails.
 */
export const CORE_WALL_RULES = {
  // Wall 1 — the boundary.
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: [
            '**/view/**',
            '**/ui/**',
            '**/hud/**',
            '**/app/**',
            '$view/*',
            '$ui/*',
            '$hud/*',
            '$app/*',
            'pixi.js',
            'pixi.js/*',
            'react',
            'react/*',
            'react-dom',
            'react-dom/*',
            'zustand',
            'zustand/*',
            '@ui',
            '@ui/*',
          ],
          message: 'Wall 1: core/ is pure. No renderer, UI, HUD or app imports.',
        },
        {
          /*
            Wall 7 (M8.1) — sound is an OUTPUT of the simulation, never an input
            to it.

            Its own group rather than four more entries in Wall 1's, so the
            message names the wall it is: a violation should say what rule it
            broke and why, and "no renderer, UI, HUD or app imports" would be the
            wrong explanation for an audio import. SOUND-PLAN § 5 is the reason
            it exists — if the audio layer needs a physical value that is not in
            SimState, the answer is to derive it in `audio/`, not to add it to
            core and move the goldens.
          */
          group: ['**/audio/**', '$audio', '$audio/*'],
          message: 'Wall 7: core/ may not import audio/. Sound is an output, not an input.',
        },
      ],
    },
  ],

  // Wall 2 — no DOM.
  'no-restricted-globals': [
    'error',
    { name: 'document', message: 'Wall 2: no DOM in core/. getElementById was in the physics loop.' },
    { name: 'window', message: 'Wall 2: no DOM in core/.' },
    { name: 'PIXI', message: 'Wall 2: no renderer in core/.' },
    { name: 'navigator', message: 'Wall 2: no DOM in core/.' },
  ],

  // Walls 3 and 4 — seeded randomness, and time only as dt.
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Wall 3: use core/rng.ts seeded streams.' },
    { object: 'Date', property: 'now', message: 'Wall 4: time enters core/ only as dt.' },
    { object: 'performance', property: 'now', message: 'Wall 4: time enters core/ only as dt.' },
  ],

  // Wall 5 — no wall-clock timers. Wall 2/4 backstops for forms the rules above miss.
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.name=/^(setTimeout|setInterval|requestAnimationFrame)$/]",
      message: 'Wall 5: no wall-clock timers in core/. Ignition is a dt-ticked field in SimState.',
    },
    {
      selector: "NewExpression[callee.name='Date']",
      message: 'Wall 4: time enters core/ only as dt.',
    },
    {
      selector: "MemberExpression[object.name='globalThis'][property.name=/^(document|window|performance)$/]",
      message: 'Wall 2: no DOM in core/.',
    },
  ],
};

/** Wall 6 applies to the whole repo, not just core/. */
export const NO_GLOBALS_RULE = {
  'no-restricted-syntax': [
    'error',
    {
      selector: "AssignmentExpression[left.object.name='globalThis']",
      message: 'Wall 6: no globals. The 2021 tree had 355.',
    },
    {
      selector: "MemberExpression[object.name='globalThis'][parent.type='AssignmentExpression']",
      message: 'Wall 6: no globals. The 2021 tree had 355.',
    },
  ],
};

export default ts.config(
  {
    ignores: [
      'dist/**',
      // Immutable generated Vite evidence, not source; exact bytes are pinned
      // by fall-bundle-proof-receipt/bundle-hashes.json.
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/counted/entry.mjs',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/counted/serviceworker.js',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/counted/simulation-DqUEjDAx.js',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/plain/entry.mjs',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/plain/serviceworker.js',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/plain/simulation-C1HMHBVP.js',
      // Exact immutable historical launch/materialization/control receipts;
      // artifact SHA/roles are pinned by the independently reviewed archive inventory.
      'docs/research/2026-10-04-cloud-resume/cloud-mesa-full-application-budget-proposal/single-launch-300-instrumentation/ansi-string-controls.mjs',
      'docs/research/2026-10-04-cloud-resume/comparator-descendant-certificates/owned-launch-gnJQ764p/launcher.mjs',
      'docs/research/2026-10-04-cloud-resume/comparator-descendant-certificates/receipt-controls-9a62a009-5818-402e-a3f1-4494cdddcc86/materialized/controls.mjs',
      'docs/research/2026-10-04-cloud-resume/comparator-puregraph-inspector/owned-launch-VjKEzG1y/launcher.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-burn-continuation/owned-launch-UMyDaZjZ/launcher.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-burn-continuation/receipt-burn-218a5089-4c17-418e-a74c-ff0bbe6dcfa4/materialized/burn.ts',
      'docs/research/2026-10-04-cloud-resume/current-native-composite-paired-descendants/owned-launch-qEmDOnAe/launcher.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-composite-paired/owned-launch-zVLutZ3O/launcher.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/owned-launch-YzmAG0dg/launcher.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/counted/entry.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/counted/simulation-Yh007HZ3.js',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/materialized/boundary.test.ts',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/materialized/builder.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/materialized/burn.ts',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/materialized/fall-adapter.ts',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/materialized/preparation.test.ts',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/plain/entry.mjs',
      'docs/research/2026-10-04-cloud-resume/current-native-qualification-harness/receipt-kernels-81ad7128-21e6-49f7-9bbc-232564a1130e/plain/simulation-Cnsem1hb.js',
      // flight_sim's kit, vendored byte-for-byte; flight_sim lints it.
      'src/ui/kit/**',
      // The staged copy of dist/ that the subpath deploy test serves (M5.3).
      '.subpath/**',
      /*
        The archived 2021 tree (M5.4, archived M10.2). Nothing executes it any
        more; it is kept as a historical reference and must not be edited. It
        predates every rule in this file — it
        assigns to globalThis 355 times, which is wall 6, which is the point.
        Linting it would report thousands of errors about code that is
        deliberately unchanged.
      */
      'tests/fixtures/legacy/**',
      'node_modules/**',
      'tests/lint-walls/fixtures/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  js.configs.recommended,
  ...ts.configs.recommended,

  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      ...NO_GLOBALS_RULE,
    },
  },

  {
    // The rules of hooks, as flight_sim applies them to the same kit.
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },

  {
    // The session is framework-free: the shell renders it, it never renders.
    files: ['src/ui/session/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Exact: zustand/vanilla is the framework-free store the session uses.
          paths: [{ name: 'zustand', message: 'src/ui/session is framework-free: use zustand/vanilla.' }],
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*', '@ui', '@ui/*', '$ui/shell/*'],
              message: 'src/ui/session is framework-free: no React and no shell imports.',
            },
          ],
        },
      ],
    },
  },

  {
    // The shell reaches the world, sound and loop only through the session.
    files: ['src/ui/shell/**/*.ts', 'src/ui/shell/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['$view/*', '$audio/*'],
              message: 'The shell talks to src/ui/session, not to the view or audio layers directly.',
            },
          ],
        },
      ],
    },
  },

  // The protected zone.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      ...CORE_WALL_RULES,
      // Wall 6 must survive the wall-5 override of the same rule name.
      'no-restricted-syntax': [
        'error',
        ...CORE_WALL_RULES['no-restricted-syntax'].slice(1),
        ...NO_GLOBALS_RULE['no-restricted-syntax'].slice(1),
      ],
    },
  },
);
