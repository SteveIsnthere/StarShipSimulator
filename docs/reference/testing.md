# Testing

How the test harness in the repo root works. Commands run from the repo root.

| Command | Runs |
|---|---|
| `npm run lint` | ESLint, including the seven walls |
| `npm run build` | `tsc` (also type-checks `tests/`), the design/copy/entry-graph scanners, `vite build`, service worker, bundle budget |
| `npm run test` | `vitest run`, every `tests/**/*.test.ts` in the `node` environment, 30 s per-test timeout |
| `npm run coverage` | the same suite with v8 coverage and the floors below, 120 s per-test timeout |
| `npm run test:e2e` | Playwright smoke tier: `@smoke` specs on the desktop `chromium` project, against the production build |
| `npm run test:e2e:full` | Playwright, all five projects, every spec |
| `npm run test:deploy` | Playwright, subpath deploy config |
| `npm run bench` | the wall-clock budgets (`tests/**/*.timing.test.ts`), on demand, never in the gate |
| `npm run golden:regenerate` | rewrite every golden fixture (a physics change unless byte-identical) |
| `npm run gate` | lint → build → test → coverage → test:e2e → test:deploy |

Build before test: `tests/offline.test.ts` reads `dist/` as its fixture, so on a clean
checkout `npm run test` without a prior build fails on ENOENT.

## Where the suite runs

- Node 22 is the pinned runtime (`.nvmrc`, `engines`); newer versions work.
- Playwright needs its Chromium once per machine: `npx playwright install chromium`. On a
  machine whose Node cannot verify the download's certificate chain, prefix
  `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`.
- Hosted CI runs `npm run gate`. The full five-project suite and the bench run only from the
  manual `e2e-full` job, so the six `@mobile-only` tests run in CI only when that job is
  dispatched.

- Measured on an idle M-series Mac: `npm run gate` about 3 minutes (smoke tier 45 s, subpath
  deploy 5 s); the desktop project of the full suite 12.6 minutes (133 tests, 5 workers).
- `plume.spec.ts` "blooms wider than the ship in vacuum" measures plume pixels and is
  load-sensitive: it passes alone and has failed under five parallel workers. If it fails in
  a full run, re-run it alone before treating it as a regression.

## Truth tiers

Correctness is judged against truths that hold independently of this code, in three tiers.

| tier | what | where | may it move? |
|---|---|---|---|
| 1 | closed form: Kepler, vis-viva, energy and angular-momentum conservation, ISA tables; property invariants over every configurable flight | `tests/core/analytic-laws.test.ts`, `verlet.test.ts`, `angular-momentum.test.ts`, `isa.test.ts`, `invariants.test.ts` | never re-blessed |
| 2 | published reference bands, each cited, tier A (stated or physical) or B (estimate) | `tests/reference/anchors.ts`; `npm run truth:report` | a tier-A row in band is ratcheted (`in-band.json`) and may not leave it |
| 3 | golden trajectories | `tests/golden/` | under a Bug-fix or Fidelity tier only |

**Invariants** (`tests/core/invariants.test.ts`, fast-check, seed 42 unless `FC_SEED`): no
NaN anywhere after 120 steps of any flight; mass never rises and propellant never goes
negative; engines off and no wind, orbital energy never rises beyond integrator error; the
same flight twice is identical. Flights are generated through `createScenarioState`, the
flight editor's path (`tests/core/arbitraries.ts`).

**Mutation matrix** (`npm run mutation`, about 3 minutes, not in the gate): each fault in
`tests/mutations.json` is applied to a temp copy and must fail a named assertion; the
unmodified copy runs first and must pass.

**Witnesses.** A browser spec that claims something is drawn carries a positive control: the
same setup with the cause removed, which must read as absent. `witness-plume.spec.ts`
(engines lit vs off) and `reentry.spec.ts` (hot vs cold flight) are the pattern. Setup goes
through `window.__simDebug` (`src/app/debug.ts`, present only in dev or with `?debug=1`):
`setScenario(id, overrides)`, `setState(path: value)`, `pause`, `resume`, `step(n)`,
`telemetry()`.

## Vitest suites

The environment is `node` for every suite, which is what keeps `core/` browser-free.

| Directory | Files | Covers |
|---|---|---|
| `tests/core/` | 30 | physics, control, autopilot, scenarios, RNG, loop, analytic laws; `legacy-models.ts` keeps ported 2021 models as test reference |
| `tests/golden/` | 2 | trajectory replay and digest audit (below) |
| `tests/proofs/` | 3 | 1-ULP numerical proofs (below) |
| `tests/lint-walls/` | 1 | the walls reject their fixtures (see `architecture.md`) |
| `tests/view/` | 18 | sky, terrain, clouds, particles, plume, lighting, post, zoom, perf |
| `tests/hud/` | 10 | binder, readouts, metrics, timeline, trajectory, prediction, debrief, haptics |
| `tests/audio/` | 6 | parameters, transients, vacuum, warnings; offline renders through `node-web-audio-api`'s `OfflineAudioContext` |
| `tests/ui/` | 9 | menu, controls, preferences, contrast, test ids, tabular digits |
| `tests/app/` | 3 | input, recorder, view clock |
| `tests/` root | 3 | `budget`, `flies-every-scenario`, `offline` |

`tests/types/units.test-d.ts` is not a vitest file: its `@ts-expect-error` lines are the
assertions, checked by `tsc` in `npm run build`.

## Golden trajectories

Eight fixtures in `tests/golden/fixtures/`, defined in `tests/golden/scenarios.ts`, each
flown by the autopilot at `dt = 1/120`:

| Fixture | Flight | Length |
|---|---|---|
| `launch-pad-takeoff` | autoTakeOff from the pad | 90 s |
| `booster-sep-boostback` | autoBoostBack from stage separation | 120 s |
| `rtls-boostback` | autoBoostBack, return to launch site | 120 s |
| `reentry-autoland` | autoLand from orbital re-entry | 180 s |
| `before-flip-autoland` | autoLand through the flip | 60 s |
| `landing-burn-autoland` | autoLand, final descent | 45 s |
| `landing-burn-headwind` | the same in a 10 m/s downrange wind | 45 s |
| `intro-demo` | the intro auto-landing | 45 s |

**`record.ts`** steps the scenario, samples the flattened SimState every 60 steps (2 Hz),
and stores it columnar: fields constant across the flight go in `constant`, the rest are
listed once in `keys`, and each sample is one row of values. Values are written as
shortest-round-trip decimals; `Infinity`, `-Infinity`, `NaN`, `-0` and `undefined` are
encoded as `@`-prefixed sentinels so they survive JSON exactly.

**`regenerate.ts`** rewrites every fixture (`npm run golden:regenerate`).
Unless the output is byte-identical, running it is a physics change and is permitted only
under a declared Bug-fix or Fidelity tier justified in the same commit.

**`replay.test.ts`** replays each fixture from its initial state and compares every
sample, every field (`tests/golden/compare.ts`). The key set must match, so a SimState
shape change fails. On x86-64 Linux under Node 22, the platform that recorded the
fixtures, the comparison is exact (`Object.is`). Elsewhere it allows a relative
difference up to `GOLDEN_REL_TOL = 1e-8`: last-bit differences in `Math.exp`, `**` and
`Math.sqrt` between platforms compound to at most 2.03e-11 over the longest fixture
(measured on arm64 macOS). `compare.test.ts` proves a 1e-6 change in one input still fails.
Frame-rate independence is the loop's property and is proved in `tests/core/loop.test.ts`.

Integrity tests also check one file per spec with no
orphans, lossless sentinels, a definite outcome for every flight, and a spec count pinned
at 8.

**`unification.test.ts`** is the audit trail. It holds the SHA-256 of each fixture's rows
block (from the newline before `"rows": [` to end of file) and asserts each matches, that
every spec has a digest, and that mutating one character changes the hash. Its header
comment is a table of every change that moved a digest, with its tier, which scenarios
moved, and why. Any regeneration must add a row there.

For Bug-fix tier commits, `tests/diffs/record-trajectories.ts` and `trajectory-diff.ts`
produce the before/after trajectory comparison across scenarios. They are scripts, not
tests.

## Proofs

`tests/proofs/` holds numerical proofs for the Refactor tier (behaviour must not change;
max absolute difference ≤ 1 ULP over the input domain):

- `dt-substitution.test.ts`: `X * dt` versus `X / (1/dt)` differ by at most 1 ULP over a
  deterministic sweep at nine frame rates.
- `trig-collapse.test.ts`: each quadrant ladder equals its one-line identity within one ULP
  at unit magnitude over 4,000,001 angles and every branch boundary (yet still moves
  goldens: identity is not bit-identity).
- `rcs-reserve.test.ts`: a rejected simplification. `remaining - dt` differs from the
  shipped form by up to 11 ULP, so the shipped form stays.

## Analytic laws

Physics is checked against references outside the repo, never against another
implementation. Bounds are derived, mostly in ULPs.

- `tests/core/analytic-laws.test.ts`: inverse-square gravity, vis-viva, Kepler's third law,
  dimensional structure of the aero terms.
- `isa.test.ts` (US Standard Atmosphere 1976), `speed-of-sound.test.ts` (`a = √(γRT)`),
  `orbit.test.ts`, `angular-momentum.test.ts` (conservation; a coast against an independent
  two-body integration), `verlet.test.ts` (position error falls as dt² against Kepler's
  closed form; energy and angular momentum conserved on an eccentric orbit).
- `domain-edges`, `named-branches`, `control-contracts`, `autopilot-stages` reach the
  branches nominal flights do not.

## Coverage floors

`vitest.config.ts`, v8 provider, `src/core/**` only (an untested file still counts).
Reporters: text, json-summary, json (in `./coverage`). Below a floor, `npm run coverage`
exits non-zero.

| Scope | Branches | Lines | Functions | Statements |
|---|---|---|---|---|
| aggregate `src/core/**` | 99 | 99 | 98 | 99 |
| `src/core/physics/**` | 100 | 100 | 100 | 98 |
| `src/core/control/**` | 95 | 95 | 95 | 95 |
| `src/core/autopilot/**` | 95 | 99 | 100 | 99 |

## Budget and performance tests

| Test | Asserts | Measures |
|---|---|---|
| `scripts/check-budget.mjs` (in `npm run build`) | first-load JS ≤ 300 kB gzip; fonts ≤ 80 kB; audio ≤ 250 kB | bytes |
| `tests/budget.test.ts` | the budget script's parsing, verdicts and exit codes on synthetic `dist/` trees; chart CSS stays in the lazy chunk | bytes, no clock |
| `tests/view/perf.timing.test.ts` step budget | a step < 1 ms; 240 steps at 1/240 < 100 ms; autopilot-on/off cost ratio < 4 | wall clock (medians) |
| `perf.test.ts` / `perf.timing.test.ts` time warp | warp 16 runs 16× the steps (gated); costs < 32× (bench) | step count is work; cost ratio is wall clock |
| `perf.test.ts` pool and growth | particle pool size fixed; peak use < 75% of capacity; horizon rebuilt on < 5% of samples; no heap growth over a long flight; loop keeps exactly two states | work and structure counts |
| `perf.timing.test.ts` effects | shock-banded plume < 2 ms per frame; generating all textures < 120 ms | wall clock |
| `tests/hud/binder.timing.test.ts` | one HUD update < 2 ms; whole-HUD frame < 2 ms | wall clock |
| `tests/app/recorder.timing.test.ts` | a long recording does not slow the step (late < 3 × early + 5 ms) | wall clock |

The wall-clock rows live in `*.timing.test.ts` files and run only with `npm run bench`, on an
idle machine. The gated copies keep the work and structure counts.

## Playwright

`playwright.config.ts` serves the production build: `npm run build && npm run preview --
--host 127.0.0.1 --port ${E2E_PORT:-4174} --strictPort` (180 s server timeout; never reused,
so two worktrees on different `E2E_PORT`s cannot test each other's server). Test timeout is 60 s; `fullyParallel`; in CI, 1 worker, 1 retry, `forbidOnly`, trace
on first retry.

| Project | Device | Selects |
|---|---|---|
| `chromium` | Desktop Chrome | everything except `@mobile-only` |
| `pixel-portrait` | Pixel 7 | `@mobile` |
| `pixel-landscape` | Pixel 7 landscape | `@mobile`, except `@portrait-only` |
| `iphone-portrait` | iPhone 14, `browserName: 'chromium'` | `@mobile` |
| `iphone-landscape` | iPhone 14 landscape, Chromium | `@mobile`, except `@portrait-only` |

The iPhone projects are an iPhone-class viewport and touch profile on Chromium; nothing
here tests WebKit. The `@mobile` grep is a substring match, so `@mobile-only` tests also
run on phones. Six tests are `@mobile-only`: four in `responsive.spec.ts` (digits-and-ticks
readouts, one-line timeline, sheets, closed-sheet focus trap), the folded map in
`trajectory.spec.ts`, and the phone capture in `screenshot.spec.ts`. The screenshot specs
skip unless `CAPTURE_SCREENSHOT=1`; `hint.spec.ts` skips its two specs on landscape phones
by design and asserts that exception.

**`tests/e2e/pixels.ts`** measures the rendered frame rather than comparing images.
`readFrame` hides every overlay sibling of the world canvas (`visibility: hidden`),
screenshots the canvas, decodes it in the page via `createImageBitmap` +
`OffscreenCanvas`, and returns region statistics (lit fraction, luma, tone count, extents).
`metrePixels` and `inVehicleHeights` convert extents to ship-lengths. It proves structure
(a region is lit, a plume extends N ship-lengths, the frame changed), never that something
looks good, never anything about a single pixel, and nothing at a non-default zoom.

**Subpath deploy.** `playwright.subpath.config.ts` builds, stages `dist/` under
`.subpath/StarShipSimulator/` with `scripts/stage-subpath.mjs`, serves it with
`scripts/serve-static.mjs` (a plain Node file server) on 127.0.0.1:4188 (deliberately not `vite preview`, which would
mask path bugs), and runs `tests/deploy/subpath.spec.ts` on one worker. `E2E_SUBPATH_PORT` moves the port;
`E2E_BASE_URL` points the same spec at a real deployment and starts no server.

**Environment assumptions.** Both configs launch Chromium with `--no-sandbox` (containers
run as root) and SwiftShader for WebGL (`--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader`; the subpath config uses `--use-gl=swiftshader`). When
`PLAYWRIGHT_BROWSERS_PATH` holds a `chromium-<rev>` build (Linux or macOS layout), both
configs use its highest revision instead of Playwright's pinned one (`tests/e2e/chromium.ts`). CI has no such directory and
runs `npx playwright install --with-deps chromium`.
