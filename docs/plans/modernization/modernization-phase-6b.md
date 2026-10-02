# Phase 6b — Entry on lift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Ship survives an orbital entry on physical drag and physical heating by flying it on lift, the way the real vehicle does, and the aerodynamic models parked in Phase 6 (drag, normal force and centre of pressure, fins, RCS) land on top of that.

**Architecture:** Aerodynamic forces move to the body axes: an axial force along the hull and a normal force across it, rotated into lift and drag by the angle of attack. Crossflow theory then gives lift at an angle for free, and broadside it reduces to pure drag. On that model the autopilot flies entry at a scheduled angle of attack instead of broadside. The guidance predictor reads the same force function, so prediction and simulation cannot drift apart. Every change is a Fidelity commit under `physics-change-policy`: goldens regenerated on the recording platform (`.github/workflows/golden-regenerate.yml`, push `HEAD:golden/<name>`), an audit row in `tests/golden/unification.test.ts` with digests, the truth report before and after in the commit body, every scenario landing.

**Tech Stack:** TypeScript, Vitest, fast-check; the Phase 2 truth harness; the Phase 5 predictor (`src/core/control/guidance-physics.ts`).

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 6b; Phase 6's Tasks 5, 6, 7, 9b, 11 (moved here; Phase 6 must merge before this plan starts; its implementation plan was closed out early, and the current record is its branch commits and `docs/reference/physics-model.md`); [physics-change-policy](../../../.agents/skills/physics-change-policy/SKILL.md); [docs/reference/physics-model.md](../../reference/physics-model.md); backlog rows tagged 6b.

**Starts after** Phase 6 merges to `main`. Branch `claude/entry-on-lift` from `main`.

## What is already known (do not re-measure)

- **The parked drag model** is on branch `claude/drag-parked` (parked commit `a06a7a4` on top of the Phase 6 Task 8 baseline `9a7855a`): `getCrossSectionalArea` without the `/2.1`; `stagnationPressureRatio`, `broadsideDragCoefficient` (Jorgensen 1.2 subcritical → Newtonian 1.227 above Mach 4), `noseFirstDragCoefficient` (OpenRocket base drag eq. 3.94 + ogive wave drag B.3–B.6 + 0.035 friction), `tailFirstDragCoefficient` (0.85·q_stag/q + 0.035); `tests/core/drag-model.test.ts`. Its coefficient functions and sources are right and are reused; its blend (`getBodyDragCoefficient`, broadside force applied along the flow) is what Task 1 replaces.
- **Why it parked:** with that model and the Phase 6 heat shield the deorbit reaches the 1,533 K tile limit at 65 km and breaks up. The autopilot flies entry at 88–89° to the wind (`aeroDescentController`, `src/core/autopilot/index.ts`: `pitch = angleOfMotion − π + π/2`, ±3° trims), where lift is zero. Swapping only the lift coefficient for a Newtonian one changed nothing, because at 89° it is zero.
- **The heat model** (Phase 6 Task 8): Sutton-Graves in W/m² with a 1/√2 cylinder factor broadside, radiative equilibrium at ε = 0.85, limit 1,533 K. Today (2021 drag, broadside entry): deorbit 1,459 K, re-entry preset 1,372 K.

## Global Constraints

- The tile limit is 1,533 K and never moves. The soul (intro, presets, pig at x = 0) is untouched; the intro's anchor (touchdown 9.85 s, no engine lit) holds within ±0.5 s.
- No tuning constant moves to make a truth test pass. A measured choice (the entry angle) is chosen by a recorded sweep, never by trying values until a golden passes.
- The predictor and `step()` call one force function. Never a second copy of the aerodynamics.
- Every task ends with `npm run gate` green, `npm run mutation` with a mutant for each new model, and the truth report.

## Stop rule

If Task 1's sweep finds no entry angle within the vehicle's control authority that keeps the deorbit under 1,533 K **and** lands it within 10 km, Tasks 1–4 park again. Revert to `main`, record the sweep table in this plan and the handover as the finding for Steve, and go to Task 5, then the close. 2021's broadside drag stays. Do not move the limit, the drag sources, or the deorbit burn bounds to make it pass.

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

- [ ] Cherry-pick the coefficient functions and `tests/core/drag-model.test.ts` from `claude/drag-parked` (not its `getBodyDragCoefficient` blend or its `step.ts` wiring).
- [ ] **Forces in body axes.** With α the attack angle (unfolded, `kinematics.angleOfAttack`) and q the dynamic pressure:
  - normal force `N = q · [A_base · sin 2α · cos(α/2)` (slender-body, Allen & Perkins) `+ η · Cdc(M) · A_plan · sin²α]` (crossflow; Jorgensen NASA TR R-474), A_plan = `vehicleInFlightMaxArea`, η the crossflow proportionality factor for fineness 50/9 from Jorgensen's fig. (state the value read and its source line in a comment; if the figure cannot be read, η = 1 is the named assumption);
  - axial force `A = q · A_base · Cd_axial(M) · cos²α` with `Cd_axial` the nose-first or tail-first coefficient by the sign of cos α;
  - drag `D = N·|sin α| + A·|cos α|`, lift `L = N·cos α` in magnitude, with the lift direction from the existing sign convention (`liftSignIsInverted`, `components.ts`).
  - One exported function returns {lift, drag} accelerations and is called by `step()` and by `guidance-physics.ts` (`tailFirstDragDeceleration` is α = π; `fallAcceleration` passes its own α).
- [ ] This replaces `getLiftCoefficient`'s hand-tuned five segments and the 2021 drag blend. Measure and record (numbers, in this plan) the belly-flop before and after: terminal speed at 1 km, peak angle of attack in the flip, landing miss. A lost "feel" is a finding, not a tuning target.
- [ ] **The sweep.** Write `scripts/entry-sweep.ts` (`npm run entry:sweep`): for α_e ∈ {45, 50, 55, 60, 65, 70, 75, 90}°, fly the deorbit and the re-entry preset with the entry held at α_e above Mach M_t and record peak skin temperature, its altitude, landing miss, outcome. Record the table here.
- [ ] **The schedule.** In `aeroDescentController`, while Mach > M_t the pitch target is the motion direction rotated by α_e on the side that makes lift point away from the planet (keep the ±3° range trims on top); between M_t and M_b it blends linearly to broadside; below M_b it is 2021's broadside law unchanged. Defaults to start the sweep: M_t = 5, M_b = 2. Choose α_e (and adjust M_t, M_b only if the sweep shows a reason) as the angle with the lowest peak temperature that also lands within 10 km; name the choice and its row from the table in `constants.ts`.
- [ ] Re-derive `DEORBIT_ENTRY_RANGE` (`npm run deorbit:range`; lift lengthens the entry). Re-measure `landingReserve` if `deorbit-range.test.ts` fails its eighth-of-reserve bound.
- [ ] Tests: lift points away from the planet during entry in both directions (assert the lift's vertical acceleration > 0 over the hypersonic segment); at α = 90° lift is zero and drag equals the crossflow drag; at α = 0 and π the force is axial only; continuity across α = 90° and across M_t and M_b; the predictor agrees with `step()` within a metre (existing test unchanged); `flies-every-scenario` lands every scenario; re-entry flux band in `flies-every-scenario` re-measured and re-banded ±5% with the date.
- [ ] Golden regeneration (all eight expected), audit row P6b.1 with the per-scenario shape, digests, margins diffed.

### Task 1b: Earth's rotation on (Fidelity; was Phase 6 Task 9b; after Task 1)

Everything is in place at rate zero (Phase 6 Task 9a and the 9b work): the Coriolis and centrifugal terms in `verticalGravityAcceleration` / `tangentialAcceleration`, `verticalWeight` in the burn predictor and the flip ladder, the ground-arc coast conic, the orbital presets converted with `groundTangentialSpeed`, and every truth test transformed to the inertial frame and proved with the rate on. What it waited for is range control in the descent: with the rate on and broadside entry, the circularize-then-deorbit flight missed by 11.1 km against the 10 km acceptance.

Measured with the rate on (2026-10-01, broadside entry, 2021 drag): `DEORBIT_ENTRY_RANGE` re-derives to 801.0 km (deorbit preset miss 0.21 km); the circularize-then-deorbit flight misses by 11.1 km (3.2 km with the rate off); the heavy/light descent spread grows from 5 to 14 km; re-entry preset peak 149.8 kW/m² (170.9 off); deorbit peak 1,412 K (1,459 off); envelope misses 120 km +38.9 km, 200 km −47.7 km, 300 km −77.7 km, with 300 km heating at 0.82 of the limit (0.95 off). The coast conic itself agrees with the simulation to about 4 km (its drag-free arc above 80 km); the spread is in the open-loop descent.

- [ ] Set `frameRotationRate = EARTH_FRAME_ROTATION_RATE` (`constants.ts`), and update its comment.
- [ ] Task 1's entry flies the range: the entry angle (or a bank-free lift modulation inside Task 1's schedule) trims the hypersonic range toward the pad, so a heavy and a light entry land together. If Task 1's schedule already does this, measure and say so; if not, add a range term to the schedule (lift up for long, down for short) inside the same ±α authority, never by moving the 10 km or 1 km bounds.
- [ ] Re-derive `DEORBIT_ENTRY_RANGE` (`npm run deorbit:range`), re-measure the re-entry flux band and the deorbit peak temperature in `orbit-demo.test.ts` and `flies-every-scenario.test.ts` with the date, and the 300 km heating row (its bound states what it measures).
- [ ] `orbit-demo.test.ts` (every flight, including the circularize demo within 10 km) and `deorbit-range.test.ts` (within 1 km) green; the `rotating-frame.test.ts` "default rate is zero" test becomes "is Earth's".
- [ ] Golden regeneration (all eight will move: the ascent gains 418 m/s, every descent feels Coriolis), audit row P6b.1b.

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

- [ ] Break-up and crash checks read the previous step's forces (`checkIfBreakUp` in phase 2 reads `perceivedG`, `thermalPower`, `dynamicPressure` computed in the previous step's phase 3a). Make them read this step's values, failing test first; state the golden diff.
- [ ] `controlEnginebyTWR` divides the required thrust by the thrust at `throttleCurrent`, not at full throttle (`src/core/control/primitives.ts`). Failing test first (a commanded TWR at 60% throttle), fix, golden diff.
- [ ] Remove both rows from `docs/plans/backlog/README.md`.

### Task 6: Close

- [ ] `docs/reference/physics-model.md`: the body-axis aerodynamics, the entry schedule with its sweep, CoP, fins, RCS, every source and tier-B assumption.
- [ ] Remove the backlog rows this phase answers.
- [ ] Full gate, `npm run test:e2e:full`, `npm run mutation` (a mutant per new model), truth report, the `code-review` skill at `high`, and an independent physics reviewer (`cross-agent-review`).
- [ ] Merge `claude/entry-on-lift` to `main`, verify the deploy, tick Phase 6b in the roadmap, write the Phase 7 plan with `superpowers:writing-plans`.
