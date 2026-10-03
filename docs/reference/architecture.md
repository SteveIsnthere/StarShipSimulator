# Architecture

The application is the repo root: TypeScript, React 19, PixiJS 8, built with Vite. This page is
the layer map, the rules that keep the simulation pure, and where things live.

## Layers

Dependencies point down. A layer may import from layers below it, never above.

| Layer | Path | Owns |
|---|---|---|
| ui | `src/ui/` | `session/`: the framework-free controller that mounts the scene and runs the `requestAnimationFrame` tick. `shell/`: the React surfaces over it (status bar, cluster, map, controls, menu, black box and debrief lazy). `kit/`: flight_sim's vendored kit |
| audio | `src/audio/` | Web Audio graph and mixer; maps SimState to sound parameters |
| hud | `src/hud/` | Per-frame readout binders, timeline, trajectory map, debrief figures, prediction |
| view | `src/view/` | PixiJS scene: camera, sky, terrain, clouds, pooled particles, vehicle. No game logic |
| app | `src/app/` | Fixed-timestep loop, input, flight recorder, offline (service worker) support |
| core | `src/core/` | The simulation: state, step, physics, control, autopilot, RNG, units, scenarios |

Path aliases `$core`, `$app`, `$view`, `$hud`, `$ui`, `$audio` are defined identically in
`tsconfig.json`, `vite.config.ts` and `vitest.config.ts`.

The `core/` boundary is machine-enforced (walls 1 and 7 below), and so is the inside of
`ui/`: the session imports no React, and the shell reaches the view and audio only through the
session (`frontend-conventions`). Elsewhere above core the direction is a convention, with no
exceptions today: view imports only core; hud imports core and `DT` from `$app/loop`; audio
imports core and `limitState` from `$hud/metrics`; ui imports everything.

Per-frame work belongs to the HUD binders and Pixi. React renders on interaction only.
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

Defined in `eslint.config.js` as two exported rule sets, `CORE_WALL_RULES` and
`NO_GLOBALS_RULE`. All are ESLint `error`s, so `npm run lint` fails on any violation.

| # | Rule | ESLint mechanism | Scope |
|---|---|---|---|
| 1 | No imports of view/ui/hud/app, `pixi.js`, React, Zustand or the kit (relative paths and `$` aliases) | `no-restricted-imports` | `src/core/**/*.ts` |
| 2 | No `document`, `window`, `navigator`, `PIXI`; no `globalThis.document/window/performance` | `no-restricted-globals`, `no-restricted-syntax` | core |
| 3 | No `Math.random`; use `core/rng.ts` | `no-restricted-properties` | core |
| 4 | No `Date.now`, `performance.now`, `new Date()`; time enters only as `dt` | `no-restricted-properties`, `no-restricted-syntax` | core |
| 5 | No `setTimeout`, `setInterval`, `requestAnimationFrame` | `no-restricted-syntax` | core |
| 6 | No assignment to `globalThis` | `no-restricted-syntax` | all of the repo root |
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
`@ts-expect-error` lines that `tsc` (part of `npm run build`) checks.

## Directory map

```

  src/
    main.tsx       mounts the React shell; registers the service worker in production
    core/          state step rng units constants scenarios
      physics/     aero atmosphere components engines gravity isa mass prediction thermal
      control/     actuation commands primitives
      autopilot/   index.ts (the stage machines)
    app/           loop input controls menu preferences recorder offline debug
    view/ hud/ audio/
    ui/            session/ shell/ kit/   (shell/fonts/ holds committed woff2 subsets)
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
    check-budget.mjs    budget gate: first-load JS 300 kB gzip, fonts 80 kB, audio 250 kB
    stage-subpath.mjs   copies dist/ under a subdirectory for the deploy test
    subset-fonts.mjs    regenerates the woff2 subsets (manual; needs Python fontTools)
  public/        icon.svg, manifest.webmanifest, assets/*.webp
```

`npm run build` is `tsc` (the kit's project, then the app's) → the design, copy and
entry-graph scanners → `vite build` (`base: './'`) → `build-sw.mjs` → `check-budget.mjs` →
`check-entry-graph.mjs`.

## The archived 2021 tree

`tests/fixtures/legacy/` holds the original 2021 simulator (backend, render,
displayComponents, utilities, its own service worker). It is a historical reference for
humans only, kept so porting notes that cite file and line still resolve. Nothing builds,
serves, imports or executes it: ESLint ignores it, no test or script references it, and
correctness is defined by closed-form physics, published data and stated contracts, not
by agreement with it. Do not modify it. See its `README.md`.

## CI and deploy

Both workflows run in the repo root on `ubuntu-latest`, Node from `.nvmrc`, `npm ci`.

**`.github/workflows/ci.yml`** — every push, every pull request, and on demand; superseded
runs on the same ref are cancelled.

- `gate` (timeout 20 min): installs Chromium, runs `npm run gate` (lint → build with budgets
  → unit → coverage floors → e2e smoke → subpath deploy). Uploads the Playwright report on
  failure.
- `e2e-full` (workflow dispatch only, timeout 90 min): the five-project browser suite and
  `npm run bench`.
- `hygiene` (timeout 5 min): fails if any `.DS_Store`, `node_modules/` or `dist/` path is
  tracked.

**`.github/workflows/deploy.yml`** — push to `main` and on demand, and only ever from
`main`; one deploy at a time, never cancelled midway. `build` runs the same gate, copies
`index.html` to `404.html` and uploads `dist/`; `deploy` publishes it to the `github-pages`
environment. Pages must use the "GitHub Actions" source (a workflow deployment never runs
Jekyll). The `404.html` fallback works one path segment deep; `base: './'` breaks it for
deeper paths, and the app has none.

**Service workers.** The app's `sw.js` (generated by `scripts/build-sw.mjs`) precaches the
build. A new build waits until the last tab on the old one closes (no `skipWaiting`), so an
open tab never loses the lazy chunks its cache holds; the app also checks for a new build
whenever the page becomes visible. On activate it deletes only its own superseded
`starship-*` caches and the 2021 game's `v2` cache — the `steveisnthere.github.io` origin is shared with other project
sites. `public/serviceworker.js` sits at the 2021 worker's URL and retires it for returning
visitors.

**Rollback.** The 2021 game is tag `v0-classic`. Branch `classic` is that tree plus an
`sw.js` that releases visitors from the rebuild's worker. To put the live site back:

```bash
gh api -X PUT repos/SteveIsnthere/StarShipSimulator/pages -f build_type=legacy -f 'source[branch]=classic' -f 'source[path]=/'
```

## Phase7 development: shared mechanics and mission clock

`core/physics/step-dynamics.ts` owns paid force preparation, shared translation/angular Verlet kernels and torque/failure evaluation. `core/control/mechanical.ts` owns the shared command/actuator/failure/catch/bookkeeping completion. `core/step.ts` composes these for standalone selected vehicles and nonrecursive booster forecasts; existing Ship arithmetic and every golden stay unchanged. `core/mission.ts` combines two real bodies at a physical aggregate COM while attached, releases without a kick when actual thrust permits, then delegates each free body to step. Workspaces belong to a body, preventing cross-body preparation overwrite.

`app/loop.ts` retains one generic fixed-step accumulator policy; the existing single-vehicle API and `app/mission-loop.ts` adapt it with their state/command types. No second RAF, frame-scaled physics timestep or presentation model id enters SimState. Session/render integration is still Phase7Task5; none of this phase is merged/live yet.
