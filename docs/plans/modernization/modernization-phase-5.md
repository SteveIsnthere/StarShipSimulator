# Phase 5 — Guidance on real physics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The autopilot sizes its burns, throttles and triggers from the simulation's own gravity, thrust and drag, and the HUD's impact predictor integrates the same drag the simulation does. Phase 6 can then make the aero real without breaking every landing.

**Architecture:** One allocation-free guidance-physics module in `src/core/control/` answers the questions guidance asks:
- local gravity;
- thrust for a given engine count at a given air pressure;
- drag deceleration at a given attitude;
- the altitude a landing burn must start at, found by integrating backward from touchdown.

The flat `C.gravity` comes out of the guidance and throttle laws one law per task. Each task is a Fidelity change that re-blesses the goldens once, with an audit row, and every scenario still lands. The HUD predictor is then rebuilt on the same functions.

**Tech Stack:** TypeScript, Vitest, fast-check; the golden, reference-band and mutation harness from Phase 2.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 5; [.agents/skills/physics-change-policy](../../../.agents/skills/physics-change-policy/SKILL.md); [docs/reference/physics-model.md](../../reference/physics-model.md).

**Reviewed** 2026-10-01 by a fresh in-harness reviewer that had not seen it (Codex unavailable: its configured model is not supported with a ChatGPT login). Its ten findings are folded in below.

## What the code actually does (mapped 2026-10-01)

The roadmap said the autopilot and the predictor use g = 9.807 and `airResistance_k = 250`. Mapping the code corrected that.

**`airResistance_k` and the free-fall predictor are HUD-only.**
- The autopilot reads neither.
- `getFreeFallTimeRemainingPrediction` (`src/core/physics/prediction.ts`) is called only by `src/hud/prediction.ts:186`.
- `autopilot.freeFallTimeRemainingPrediction` and `finalXPosPrediction` are dead fields, recorded as `@Infinity` in every golden.
- `src/hud/prediction.ts` wrongly says the simulation integrates `airResistance_k`. The simulation actually integrates `aero.getDrag`, with a Mach-dependent coefficient and an attitude-dependent area (`step.ts`).

**The flat g is real, in nine sites:**

| Site | What it computes |
|---|---|
| `autopilot/index.ts:190` | Boost-back throttle, as `decelerationStageHorizontalAcc / C.gravity`. The target is a horizontal acceleration, so g should cancel. |
| `:283`, `:287` | The thrust ladder that picks the pessimistic thrust and duration estimate. The `dualRaptorMode` / `trialRaptorMode` flags it writes are never read. |
| `:295` | The suicide-burn altitude behind the flip trigger: constant deceleration per engine count, sea-level thrust, no drag. |
| `:416` | A second, different `finalStagePessimisticAltitude`, used by horizontal adjustment: the running engines, plus 1 s, plus half the vehicle height, with the `*1.1` exit at `:459`. |
| `constants.ts:478` | `decelerationStageHorizontalAcc = gravity × 1.6` |
| `control/primitives.ts:280`, `:336`, `:463` | The TWR laws. Every landing runs through them, including the intro's. So do the ascent (`speedAdjustment`, `:443`) and boost-back. |

**Deorbit already uses real models**, except `DEORBIT_ENTRY_RANGE = 838 km`. That constant is fitted to today's `autoLand` from the entry interface, and it goes stale whenever `autoLand` changes.

**Two files are already over the 500-line ceiling:** `autopilot/index.ts` (766 lines) and `primitives.ts` (560). Do not grow them, and do not split them inside this phase. New logic goes in new files.

## Global Constraints

**Stop rule, as used in Task 4:** two principled attempts at the margin; the second (none) passed.

**Baseline (Task 1, 2026-10-01).** The burn slack runs from −20.2 m (landing-burn, where the old estimate was optimistic) to +68.2 m (before-flip). Engine-out: landing-burn with two engines out crashes today; the other three variants land. The intro touches down at 10.108 s with all engines off.

**Tiers and goldens**
- Every change to `src/core` names its tier (`physics-change-policy`). The guidance changes are **Fidelity, approved by this plan**. Helpers that must not change numbers are **Refactor**, with a ≤ 1 ULP proof in `tests/proofs/`.
- One golden re-bless per task:
  - Predict which scenarios move before regenerating, and name the prediction in the commit body.
  - Add an audit row to `tests/golden/unification.test.ts`.
  - Code, fixtures and the row land in one commit.
- Run `npm run truth:report` before and after each Fidelity task and paste both into the commit body. No tier-A band may leave its band.

**Green at every commit**
- `tests/flies-every-scenario.test.ts` stays green: booster-sep, rtls, before-flip, landing-burn and reentry land with |vY| < 10 m/s, and the intro hands over.
- The deorbit demo lands within 10 km (`orbit-demo.test.ts`). **Every Fidelity task re-measures the deorbit entry range** with Task 1's script, and updates `DEORBIT_ENTRY_RANGE` in the same commit if it moved.

**The intro is protected** (AGENTS.md)
- It must still auto-land, with the same engines lit at touchdown and touchdown within ±0.5 s of today.
- Measure it on the intro golden's seed (`tests/golden/scenarios.ts`, seed 1463897163).
- If a change misses either criterion, park that task for Steve rather than retune the intro.

**Constants and margins**
- No tuning constant is moved to make a test pass.
- A new constant is either a physical quantity with a cited source, or a safety margin named as one. A margin is computed by the formula this plan gives, never hand-tuned.

**The stop rule.** If a Fidelity task leaves any scenario unlanded after **two** principled attempts, where a principled attempt is a model correction rather than a margin change:
- revert the task;
- park it in the handover with the numbers;
- move on to the next task that does not depend on it.

Task 8 closes the phase with parked tasks listed and their truth tests left as `it.fails`, each with its reason.

**Performance**
- The guidance path allocates nothing per step (`sim-core-conventions`).
- A predictor call costs at most 1,200 midpoint sub-steps of 0.05 s (60 s of burn) per mass pass, and reuses one scratch object. Measured: 0.04–0.5 ms a call, about 0.1 ms at the flip trigger.
- `tests/view/perf.test.ts` (sim step under 1 ms) stays green.

## Review Focus

- **A scenario that lands today but stops landing**, because a corrected estimate removed hidden slack. Task 1 records each scenario's trigger slack and landing margins. Every task diffs against them.
- **The intro's touchdown shifting.** The shutdown rule (`getTWR`) moves its boundary by about 0.8% when g changes. Task 3 measures shutdown times before and after.
- **High-altitude starts** (reentry from 80 km and above). Gravity and density differ most from sea level there. The flip trigger must not fire early in thin air.
- **Engine-out landings** (one or two Raptors failed). Task 1 records which of these land today. None may stop landing.
- **A predictor that cannot stop the vehicle.** It returns `null` within the step cap, never loops, and the caller treats `null` as "start the burn now".

---

### Task 1: Baseline and measuring tools (no physics change)

**Files**
- Create:
  - `scripts/landing-margins.mjs` (as the `npm run margins` script in `package.json`);
  - `tests/golden/landing-margins.json`;
  - `tests/core/guidance-truth.test.ts`;
  - `tests/core/engine-out-landings.test.ts`;
  - `scripts/deorbit-range.mjs` (as `npm run deorbit:range`).

**Steps**
- [x] `npm run margins` writes, for every scenario under autopilot:
  - touchdown vertical and horizontal speed, propellant left, miss distance and touchdown time;
  - **at the moment the flip triggers**: the altitude and vertical speed; the autopilot's own burn estimate (`finalStagePessimisticAltitude`); the burn altitude the simulation actually needed; and their difference, the **burn slack**. The needed altitude is measured from a copy of the state, held upright, with every working engine lit at full throttle, by bisection for the lowest start that stops at touchdown height;
  - for the intro (seed 1463897163): each engine's shutdown time and the engines lit at touchdown.

  Commit the output. Every later task diffs against it in its commit body.
- [x] Engine-out baseline: full flights with one and with two engines failed from the start of the landing burn, on landing-burn and before-flip. The test asserts today's outcomes exactly as they are: those that land must land, and those that don't are recorded as such. It is a regression net, not a wish list.
- [x] `npm run deorbit:range` measures the deorbit flight and prints the re-derived `DEORBIT_ENTRY_RANGE`. The constant is the burn's aim, not the measured crossing-to-touchdown distance; that distance is 857 km against the 838 km constant, while the miss is 0.01 km. So the re-derived value is the constant plus the miss, and `tests/core/deorbit-range.test.ts` holds the miss under 1 km.
- [x] Behaviour truth tests that need no new module, so they compile today.

  **The throttle law at hover.** Set engines lit, throttle at 100 and pitch held. Then call `controlEnginebyEffectiveVerticalTWR(state, 1)` and take one `step()`.
  - Expected: vertical acceleration within 0.02 m/s² of zero, at 0, 10 and 80 km.
  - This fails today, because of the flat g. Mark it `it.fails`, citing the flat g.
  - Task 3 turns it into a plain `it`.
  - `controlEnginebyTWR` divides by thrust at `throttleCurrent` (`primitives.ts:281`), a 2021 quirk that a hover test exposes. It is out of scope: log it in the backlog, and build the test on the effective-vertical law.

  **The stopping altitude.** Each Task 4 test case lists its setup explicitly: engines already lit, throttle at 100, pitch held at 0°, start altitudes of 2, 10 and 40 km, and the descent speed. The expected values come from a fine-step `step()` run. The predictor itself is Task 2's, so this file only records the reference values here.

### Task 2: The guidance-physics module

**Files**
- Create `src/core/control/guidance-physics.ts` and `tests/core/guidance-physics.test.ts`.
- Create `isaAtmosphereInto(altitude, out)` beside `isaAtmosphere` (`isa.ts`). It writes temperature, pressure and density into a scratch object, with a ≤ 1 ULP proof against `isaAtmosphere` in `tests/proofs/` (Refactor).

**Interfaces (Produces)**
- `localGravity(state: SimState): number` — m/s², positive downward: `verticalGravityAcceleration(r, vt)` (gravity less the centrifugal term). **For instantaneous laws only**, Task 3's. Clamped to ≥ 0.1 m/s² so that near orbital speed a TWR law never divides by zero or flips sign.
- `thrustFor(engines: number, airPressureKPa: number): number` — N, `engines × thrustPerRaptorAt(p)`. It takes an engine **count**, because during aero descent every engine is off. Callers count engines that have not failed (`state.failures`).
- `tailFirstDragDeceleration(altitude: number, speed: number, mass: number, out: AtmosphereScratch): number` — m/s². Drag in the burn attitude, tail first, area from `getCrossSectionalArea` at 0°, `Cd` from `getBodyDragCoefficient(mach)`. **During a retro descent drag points up and helps the burn**, and the integrator applies it that way.
- `landingBurnStartAltitude(engines: number, mass: number, touchdownHeight: number, scratch: BurnScratch): number | null` — m.
  - Integrates **backward** from v = 0 at `touchdownHeight`.
  - At each altitude: full thrust at that altitude's pressure, `gravityAt(r(h))` (no centrifugal term: a future vertical burn is not at today's horizontal speed), the tail-first drag, and mass growing backward at the full-thrust flow rate.
  - Integration runs until the descent speed reaches the vehicle's current |vY|. That altitude is the start altitude.
  - Midpoint sub-steps of 0.05 s, cap 1,200 (60 s). The touchdown mass is solved by a secant iteration on the fixed point (current mass less the fuel the burn uses), seeded from the sea-level burn time. Returns `null` if the cap is reached, the deceleration is not positive, or the burn needs more propellant than the vehicle carries.

**Steps**
- [x] Unit tests for each function, against hand-computed values at sea level, 10 km and 80 km.
- [x] Test the `null` path: two engines on a full-mass vehicle at 300 m/s descent returns `null` within the cap.
- [x] Test that the clamp holds at orbital speed.
- [x] fast-check: the start altitude is monotonic in descent speed and in mass.
- [x] The Task 1 stopping-altitude cases pass against the fine-step references, within **2% of the burn distance or 20 m**, whichever is larger.
- [x] A per-call timing test in `*.timing.test.ts` stays under 0.2 ms at the flip-trigger state.

### Task 3: Boost-back target and the TWR laws on local gravity (Fidelity)

Boost-back goes first and in the same commit, because changing the TWR law under its `/ C.gravity` call site would silently cut boost-back thrust by about 0.8 to 4%.

**Files:** `src/core/autopilot/index.ts:190`, `src/core/constants.ts` (`decelerationStageHorizontalAcc`), `src/core/control/primitives.ts` (`controlEnginebyTWR`, `controlEnginebyEffectiveVerticalTWR`, `getTWR`), tests.

**Steps**
- [x] Convert boost-back's deceleration command to an acceleration target. The throttle comes from the required force, `mass × decel`, over the thrust at the current pressure, with no g in it. Keep the target value at its present 15.69 m/s² (`9.807 × 1.6`), now written as an acceleration with that derivation in its comment. Its MECO and time-to-site estimates use the same thrust.
- [x] Replace `C.gravity` with `localGravity(state)` in the three TWR laws. `C.gravity` stays for the non-guidance uses (the TWR display, felt g, the g-limit check), which belong to Phase 6.
- [x] **Predicted to move: all eight goldens**, because the ascent, the boost-back, every landing and the intro all run through these laws.
- [x] Measure the intro on its seed before and after. Inside the constraint, re-bless. Outside it, apply the stop rule and park.
- [x] Re-measure the deorbit range and update the constant if it moved.
- [x] Margins, engine-out outcomes and the hover truth test go in the commit body; the hover test turns into a plain `it`.
- [x] Add a mutant to `tests/mutations.json` in this commit: `localGravity(state)` back to `C.gravity` in `controlEnginebyEffectiveVerticalTWR`. The hover test must catch it.

### Task 4: Burn sizing and the flip trigger on the predictor (Fidelity)

**Files:** a new `src/core/autopilot/landing-burn.ts` holding the sizing; `src/core/autopilot/index.ts` (call sites only: `updateBellyFlopTriggerAltitude` at `:283-317`, horizontal adjustment at `:413-422`, `:459`); tests.

**Steps**
- [x] Remove the thrust ladder's dead flags (`dualRaptorMode`, `trialRaptorMode`). The ladder's engine count is capped by the engines not failed.
- [x] Compute both pessimistic altitudes from `landingBurnStartAltitude`:
  - **Trigger altitude** = the predicted burn on the **planned engine count** (2021's one-engine ladder, kept: it is the trigger's engine-out pessimism, a design choice), plus the flip's fall and the ignition mean, as before. **No added margin** (decided while building, 2026-10-01): the planned flat 100 m (from Task 1's burn slack, which turned out to compare a one-engine plan with an all-engines-from-cold burn, so it did not describe this) and a derived 0.9 s (ignition spread plus throttle slew) each flipped the vehicle earlier, and the longer hover ran the one-engine-out deorbit out of propellant. That flight lands with none to spare at baseline. The predictor is within a metre of the simulation, so a margin would only spend fuel.
  - **Horizontal adjustment** keeps its `+1 s` as a named margin and its `*1.1` exit, now on the predicted altitude with the engines running.
  - A `null` prediction means "start now" (also when the burn needs more propellant than is aboard).
- [x] Predicted to move: reentry, before-flip, landing-burn (with and without headwind). Moved: those, plus RTLS in its planning keys only (its window reaches the aero descent; the prediction was wrong, not the code). The intro, ascent and booster-sep do not move.
- [x] Engine-out outcomes do not get worse. Deorbit range re-measured. Margins in the commit body.
- [x] Add a mutant in this commit: drag dropped from the predictor. The Task 2 stopping-altitude cases must catch it.

### Task 5: The HUD predictor on the simulation's drag (no core physics change)

**Files**
- Modify `src/hud/prediction.ts` and `tests/hud/prediction.test.ts`.
- Delete:
  - `airResistance_k` (`constants.ts`);
  - `src/core/physics/prediction.ts`;
  - the two dead autopilot fields: `state.ts:389-391`, `:669-670`, and their resets in `autopilot/index.ts:212-213`.
- Update the references:
  - the allow-list in `tests/flies-every-scenario.test.ts:53-56`;
  - `tests/golden/replay.test.ts:126`;
  - the comment in `record.ts:151`.

**Steps**
- [x] Add `unpoweredFallInto(state, out)` to `guidance-physics.ts`: the 2D unpowered fall (gravity at altitude, drag at the current attitude, integrated to the ground into a scratch object), with unit tests against a `step()` run. Rebuild `predict()` on it, and delete the false comment.
- [x] Record the error bounds against the goldens in `prediction.test.ts`, before and after. Tighten them to what the new predictor achieves, never loosen.
- [x] Removing the dead fields changes the goldens' keys only. Re-bless with an audit row saying so: "keys removed, no row values changed". Verify that claim by diffing the rows blocks.

### Task 6: Close

- [x] `docs/reference/physics-model.md` gains a "Guidance" section. It covers what guidance assumes, the predictor, the named margins and their derivations, and the deorbit range's measurement.
- [ ] Remove the backlog rows this phase answers: the `airResistance_k` row. Remove `horizontalSteering` calling `precisionAlignment` twice only if Task 4 resolved it. Add the `controlEnginebyTWR` divide-by-`throttleCurrent` quirk as a new row.
- [ ] Run the full gate, `npm run mutation` (every guidance mutant from a landed task caught), `npm run truth:report` and `/code-review high`. Then send the physics to an independent reviewer that never saw it.
- [ ] Merge, verify the deploy, tick Phase 5 with any parked task named, and write the Phase 6 plan.
