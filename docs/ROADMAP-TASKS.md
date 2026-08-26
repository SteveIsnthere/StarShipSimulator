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
- [x] **M6.2 The lower-third telemetry bar** — bottom scrim; left: SPEED + ALTITUDE dial gauges
  (SVG arc, 270°, auto-ranged per scenario; big tabular numeral + unit); right: engine dot
  cluster (3 Raptors — lit/blink-on-ignition/dim/`--alarm` on failure, reusing indicator
  semantics) + propellant bar (CH4/LOX visual style, one tank honestly noted) + pitch chevron;
  center: T+ clock from `world.timeSpent` + scenario name; long-tail readouts (V/S, H/S, TWR, G,
  MACH, Q, HEAT, RANGE) move to a collapsible engineering strip; **Q relabeled kPa** (declared
  display fix of the 2021 mislabel, noted in PARITY.md). All per-frame writes via the single-rAF
  binder, extended with attribute-diff (dashoffset/transform) writes. Accept: binder benchmark
  < 2 ms on the new DOM; zero per-frame allocation test covers the arcs; old top-left HUD gone;
  e2e reads the new readouts by testid.
- [x] **M6.3 Mission event timeline** — `src/hud/timeline.ts`: pure SimState→events derivation
  (LIFTOFF, MAX-Q by confirmed peak, MECO, APOGEE, DEORBIT BURN, ENTRY at 80 km, FLIP, LANDING
  BURN, TOUCHDOWN/LOSS — observed, never scripted); per-scenario expected tracks as data; track
  UI with dots, labels, progress fill, current-event highlight. Accept: the derivation replayed
  over ALL SEVEN golden fixtures asserts each scenario's event order headlessly; live e2e sees
  the intro reach TOUCHDOWN; freestyling lights nothing falsely (unit test with a hand-flown
  divergent state).
- [x] **M6.4 Controls in the broadcast language** — restyle Engine/Yoke/Autopilot/utility
  panels: flat `--panel` surfaces, hairlines, uppercase micro-labels, state as lit dot + fill
  (never green text); sliders as thin tracks with tabular values; **the neumorphic shadow string
  is deleted repo-wide and its absence grep-asserted in a test**; cinematic-mode toggle hides
  the controls layer (persisted per-device). Accept: full e2e control checklist passes
  unchanged via testids; cinematic screenshot shows broadcast layer only; zero behavioral diff
  (same typed events, same commands).
- [x] **M6.5 Menu, black box, guide restyle** — menu as full-screen broadcast card (scenario
  select with per-scenario stat lines); uPlot themed to tokens (hairline axes, D-DIN, dark);
  guide/about typography pass. Accept: menu/guide/black-box e2e green; uPlot still lazy (budget
  report proves first-load unchanged).
- [x] **M6.6 Responsive + mobile** — breakpoints ≥1024 / 600–1024 / <600; phone portrait:
  gauges collapse to digit+tick, timeline to current→next, panels become bottom sheets (≥44 px
  targets, drag handle, one open); `viewport-fit=cover`, safe-area insets, `dvh`; landscape =
  compressed desktop. Playwright gains phone-viewport projects (Pixel-7- and iPhone-14-class,
  portrait + landscape) running smoke + controls + offline. Accept: all mobile projects green;
  no horizontal scroll at any breakpoint; canvas resize correct in both orientations.
- [x] **M6.7 Graphics: the world earns the overlay** — view-only: horizon curvature + altitude
  haze; vacuum plume expansion driven by ambient pressure (tight/diamond at sea level, wide
  bell in vacuum); re-entry plasma trail scaled by thermalPower via the pooled particles; pad
  lighting tied to sky darkness. Accept: heap-sampling test extended, still zero per-frame
  allocations; 60 fps profile; goldens and core untouched (render reads state, never writes).
- [x] **M6.8 Perf, a11y, budget, ship** — binder re-benchmark < 2 ms; bundle report in the
  commit (JS ≤ 250 kB gzip, fonts ≤ 80 kB); WCAG AA contrast asserted for ink-70 over the
  brightest fixture frame; `prefers-reduced-motion` disables blink/shimmer; focus-visible
  states; screenshot spec captures desktop + phone portrait, README carries both. Accept: full
  gate + all e2e including mobile; `git diff v2/src/core` empty over the whole milestone; the
  seven unification digests byte-identical to their M2.14 values.

## M7 — Depth and Speed (plan: `docs/DEPTH-AND-SPEED-PLAN.md`)

*The measured problem: the viewport is 356 x 200 m at every altitude, so the ground
leaves the screen above ~100 m and every scenario but the final landing is flown
against a blank sky; and at 7300 m/s a ground object crosses the screen in 49 ms,
under three frames. Owner decisions 2026-08-25: the camera control law may be retuned
(plan § 6.1) with a **moderate** FOV range; the trajectory map is **always-on and
collapsible**; and the camera is sequenced **third**, before the world layers that are
drawn inside the frame it defines. Sound is M8, not folded in here. Milestone-wide
rules, checked at EVERY M7 commit: `git diff v2/src/core` is empty; the seven golden
digests are unchanged; lint + test + build + playwright (all five projects) green; one
task per commit, id-prefixed. Compression is allowed in the depiction and never in the
numbers — plan § 5.*

- [x] **M7.1 The trajectory map** — `src/hud/trajectory.ts`: pure world→map projection with
  auto-ranging over both axes (a 200 m hop and a 2000 km re-entry on the same instrument), the
  ground line, the landing site at x = 0, the 80 km entry interface, the vehicle marker and its
  velocity vector, and the flown path decimated from `app/recorder.ts`. `src/ui/TrajectoryMap.svelte`
  owns a dedicated `<canvas>`; the existing rAF binder drives it, throttled (a map does not need
  120 Hz) with pre-allocated point arrays. **Always-on and collapsible** (owner decision): a panel
  in the lower third, glanceable with no interaction, collapsing like the engineering strip and
  remembered per device with the same guarded `localStorage` read M6.4 uses. Accept: projection
  unit-tested including both extreme ranges and the degenerate zero-extent case; replayed over all
  seven goldens without producing a NaN or an off-canvas coordinate; e2e sees the marker move and
  the trail grow, and sees the collapse persist across a reload; zero per-frame allocation test
  extended; goldens and core untouched.
- [x] **M7.2 The predicted path** — draw where the vehicle is actually going, from
  `coastDownrangeDistance()` and `getFreeFallTimeRemainingPrediction()` — M2.9 built the conic
  predictor for the deorbit autopilot and the player has never been able to see it. Predicted
  touchdown marker, distance-to-target, and an honest "no solution" state when the trajectory does
  not reach the ground (orbit) or the predictor is out of domain. Accept: the predicted touchdown
  is compared against the actual touchdown over the goldens that land, and the error is reported
  in the commit; the orbital presets show no-solution rather than a wrong number; no new physics —
  `git diff v2/src/core` still empty.
- [x] **M7.3 Camera: retune the follow law** — **UNBLOCKED by owner decision, 2026-08-25** (plan
  § 6.1), and **sequenced third on purpose**: M7.4 and M7.6 are drawn into the frame this defines,
  so building them first would mean re-tuning them afterwards. The "ported verbatim, worth
  preserving exactly" constraint on `view/camera.ts` is lifted; the follow dynamics, the framing and
  the field of view are all open. The prize is **altitude-linked FOV** at the owner's **moderate**
  setting: up to ~5x by high altitude, taking the drawn vehicle from 180 px to about 36 px and the
  viewport from 200 m to about 1 km, so the ship stays clearly the subject while the world gets room
  to breathe. Plus a framing lead against the direction of travel, and shake from dynamic pressure
  and thrust.
  **The bit-identical guarantee is gone and must be replaced, not dropped.** Accept, all five:
  (a) the vehicle stays inside the viewport with margin at every sampled frame across all seven
  goldens; (b) the response is damped, not springy — overshoot bounded and settling within a stated
  time after a step change; (c) frame-rate independence holds at 30/60/120/144 fps; (d) the camera
  path is deterministic for a given state sequence; (e) it never looks below the ground. Plus: the
  **FOV curve is flat at 1x below 500 m**, so the intro and every landing are untouched by
  construction rather than by tuning — the intro is named in CLAUDE.md's soul; the curve is
  monotonic and bounded; manual +/- zoom multiplies the altitude FOV rather than fighting it; shake
  respects `prefers-reduced-motion`; zero per-frame allocation; and the two viewport dimension tests
  in `tests/core/camera.test.ts` become altitude-aware rather than being deleted.
- [x] **M7.4 The distant earth** — a compressed-perspective ground layer, visible continuously from
  200 m to 200 km instead of vanishing at 100 m, scrolling at a rate inside the readable band
  rather than at `speed x scale`. Built against the FOV M7.3 settles, not against today's 356 m
  viewport. Both curves live in `view/` as named pure functions that say in their own comments that
  they are compressions and why (M6.7's `atmosphere-look.ts` is the pattern). Accept: curves
  unit-tested at the altitudes and speeds the seven scenarios visit, monotonic and continuous with
  no discontinuity where it takes over from the true-scale ground; screenshots at 1 km, 20 km and
  100 km committed; zero per-frame allocation.
- [x] **M7.5 Velocity streaks and the flight-path marker** — a pooled screen-space streak layer
  swept along the velocity vector, density and length from one calibrated curve, silent below a
  threshold so a landing hop is not snowing; plus the flight-path marker showing where the vehicle
  is going as against where its nose points, which at high angle of attack differ enormously and
  nothing on screen currently says so. Accept: the curve is unit-tested at the speeds the scenarios
  reach and reports zero below the threshold; pool headroom measured and reported (baseline: peak
  576 of 4000); the marker's angle is asserted against `angleOfMotion` over the goldens.
- [x] **M7.6 The cloud deck** — the missing middle distance: parallax currently jumps from 1x
  (ground) to 0.001x (stars) with nothing between, which is why even a good ascent reads as flat.
  A deck at a few kilometres, seeded so it returns identically every run, thinning above it. Like
  M7.4, built against the settled FOV. Accept: deterministic across runs; per-frame allocation
  unchanged; correct above and below.
- [x] **M7.7 Perf, budget, mobile, ship** — binder re-benchmark under 2 ms with the map redraw
  included; bundle report in the commit (JS <= 250 kB gzip, fonts <= 80 kB); the map's phone story
  proved by the mobile projects (it starts collapsed there — the lower third has no spare room);
  offline precache still complete; screenshots refreshed and the README updated. Accept: full gate
  on all five projects; `git diff v2/src/core` empty over the whole milestone; the seven digests
  byte-identical to their M2.14 values.

## M8 — Sound (plan: `docs/SOUND-PLAN.md`)

*Owner decision 2026-08-25: planned now, built after M7. The simulator has been silent
its whole life, 2021 and v2 alike. Milestone-wide rules, checked at EVERY M8 commit:
`git diff v2/src/core` is empty; the seven golden digests are unchanged; lint + test +
build + playwright (all five projects) green; one task per commit, id-prefixed. The
payoff is not the noise, it is the contrast — the fade to near-silence as the air runs
out is the point of the whole milestone.*

- [x] **M8.1 The audio layer** — `src/audio/`: the Web Audio graph built ONCE, a mixer, the
  suspended-until-gesture unlock, and a mute toggle beside the cinematic one, persisted with the
  same guarded `localStorage` read M6.4 uses (a browser that throws on storage must not break the
  simulator). Muting SUSPENDS the context rather than zeroing a gain, so a muted simulator does no
  audio work. **A seventh wall: `core/` may not import from `audio/`**, lint-enforced and tested by
  the same violation-fixture mechanism as the other six. New budget line in `check-budget.mjs`:
  audio ≤ 250 kB, decoded lazily so it never blocks the first frame. Accept: wall test green
  including its scoping; node count asserted constant over a long flight (the audio version of the
  M3.7 leak test); e2e sees the context reach `running` after a gesture and `suspended` when muted;
  first-load JS unchanged.
- [x] **M8.2 Engine rumble, synthesised** — filtered noise plus low oscillators, not a sample loop:
  a loop long enough not to sound looped costs hundreds of kB and cannot follow the throttle
  continuously. `audio/params.ts` holds the curves as pure functions of `engines.running` and
  `vehicle.throttleCurrent`, given the same treatment as M6.7's look curves. Accept: curves pinned
  at the throttle settings and engine counts the seven scenarios reach, monotonic and bounded; an
  `OfflineAudioContext` render asserts the buffer's RMS is genuinely higher at 100% than at 40% and
  higher with three engines than with one — an assertion, not an opinion; writes diffed and counted
  against stubs like every other binder.
- [x] **M8.3 Aerodynamic noise and the vacuum fade** — band-passed noise driven by
  `dynamicPressure` and `machSpeed`, and everything attenuated by `atmosphere.airPressure`, which
  has been in SimState since M1.1 and which M6.7 already draws with. **This is the milestone.** The
  engine falls to a floor rather than to zero — structural conduction is real, and total silence
  during a burn reads as a bug rather than as physics. Accept: the fade curve is pinned at the
  altitudes the scenarios visit and is asserted to reach its floor by 50 km; an OfflineAudioContext
  render of the re-entry golden shows the level falling as the vehicle climbs out; the floor is
  non-zero.
- [x] **M8.4 Transients** — samples, because these are events rather than states and synthesising a
  convincing one is a research project: ignition, shutdown, touchdown, crash, breakup. Fired from
  the edges `view/effects.ts` already detects, so there is one place that knows an engine just
  stopped. Licence trail committed per file. Accept: every sample precached and the full offline
  playthrough e2e still green; total audio inside the M8.1 budget with the number reported; each
  transient fires exactly once per event over the goldens (the `showedCrash` latch pattern), and
  a restart re-arms it.
- [x] **M8.5 Mix, warnings, mobile, ship** — heat and Q warning tones on the same thresholds the
  HUD turns amber at (`hud/metrics.ts`), so ear and eye agree; a mix pass; the silent switch, tab
  backgrounding and interruptions on mobile; screenshots and README. Accept: full gate on all five
  projects; audio budget reported; `git diff v2/src/core` empty over the whole milestone and the
  seven digests byte-identical to their M2.14 values. **What no test covers is whether it sounds
  good — that is a listening decision and the acceptance line says so rather than pretending
  otherwise.**

## M9 — Graphics (plan: `docs/GRAPHICS-PLAN.md`)

*Investigated 2026-08-26 on the owner's question about particles, ground and clouds. The
investigation found that the `reentry` preset does not draw the vehicle at all — it is
1734 px off the left edge of a 1280 px frame, permanently, within a quarter second of
loading — so the milestone fixes what is broken and builds a way to measure before it
touches a look. Milestone-wide rules, checked at EVERY M9 commit: `git diff v2/src/core`
is empty; the seven golden digests are unchanged; lint + test + build + playwright (all
five projects) green; one task per commit, id-prefixed. New art assets: none. Every
texture added here is generated at runtime, so the asset budget does not move.*

*Four owner decisions, 2026-08-26, all recorded in the plan: (1) the unit comments in
`core/` get fixed AND audited — comment-only, in M9.4's own commit, digests re-verified,
which is the ONE exception to the frozen-core rule above and is bounded to comments;
(2) all nine tasks run straight through in one goal; (3) the camera gives up only when
`crashed`; (4) airframe shake lands at M7.3's designed amplitude rather than dialled back
for its first outing.*

- [x] **M9.1 The pixel harness** — the reason this comes first is that two of the three bugs
  in the plan shipped through three milestones of screenshot review, and the investigation
  itself reached the wrong conclusion twice from looking at a PNG. A helper in `tests/e2e/`
  screenshots the live canvas, decodes it in-page with `createImageBitmap` into an
  `OffscreenCanvas`, and exposes three STRUCTURAL measurements — region occupancy, the extent
  of a bright region in vehicle-heights, and a colour histogram over a crop. **No golden-image
  diffing**: pixel comparison across five projects and two renderers is a maintenance tax paid
  in false failures, and the project retired visual parity at M6 for the same reason. Accept:
  the harness is used by at least one passing assertion per surface it will later police
  (vehicle framing on `landing-burn`, plume extent, cloud-deck tone spread, ground tone
  spread); tolerances wide enough to pass on all five projects, demonstrated by running them;
  the helper is documented with what it can and cannot prove.
- [x] **M9.2 One clock for the view** — `App.svelte` computes one wall `frameTime` and hands it
  both to `advance()` and to `updateCamera` / `clouds` / `distantEarth` / `effects`, but
  `advance` does not simulate `frameTime` seconds: it clamps at `MAX_FRAME_TIME`, drains whole
  `DT` steps, divides by the slow-motion factor, and has a max-steps bailout that zeroes the
  accumulator — and it returns `{steps, alpha, clamped}` precisely so the caller can know, and
  the caller discards it. The view must be driven by SIMULATED elapsed time. Second half:
  `centerizeAcceleration` returns exactly 0 beyond `viewport.physicalWidth / 2`, so the error
  freezes rather than recovering — a 2021 "do not lurch after an explosion" branch applied to a
  vehicle that is flying normally. **Owner decision: give up only when `crashed`** — the
  smallest change that keeps the original intent and makes a flying vehicle always
  recoverable; fixing the clock alone and leaving the branch verbatim was offered and
  declined, as was removing the give-up entirely. **Bug-fix tier
  discipline: the failing test lands FIRST, in the same commit as the fix.** Accept: the
  vehicle-in-frame invariant runs over all seven goldens at every sampled second and is red
  before the fix and green after, with both runs shown; M7.3's five camera properties still
  hold, plus a sixth — the vehicle returns to frame from any starting error, including one
  seeded past the give-up radius; a dropped-frame test (frames longer than `MAX_FRAME_TIME`)
  asserts the camera error stays bounded; the same at time warp, which fails the other
  direction today.
- [x] **M9.3 Q is kPa** — `getDynamicPressure` is `airDensity * trueSpeed ** 2 * 0.0005`: one
  half with a Pa→kPa conversion folded in. `SHAKE_FULL_Q = 30_000` in `view/camera.ts` is 1000×
  too large, so `q / SHAKE_FULL_Q` is 0.00095 against a 28.6 kPa RTLS peak and the aerodynamic
  half of the camera shake has never fired — the same bug class as `AERO_FULL_Q`, fixed at
  M8.3. Audit every dynamic-pressure threshold in `view/`, `audio/` and `hud/`. Retune
  `effects.ts`'s fin-vortex ramp, which reaches full intensity at 2 kPa of a 50 kPa limit and
  therefore carries no information for 96% of the flight. Accept: a range test asserts every Q
  threshold constant lies inside the interval the seven golden scenarios actually visit — a
  constant three orders of magnitude outside the observed range is a bug whatever its comment
  says, and this test catches both the fixed one and the next one; shake amplitude pinned at
  max-Q on launch and RTLS and asserted non-zero; the harness shows the frame moving at max-Q
  and still at rest on the pad. **Owner decision: the shake lands at
  `SHAKE_FRACTION = 0.006`, M7.3's designed amplitude**, rather than dialled back for its
  first outing — it has never once fired, so every ascent will feel different the moment
  this lands, and whether 0.6% of viewport height is right is a viewing decision to be made
  after seeing it. The `core/` JSDoc that caused this is M9.4's job, not this one's.
- [x] **M9.4 Units, audited in `core/`** — **the one exception to this milestone's frozen-core
  rule, granted by the owner on 2026-08-26, and bounded to COMMENTS.** `dynamicPressure` is
  documented `/** psi. */` and is kPa; that one comment is the root cause of two shipped bugs,
  found a milestone apart. One wrong unit annotation is a typo — how many others are wrong is a
  different question, and it is worth answering once rather than discovering the answer one
  shipped bug at a time. `thermalPower` is "arbitrary thermal units" compared against a limit
  M2.10 recalibrated; the 2021 tree mixed psi, kPa and Pa freely and this port inherited that
  without ever checking it. Audit EVERY unit annotation in `core/` against the arithmetic that
  actually produces the value — a unit comment is a claim, and each one gets checked rather than
  assumed. Its own commit, so a core diff is reviewable at a glance as touching nothing but
  comments; mixing it into M9.3's behavioural fix is exactly how a core diff stops being obvious.
  Accept: `git diff v2/src/core` in this commit contains comment lines and nothing else, shown;
  the seven golden digests re-verified byte-identical against their M2.14 values IN THIS COMMIT;
  every correction justified in the commit message against the expression that produces the
  value; where a unit genuinely cannot be pinned down (`thermalPower`), the comment says so
  explicitly rather than guessing.

- [x] **M9.5 The particle texture set** — `createParticleTexture` builds one 64 px radial
  gradient and all nine effects draw with it, so plume, dust, plasma, shock cone and explosion
  are the same dot in different tints. Four generated textures instead — `core` (tight hot
  centre for additive fire), `soft` (today's gradient, so everything tuned against it is
  unchanged), `smoke` (low-frequency value noise, ragged edge), `wisp` (feathered and
  elongated) — each named by the effects that use it. Accept: generated at runtime from a
  seeded hash, never shipped, so the asset budget is byte-identical and the report says so;
  the textures are deterministic across runs, pinned the way `puffRandom` is; the pooled
  allocation contract is unchanged, proved by the existing count test; the harness shows smoke
  and fire separating in a colour histogram where today they do not.
- [x] **M9.6 The Raptor plume** — a plume particle travels `(95/2.2)(1 - e^-0.704) ≈ 21.9 m`
  before it dies, on a 50 m vehicle, from a single emitter: it reads as a candle because it is
  one. Three emitters on the same nozzle point — a short near-white high-velocity core at the
  throat, the translucent expanding bell, and shock diamonds as a periodic brightness along the
  core rather than a fourth effect — all sharing M6.7's existing `plumeScaleFactor` /
  `plumeSpreadFactor` ambient curves, which already model the sea-level-to-vacuum expansion
  correctly. Diamond spacing is a pure function of ambient pressure and nozzle diameter, faded
  out as the flow goes underexpanded, and lives in `atmosphere-look.ts` beside the two curves
  already there so a test can pin it rather than an eye. Accept: plume extent measured by the
  harness in vehicle-heights, longer than the ship at full throttle at sea level and visibly
  wider and dimmer in vacuum; the spacing curve pinned at the altitudes the seven scenarios
  reach, monotonic and bounded, reaching zero before the diamonds would be physically absent;
  peak live particle count reported against M7's 576-of-4000 baseline.
- [x] **M9.7 The cloud deck, softened** — eighteen `Graphics` puffs of three overlapping
  ellipses each, all at `alpha = opacity * 0.5` and one tint, is a paper cutout and reads as
  one. Sprites on the `wisp` texture with per-puff alpha, scale and aspect jitter from the
  existing `puffRandom` hash, and the deck split into two sub-decks at slightly different
  parallax so it has thickness. **Everything M7.6 proved stays proved**: built once and
  transformed after, deterministic across runs, never drawn below M7.4's horizon at any
  altitude, the fade above `CLOUD_FADE_ALTITUDE`, both joins C1, and the parallax ratio against
  the distant earth. Accept: every existing test in `tests/view/clouds.test.ts` green
  unmodified — if one has to change, the change is the finding and it gets said out loud; the
  harness shows a wider tone spread across the deck than the single flat value today.
- [x] **M9.8 The ground and the far earth** — `GROUND_COLOR` fills one `Graphics` with a curved
  top edge and no texture at all, so at 120 m the bottom third of the frame is a single colour;
  `distant-earth.ts` has the same problem one layer out, a band with a hard top edge and a
  repeating mark pattern that reads as bumps. Both get a generated low-frequency noise fill,
  TINTED through the existing `groundTint` / `skyLightness` path rather than coloured
  independently so the palette cannot drift from the overlay's, plus a horizon-to-foreground
  value gradient — the flatness is as much a lighting problem as a texture one. More scenery
  instances at more downrange positions, from the sprites already loaded. Accept: no new art
  files, asset budget byte-identical; the harness shows tone spread across the ground band at
  three altitudes where today it shows one value; the roaming rule and the fixed StarBase
  positions are unchanged. **The pig is at x = 0 and stays there.**
- [ ] **M9.9 Perf, budget, mobile, ship** — the standard closer. Frame-path cost of the added
  emitters and textures measured against the M7 baseline and reported, not assumed; texture
  generation timed at mount and shown to be off the critical path; all five Playwright projects
  including the four phone viewports; fresh screenshots — including, for the first time, a
  re-entry with the vehicle actually in it — and the README updated. Accept: full gate on all
  five projects; first-load JS ≤ 250 kB gzip, fonts ≤ 80 kB, audio ≤ 250 kB, asset budget
  unmoved; `git diff v2/src/core` over the whole milestone contains comment lines and nothing
  else — M9.4's commit is the only one that touches core at all — and the seven digests
  byte-identical to their M2.14 values. **What no test covers is whether it LOOKS good — that is a viewing decision, and this
  acceptance line says so rather than pretending otherwise.**

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
- 2026-08-25 · M6.2 · **The top-left readout block is gone; the lower third is the HUD.** Two
  dial-and-digit gauges (SVG, 270° sweep, auto-ranged), an engine dot cluster, CH4/LOX propellant
  bars, an attitude chevron, a T+ mission clock over the upper scrim, and the long-tail numbers
  demoted to a collapsible engineering strip. `src/ui/Broadcast.svelte` + `Gauge.svelte` replace
  `Hud.svelte`, which is deleted.
  **A third binder, and it could not reuse the second.** The arcs, bars, dots and chevron are
  attributes, not text, and a gauge fraction moves every single frame — diffing a formatted string
  would have meant building a string per metric per frame purely to discover it was not needed,
  which is the per-frame allocation the budget forbids. So `$hud/metrics` reports an INTEGER
  quantum at display precision, `createMetricBinder` compares integers, and `format` runs only when
  the quantum actually moved. Counted, not assumed: a vehicle on the pad produces **0 writes over
  300 frames**, and `format` is asserted never to be called on a still frame. Still one rAF
  subscriber, still resolve-once.
  **The budget test was measuring the wrong thing.** It timed the readout binder alone, so a third
  binder on the frame path could have grown the real cost while the gate stayed green. It now times
  what `App.svelte` actually calls — all three, on a re-entry — and that is the number under 2 ms.
  Auto-ranging is a pure ladder rather than a running maximum: remembered per-frame state outside
  SimState is the shape of every 2021 bug, and a function is the only version that can be tested.
  **Three real defects, two of them found by the machine.** (1) The control panels sat in the band
  the lower third now owns; Playwright reported it exactly as a player would have hit it — "R1
  intercepts pointer events" on a click 200 px away — so the panels moved to the left/right rails
  the plan had drawn all along. (2) The first attempt minted a `metric-*` test id alongside the
  `data-metric` hook the binder already resolves on; the duplication failed immediately, because
  one limit-state metric shares its element with a readout that already had a test id, and the
  second one silently went missing. `data-metric` IS the selector now. (3) The screenshot caught
  `FS 0 KM/S` under a dial reading 21 M/S — the full-scale label rounded 200 m/s to zero kilometres,
  on the one label whose whole job is to say what the arc is a fraction of.
  Also fixed while reading the stylesheet: `prefers-reduced-motion` was declared BEFORE the default
  it overrides, identical specificity, so it was defeated on every machine and the block did
  nothing.
  **Q is relabelled kPa** — declared display fix, recorded in `docs/PARITY.md`. 2021 printed PSI and
  it was never psi; the limit is 50 and vehicles fly max-q at 30–35, and 50 psi would be 345 kPa.
  Nothing in core changed and the digests do not move; three letters did.
  Gate green (1126 unit, 60 e2e); `git diff v2/src/core` empty; the seven digests unmoved.
- 2026-08-25 · M6.3 · **The mission event timeline — the one genuinely new system in M6.**
  `src/hud/timeline.ts` derives LIFTOFF · MAX-Q · MECO · APOGEE · DEORBIT · ENTRY · FLIP ·
  LANDING BURN · TOUCHDOWN/LOSS from SimState, **observed and never scripted**: the player can
  ignore the autopilot entirely and fly into the sea, and an event that does not happen simply
  never lights.
  It is the first thing in `hud/` with memory, and the file says why: a peak (MAX-Q) needs the
  maximum so far, a sign flip (APOGEE) needs the previous sample, a crossing (ENTRY) needs to know
  which side you were on. The two alternatives are worse — SimState is frozen and would carry HUD
  bookkeeping into every golden fixture, and a module-level variable would make two flights share
  one timeline — so it is a tracker created per flight, exactly as `app/recorder.ts` already does.
  **The golden replay wrote three of the rules.** Run over the seven fixtures, the first draft
  reported `LIFTOFF@0.0` on the pad launch (a vehicle held down by an igniting autopilot shows a
  hair of positive vertical speed long before anything leaves anything — fixed by keying on the
  ground→air TRANSITION, which cannot be faked); reported MAX-Q on every 200 m landing hop (the
  last second of a freefall does have a peak; the floor moved from 1 kPa to 5, a tenth of the
  structural limit); and reported no ENTRY for the scenario named Re-entry, because that preset
  starts at exactly 80 km and the crossing test was strict.
  **A pleasing thing fell out of chasing the liftoff false positive**: `step.ts:425` only advances
  `timeSpent` off the ground and alive, so LIFTOFF fires at T+ 00:00:00 and the clock freezes at
  touchdown. The mission clock added in M6.2 is literally the broadcast T+ convention, and the 2021
  model already had it right.
  The replay is done twice, from two sources — the committed fixture bytes (un-flattened back into
  states) and the same seven flights flown live at 120 Hz — and the two are asserted **equal**, not
  merely consistent. That is a real robustness result: the fixture reading is fed one state in
  sixty and still reports the same events in the same order, which is what says no predicate
  depends on catching one particular step. A subset assertion was written first; equality holds.
  A fourth binder (`timeline-binder.ts`) draws it, and it is the only one that can REBIND — the set
  of dots depends on the loaded scenario, so Configure genuinely replaces them, and a binder holding
  the old elements would write into orphans while the new dots stayed dark forever. Rebinding
  happens at interaction time; the frame path is untouched. 4000 frames of a landing cost at most
  nine dot writes.
  Two test bugs found and fixed rather than worked around: the binder tests built a landing without
  switching the autopilot on (so it crashed and fired LOSS, correctly), and the e2e reached for a
  `launch-pad` preset the menu does not offer.
  Gate green (1161 unit, 64 e2e); `git diff v2/src/core` empty; the seven digests unmoved.
- 2026-08-25 · M6.4 · **The controls join the design, and the pillow dies.** Every panel, button,
  slider and corner control is now a flat `--panel` surface with a hairline, a 2px radius and an
  uppercase condensed label. **State is a thing that fills, not a colour of text**: each stateful
  control carries a pip that lights, because the 2021 `style.color = '#00ff00'` and the `.is-on`
  green v2 ported from it are the one thing BROADCAST-UI-PLAN principle 6 rules out by name. The
  sliders' `accent-color: #0d0` went the same way — colour in this interface means caution or alarm
  and nothing else, and `--caution`/`--alarm`/`--good` are asserted still declared so the rule reads
  as a rule rather than a ban on colour.
  `tests/ui/no-neumorphism.test.ts` grep-asserts the shadow's absence repo-wide, and it is a
  *shape* test rather than a `box-shadow` ban: the timeline's current-event dot legitimately wears
  a `0 0 0 3px` halo, so what is forbidden is the SIGNATURE — a white shadow at a non-zero offset,
  which is what fakes a light source — plus the exact literals that were in the tree. Two bugs in
  my own matcher, both caught by running it: unitless zero offsets (`0 0 0 3px`) skip a `\d+px`
  regex, so the halo was flagged as a bevel; and the greens grep hit three files for *explaining*
  in a comment why they no longer use `#0d0`, so both checks now read comment-stripped source.
  **Cinematic mode** (`cinematic-toggle`, top right, persisted per device, defaults OFF): hides the
  flight-controls layer, leaving exactly the broadcast. Hidden and `inert`, never unmounted — the
  indicator binder holds those nodes and would otherwise write into orphans, and the panel would
  come back frozen at whatever state it left in. The e2e proves the hidden controls keep tracking
  the simulation, that they cannot be focused into (an invisible but tabbable layer is a trap), that
  the choice survives a reload, and that a browser which THROWS on `localStorage` — a private
  window, or one set to block site data — still starts and still toggles.
  The corner buttons grew from 32px to the 44px touch floor while they were being restyled.
  Gate green (1166 unit, 70 e2e); `git diff v2/src/core` empty; the seven digests unmoved.
- 2026-08-25 · M6.5 · **The three full-screen views.** Menu, black box and guide were all sheets
  that covered part of the frame and left the flight showing round the edges — too big to be
  overlays, too small to be screens. Each is now a full-frame card in the same dark language.
  **The menu finally shows what a scenario IS.** `ScenarioPreset` has carried a `description` and a
  complete set of initial conditions since M1.1 and the menu displayed neither: the description was
  a `title` attribute — invisible on a touchscreen, a second's hover away everywhere else — so a
  pilot choosing between "Booster Sep" and "RTLS" was choosing between two words. Every preset now
  shows altitude, velocity and propellant, computed off the preset so the line cannot drift from
  what Configure will load.
  uPlot is themed to the tokens in `src/ui/charts.css`, imported from `loadCharts()` beside the
  library's own stylesheet — **not** from theme.css. That is the whole point: uPlot has been behind
  a dynamic import since M4.5, and hoisting its theme into the entry stylesheet would ship CSS for
  a view most players never open on every page load — the same wound, reopened one stylesheet at a
  time, and invisible to a JS-only budget. The budget report now lists first-load stylesheets and
  `tests/budget.test.ts` asserts neither uPlot's CSS nor ours is among them. First-load JS 188.1 kB.
  **Three real defects, all surfaced by making the charts legible.** (1) Every plot was labelling
  its x axis `1/1/70 12:00am` — uPlot treats the x scale as UNIX time by default and the recorder's
  time channel starts at zero. Wrong since M4.5; nobody saw it while the charts were nine small
  dark rectangles on a white sheet. (2) Charts were built 640 px wide and dropped into ~410 px grid
  columns, running off the right edge — the width came from the container, which used to be a
  narrow sheet and is now the whole window. (3) Measuring each cell as it was appended gave the
  first three the width of an almost-empty grid (1250, then 620, then 410), which is exactly what
  the top row looked like: three oversized charts overlapping. Cells are created in one pass and
  measured in a second.
  The chart series palette was repicked for the dark card — the old five were chosen against near
  white and the darkest of them was barely a line. Colour stays load-bearing here and only here:
  telling five lines apart on one axis is what colour is for.
  Gate green (1168 unit, 70 e2e); `git diff v2/src/core` empty; the seven digests unmoved.
- 2026-08-25 · M6.6 · **The phone layout, and four Playwright projects that hold it.** Three
  breakpoints: rails above 64rem, a compressed desktop between, sheets below 37.5rem. On a phone
  the dials become digit-and-tick (a second `width`-driven metric per gauge — a cleverer binder
  writing one value to two elements would have put a loop in the frame path to save one integer
  compare), the timeline rail gives way to the narration it already carried for screen readers, and
  the panels become **bottom sheets, one open at a time**, closed by default. That rule lives in
  the script, not the stylesheet: a media query cannot hold state, and "only one" is state.
  Phone LANDSCAPE is keyed on height rather than width, because a 390x664 device turned sideways
  is 664 wide and no width query can tell it from a small laptop — what actually differs is that
  there are 390 px of vertical room for a lower third.
  **The suite had to change shape with the layout.** "Assert every control is visible" stopped
  being a question the design permits an answer to, since two sheets over a 390 px screen would
  leave none of the flight. `reveal()` opens whichever sheet holds a control — a no-op on rails —
  and the spec asks the question capability parity actually asks: is every 2021 control reachable,
  in at most one tap. Four new projects (Pixel-7 and iPhone-14 class, portrait and landscape) run
  smoke, controls, testids, responsiveness and the offline playthrough. **189 tests across five
  projects.**
  **Four real defects, three of them mine.** (1) The 44 px touch floor was declared as a token
  saying "anywhere" and applied almost nowhere — every ControlButton measured 25.8 px and the top
  buttons 27.4. Found by measuring laid-out boxes, which is the only way to find it. (2) The phone
  screenshot showed the engine dots, propellant bars and attitude chevron sitting UNDER the sheet
  tab bar; no assertion would have caught it, since both are "visible" to a bounding-box check when
  they are merely on top of each other. (3) My rotation test asked a landscape Pixel to become
  portrait — `setViewportSize` does not resize a device context, so it measured the canvas still
  863 px wide and blamed the renderer. Rotation is covered better by portrait and landscape being
  separate projects. (4) Both iPhone projects failed every test at launch, and the browser log
  blamed a missing dbus socket and the root sandbox — as those logs always do. The cause was
  `defaultBrowserType: 'webkit'`: the iPhone descriptors want WebKit, this environment ships one
  browser and forbids downloading others. Pinned to chromium, with the limit written down — these
  projects are evidence about an iPhone-class viewport, not about Safari's engine.
  Gate green (1168 unit, 189 e2e); `git diff v2/src/core` empty; the seven digests unmoved.
- 2026-08-25 · M6.7 · **The world earns the overlay.** Four view-only additions, every curve in
  `src/view/atmosphere-look.ts` as a pure function so it can be pinned by a test rather than
  eyeballed — a judgement call no test can reach is one nobody dares revisit.
  **Horizon curvature** from real geometry: the tangent-line horizon distance `sqrt(2Rh + h²)`,
  keeping the h² term because at 150 km it is already 1% of the total. Under 1% of the screen at
  1 km (correctly invisible), about 9% at 100 km — roughly what an onboard camera shows at stage
  separation. The sagitta is quantised to whole pixels before the redraw check, which turns a
  `Graphics` rebuild every frame of a climb into about 2% of frames.
  **Haze** with an aerosol scale height of 1.2 km rather than the air's 8.5, which is why the
  visible band is thin. Two effects pulling opposite ways — more air to look through as you climb,
  less of it left above you — so it peaks a few kilometres up, exactly where a horizon looks
  haziest from an aeroplane.
  **Plume expansion** driven by `atmosphere.airPressure`, which has been in SimState since M1.1 and
  had never been drawn with: a tight pencil at sea level, a wide bell in vacuum. `emit` gained a
  numeric spread multiplier rather than a second emitter config, so there is one plume to keep in
  step. **Plasma trail** scaled against `heatLimit`, saturating at the same 0.8 the HEAT readout
  turns amber at — the picture and the number agree about when the vehicle is in trouble.
  **Pad lighting** takes the sky's LIGHTNESS rather than an altitude, so the two cannot drift; 2021
  darkened the sky and left the ground at noon brightness, and the world came apart at the horizon.
  **And a real bug, found by a screenshot script that would not run.** Configure did nothing, and
  the menu would not close, whenever the fields were HAND-TYPED: `bind:value` on
  `<input type="number">` returns a number (and `null` when cleared), `fieldsToPreset` called
  `.trim()`, and `onConfigure` died on `e.trim is not a function` before it could close the menu.
  Live since M4.4. It survived a hundred e2e runs because every test that pressed Configure pressed
  a PRESET first, and `fieldsFromPreset` returns real strings — the suite covered the path that
  worked and not the one the editor exists for. Fixed in `menu.ts` rather than by changing the
  input type, because a number field gets a numeric keypad on a phone and after M6.6 that is the
  point; the lie was the `string` annotation. Five unit tests pass numbers and nulls in as the DOM
  does, and an e2e types a whole flight into an empty form and flies it.
  Gate green (1199 unit, 194 e2e across five projects); `git diff v2/src/core` empty; the seven
  digests unmoved.
- 2026-08-25 · M6.8 · **The gate, and the thing it caught.** Binder benchmark re-run over all FOUR
  binders in the order `App.svelte` actually calls them (it had been timing the readout binder
  alone, which would have kept saying green while the real per-frame cost grew); budget report in
  the commit — 189.0 kB first-load JS of 250, 32.7 kB fonts of 80, uPlot and its theme still lazy;
  `prefers-reduced-motion` now stops every animation and transition rather than only the blink,
  at `0.01ms` so `transitionend` still fires; focus-visible asserted by tabbing and reading the
  computed outline; two screenshots captured and carried in the README.
  **The contrast work found real failures, twice, and the second time is the interesting one.**
  `tests/ui/contrast.test.ts` parses the scrim stops and the ink ramp out of `theme.css`, composites
  over the noon sky (`#a7bdd9`, the brightest thing that can ever sit behind the overlay) and runs
  WCAG 2.1. The first scrim faded to 45% alpha at three quarters height, which put **ink-70 at
  3.65:1 and ink-45 at 2.44:1** — both below AA, and exactly the risk BROADCAST-UI-PLAN § 8 wrote
  down before any of it was built. Solving for it: ink-70 needs 0.556 alpha behind it, ink-45 needs
  0.591. The stops now hold 0.66 to the top of the text band.
  Then the four phone projects failed the same check the desktop passed: a compressed lower third
  puts text at **81–85%** of the scrim's height where the desktop keeps it under 75%. Fixed with a
  `--scrim-phone` that holds its depth further up — and then the two LANDSCAPE projects failed
  again, because a landscape phone is over 600 px wide and had been treated as a desktop. The band
  is a property of the COMPRESSION, not the width. Both compressed layouts share the token now, and
  the e2e asks `isCompactLayout` rather than `isPhoneLayout`. Four projects found what one could
  not, twice over.
  The two halves are deliberately separate and neither means much alone: the unit test certifies
  the STYLESHEET up to a band top, the e2e measures where the text actually IS and asserts it stays
  inside that band. The unit test also asserts it FAILS above the band — a contrast test that passes
  everywhere is measuring nothing.
  Gate green (1211 unit, 216 e2e across five projects); **`git diff 33b8a92 -- v2/src/core` empty
  across the entire milestone** and the seven digests byte-identical to their M2.14 values.
- 2026-08-25 · plan · **M7 Depth and Speed planned**, after the owner asked how the graphics could
  be improved — a minimap, a clearer sense of speed, more immersion. The answer turned out to be
  measurable rather than a matter of taste, and the measurements are worse than the question
  implied. `computeViewport()` takes the window size, the vehicle height and the manual zoom and
  **does not take altitude**: the viewport is 356 x 200 m at every altitude, so the horizon runs off
  the bottom of a 720 px screen once altitude passes **100 metres**. Every scenario the game ships
  except the final seconds of a landing is flown against a blank gradient. (The README screenshot is
  taken at 85 m for exactly that reason.) Where there IS ground, at 7300 m/s it crosses a 1280 px
  screen in **49 ms** — under three frames at 60 fps — and the camera matches the vehicle's velocity
  so the ship itself drifts 2–222 px over a whole recorded flight. Two parallax layers exist, 1x and
  0.001x, and the stars move 25 px/s at re-entry speed. The screen at 7 km/s and 75 km is the same
  experience as sitting still at 75 km.
  The obvious fix does not work: seeing the ground from 75 km needs 0.0096 px/m, at which the
  vehicle is half a pixel tall. One camera cannot show a 50 m vehicle and a 75 km altitude, which is
  why broadcasts cut to a map and simulators have instruments. So: a **trajectory map** (a profile,
  not a top-down — this world has no lateral axis), carrying the conic predictor M2.9 built for the
  deorbit autopilot and never showed anyone; a **compressed-perspective distant earth** visible from
  200 m to 200 km; **screen-space velocity streaks** and a flight-path marker, with 86% of the
  particle pool free (peak 576 of 4000). Seven tasks M7.1–M7.7, with M7.5 (camera) explicitly
  blocked on an owner decision because `camera.ts` calls the ported 2021 control law worth
  preserving exactly. The milestone states one new rule: **compression is allowed in the depiction
  and never in the numbers** — the map is an instrument and an instrument that lies is a bug.
- 2026-08-25 · decisions · **Two owner decisions on the M7 plan.** (1) **The camera control law may
  be retuned** — the "ported verbatim, worth preserving exactly" constraint on `view/camera.ts` is
  lifted and M7.5 is unblocked. The conservative option was on the table (an additive offset leaving
  the law bit-identical) and the wider one was taken, so the plan records what that costs: the
  bit-identical guarantee is gone and is replaced by five properties rather than dropped — vehicle
  stays framed over all seven goldens, damped not springy, frame-rate independent, deterministic,
  never below the ground. What it buys is altitude-linked FOV, the largest single lever on the
  356 m viewport, which is what makes M7.3's distant earth worth drawing at all. One hard
  constraint: **the FOV curve is flat at 1× below 500 m**, so the intro — named in CLAUDE.md's soul
  — and every landing are untouched by construction rather than by careful tuning.
  (2) **Sound is planned as M8**, built after M7: `docs/SOUND-PLAN.md`, five tasks. The design
  decision the milestone turns on is synthesis over samples for everything continuous — engine
  rumble, aero noise and RCS are all filtered noise with a parameter that moves, which makes them
  pure functions of SimState like every readout in `hud/`, costs no bytes, and can be pinned by a
  test. Samples only for transients. It also brings a seventh wall (`core/` may not import
  `audio/`) and a new budget line. The payoff named in the plan is not the noise but the contrast:
  the fade to near-silence as the air runs out, which is impossible to convey to someone who has
  had silence the whole time.
- 2026-08-25 · decisions · **Three more on M7, before it starts.** (1) **Altitude FOV: the moderate
  range, ~5x** — the drawn vehicle goes 180 px to about 36, the viewport 200 m to about 1 km, so
  the world gets room while the ship stays the subject. Worth recording that even the aggressive
  option would not have reached the ground from 75 km; that is geometry, not tuning, and it is why
  the map exists. What ~5x buys is the 500 m to 20 km band, which is most of an ascent.
  (2) **The trajectory map is always-on and collapsible**, remembered per device, starting collapsed
  on a phone — because the moment it matters most is the moment you are least able to go and open
  something. (3) **The camera moves to M7.3**, ahead of the distant earth and the cloud deck. That
  came out of writing the plan rather than out of the plan: those two layers are drawn INTO the
  frame the camera defines, so the original ordering would have built them against today's 356 m
  viewport and then re-tuned them after the FOV moved. The map stays first — it is independent of
  the camera, and it is the answer to the question that started this.
- 2026-08-25 · M7.1 · **The trajectory map.** A profile — altitude against downrange, seen from the
  side — in the lower third, auto-ranging from a 200 m hop to a 2000 km re-entry on the same
  instrument. `hud/trajectory.ts` is the maths (extent, projection, decimation, unit switch) and
  `hud/trajectory-draw.ts` the drawing, split so the draw takes a MINIMAL CONTEXT INTERFACE rather
  than a real `CanvasRenderingContext2D` — which is what makes "replayed over all seven goldens
  without a NaN or an off-canvas coordinate" an assertion instead of a hope. It is: all seven flown
  step by step through the real draw against a recording stub, every coordinate finite, worst
  overshoot **0.000 px** in both axes.
  Four decisions worth their comments. (1) **The two axes have different scales**, deliberately: a
  re-entry at true aspect is a 25:1 sliver with nothing readable in it. It stays honest the way
  every trajectory plot does — the axes carry their real extents as labels, and nothing on the map
  is compressed, only stretched (plan § 5 is about the depiction of the WORLD; an instrument gets
  neither). (2) **`niceSpan` snaps every extent to 1, 2 or 5 times a power of ten**, so the map
  re-ranges a couple of dozen times over a flight rather than ten thousand — a picture that tracked
  its content continuously would slide on every frame and be unreadable. The e2e asserts the
  grammar, not just that it moved. (3) **The velocity vector is drawn in MAP space**, because with
  two axis scales a world-space arrow points somewhere the trail does not go, which is worse than
  useless on an instrument; and its length is clamped so the tip cannot leave the canvas, which is
  what makes the bounds claim exact rather than a tolerance. (4) **The trail IS the black box's**:
  the recorder was already sampling downrange and altitude, its arrays survive `clear()`, so a
  restart empties the map for free and there is no second history to keep in step.
  Throttled to 10 Hz from the one rAF tick — a map does not need 120 — and a collapsed map costs a
  single property read, which the e2e proves by watching its reported position freeze. A canvas is
  opaque to a test, so the renderer writes `data-marker` and `data-span` onto the panel, diffed like
  every other attribute in `hud/`; that is what lets a spec say "the marker moved" without a
  screenshot comparison that would go red for a colour change. Core untouched, seven digests
  unchanged.
- 2026-08-25 · M7.2 · **The predicted path.** M2.13 built a real conic predictor so the deorbit
  autopilot could decide when to fire; M2.9 exported the free-fall one beside it. Between them the
  simulation has always known where a coast ends, and in five years no player has seen it. Now the
  map draws it: a dashed run from the vehicle to an open cross, the miss distance in words —
  `4.2 KM LONG`, because a minus sign on a landing instrument is ambiguous — and a printed reason
  when there is no answer.
  **Two regimes, because no single model spans the range.** Above the entry interface the air is six
  orders below gravity and the conic is exact, so the prediction is made TO the interface — claiming
  a touchdown through 80 km of atmosphere the model does not contain would be a made-up number
  wearing a decimal point. Below it, the terminal-velocity fall model answers instead.
  **The measurement that changed the design.** The obvious reading of the 2021 formula is
  `downRange + speedX * time`. Dropped unpowered from 40 km at 300 m/s that predicted 157 km of
  drift where the simulation produced 9.7 km — **147.6 km of error**. Not tuning: quadratic drag has
  a time constant `mass / (k v)`, four seconds for this vehicle at 200 m/s, and assuming the speed
  survives a two-hundred-second fall assumes away the atmosphere. Replaced with the exact solution
  of the same drag law core already integrates — `v0 tau ln(1 + t/tau)`, derived in `hud/`, core
  untouched — the same drop errs by **6.5 km**. Across unpowered drops from 0.5 to 40 km the worst
  error went from 105.6 km to 4.1 km. The logarithm is what makes it robust rather than merely
  better tuned: the fall TIME it is handed is itself several times long from altitude, and a log
  turns a factor-of-five error in time into under a factor of two in distance.
  **Over the goldens that land**, predicted against actual touchdown: intro-demo and landing-burn
  0 m at 26 m up (0.00 km at 200 m up); before-flip 2 m at 28 m up (0.10 km at 1 km up). Powered
  flights do not go where an unpowered prediction says — that is the instrument working — so what is
  asserted is the shape: the error shrinks as the ground approaches.
  **And it says when it cannot answer.** A circular orbit prints `NO SOLUTION — ORBIT` rather than a
  number; a flight that is over says so; the fall model's overflow above ~280 km is caught rather
  than printed. Text rather than a blank corner, because a blank corner is indistinguishable from a
  broken instrument. Three findings on the way: the pad sits at altitude 25 m, not 0 — `altitude` is
  the centre of mass — so both the ground guard and the fall model's target are `vehicleHeight / 2`;
  the predicted cross hung 2.7 px off the bottom edge until its arms were clipped; and "the trail
  grows" stopped being answerable by counting lit pixels once the prediction put ink on the same
  canvas, so the renderer reports the points it strokes.
- 2026-08-25 · M7.3 · **Camera: the follow law retuned.** `view/camera.ts` had said the 2021
  second-order follow was "worth preserving exactly, so the control law is ported verbatim". The
  owner lifted that on 2026-08-25 and this is what it bought: **altitude-linked field of view**,
  flat at 1× below 500 m and opening smoothly to the moderate 5× by 20 km — 200 m of viewport
  becomes 1 km, the drawn ship 180 px becomes ~40. Flat below 500 m is the hard constraint and it is
  structural, not tuned: the intro auto-landing and every landing happen in that band, so they are
  untouched **by construction** — there is no tuning to get wrong. Smoothstep over a log
  interpolation, so neither end has a seam a player would notice without being able to say what
  happened. Manual zoom multiplies rather than fights it: the zoom limits are measured against what
  manual zoom alone would show, or the button would quietly stop working at altitude.
  Plus a framing lead (`speed × 0.6 s`, capped at 18% of the half-span — a distance the vehicle
  covers, so it means the same at 30 m/s and 3 km/s) fed into the follow TARGET rather than added to
  the output, so it inherits the damping and the frame-rate proof for free; and shake from dynamic
  pressure and thrust, applied at the lens in `worldToScreen` rather than to the camera's position,
  built from sines of an accumulated time so it stays deterministic, and silent under
  `prefers-reduced-motion`.
  **The five properties that replaced the bit-identical guarantee**, all measured: (1) framed over
  all seven goldens — worst horizontal offset 39% of a half-frame at 7.3 km/s re-entry; vertical
  reaches exactly 1.0 at the ground-mode handoff, which is structural (ground mode engages at
  `altitude <= physicalHeight`, so the ship enters at the top edge by definition) and is 2021's
  framing in the band the soul protects. (2) Damped: 9.7 m of overshoot on a 60 m step — 16% — and
  settled to 1% in 8.7 s. (3) Frame-rate independent: 1.71 m at 30 fps, 0.86 at 120, 1.00 at 144,
  all against 60 fps over ten seconds and a 320 m viewport — 0.5% of a screen. (4) Deterministic,
  shake included, asserted at exact equality. (5) Never below the ground, now swept across the whole
  FOV range rather than at one fixed viewport.
  Three things learned by measuring. A trapezoidal position step was tried and abandoned — it moved
  the drift by 0.001 m, because the error that matters is in the velocity integration. The old
  frame-rate test drove a *stationary* target that claimed 100 m/s, which sat on the capture-radius
  cliff where the law deliberately gives up; the lead pushed it over and one rate flew away by
  2.8 km. And the first framing test started the camera at rest, failing re-entry by 879% — from
  rest it needs a second to reach 7 km/s, by which time it is seven kilometres behind and out where
  `centerizeAcceleration` has given up. The real camera is handed the vehicle's velocity at birth.
  The per-frame viewport is now written in place (`writeViewport`) rather than allocated, and
  App.svelte's camera target became a single reused object — it had been an object literal inside
  the tick, allocating sixty times a second against a budget that says zero.
- 2026-08-25 · M7.4 · **The distant earth.** A compressed-perspective ground layer in the `far`
  container, so the world stops vanishing at a hundred metres. Two curves in `view/distant-earth.ts`,
  both of which say in their own comments that they are compressions — the plan's honesty rule kept
  in the code rather than described in a document nobody opens beside it.
  `groundLineFraction` follows the TRUE projection exactly to 0.55 of the screen and then bends,
  approaching 0.58 and never reaching it; `compressedScrollSpeed` is the identity below 420 px/s and
  logarithmic above, taking re-entry's 26,280 px/s down to about 620 — a factor of forty-two, and
  the largest single cheat in the project. Both joins are C1 **by construction** rather than by
  tuning: the derivative of `A(1 − e^(−x/A))` and of `K ln(1 + x/K)` is exactly 1 at zero, so
  neither the position nor the rate has a seam. Slow flight scrolls at exactly true scale, which
  means a landing is not a cheat at all.
  **The screenshot found two bugs no unit test would have.** The first version put the horizon at
  0.88 of the screen — physically defensible and completely useless, because the broadcast scrim
  owns the bottom third: the layer was drawn, correct, and invisible behind the telemetry. A depth
  cue nobody can see is not a depth cue, so the number is set by the overlay rather than by the
  geometry. The second was pre-existing and worse: `Configure` replaced the simulation but left the
  camera where the last flight ended, and `centerizeAcceleration` gives up beyond half a viewport —
  so a flight configured at 20 km was permanently off screen with no way to recover. The camera is
  now seeded on every Configure exactly as `createCamera` seeds it, velocity included.
  Curves unit-tested at the altitudes and speeds all seven scenarios actually visit — monotonic,
  continuous, peak scroll under 700 px/s on every flight — plus a test that the M7.3 field of view
  opening underneath the ratio cannot combine with it into a step (worst 0.005 per metre of climb,
  which is exactly the true-projection rate). Screenshots at 1 km, 20 km and 100 km committed and in
  the README. Pooled marks, nothing allocated per frame.
- 2026-08-25 · M7.5 · **Velocity streaks and the flight-path marker.** Two screen-space cues in
  `view/motion-cues.ts`, and the file exists partly to hold the honesty rule's sharpest edge: the
  streak curve is SCENERY and is a compression, the marker is an INSTRUMENT and is `angleOfMotion`
  verbatim. Same file, opposite obligations, both asserted.
  The streaks reuse the existing particle pool rather than adding a second one — `EmitterConfig`
  gained an optional `stretch`, which is what makes a streak a streak rather than a dot (a dot at
  3 km/s and a dot at 30 look identical on a screen with no motion blur). Emitted from a point
  ahead of the vehicle and swept backwards, so it reads as the frame moving rather than as the ship
  shedding something. Density saturates at 2 km/s: there is no visual difference a viewer can
  extract between "very fast" and "twice as fast".
  **A measurement killed a feature.** The first version multiplied the density by an ambient-pressure
  term — reasonable-sounding, since a vacuum has nothing to streak past. Over the goldens it did
  this: `reentry-autoland: peak 7300 m/s → streak 0.19`. That is the milestone defeating itself.
  Re-entry has no world visible, no scenery to move and the highest speed in the game — the single
  case these cues exist for — and pressure-thinning switched them off there and nowhere else. Plan
  § 3.3 is explicit that screen-space cues earn their place because "none of which depend on there
  being anything in the world to look at". Removed; re-entry is 1.00 now. They are speed lines, not
  dust.
  Measured across the seven: re-entry 1.00, booster-sep 0.88, launch and RTLS 0.12, and the three
  landing scenarios **100% silent for the whole flight** — which is the threshold doing exactly its
  job, since a gentle touchdown must not happen in a snowstorm.
  The marker is the standard HUD velocity vector: a ring and three stubs, drawn in `effectsFront`
  so the plume cannot cover it, fixed in screen size so the M7.3 field of view cannot shrink it away.
  Its angle is asserted against `angleOfMotion` sample by sample at exact equality over all seven
  goldens. The gap between it and the nose IS the angle of attack, drawn for the first time: up to
  96° on a re-entry, 135° on a boostback.
  Pool headroom re-measured through the real effect driver over all seven flights: **peak 653 of
  4000, 84% free**, worst at re-entry, against the 576 baseline — the streaks cost 77 particles.
- 2026-08-25 · M7.6 · **The cloud deck.** The missing middle distance. Parallax in this game jumped
  from 1× (the ground, true scale) straight to 0.001× (the stars) with nothing between, which is
  § 1.4's explanation for why even a well-flown ascent read as flat. M7.4 put a layer at the far end;
  this is the near one, and **depth is the relationship between layers rather than any one of them** —
  two is the minimum number that can have one. The parallax factor (2.5× the distant earth's
  compressed rate) is doing the work that the fill colour and the puff shapes are not, so it is
  asserted as a RATIO rather than as two numbers: retuning either compression cannot quietly collapse
  the two layers onto each other.
  The position curve is a compression in both directions and by different amounts, and the asymmetry
  is the honest choice rather than a shortcut. Upward it may travel 0.46 of a frame — the deck is
  2.5 km up, which on the pad is twelve viewport heights above the camera, and a true projection
  would put it off the top forever; standing on the ground you DO see cloud near the top of your
  view, so the compression is arguably closer to the truth than the projection, because this world is
  flat and the real sky is a dome. Downward only 0.04, because from above a deck belongs ON the
  horizon. Both bends are C1 by the same construction the rest of M7 uses, so **flying through the
  deck — the moment the layer exists to sell — happens at exactly true scale with no compression at
  all**.
  Deterministic by a local counter-based hash rather than `Math.random`, which `view/` is permitted:
  a deck that reshuffled every reload would make the committed screenshots irreproducible and would
  mean two players comparing notes were not looking at the same sky. Two decks built independently
  are asserted identical.
  The ordering test is the one worth having: cloud is checked against **M7.4's own curve** at every
  altitude rather than against a number copied out of it, so moving the horizon later cannot silently
  put the sky underneath it. Thins to nothing by 30 km — above the troposphere there is no weather,
  and by then M7.4 is already drawing the earth.
- 2026-08-25 · M7.7 · **Depth and Speed ships.** The gate, with the numbers rather than the word
  "green": lint, 1347 unit tests and build all exit 0; **playwright 266 passed across all five
  projects** (chromium 94, pixel-portrait 45, pixel-landscape 41, iphone-portrait 45,
  iphone-landscape 41); first-load JS **193.9 kB of 250**, fonts 32.7 kB of 80, service worker
  precaching 35 assets; `git diff v2/src/core` against the M7 start commit prints nothing and all
  seven golden digests are byte-identical to their M2.14 values.
  **The binder benchmark now includes the map**, which is the point of it: that test measures the
  whole frame rather than one binder precisely because a per-binder benchmark keeps saying green
  while the real cost grows, and M7.1 added a canvas repaint to the same tick. Leaving it out would
  have reintroduced the blind spot one milestone after it was closed. Measured **0.0076 ms of a 2 ms
  budget**, with the map redrawing 577 times over a 1500-point trail. Zero-allocation coverage
  extended to both new callers — the map's redraw, and the streaks, which are the first effect to
  touch `sprite.rotation` and so the first that could hand a stale angle to a recycled particle.
  Particle pool: **peak 653 of 4000, 84% free**, against the 576 baseline.
  Screenshots refreshed at 1 km, 20 km and 100 km plus desktop and phone, and the README updated —
  including its results table, which had been claiming 189 kB and 194 e2e tests.
  **The milestone in one line:** the viewport was 356 × 200 m at every altitude and is now 200 m to
  1 km; the parallax was 1× and 0.001× with nothing between and is now three layers; the ground left
  the screen at 100 m and now never does; and the two predictors core has carried since M2.9 are
  finally on screen. Compression is allowed in the depiction and never in the numbers — every value
  on the trajectory map is read from SimState or computed by core at true scale, and `core/` did not
  change by one byte.
- 2026-08-26 · M8.1 · **The audio layer.** `src/audio/` — the graph, the mixer, the unlock, the
  mute. Plumbing only; nothing makes a sound yet, which is the right shape for the task that has to
  get the boundaries right.
  **A seventh wall, and the first with no 2021 wound behind it** — the old build was silent.
  `core/` may not import from `audio/`, its own rule group rather than four more patterns in wall 1's
  so a violation says which wall it broke and why. Fixture-tested both ways, like the other six: it
  fires inside `core/` on both the alias and the relative form, and it stays quiet in `ui/` and
  `app/`, which legitimately need the engine to wire a toggle and drive a tick. A wall that fired
  everywhere would be unusable and would get switched off, which is how walls actually die.
  **The autoplay policy is honoured rather than worked around.** Nothing is constructed until the
  first gesture — asserted in the browser by patching the constructor before the app loads, because
  a context that is never built cannot be caught by inspecting one. The intro demo therefore plays
  silently, and § 3.4 argues that is correct: sound arriving as you take control is a better moment
  than sound that fights the policy and loses. A gesture while muted starts nothing, because muted
  means muted.
  **Muting SUSPENDS the context** rather than zeroing a gain, so a muted simulator does no audio work
  at all — proven in the browser by reading the context's own `state` through
  running → suspended → running, and in the unit suite by asserting the master gain is untouched.
  The remembered choice uses the same guarded `localStorage` read M6.4 uses, tested against a storage
  that throws on every access.
  The graph is built ONCE: unlocking fifty times creates no second context, which is the audio
  version of the M3.7 leak test. New budget line — audio ≤ 250 kB, currently 0.0 kB, because § 3.1
  chose synthesis over sample loops and only the M8.4 transients will be files. First-load JS
  193.9 → **194.6 kB**: 0.7 kB for the whole layer, no library, no assets.
- 2026-08-26 · M8.2 · **Engine rumble, synthesised.** Filtered noise plus a sub-oscillator: the
  noise is the plume, the oscillator is the vehicle it is bolted to, and both are needed — noise
  alone is a hiss and a tone alone is a hum. Zero bytes on the wire, and the audio budget still
  reads 0.0 kB.
  **Engine count and throttle enter separately**, because § 1's whole argument is that three Raptors
  at 40% and two at 100% produce nearly the same thrust number and sound nothing alike; a single
  thrust-derived level would collapse exactly the distinction the sound exists to make. Count enters
  as a square root — three equal sources are 4.8 dB above one, not three times as loud — and
  throttle with a floor at 0.55, because a Raptor at idle is still an enormous noise and a curve
  going to zero would make a throttle-down sound like a shutdown.
  **THE RENDER TEST FOUND A REAL BUG.** `node-web-audio-api` gives Node a genuine
  `OfflineAudioContext`, so § 6's "an assertion about a buffer's RMS rather than an opinion" is
  literally that. The vacuum fade measured **0.106** of sea level against a documented floor of
  0.22 — because the sub-oscillator's gain was set to `level * 0.33` and then fed a gain that
  applies `level` again, so the sub faded as the SQUARE while the noise faded linearly. Nobody would
  have heard that as a bug; a throttle-down would simply have lost its bottom end faster than
  intended, which sounds like a choice. The arithmetic gave it away. Fixed, and the ratio is now
  0.2200 — asserted to three places, because a loose bound is what let it through the first time.
  Measured: three engines 40% → 100% RMS 0.091 → 0.131; one → three engines 0.075 → 0.131; three at
  40% (0.091) distinguishable from two at 100% (0.107).
  Two test premises were wrong and both were worth recording: every preset starts with all three
  Raptors **off**, so the autopilot has to fly them alight (landing-burn under autoLand lights the
  first at step 38); and the fake context's AudioParams had no `setTargetAtTime`, which is a stub
  gap rather than a product bug — the same code renders correctly under the real context, which is
  why both kinds of test exist.
- 2026-08-26 · M8.3 · **Aerodynamic noise and the vacuum fade. The milestone.** Band-passed noise
  from `dynamicPressure`, brightening with `machSpeed`, and both voices attenuated by
  `atmosphere.airPressure` — the field that has been in SimState since M1.1 and that M6.7 already
  draws with, so ear and eye read the same number.
  **What makes it a contrast rather than a fade-out** is that the two voices do different things.
  The airflow goes to nothing, because there is no mechanism by which a vacuum roars. The engine
  goes to a FLOOR, because structural conduction is real and you are bolted to the thing, and
  because total silence during a burn reads as a bug rather than as physics. Measured on the
  boostback golden above 50 km: **aero 2.21e-3 — about −47 dB, inaudible — while engine air holds
  at 0.249.** A vacuum where everything is quieter sounds like the volume being turned down; a
  vacuum where the air stops and the vehicle does not sounds like space.
  **A unit bug, found by pinning the curves against real flights.** `SEA_LEVEL_PA` was written as
  101 325 on the reasonable assumption that a pressure field is in pascals, and every test passed
  because both sides of every comparison used the same wrong number. The tell was a launch that
  flew through max-Q at an airflow level of **0.002** — silence. `atmosphere.airPressure` peaks at
  101.0 on the pad and `forces.dynamicPressure` at 23.6 on a launch: kPa, as
  `view/atmosphere-look.ts` has had right since M6.7. The layer had been computing an air fraction
  of 0.1 at sea level and calling it full. Fixed; the same launch now peaks at **0.653** at 5.4 km.
  Two tests were needed and neither is redundant: one says the sound goes away where it should, and
  a fade that was always zero would have passed it happily; the other says there was a sound to go
  away. Aero silence is asserted as INAUDIBLE (< 0.01) rather than exactly zero — the cube root
  exists so the fade does not switch off a few kilometres up, and demanding arrival at zero would
  mean undoing the thing the curve is shaped for.
- 2026-08-26 · M8.4 · **Transients — synthesised, and that is a declared departure from the plan.**
  § 3.1 chose SAMPLES for ignition, shutdown, touchdown, crash and breakup, with a licence trail per
  file. They are synthesised instead, and the reason is not that the plan was wrong: shipping
  third-party audio into this repository is a decision whose licence trail the owner has to be able
  to audit, and choosing those files unilaterally from a library whose terms cannot be verified from
  here would satisfy the plan in form and not in substance. **An unverifiable licence trail is worse
  than no samples.** § 7 already names this seam in the other direction — the layer is behind one
  interface, so a sampled sound can replace a synthesised one without touching anything else — and
  that works both ways. **This is the one point in M8 where the owner may reasonably want to
  substitute real recordings, and doing so is a change to `audio/transients.ts` and nothing else.**
  Audio budget stays at 0.0 kB; nothing joins the precache; the offline story is unchanged.
  **The latch is the claim worth testing**, and it is `showedCrash` from `view/effects.ts`
  generalised: fire on the TRANSITION into a state, never while it holds. A crash that fired every
  frame would be sixty explosions a second — obvious in a room and invisible in a diff. Measured
  over the goldens: intro, landing-burn and before-flip each fire **3 ignitions, 3 shutdowns, 1
  touchdown**; RTLS 6 and 6 across two burns; re-entry nothing at all.
  Three decisions inside it. The first frame after a reset SEEDS rather than fires, or a scenario
  configured mid-burn would bark three ignitions for a transition that happened before the flight
  existed. A restart re-arms, because the same flight flown again is a new flight. And an engine
  that FAILS is not a shutdown — one is the pilot's choice and the other is the vehicle's, and M8.5
  is where a failure gets its own voice.
  The detector lives in `audio/` rather than reusing `view/effects.ts`, which the task named. The
  duplication is four booleans and a latch; the coupling would have been permanent, and would have
  made sound depend on the renderer.
  Also fixed: a pre-existing e2e flake this run surfaced. `intro.spec.ts` measured the canvas
  immediately after `load`, on the reasoning that it is sized at creation — which races the
  STYLESHEET under a loaded machine. An unsized canvas is 300×150 by specification, and that is
  what it caught once in a full five-project run, reading as a renderer falling over when it was
  the test arriving early.
- 2026-08-26 · M8.5 · **Mix, warnings, mobile — Sound ships.** The warning tone calls
  `limitState` from `hud/metrics.ts` rather than reimplementing it, which is the whole design:
  "the same thresholds the HUD turns amber at" is only true FOREVER if it is the same code. Two
  copies of 0.8 would drift the first time either was tuned, and the failure mode is an ear and an
  eye disagreeing about whether the vehicle is in trouble — worse than either signal alone. Caution
  and alarm are different sounds rather than one louder, and the alarm pulses twice as fast, which
  is the one piece of cockpit convention worth borrowing wholesale.
  **All seven goldens come out nominal, and the margins are why that is a result rather than a
  vacuum**: re-entry reaches 0.63 of the heat limit and RTLS 0.57 of the Q limit, so these flights
  get genuinely warm and genuinely fast and still stay the right side of 0.8. A second test drives a
  flight past the threshold through the whole pipeline — the M8.3 lesson, again: a signal that is
  always silent passes "stays quiet" trivially, so something has to prove there is a signal.
  **Mobile lifecycle**: a backgrounded tab suspends and coming back resumes, but never overrides a
  mute — the two switches are independent and the remembered preference wins, so returning to a tab
  cannot undo something the player chose. Unmuting into a hidden tab starts nothing. That also
  handles interruptions, because an interrupted context comes back suspended and would otherwise
  never resume.
  **Final gate:** lint, 1432 unit tests and build all exit 0; **playwright 286 passed across all
  five projects**; first-load JS **196.3 kB of 250**, fonts 32.7 of 80, **audio 0.0 kB of 250**;
  35 assets precached; `git diff v2/src/core` against the M7 start commit prints nothing and all
  seven golden digests are byte-identical to their M2.14 values. Screenshots and README refreshed.
  **What no test covers is whether it sounds good.** § 6 said so before a line was written and the
  acceptance line says so now: that is a listening decision, and it is the one thing this milestone
  hands back rather than settles.
- 2026-08-26 · M9.1 · The pixel harness, in `v2/tests/e2e/pixels.ts`, and four assertions using it
  in `pixels.spec.ts` — one per surface M9 will change. **No production code changed**: the harness
  reconstructs the drawn scale by calling `computeViewport` — the same function the renderer sizes
  itself with — from the canvas box and the altitude readout, so nothing had to be published from
  the page and the frame path is untouched. Screenshot → data URL → `createImageBitmap` +
  `OffscreenCanvas` + `getImageData`, decoded in the page that drew it, because this environment has
  no PNG decoder and adding one to read four numbers would be a poor trade. Measures region
  occupancy, luma spread and tone buckets, a warm/grey colour split, and the bounding box of a bright
  region in ship-lengths. **No golden-image diffing anywhere** — M6 retired visual parity and pixel
  equality across five projects and two rasterisers would be a tax paid in false failures.
  **Two findings from building it, both of which are the harness working before a single task has
  used it.** (a) Playwright's element screenshot crops the composited PAGE, so a shot of the world
  canvas contains the HUD sitting on top of it: the first run reported the bottom fifth of every
  frame as near-black at mean luma 23 and it was measuring the broadcast scrim, so `readFrame` now
  hides every non-ancestor sibling with `visibility:hidden` before the shutter. (b) The altitude
  readout switches unit at a kilometre, so reading only the value node put the vehicle at 79.9 m
  during a re-entry from 79.9 km. Both are exactly the class of quiet factor-of-1000 this milestone
  exists to close. **Baselines recorded, in the units the later tasks will move**: the plume spans
  **0.26 ship-lengths** at sea-level full throttle on desktop and 0.41 on a Pixel 7 (M9.6 raises
  this past 1); the ground band at 6 km is **one colour** — luma spread 0.47, a single tone bucket,
  one 4-bit histogram bin holding 100% of the pixels (M9.8); the cloud deck's spread is 41.8 desktop
  / 21.9 phone (M9.7). Tolerances are wide on purpose and the file says why: the drawn vehicle is
  180 px on desktop and 420 on a phone, so a bound tight enough to be interesting on one is a false
  failure on another — what makes them worth having is that each is a number a task can raise.
  A `describeFrame` helper prints the region table and a max-pooled ASCII luminance map into every
  assertion message, because `expected 0.26 to be greater than 1` cannot distinguish "the plume is
  short" from "the ship is not in the frame". The first arrangement of the plume test WAS a race —
  the vehicle free-fell to the ground while the taps happened, and only the slowest phone project
  noticed — so it now waits for the throttle readout rather than for a number of milliseconds.
  **Gate:** lint, 1432 unit tests, build all exit 0; playwright **20/20 of the new spec green across
  all five projects**; `git diff v2/src/core` empty; first-load JS unchanged at 196.3 kB.
- 2026-08-26 · M9.2 · **Bug-fix tier. The failing test landed first and both halves are kept.**
  `App.svelte` measured one wall `frameTime` per rAF and gave the same number to `advance()`, which
  BUDGETS it, and to the camera, clouds, distant earth, effects and post pass, which treat it as
  world time that has PASSED. `advance` already returned everything needed to tell them apart and
  the caller discarded it. `AdvanceResult` now carries `simulatedDt`, and every view consumer is
  driven by it.
  **But the clock alone was not the fix, and finding that out is the substance of this task.** The
  camera is a second-order follow: where it ends up depends on the PATH its target took, not only
  where the target finished. Advanced once per frame it sees the vehicle teleport — 1.1 km at a time
  during a 9x re-entry, two thirds of a frame width — so it lags by an amount that still depends on
  the frame rate. **The camera is now advanced from `AdvanceOptions.onStep`, once per simulation
  step, always at exactly `DT`**, beside the flight recorder and for the same reason the recorder is
  there. Worst offset of the vehicle from frame centre, over all seven goldens:

  | | 60 fps | 400 ms stall every 2 s | 9x warp |
  |---|---|---|---|
  | wall clock (before) | 35% | **9693% — off screen** | **121126% — off screen**, four of seven lost |
  | simulated, per frame | 35% | 62% | **485% — off screen** |
  | simulated, per step (shipped) | 30% | 30% | 30% |

  Identical in every configuration, to the metre — so M7.3's property 3 stops being a 1.71 m
  tolerance and becomes an **exact equality**, asserted as one over all seven goldens across steady
  frames, stalls, 9x warp and 1/9 slow motion. **The three broken clocks are kept as tests** that
  assert they still lose the vehicle: without them the green half could pass because a scenario got
  easier. **Second half — the give-up latch.** `centerizeAcceleration` returned exactly 0 beyond half
  a viewport, so an error that got out there could never close. Per the owner's decision it is now
  the caller's choice and `updateCamera` gives up only when `crashed`. Two things fell out. (a) The
  existing test "a camera left outside that radius simply stays put" was **vacuously green** — the
  camera never moved, so it asserted nothing; it now asserts recovery, with the crashed case beside
  it. So was "does not overshoot wildly": a 300 m step is outside the give-up radius, so
  `maxOvershoot` was 0 and the bound had never been evaluated against a moving camera. (b) 2021's
  gain has a **pole at `max`** — unreachable while the branch beyond returned zero, reachable the
  moment it did not, and it fired: one sub-step at a gain of 400 threw the camera to 10 km/s chasing
  a vehicle doing 7 and put the ship 2.5 km outside the frame. `MAX_RECOVERY_GAIN = 2` caps it,
  chosen because outside `threshold` the law is `x'' + x' + Gx = 0` on 2021's one-second constants,
  so the damping ratio is `1/(2√G)` — 0.35 and ~30% overshoot at G=2. The cap bites only beyond 0.75
  of the give-up radius, where the old code returned zero or was about to, so every value the old
  code produced is unchanged to the digit. `updateCamera` also sub-steps at `CAMERA_MAX_DT = 1/120`,
  with a test asserting that constant equals the loop's `DT`. **Property 6 added** — the vehicle
  returns to frame from any seeded error, both directions, 1.1 to 2000 half-frames out, vertically
  too, and wreckage still leaves: **5 red with the latch restored, 6 green without it.** A NaN guard
  in the new harness earns its place — the first run drove the camera with an undefined dt, every
  comparison against NaN was false, and four framing tests went green measuring nothing.
  **Gate:** lint, **1477 unit tests** (45 new), build all exit 0; **playwright 306 passed, 6 skipped
  across all five projects**; `git diff v2/src/core` empty; first-load JS 196.5 kB of 250.
- 2026-08-26 · M9.3 · `SHAKE_FULL_Q` was **30_000 with a comment saying "around 30 kPa" beside it**,
  which is the worst way to be wrong: the physics in the comment was right and the number under it
  was a thousand times too big. `q / SHAKE_FULL_Q` came to **0.00095** against the 28.6 kPa the RTLS
  golden peaks at, so the aerodynamic half of the camera shake had **never once fired since M7.3
  built it**. Same bug class as `AERO_FULL_Q`, fixed at M8.3, a milestone earlier and in a different
  file, from the same root cause — one JSDoc line in `core/state.ts` calling `dynamicPressure` psi
  (M9.4's job). Measured peaks over the seven goldens, which is the evidence for every number here:
  launch **23.63 kPa**, RTLS **28.61**, reentry 7.55, before-flip 2.89, intro 1.68, landing-burn
  0.87, booster-sep 0.11. A textbook max-Q in kilopascals and an absurdity in anything else —
  28.6 psi is 197 kPa, six times what any launch vehicle survives.
  **The fin-vortex ramp, retuned.** 2021's "above 0.2 psi, ramping to full by 2" shipped verbatim,
  so the effect sat at FULL intensity for **85% of a launch, 76% of an RTLS and 44% of a re-entry** —
  an effect saying the same thing at 2 kPa and at 28 tells a player nothing. Now `sqrt(q / 30)`,
  the identical curve `audio/params.ts` uses for the identical quantity, asserted equal to
  `aeroLevel` at five pressures because the fins shedding and the airframe roaring are one
  phenomenon. Saturation goes 85% → 0%; it costs brightness at low Q, and that is the information
  being restored (the intro's landing drops 0.84 → 0.24; a landing burn should not shed vortices
  like a max-Q ascent). Two literals in `effects.ts` got names — an unnamed threshold is one the
  range test cannot see.
  **`tests/view/dynamic-pressure.test.ts` is the mechanism, not the fix.** It replays all seven
  goldens, finds the interval Q actually visits, and checks all seven named Q constants across
  `view/`, `audio/`, `hud/` and `core/` against `[peak/200, peak*2]` — above the ceiling a threshold
  can never be reached, below the floor it is crossed in the first frame, and either way the comment
  beside it is irrelevant. Wide on purpose (a factor of 400, spanning gates and full-scale values),
  and still narrow enough: both shipped bugs were 1000x, a psi/kPa confusion is 6.9x, and the test
  asserts *in itself* that 30_000 and 30×6.895 both fail it.
  **Red/green shown for both halves.** SHAKE_FULL_Q back at 30_000 → 2 unit tests red (amplitude
  0.00079 on the launch); old ramp restored → 2 red (85% saturated). And in the browser,
  `tests/e2e/shake.spec.ts` tracks the vehicle silhouette across 16 frames: with the bug it reported
  **"shaking 0.8 px vs reduced motion 0.8 px" — the same measurement twice** — and with the fix
  4-plus px against 0.8. Three design decisions in that spec, each from a measurement that failed
  first: the control is the SAME flight under `prefers-reduced-motion` (so the difference is the
  shake and nothing else, and reduced-motion is proved end to end); it is measured in **1/9 slow
  motion**, because at real time the vehicle's own drift was 39 px against a 6 px shake and
  detrending left 3.7 against 3.2 — at 1/9 the drift is a ninth and the shake, a fraction of the
  VIEWPORT, is unchanged; and it is vertical-only and trimmed, because the horizontal series picks
  up a cloud edge about once in fourteen samples. `ExtentQuery` gained `maxLuma` so the harness can
  find a dark object against a light sky. **One M7.3 test had encoded the bug** —
  `shakeAmplitude(15_000, 0)` passed because the assertion and the constant agreed with each other
  and neither agreed with the simulation.
  **Owner decision honoured:** shake lands at `SHAKE_FRACTION = 0.006`, M7.3's designed amplitude,
  pinned by a test so dialling it back later is a deliberate act. Every ascent will feel different
  from this commit on, and whether 0.6% of viewport height is right is a viewing decision.
  **Gate:** lint, **1493 unit tests** (16 new), build all exit 0; **playwright 316 passed, 6 skipped
  across all five projects**; `git diff v2/src/core` empty; first-load JS 196.5 kB of 250.
- 2026-08-26 · M9.4 · **The one exception to the frozen-core rule, and it is COMMENT LINES AND
  NOTHING ELSE**: 171 changed lines in `v2/src/core`, all of them comments, shown in full in the
  commit; the seven golden digests re-verified byte-identical and `tests/golden/unification.test.ts`
  untouched since the M9 start commit. Every unit annotation in `core/` — 4925 lines, every field of
  `SimState`, every exported constant, every `@param`/`@returns` — checked against the expression
  that produces the value. **Six wrong, and only one of them was the one we knew about.**
  (1) `forces.dynamicPressure` said **psi**, is **kPa** — `airDensity * trueSpeed**2 * 0.0005` is
  half rho-v-squared with a Pa→kPa conversion folded in; it reads 101.3 on the pad against a
  101.325 kPa sea level. That one line produced two shipped bugs (M8.3, M9.3).
  (2) `forces.frontFin/aftFinEffectiveAreaFraction` said **m²**, are **dimensionless** — they hold a
  bare `sin(...)`, and `getFrontFinDrag` already multiplies the fin's area inside the drag term, so
  an area here would give newtons times square metres. True of 2021, false here since M2.3; the
  annotation was the last thing describing the definition M2.3 removed.
  (3) `forces.offAxisThrustDifferenceAcceleration` said **m/s²**, is **rad/s²** — built by
  `getAngularAcceleration(force, distance, momentOfInertia)`, summed into `angularAcceleration`
  beside five other rad/s² terms, and subtracted from a commanded angular acceleration in
  `precisionAlignment`. **This one was found by the audit and by nothing else.**
  (4) `airResistance_k` said **dimensionless**, is **kg/m** — `sqrt(mass / (gravity * k))` is only
  seconds if `k` is kg/m, and the same function exponentiates `altitude * k / mass`, which is only
  dimensionless under the same reading. A drag law `F = k v²` has k in kg/m; a drag *coefficient* is
  the dimensionless thing this is not.
  (5) `dynamicPressureLimit` said **psi**, is **kPa** — 50 kPa sits above the 28.6 kPa worst golden,
  which is why none breaks up; 50 psi would be 345 kPa and unreachable.
  (6) `recordTimeInterval` said **frames**, is **steps** — in 2021 a frame WAS a step; here
  `advance()` runs two at 60 fps and eighteen at 9x, it counts against `updatedFrameCount` (already
  documented as steps), and the recorder converts with `recordTimeInterval * DT`.
  Plus one **range** claim corrected by the same arithmetic: `crossSectionalArea` is not "between
  vehicleMinArea and vehicleMaxArea" — the `/ 2.1` on the nose-on term puts its floor at 30.3 m²
  against a 63.6 m² geometric minimum.
  **`thermalPower` could not be pinned down, and the comment now says exactly that** rather than
  guessing — which is what the acceptance line asks for. Established: the form is Sutton-Graves,
  `k·v³·√(ρ/R_n)`, dimensionally a heat flux, and the correlation is commonly published with
  **1.83e-8** for W/cm² (v in m/s, ρ in kg/m³, R_n in m) where this tree has **1.83e-7** — same
  leading digits, exponent larger by one, so the value reads as ten times W/cm² and the re-entry
  peak of 245.9 units would be 24.6 W/cm², a plausible entry heat flux. Not established: whether
  that factor of ten is a transcription slip — the same shape as the 0.0299-for-0.00299 slip M2.1
  found — or a deliberate scaling. Nothing in the source decides it and deciding it would change
  physics, which is Fidelity tier and the owner's call. **Flagged here for that decision.**
  `heatLimit` was re-derived against the scale actually returned (M2.9(a)), so the pair is
  self-consistent whatever the factor is.
  Everything else checked and correct: all of `isa.ts` (Pa/K internally, kPa/°C at the boundary),
  every `m`, `m/s`, `m/s²`, `rad`, `rad/s`, `rad/s²`, `N`, `kg`, `kg/s`, `%/s`, `kPa`, `kg/m³`, the
  `ms`→s conversion on `raptorIgnitionTimeMean`, tonnes on the scenario presets, and every autopilot
  prediction field (`decelerationStageEstDuration`, `bellyFlopTriggerAltitude`,
  `horizontalAdjustmentTimeLeft`, `finalStagePessimisticAltitude`, `distanceToGround`,
  `fineTunePercentage`) re-derived from its own expression.
  **Gate:** lint, 1493 unit tests, build all exit 0; playwright 316 passed, 6 skipped across all five
  projects; **`git diff v2/src/core` contains comment lines and nothing else**; digests unmoved.
- 2026-08-26 · M9.5 · Four generated textures where there was one. `createParticleTexture` built a
  single 64 px white radial gradient and all nine effects drew with it, so the plume, the pad dust,
  the plasma wake, the shock cone and the explosion were the same dot in different tints — and a
  tint cannot change whether a thing has an edge. Now `core` (tight plateau, cubic falloff, for
  additive fire), `soft` (the 2021 gradient reproduced ramp for ramp, so anything tuned against it
  is unchanged), `smoke` (two octaves of value noise over a soft falloff, with a ragged angular rim)
  and `wisp` (elongated, feathered, faintly grained). Each effect names its own with a one-line
  reason.
  **ONE GPU TEXTURE, FOUR FRAMES.** Pixi batches by texture SOURCE, so four separate canvases with
  particles interleaved in one container would break the batch on nearly every sprite and turn one
  draw call into hundreds; four frames of a 128×128 atlas batch exactly as the single texture did.
  Each cell carries a two-pixel transparent margin, asserted, because a bilinear sample at a frame
  edge reads the neighbour. **Generated from `textureRandom`** — the same counter-based hash
  `clouds.ts` uses, kept local for the same reason — so two players see the same smoke, a committed
  screenshot is reproducible, and **the asset budget is byte-identical: 22 `.webp` files at the M9
  start commit, 22 now.** First-load JS 196.5 → **197.1 kB** of 250, which is the generator's own
  code and no art.
  **The pooled contract is untouched, and that is load-bearing:** `createParticleSystem` still
  accepts a single `Texture`, which is what the headless tests pass, so **every assertion written
  against the pool before M9.5 passes unmodified** — including the ten-thousand-shutdowns leak test.
  The texture is set per spawn beside the blend mode; nothing is allocated.
  **11 new unit tests measure the shapes in Node with no GPU**, `writeParticleTexture` being pure:
  `core` holds 47% of its alpha inside a third of the radius against `soft`'s 24%; `smoke`'s
  deviation around a ring is 17.8 against `soft`'s 5.3 (and the 5.3 is the half-pixel sampling
  wobble, not the texture); its rim varies by more than 3 px around the circle; `wisp`'s aspect is
  above 1.6 while the round three sit between 0.75 and 1.35; all four are transparent at the frame
  edge; all four regenerate byte-identically and hold their profile at 32, 64 and 128 px.
  **In the browser, the additive argument measured.** Additive blending SUMS overlapping particles,
  so a wide gradient drives a large area to white and the plume becomes a flat blown-out blob. The
  blown-out share of the lit plume (luma ≥ 240 against ≥ 170) at sea-level full throttle, five
  samples, median: **0.41 with the single texture, 0.18 with `core`** — red then green, shown. A
  ratio rather than a count, because the five projects render at 1× and 2.6×.
  **What this does NOT prove, said plainly.** The acceptance line hoped the harness would show
  "smoke and fire separating in a colour histogram". It cannot, honestly: the two populations were
  ALREADY separated in colour before M9.5, by the per-effect tints that have been there since M3.3.
  Probed both ways on the intro approach and on a pad launch, the histograms are within noise of
  each other. What M9.5 changes is SHAPE, and shape is what the tests above measure.
  **Gate:** lint, **1504 unit tests** (11 new), build all exit 0; **playwright 321 passed, 6 skipped
  across all five projects**; `git diff v2/src/core` since the M9 start commit is still comment lines
  and nothing else; digests unmoved.
- 2026-08-26 · M9.6 · One emitter at 95 m/s with 2.2/s of drag and a 0.32 s life carried a particle
  `(95/2.2)(1 - e^-0.704) = 21.9 m` — **on a fifty-metre vehicle**. It read as a candle because it
  was one. Now three things at one nozzle: a **CORE** (300 m/s, 0.85 drag, near-white, barely
  spread — **135 m**, 2.7 ship-lengths), a **BELL** wrapping it (2021's emitter retuned wider,
  shorter and more translucent, keeping its name so every test written against it still means what
  it meant), and **DIAMONDS**, which are not an emitter: a shock train is the same gas alternately
  compressed and expanded across standing shocks, so it is a periodic brightness ALONG the core.
  Implemented as `cos(2π · distance travelled / spacing)` on the particle's alpha, using its stored
  SPAWN POSITION — distance travelled, not age, because the bands must stand still in the world
  while the gas streams through them. Four more Float32Arrays (64 kB, allocated once); every
  particle of every other effect has `bandOf` at 0 and pays one comparison.
  **Two new curves in `atmosphere-look.ts`, beside M6.7's two, both pinned rather than eyeballed.**
  `shockCellLength` is Prandtl-Pack, `L = 1.306·D·√(Pe/Pa − 1)`, with the nozzle taken as matched at
  sea level so the jet is underexpanded all the way up and the curve is **monotonic** — modelling
  the overexpanded case too would dip it to zero at the matched altitude and rise on both sides, and
  a non-monotonic spacing is a worse thing to own. Bounded 1.5 m to 60 m; asserted monotonic and
  in-range at every 250 m from 0 to 120 km. **The diamonds vanish by stretching out rather than by
  fading** — by 30 km one cell is longer than the whole drawn plume — which is how they really go.
  `shockDiamondStrength` reaches **exactly zero** at 2% of the matched pressure (~27 km), with no
  seam in its rate at either end, held to the same standard as M7.3's field-of-view curve. The
  physical form is kept and the SIZE is a stated look decision (`SHOCK_CELL_LOOK_MULTIPLIER = 4`):
  a real 1.3 m nozzle gives sub-metre cells, which at 3.6 px/m is three pixels, and three-pixel
  banding is dither.
  **Measured in the browser, in ship-lengths.** Low altitude at full throttle: **2.5 ship-lengths**
  long — red at **0.86** with the core emitter removed, green after, shown. Vacuum: **1.1
  ship-lengths across** against 0.55 low down, so the bloom is measured relative to the ship and the
  opening field of view cannot flatter it. **What is NOT measured there, said plainly:** the
  acceptance line also asks for "dimmer in vacuum", and the harness cannot honestly compare
  brightness across a sky at luma 152 and one at 17 — that comparison would be about backgrounds.
  The dimming is arithmetic — the same light over `plumeScaleFactor²` = **5.3× the area** — and it
  is proved in the unit test, where it can be.
  **Peak live particles: 747 of 4000 (81% free)**, at `launch-pad-takeoff`, against M7's 576-of-4000
  baseline. `tests/view/particles.test.ts`'s effect inventory went red on the new emitter, which is
  exactly its job — it is listed rather than counted so an effect cannot arrive without anyone
  deciding it should.
  **Gate:** lint, **1519 unit tests** (13 new), build all exit 0; **playwright 327 passed across all
  five projects**; `git diff v2/src/core` still comment lines and nothing else; digests unmoved;
  first-load JS **197.4 kB** of 250.
- 2026-08-26 · M9.7 · Eighteen `Graphics` puffs of three hard-edged ellipses each, every one at
  `opacity * 0.5` and 2:1, is a paper cutout. Now **36 sprites on M9.5's `wisp` frame** — feathered
  and elongated, which is what a cumulus edge is — with per-puff **alpha, aspect and scale from the
  same `puffRandom` hash** that already decides position and size, so there is no new source of
  randomness and the deck is still the same deck on every reload. Split into **two sub-decks at
  0.72× parallax**, the same argument as `CLOUD_PARALLAX` one level down: a deck whose every puff
  moves at one rate is a cutout however many puffs it has. The far half is smaller, dimmer, drawn
  behind, and offset TOWARD THE HORIZON with a sign that flips as the vehicle climbs through the
  deck — from below, more distant cloud is lower; from above, higher.
  **All fourteen M7.6 tests pass UNMODIFIED**, which is the acceptance line's first clause. Two
  design choices made that possible and both are recorded in the code: every puff stays a DIRECT
  child of one container (so `children.length === CLOUD_PUFFS` still holds — that assertion is about
  the allocation contract, not the graph's shape), and `createCloudDeck(texture = Texture.EMPTY)`
  keeps its no-argument form for the headless tests, with the sprite scale normalised by the
  texture's width so `width[i]` still means pixels across.
  **THE STATISTIC IN THE PLAN WAS THE WRONG ONE, and that is the finding.** The acceptance expected
  a WIDER luma spread; the softened deck shows a NARROWER one — **17.9 against 41.4** — because a
  cutout has an enormous spread precisely BECAUSE it is flat: eighteen opaque ellipses over a blue
  sky are two values with a hard edge, and two values far apart is what a large standard deviation
  measures. The statistics that actually say "not a cutout", measured on the same frame before and
  after: **pure-white share of the band 0.147 → 0.0002**; **mid-tone share of the cloud pixels
  0.261 → 0.932**; tone buckets 5 → 6. Asserted in `pixels.spec.ts`.
  **A test was retired, loudly.** M9.5's `particle-textures.spec.ts` measured the `core` texture by
  the blown-out share of the plume and was green with a clear margin — 0.18 against 0.41 — until
  **M9.6 retuned the very plume it measured**. The new core emitter is four times faster with a
  third of the drag, so particles spread along a column instead of piling up and the blown share
  collapsed for BOTH textures: **0.040 against 0.051**, bimodal, with the vehicle climbing out of
  the box between samples. Two boxes and two sampling schedules were tried before concluding it.
  A test that cannot fail on the thing it was written for is decoration, so it was removed rather
  than loosened — and its claim is now carried by the cloud-deck assertion above, which measures the
  same `wisp` feathering with a **seven-hundred-fold** separation instead of a marginal one. The
  four textures' shapes remain proved directly in `tests/view/particle-textures.test.ts`.
  M9.1's plume-extent assertion also moved: its floor went 0.05 → 0.2 rather than to 1, because the
  M9.6 plume now runs out of M9.1's centre-column region — `plume.spec.ts` makes the 1-ship-length
  claim in a box positioned for it.
  **Gate:** lint, **1523 unit tests** (4 new), build all exit 0; **playwright 331 passed across all
  five projects**; `git diff v2/src/core` still comment lines and nothing else; digests unmoved;
  first-load JS **197.6 kB** of 250.
- 2026-08-26 · M9.8 · Two `Graphics` fills — the near ground and the far earth — and nothing else,
  so at six kilometres the bottom fifth of the frame measured **luma spread 0.47, one tone bucket,
  and a single 4-bit colour bin holding 100% of the pixels.** A flat brown band at the bottom of a
  picture reads as ground, which is why three milestones of screenshot review never mentioned it.
  **Two generated textures in a new `view/terrain.ts`, both greyscale and both TINTED THROUGH THE
  EXISTING `groundTint` PATH** — the constraint that matters, because M6.7 made the ground dim with
  the sky after 2021 darkened one and not the other, and a terrain fill picking its own colours
  would reintroduce that one layer down. `MOTTLE` is a tileable three-octave value noise drawn as a
  TilingSprite, contrast-stretched (summed octaves tend to their mean: the raw sum sat at 183..231
  and gave a standard deviation of 9 of 255, visible only to an instrument); `RAMP` is a vertical
  gradient multiplied over it, squared so most of the change lands in the first third below the
  horizon where the air actually thins. Both start below the horizon bow's lowest point, because a
  rectangle drawn from the middle of a curved edge hangs over the sky at the frame's edges. The
  mottle scrolls with the camera — a stationary texture under a moving vehicle is worse than none,
  because it says the ground is not moving. The far earth gets the same tile at a coarser scale, so
  the two read as different distances rather than one surface at two heights.
  **The number, at the three altitudes the acceptance line names:**

  | altitude | spread | tone buckets | dominant bin |
  |---|---|---|---|
  | before, 6 km | **0.47** | 1 | **100%** |
  | 200 m | 13.67 | 4 | 32% |
  | 6 000 m | 11.76 | 3 | 31% |
  | 40 000 m | 10.59 | 3 | 30% |

  **Twelve more scenery objects, no new art.** Eleven objects covered a planet, four of them
  roaming, so a downrange flight passed the same two trees against empty ground. Every added `src`
  already appears in the table, so `loadTextures` fetches the same files: **9 distinct sources
  before and after, 22 `.webp` files in the repo before and after.** The roaming rule is 2021's
  unaltered, the six fixed StarBase positions are asserted unchanged, and **the pig is at x = 0**,
  asserted by name.
  **Two e2e bounds moved and both are findings.** `plume.spec.ts`'s ceiling went 4 → 6 because the
  portrait phones measure 3–4.2 ship-lengths where the desktop measures 2.5 — their frames are
  2202 px tall against a 135 px vehicle, so the box catches the faint tail the desktop clips. And
  the vacuum-bloom claim now measures width in a **NEAR-FIELD strip just below the nozzle**: over
  the whole plume, the widest part is far from the nozzle and how much of it lands in a fixed box
  depends on where the climbing vehicle happens to be — that moved the desktop's low-altitude width
  between 0.72 and 0.84 run to run, which was most of the difference being detected. In the near
  field the cone is the cone: **0.66–1.10 low → 0.97–1.77 vacuum**, ratios 1.33 to 1.73 against a
  bound of 1.2. Aspect was tried and is worse — in vacuum the black sky lets the tail register so
  the length grows too, putting the desktop at exactly 1.25 with nothing to spare.
  **Gate:** lint, **1533 unit tests** (10 new), build all exit 0; **playwright 336 passed, 6 skipped
  across all five projects**; `git diff v2/src/core` still comment lines and nothing else; digests
  unmoved; first-load JS **202.7 kB** of 250 — the generator's code, and no art.
