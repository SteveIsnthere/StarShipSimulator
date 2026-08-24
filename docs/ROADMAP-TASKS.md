# Roadmap task state

The live checklist. `/goal` picks the first unchecked task (or the one you name),
implements it under CLAUDE.md rules, checks it off, and commits. One task, one commit,
prefixed with the task id. Do not reorder tasks; do not check a box without meeting its
acceptance line.

## M0 — Foundations locked

- [x] **M0.1 Scaffold** — Create `v2/` Vite + Svelte 5 + TypeScript project (self-contained
  `package.json`). Placeholder page renders. Accept: `cd v2 && npm run dev` serves; `npm run build` succeeds.
- [x] **M0.2 The six walls** — ESLint flat config with the six core/ rules from CLAUDE.md,
  plus `tests/lint-walls.test.ts` feeding violation fixtures to ESLint programmatically.
  Accept: each of the six violations fails lint; the fixtures test passes; clean code passes.
- [x] **M0.3 Vitest wired** — `npm run test` runs; one real test present. Accept: green locally.
- [x] **M0.4 CI** — `.github/workflows/ci.yml`: install, lint, test, build, bundle budget
  (fail if gzipped first-load JS > 250 kB). Accept: workflow green on push.
- [x] **M0.5 Repo hygiene** — Root `.gitignore` (.DS_Store, node_modules, dist);
  `git rm --cached` the 13 committed .DS_Store files. Accept: `git ls-files | grep DS_Store` empty.
- [x] **M0.6 Playwright smoke** — Headless: page loads, canvas mounts, no console errors.
  Accept: runs in CI. (Chromium is pre-installed in the remote env; do not `playwright install`.)

## M1 — Faithful core, behaviour locked

- [x] **M1.1 SimState + constants** — `core/state.ts`, `core/constants.ts`: typed state and
  every constant from `initBackEnd.js`, values verbatim, units in JSDoc. `core/units.ts`
  with branded `Rad`/`Deg`. Accept: typechecks; constants diff clean against legacy values.
- [x] **M1.2 Seeded RNG** — `core/rng.ts`: counter-based streams (`ignitionDelay`,
  `ignitionFailure`), counters in SimState. Tests: reproducibility, stream independence.
  Accept: 10k-draw sequence stable; drawing from one stream leaves the other untouched.
- [x] **M1.3 Port atmosphere + aero + thermal** — `physics.js` verbatim (quadrant ladders
  included, dead `upperStrato` included) into `core/physics/`. Tier: none (port). Accept:
  spot-check parity vs legacy at sampled states.
- [ ] **M1.4 Port engines + actuation** — throttle, gimbal, RCS, fins, fuel; ignition delay
  becomes a dt-ticked SimState timer using rng streams (declared Bug fix: wall-clock
  setTimeout + double timeAccel division). Accept: failing-test-first for the timer; parity elsewhere.
- [ ] **M1.5 Port integrator** — `updateBackEnd.js` → `core/step.ts`: pure
  `step(state, dt, input)`. Accept: runs headless in Node.
- [ ] **M1.6 Port control + autopilot** — flightControl, low-level primitives, all modes,
  verbatim. Accept: parity spot-checks; no DOM reads (inputs come via the input arg).
- [ ] **M1.7 Scenarios** — the six presets + intro demo as data in `core/scenarios.ts`.
  Accept: each initialises a valid SimState.
- [ ] **M1.8 Golden trajectories** — headless runner records full state history per scenario
  (autopilot flying); fixtures committed; determinism test replays with 30/60/144 fps
  frame batching. Accept: bit-identical across batchings; fixtures in CI.
- [ ] **M1.9 Trig collapse** — the six quadrant ladders → single expressions. Tier: Refactor.
  Accept: committed proof ≤ 1 ULP over ≥ 4M sampled angles; goldens unchanged.
- [ ] **M1.10 Rename pass** — mechanical rename (gimbol→gimbal, presision→precision,
  lowwer→lower, aera→area, faliure→failure, lunchpad→launchpad, …), map committed at
  `docs/RENAME-MAP.md`. Accept: goldens unchanged.
- [ ] **M1.11 The loop** — `app/loop.ts`: fixed dt = 1/120, accumulator (capped 0.25 s),
  interpolated render hook, warp = N steps/frame. Accept: loop test with fake frame times.

## M2 — Honest physics

- [ ] **M2.1 Bug: stratosphere** — wire `upperStrato` branch (>25 km per the model's own
  layers). Failing test first; six-scenario before/after diff in commit.
- [ ] **M2.2 Bug: heat argument** — pass nose radius (4.5 m), not cross-sectional area.
  Same obligations.
- [ ] **M2.3 Bug: fin fraction init** — initialise as fraction. Same obligations.
- [ ] **M2.4 Bug: pitch rate** — compute as Δpitch/dt, frame-rate independent; retune
  the pitchHold gate against goldens. Same obligations.
- [ ] **M2.5 Flags infra** — `core/flags.ts`; golden fixtures per flag combination that ships.
- [ ] **M2.6 Fidelity: planet-centered gravity** — core state in planet-centered frame;
  gravity −GM·r̂/r²; local-frame adapter for autopilot + view; deletes relief hack and
  constant g. Off by default. Accept: flat-model goldens untouched; orbit maths unit-tested
  (circular orbit stays circular over one lap, energy drift bounded).
- [ ] **M2.7 Fidelity: speed of sound** — a = √(γRT) from local temperature. Off by default.
- [ ] **M2.8 Fidelity: full ISA** — standard lapse-rate table to 86 km. Off by default.
- [ ] **M2.9 Orbit presets + demo** — Circularize + Deorbit Burn presets; CI test: under
  flags, circularize at 100 km, coast one full lap, deorbit, land at StarBase.
- [ ] **M2.10 Feel review** — owner flies flag combinations and picks defaults. Owner task.

## M3 — The glow-up

- [ ] **M3.1 Pixi v8 shell** — app, canvas, resize, camera port.
- [ ] **M3.2 World sprites** — StarBase, ground objects, ship, fins; existing art.
- [ ] **M3.3 Particle pooling** — pooled emitter framework; port all 2021 effects; the
  shutdown leak dies here.
- [ ] **M3.4 Sky** — altitude-graded gradient into starfield; parallax layers.
- [ ] **M3.5 Post pass** — bloom on plumes, heat shimmer + shock on reentry.
- [ ] **M3.6 Intro wired** — the auto-landing intro plays end-to-end in v2.
- [ ] **M3.7 Perf audit** — zero per-frame allocations (heap sampling); 60 fps mid-phone
  profile; budgets green.

## M4 — Full game

- [ ] **M4.1 HUD binder** — readouts via the single-rAF diff binder.
- [ ] **M4.2 Panels** — engine/yoke/autopilot/utility panels in Svelte, typed events.
- [ ] **M4.3 Inputs** — keybinds, tilt, touch parity with 2021.
- [ ] **M4.4 Menu + editor** — time warp, scenario editor incl. orbital presets.
- [ ] **M4.5 Black box** — lazy-loaded uPlot; Plotly gone from first load.
- [ ] **M4.6 Parity sweep** — checklist vs 2021 feature list; guide/about ported.

## M5 — Shipped

- [ ] **M5.1 Offline** — service worker precaches everything; no CDN references anywhere.
  Accept: full playthrough in airplane mode.
- [ ] **M5.2 README** — real one: screenshot, feature list, architecture story, dev setup.
- [ ] **M5.3 Deploy** — pipeline to static hosting.
- [ ] **M5.4 Retire legacy** — 2021 tree removed after v2 flies every scenario; v1.0 tag.

## Log

<!-- /goal appends one line per completed task: date · task · commit · notes -->

- 2026-08-24 · M0.1 · Scaffolded `v2/` (Vite 8 + Svelte 5 + TS 5.9). TypeScript pinned to 5.9.3, not 7.x:
  typescript-eslint 8.68 declares `typescript: >=4.8.4 <6.1.0`, so TS 7 would break the walls in M0.2.
  Exact-pinned every dev dependency per the plan. `npm run build` runs svelte-check → vite build →
  bundle budget gate (`scripts/check-budget.mjs`, 250 kB gzip first-load). Baseline: 9.8 kB.
- 2026-08-24 · M0.2 · Six walls live in `v2/eslint.config.js`; walls 1-5 scoped to `src/core/**`,
  wall 6 (globalThis) repo-wide. `tests/lint-walls/walls.test.ts` lints one violating fixture per
  wall via ESLint's Node API with a synthetic `src/core/...` filePath, so rule *scoping* is tested
  as well as the rules. 12 tests: 6 rejections, 2 wall-6-is-repo-wide, 3 walls-1-5-are-core-only
  (view/ may import PIXI), 1 clean control. Mutation-checked — deleting the Math.random rule fails
  wall 3; unscoping the config fails all three scoping tests. Vitest config landed here because
  M0.2's acceptance line needs a runner; M0.3 adds the first core test on top of it.
- 2026-08-24 · M0.3 · `npm run test` green, 21 tests over 2 files. The first real test is
  `tests/budget.test.ts`: the budget script is a CI gate, and a gate that cannot fail is not a
  gate, so it asserts the failing path and the CLI exit code CI actually reads. Refactored
  `check-budget.mjs` into importable `checkBudget`/`parseFirstLoad` plus a CLI entry to make that
  testable, and it now takes a dist dir argument. Caught a real bug while writing it: the first
  synthetic fixture used a modular stride that cycles every 94 bytes, so a 300 kB "over budget"
  file gzipped to 562 B and the over-budget tests passed vacuously. Replaced with an LCG.
- 2026-08-24 · M0.4 · `.github/workflows/ci.yml`: checkout → setup-node 22 (npm cache keyed on
  `v2/package-lock.json`) → `npm ci` → lint → test → build+budget, all with `working-directory: v2`.
  `npm ci` rather than `npm install` so the exact pins from M0.1 are a contract CI enforces instead
  of resolving around. Concurrency group cancels superseded runs. Rehearsed locally from a wiped
  `node_modules`, all four steps green. The `.DS_Store` guard belongs to M0.5 and is deliberately
  not here — adding it now would push CI red before the files are removed.
- 2026-08-24 · M0.4 · CI run 32782856625 green on push — all 8 steps success (install, lint, test,
  build+budget). Verified, not assumed.
- 2026-08-24 · M0.5 · Root `.gitignore` added (macOS/Windows cruft, `node_modules/`, `dist/`, editor,
  coverage, logs, env). `git rm --cached` on exactly the 13 tracked `.DS_Store` files — untracked,
  left on disk, now ignored. `git ls-files | grep DS_Store` is empty. Added the `hygiene` CI job
  held back from M0.4: it fails the build if a `.DS_Store`, `node_modules/` or `dist/` is ever
  tracked again, so the cleanup cannot silently regress. This is one of the two commits CLAUDE.md
  permits to touch the 2021 tree.
- 2026-08-24 · M0.6 · Playwright smoke against the **production build** (config runs build+preview),
  wired into CI. Two live assertions: page loads with zero console errors / page errors / failed
  requests, and zero third-party origins — the latter guards M5.1's offline goal against a CDN
  creeping back in. The canvas assertion is present but `test.skip` with reason "canvas arrives with
  the PixiJS shell in M3.1", so it shows as skipped every run instead of being quietly missing;
  M3.1 deletes the skip. The pre-installed Chromium is revision 1194 but Playwright 1.62 wants 1234,
  so the config resolves `PLAYWRIGHT_BROWSERS_PATH/chromium-*/chrome-linux/chrome` when present and
  CI installs its own — no `playwright install` in the sandbox. SwiftShader flags set now so PixiJS
  has a WebGL context from M3.1. Two real defects caught: `exactOptionalPropertyTypes` rejected
  `workers: undefined`, and the smoke test found a favicon 404 on every load — fixed with an inline
  SVG data-URI icon (zero requests) rather than by adding an ignore rule.
- 2026-08-24 · M1.1 · `core/units.ts` (branded `Rad`/`Deg`), `core/constants.ts` (87 constants),
  `core/state.ts` (`SimState` in 10 groups, `createInitialState()`, every field with units in JSDoc).
  Acceptance proved by execution, not transcription: `tests/parity/legacy.ts` runs the real
  `backend/{physics,initBackEnd}.js` in a Node VM with a stubbed `document`, and 87 constants + 118
  state fields are compared with `Object.is` — so 0 vs -0 and any last-bit drift from a reordered
  expression fail. Derived constants are written as the legacy *expressions*, not precomputed
  literals; mutating `gravity` correctly breaks `decelerationStageHorizontalAcc`, proving they are
  live. `tests/types/units.test-d.ts` asserts at compile time that degrees cannot be passed where
  radians are expected: 7 `@ts-expect-error` directives, load-bearing because an unused one is
  itself an error (verified by mutation). 231 tests green.
- 2026-08-24 · M1.2 · `core/rng.ts`: counter-based, value = pure hash of (seed, stream, counter);
  counters live in `SimState.rng`, seed defaults to `DEFAULT_SEED`. Streams keyed by FNV-1a of their
  name, values by a murmur3 finaliser. Confirmed the legacy tree has exactly two draw sites —
  physics.js:452 (`ignitionDelay`) and :457 (`ignitionFailure`). 15 tests: 10k-draw stability,
  seed sensitivity (0/1000 elements shared), a committed 5-value sequence, seek (`peek(n)` == nth
  sequential draw, and does not advance), independence (1000 draws on one stream leave the other
  bit-identical), chi-square uniformity, and replay-from-snapshot. Mutation-checked twice, and the
  second mutation exposed a real flaw in my own test: it scaled covariance by an *assumed* variance
  of 1/12, so a degenerate counter-ramp hash passed it vacuously. Rewritten to compute true Pearson
  correlation and to assert variance ≈ 1/12; the same mutation now fails 4 tests instead of 2.
- 2026-08-24 · M1.3 · Ported `physics.js` into `core/physics/{atmosphere,aero,thermal,components}.ts`.
  Tier: none (port) — arithmetic and operation order unchanged, globals become arguments. Dead
  `upperStrato` ported dead; the six quadrant ladders ported branch-for-branch so M1.9's 1-ULP proof
  has something real to prove against. Found two implicit globals the 2021 tree never declared —
  `airTemperature` and `aerodynamicLiftAcceleration` (first assigned at updateBackEnd.js:119, so the
  lift ladders multiplied by `undefined` on frame one) — both now typed fields in SimState.
  98 parity assertions call both implementations with identical inputs and compare with `Object.is`.
  Signed zero surfaced honestly: the ladders are nested closures reachable only through a summing
  parent, and `0 + (-0)` is `+0`, so ladder isolation uses a documented ±0-tolerant helper while the
  composed path keeps full `Object.is`; a dedicated test asserts the `-0` is really there.
  Mutation-checked 3x, and the first mutation ("optimise" `1/2*rho*v**2*Cd*A` into a reordered
  chain) went **undetected** — `getDrag` was only covered indirectly through the fins. Added direct
  2000-sample deterministic tests for `getDrag` and `getLift`; the mutation now fails. 344 green.
