# Architecture

The application is `v2/`: TypeScript, Svelte 5, PixiJS 8, built with Vite. This page is
the layer map, the rules that keep the simulation pure, and where things live.

## Layers

Dependencies point down. A layer may import from layers below it, never above.

| Layer | Path | Owns |
|---|---|---|
| ui | `src/ui/` | Svelte 5 components: menu, flight editor, panels, debrief, black box (lazy), the root `App.svelte` that mounts everything and runs the `requestAnimationFrame` tick |
| audio | `src/audio/` | Web Audio graph and mixer; maps SimState to sound parameters |
| hud | `src/hud/` | Per-frame readout binders, timeline, trajectory map, debrief figures, prediction |
| view | `src/view/` | PixiJS scene: camera, sky, terrain, clouds, pooled particles, vehicle. No game logic |
| app | `src/app/` | Fixed-timestep loop, input, flight recorder, offline (service worker) support |
| core | `src/core/` | The simulation: state, step, physics, control, autopilot, RNG, units, scenarios |

Path aliases `$core`, `$app`, `$view`, `$hud`, `$ui`, `$audio` are defined identically in
`tsconfig.json`, `vite.config.ts` and `vitest.config.ts`.

Only the `core/` boundary is machine-enforced (walls 1 and 7 below). Above core, the
direction is a convention, and it currently has one exception: `src/app/input.ts` imports
the `ControlEvent` type from `$ui/controls` (type-only, no runtime edge). The real import
graph otherwise follows the table: view imports only core; hud imports core and `DT` from
`$app/loop`; audio imports core and `limitState` from `$hud/metrics`; ui imports everything.

Per-frame work belongs to the HUD binders and Pixi. Svelte renders on interaction only.
The per-frame path does not allocate (particles are pooled), and DOM references are
cached at startup.

## Why core/ is pure

`core/` is state in, state out. It runs in plain Node with no browser, which is what makes
everything else possible: golden trajectories replay bit-for-bit, analytic-law tests call
physics functions directly, coverage is measured on it in isolation, and the vitest
environment is `node`, so a DOM leak into core fails at test time rather than in review.

`step(previous, dt, input = NO_INPUT)` in `src/core/step.ts` returns a new SimState and
never mutates the one it is given. Its phases run in a fixed order (environment, vehicle
status, flight parameters, controls) and several read what the previous phase wrote, so
reordering them is a physics change. Translation is integrated with velocity Verlet
(second order in gravity, aero forces held at the incoming velocity for the step).

## The seven walls

Defined in `v2/eslint.config.js` as two exported rule sets, `CORE_WALL_RULES` and
`NO_GLOBALS_RULE`. All are ESLint `error`s, so `npm run lint` fails on any violation.

| # | Rule | ESLint mechanism | Scope |
|---|---|---|---|
| 1 | No imports of view/ui/hud/app, `pixi.js`, or `svelte` (relative paths and `$` aliases) | `no-restricted-imports` | `src/core/**/*.ts` |
| 2 | No `document`, `window`, `navigator`, `PIXI`; no `globalThis.document/window/performance` | `no-restricted-globals`, `no-restricted-syntax` | core |
| 3 | No `Math.random`; use `core/rng.ts` | `no-restricted-properties` | core |
| 4 | No `Date.now`, `performance.now`, `new Date()`; time enters only as `dt` | `no-restricted-properties`, `no-restricted-syntax` | core |
| 5 | No `setTimeout`, `setInterval`, `requestAnimationFrame` | `no-restricted-syntax` | core |
| 6 | No assignment to `globalThis` | `no-restricted-syntax` | all of `v2/` |
| 7 | No imports of `audio/` (`**/audio/**`, `$audio`, `$audio/*`); sound is an output of the simulation, never an input | `no-restricted-imports` (own pattern group, own message) | core |

Each message names its wall. Because walls 4, 5 and 6 all use `no-restricted-syntax`, the
core override rebuilds that rule by concatenating both selector lists, so wall 6 survives
inside core.

ESLint ignores `dist/`, `.subpath/`, `node_modules/`, `playwright-report/`,
`test-results/`, `tests/lint-walls/fixtures/` and `tests/fixtures/legacy/`.

**The walls are tested.** `tests/lint-walls/walls.test.ts` runs the real config through
`ESLint.lintText` with a synthetic file path, so scoping is exercised as well as the rules:

- one fixture per wall (`fixtures/wall1-boundary.ts` … `wall7-audio.ts`) linted as
  `src/core/__wall_fixture__.ts`, asserting the expected rule fires the expected number of
  times with the wall's message;
- wall 6 asserted outside core too (`src/app/`, `src/view/`);
- walls 1, 2, 5 and 7 asserted *not* to fire outside core (view may import PIXI, hud may
  touch the DOM, app may use `requestAnimationFrame`, ui and app may import audio);
- `fixtures/clean.ts` produces zero messages in core.

## Determinism

- **Pure step.** Same state, `dt` and input give an identical SimState, always.
- **Counter-based RNG.** `src/core/rng.ts` computes each value as a hash of
  `(seed, stream, counter)`: FNV-1a over the stream name for a per-stream key, then a
  Murmur3-style 32-bit finaliser, divided by 2^32 to give `[0, 1)`. The `RngState` (seed
  plus per-stream counters) lives in `SimState.rng`, so a SimState fully determines every
  future draw. `peek` gives the Nth draw without advancing; `draw` advances the copy's
  counter. Streams are independent: adding a draw to one cannot shift another. The named
  streams are `ignitionDelay` and `ignitionFailure`. Render-effect randomness never shares a
  sim stream.
- **Fixed timestep.** `src/app/loop.ts` sets `DT = 1/120`. Frame time feeds an accumulator;
  whole steps are drained and the remainder is the render interpolation factor. Frame
  times above `MAX_FRAME_TIME = 0.25` s are clamped, and one frame never runs more than
  `MAX_STEPS_PER_FRAME = 2000` steps.
- **Time warp is N steps, never a scaled dt.** Warp N runs the step loop N times per drained
  increment. Slow motion scales the real time entering the accumulator, also never `dt`.
  A step always means the same thing, which is why warp and goldens coexist.

## Units

SI everywhere, with units in JSDoc on each SimState field. Angles are the one quantity with
two live representations, so `src/core/units.ts` brands them: `Rad` and `Deg` are
`number & { unique symbol }`. `rad()` / `deg()` tag, `toRad()` / `toDeg()` convert (in the
order `angle / 180 * PI`, which is bit-significant to the goldens). Passing degrees where
radians are expected does not compile; `tests/types/units.test-d.ts` proves it with
`@ts-expect-error` lines that `svelte-check` (part of `npm run build`) checks.

## Directory map of v2/

```
v2/
  src/
    main.ts        mounts App.svelte; registers the service worker in production
    core/          state step rng units constants scenarios
      physics/     aero atmosphere components engines gravity isa mass prediction thermal
      control/     actuation commands primitives
      autopilot/   index.ts (the stage machines)
    app/           loop input recorder offline
    view/ hud/ audio/ ui/   (ui/fonts/ holds committed woff2 subsets)
  tests/
    core/ app/ view/ hud/ audio/ ui/   unit suites per layer
    golden/        trajectory fixtures, recorder, replay, digest audit
    proofs/        1-ULP proofs for Refactor-tier changes
    lint-walls/    one violating fixture per wall + the test that lints them
    types/         compile-time assertions (units)
    diffs/         before/after trajectory scripts for Bug-fix commits
    e2e/           Playwright specs, helpers.ts, pixels.ts harness
    deploy/        subpath deploy spec
    fixtures/legacy/  the archived 2021 tree
  scripts/
    build-sw.mjs        service worker precache list, derived from dist/
    check-budget.mjs    budget gate: first-load JS 250 kB gzip, fonts 80 kB, audio 250 kB
    stage-subpath.mjs   copies dist/ under a subdirectory for the deploy test
    subset-fonts.mjs    regenerates the woff2 subsets (manual; needs Python fontTools)
  public/        icon.svg, manifest.webmanifest, assets/*.webp
```

`npm run build` is `svelte-check` → `vite build` (`base: './'`) → `build-sw.mjs` →
`check-budget.mjs`.

## The archived 2021 tree

`v2/tests/fixtures/legacy/` holds the original 2021 simulator (backend, render,
displayComponents, utilities, its own service worker). It is a historical reference for
humans only, kept so porting notes that cite file and line still resolve. Nothing builds,
serves, imports or executes it: ESLint ignores it, no test or script references it, and
correctness is defined by closed-form physics, published data and stated contracts, not
by agreement with it. Do not modify it. See its `README.md`.

## CI

Both workflows run in `v2/` on `ubuntu-latest` with Node 22 (`actions/setup-node@v4`, npm
cache keyed on `v2/package-lock.json`) and install with `npm ci`.

**`.github/workflows/ci.yml`** — on every push to any branch and on pull requests;
superseded runs on the same ref are cancelled.

- `verify` (timeout 45 min): `npm run lint` → `npm run build` (includes budget) →
  `npm run test` → `npm run coverage` → `npx playwright install --with-deps chromium` →
  `npm run test:e2e -- --project=chromium` → `npm run test:deploy`. Uploads the Playwright
  report on failure and `dist/` always (7-day retention).
- `hygiene` (timeout 5 min, repo root): fails if any `.DS_Store`, `node_modules/` or
  `dist/` path is tracked.

Build runs before test because `tests/offline.test.ts` reads `v2/dist/`.

**`.github/workflows/deploy.yml`** — on push to `main` and `workflow_dispatch`; one deploy
at a time, never cancelled midway.

- `build` (timeout 45 min): lint → build → test → install Chromium → desktop e2e → subpath
  deploy test → copy `index.html` to `404.html` → touch `.nojekyll` → upload Pages artifact.
  It does not run the coverage floors.
- `deploy` (timeout 10 min): `actions/deploy-pages@v4` to the `github-pages` environment.

Neither workflow runs the four phone Playwright projects. See `testing.md` for what that
leaves uncovered and for hosted CI's current state.
