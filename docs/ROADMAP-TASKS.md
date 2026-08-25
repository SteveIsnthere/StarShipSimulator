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
- [x] **M1.4 Port engines + actuation** — throttle, gimbal, RCS, fins, fuel; ignition delay
  becomes a dt-ticked SimState timer using rng streams (declared Bug fix: wall-clock
  setTimeout + double timeAccel division). Accept: failing-test-first for the timer; parity elsewhere.
- [x] **M1.5 Port integrator** — `updateBackEnd.js` → `core/step.ts`: pure
  `step(state, dt, input)`. Accept: runs headless in Node.
- [x] **M1.6 Port control + autopilot** — flightControl, low-level primitives, all modes,
  verbatim. Accept: parity spot-checks; no DOM reads (inputs come via the input arg).
- [x] **M1.7 Scenarios** — the six presets + intro demo as data in `core/scenarios.ts`.
  Accept: each initialises a valid SimState.
- [x] **M1.8 Golden trajectories** — headless runner records full state history per scenario
  (autopilot flying); fixtures committed; determinism test replays with 30/60/144 fps
  frame batching. Accept: bit-identical across batchings; fixtures in CI.
- [ ] **M1.9 Trig collapse** — ⚠️ **BLOCKED — OWNER DECISION NEEDED.** The proof is done and
  committed (`v2/tests/proofs/trig-collapse.test.ts`): all six ladders ARE single expressions, max
  abs difference 1.0 unit-ULP (four) / 0.5 (two) over 4,000,001 angles across [−π, π] plus every
  branch boundary. But the second half of the acceptance line cannot hold: ~34% of angles differ in
  the last bit, and applying the collapse **moves the goldens** (measured — `perceivedG_Y` shifts in
  its 16th significant figure at step 4260 of `launch-pad-takeoff`). CLAUDE.md says a Refactor that
  moves a fixture fails CI, and regenerating fixtures needs a Bug-fix or Fidelity justification,
  which a mathematically-identical rewrite does not have. Both clauses cannot be satisfied at once,
  so the task is left unchecked rather than reinterpreted. **Options for the owner: (A)** treat it
  as Fidelity — the collapsed form is arguably *more* accurate, since the ladder's `sin(π − a)`
  loses precision in the subtraction — behind a flag, which needs M2.5 first; **(B)** authorise a
  golden regeneration in M1.9 with an explicit justification; **(C)** drop the collapse and keep the
  ladders, with the proof standing as documentation that 143 of physics.js's 539 lines are
  one-line identities.
- [x] **M1.10 Rename pass** — mechanical rename (gimbol→gimbal, presision→precision,
  lowwer→lower, aera→area, faliure→failure, lunchpad→launchpad, …), map committed at
  `docs/RENAME-MAP.md`. Accept: goldens unchanged.
- [x] **M1.11 The loop** — `app/loop.ts`: fixed dt = 1/120, accumulator (capped 0.25 s),
  interpolated render hook, warp = N steps/frame. Accept: loop test with fake frame times.

## M2 — Honest physics

- [x] **M2.1 Bug: stratosphere** — wire `upperStrato` branch (>25 km per the model's own
  layers). Failing test first; six-scenario before/after diff in commit.
- [x] **M2.2 Bug: heat argument** — pass nose radius (4.5 m), not cross-sectional area.
  Same obligations.
- [x] **M2.3 Bug: fin fraction init** — initialise as fraction. Same obligations.
- [x] **M2.4 Bug: pitch rate** — compute as Δpitch/dt, frame-rate independent; retune
  the pitchHold gate against goldens. Same obligations.
- [x] **M2.5 Flags infra** — `core/flags.ts`; golden fixtures per flag combination that ships.
- [x] **M2.6 Fidelity: planet-centered gravity** — core state in planet-centered frame;
  gravity −GM·r̂/r²; local-frame adapter for autopilot + view; deletes relief hack and
  constant g. Off by default. Accept: flat-model goldens untouched; orbit maths unit-tested
  (circular orbit stays circular over one lap, energy drift bounded).
- [x] **M2.7 Fidelity: speed of sound** — a = √(γRT) from local temperature. Off by default.
- [x] **M2.8 Fidelity: full ISA** — standard lapse-rate table to 86 km. Off by default.
- [ ] **M2.9 Orbit presets + demo** — ⚠️ **PARTIAL — BLOCKED, OWNER DECISION NEEDED.** Presets
  shipped and circularization works (21 m/s burn, 1.8 s). Three measured blockers stop the rest:
  **(a) 100 km is not a sustainable orbit** — a perfectly circular one decays to the ground within a
  single lap from drag alone. Not a defect: 100 km is the Kármán line, and real objects there
  deorbit in an orbit or two. At **150 km** the same orbit drifts 38 m per lap and at 200 km, 40 m.
  The acceptance line's "100 km" is below what the physics allows; **150 km would meet it**.
  **(b) Orbital re-entry peaks at 310 thermal units against `heatLimit` 55** — 6× over. Same owner
  decision as M2.1. **(c) The autopilot has no orbital targeting** — flown open-loop it reaches the
  ground **15 000 km** from StarBase. `autoLand` knows how to come home from a suborbital hop; a
  deorbit-targeting mode has never existed in this codebase, and writing one is a feature, not a fix.
- [ ] **M2.10 Feel review** — owner flies flag combinations and picks defaults. Owner task.

## M3 — The glow-up

- [x] **M3.1 Pixi v8 shell** — app, canvas, resize, camera port.
- [x] **M3.2 World sprites** — StarBase, ground objects, ship, fins; existing art.
- [x] **M3.3 Particle pooling** — pooled emitter framework; port all 2021 effects; the
  shutdown leak dies here.
- [x] **M3.4 Sky** — altitude-graded gradient into starfield; parallax layers.
- [x] **M3.5 Post pass** — bloom on plumes, heat shimmer + shock on reentry.
- [x] **M3.6 Intro wired** — the auto-landing intro plays end-to-end in v2.
- [x] **M3.7 Perf audit** — zero per-frame allocations (heap sampling); 60 fps mid-phone
  profile; budgets green.

## M4 — Full game

- [x] **M4.1 HUD binder** — readouts via the single-rAF diff binder.
- [x] **M4.2 Panels** — engine/yoke/autopilot/utility panels in Svelte, typed events.
- [x] **M4.3 Inputs** — keybinds, tilt, touch parity with 2021.
- [x] **M4.4 Menu + editor** — time warp, scenario editor incl. orbital presets.
- [x] **M4.5 Black box** — lazy-loaded uPlot; Plotly gone from first load.
- [x] **M4.6 Parity sweep** — checklist vs 2021 feature list; guide/about ported.

## M5 — Shipped

- [x] **M5.1 Offline** — service worker precaches everything; no CDN references anywhere.
  Accept: full playthrough in airplane mode.
- [x] **M5.2 README** — real one: screenshot, feature list, architecture story, dev setup.
- [x] **M5.3 Deploy** — pipeline to static hosting.
- [ ] **M5.4 Retire legacy** — 2021 tree removed after v2 flies every scenario; v1.0 tag.
  Tree retired: owner chose option **A**, so it moved to `v2/tests/fixtures/legacy/` — gone as an
  application, kept frozen as the parity reference the tests execute. Repository root is now
  `v2/`, `docs/` and two markdown files. **Remaining: the `v1.0` tag**, which is outward-facing
  and still wants an explicit go-ahead.

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
- 2026-08-24 · M1.4 · `core/physics/engines.ts` + `core/control/actuation.ts`. Key discovery that
  made the whole port clean: `renderTimeInterval = frameRate / timeAccel`, so `1/renderTimeInterval`
  **is** simulated dt — `X / renderTimeInterval → X * dt` is an exact substitution, not a
  reinterpretation. Tier: Bug fix, for ignition only; port elsewhere. Ignition test written first
  and observed failing (no module), then implemented. 30 parity assertions compare thrust, off-axis
  torque, gimbal wrap, fuel burn/dump and all four actuators bit-for-bit against the executed 2021
  code across four frame rates. Preserved the real `<` vs `<=` asymmetry between front and aft fin
  actuation. **Rejected a refactor**: simplifying the RCS drain `(r·rti−1)/rti` to `r−dt` measures up
  to 154 ULP near an empty tank (abs 3.6e-15 s) — over CLAUDE.md's 1-ULP bar — so the awkward 2021
  form is kept verbatim and `tests/proofs/rcs-reserve.test.ts` records the measurement so nobody
  redoes it. **Corrected an overstatement I had carried since the analysis phase**: the ignition bug
  makes the *wall-clock* wait shrink as timeAccel² but engines light `timeAccel`× early in
  *simulated* terms (0.75 s → 0.1875 s at 4× warp), not 16×. Fixed in constants.ts, state.ts and
  REBUILD-PLAN.md. 393 tests green.
- 2026-08-24 · M1.5 · `core/step.ts` — pure `step(state, dt, input)` returning a new SimState;
  `cloneState` makes purity possible without rewriting ported physics in immutable style.
  Runs headless in Node with no DOM (asserted). **Two real bugs found by the new full-loop parity
  test, neither visible at unit level.** (1) Ordering: `orbitGravityAccCompensation` is written at
  the *end* of `updateSpactialMotion` in 2021, so the velocity integration and `updatePerceivedG`
  both read the *previous* step's value — I computed it early. It is now a carried SimState field
  and the test catches the mistake by step 1. (2) My M1.4 claim that `X / renderTimeInterval` and
  `X * dt` are bit-identical was **wrong** — dividing by the reciprocal rounds twice. Measured at
  ≤ 1 ULP over 800k samples across ten decades, so it clears CLAUDE.md's Refactor bar; declared as
  such with the proof at `tests/proofs/dt-substitution.test.ts`. Consequently the full-loop test
  measures accumulated drift instead of claiming bit-equality: pad is bit-identical (0), worst
  anywhere is 1.2e-13 relative, bound set at 1e-11 from measurement, with an absolute floor of
  1e-12 so cancellation near zero is not mistaken for divergence. Also switched the ignition
  sentinel from `NaN` to `null` — JSON turns NaN into null, so it would not survive a golden
  round-trip. 431 tests green.
- 2026-08-24 · M1.6 · Ported `flightControl` primitives, all six autopilot modes and the intro demo
  into `core/control/{primitives,commands}.ts` and `core/autopilot/`. Wired into `step()` in 2021's
  order (autopilot first, manual input overwrites it). **No DOM reads** — every primitive that ended
  in a `getElementById` write now writes SimState; asserted with `document` undefined.
  **Found a real 2021 bug masked by the browser**: in `presisionAlignment`'s RCS branch, when the
  required force is within `rcsMaxThrust`, `yokePosition` is never assigned, so the code runs
  `pitchControl = undefined` and writes that to the slider. It never showed because `pitchControl`
  is `<input type=range min=-100 max=100>` and HTML value sanitisation replaces a non-numeric value
  with the midpoint — exactly 0 — which `updateBackEnd.js:201` reads back. The port initialises to
  0 to produce the shipped behaviour directly; both halves are asserted, and `rcsThrust` on that
  path matches exactly. **Pinned a second live oddity**: `controlTranslation` runs after the
  autopilot and recomputes `rcsThrust` from `pitchControl`, so proportional RCS steering never
  reaches the physics — RCS only ever fires at full authority. Not fixed; that belongs in M2 with a
  tier. The 5 s `setTimeout` in boostback becomes a dt-ticked countdown (behaviour-preserving:
  `5000/timeAccel` ms of real time at `timeAccel` speed-up is exactly 5 s of simulated time).
  25 parity assertions over 400 sampled states plus 13 closed-loop tests; **the intro auto-landing
  sequence lands and hands the vehicle back**, deterministically. 469 tests green.
- 2026-08-24 · M1.7 · `core/scenarios.ts` — presets as data, with `configureNewFlight()`'s
  conversions and clamps ported verbatim (X relative to StarBase, pitch in degrees, propellant in
  tonnes capped at 1200 t, altitude floored at `vehicleHeight/2`). **Discrepancy reported, not
  papered over: `index.html` ships FIVE `configScenarioPreset` buttons, but CLAUDE.md, the plan and
  the game's own "What's New?" panel all say six.** There is no sixth anywhere in the 2021 tree. I
  did not invent one. Shipped the five that exist plus the launch pad and the intro demo (a scenario
  in every respect except having a button — most likely the "sixth"). If the owner remembers a
  preset that was cut, it belongs in this file. 38 tests: exact preset values, the conversion rules,
  both clamps, and every scenario proved finite over 30 s powered and unpowered plus deterministic
  over 600 steps. 507 green.
- 2026-08-24 · M1.8 · Seven golden fixtures in `v2/tests/golden/fixtures/`, all recorded with the
  **autopilot flying** (a ballistic drop exercises almost none of the game). Replay is bit-identical
  under 1/2/4/8-step batching and a ragged 144 Hz-style pattern — `Object.is`, every field, every
  sample. **Three real bugs found by recording**: (1) `createIntroState` never commanded the
  engines, so the intro just fell and crashed — `startRunningGame()` ends with `toggleAllRaptors()`;
  (2) I had guessed `renderBoxPhysicalHeight` at 1000 m — it is `vehicleHeight × vehicleVerticalPropotion`
  ≈ **200 m**, and `vehicleVerticalPropotion` is adjusted by *window height*, so **the 2021 intro
  started at a different altitude and speed on different screens**. v2 pins the canonical 4× value;
  a sequence CLAUDE.md calls unchangeable cannot depend on the viewport. (3) JSON silently loses
  `undefined` (drops the key), `Infinity`, `NaN` and `-0` — all four occur in SimState, all now
  encoded as sentinels; also `JSON.parse`'s reviver *deletes* a key when it returns `undefined`, so
  restoration happens in a second pass. Fixtures were **21 MB** as one object per sample; restructured
  to columnar with constant-folding → **1.6 MB**, one diffable line per instant. Mutation-verified:
  a 1-ULP change to `gravity` fails at sample 0; the M1.5 ordering bug fails at sample 2; a
  lift-curve boundary shift fails at step 312. Two of my first mutations were **no-ops** —
  `9.807000000000001` parses to the same double as `9.807`, and reordering two independent
  assignments changes nothing — caught and redone. 554 tests green.
- 2026-08-24 · M1.9 · **NOT COMPLETED — blocked on an owner decision.** Proof written, measured and
  committed; the refactor itself is deliberately not applied and `src/core/physics/components.ts`
  still contains the ladders. `tests/proofs/trig-collapse.test.ts` asserts the shipped code still
  matches the *ladder* bit-for-bit, so applying the collapse without resolving this trips two
  independent alarms (that test and the goldens). Also established: the proof's domain is exactly
  [−π, π] — `angleOfMotion` is `atan2` output and `gimbolPointingDirection` is explicitly wrapped —
  and just outside it the two forms diverge to 2.55 unit-ULP, which is what makes that wrap
  load-bearing rather than cosmetic. Continuing to M1.10, which does not depend on this.
- 2026-08-24 · M1.10 · Mechanical rename across `v2/` only; 42 renames, map at `docs/RENAME-MAP.md`.
  The 2021 tree keeps its spellings until M5.4, so that map doubles as the dictionary for reading
  old against new. **Acceptance proved by value comparison, not by "the tests still pass"**: the
  fixtures' *keys* necessarily change (they are SimState field paths), so I snapshotted them first
  and diffed old against new with keys mapped through the rename table — **all seven identical in
  value, every number, every sample**. Two hazards handled: the first script's collision guard
  checked the wrong invariant (`\b` anchors already handle prefixes; the real risk is a rename's
  *output* being re-matched, now asserted, plus an idempotence check per file); and the rename
  initially corrupted legacy-facing strings in the parity tests, since those name 2021 globals.
  Rather than patch them back, `tests/parity/legacy.ts` now owns a `LEGACY_NAME` table with
  `toLegacyName` / `toLegacyKeys` / `toLegacySource`, so parity tests are written entirely in v2
  names and translate at the boundary — one source of truth, and a future rename cannot silently
  break the correspondence. 571 tests green.
- 2026-08-24 · M1.11 · `app/loop.ts` — fixed dt = 1/120, accumulator capped at 0.25 s, interpolation
  alpha for the renderer, warp = N steps per frame (dt never scaled). 24 tests, all driven by **fake
  frame times**, which is the point: the 2021 loop read `Date.now()` so its behaviour under load
  could only be seen by inducing load. Covered: 30/60/120/144 fps step counts, a ragged stuttering
  budget, warp 1..16 producing bit-identical flights to real time, pause/resume landing on the same
  state, and the pathological inputs — a 2 s stall (clamped, simulated time deliberately dropped
  rather than spiralling), zero, negative (backwards clock), NaN, and warp 100 000 (bounded).
  Two direct regression tests for the defect this replaces: a 45 ms frame now runs the steps 45 ms
  deserves with the remainder carried, and sustained 33 fps tracks real time to within one
  unconsumed step — where the 2021 loop clamped `frameTime` to 30 ms and lost ~19%.
  **M1 complete except M1.9, which is blocked on an owner decision.** 595 tests green.
- 2026-08-24 · M2.2 · **Bug fix.** `getReentryHeatPower(vehicleNoseRadius)` is Sutton–Graves; its
  denominator is a nose *radius* in metres. Every 2021 call site passed `crossSectionalArea` — an
  area, 63–500 m². The error was not constant: it scales as √(area/radius) **and the area varies
  ~8× with attitude**, so turning broadside *lowered* the computed heat when presenting more of
  yourself to hypersonic flow should raise it. Fixed at the call site (`NOSE_RADIUS = 4.5 m`), not
  in the function — the function was always right. Failing tests first (4 failed). Diff: **no
  outcome changed anywhere**; heating rises ~2.6× across the board (+61% to +90% relative), and only
  Re-entry was ever near the limit — it now peaks at ~165 against `heatLimit` 55, up from 57.
  Three of my own tests were flawed and repaired rather than tuned: one injected
  `crossSectionalArea` directly (step() recomputes it, so the test was vacuous — now driven by
  attitude over 3 steps); one used post-step `trueSpeed` where `step()` uses the pre-integration
  value; one demanded bit-equality between two attitudes that drift micrometres apart in altitude.
  `thermalPower` removed from full-loop parity with an explicit divergence test in its place, and
  `NOSE_RADIUS` declared in a new `INTRODUCED_BY_V2` list so a v2-only constant can never slip in
  unremarked. 620 tests green.
- 2026-08-24 · M2.3 · **Correction to my own earlier analysis, and a Refactor rather than a Bug fix.**
  The inconsistency is real: `initControlSurface()` wrote `area × sin(...)` into
  `frontFinEffectiveAreaFraction` while `physics.js` writes a bare `sin(...)` every step, and
  `getFrontFinDrag` multiplies by the fin area separately — so the two forms disagree by 24.2×
  (front) / 45.8× (aft). But my pre-implementation claim of a **"~24× discrepancy on frame one" was
  wrong**: `step()` recomputes both fields in phase 3a and only reads them in phase 3c, so the
  constructed value is overwritten before anything can observe it — on the first step, in every
  scenario. `updateBackEnd()` had the same ordering, so this was true in 2021 too. Proved by
  feeding `step()` the correct fraction, the 2021 area form, and `1e9`: all three produce
  **identical** fin drag, angular acceleration, and 600-step trajectories. So this lands as a
  Refactor with a **zero** diff — all seven golden fixtures byte-identical, stronger than the 1-ULP
  bound a Refactor owes. Still worth doing: an initialiser computing something other than what its
  field means is a trap, and `syncDerivedFields()` is added for the case that *does* read a state
  without stepping it — M4.4's flight editor, save/restore, HUD readouts. 631 tests green.
- 2026-08-24 · M2.4 · **Bug fix.** `pitchRateOfChange = (pitch − lastPitch) / renderTimeInterval
  * 3600` — but `1/renderTimeInterval` **is** dt, so dividing by it *multiplies* by dt. The
  expression computed `dPitch · dt · 3600`: units of rad·s, wrong by `dt²·3600`. That factor is
  exactly **1 at 60 fps** and nowhere else — 4× high at 30 fps, 5.76× low at 144 fps. `pitchHold`
  gates on it, so **the autopilot behaved differently depending on the player's monitor**: a
  0.25 rad/s rotation read as 1.0 at 30 fps (gate shut) and 0.0625 at 120 fps (gate open) — same
  vehicle, same motion, opposite behaviour. Fixed to `dPitch / dt`; threshold extracted as
  `PITCH_HOLD_RATE_THRESHOLD = 0.4`, **numerically unchanged** because at the 60 fps reference where
  the old expression was correct, 0.4 in the old units *was* 0.4 rad/s. Diff: **no outcome changed
  in any scenario**, and across all seven goldens **exactly one field moved —
  `kinematics.pitchRateOfChange` itself**; no trajectory shifted, since nothing but the pitchHold
  gate consumes it. Verified pitchHold now converges to within 0.012 rad across 30/60/120/144 fps.
  645 tests green. **M2's four bug fixes are complete.**
- 2026-08-25 · M2.5 · `core/flags.ts` + `SimState.flags`. Three design rules make the mechanism
  trustworthy rather than decorative: **flags live in the state, not module scope** (a module-level
  flag would make `step()` impure and every fixture ambiguous — you could not tell from a state
  which physics produced it); **every shipped combination is golden-tested**, since "off by default"
  is worthless if the on path is untested; and **defaults are data**, so flipping one moves fixtures
  visibly. All three flags default **off** — CLAUDE.md puts the 2021 reference feel in the
  never-change list. 5 shipped combinations → 4 new fixtures (11 total), each assigned the scenario
  that actually exercises it rather than recording 35 near-duplicates. The flagged fixtures
  currently coincide with their base, because no flag is wired yet — asserted deliberately, so
  M2.6–M2.8 each produce a **visible** fixture diff when they land. 688 tests green.
- 2026-08-25 · M2.6 · **Fidelity, flag off by default.** `core/physics/gravity.ts`. With the flag on
  there is no orbital special case at all: gravity is −GM/r², tangential motion contributes v²/r
  outward, and at v² = GM/r they cancel — an orbit is simply what happens when you go fast enough.
  The relief hack is not corrected but **deleted**. Also added the tangential term that conserves
  angular momentum, without which a vehicle could climb without slowing and gain orbital energy from
  nothing. Acceptance met exactly: **all seven default fixtures byte-identical**, only the two
  `planetCenteredGravity` fixtures moved. 18 orbit tests — a 200 km circular orbit holds altitude
  within 1 km and speed within 1 m/s over a **full 88.9-minute lap**; energy drifts <0.1% over ten
  minutes; an elliptical orbit climbs and **comes back down**, which the 2021 relief term could never
  produce. Proved the old model's impossibility directly: at 1.2× circular speed true vertical
  acceleration is positive, while the clamped 2021 term gives **exactly 0**.
  **Found a 0.78% discrepancy worth knowing**: the game's planet has Earth's mass but a 6400 km
  radius (Earth's is 6371), so true surface gravity is **9.7307**, not the constant 9.807 — which is
  Earth's real value. Turning the flag on makes everything slightly lighter at sea level too, not
  just in orbit. 706 tests green.
- 2026-08-25 · M2.7 · **Fidelity, flag off by default.** `a = √(γRT)` from local temperature.
  2021 used a constant 343 m/s — the sea-level value — so **Mach ran 14% low** through the
  stratosphere (real value there ≈ 295 m/s). Not cosmetic: `getBodyDragCoefficient` is a *function
  of Mach*, so understated Mach understated **drag** through the whole transonic and supersonic
  regime. Also pinned where the fix stops mattering — above Mach 10 the coefficient is capped at
  2.5, so hypersonic re-entry is unaffected either way. Only the two `realSpeedOfSound` fixtures
  moved; the other nine byte-identical. 719 tests green.
- 2026-08-25 · M2.8 · **Fidelity, flag off by default.** `core/physics/isa.ts` — seven ISA layers to
  86 km, verified against the published US Standard Atmosphere 1976 at eight altitudes. Base
  pressures are **integrated upward rather than transcribed**, so layers join to 1e-5 by
  construction (a transcribed table can disagree with its own formulas, and a density step is a
  visible jolt). Handles the two conventions explicitly: **geopotential vs geometric altitude**
  (1.3% apart at 86 km, where density changes by a factor of e every few km) and Kelvin vs Celsius.
  The big win: the three-layer model **has no mesosphere** and warms monotonically past 47 km
  forever — at 80 km it says **+50 °C where the real atmosphere is −70 °C**, a 120 °C error. Only
  the two `fullISA` fixtures moved. My test was wrong first, not the model: I compared published
  values at *geometric* altitudes when the standard is indexed by *geopotential*. 744 tests green.
  **M2 is complete except M2.9 and the owner tasks.**
- 2026-08-25 · M2.9 · **NOT COMPLETED — blocked, see above.** Landed what works: `ORBITAL_PRESETS`
  (Circularize, Deorbit Burn), 11 tests including a **full 88-minute lap at 150 km holding within a
  200 m band**, and every blocker asserted with its measurement so none can drift unnoticed.
  Also fixed a real defect found while doing this: the ISA model **hard-clamped** above 84.852 km,
  holding the 86 km density everywhere above — **12× too dense at 100 km**, which alone turned a
  31-unit thermal load into 109 and made orbital flight impossible. Replaced with the standard
  isothermal continuation (scale height `H = RT/g`): 5.786e-7 kg/m³ at 100 km against the published
  **5.604e-7**, within 3%. No fixtures moved. 763 tests green.
- 2026-08-25 · M3.2 · `view/assets.ts`, `view/world.ts`, `view/vehicle.ts`. The 2021 art copied into
  `v2/public/assets` (892 kB) with `initGroundObjects.js`'s world dimensions ported verbatim —
  sizes in **metres**, each width derived from its height and the source image's aspect, which is
  what keeps the scenery proportionate at any zoom. **The pig is at x = 0** and roams, per
  CLAUDE.md. Sprites are created once and repositioned per frame; scenery culls off-screen and the
  ground band only redraws on resize. Fins are drawn rather than sprited because they articulate,
  and are re-tessellated only when zoom or extension actually changes. **It renders** — screenshots
  captured of the intro auto-landing sequence over StarBase. 7 e2e green including asset-load
  coverage. First-load **165.8 kB gzip of 250**. 784 tests green.
- 2026-08-25 · M3.3 · `view/particles.ts` + `view/effects.ts`. **The shutdown leak dies here.**
  switches.js:26 built a `new PIXI.Container()` *and* a new emitter on every engine cutoff, added
  both to the scene, and removed neither — and the landing autopilot cuts engines repeatedly, so the
  scene graph grew for the whole session. Now every particle is allocated once at construction;
  emitting pops a free-list slot, dying returns it. Asserted by counting: **10 000 shutdowns add
  exactly zero children**, and a saturated pool *drops* particles rather than growing. State lives
  in parallel typed arrays, not objects. RevoltFX is Pixi v5-only so all seven 2021 effects were
  rebuilt as configurations; the particle texture is generated procedurally rather than shipped.
  Effects are **derived from SimState** — in 2021 the shutdown effect fired from inside
  `toggleRaptor1`, so renderer and physics were the same function and neither was testable alone.
  31 tests. 815 green, 7 e2e green, first-load 167.7 kB of 250.
- 2026-08-25 · M3.4 · `view/sky.ts`. The 2021 darkening curve is **preserved exactly** — linear
  20→80 km, squared per channel, bottoming at 1−0.6 — because the blue draining out of a hard ascent
  is one of the best things about the game; 12 tests pin it, including that ground level is bit-exact
  `#a7bdd9`. Three additions: a **gradient** (a flat fill reads as a wall; grading horizon→zenith
  gives the sky a direction), **stars** tied to the *same* altitudes as the darkening rather than to
  a second set of magic numbers, and **parallax** at a thousandth of camera motion — enough to feel
  like depth, little enough never to visibly slide. The gradient is a texture built once and tinted
  per frame, not a per-frame full-screen fill. 827 tests, 7 e2e, 168.1 kB of 250.
- 2026-08-25 · M3.5 · `view/post.ts` — two hand-written fragment shaders. **Not `pixi-filters`**:
  that is ~80 kB gzip for two effects against a 250 kB budget already carrying PixiJS, and these are
  small enough that writing them costs less than importing them. Bloom is a single-pass
  threshold-and-bleed (nine taps on a widening cross) rather than downsample-blur-upsample — at
  plume size the difference is invisible and it is a third of the cost. Heat shimmer displaces along
  a wake gradient so the nose stays sharp, with a shock arc standing off it. **Both detach entirely
  below a 2% threshold**, because a filter attached to a container costs a full-screen pass whether
  or not it does anything — on the pad and in cruise this pass is *free*, which the tests assert
  against real flight values. Heat is measured against `heatLimit`, so the shimmer tells you how
  close to breaking up you are rather than how fast you are going. Shaders verified compiling and
  rendering on WebGL. 839 tests, 7 e2e, 169.4 kB of 250.
- 2026-08-25 · M3.6 · The intro plays end to end **in the browser** — real renderer, real loop, real
  frame times — starting high in the render box, decelerating, and landing. 3 e2e tests (10 total).
  Fixed a real load flash they caught: `createView` read `canvas.clientWidth`, which reports the
  intrinsic 300×150 until CSS layout settles, so the first frames rendered at the wrong size and
  then snapped. Sized from the window instead.
- 2026-08-25 · M3.7 · **Sim step measured at 3.8–6.6 µs against a 1 ms budget — 150–264× headroom**
  (unpowered 3.79, autoLand 6.64, boostBack 4.75). Budgets now run in CI. On "zero allocation":
  there is no portable way to ask JavaScript "did this allocate", so the *observable consequences*
  are asserted instead — the particle pool's child count is invariant across **20 000 frames** of
  continuous emission plus periodic bursts and explosions; a 2-minute powered flight leaves SimState's
  field count unchanged; the loop holds exactly two states however long it runs; and warp 16 costs
  ~16 steps, not more. That second check is the one that would actually have caught the 2021 leak.
- 2026-08-25 · M4.1 · **The HUD now updates 10x more often and does less work doing it.** First, the
  wound stated correctly, because my first pass overstated it: dispUpdate.js contains 45
  `getElementById` calls, but only `updateFlightParamDisp()` is on the per-frame path, it holds 18 of
  them, and about 10 execute per update — and its entire body is gated on `updatedFrameCount % 5`,
  so the 2021 HUD refreshed at **12 Hz** on a 60 fps machine. The lag was the price of the lookups.
  The binder inverts that trade: elements resolved to text nodes **once** at bind time, values
  written only when the formatted string changed, updating **every frame at 120 Hz**. Measured
  against the same binder with the diff removed — same rate, same 13 readouts, diff off — across all
  five presets for 30 s each: **0.6–2.8% of the writes**. (The baseline is deliberately not 2021's
  raw write count, which would flatter the binder by scoring its 10x higher update rate as a win.)
  The reason the saving is that large is the frame rate itself: at 120 Hz most readouts move less
  than their displayed precision between frames, so the string is simply the same string again. The
  faster the loop runs, the more the diff is worth; 2021 got the opposite deal. Update cost
  **0.0029 ms against a 2 ms budget**. Svelte renders the markup once and owns no readout value —
  nothing reactive is anywhere near the frame path. Three guards: the resolver is asserted called
  exactly `READOUTS.length` times and never again over 600 frames; a source scan forbids `document`
  anywhere under `hud/` (verified to fail when a lookup is reintroduced); and an in-browser test
  counts `getElementById` calls across a second of animation and asserts **0**. Formatting is 2021's,
  asymmetries included — altitude and speed test `x < 1000`, range tests `|x| < 1000` after ceiling,
  and g is pinned to exactly 1 on the ground. 865 tests, 13 e2e, 173.3 kB of 250.
- 2026-08-25 · M4.2 · **Panels, and a typed vocabulary instead of onclick strings.** Engine controls,
  flight yoke, autopilot modes and utilities are Svelte now; every control emits a `ControlEvent`
  from a discriminated union and `applyControl` maps it to a core command, exhaustively — the
  `never` in the default branch means a variant added without a handler fails to compile. In 2021
  the set of things the UI could do to the sim was "whatever is on globalThis", discoverable only by
  reading `onclick` attributes, which is why three near-identical `toggleRaptor` copies existed.
  Two clamps moved from markup into core: initBackEnd.js set the throttle slider's `min`/`max` from
  the engine limits and the tilt handler re-clamped pitch by hand, so the bounds held for those two
  paths and nothing else; they now hold for every caller, keybinds in M4.3 included. Button lit
  state gets the M4.1 treatment — `updateButtons()` repainted fourteen buttons unconditionally at
  two `getElementById` calls and two inline style writes each, 56 lookups to say nothing; the
  indicator binder resolves once and toggles one class only when the boolean flips. **That is not
  cosmetic: an indicator changes with no input at all** — the autopilot shuts engines down, a
  landing clears autoLand — and a panel that painted on click would show a lie. Tested by letting
  the demo quench an engine with nobody pressing anything. An engine also reads as lit *during* its
  ignition countdown, because a dark button through a 0.6 s wait invites the second press that
  switches.js:16 treats as a cancel. Core additions are additive (Refactor tier, no path changed):
  the 75 golden tests are untouched. **Two of my own claims were wrong and are corrected here**: the
  Svelte `bind:value`/`oninput` ordering trap I wrote a comment about does not exist — checked by
  putting the binding back and watching the test still pass — and the e2e failure I blamed it for
  was my own handover detection. Neither the engine indicator going dark (the descent controller
  blinks it several times on the way down) nor "vertical speed reads 0" (the readout is
  `Math.ceil(speedY)`, so anything under 1 m/s displays as 0 mid-flight) marks the intro handover.
  The fuel readout returning to 350 t does, because nothing else in the simulation puts propellant
  back. 893 tests, 19 e2e, 175.7 kB of 250.
- 2026-08-25 · M4.3 · **The keyboard was a second, unguarded way into the simulation. Now it is the
  same way.** eventListener.js wrote `pitchControl` and `throttle` as globals, bypassing everything
  the buttons went through — and `throttle += 10` had **no clamp at all**, because the engine limits
  lived on the slider element's `min`/`max`, so they applied to dragging the slider and to nothing
  else. Eleven presses of W left the commanded throttle at **210%**, which the thrust model happily
  multiplied straight through. In v2 every key resolves to the same `ControlEvent` a button emits and
  inherits the same core clamp; there is a test that presses the key twenty times and asserts 100,
  and an e2e that does it in a browser. The bindings are 2021's key for key (case folded rather than
  listing `'a' || 'A'`), plus `Space` and `Backspace` now call `preventDefault` — 2021 got away
  without it only because its body could not scroll. Tilt is ported with the ×2.4 gain and ±100
  clamp intact (full deflection at 42°), still yielding to a hand on the yoke, reading
  `screen.orientation.angle` in place of the deprecated `window.orientation` (same four values).
  Zoom is a **view** action and never reaches core: `drawingSize` becomes a zoom factor on the
  viewport, keeping the asymmetric 1.5-in/0.75-out steps and the odd `* 0.85` limit guard — in then
  out does not return to where it started, which is what the buttons did, and "restore the previous
  zoom" would be a different feature. Zoom at 1 is proved identity, so nothing before this task
  moved. One e2e caught a real race worth recording: the canvas is in the markup from the first
  paint, so waiting on it presses keys before `bindInput` has attached; the HUD showing a value is
  the honest ready signal, because the first tick writes it. 932 tests, 23 e2e, 176.6 kB of 250.
- 2026-08-25 · M4.4 · **Menu, flight editor, time warp — and a toggle that did nothing.** Building
  the menu surfaced a real Bug fix: the RandomFailure switch was ported as a SimState field but
  `rollIgnitionFailure` compared the draw against the module constant (0), so the toggle was
  **inert and no engine ever failed to light**. Failing test first, then the fix; the rate is now
  chosen per draw from `failures.randomFailure` rather than being reassignable, so `step()` stays
  pure and no fixture is ambiguous about which rate produced it. Measured at 0.1 over 5000 seeds,
  and the draw still happens either way — so turning it on **cannot shift the ignitionFailure
  stream**, only whether an engine catches. Tier obligation discharged: all 75 golden tests byte-
  identical, plus an explicit bit-for-bit trace across every scenario. Time warp is honest in both
  directions and the asymmetry is the interesting part: **speeding up runs more steps; slowing down
  cannot run fewer than one per frame**, so it feeds the accumulator less real time instead. dt is
  never scaled either way — 2021 divided `renderTimeInterval`, which rescaled every per-frame rate
  constant in the physics and so changed what the model *meant* at each setting. Proved: warp N runs
  exactly N× the steps, `simulatedTime === totalSteps * DT` at every setting, and a warp-4 flight
  matches an unwarped one step for step. The editor keeps 2021's per-field semantics — an empty
  field means "leave this alone", which is why the fields are strings; a number would make 0 and
  untouched the same value — and a preset button **fills the form rather than flying it**, so a
  preset is a starting point you can edit. Both orbital presets are offered. Configure builds a
  fresh state rather than assigning over the live one, which is how 2021 could start a configured
  flight with an autopilot stage half-completed. The menu blocks the keyboard, so typing an altitude
  no longer fires the engines. 965 tests, 29 e2e, 178.8 kB of 250.
- 2026-08-25 · M4.5 · **3.5 MB of Plotly, loaded from a CDN on every page load, for nine charts
  almost nobody opened — gone.** uPlot replaces it at ~45 kB, as a dependency rather than a CDN
  script, behind a dynamic import: the bundler gives it its own chunk, fetched the first time the
  black box is opened and never before. An e2e records every script and stylesheet request and
  asserts **zero uPlot and zero third-party origins in the first load**, then that opening the view
  fetches the chunk from our own origin — the second half matters because M5.1's offline goal cannot
  survive a CDN. The recorder lives in `app/`, not `core/`, and that boundary is load-bearing: the
  history is unbounded and SimState is cloned every step, so growing arrays inside it would make
  each step **O(flight length)** and would write the whole recording into every golden fixture.
  There is a test that records 26 000 samples and shows the step cost flat. Sampling exposed a
  difference from 2021 that is easy to miss: **a 2021 frame WAS a step**, so "every fifth frame" and
  "every fifth step" were the same sentence; here a frame runs however many steps the accumulator
  drained, so a recorder called per frame would skip most sampling points and record a different
  flight at a different frame rate. `advance()` gained an `onStep` hook, and the recording is proved
  identical at 60 fps, at 240 fps under warp 4, and hand-stepped. The x-axis is simulated seconds —
  2021 added `timeAccel * recordTimeInterval`, so the same flight got a different time axis at a
  different warp setting. Two bugs the e2e caught, both mine: the Black Box button was absolutely
  positioned with a hand-picked offset and **swallowed the Menu button's clicks** (both now live in
  one flex row, so the layout does the arithmetic); and a test that waited on the dialog rather than
  on a drawn plot read the request list before the dynamic import had started. 978 tests, 32 e2e,
  180.3 kB of 250 — uPlot not counted, which is the point.
- 2026-08-25 · M4.6 · **The sweep found four features I had quietly dropped, so the checklist earned
  its keep before it was even finished.** It was built from the source, not from memory: every
  `onclick` in index.html, every function in switches.js and tools.js, every readout in
  dispUpdate.js, every plot in plotting.js. Missing and now ported: **hideable control panels**,
  the **collapsible secondary HUD block**, the **tilt-control switch**, and the **restart button**.
  All four are in `docs/PARITY.md` with the rest, and `tests/e2e/parity.spec.ts` is the
  machine-checkable half. Two implementation points worth keeping: the panels and HUD rows are
  **hidden, not unmounted**, because the binders resolved those nodes once and hold the references —
  there is a test that collapses a panel, presses a key, and reopens it to prove the hidden node
  tracked the change. And restart shares its implementation with Configure, because they are the
  same operation; 2021 had two paths that disagreed (`restart()` re-ran initBackEnd while
  `configureNewFlight()` assigned over live globals). The guide's keybind list is **generated from
  the binding table** rather than written out: 2021's prose had already drifted from
  eventListener.js — it says "+ or -" where the code binds "=" and "-", and says A pitches *down*
  where the code sends -100. A help screen that can lie is worse than none. Deliberate
  non-ports are listed with reasons; the iOS tilt-permission prompt is the one real gap. The
  five-versus-six preset discrepancy is recorded rather than resolved: the About text and in-game
  copy say six, index.html ships **five**, and v2 ports the five that exist. 978 tests, 38 e2e,
  182.6 kB of 250.
- 2026-08-25 · M5.1 · **The 2021 About screen claimed the game could be played offline. It could
  not** — index.html pulled PixiJS and Plotly from two CDNs on every load, so with no network there
  was no renderer at all. Now it is true and checked: five e2e tests cut the browser context's
  network and **fly a flight end to end**, configure a new one from the menu, open the black box,
  read the guide, and fetch the manifest — all from cache. The precache list is generated from
  `dist/` after the build, never hand-maintained: the bundler renames every chunk on content change,
  so a hand-written list is stale immediately and its failure mode is the worst kind — works online,
  breaks offline, which is the case nobody tests. The lazy uPlot chunk is precached **because** it is
  lazy; on-demand means "fetched at the worst possible moment" when there is no network. The cache
  name is a hash of the list plus contents, so a new build is a new cache and the old one is deleted
  on activate. **The bug that took the longest was invisible online**: every asset 504'd offline
  while working perfectly online, because `cache.addAll()` keys responses by requests it builds
  itself and vite preview sends `Vary: Origin`, so the page's later request failed to match the
  stored key. `ignoreVary: true` fixes it. Two smaller ones: the service worker was precaching
  absolute `/...` paths while vite builds with `base: './'`, which would have broken exactly one
  deployment shape (subdirectory hosting) and nothing else; and my first "no CDN references" test
  grepped for `https://` and found seventeen — all Svelte error-message links and a PixiJS license
  header, none of them ever fetched. Rewritten to check the hosts that actually serve code, with the
  e2e network log as the real guarantee. Installable too: manifest, icon, standalone display.
  991 tests, 43 e2e, 182.7 kB of 250.
- 2026-08-25 · M5.2 · README, replacing the two lines that said "Still in early beta". Screenshot,
  how to play, the architecture story, the six walls, the tier table, dev setup, and a
  2021-versus-v2 table with real numbers in it. The **screenshot is a Playwright spec**, not a
  hand-captured file: same scenario, same moment, same viewport, reproducible — and skipped unless
  `CAPTURE_SCREENSHOT=1`, because a test run should not write into the repository. Getting a good
  frame took a second attempt and taught me something about my own camera: pointing it at a preset
  at altitude puts the **vehicle above the frame**, because the camera is semi-sticky and stays with
  the pad until the vehicle has properly left it. The shot that works is the intro on final
  approach — 85 m, one Raptor lit, dust plume, StarBase behind. The README does not oversell: the
  wound list is specific (355 globals, `getElementById` in the physics loop, `setTimeout` ignition,
  3.5 MB of CDN Plotly, an About screen claiming offline support while loading two CDNs), and the
  central bet — **extraction, not rewrite** — is stated with its reason: a rewrite would have
  produced a cleaner codebase flying a subtly different vehicle, and nobody could have said which
  parts changed. 991 tests, 43 e2e, 182.7 kB of 250.
- 2026-08-25 · M5.3 · Deploy to GitHub Pages on push to main, with **every gate the CI job runs** —
  a build that would fail review must not reach users because it was pushed to main. The interesting
  half is not the workflow, it is that Pages serves a project site **from a subdirectory**, and a
  single absolute path anywhere — a `<script src="/assets/...">`, a service worker precaching
  `/index.html` — works perfectly on localhost and 404s in production. That is a bug found by users
  or not at all, so `npm run test:deploy` stages the real build under `/StarShipSimulator/`, serves
  it with a **plain static server** (`vite preview` rewrites paths and would hide exactly what this
  is looking for), and asserts four things: the app loads and flies, every request the app makes is
  under the subpath, the service worker registers at the subpath scope with every cache entry under
  it, and it still works **offline from a subdirectory**. It passed first try — the relative `base`
  and the scope-relative precache from M5.1 were already right — which is the outcome you want from
  a test like this and not a reason to skip writing it. One diagnosis I got wrong along the way:
  I saw root-level UUID requests, assumed Chromium captive-portal probes, and wrote that into a
  comment; they are **`blob:` URLs**, PixiJS building its worker from a blob — which is incidentally
  why that worker survives being offline. Also added Jekyll opt-out and a 404 fallback that serves
  the shell, so a deep link lands in the simulator rather than on GitHub's error page — the same
  thing the service worker does for unmatched navigations, so online and offline behave alike.
  991 tests, 43 e2e, 4 deploy-shape e2e, 182.7 kB of 250.
- 2026-08-25 · M5.4 · **Precondition done; removal blocked on an owner decision.** "v2 flies every
  scenario" is now an assertion rather than a feeling: every scenario runs to a definite outcome
  with no NaN, the four auto-land scenarios land within the touchdown limits, and the intro hands
  the vehicle over with full tanks and a reset yoke. The outcomes are **written down as measured,
  not as hoped** — `reentry` breaks up, and that is asserted rather than hidden, because a test
  weakened to accommodate it would tell you nothing and the `heatLimit` question would go quiet.
  One thing the test taught me: a blanket `Number.isFinite` sweep flags
  `freeFallTimeRemainingPrediction` and `finalXPosPrediction`, which are **legitimately Infinity**
  when the prediction has no solution — the 2021 model's own answer, ported verbatim, and already
  encoded in the goldens (which needed an Infinity sentinel for exactly this). The check is now
  "no NaN anywhere, Infinity only in those two", which catches real breakage instead of being
  weakened until it catches nothing. **What is blocked**: removing the 2021 tree contradicts the
  parity-by-execution acceptance line that twelve test files still depend on. Not reinterpreted,
  not quietly worked around — reported. 1007 tests, 43 e2e, 4 deploy-shape e2e, 182.7 kB of 250.
- 2026-08-25 · M5.4 · **Owner chose A: the 2021 tree is retired as an application and kept as a
  frozen reference.** It moved wholesale — `backend/`, `render/`, `utilities/`,
  `displayComponents/`, `index.html`, and the PWA leftovers `icons/`, `manifest.json`,
  `serviceworker.js` — to `v2/tests/fixtures/legacy/`. The repository root is now `v2/`, `docs/`,
  `CLAUDE.md` and `README.md`; nothing 2021 is built, served or reachable. **388 parity tests still
  execute it** from the new location, which was the whole point of the decision: the goldens record
  what v2 does, but only this records what the original did. The *whole* tree moved rather than
  only the four executed files, because `docs/PARITY.md` cites line numbers throughout it, and
  deleting the parts nobody currently reads would decide on a future reader's behalf which questions
  they may ask. Its README states the rule plainly — **do not modify anything in here, ever**, not
  even to satisfy a linter — and ESLint is told to skip it, since it predates all six walls and
  breaks most of them, including the 355 `globalThis` assignments that are the reason wall 6 exists.
  CLAUDE.md's ground rule was rewritten to match. The move also flushed out a **flaky test of my
  own**: `lighting a Raptor changes the flight` clicked Toggle-All mid-intro, where the descent
  controller has engines off and on continuously — so the click was a shutdown as often as an
  ignition, and 2021's toggle-all asymmetry means a shutdown makes the vehicle fall *faster*, the
  opposite of what the test asserted. It had been passing on luck. It now starts from the handover,
  a known state, and asserts the vehicle climbs. 1007 tests, 43 e2e, 4 deploy-shape e2e,
  182.7 kB of 250.
