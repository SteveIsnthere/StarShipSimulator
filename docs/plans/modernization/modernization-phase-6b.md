# Phase 6b — Entry on lift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Ship survives an orbital entry on physical drag and physical heating by flying it on lift, the way the real vehicle does, and the aerodynamic models parked in Phase 6 (drag, normal force and centre of pressure, fins, RCS) land on top of that.

**Architecture:** Aerodynamic forces move to the body axes: an axial force along the hull and a normal force across it, rotated into lift and drag by the angle of attack. Crossflow theory then gives lift at an angle for free, and broadside it reduces to pure drag. On that model the autopilot flies entry at a scheduled angle of attack instead of broadside. The guidance predictor reads the same force function, so prediction and simulation cannot drift apart. Every change is a Fidelity commit under `physics-change-policy`: goldens regenerated on the recording platform (`.github/workflows/golden-regenerate.yml`, push `HEAD:golden/<name>`), an audit row in `tests/golden/unification.test.ts` with digests, the truth report before and after in the commit body, every scenario landing.

**Tech Stack:** TypeScript, Vitest, fast-check; the Phase 2 truth harness; the Phase 5 predictor (`src/core/control/guidance-physics.ts`).

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 6b; Phase 6's Tasks 5, 6, 7, 9b, 11 (moved here; Phase 6 must merge before this plan starts; its implementation plan was closed out early, and the current record is its branch commits and `docs/reference/physics-model.md`); [physics-change-policy](../../../.agents/skills/physics-change-policy/SKILL.md); [docs/reference/physics-model.md](../../reference/physics-model.md); backlog rows tagged 6b.

**Starts after** Phase 6 merges to `main`. Existing branch `claude/entry-on-lift` is already checked out in `/Users/stevewang/dev/StarShipSimulator-realism`; do not recreate it.

**Read current status first:** the final dated checkpoint below and `modernization-GOAL.md` govern the next action. Earlier measured checkpoints are historical evidence, not instructions to undo implemented work. Tasks 1+1b and Task 5 have unfinished source in this checkout; no acceptance checkbox is completed until its full required evidence exists.

## What is already known (do not re-measure)

- **The parked drag model** is on branch `claude/drag-parked` (parked commit `a06a7a4` on top of the Phase 6 Task 8 baseline `9a7855a`): `getCrossSectionalArea` without the `/2.1`; `stagnationPressureRatio`, `broadsideDragCoefficient` (Jorgensen 1.2 subcritical → Newtonian 1.227 above Mach 4), `noseFirstDragCoefficient` (OpenRocket base drag eq. 3.94 + ogive wave drag B.3–B.6 + 0.035 friction), `tailFirstDragCoefficient` (0.85·q_stag/q + 0.035); `tests/core/drag-model.test.ts`. Its coefficient functions and sources are right and are reused; its blend (`getBodyDragCoefficient`, broadside force applied along the flow) is what Task 1 replaces.
- **Why it parked:** with that model and the Phase 6 heat shield the deorbit reaches the 1,533 K tile limit at 65 km and breaks up. The autopilot flies entry at 88–89° to the wind (`aeroDescentController`, `src/core/autopilot/index.ts`: `pitch = angleOfMotion − π + π/2`, ±3° trims), where lift is zero. Swapping only the lift coefficient for a Newtonian one changed nothing, because at 89° it is zero.
- **The heat model** (Phase 6 Task 8): Sutton-Graves in W/m² with a 1/√2 cylinder factor broadside, radiative equilibrium at ε = 0.85, limit 1,533 K. Today (2021 drag, broadside entry): deorbit 1,459 K, re-entry preset 1,372 K.

## Global Constraints

- The tile limit is 1,533 K and never moves. The soul (intro, presets, pig at x = 0) is untouched; the intro's anchor (touchdown 9.85 s, no engine lit) holds within ±0.5 s.
- No tuning constant moves to make a truth test pass. A measured choice (the entry angle) is chosen by a recorded sweep, never by trying values until a golden passes.
- The predictor and `step()` call one force function. Never a second copy of the aerodynamics.
- Use focused checks during each task and retain before/after truth evidence. Run the complete `npm run gate`, model mutation checks and full browser suite at the coherent phase close. Build before testing; do not regenerate goldens or run mutation concurrently with source edits. Every new model needs a caught mutant before merge. This follows the goal contract’s once-per-phase full gate rule.

## Feasibility fallback and diagnosis rule — approved 2026-10-02

A failed check gets at most three recorded diagnoses in a cycle. When exhausted, obtain a fresh independent review and record a new evidence-backed approach, then continue another cycle without owner permission. The standing approval covers the current one-km range failure and later 300 km/plume failures. It supersedes historical stop/pending-exception statements below. Preserve physical limits, assertion bounds, control authority, coverage and release gates; never rerun for luck.

If Task 1's prescribed sweep finds no entry angle within existing authority that keeps the deorbit under 1,533 K and lands within 10 km, get an independent review to confirm physical infeasibility rather than a guidance or numerical defect. Steve approved the existing fallback: park Tasks 1–4, restore affected aero to the shipped 2021 broadside model through a deliberate audited change, preserve all findings and source recovery evidence, retain Task 5 fixes, then finish the close and continue Phases 7–9. Never reset or discard unfinished work. A failed one-km calibration alone does not trigger this fallback. Do not move the heat limit, drag sources, burn/range bounds or control authority.

## Review Focus

1. Lift sign: in both flight directions (prograde, retrograde) the entry lift must point away from the planet. A sign error flies the vehicle into the ground faster and is easy to miss on one scenario.
2. The transition from the entry angle to broadside for the belly-flop: a step in pitch command at Mach M_b would kick the attitude; it must be continuous.
3. Tail-first and nose-first: the axial coefficient switches at 90°; at exactly 90° both terms vanish with cos α, so there is no step. Assert it.
4. The predictor's tail-first drag and fall integration after Task 1 read the body-axis forces; `tests/core/guidance-physics.test.ts`'s agreement with `step()` (within a metre) must hold unchanged.
5. The engine-out deorbits (`tests/core/deorbit-range.test.ts`): a heavier, slower entry may change the landing reserve's health; the reserve is re-measured, never the bound.

---

### Task 1: Body-axis aerodynamics and an entry flown on lift (Fidelity; lands as one change)

These three cannot land apart: physical drag alone breaks up the deorbit, and lift needs both the normal-force model and an attitude that uses it.

**Files:** `src/core/physics/aero.ts`, `src/core/step.ts`, `src/core/control/guidance-physics.ts`, `src/core/autopilot/index.ts`, `src/core/constants.ts`; tests `tests/core/drag-model.test.ts` (from `claude/drag-parked`), new `tests/core/body-axis-aero.test.ts`, new `tests/core/entry-on-lift.test.ts`.

- [x] Cherry-pick the coefficient functions and `tests/core/drag-model.test.ts` from `claude/drag-parked` (not its `getBodyDragCoefficient` blend or its `step.ts` wiring).
- [x] **Forces in body axes.** With α the attack angle (unfolded, `kinematics.angleOfAttack`) and q the dynamic pressure:
  - normal force `N = q · [A_base · sin 2α · cos(α/2)` (slender-body, Allen & Perkins) `+ η · Cdc(M) · A_plan · sin²α]` (crossflow; Jorgensen NASA TR R-474), A_plan = `vehicleInFlightMaxArea`, η the Mach-aware crossflow factor approved in Resume approvals below:0.63 at low Mn,1 at high Mn, with the declared bridge; cite the source and Ship-specific transition limitation;
  - axial force `A = q · A_base · Cd_axial(M) · cos²α` with `Cd_axial` the nose-first or tail-first coefficient by the sign of cos α;
  - drag `D = N·|sin α| + A·|cos α|`, lift `L = N·cos α` in magnitude, with the lift direction from the existing sign convention (`liftSignIsInverted`, `components.ts`).
  - One exported function returns {lift, drag} accelerations and is called by `step()` and by `guidance-physics.ts` (`tailFirstDragDeceleration` is α = π; `fallAcceleration` passes its own α).
- [x] This replaces `getLiftCoefficient`'s hand-tuned five segments and the 2021 drag blend. Measure and record (numbers, in this plan) the belly-flop before and after: terminal speed at 1 km, peak angle of attack in the flip, landing miss. A lost "feel" is a finding, not a tuning target.
- [x] **The sweep.** Write `scripts/entry-sweep.ts` (`npm run entry:sweep`): for α_e ∈ {45, 50, 55, 60, 65, 70, 75, 90}°, fly the deorbit and the re-entry preset with the entry held at α_e above Mach M_t and record peak skin temperature, its altitude, landing miss, outcome. Record the table here.
- [x] **The schedule.** In `aeroDescentController`, while Mach > M_t the pitch target is the motion direction rotated by α_e on the side that makes lift point away from the planet (keep the ±3° range trims on top); between M_t and M_b it blends linearly to broadside; below M_b it is 2021's broadside law unchanged. Defaults to start the sweep: M_t = 5, M_b = 2. Choose α_e (and adjust M_t, M_b only if the sweep shows a reason) as the angle with the lowest peak temperature that also lands within 10 km; name the choice and its row from the table in `constants.ts`.
- [x] Re-derive `DEORBIT_ENTRY_RANGE` (`npm run deorbit:range`; lift lengthens the entry). Re-measure `landingReserve` if `deorbit-range.test.ts` fails its eighth-of-reserve bound.
- [x] Tests: lift points away from the planet during entry in both directions (assert the lift's vertical acceleration > 0 over the hypersonic segment); at α = 90° lift is zero and drag equals the crossflow drag; at α = 0 and π the force is axial only; continuity across α = 90° and across M_t and M_b; the predictor agrees with `step()` within a metre (existing test unchanged); `flies-every-scenario` lands every scenario; re-entry flux band in `flies-every-scenario` re-measured and re-banded ±5% with the date.
- [x] Golden regeneration (all eight expected), audit row P6b.1 with the per-scenario shape, digests, margins diffed.

### Task 1 measured checkpoint (not complete)

The two prescribed sweeps, before/after belly-flop numbers and raw logs are retained in [Task 1 progress](../../research/2026-10-01-phase6b-task1-progress.md). The second sweep at aim4483442 m and18 t reserve records:

| angle | deorbit peak K | peak altitude m | pad miss m | outcome | reentry peak K | peak altitude m | pad miss m | outcome |
|---|---:|---:|---:|---|---:|---:|---:|---|
| 45 | 1533.012 | 69596.0 | -3863393.2 | brokeUp | 1448.234 | 69297.0 | +4186220.8 | landed |
| 50 | 1524.161 | 69113.9 | +2286254.7 | landed | 1434.327 | 69139.9 | +3312842.6 | landed |
| 55 | 1516.024 | 68841.8 | +1053612.7 | landed | 1430.566 | 68473.2 | +2536160.4 | landed |
| 60 | 1515.292 | 68228.2 | -7667.1 | landed | 1436.223 | 67291.7 | +1847865.8 | landed |
| 65 | 1522.330 | 67209.7 | -925059.0 | landed | 1450.856 | 65572.7 | +1236421.2 | landed |
| 70 | 1533.011 | 66589.5 | -3804055.9 | brokeUp | 1473.673 | 63324.5 | +695225.4 | landed |
| 75 | 1533.027 | 66798.1 | -3895571.8 | brokeUp | 1503.301 | 60626.4 | +231571.3 | landed |
| 90 | 1533.062 | 67179.9 | -4035615.2 | brokeUp | 1533.053 | 62381.1 | -1017101.5 | brokeUp |

The table above is historical constant-eta evidence. Both approved corrections and bounded range feedback are now implemented. The final corrected fixed-angle sweep at aim3,812,057 m chooses60°: deorbit1463.710 K at70.051 km, miss-14.8 m, landed; reentry1346.043 K and815.958 s. Its complete16 rows are retained in calibrated-sweep.log and the progress note. Operational preset/demo range, three reserve checks and longitude/light/engine-out/120 km envelopes pass. The flux band is remeasured to161800 W/m²±5% on2026-10-01 as this task requires. Remaining red:300 km thermal breakup and unchanged1500 s coast assertion. That planned thermal-envelope diagnosis has since completed and attempt 3 failed; see the final checkpoint. No wider authority or limits were used. No goldens/core commit/full gate yet; acceptance checkboxes remain open.

### Resume approvals — Steve, 2026-10-01

Steve approved both recommended exceptions (“sounds good”) after the goal was blocked. These exceptions are resolved; do not ask again. Full remaining scope stays Phases 6b, 7, 8 and 9. Phase 6 is done and must not be redone.

1. **Predictor characterization:** replace only the obsolete assertion `landingBurnStartAltitude(3, 200_000, 4_000, 25, scratch) === null`. The new physical axial drag stops the mathematical descent inside the unchanged60 s cap. Add an independent forward mechanical integration witness that reaches the target stop within the existing burn-agreement tolerance (max0.1% of burn distance or2 m), and assert its duration is below60 s. Use the shared force function; do not create a second aerodynamic model. Preserve the one-engine/full-tank null assertion, BURN_STEP_CAP=1200, and every genuine cap/null case. Separately retain a real-step witness that this start breaks up: a mechanical prediction is not a flightworthiness claim. The predictor’s force-only contract remains; full-trajectory structural/thermal rejection is not added by this approval. Never disable failures in the real-step witness.
2. **Crossflow factor:** correct the plan’s all-Mach0.63 assumption using NASA R474 §2.3.2 printed pp17–18 and Figures4/6. Retain0.63 for low crossflow Mach and recover1 at hypersonic crossflow. The Ship-specific transonic bridge is a declared tier-B engineering assumption, not measured data and not an optimization against heating.

**Bridge fixed before testing:** use crossflow Mach `Mn = M * abs(sin(alpha))`; eta=0.63 for Mn<=0.4; eta=1 for Mn>=1.6; between them use `t=(Mn-0.4)/1.2` and `eta=0.63+0.37*t*t*(3-2*t)`. The0.4–1.6 interval comes from Figure6’s available crossflow-Mach range for fineness10/12; applying its endpoints and a smooth monotone bridge to fineness50/9 is the explicit assumption. This does not model Figure6’s transonic dip, which lacks Ship-specific data. Cite that limitation. Do not subsequently reshape the bridge to pass heating, landing, truth or goldens; an independently established source/model defect is reviewed and recorded first.

The narrow approvals do not change the1,533 K tile limit, one-km health check,10 km landing acceptance,900 s reentry harness, reserve-health fraction, coverage floors, golden tolerances, control authority or diagnosis budget. Re-measure reserve/aim under the corrected model as already authorized. Existing source-derived coefficient tests remain truth; new body-force literal cases may be updated only to independently calculate the newly approved eta, retaining every assertion’s force/sign/continuity property. All analytic tests and reference bands remain binding. The prescribed eight-angle sweep must be run for the corrected model, since earlier tables describe the superseded constant factor; retain those tables as evidence, not current acceptance.

**Implementation status:** the eta TDD cycle and approved predictor replacement are complete in the working tree. Do not repeat them. Preset/demo range and flux remeasurement now pass. The subsequent thermal diagnosis exhausted its three attempts; follow the final checkpoint and goal contract before recording-platform goldens. Preserve all limits, diagnosis counts and stop rules.

### Task 1b: Earth's rotation on (Fidelity; now coherent with Task 1, owner approved)

Everything is in place at rate zero (Phase 6 Task 9a and the 9b work): the Coriolis and centrifugal terms in `verticalGravityAcceleration` / `tangentialAcceleration`, `verticalWeight` in the burn predictor and the flip ladder, the ground-arc coast conic, the orbital presets converted with `groundTangentialSpeed`, and every truth test transformed to the inertial frame and proved with the rate on. What it waited for is range control in the descent: with the rate on and broadside entry, the circularize-then-deorbit flight missed by 11.1 km against the 10 km acceptance.

Measured with the rate on (2026-10-01, broadside entry, 2021 drag): `DEORBIT_ENTRY_RANGE` re-derives to 801.0 km (deorbit preset miss 0.21 km); the circularize-then-deorbit flight misses by 11.1 km (3.2 km with the rate off); the heavy/light descent spread grows from 5 to 14 km; re-entry preset peak 149.8 kW/m² (170.9 off); deorbit peak 1,412 K (1,459 off); envelope misses 120 km +38.9 km, 200 km −47.7 km, 300 km −77.7 km, with 300 km heating at 0.82 of the limit (0.95 off). The coast conic itself agrees with the simulation to about 4 km (its drag-free arc above 80 km); the spread is in the open-loop descent.

- [x] Set `frameRotationRate = EARTH_FRAME_ROTATION_RATE` (`constants.ts`), and update its comment.
- [x] Task 1's entry flies the range: the entry angle (or a bank-free lift modulation inside Task 1's schedule) trims the hypersonic range toward the pad, so a heavy and a light entry land together. If Task 1's schedule already does this, measure and say so; if not, add a range term to the schedule (lift up for long, down for short) inside the same ±α authority, never by moving the 10 km or 1 km bounds.
- [x] Re-derive `DEORBIT_ENTRY_RANGE` (`npm run deorbit:range`), re-measure the re-entry flux band and the deorbit peak temperature in `orbit-demo.test.ts` and `flies-every-scenario.test.ts` with the date, and the 300 km heating row (its bound states what it measures).
- [x] `orbit-demo.test.ts` (every flight, including the circularize demo within 10 km) and `deorbit-range.test.ts` (within 1 km) green; the `rotating-frame.test.ts` "default rate is zero" test becomes "is Earth's".
- [x] Golden regeneration (all eight will move: the ascent gains 418 m/s, every descent feels Coriolis), audit row P6b.1b.

### Task 2: Centre of pressure and the aerodynamic moment (Fidelity; was Phase 6 Task 6)

- [ ] The body normal force acts at a centre of pressure from slender-body theory plus crossflow (Allen & Perkins; Jorgensen), giving a moment about the moving CoM.
- [ ] Attitude control includes the aerodynamic moment as a known term (`precisionAlignment`'s `accelerationNeeded`).
- [ ] Record the RCS share of control torque through the descent, for Task 4.
- [ ] A belly-flop that is statically unstable beyond the fins' authority is a finding for Steve, recorded in this plan and the handover and parked, not tuned away.
- [ ] Regeneration, audit row P6b.2.

### Task 3: Fins as surfaces (Fidelity; was Phase 6 Task 7)

- [ ] Each fin pair produces lift and drag (a force and a moment) at its own arm, from its area and deflection. This replaces the torque-only model and the ×1.8 body area, and the fin-authority estimate calls the same function.
- [ ] Re-record the RCS share of control torque.
- [ ] The horizontal adjustment's ±5 m/s cap is checked against the new dispersion; widening it is a schedule change, so it does not count as a principled attempt.
- [ ] Regeneration, audit row P6b.3.

### Task 4: RCS (Fidelity; was Phase 6 Task 11; after 2 and 3)

- [ ] Flown Ships use cold-gas nitrogen thrusters with no published thrust, so the thrust and reserve are a named tier-B assumption with its reasoning. The reserve becomes gas mass.
- [ ] Off-axis thrusters translate as well as turn.
- [ ] Using Tasks 2 and 3's recorded RCS share: if realistic RCS cannot hold the belly-flop, the descent keeps attitude on fins and gimbal, the way the real vehicle does. The vacuum flip moves to the gimballed engines if the RCS cannot do it before the firing point.
- [ ] Regeneration, audit row P6b.4.

### Task 5: Two Bug fixes from the backlog (independent of the stop rule)

- [x] Break-up and crash checks read the previous step's forces (`checkIfBreakUp` in phase 2 reads `perceivedG`, `thermalPower`, `dynamicPressure` computed in the previous step's phase 3a). Make them read this step's values, failing test first; state the golden diff.
- [x] `controlEnginebyTWR` divides the required thrust by the thrust at `throttleCurrent`, not at full throttle (`src/core/control/primitives.ts`). Failing test first (a commanded TWR at 60% throttle), fix, golden diff.
- [x] Remove both rows from `docs/plans/backlog/README.md`.

### Task 6: Close

- [ ] `docs/reference/physics-model.md`: the body-axis aerodynamics, the entry schedule with its sweep, CoP, fins, RCS, every source and tier-B assumption.
- [ ] Remove the backlog rows this phase answers.
- [ ] Full gate, `npm run test:e2e:full`, `npm run mutation` (a mutant per new model), truth report, the `code-review` skill at `high`, and an independent physics reviewer (`cross-agent-review`).
- [ ] Merge `claude/entry-on-lift` to `main`, verify the deploy, tick Phase 6b in the roadmap, write the Phase 7 plan with `superpowers:writing-plans`.

## Historical thermal diagnosis and Task 5 checkpoint (2026-10-01)

Task 1's 300 km diagnosis is stopped after attempt 3. Diagnosis 2 added peak skin temperature to the existing entry predictor using the shared Sutton-Graves/radiative-sink functions; four flown fixed-fin/tracking-bias witnesses and step convergence retain the new 1 K bound. Watched red and green are retained. At the actual 300 km flight's 80 km crossing, forecasts at 57/60/63° gave 1549.25/1544.99/1542.88 K using observed -0.212° bias. Even the -3° tracking-bias forecasts exceed 1533 K. No fixed choice within existing authority was thermally feasible.

Diagnosis 3 retained safe range solutions and otherwise chose the coolest reached forecast among the range candidate and the same ±3° endpoints, once per simulated second. Selector red/green and 51 focused passes are retained. The real 300 km check still returned `brokeUp`; its landing assertion remains unchanged. No fourth run, including a full suite containing that check, is authorized while Steve's exception is pending. Thermal build/lint passed and truth remained 8/8 IN before the subsequent throttle change.

Coast diagnosis 1 independently records ignition at 1433.05 s: pad gap 8,811,094.695 m versus predicted burn + coast + entry range 8,811,117.731 m. Keeping ignition after 1500 s would require changing the measured aim by approximately 523 km. Its old assertion remains unchanged pending the owner's choice of a firing-geometry witness.

Independent Task 5 is partial. Its previously watched-red 60%-actual-throttle regression now passes: requested acceleration divides by full-throttle `getTotalMaxThrust`, retaining NaN/Infinity clamps. All 38 control-contract tests pass. Failure-freshness runtime changes and current-thrust/felt-g witnesses are not implemented; two pressure regressions remain red. No build/lint after the throttle edit, golden audit, complete gate, independent review or source commit is claimed. Earlier landing acceptance predates this throttle change and must be verified under the final model.

Owner decisions pending: replacing only the obsolete coast floor; bringing Earth rotation forward into coherent Tasks 1+1b with exactly one additional 300 km verification. Until recorded, rate stays zero and the diagnosis stop remains binding. The preset fixed-angle sweep's stop rule has not fired. Preserve physical limits, source bridge, guidance authority and every other assertion.

Evidence: `thermal-predictor-red.log`, `thermal-predictor-green.log`, `thermal-envelope2.log`, `thermal-envelope.ts`, `thermal-trim-red.log`, `thermal-focused.log`, `thermal-build.log`, `thermal-lint.log`, `thermal-truth.log`, `300km-attempt3.log`, `task5-throttle-green.log`. Logs are raw, including failures. The refreshed `in-progress-source.patch` includes current thermal/throttle code and passes forward/index and reverse/worktree checks with `--unidiff-zero`; it is recovery evidence, not shipped physics.

## Historical refreshed checkpoint and owner approvals (2026-10-01)

This section supersedes earlier checkpoint status. Phase 6 remains merged/live at `080f108`; six of ten phases are done (60%). Phase 6b is unfinished on existing claude/entry-on-lift. No unfinished runtime source has been committed or merged.

Steve's latest “sounds good” approves both previously presented recommendations:
1. Replace only the obsolete >1500 s coast characterization with a calculated firing-geometry witness. Keep burn sequence, duration bounds, total-flight checks and genuine predictor cap/null cases.
2. Bring Task 1b Earth rotation forward and finish Tasks 1+1b as one coherent Fidelity change. Permit exactly one further named 300 km verification after that change and its other focused acceptance. The three authorized diagnoses are exhausted. An accidental fourth run occurred when Vitest ignored the global CLI exclude; it still broke up and grants no authority. The new exception is one further verification after that accidental run. If it fails, stop that diagnosis again and report; do not change physical limits or rerun for luck. A successful result permits the ordinary required release gate containing the case, not a new diagnosis campaign.

Current source still has rotation zero and the old coast assertion; the approvals authorize their next implementation. Preserve1533 K, one-km health, ten-km landing, burn bounds, ±3° authority, the fixed source bridge and general three-attempt rule. The preset sweep stop rule has not fired.

Task 5's current-force fixes are implemented: fresh pressure/felt-g breakup checks, ground support from current vertical specific force, collision before fuel use, fresh TWR, and breakup shutdown with dry mass/inertia and cancelled ignition. Full-throttle demand correction is retained. Real physical fixtures replace fabricated stale values without weakening their properties. The dependent final-descent v²=2ah braking envelope/feed-forward belongs to Task 1 Fidelity; intro keeps its original descent law. Before-flip/two-out now lands. Do not redo these fixes.

Build, lint and truth report passed on the reviewed source. Explicit safe collection passed 805 core/proof tests; the focused landing acceptance passed 36. Independent review found one P2 wet inertia after breakup: watched red, fixed, reviewer independently passed 10 regression tests. No substantive finding rejected. This partial review does not replace the phase's final high-depth code review/independent physics review.

Mac preview trajectory audit separates entry context, Task 5 and the dependent profile. Task 5 changes RTLS kinematics (max86.7589 m altitude/2.5201 m/s vertical speed); other seven kinematics are identical, though fresh force/time readings move. Profile changes landing-burn and headwind trajectories (max12.3379 m/4.11582 m/s); intro is byte-identical across that adaptation. No golden fixture was changed. Linux regeneration, complete phase audit/coherent source commits, mutation and complete gate remain required.

The remaining-layer run is red: 1099 passed/4 failed in 94 files. Three failures are in tests/hud/debrief.test.ts (breakup reason, measured vertical speed and peak-Q exceedance). One is tests/view/dynamic-pressure.test.ts (shake witness attitude speed6.38 deg/s against unchanged<6). First task: understand and fix these real regression/fixture causes while preserving each assertion's property and bounds. Read affected code and applicable frontend conventions before changing it; count each diagnosis. Then finish the approved coast/rotation changes and their bounded verification. Do not start Phase 7 yet.

Recovery patch includes all unfinished tracked/untracked source and tests. Check forward against the index and reverse against current source with --unidiff-zero; never apply over existing edits. Vitest --exclude did not prevent orbit-demo execution. Use explicit filenames and verify collection before any run while a named check is stopped. Vitest list --json takes an optional output filename: an earlier invocation overwrote analytic-laws.test.ts; it was restored byte-for-byte from HEAD and has no diff. Always supply a separate JSON output path. Exact failures/restoration/review/audit are retained in the progress evidence. Earlier green acceptance is historical where the model has subsequently changed.

## Rotating-entry checkpoint and range stop (2026-10-01)

This section supersedes the previous checkpoint. Phase 6 remains merged/live at `080f108`; six of ten phases are complete (60%). Phase 6b remains unmerged on claude/entry-on-lift. All unfinished source/tests stay uncommitted, with the refreshed recovery patch checked forward/index and reverse/worktree. No golden fixture has changed.

The four HUD/view regressions are fixed: the watch captures the first current-force breakup state and freezes it before debris motion; first-step/freeze/reset witness watched red. The shake rendering subject is dry, with CoM21.8 m beyond the area-weighted neutral fin station21.61 m; the former20 t load is on its unstable side. No pressure, motion, screenshot or timing bound changed; the old unstable positive control remains. Focused72 and desktop browser 2/2 passed before switching rotation on. The final safe unit run after rotation also includes those HUD/view checks; the browser result is pre-rotation evidence, not final phase release proof.

Approved coast replacement is implemented: the sequence check retains coast-before-burn, burn/hand-over order, burn duration and total flight bounds, and brackets the first fixed step crossing the mechanical burn+coast+entry firing point. The obsolete1500 s assertion alone is removed. The geometry checks pass.

Approved Task 1b rate is now EARTH_FRAME_ROTATION_RATE (0.0000655427691429454 rad/s). The new default-rate test watched red at0 and passed after the switch; all 43 orbital analytic/frame/law checks passed. The rotating16-row sweep showed the60° operational reentry taking 985.450 s against the unchanged 900 s harness. The next prescribed 65° candidate lands it in 855.217 s at 1315.063 K, peak flux144021.289 W/m². M_t20/M_b2, eta, authority and tile limit are unchanged. The plan-authorized dated reentry±5% band is centred 144000 W/m²; deorbit's unchanged±5 K characterization is remeasured 1424 K (actual sink-inclusive peak1424.636 K at the first calibrated aim). This is candidate-model acceptance, not a deployed build.

Range calibration remains red. The fixed65° sweep miss-896527.1 m gave aim2,915,530 m; operational miss-1097.610 m. Constant-plus-miss estimate2,914,432 m instead missed-1239.458 m. Secant estimate2,924,026 m misses -1333.183 m. Both focused acceptance runs were66 passed/1 failed/1 intentional300 km exclusion; the sole failure is tests/core/deorbit-range.test.ts's unchanged one-km health check. Its three calibration diagnoses are stopped. Steve has been asked for one further trace-based range diagnosis and one verification, with all limits unchanged; no answer yet. Do not rerun that health flight, including indirectly through a full suite, without that specific answer. Do not continue numerical aim guesses. The approved extra 300 km verification is still UNUSED and must wait for the other focused acceptance to pass. No 300 km run occurred this turn.

The broad unit run initially found three inertial-fixture assumptions after switching the default rate. Diagnosis1 converts the achievable orbital controller fixture to ground-relative circular speed, makes the zero-angular-momentum degeneracy proof explicitly omega0, exercises the same finite-arc bounds at both0/Earth rates, and converts the real caller's post-burn radial input. All assertion properties/bounds stay intact;81 focused checks pass. Final explicit safe collection:147 files/1905 tests pass, with stopped orbit-demo/deorbit-range files and golden replay files absent. This is not the complete unit suite or phase gate. Final build, lint and truth8/8 pass. No mutation, Linux fixture generation, complete gate, final phase reviews or runtime source commit is claimed.

Next dependent action is the owner's narrow range-diagnosis decision. While pending, preserve all source and investigate only independent authorized checks/review preparation that cannot rerun the stopped health/300 km cases. Tasks2–4 have not started; do not silently skip Task 1 acceptance or start Phase 7. Keep the full remaining6b/7/8/9 scope. This turn made concrete source and verification progress; the goal stays active.


## Independent review and browser checkpoint (2026-10-02)

This adds evidence to the rotating-entry checkpoint; it does not complete Phase 6b or authorize stopped range work. The final rotating build passed the shake rendering witness across all five Playwright projects (10/10, exit 0). A fresh independent in-harness reviewer found no actionable findings in the bounded implemented physics/HUD scope, passed 111 narrow tests and four filtered observer cases, and confirmed all 32 source hashes. Claude CLI authentication failed and Chrome was unavailable, so neither cross-vendor fallback ran. No stopped health/300 km flight, full gate, coverage, mutation or golden regeneration ran. Final phase acceptance/reviews remain required.

Full remaining scope is still Phases 6b, 7, 8 and 9. Steve requested goalgen to refresh the handover command; the specific extra range-diagnosis authorization is presented separately with options. Existing approvals and unused extra 300 km verification remain intact.

[Review provenance and browser evidence](../../research/2026-10-01-phase6b-task1-progress/rotation-independent-review.md).


## Standing autonomy checkpoint (2026-10-02, Steve)

This is the current authority and supersedes all earlier pending questions and automatic diagnosis stops in this file. Steve explicitly approved reviewed diagnosis cycles for the entire roadmap: after three failed attempts, get a fresh independent review, record a new evidence-backed approach, then continue another bounded cycle. This reopens the current one-km range failure and later 300 km/plume failures. Limits, bounds, authority, coverage and release gates remain unchanged. No reruns for luck.

Steve also explicitly approved the existing Phase 6b broadside fallback when independent review establishes physical infeasibility within existing authority. Preserve evidence/unfinished work, restore affected aero deliberately with an audit, retain Task 5 fixes, record parked tasks, complete phase verification/merge, and continue 7–9. A red calibration alone does not prove infeasibility; an easier passing model is not a reason to park the approved physical one.

Next task: fresh independent review of the three range aim/miss attempts and predictor/guidance, then record a causal approach before the next diagnosis cycle. The previous bounded physics reviewer excluded range diagnosis and does not satisfy this requirement. No new health/300 km flight has run during this plan refresh. All 32 reviewed source pins still match. Source remains unfinished/uncommitted; Phase 6 remains live at080f108, Phase 6b remains open, and full6b/7/8/9 scope stays intact. No owner decision is pending.

## Successful range cycle and common calibration checkpoint (2026-10-02)

This supersedes previous current-status/stop statements. Phase6 remains merged/live080f108;6b unfinished,6/10 phases complete. Standing autonomy approvals are binding; no owner question pending.

The fresh fallback range review led to exact-input traces: endpoint interpolation left17.8km candidate residual at79km with safe unsaturated authority. Watched-red Bug-fix regression and safeguarded nonlinear solve preserve +/-3deg authority/thermal guard;12 solver tests pass. Real health6/6 and focused95/95 pass at aim2924026, then the named extra300km verification passes and is CONSUMED. Complete units at that aim1987pass/8 stale golden schemas only; no other unit failure. No fixtures written.

Fixed sweep at2924026 had no qualifying row. Independent calibration follow-up retained the open-loop measurement contract, rather than silently enabling feedback. Attempt1 measured secant2750421:fixed65+7459m at1424.567K, but operational120km+41616m exceeded40km. Attempt2 trace shows signed overshoot established during saturated+3deg entry; powered stage recovers only110m, burn cuts on guidance below240m/s ceiling. Attempt3 updated measured fixed-root2758826 passes fixed65+0.3m and120km+37321.649m. Final prescribed16-row sweep confirms65 is the only deorbit angle below1533K and within10km:1424.614K at68.328km. The cooler60 row misses+682km. M_t20/M_b2,eta,reserve22t,bounds and authority unchanged. Fixed reentry misses remain diagnostic; operational900s is mandatory.

Final build passed; complete units/truth under2758826 are next. Recording-platform fixtures/audit/margins/coherent source commit remain owed; Task1/1b checkboxes stay open until that checkpoint. Tasks2–4 not started, no partial phase merge or phase7 start. No full phase gate/mutation/final reviews claimed.

Evidence: range-cycle2-review.md records approaches before execution and fallback review dispositions; range-cycle2 baseline/solver-inputs/red/green/health/acceptance logs, rotation-300km-approved-verification.log, fixed-calibration1/3 logs, fixed-calibration2/3-120km traces, rotation-accepted-sweep.log. Raw failures retained. Earlier32 source pins are historical; new pins/recovery patch will be refreshed before checkpoint.

## Linux audit and narrowly pending window decision (2026-10-02)

Final common aim2758826 complete units1987pass/8 stalegolden-only failures; build/lint/truth8/8pass. Actual deorbit measurement lands+6.851m,1425.663K,3079.233s,6.276t left; reentry855.217s,1315.063K,144021.289W/m²,miss+1756315.6m (not pad accuracy). Beforeflip1km70.030m/s/peakflip151.475deg/miss-0.307m versus old70.076/144.922/+0.3165; full old/newbelly tables retained. Intro9.858s/allenginesoff, every existing margin outcome unchanged including known impossible landingburn/two-out crash.

Linux recording run36985191265 succeeded from immutable764d191 snapshot;46 sourcepins match. All8 artifacts expectedly move with2 entry-history keys; full field/digest audit and updated margins retained. CopiedLinuxartifacts and audit rows are unfinished source: numerical replays/unification26pass, but one fixture characterization fails (180s reentry endpoint h<50km/vy<-100). Fresh independent fallbackreview/trace establishes intended lifted entry: crosses50km569.75s,600s h43238m/vy-251m/s,landswithin900.

Owner question is pending for only reentry recording-window180->600s, keeping every literal numeric assertion and existing heat/900s/range/authority/source constraints. No duration/assertion changed; do not treat pending choice as approval. Current gate is not green. Keep Task1acceptance open; Tasks2–4/nextphases cannot start yet. Independent Task5Bugfixes are implemented/tested/audited; its two backlogrows can close in this branch. No runtimecommit/phasegate/mutation/finalreview/merge claimed.

If approved: record all8 again onLinux with only that durationextension; prove identical existing361sample reentryprefix and separately audit840added samples, then coherent source/fixtures/audit commit and Task2. Preserve initialrun/failedcheckpoint. Initialrecordingbranch remains until finalartifact checkpoint.

## Reentry recording exception approved (2026-10-02)

Steve explicitly answered “yep approved” to extending only the reentry golden recording180->600s. This supersedes the pending window decision above. Keep all literal numerical assertions, uninterrupted survival,1533K,900s, range/authority/eta contracts intact. Regenerate onLinux/Node22; preserve the361-sample180s prefix exactly against initial run36985191265, audit840newtail samples, and require all seven other fixtures byte-identical. No owner question is pending. Task1 remains open until this artifact audit/checkpoint is complete; then continue Tasks2–4 and full6b/7/8/9 scope.

## Coherent Tasks1+1b checkpoint complete (2026-10-02)

The approved600s recording extension is implemented. Linux37016645116/8c5f85a:361original reentrysamples exact,840newtail audited,sevensibling files byte-identical. Fresh independent window and camera-harness reviews clean. Fullunits153files/1995tests pass;lint/build/truth8/8pass. Camera helper’s fixed200000display-frameguard truncated1/9playback at44444of72000steps;watchedred completion witness,derived playback framebudget and retained exact camera/framing/negativecontrols now pass. This changes no runtime,flightbounds or goldenvalues.

Task1/1b implementation and recording/audit acceptance are complete;Task5 Bugfixes remain complete in the same coherent checkpoint. Final fixed sweep at common2758826m:65°deorbit1424.614K at68328m,+0.3m,landed3073.15s;it is the only qualifyingdeorbit row. Operationaldeorbit+6.851m;120km+37321.649m within40km;approved300km verification consumed/passed. Beforeflip measured1kmspeed70.0764->70.0301m/s,flip144.9222->151.47495°,miss+.3165->-.30706m. Fullsweep/margins/fielddiffs retained.

Next:Task2 centreofpressure/moment research and implementation. Task2–4 and finalphase gate/coverage/mutation/fullbrowser/highreview/independentphysicsreview/merge/deploy remain. No partialphase merge;main/live stillPhase6.

## Task2 unaccepted model and CI consumer repair (2026-10-02)

Task1/1b/5 coherentc24235f iscommitted/pushed,recordingbranchesdeleted. HostedCI37017954727 red onlyreentrycameraidentitycallback30stimeout;local1995unitspass remainsMacproof. Splitconsumerproof into8×3individualcomparisons withliteralbounds/timeout/retries unchanged;isolatedc242build/focused83pass,independentreviewclean. Hostedverification pendingrepairpush.

Task2 bodymoment implemented butunaccepted/uncommitted;64focusedpass/build/lint/truth8/8. Freshreviewconfirmedsource/sign/tailgeometry,foundmixedgustsnapshot;watchedred,fixed,quadrantvectorproofadded/reviewed. Correctedrealdescents:beforefliplands29.275s;reentry337.175s/deorbit2441.558s thermalbreakup withRCSempty,62.40/78.55%RCSangularimpulse. Oldstaticfinscannotcountermoment atsampledstates;thisdoesnotproveplannedTask3 infeasible or thermalcause. No findingrejected,no limits/authority tuned. Nextrepresentativestate/timeline capture andsource-backedTask3surfacegeometry/law/torqueenvelopewithfinsremovedfrombodyarea,thenfaithfulsharedforceimplementation ifbounddoesnotreject. Readnewbody-momentresearchruling/review;recoverunfinishedsource onlyfromnewpatch/pins ifabsent. Task2–4/fullphaseclose remainopen. Main/livePhase6,full6b/7/8/9scope remains,noownerquestionpending.

## Coupled surface diagnosis prepared (2026-10-02)

Phase6 remains main/live080f108;60% by phase count. Task1/1b/5 checkpointc24235f and camera grouping repair556617d are pushed. Hosted37020750232 passes2011unit and2011coverage-instrumented tests; gate red on unchanged coverage floors (global branches98.55/99%, physics lines99.52/100%, functions98.96/100%). The timeout grouping repair succeeded. Coverage work remains mandatory at the phase close; no green gate claimed.

Three read-only fin measurements and fresh independent review are retained in docs/research/2026-10-02-phase6b-body-moment/. Actual/intended snapshot and stage findings fixed without changing runtime. RCS exhaustion precedes >10-degree loss and breakup. The longitudinal pressure candidate is statically insufficient; the generous observed-path impulse bound remains below favorable fullRCS budgets, so combined feasibility/fallback is not established. Zhang2021 explicitly describes a skewed front hinge; longitudinal pairs remain a named simplification, with no CFD coefficient/CoM transplant or fitted correction.

Fresh reviewed next cycle: couple one shared hypersonic pressure force to translation/moment and actual paired-command authority (including neutral torque, unchanged slew/limits); remove fin inflation from body, keep RCS/gimbal. One reentry/deorbit diagnosis, stop atMach5 if reached; that pass is not landing acceptance. The unconnected primitive and independent vector/hand-pressure proofs are implemented; build/lint/truth8/8 and focused30pass. No runtime coupling, low-Mach model, accepted source/fixture commit, phaseclose or fallback claimed. Tasks2–4 remain open; main/live unchanged. No owner question. Full6b/7/8/9 scope remains.

## Coupled surface cycle exhausted (2026-10-02)

Task3 is now coupled in the unaccepted working tree: one shared hypersonic pressure law drives translation, moment, paired-command authority and forecast; hull-only area removes fin inflation. Current-wind/returned-attack mapping shared by controller/actuator; forecast low-Mach area cache defect fixed with watched-red witnesses. No low-Mach surface law invented. Task2 bodymoment remains unaccepted; goldens still accepted Task1 checkpoint.

Cycle attempt1 operational reentry/deorbit both exhausted RCS and broke up. Independent review identified total torque being requested from RCS despite fin contribution. Attempt2 corrected residual allocation after actual unchanged slew and final0.99 mapping; thrust/reserve/deadzone preserved. Reviewer found a superseding-alignment stale raw request, watched-red/fixed; ordinary proportional command carryover retained. Build/lint/truth8/8 and10files/100focusedtests pass. Attempt2 reentry empty288.0417s/1329.658K, breakup334.15s/1533.1955K; deorbit empty2437.2917s/1452.5297K, breakup2442.4917s/1533.2216K. RCS usage70.2565/83.0759% is measured usage, not minimum budget. Integrated snapshot/new commands labeled; breakup-reset mass excluded from totals.

Attempt3 prescribed fixed45/50/55/60/65/70/75/90deg, both entries, all16break beforeMach5. Reentry breaktimes560.983/509.200/466.642/422.875/374.050/316.308/263.283/186.875s; deorbit2443.392/2443.233/2443.950/2443.750/2442.983/2442.217/2441.283/2413.925s. Thermal1533K retained. All-red alone does not establish physical infeasibility: deadzone offset/trajectory still possible. Current three-attempt cycle exhausted; fresh independent reviewer entry_cycle3_review is assessing fallback versus a separately justified next control-policy diagnosis. No further flight until its ruling/new approach recorded. No owner question or blocked goal.

Recovery: coupled-task2-3-source.patch plus coupled-task2-3-sha256.json preserves15dirty source/testfiles, basef51c293,49617bytes, forward/index and reverse/worktree checks pass. Prior patches historical; never apply over current work. Runtime not committed with stale fixtures. Exact red/green/build/lint/truth/flight logs under body-moment research. Main/livePhase6 at080f108,60%;6b/7/8/9 remain. Coverage/fullgate/mutation/fullbrowser/finalreviews/phase merge/deploy still required; no shippedTask2/3 or fallback claimed.

## Known-disturbance cycle and ideal holding budget (2026-10-02)

Fresh entry_cycle3_review confirmed priorcycle deadzone suppressed knownbody compensation; approved recordedFidelity policy correction: hypersonic D-onlyinside0.1rad feedbackdeadzone, D+existingPDoutside. Both fin solve and afterslew RCS use same demand. Thrust/reserve/slew/blend/lowMach/gimbal/physical assertions unchanged. The unaccepted zero-TOTAL-RCS-withbody characterization explicitly superseded by stronger exactcompensation/absentfeedback/offaxis witnesses. Build/lint/truth8/8 and104focusedtests pass, independentpreflight clean.

Cycle3 attempt1 actualoperationalpair stillRCSemptythenloss/breakup. Reentryempty313.4167s/M22.325/1289.750K,break381.2167s1533.1565;deorbitempty2434.025s/M22.780/1447.274K,break2439.5833s1533.261. Beforeempty body+fin+RCS nearlybalance (85.59/−67.01Nm residual),feedback0;realcompensationworks. Attempt2prescribed16rows allthermalbreakbeforeMach5. Correct90deorbitretains5.027sreserve; earliercycle2 zeroreserve-at-breakup was resetartifact, notexhaustion. Stage/integratedforces/issuedcommands/initialtracking distinctions retained.

Afterroot challenged a globaloptimalcontrolproof asbeyondthe prescribedfamily contract, reviewer agreed. Attempt3qualifiedidealpathwitness: exactprescribedpitch imposedexternally, instantunblendedpairedfins, sharedrealsteptranslation/mass/thermal, separateholdingcostincludingI*targetacceleration;freeinitialalignment andoperationaltrimjumps. Grantfull25s×800kN×36.8mgeometricarmbound=736MNms, noothergasexpense. Fixed8angles plus62/68brackets selected65±3 andexistingoperationaltrim policy, bothentries at1/120 and1/240. Allnonthermalrows demand>25s (minimum47.66sat900sreentrytimeout;65±3/op85–97s;deorbit45..75~73.7–146.7s).90deorbitidealthermalbreakbeforeMach5with6.5–6.8sused. Thisisvirtualmeasurement, notrealflight/acceptance/globaloptimal lowerbound. Max-counterfintranslationnotguaranteed globallymostfavorable.

Threeattemptcycleexhausted. Fresh ideal_family_review readingnumerical/physicalevidence beforefallback/newapproach. Firstdtpass includesseparatenormalpre-entryautopilot atdifferentdt, so8s/8Kdeorbithandoff variationconfounds puremodelconvergence; proposedcontrolledidenticalhandoff replay onlyafterreview. Noadditionalflight/changedruntimependingthatdisposition. Currentruntime remainsunaccepted/dirty;prior15filepatchpinsbasef51 historicalafterpolicy change;refreshnewrecoverypatchbeforecheckpoint. Main/livePhase6,60%;full6b/7/8/9remain,noownerquestion. Coverage/fullphasegates/reviews/merge/deploy remain.

## Independently confirmed broadside fallback (2026-10-02)

Fresh ideal_family_review confirms approvedprescribedfamily infeasible withinexistingmodeledauthority aftercommonhandoffnumericalrepair.22completehandoffs/44rows;alloriginal1/120physicsfields exact. Deorbitdt differences≤.00834s/.00805K/.0415equivalentgas seconds;reentry≤.0125s/.0327K/.0958s. RemovingALLinertial allowance stillselected65±3/operationalrequire84.985–97.305svs25s;lowestnonthermal47.660s@900stimeout;deorbit45–75alloverreserve,90thermalfailsbeforeMach5with~6.504sused. Full736MNmsgeometricbudget,freealignment/instantfins/free trimjumps. Noledger/model/numericaldefectexplainsmargin;notglobaloptimalcontrolprooforscenarioacceptance. Exactruling inbody-momentresearch/coupled-fin-fallback-ruling.md.

Next executeSteve'sauthorizedparking: restoreaffectedTasks1–4aero/schedule/Earthrate/model-dependentreserve/aimtoshippedPhase6broadside baseline through deliberateauditedsourcechange;retainTask5currentforcebreakup/support/fullthrottleTWRfixes andnecessaryindependentbraking/debrief fixes. Preserve source,scientifictests,logs and reviews;do notclaimparkedphysics shipped. acceptedc242source/fixtures remainsinGithistory;latest15unacceptedsource/testfiles preservedbyparked-coupled-source.patch+SHA256 againstdaffd60,51787bytes,forward/reversechecksPASS. Oldpatches historical. Noreset/rebase/discard.

Then requiredfull6b gate/coverage/mutation/fullbrowser/highreview/independentphysicsreview/Linuxfixtures/audit/merge/deploy;continue7–9. No partialphase merge. Main/live080f108,60%,fourphasesremain. Noownerquestionorblockedgoal.

## Deliberate fallback implementation checkpoint (2026-10-02)

Affected Tasks1–4 source now deliberately restored to shippedPhase6 broadside baseline: constants/state/commands/actuation/guidance/aero byte-identical to080f108; sourcepins in body-momentresearch/fallback-restoration-pins.json. Task5 current-force/support/throttle/shutdown fixes, independent braking and first-loss debrief remain. Scientific source/tests/sweep preserved verbatim in parked-files/*.txt +SHA256 and earlier pushedcheckpoint/patches. Tasks1–4 are parked, notshipped. Backlog names every deferral; physical/reference/assertion bounds unchanged.

Build/lint/truth8/8 and focused91pass. New600s broadside record exposes camera shake bypassing rendered groundfloor; fresh independent fallback_camera_review confirms minimaldecorative-offsetclearancefix. Original four framingfailures nowpass; newfivecheapclearancechecks pass aftercorrecting invalidnovelfixture/input andgroundprojection inequality. Allredlogs retained. Explicitnon-fixture collection1915pass/onefixednoveltest; live timeline and comparechecks separate. Expectednewreentryevents include touchdown within600s; fixturesstillparkedmodel untilLinuxregen. No completegate/coverage/mutation/fullbrowser/finalphasereviews/merge/deploy claimed.

Next: Linuxrecording/audit coherentfallbackstate, then fullPhase6bclosure and7–9. Main/live080f108,60%;noownerquestion.

## Gate-green fallback checkpoint (2026-10-02)

Complete localgate exits0:1977units and1977coverage-instrumentedtests; unchangedcoveragefloors, smoke and5subpath checks pass. All8Linuxfixtures/audits coherent with source; intro motionexact, reentryoriginal180s motionexact,600slanded. Full5-browser suite nowrunning; mutation/finalreleaseacceptance/merge/main-gate/deploy stillrequired. High-depth branchreview found onlystale authoritative-roadmap checkpoint; accepted/corrected, followup requested. No partialphase merge; main/live080f108,60%,fourphasesremain. Next finishfullbrowser, runmutationALONE, finalreviewfollowups, phaseclose/merge/deploy then7–9.


## Cycle3attempt1 sampling repair and continuous-bell prerequisite

Fresh independent cycle3 review established expandedvisiblegas outsideoriginalbrightthresholds; no newbugwasassumed. Controlledfrozenproduction-driver tests provedfilterdownsampling/MSAAcoverage loss onDPR2: watchedredconfiguredsource maxloss204RGB,26–58sourcepixelserased; bothsettingsinherit preserveall12DPR2cases within0–1RGB/zeroerasedpixels. Bloom-onlyresolution/antialiasinherit implemented; heatunchanged. All7desktoprendererwitnesses/build/lint/65focusedunits pass; freshindependentandhigh-depthsource reviews clean. DPR1notuniversal1RGB anddetectorwidthsnearlyunchanged,so no originalwidthclosureclaim. Rawdata/logs/HTML/failurecapture/hash in fallback-browser-cycle3-attempt1/.

Nextnativecycle3attempt2 follows continuous-bell-plan.md: continuousnozzle-framefield alongsideunchangedparticles,existingpressurecurves/bellgeometry/tint/alpha/per-running-enginecontributions,preallocatedmeshes/lifecycle/meaningfulabsencecontrols,originalacceptancebounds unchanged. This brings minimumvisible-bell prerequisite forward fromapprovedvisualscope; Phase8remainsunfinished. Planreview requested beforeimplementation, noownerquestion. Nocore/aerorestoration/feasibilitywork. Main/live080f108,60%,6b7 8 9unfinished.

## Cycle3attempt3 accepted; final release verification

Cycle 3 attempt 3 is accepted as the Phase 6b continuous-gas prerequisite. The full-envelope soft profile passes 84 focused tests, build/lint, all 51 browser checks (10 original plume, 36 renderer and 5 strengthened scene checks), and actual image review. All 60 ordered frozen pairs are byte-identical. The complete final-source local gate passes 1,993 unit and coverage tests, unchanged coverage floors, smoke and subpath checks. All 21 Linux simulation source pins match.

The additional tonne-input fixture is corrected: mass assertion watched clamped fulltank red, then corrected20t/200t overrides pass6scenechecks. Actual20t one-engine image is inspected and attached gas is legible. Next: obtain fresh high-depth whole-phase review, run mutation alone, then the final full five-project browser suite at the pushed unchanged candidate. Only after final acceptance: merge/main gate/hosted deploy/live identity and smoke, tick Phase 6b, then execute Phases 7–9. No further unchanged plume diagnosis or fallback feasibility redo. Main/live remain080f108;60%,four phases unfinished; no owner question.
