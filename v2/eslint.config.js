import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

/**
 * The six walls (CLAUDE.md). Each maps to a specific 2021 wound:
 *
 *   1. core/ imports nothing from view/ ui/ hud/ app/ — the boundary itself.
 *   2. no document/window/PIXI in core/ — getElementById ran inside the physics loop.
 *   3. no Math.random in core/ — unseeded randomness makes golden fixtures impossible.
 *   4. no Date.now/performance.now in core/ — time enters the sim only as dt.
 *   5. no setTimeout/setInterval in core/ — engine ignition ran on wall-clock timers.
 *   6. no globalThis assignment anywhere in v2/ — the old tree had 355 globals.
 *
 * Walls 1-5 are scoped to src/core. Wall 6 is repo-wide.
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
            'svelte',
            'svelte/*',
          ],
          message: 'Wall 1: core/ is pure. No renderer, UI, HUD or app imports.',
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

/** Wall 6 applies to all of v2/, not just core/. */
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
      // The staged copy of dist/ that the subpath deploy test serves (M5.3).
      '.subpath/**',
      'node_modules/**',
      'tests/lint-walls/fixtures/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,

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
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        // The Svelte parser handles the template; TypeScript inside
        // <script lang="ts"> needs the TS parser delegated to explicitly, or
        // inline `type` imports fail to parse.
        parser: ts.parser,
        projectService: true,
        extraFileExtensions: ['.svelte'],
        svelteConfig,
      },
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
