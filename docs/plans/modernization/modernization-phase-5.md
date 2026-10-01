# Phase 5 — Guidance on real physics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The autopilot sizes its burns, throttles and triggers from the simulation's own gravity, thrust and drag, and the HUD's impact predictor integrates the same drag the simulation does, so Phase 6 can make the aero real without breaking every landing.

**Architecture:** One allocation-free guidance-physics module in `src/core/autopilot/` answers the questions guidance asks: local gravity, thrust available at the current air pressure, drag deceleration, and the altitude a burn needs, found by integrating those forward. The flat `C.gravity` comes out of every guidance and throttle law, one law per task. Each task is a Fidelity change that re-blesses the goldens once, with an audit row, and every scenario still lands. The HUD predictor is rebuilt on the same functions.

**Tech Stack:** TypeScript, Vitest, fast-check; the golden, reference-band and mutation harness from Phase 2.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 5; [.agents/skills/physics-change-policy](../../../.agents/skills/physics-change-policy/SKILL.md); [docs/reference/physics-model.md](../../reference/physics-model.md).

## What the code actually does (mapped 2026-10-01)

The roadmap said the autopilot and the predictor use g = 9.807 and `airResistance_k = 250`. Mapping the code corrected that:

- **The autopilot never reads `airResistance_k` or the free-fall predictor.** `getFreeFallTimeRemainingPrediction` (`src/core/physics/prediction.ts`) is re-exported and never called; `autopilot.freeFallTimeRemainingPrediction` and `finalXPosPrediction` are dead fields, `@Infinity` in every golden. `airResistance_k` is read only by the HUD predictor (`src/hud/prediction.ts`), whose comment wrongly says the simulation integrates it. The simulation integrates `aero.getDrag` with a Mach-dependent coefficient and an attitude-dependent area (`step.ts`).
- **The flat g is real, and in eight places** (`C.gravity = 9.807`; true surface gravity in the simulation is 9.731):
  - The landing-mode choice and the suicide-burn altitude: `autopilot/index.ts`, `updateBellyFlopTriggerAltitude`.
  - The flip trigger built on that altitude.
  - `finalStagePessimisticAltitude` (sea-level thrust, constant deceleration, no drag).
  - Boost-back's `decelerationStageHorizontalAcc = gravity × 1.6` and its throttle.
  - The TWR throttle laws `controlEnginebyTWR`, `…EffectiveVerticalTWR` and `getTWR` (`control/primitives.ts`). Every landing, including the intro's, runs through these.
- **Deorbit already uses real models**, except `DEORBIT_ENTRY_RANGE = 838 km`, which is fitted to today's `autoLand` and goes stale when it changes.

## Global Constraints

- Every change to `src/core` names its tier (`physics-change-policy`). The guidance changes are **Fidelity, approved by this plan**. Helpers that must not change numbers are **Refactor**, with a ≤ 1 ULP proof in `tests/proofs/`.
- One golden re-bless per task: predict which scenarios move before regenerating, add an audit row to `tests/golden/unification.test.ts`, and land code, fixtures and the row in one commit.
- `npm run truth:report` before and after each Fidelity task, both pasted into the commit body. No tier-A band may leave its band.
- `tests/flies-every-scenario.test.ts` stays green at every commit: booster-sep, rtls, before-flip, landing-burn and reentry land with |vY| < 10 m/s, and the intro hands over. The deorbit demo lands within 10 km.
- **The intro is protected** (AGENTS.md). It must still auto-land, with the same engine sequence (which engines are lit at touchdown) and touchdown within ±0.5 s of today. If a change moves either, park that task for Steve rather than retune the intro.
- No tuning constant is moved to make a test pass. A new constant is a physical quantity with a cited source, or an explicit safety margin named as one, with its reason.
- The guidance path allocates nothing per step (`sim-core-conventions`); a forward integrator reuses one scratch object.
- Files ≤ 500 lines; `src/core/autopilot/index.ts` is already large, so new logic goes in new files.

## Review Focus

- **A scenario that lands today but stops landing** because a corrected estimate removed hidden slack. The per-scenario landing margins (touchdown speed, propellant left, miss distance) are recorded before Task 1 and compared after every task.
- **The intro's touchdown shifting**: the engine-shutdown rule (`getTWR`) moves its boundary by about 0.8% when g changes. Task 3 measures the shutdown times before and after.
- **High-altitude starts** (reentry from 80 km+): local gravity and drag differ most from sea level there. The flip trigger must not fire early in thin air.
- **Engine-out landings** (one or two Raptors): the landing-mode choice compares thrust to weight, and both sides change.
- **A predictor that never converges**, for example a burn that cannot stop the vehicle: the integrator must return "no solution" in bounded steps, never loop.

---

### Task 1: Baseline and guidance truth tests

**Files:** create `tests/core/guidance-truth.test.ts`, `tests/golden/landing-margins.ts` (a script and table); modify `tests/mutations.json`.

- [ ] Record each scenario's landing margins under autopilot today: touchdown vertical and horizontal speed, propellant left, miss distance and time of touchdown. For the intro, also record each engine's shutdown time. Commit them as `tests/golden/landing-margins.json` with the script that produces them (`npm run margins`), so every later task diffs against it.
- [ ] Truth tests that do not depend on any tuning, and fail on today's code where it is wrong:
  - local gravity used by guidance equals `gravityAt(r)` with the centrifugal term (`verticalGravityAcceleration`);
  - the thrust guidance assumes equals `getTotalMaxThrust(running, airPressure)`;
  - a predicted stopping altitude for a full-thrust vertical burn matches a fine-step integration of `step()` within 2%, at 2 km, 10 km and 40 km starts.
  Mark today's failures `it.fails` with the reason. Each task turns its own into a plain `it`.
- [ ] Add guidance mutants to `tests/mutations.json` (flat g back into the TWR law; drag dropped from the stopping-altitude predictor). `npm run mutation` must catch them once the tasks below land.

### Task 2: The guidance-physics module (Refactor where it wraps, new where it predicts)

**Files:** create `src/core/autopilot/guidance-physics.ts`, `tests/core/guidance-physics.test.ts`; if density is needed allocation-free, add `densityAt(altitude)` beside `isaAtmosphere` with a ≤ 1 ULP proof against it in `tests/proofs/`.

**Interfaces (Produces):**
- `localGravity(state: SimState): number` — m/s², from `verticalGravityAcceleration(r, vt)`.
- `availableThrust(state: SimState, running: readonly boolean[]): number` — N, at the current air pressure.
- `dragDeceleration(state: SimState, speed: number, altitude: number): number` — m/s², from `getDrag`, `getBodyDragCoefficient(mach)`, the current cross-section and density.
- `burnStartAltitude(state, running, scratch): number | null` — m, the altitude at which a full-thrust burn started now would reach zero vertical speed at the touchdown height. Integrated in fixed steps with a step cap; `null` when the burn cannot stop the vehicle.

- [ ] Unit tests for each against hand-computed values at sea level, 10 km and 80 km, and the step cap (a vehicle that cannot stop returns `null` within the cap).
- [ ] fast-check: `burnStartAltitude` is monotonic in descent speed and in mass.

### Task 3: TWR throttle laws on local gravity (Fidelity)

**Files:** `src/core/control/primitives.ts` (`controlEnginebyTWR`, `controlEnginebyEffectiveVerticalTWR`, `getTWR`), tests.

- [ ] Replace `C.gravity` with `localGravity(state)` in the three laws. `C.gravity` stays for the non-guidance uses (TWR display, felt g, the g-limit check), which are Phase 6's.
- [ ] Measure the intro before and after: engine shutdown times, engines lit at touchdown, touchdown time. Inside the constraint → re-bless with an audit row. Outside it → park the task for Steve with the numbers, and continue to Task 4 on the old law.
- [ ] Every scenario lands; margins diffed against Task 1's table in the commit body.

### Task 4: Burn sizing and the flip trigger on the predictor (Fidelity)

**Files:** `src/core/autopilot/index.ts` (`updateBellyFlopTriggerAltitude`, the horizontal-adjustment exit), a new `src/core/autopilot/landing-burn.ts` holding the sizing, tests.

- [ ] Landing-mode choice (1, 2 or 3 engines) compares `availableThrust` × the existing 0.8 safety factor (named and documented as a margin) with `mass × localGravity`.
- [ ] `bellyFlopTriggerAltitude` and `finalStagePessimisticAltitude` come from `burnStartAltitude` plus the flip duration and the half-vehicle height. The sea-level-thrust pessimism and the `+1 s` become one explicit, documented safety margin, sized from Task 1's measured margins.
- [ ] Reentry, before-flip and landing-burn (with and without headwind) land. The engine-out landing tests in `tests/core/autopilot-stages.test.ts` pass.

### Task 5: Boost-back on real deceleration (Fidelity)

**Files:** `src/core/autopilot/index.ts` (`autoBoostBack`), `src/core/constants.ts` (`decelerationStageHorizontalAcc`).

- [ ] Express the deceleration target as a TWR against `localGravity`, not `gravity × 1.6`; the MECO and time-to-site estimates use `availableThrust` at the current pressure.
- [ ] booster-sep and rtls fly back and land; their goldens re-bless with an audit row.

### Task 6: Deorbit's entry range, re-derived (Fidelity)

**Files:** `src/core/constants.ts` (`DEORBIT_ENTRY_RANGE`), `tests/core/orbit-demo.test.ts`, a measuring script.

- [ ] Re-measure the downrange distance `autoLand` covers from the 80 km handover after Tasks 3–5, with the script committed. Replace 838 km with the measured value and its derivation in the comment.
- [ ] A test that fails when the constant and the measurement disagree by more than 2%, so the next guidance change cannot leave it stale silently.

### Task 7: The HUD predictor on the simulation's drag

**Files:** `src/hud/prediction.ts`, `tests/hud/prediction.test.ts`; `src/core/constants.ts` (`airResistance_k`), `src/core/physics/prediction.ts`.

- [ ] Rebuild `predict()` on `localGravity`, `dragDeceleration` and the same forward integration, and delete the false comment. Tighten the error bounds against the goldens in `prediction.test.ts` to what the new predictor achieves, and record both before and after.
- [ ] Delete `airResistance_k`, the unused core free-fall predictor and the two dead autopilot fields. The fields are in every golden, so this re-blesses with an audit row that says only keys were removed.

### Task 8: Close

- [ ] `docs/reference/physics-model.md` gains a "Guidance" section: what guidance assumes, the predictor, and the named safety margins.
- [ ] The backlog rows this phase answers are removed (the `airResistance_k` row; `horizontalSteering` calling `precisionAlignment` twice, if Task 4 resolves it).
- [ ] Full gate, `npm run mutation` (the guidance mutants caught), `npm run truth:report`, `/code-review high`, and an independent reviewer for the physics. Merge, verify the deploy, tick Phase 5, write the Phase 6 plan.
