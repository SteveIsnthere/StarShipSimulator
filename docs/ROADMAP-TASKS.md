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
- [x] **M1.9 Trig collapse** — shipped as the `collapsedTrig` **Fidelity** flag (owner's choice),
  off by default, both paths golden-tested. The proof stands at
  `v2/tests/proofs/trig-collapse.test.ts`: max abs difference 1.0 unit-ULP over 4,000,001 angles
  per ladder. It could not ship as a Refactor because ~34% of angles differ in the last bit and
  that moves the goldens — a proof of mathematical identity is not a proof of bit-identity, and
  the Refactor tier asks for the second.
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
- [x] **M2.9 Orbit, for real** — *unblocked 2026-08-25; all three owner decisions taken. Ordered
  AFTER M2.10 by owner decision: the orbit work must land on the final unified physics, not on a
  configuration that is about to be replaced.* Three parts, in order:
  **(a) heatLimit recalibration — Bug-fix tier.** The 2021 limit (55) was tuned against a model
  that understated both density (M2.1) and heating (M2.2). Rule chosen by the owner:
  *margin-preserving* — execute the frozen legacy tree (the `tests/parity/step.test.ts` harness
  already drives the full 2021 loop in a VM) over the classic Re-entry preset to measure its
  peak-thermalPower-to-limit ratio, measure the unified model's peak on the same preset, and set
  the new `heatLimit` to preserve the 2021 margin. Failing test FIRST: flip
  `tests/flies-every-scenario.test.ts`'s reentry expectation from `brokeUp` to `landed` and watch
  it fail before the fix. Measured context: under unified physics the preset reads **144 thermal
  units at spawn** (7300 m/s at 80 km) and peaked ~165 under the old flags-off model; orbital
  entry from 150 km peaked ~310 open-loop, so a *managed* entry may still be required below the
  recalibrated limit — that is part (c)'s problem, not a reason to inflate the limit. The
  constant diverges from the frozen tree: declare it in `constants.test.ts`'s divergence list
  with the measurement. Accept: reentry preset survives auto-land; before/after trajectory diff
  on all scenarios in the commit; goldens regenerated under the declared tier.
  **(b) Orbital presets at 150 km** (owner decision). Measured: 100 km decays to the ground
  within one lap; 150 km holds with 38 m drift per lap. Recompute Circularize (96% of circular)
  and Deorbit (circular) speeds from `circularOrbitalSpeed(planetRadius + 150_000)`; Deorbit
  stays half a lap out (−π·R). Accept: existing orbit tests updated and green at 150 km.
  **(c) Deorbit targeting — the owner chose to build it.** A new autopilot mode (`autoDeorbit`)
  that times a retrograde burn so the descent ends at StarBase: coast in orbit holding retrograde
  attitude via RCS, fire when (downrange to landing site) equals a calibrated entry lead
  distance, burn a fixed ΔV sized for a *shallow* entry (entry steepness controls peak heating —
  Sutton-Graves peaks scale with sqrt(ρ)·v³, so decelerating higher is the lever if the
  recalibrated limit still binds), shut down, hand over to `autoLand` below the entry interface
  and let its aero-descent steering trim the residual. The lead distance is calibrated by
  measurement — the sim is deterministic, so fly it, measure the miss, fold it in, and commit
  the constant with its calibration numbers. Wire a `Deorbit` button into the autopilot panel
  (event union + indicator, M4.2 pattern). Accept: the orbit demo test — Circularize preset →
  circular at 150 km → coast a full lap → deorbit → survive entry → touchdown at StarBase
  (assert the measured landing error and pin it; report the achieved figure honestly rather
  than promising a number in advance) — deterministic, and a golden fixture if the sampled size
  stays reviewable (raise `SAMPLE_EVERY` for this one spec if needed).
- [x] **M2.10 Feel review → FULL FIDELITY, NO FLAGS** — *the owner's verdict, 2026-08-25:
  "the point is full fidelity and realism, don't hold back and no flag." This supersedes both
  the original "pick defaults" framing and the interim "all flags on by default" answer.* The
  four fidelity paths — planet-centered gravity (M2.6), local speed of sound (M2.7), full ISA
  (M2.8), collapsed trig (M1.9) — become the ONLY physics; the flag machinery is removed
  entirely: `core/flags.ts` deleted, `SimState.flags` gone, every branch unconditional, the
  2021-only relief field `orbitGravityAccCompensation` removed from SimState (its expression
  survives in `gravity.legacyOrbitRelief` for the parity documentation). Fidelity tier, on the
  owner's explicit instruction. Implementation notes, all verified in a dry run on 2026-08-25:
  · **The unification is provable bit-for-bit**: keep the fidelity arithmetic in the exact
    operation order the flag-on path used (including the `-C.gravity … + C.gravity + real`
    add-back in the vertical acceleration), regenerate, and the unified `reentry-autoland`
    fixture's rows come out **byte-identical** to the M1.9 all-flags fixture
    (`reentry-autoland--planetCenteredGravity+realSpeedOfSound+fullISA+collapsedTrig.json`,
    commit 115879c). Assert that once during the work; it is the proof the restructure changed
    nothing numerically.
  · **Outcomes under unified physics, measured**: booster-sep, rtls, before-flip and
    landing-burn all still auto-land; the intro hands over at 10.0 s; reentry breaks up
    instantly on heat (144 units at spawn against 55) — which M2.9(a) then fixes.
  · **Parity re-scope** — the suite's claim changes from "v2 ≡ 2021" to "v2 ≡ 2021 except
    exactly five declared departures" (gravity, speed of sound, atmosphere, trig, heat
    argument). Keep the lockstep harness but compare only the aero/gravity-decoupled chain
    (throttle slew, gimbal position, RCS run time, fuel, mass, thrust, TWR, fuelRunOut) —
    note **fin extensions are trajectory-coupled** (their goal split flips on the sign of
    angleOfAttack, flightControl.js:9) and must not be in the lockstep set; their slew
    mechanics stay covered by `actuation.test.ts`. Add a declared-departures block pinning
    each divergence to its exact replacement formula. Two traps found in the dry run: the
    frozen tree carries the **un-repaired M2.1 stratosphere** (65% off the repaired model at
    70 km), so legacy-side atmosphere assertions must branch below/above the tropopause; and
    both loops compute thermalPower/pitchRate a phase before spatial motion, so end-of-step
    reconstructions need ~2% phase tolerance, not 1e-11.
  · `updateAtmosphere` becomes the ISA; keep the repaired 2021 model exported as
    `legacyAtmosphere` for the parity/atmosphere tests, which re-point to it.
  · Goldens: one physics → one fixture set (the 7 base scenarios); flag-suffixed fixtures and
    the FLAG_COMBINATIONS machinery go; `replay.test.ts` asserts no flag-suffixed fixture
    remains. Menu note about orbital presets "needing the flag" is deleted — no fidelity UI
    section is needed, which also closes that M4.4-era loose end.
  Accept: no reference to `flags` anywhere in `v2/src`; unified fixture rows byte-identical to
  the M1.9 all-flags recording (asserted before the old fixtures are deleted); full gate green.


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
- [x] **M5.4 Retire legacy** — 2021 tree removed after v2 flies every scenario; v1.0 tag.
  Tree retired: owner chose option **A**, so it moved to `v2/tests/fixtures/legacy/` — gone as an
  application, kept frozen as the parity reference the tests execute. Repository root is now
  `v2/`, `docs/` and two markdown files. The `v1.0` tag is created on the final commit,
  authorized by the owner's "finish it all" instruction (2026-08-25). **It could not be pushed
  from the build session:** GitHub answers `HTTP 403` to any push into `refs/tags/*` from that
  session's credentials, while branch pushes to `claude/first-project-rebuild-bjniik` succeed —
  the token is scoped to the branch. Not an egress-proxy block (the proxy records no relay
  failure), and there is no tag-creation tool available to route around it. One command from a
  checkout with push rights finishes it:

      git tag -a v1.0 <final-commit> -m "Starship Simulator v1.0" && git push origin v1.0

- [x] **M2.11 Bug: the autopilot's RCS command was dead code** — found by the realism audit,
  2026-08-25. `precisionAlignment`'s RCS branch writes a proportional thrust below saturation;
  `controlTranslation` runs immediately after it, in the same step, and zeroed it before
  rotational motion — the only consumer — could read it. Measured across all seven goldens:
  `rcsThrust` was non-zero on exactly the steps where the yoke saturated and no others. The
  consequence is not cosmetic: the alignment law damps with `-2*omega/T`, so a little rotation
  drops the demand under the cap and the thrusters cut out entirely, leaving the vehicle
  spinning. In vacuum, where RCS is the only actuator, that is no attitude control at all.
  Bug-fix tier. Accept: a 180° flip completes and HOLDS; goldens regenerated with the
  before/after diff in the commit.

- [x] **M2.12 Bug: the tangential term was doubled** — found by the realism audit, 2026-08-25.
  M2.6 shipped `dv_t/dt = -2*v_r*v_t/r`. The 2 belongs to the ANGULAR equation
  (`r*theta_dd + 2*r_d*theta_d = 0`); this simulation integrates the tangential SPEED
  `v_t = r*theta_d`, whose derivative is `-v_r*v_t/r`. With the 2, angular momentum is
  destroyed at rate `-v_r*v_t` — manufactured on the way down, eaten on the way up. It survived
  M2.6 because it vanishes identically at `v_r = 0` and a circular orbit has `v_r = 0` forever,
  so every circular-orbit test passed; the one eccentric test allowed 1% drift and blamed the
  integrator. Bug-fix tier. Accept: angular momentum conserved to 1e-5 on an eccentric vacuum
  orbit, a ballistic coast matching an independent two-body integration and CONVERGING with dt,
  goldens regenerated with the before/after in the commit.

- [x] **M2.13 Deorbit guidance instead of a fitted lead** — the fixed
  `DEORBIT_LEAD_DISTANCE` was right only for the flight it was fitted to (metres from the
  Deorbit preset, 192 km from a hand-circularised one), because the vacuum arc depends on the
  mass at ignition and the pointing error during the burn. Replaced by: a conic prediction of
  the coast (`gravity.coastDownrangeDistance`), a burn-arc term from the vehicle's own mass, one
  measured constant for the atmospheric descent, and a burn that CUTS OFF on the guidance
  condition instead of on a fixed ΔV. Accept: lands within 10 km from starts it was not fitted
  to, with the envelope measured and asserted.

- [x] **M2.14 Fidelity: a real thermosphere** — found by the realism audit, 2026-08-25. Above
  86 km the model held the mesopause's ~5.6 km scale height forever, while the real thermosphere
  warms toward ~1000 K and its scale height grows past 50 km. Measured against the standard
  atmosphere: 0.76× at 120 km, **0.042× at 150 km**, 6e-5 at 200 km, 3.6e-11 at 300 km — above
  ~130 km it was not thin air, it was vacuum, and an orbit in a vacuum never decays. Replaced by
  the standard piecewise-exponential model, base densities chained from the ISA's own value at
  the seam so the halves join without a step. Accept: within 5% at 100 km, 0.2% at 150 km and a
  factor of 1.3 to 300 km; one golden moves (booster-sep, the only flight above 86 km).

## M6 — Broadcast (the UI/graphics overhaul; plan: `docs/BROADCAST-UI-PLAN.md`)

*Owner decision 2026-08-25: adopt the SpaceX webcast overlay's design language;
responsive to phones. Milestone-wide rules, checked at EVERY M6 commit:
`git diff v2/src/core` is empty; the seven golden digests in
`tests/golden/unification.test.ts` are unchanged; every 2021 control still
exists and works (capability parity — visual parity is retired); lint + test +
build + playwright green per task; one task per commit, id-prefixed.*

- [x] **M6.1 Tokens, type, and the testid contract** — `src/ui/theme.css` design tokens
  (ink-100/70/45/25 opacity ramp, scrims, caution/alarm/good, hairline, 2px radius); D-DIN
  (OFL 1.1) subset to woff2 ≤ 80 kB total, self-hosted, license committed, SW-precached; a
  canvas-measure unit test asserts tabular digits (`1111` vs `0000` within 1px) and DECIDES the
  font — fallback Saira/Barlow if D-DIN fails it; every interactive control and readout gains a
  stable `data-testid`, and the e2e control-presence specs re-point to them. Accept: font loads
  in the offline e2e; digit test green; no-CDN e2e green; e2e specs pass via testids; goldens
  and core untouched.
- [ ] **M6.2 The lower-third telemetry bar** — bottom scrim; left: SPEED + ALTITUDE dial gauges
  (SVG arc, 270°, auto-ranged per scenario; big tabular numeral + unit); right: engine dot
  cluster (3 Raptors — lit/blink-on-ignition/dim/`--alarm` on failure, reusing indicator
  semantics) + propellant bar (CH4/LOX visual style, one tank honestly noted) + pitch chevron;
  center: T+ clock from `world.timeSpent` + scenario name; long-tail readouts (V/S, H/S, TWR, G,
  MACH, Q, HEAT, RANGE) move to a collapsible engineering strip; **Q relabeled kPa** (declared
  display fix of the 2021 mislabel, noted in PARITY.md). All per-frame writes via the single-rAF
  binder, extended with attribute-diff (dashoffset/transform) writes. Accept: binder benchmark
  < 2 ms on the new DOM; zero per-frame allocation test covers the arcs; old top-left HUD gone;
  e2e reads the new readouts by testid.
- [ ] **M6.3 Mission event timeline** — `src/hud/timeline.ts`: pure SimState→events derivation
  (LIFTOFF, MAX-Q by confirmed peak, MECO, APOGEE, DEORBIT BURN, ENTRY at 80 km, FLIP, LANDING
  BURN, TOUCHDOWN/LOSS — observed, never scripted); per-scenario expected tracks as data; track
  UI with dots, labels, progress fill, current-event highlight. Accept: the derivation replayed
  over ALL SEVEN golden fixtures asserts each scenario's event order headlessly; live e2e sees
  the intro reach TOUCHDOWN; freestyling lights nothing falsely (unit test with a hand-flown
  divergent state).
- [ ] **M6.4 Controls in the broadcast language** — restyle Engine/Yoke/Autopilot/utility
  panels: flat `--panel` surfaces, hairlines, uppercase micro-labels, state as lit dot + fill
  (never green text); sliders as thin tracks with tabular values; **the neumorphic shadow string
  is deleted repo-wide and its absence grep-asserted in a test**; cinematic-mode toggle hides
  the controls layer (persisted per-device). Accept: full e2e control checklist passes
  unchanged via testids; cinematic screenshot shows broadcast layer only; zero behavioral diff
  (same typed events, same commands).
- [ ] **M6.5 Menu, black box, guide restyle** — menu as full-screen broadcast card (scenario
  select with per-scenario stat lines); uPlot themed to tokens (hairline axes, D-DIN, dark);
  guide/about typography pass. Accept: menu/guide/black-box e2e green; uPlot still lazy (budget
  report proves first-load unchanged).
- [ ] **M6.6 Responsive + mobile** — breakpoints ≥1024 / 600–1024 / <600; phone portrait:
  gauges collapse to digit+tick, timeline to current→next, panels become bottom sheets (≥44 px
  targets, drag handle, one open); `viewport-fit=cover`, safe-area insets, `dvh`; landscape =
  compressed desktop. Playwright gains phone-viewport projects (Pixel-7- and iPhone-14-class,
  portrait + landscape) running smoke + controls + offline. Accept: all mobile projects green;
  no horizontal scroll at any breakpoint; canvas resize correct in both orientations.
- [ ] **M6.7 Graphics: the world earns the overlay** — view-only: horizon curvature + altitude
  haze; vacuum plume expansion driven by ambient pressure (tight/diamond at sea level, wide
  bell in vacuum); re-entry plasma trail scaled by thermalPower via the pooled particles; pad
  lighting tied to sky darkness. Accept: heap-sampling test extended, still zero per-frame
  allocations; 60 fps profile; goldens and core untouched (render reads state, never writes).
- [ ] **M6.8 Perf, a11y, budget, ship** — binder re-benchmark < 2 ms; bundle report in the
  commit (JS ≤ 250 kB gzip, fonts ≤ 80 kB); WCAG AA contrast asserted for ink-70 over the
  brightest fixture frame; `prefers-reduced-motion` disables blink/shimmer; focus-visible
  states; screenshot spec captures desktop + phone portrait, README carries both. Accept: full
  gate + all e2e including mobile; `git diff v2/src/core` empty over the whole milestone; the
  seven unification digests byte-identical to their M2.14 values.

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
- 2026-08-25 · M1.9 · **Owner chose the Fidelity flag.** All seven quadrant ladders — the six in
  `physics/components.ts` plus the seventh inlined in `getEffectiveVerticalMaxThrust` — now have a
  collapsed single-expression path behind `flags.collapsedTrig`, off by default. Both forms live
  side by side deliberately: the ladders are what the 2021 build does and what the default fixtures
  record, so deleting them would make the flag-off path a reconstruction rather than the original.
  **The key verification is a negative one.** Regenerating every fixture produced exactly **one
  added line per file** — `"flags.collapsedTrig": false` — with **zero deletions and zero modified
  values** across all ten. Not one trajectory number moved, which is the evidence that the default
  path is untouched; a diff summary of "1 insertion, 0 deletions" ten times over is worth more than
  any amount of reasoning about it. The on path is real, not a duplicate: the two `before-flip`
  fixtures differ in **761 cells across 121 rows**, starting at row 1. `before-flip` is the
  representative because the flag only does anything where the branches meet, and the flip sweeps
  every quadrant in sixty seconds; a scenario that stayed in one quadrant would record a fixture
  that passed whatever the flag did. The old three-flag "everything on" combination is superseded by
  the four-flag one and its fixture deleted. **Two of my own test assertions were wrong and had to
  be fixed rather than weakened**: comparing final states proved nothing, because both paths land
  and a landed vehicle is pinned to exactly half its height with velocities zeroed, so the endpoints
  agree to the bit however different the flights were; and sampling `altitude` mid-flight also
  showed no difference, because altitude is an integral of an integral and the perturbation has not
  reached its last bit yet. The assertion now walks the whole state, requires something to have
  moved, and requires everything that moved to agree to ten significant figures. 1027 tests,
  43 e2e, 4 deploy-shape e2e, 182.8 kB of 250.
- 2026-08-25 · owner decisions · **The endgame is decided: full fidelity, no flags.** Recorded here
  because every remaining task now hangs off these five answers. (1) The feel review's verdict
  (M2.10): the fidelity physics becomes the only physics and the flag machinery is removed — the
  owner's words: "the point is full fidelity and realism, don't hold back and no flag." This
  supersedes CLAUDE.md's "tuned 2021 feel as the reference configuration": the 2021 model remains
  the frozen parity reference at `v2/tests/fixtures/legacy/`, not the shipped feel. (2) Orbital
  presets move to **150 km**, where the orbit actually closes (38 m drift/lap measured, versus
  decay-to-ground within one lap at 100 km). (3) `heatLimit` is **recalibrated as a Bug fix** under
  the margin-preserving rule: same peak-to-limit ratio the 2021 model had on the classic Re-entry
  preset, measured by executing the frozen tree. (4) **Deorbit targeting gets built** — a real
  autopilot mode that times the retrograde burn to land at StarBase, calibrated by measurement.
  (5) The **v1.0 tag is authorized** for the final green commit. A unification dry run was flown
  and then reverted (the owner asked for plan, not implementation); everything it proved — the
  bit-identity of the unified path with the M1.9 all-flags fixture, the four-of-five scenarios
  landing, the parity re-scope shape and its two traps — is folded into the M2.10 and M2.9 task
  specs above so the implementing session inherits the measurements without rediscovering them.

- 2026-08-25 · M2.10 · **Full fidelity, no flags.** `core/flags.ts` deleted, `SimState.flags`
  gone, `orbitGravityAccCompensation` removed from the state, every fidelity branch
  unconditional. The seven quadrant ladders ship collapsed; the 2021 copies moved to
  `legacy*Coefficient` / `legacyEffectiveVerticalMaxThrust` so the parity suite and the 1-ULP
  proof still have the real thing to compare against. `updateAtmosphere` is the ISA;
  the repaired three-layer model is exported as `legacyAtmosphere`.
  **The restructure is provably numerically inert**: all seven regenerated fixtures' row
  blocks hash identically to the all-flags recordings made at 115879c — the reentry digest
  `ef4c014f…` is reproducible straight from that commit's committed fixture. Asserted
  permanently in `tests/golden/unification.test.ts` (a digest rather than a second fixture
  set, since "one physics, one fixture set" is the other half of this task), and checked
  before the flagged fixtures were deleted. Keeping the `-g … + g + real` add-back in
  `getVerticalAcceleration` untouched is what bought that: float addition is not associative
  and tidying it would have moved the last bits.
  **Parity re-scoped** from "v2 ≡ 2021" to "v2 ≡ 2021 except exactly five declared
  departures", and made *stronger* rather than weaker in the process. The lockstep harness
  now re-seeds the legacy VM from v2's state before every step, so it measures per-step
  agreement instead of accumulated drift: 35 retained fields, and exactly three of them
  (`pitch`, `angularVelocity`, `speedX` — precisely the `X * dt` integrations) ever differ,
  at 1 ULP. Every departed field is pinned to its replacement expression, not excused; a
  completeness test proves retained ∪ departed covers every field the old comparison had, with
  no overlap. The long-run claim is made separately over the trajectory-decoupled chain
  (fuel, mass, throttle/gimbal slew, RCS budget, fuel-out) for 3000 free-running steps.
  Two traps confirmed in passing: the frozen tree carries the **un-repaired** M2.1
  stratosphere (it reads −56.46 °C at 80 km, where v2's `legacyAtmosphere` does not), and
  re-seeding dissolves the fin-extension coupling that would otherwise have forced fins out
  of the comparison. Measured: the ISA at 80 km is 1.8e-5 kg/m³ — half the repaired
  three-layer model, still 2.5× the 2021 isotherm, so the Re-entry preset still breaks up
  and M2.9(a) still has work to do. Gate: lint, 1008 tests, build (182.1 kB of 250), and
  43 e2e all green.

- 2026-08-25 · M2.9(a) · **heatLimit 55 → 390, Bug-fix tier, margin-preserving.** Failing test
  first: flipping `flies-every-scenario`'s reentry expectation from `brokeUp` to `landed` failed
  at 0.0 s, as it had since M2.1. The rule the owner chose is *preserve the 2021 margin*, and it
  is re-derived on every test run rather than asserted — `tests/parity/heat-margin.test.ts` flies
  the Re-entry preset on BOTH implementations: the frozen 2021 tree in a VM with its own
  autopilot flying (browser stubs for `setTimeout`, PIXI and the DOM live in the VM context; the
  tree itself is untouched, and `Math.random` is pinned inside the context so ignition is
  deterministic), and v2. Measured: 2021 peaks at **34.7414** against its limit of 55 = **0.6317
  of it**; v2 peaks at **247.4863**; the margin-preserving limit is 247.4863 / 0.6317 = **391.80**,
  rounded DOWN to **390** so the recalibration can never grant more headroom than 2021 had
  (v2 now flies it at 0.6346 of its limit). The limit still bites: entry at 1.4× the preset speed
  peaks at 395 and is fatal. Two findings worth keeping: the legacy context is left dirty by a
  flight, so flying it twice answers 32.5 rather than 34.7 — it is flown once; and suppressing
  `inFlightBreakUp` does NOT suppress breakup's *effects* (it zeroes propellant and engines), so
  the first measurement attempt was reading a dead vehicle's tumble at 232.9 rather than a flown
  descent at 247.5. Divergence declared in `constants.test.ts` under a new `DIVERGES_FROM_2021`
  list, distinct from `INTRODUCED_BY_V2` and checked to really exist in 2021. Goldens
  regenerated: **exactly one fixture moved**, `reentry-autoland`, which is the before/after
  trajectory diff this tier owes — the other six are byte-for-byte the ones M2.10 recorded, and
  `unification.test.ts` shows that directly. Gate: lint, 1019 tests, build all green.

- 2026-08-25 · M2.9(b) · **Orbital presets moved to 150 km** (owner's decision). Both speeds are
  now derived from `circularOrbitalSpeed(planetRadius + ORBIT_ALTITUDE)` at module load rather
  than transcribed, so the altitude is the single place to change: Circularize spawns exactly
  20 m/s short of circular (7780.68 m/s, dropping perigee ~34 km — decays if ignored, closes with
  a few seconds of throttle), Deorbit spawns exactly circular (7800.68 m/s) half a lap of ground
  track short of StarBase. Worth recording: the old comment claiming "about 96% of circular" was
  wrong about its own preset — 7810 m/s at 100 km is 99.74% of circular, a 20 m/s shortfall, which
  is what the scenario is actually built around and what the new derivation makes explicit. No
  golden fixture covers these presets, so nothing regenerated.

- 2026-08-25 · M2.9(c) · **Deorbit targeting — the one autopilot mode 2021 never had.**
  `autoDeorbit`: configure (RCS on, engines off, throttle staged), coast turning to retrograde,
  fire when the ground track left to StarBase reaches a calibrated lead, burn a fixed ΔV, hand
  over to `autoLand`. Appended last in `runAutopilot` so it cannot perturb the 2021 six, and a
  `Deorbit` button + indicator wired through the typed event union (M4.2 pattern).
  **The acceptance flight lands 312 m from the pad** after a full lap from 150 km — 48 simulated
  minutes, peak heating 309 units, 79% of the recalibrated limit.
  Two findings that shaped the design, both now in the code's own comments:
  · **Attitude, not the burn, decides whether an entry is survivable.** The first version held
    retrograde down to an 80 km "entry interface" — nose into the airflow is the *minimum*
    cross-section, so it barely decelerated up high, arrived low and fast, and hit the heat limit
    exactly: breakup at 1194 s, peak 390.0 against a limit of 390. Handing over the moment the
    burn ends lets `autoLand` fly it broadside for the whole descent, and the peak falls to 309.
  · **The lead distance had to be calibrated on the closed loop, not the open one.** dMiss/dLead
    is about −1.36, not −1, because `autoLand` amplifies the offset it is handed; a fixed-point
    iteration oscillates and a secant search converges. Open-loop pre-positioning gave 6 836 km;
    the real preset (which coasts a lap first, and is still 19.5° short of retrograde at ignition
    because RCS turns at ~0.0015 rad/s) needed 5 500 km. ΔV chosen from a sweep — 50/100/150/200/300
    m/s peak at 271/287/308/324/346 units with 13 220/7 807/6 195/5 314/4 319 km of range — 150 m/s
    being the compromise between heat margin and how long the player waits.
  Five SimState fields added, all constant in every existing scenario, so regenerating the goldens
  added exactly five lines per fixture and **moved no rows at all** — the M2.10 digests still hold,
  which is the proof this feature changed no physics. Gate: lint, 1028 tests, build, e2e green.

- 2026-08-25 · M5.4 · **v1.0.** All 44 tasks complete. The tree retirement landed earlier under
  option A; what remained was the tag, and the tag needed the rebuild to actually be finished.
  Final state: `cd v2 && npm run lint && npm run test && npm run build` green — 1028 tests over
  46 files, first-load JS 182.5 kB of a 250 kB budget — plus 43 Playwright specs. `git ls-files |
  grep DS_Store` is empty, as it has been since M0.5. What v1.0 is: the 2021 simulator's physics,
  ported line by line and then made honest — six declared departures from the original, each one
  a named tier with its evidence in the commit that made it, and a parity suite that still
  executes the frozen 2021 tree to prove the rest is unchanged. It flies every scenario the
  original did, plus one the original could not: leaving a 150 km orbit and landing 312 m from
  the pad.

- 2026-08-25 · M2.11 · **The autopilot's proportional RCS command was dead code.** Found while
  auditing the deorbit mode for realism: it was documented as "turning to retrograde on RCS at
  ~0.0015 rad/s", and it was doing nothing of the kind. The thrusters fired for 0.21 s, the
  vehicle reached −0.0372 rad/s, the demand fell to 787 kN against an 800 kN cap, firing stopped,
  and it **free-tumbled for the next thirty-five minutes** — arriving near retrograde by
  coincidence, which the lead-distance calibration had then been fitted to. The hardware was
  never the limit: 800 kN at 20 m on 8.96e7 kg·m² is 0.16 rad/s², a minimum-time 180° flip in
  8.9 s. Fixed by routing the command through `autopilot.rcsThrustCommand`, which
  `controlTranslation` consumes instead of clobbering — keeping `rcsControl` a function of its
  inputs rather than of who cleared what first. Partial-authority firing now costs reserve in
  proportion (a full-deflection step still costs bit-for-bit what 2021 charged), because free
  unlimited attitude control would be a worse model than the bug. Result: the flip takes ~20 s
  and then **holds retrograde to ±3° for the whole coast**, on 4 s of the 25 s budget.
  Blast radius, measured: `rtls-boostback` and `reentry-autoland` move; **launch-pad,
  booster-sep, before-flip, landing-burn and the intro are bit-identical** — the soul untouched,
  asserted in the new test rather than assumed. Departure declared in `parity/actuation.test.ts`;
  `parity/autopilot.test.ts` still proves the *value* matches 2021 bit for bit, since only its
  destination changed. heatLimit re-derived and unchanged at 390 (the margin-preserving figure
  moved 391.80 → 391.47, absorbed by rounding down — the constant was not on a knife edge).
  Gate: lint, 1038 tests, build green.

- 2026-08-25 · M2.12 · **The tangential term was twice what it should be — since M2.6.** The
  deepest defect the audit found, and it was hiding behind a passing test. Provable on paper:
  the polar tangential equation is `r*theta_dd + 2*r_d*theta_d = 0`, and that 2 is the Coriolis
  term in the ANGULAR acceleration; the simulation integrates the tangential SPEED
  `v_t = r*theta_d`, and `dv_t/dt = r_d*theta_d + r*theta_dd = -r_d*theta_d = -v_r*v_t/r`.
  One, not two. The proof is angular momentum: `dh/dt = v_r*v_t + r*(-v_r*v_t/r) = 0` with the
  correct term, and `-v_r*v_t` with the doubled one.
  **How it hid:** the term vanishes identically when `v_r = 0`, and a circular orbit has
  `v_r = 0` forever — so every circular-orbit test in the M2.6 suite passed. The single
  eccentric test measured ~0.5% drift, allowed 1%, and attributed it to the first-order
  integrator. The giveaway was that it did not converge: halving dt left the error exactly where
  it was, which is how a wrong equation tells itself apart from a coarse one.
  **Measured, before:** 12.6% angular-momentum drift on an ellipse in vacuum, and an orbit whose
  apogee should be 4015 km reaching **1380 km** — not an imprecise orbit, a different one. A
  deorbit coast from 150 km came out 313 km (6.35%) long against an independent two-body
  integration. **After:** drift 1.2e-6, apogee correct, coast within 1.2 km at dt=1/120 and
  0.0 km at 1/480 — it converges now.
  All seven goldens moved, which is exactly right: the term acts on anything both climbing or
  falling and moving downrange, i.e. everything but the pad. Every scenario still lands, the
  intro included. `heatLimit` re-derived by its own rule and moved 390 → **389** (the
  margin-preserving figure went 391.47 → 389.30, past what rounding could absorb) — nobody chose
  389, the measurement did. Deorbit lead recalibrated 6 138 → 5 891 km; entry now peaks at 317
  units, 82% of the limit. `unification.test.ts` rewritten as what it has actually become: the
  audit trail of every fixture movement and the tier that caused it. Gate: lint, 1045 tests,
  build green.

- 2026-08-25 · M2.13 · **Deorbit targeting became guidance instead of a fitted number.** The
  audit's third finding. `DEORBIT_LEAD_DISTANCE` hit the pad to the metre — from the one flight
  it was calibrated on. Flown from a hand-circularised Circularize preset (318 t at ignition
  rather than 420 t) it missed by **192 km**, because a lighter vehicle finishes its burn sooner
  and starts its fall from a different point on a different ellipse. Splitting the range showed
  where to attack it: across those two flights the vacuum arc differed by ~200 km and the
  atmospheric descent by **2.4 km**. So the varying half is the half orbital mechanics can
  compute, and the fitted half barely varies.
  Three pieces now: a burn-arc term from `dV * m / F`; `gravity.coastDownrangeDistance`, a conic
  solved by Simpson over true anomaly (validated against an independent two-body integration to
  0.0 km over 4939 km); and `DEORBIT_ENTRY_RANGE`, measured. That got the spread from 194 km to
  90 km — the rest being the few degrees the vehicle is off retrograde at ignition, which no
  open-loop predictor can know. So the burn now **cuts off on the guidance condition** rather
  than on a fixed ΔV, bounded between 0.5× and 1.6× nominal so it can never trade the vehicle
  for accuracy. That collapsed the spread to **3.8 km**.
  Measured envelope, all landing: 150 km preset −2.95 km · from the pad's own longitude
  +6.09 km · 100 t lighter −7.33 km · one engine failed +3.63 km · 120 km +17.96 km ·
  200 km −50.41 km · 300 km −90.43 km. The 300 km row is the one to watch — the miss is
  tolerable, the entry peaks at 95% of `heatLimit`. The presets sit at 150 km (82%) for a reason,
  and it is now a measured reason. **The full end-to-end demo** — Circularize → burn to circular
  → coast 73 min → autopilot-timed deorbit → survive entry → touchdown — lands **4.81 km** from
  StarBase after 91 simulated minutes, and it is a flight the constant was not fitted to alone.
  No goldens moved: the mode is inert unless armed. Gate: lint, 1055 tests, build, e2e green.

- 2026-08-25 · M2.14 · **The atmosphere above 130 km was a vacuum.** The audit's last finding,
  and the one with the least drama and the clearest arithmetic. M2.8's isothermal continuation
  fixed 100 km (5.8e-7 against a published 5.6e-7) and then failed upward, because it held the
  mesopause's 5.6 km scale height forever. The real thermosphere warms toward ~1000 K and its
  scale height grows past 50 km, so the error compounds exponentially: **0.042× the standard
  density at 150 km — where the orbital presets fly — 6e-5 at 200 km, 3.6e-11 at 300 km.**
  Replaced with the standard piecewise-exponential atmosphere: scale heights transcribed from
  the published table, base densities **chained upward from whatever the ISA itself gives at
  86 km** rather than transcribed — the same trick `buildLayers` already used for pressure, so
  the two halves join to six significant figures instead of by luck. The first band's 5.44 km is
  derived, not transcribed: it is what carries the ISA's own 86 km density to the table's 100 km
  value, and it is the stitch. Measured against the standard: 5% at 100 km, 0.3% at 110, 10% at
  120, **0.1% at 150**, 10% at 200, 26% at 300, 0.2% at 400 and 500. Temperature warms
  asymptotically toward an exospheric 1000 K because the Mach number reads it; pressure comes
  back from the gas law so all three stay consistent.
  Consequence: a 150 km circular orbit now decays **101 m per lap** instead of 38 m — small,
  because a 420 t vehicle nose-on is very dense, but real. Exactly one golden moved
  (`booster-sep-boostback`, the only scenario that goes above 86 km), `heatLimit` needed no
  re-derivation (the Re-entry preset starts at 80 km), and the deorbit demo needed no
  recalibration: −4.89 km from the Deorbit preset, +4.03 km end-to-end from Circularize.
  Fidelity tier, on the owner's standing instruction. Gate: lint, 1060 tests, build, e2e green.

- 2026-08-25 · audit · **A realism pass over the finished build, at the owner's request.** Four
  findings, three of them defects that had shipped and one of them a defect in work from the
  same day. In the order they were found: the autopilot's proportional RCS command was dead code
  (M2.11); the tangential acceleration term was doubled and destroyed angular momentum whenever
  the vehicle climbed or fell (M2.12); the deorbit lead was a constant fitted to one flight and
  missed by 192 km from another (M2.13); the atmosphere above 130 km was a vacuum (M2.14). Each
  landed as its own commit with its own tier and its own failing test first.
  The pass also confirmed what was already right, and made it checkable rather than assumed —
  `tests/core/physical-scale.test.ts` converts the simulation's own units into physical ones:
  the thermal unit is 951.6 W/m² (Sutton-Graves' SI constant, scaled), so `heatLimit` = 389 is
  **37 W/cm²**, the band a heat shield is built to, and 2021's 55 was 5 W/cm², which nothing is.
  M2.9(a) derived 389 from 2021's own margin with no reference to physical units at all and
  landed there anyway — two independent routes to the same number. GM, escape velocity, orbital
  period, implied Isp, TWR, ΔV budget and RCS authority all check out against the real thing.
  The method worth keeping: **a wrong equation does not converge.** The doubled term was found by
  refining dt and watching the error stay put, which is what separated it from the integration
  error it had been mistaken for since M2.6.

- 2026-08-25 · plan · **M6 Broadcast planned** (owner: adopt the SpaceX webcast overlay's soul;
  must work on mobile). Research done with sources: overlay anatomy across the Falcon and
  Starship broadcast generations (scrim-not-cards, dial+digit gauges, event timeline, engine
  dot clusters, LOX/CH4 bars, white+opacity as the whole palette), and the typeface question
  settled — D-DIN is the open member of the DIN family the reference uses, SIL OFL 1.1 via
  Datto, so it can be self-hosted within the no-CDN/offline rules; a tabular-digits measurement
  test decides between it and Saira/Barlow rather than taste. Full plan with layouts (desktop +
  phone portrait), the two-layer broadcast/controls split, cinematic mode, the observed-not-
  scripted mission event timeline (tested by replaying the seven golden fixtures through it),
  and four view-only graphics upgrades: `docs/BROADCAST-UI-PLAN.md`. Eight tasks M6.1–M6.8.
  The milestone-wide invariant is structural: core frozen, the seven golden digests unchanged
  at every commit — the overhaul is pixels, provably not physics.

- 2026-08-25 · M6.1 · Design tokens, the type, and the test-id contract — the three things every
  later M6 task builds on. `src/ui/theme.css` holds the whole vocabulary: a four-step white ramp,
  two scrims, three meaning-colours, one hairline, a 2px radius, the type scale, safe-area and
  touch tokens. **The typeface decision went against the plan, on the plan's own terms.**
  BROADCAST-UI-PLAN nominated D-DIN and made a tabular-digits measurement the decider rather than
  taste; D-DIN failed it decisively — its ten digits carry nine distinct advance widths (`1` is 36%
  narrower than `0`) and it ships no `tnum` feature, so `1111` and `0000` differ by 29 px at the
  44 px gauge numeral and a speed readout would visibly shuffle as it counted. Saira Condensed has
  no `tnum` at all. Barlow — the plan's own named fallback — has one, and its figures are exactly
  uniform (434/1000 condensed, 481 semi-condensed). Four faces subset to the UI's charset:
  **32.7 kB against the 80 kB cap**, OFL 1.1 committed beside them, content-hashed through vite so
  the relative URLs survive a subpath deploy and the service worker precaches them with everything
  else. `scripts/subset-fonts.mjs` keeps the pipeline reproducible; its `--layout-features=tnum`
  flag is load-bearing, since dropping it would leave the CSS asking for tabular figures from a
  font that no longer has them and nothing would fail except the alignment.
  Two tests, catching two different lies: `tests/ui/tabular-digits.test.ts` decides headlessly from
  advance widths (and asserts D-DIN still fails, so the decision cannot be quietly reversed), and
  `tests/e2e/typography.spec.ts` measures the shipped bytes in a real browser.
  **The plan said to measure `1111` vs `0000` on a canvas; canvas cannot answer that question.**
  Chromium's Canvas2D has `fontKerning`, `fontStretch`, `fontVariantCaps` and `letterSpacing` — and
  no `fontVariantNumeric`. Setting one is silently ignored, so the first version of the test
  measured proportional widths and failed by 33.9 px, which is how the gap was found. The tabular
  half now measures real DOM spans under the real stylesheet — a better instrument, since it is the
  text the pilot reads — and canvas stays on as the control, since the only thing it CAN produce is
  the proportional widths that prove the DOM assertion is not vacuous.
  The contract: `src/ui/testids.ts` names every control and readout, deliberately import-free so
  Playwright can read it without vite's aliases; `tests/ui/testids.test.ts` closes the loop that
  costs (the transcribed readout ids must equal `$hud/readouts`, every indicator must have a test
  id, no duplicates); `tests/e2e/testids.spec.ts` asserts each id resolves to exactly ONE element —
  duplicates being the failure that would otherwise turn an unrelated spec red for an unfindable
  reason. Eleven specs re-pointed off `.hud .value`, `[data-indicator]` and a hard-coded row count
  of 13. Two real defects surfaced doing it: `input.spec.ts` drove `pitchHold` from a tuple the
  bulk rewrite did not reach, and nothing on the page used the condensed face, so the browser never
  fetched it and `document.fonts.check` was right to say so.
  Budget gained a second gate — fonts ≤ 80 kB, measured raw because woff2 is already brotli and
  gzipping it again measures nothing. Report: 183.8 kB JS of 250, 32.7 kB fonts of 80.
  Gate green; `git diff v2/src/core` empty; the seven unification digests unmoved.
