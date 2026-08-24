# Roadmap task state

The live checklist. `/goal` picks the first unchecked task (or the one you name),
implements it under CLAUDE.md rules, checks it off, and commits. One task, one commit,
prefixed with the task id. Do not reorder tasks; do not check a box without meeting its
acceptance line.

## M0 — Foundations locked

- [x] **M0.1 Scaffold** — Create `v2/` Vite + Svelte 5 + TypeScript project (self-contained
  `package.json`). Placeholder page renders. Accept: `cd v2 && npm run dev` serves; `npm run build` succeeds.
- [ ] **M0.2 The six walls** — ESLint flat config with the six core/ rules from CLAUDE.md,
  plus `tests/lint-walls.test.ts` feeding violation fixtures to ESLint programmatically.
  Accept: each of the six violations fails lint; the fixtures test passes; clean code passes.
- [ ] **M0.3 Vitest wired** — `npm run test` runs; one real test present. Accept: green locally.
- [ ] **M0.4 CI** — `.github/workflows/ci.yml`: install, lint, test, build, bundle budget
  (fail if gzipped first-load JS > 250 kB). Accept: workflow green on push.
- [ ] **M0.5 Repo hygiene** — Root `.gitignore` (.DS_Store, node_modules, dist);
  `git rm --cached` the 13 committed .DS_Store files. Accept: `git ls-files | grep DS_Store` empty.
- [ ] **M0.6 Playwright smoke** — Headless: page loads, canvas mounts, no console errors.
  Accept: runs in CI. (Chromium is pre-installed in the remote env; do not `playwright install`.)

## M1 — Faithful core, behaviour locked

- [ ] **M1.1 SimState + constants** — `core/state.ts`, `core/constants.ts`: typed state and
  every constant from `initBackEnd.js`, values verbatim, units in JSDoc. `core/units.ts`
  with branded `Rad`/`Deg`. Accept: typechecks; constants diff clean against legacy values.
- [ ] **M1.2 Seeded RNG** — `core/rng.ts`: counter-based streams (`ignitionDelay`,
  `ignitionFailure`), counters in SimState. Tests: reproducibility, stream independence.
  Accept: 10k-draw sequence stable; drawing from one stream leaves the other untouched.
- [ ] **M1.3 Port atmosphere + aero + thermal** — `physics.js` verbatim (quadrant ladders
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
