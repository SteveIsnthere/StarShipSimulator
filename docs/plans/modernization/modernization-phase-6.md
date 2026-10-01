# Phase 6 — Ship realism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Ship flies on the real planet with its real engines, aerodynamics, heat shield, wind and RCS. Every model has stated units and a named source, and every Ship scenario still lands under the autopilot.

**Architecture:** One model change per commit, ordered by the dependency graph below so that each lands on a green gate. The planet comes first, then a landing reserve so later changes have margin to spend. Then the engines, the aerodynamic group, heat, the air and RCS. The rotating frame comes last: it has the largest reach and the least gameplay value.

Each change is a Fidelity commit:
- goldens regenerated on the recording platform, with an audit row;
- the truth report before and after;
- every scenario landing.

A task that cannot meet that is reverted and parked under the stop rule, and its dependents park with it.

**Tech Stack:** TypeScript, Vitest, fast-check; the Phase 2 truth harness; the Phase 5 guidance predictor; `.github/workflows/golden-regenerate.yml`.

**Spec:** [modernization-roadmap.md](modernization-roadmap.md) Phase 6; [physics-change-policy](../../../.agents/skills/physics-change-policy/SKILL.md); [docs/reference/physics-model.md](../../reference/physics-model.md); the backlog rows tagged 6.

**Reviewed** 2026-10-01 by a fresh in-harness reviewer that had not seen the plan (Codex unavailable: its configured model is not supported with a ChatGPT login). The critical findings are folded in:
- `dumpLimit` is also the ascent's MECO and a boost-back exit.
- The Sutton-Graves units.
- The frame change's blast radius.
- Missing public data.
- The run's most likely failure mode.

## Decisions taken for Steve (2026-10-01, unattended; he is buying these)

| Question | Decided | Why |
|---|---|---|
| The tile's failure limit | NASA Shuttle HRSI reuse limit, **1,260 °C (1,533 K)**, a tier-B analogue (NASA Orbiter TPS fact sheet) | Starship's tile limit is not public. Naming the limit before the run stops the agent picking whichever number passes. If the deorbit cannot survive it, Task 8 parks; the limit never moves. |
| The six-engine UI | **Minimal in Phase 6** (six marks, a toggle each); the look is Phase 8's | Phase 8 rebuilds the HUD anyway. |
| What *Engines* (all) lights | **The three sea-level engines**, as the 2021 control did | Parity and the intro keep their meaning. RVacs are lit individually, or by guidance in vacuum. |
| The rotating frame | **Rotating ground frame** (the pad stays fixed); surface speed at **Starbase's 26°N, about 418 m/s eastward**; the editor's speeds stay ground-relative; **done last** | It keeps every pad-relative consumer unchanged. 26°N is where the vehicle flies from. |
| Spool-up | **Folded into the existing ignition transient** as one named tier-B assumption, not a second invented transient | No public start-transient data exists; the 0.3–1.2 s delay already stands in for it. |

## Where each model stands (mapped 2026-10-01)

| Item | Today | Pinned by |
|---|---|---|
| Planet | R = 6,400 km; GM computed twice, as `MU` (`gravity.ts:35`) and inline (`state.ts:520`). Pad gravity is 9.731. `earth.radius` is tier-A and OUT | `physical-scale.test.ts:107`, `orbit-demo.test.ts:130-173`, `ENTRY_RADIUS`, `HALF_LAP`, the preset speeds |
| Dump / reserve | `dumpLimit = 12 t` is three things: the landing dump target (`autopilot/index.ts:253`), autoTakeOff's MECO (`:110`) and a boost-back exit (`:200`) | engine-out deorbits land with 0.1–0.2 t |
| Engines | 3 identical sea-level Raptors as 3-tuples (`state.ts:23`); instant thrust after a 0.3–1.2 s ignition delay. `toggleAllRaptors` is used by the intro (`scenarios.ts:328`) and autoLand (`index.ts:254, 489`). `ship.engine.count` is tier-A and OUT | `physical-scale.test.ts:200`, `ignition.test.ts`, engine-out tests, HUD, audio, view, controls |
| Drag | Cd = 1.153 + 0.1347·M, capped at 2.5; area with an unexplained `/2.1` | `speed-of-sound.test.ts:70`, the predictor tests, goldens |
| Lift / CoP | Hand-tuned five-segment Cl, applied at the CoM; no body moment | goldens, `autopilot-stages` |
| Fins | Torque only; body area ×1.8 | `fin-fraction.test.ts`, `control-contracts` |
| Heat | Instantaneous flux; one unit is 1 kW/m² (re-entry peaks at 246); `heatLimit = 389` | `physical-scale.test.ts:38-69`, `flies-every-scenario.test.ts:146`, visual and audio scales |
| RCS | 800 kN at the nose arm, torque only, a 25 s reserve. The autopilot leans on it through the whole aero descent (`index.ts:136, 251`; `primitives.ts:162`) | `rcs-dead-zone.test.ts`, `physical-scale.test.ts:159-181` |
| Air | One constant wind; gust always 0 | `wind.test.ts`, `scenarios.test.ts:216`, the headwind golden |
| Frame | No rotation; the state is already polar (`gravity.ts:47-100`) | `analytic-laws`, `angular-momentum`, `verlet`, `orbit` (never re-blessed), `orbit-demo` |

## Dependency graph

```
1 ─ 2 ─ 3 ─ 4a ─ 4b ─ 4c
          └─ 5a ─ 5b ─ 6 ─ 7 ─ 11
                └─ 8
     10 (independent once 2 lands)       9a ─ 9b (last, independent)
```

A parked task parks everything downstream of it. Independent branches continue.

## Global Constraints

- **Tier and goldens:**
  - Fidelity, approved by this plan, unless a task says Bug fix or Refactor. A Bug fix puts the failing test first; a Refactor needs a ≤ 1 ULP proof.
  - Goldens regenerate only on the recording platform: push `golden/<task>`, take the `golden-fixtures` artifact, and commit it with the code and the audit row.
  - Predict which scenarios move before regenerating.
- **Iterate locally first.** Use `GOLDEN_PREVIEW=1 npm run golden:regenerate`, `flies-every-scenario`, `orbit-demo`, `deorbit-range`, `engine-out-landings` and `npm run margins`, all local. Push `golden/<task>` only when the task is green locally; at most two pushes per task. If hosted CI cannot run, stop the Fidelity work and say so: fixtures cannot be committed without it.
- **Truth report before and after,** pasted into the commit:
  - A tier-A row never leaves its band.
  - A row that comes into band joins `in-band.json` in the same commit.
- **Green at every commit:**
  - `flies-every-scenario`;
  - the intro handing over;
  - `orbit-demo` (deorbit within 10 km);
  - `deorbit-range` (miss under 1 km, the engine-out deorbits with propellant > 0); re-derive `DEORBIT_ENTRY_RANGE` with `npm run deorbit:range` in the same commit when it moves;
  - `engine-out-landings`;
  - margins diffed in the commit body.
- **The intro is protected, against a fixed anchor:**
  - Touchdown within ±0.5 s of **9.775 s on seed 1463897163**, cumulatively across the whole phase, not re-based per task.
  - No engine lit at touchdown.
  - It lights sea-level engines only, and has no turbulence.
- **What counts as tuning, which is never a principled attempt:**
  - changing any constant in `constants.ts` that has no named source;
  - changing autopilot schedules (`aomAt_*`, `flipTriggerCeiling`, speed limits, trims);
  - changing a limit.
  A principled attempt changes the model toward its source.
- **Stop rule:** two principled attempts per task; then revert, park it and its dependents with numbers in the handover, and continue on an independent branch. Wall-clock cap: a task that has not landed after about four hours of work is parked the same way.
- **Sources:**
  - Every new constant names its source in a comment.
  - Starship data that is not public is a tier-B assumption. It is named as such, never gates, and is listed in the close-out.
  - Named in advance:
    - drag: Hoerner, *Fluid-Dynamic Drag* (1965), and USAF DATCOM;
    - crossflow / CoP: Jorgensen, NASA TR R-474 (1977), and Allen & Perkins, NACA Report 1048;
    - hypersonic: modified Newtonian;
    - heating: Sutton & Graves, NASA TR R-376 (1971);
    - tiles: NASA Orbiter TPS fact sheet (HRSI);
    - wind: NASA TM-2008-215633;
    - turbulence: Dryden, MIL-HDBK-1797 / MIL-F-8785C;
    - RVac: Wikipedia's Raptor article (tier B);
    - Earth: IERS 2010 / WGS 84.
- **Never-re-blessed truth tests stay true:** Kepler, vis-viva, energy, angular momentum, ISA.
- **Performance:**
  - the sim step stays under 1 ms;
  - nothing new allocates per step;
  - `src/core` files over 500 lines do not grow.
- **UI:** minimal and functional in this phase, using the design system's existing components. Test ids are extended, never repurposed; `parity.spec.ts` stays green.

## Review Focus

- **Spool-up and the engine-out cases:** the reserve (Task 3) is measured, not computed (see Task 3), so an engine change that makes landing costlier must fail `deorbit-range.test.ts` and re-measure it.
- **Halved entry drag:** a hypersonic broadside Cd of about 1.2–1.3 against today's cap of 2.5 roughly halves entry drag. Re-entry and the deorbit move hard in Task 5b.
- **RCS authority in the descent:** realistic cold-gas RCS can take attitude authority from the belly-flop. Tasks 6 and 7 record the RCS share of control torque, so Task 11's feasibility is known early.
- **A heat criterion on a knife edge:** at ε = 0.85 the deorbit peak is about 1,600 K against a 1,533 K limit. That is the expected park, not something to fix.
- **The rotating frame and the never-re-blessed tests:** they are proved by transforming to inertial, and at ω = 0 the frame must be bit-identical (Task 9a).

---

### Task 1: Baseline, bug fixes, and the Phase 5 leftovers

**Baseline, 2026-10-01** (at 6b9f640, the tank-empty fix, which moved no golden):

- Margins (`landing-margins.json`): every landing lands; miss 0.5 m (landing burn), 1.5 m (before
  flip), 3.5 m (booster sep), 3.8 m (RTLS), 12.8 m (headwind); propellant at touchdown 1.41–12.72 t.
  Engine-out: one-out lands both, landing-burn two-out crashes (as before Phase 6).
- Deorbit: lands, range 857.39 km against `DEORBIT_ENTRY_RANGE` 838 km, miss 0.01 km.
- Truth report: 6 of 8 rows in band; out are engine count (3 against 6) and Earth's radius
  (6400 km, ×1.004). Tasks 2 and 4 own both.
- Intro: touchdown 9.775 s, no engines lit, shutdowns at 2.392, 2.400 and 9.725 s.

After Task 1's fixes: identical outcomes to within 0.4 m of miss and 0.03 t of propellant; the deorbit
range and the intro anchor unchanged to the digit. Felt g moves only the three `perceivedG` keys of
all eight goldens; the thermosphere moves only booster-sep (the one flight above 86 km); the starting
Mach moves the six flights that start moving below re-entry, from their first step's drag, and
re-entry only in its first sample's Mach (its first-step drag coefficient is the same at either
Mach); launch-pad starts at rest and moves only in felt g.

- [x] Record the phase baseline: `npm run margins`, `npm run deorbit:range`, `npm run truth:report` and the intro anchor (9.775 s), as a dated note in this plan.
- [x] Bug fixes, failing test first each. They may share one golden regeneration if CI time is scarce.
  - The emptying step applies a full step of thrust from the last kilograms (`engines.ts:128`): scale the thrust by the propellant actually burned.
  - Emptying the tank does not cancel a pending ignition (`step.ts:260-263`): cancel it.
  - Thermosphere temperature (`isa.ts`): the US Standard Atmosphere 1976 profile above 86 km. Prove first that `pressureInLayer` and the density chain cannot read it, so density is unchanged.
  - The g-limit reads net acceleration (`step.ts:186`): use felt g, (thrust + aero) / g0.
  - A scenario's first step uses Mach against 343 m/s (`scenarios.ts:293`): use the speed of sound at the starting altitude.
- [x] Refactors, each with a proof:
  - Delete the unused legacy exports. **Moved** to `tests/proofs/fixtures/legacy-ladders.ts`, frozen, where the three proofs that compare against them import them.
  - `horizontalSteering`'s double `precisionAlignment`: keep it and document why, or prove a single call reproduces the goldens. **Kept**: a single call moves the landing-burn-autoland and landing-burn-headwind goldens (the first call's `rcsThrustCommand` survives the second).
  - Move the RTLS apogee-before-MECO row to `physics-model.md` as a description.

### Task 2: The planet (Fidelity)

- [x] `MU` becomes the one cited constant: 3.986004418e14 m³/s² (IERS 2010 / WGS 84). Delete `planetMass` and `gravitationalConstant`, and the inline copy in `state.ts:520`.
- [x] R = 6,371.0 km (mean radius). Pad gravity becomes 9.820 m/s².
- [x] Note that `isa.ts:125` uses `planetRadius` for geopotential, where the 1976 standard uses r₀ = 6,356,766 m. Either switch to the standard's r₀ (cited), or record the deviation. **Switched** to r₀: the tables are defined against it, and the thermosphere already used it.
- [x] Derived values follow from the constants, never retyped: the preset circular speeds, `starBaseXPos`, `HALF_LAP`, `ENTRY_RADIUS` and the view's horizon.
- [x] Rewrite the tests that state the old numbers from the formula, not from new literals: `physical-scale.test.ts:107`, `orbit-demo.test.ts:130-173`, `menu.test.ts:237`, `atmosphere-look.test.ts:48`.
- [x] `earth.radius` joins `in-band.json`; `orbit.circular.200km` stays in.
- [x] Re-derive the deorbit range. Every scenario lands; the intro holds against the anchor. Golden re-bless: all eight.

**Done 2026-10-01**, with Task 3 on one regeneration (audit P6.2, P6.3): Task 2 alone ran the one-engine-out deorbit to 0.000 t. Deorbit aim re-measured at 841.4 km; the intro touches down at 9.85 s (+0.075 s).

### Task 3: A landing reserve (Fidelity)

- [x] Add a new `landingReserve`, used **only** at the dump target (`autopilot/index.ts:253`). `dumpLimit` keeps its MECO (`:110`) and boost-back (`:200`) meanings untouched. autoLand also stops its own dump at the reserve, since the engine model stops a dump only at `dumpLimit`.
- [x] ~~The reserve is computed at run time from `landingBurnStartAltitude`~~. **Changed, 2026-10-01 (decided unattended):** measured, not computed. The formula (one engine from the trigger plus the ignition delay) gives 6.3 t, but the landing programme spends 12.0 t engine-out from the trigger to touchdown (1.5 t flip, 8.3 t horizontal adjustment, 2.2 t final descent), so a computed reserve would crash every deorbit. `landingReserve` = 16 t, the worst engine-out use plus a third, with a health check like `DEORBIT_ENTRY_RANGE`'s. Task 4's engine changes must re-measure it if that check fails.
- [x] Predicted to move: the deorbit and the landers that dump. **Measured:** re-entry and RTLS in their golden windows (before-flip's dump is cut by the flip first). Booster-sep and RTLS DO move in outcome (their boost-backs hand over to autoLand): the prediction "not the boost-backs" was wrong.
- [x] `deorbit-range.test.ts` asserts every one-engine-out deorbit lands with at least an eighth of the reserve, 2 t (measured 3.0 t); the plan's "half the reserve" would have needed a 24 t reserve. Margins diffed (audit P6.3).

### Task 4: Six Raptors (split in three)

**4a, Refactor.** Engine arrays of length N with a per-engine type (sea level or vacuum), still three sea-level engines.
- [ ] Rows unchanged, proved by the golden digests. Only the keys grow if the arrays' recorded shape changes; regenerate only if it does.
- [ ] Every 3-tuple consumer is generalised: `RaptorIndex`, `getWorkingEngineCount`, the shutdown order, the trims, the HUD, audio, view and controls.

**4b, Fidelity: three RVacs in the core.**
- [ ] Thrust is F = F_vac − p_a·A_e from a tier-B vacuum thrust and Isp and exit diameter (Wikipedia's Raptor article, named as tier B). There is no flow-separation refusal: Ships fire all six at sea level in static fires.
- [ ] The **autopilot** does not light RVacs below a stated altitude; that is a guidance rule, not physics. The player may.
- [ ] RVac ignition draws come from their own RNG stream (or strictly after the sea-level draws), so the intro's delays cannot shift.
- [ ] `toggleAllRaptors` lights the sea-level engines only (the decision above), so the intro and autoLand's calls are unchanged.
- [ ] The landing ladder, shutdown order and trims key on sea-level engines.
- [ ] `ship.engine.count` comes into band and joins `in-band.json`. Engine-out landings extend to sea-level failures.
- [ ] Every scenario lands; the intro holds.

**4c: the start transient.**
- [ ] The existing ignition delay is the named tier-B start-transient assumption; no spool-up is added on top.
- [ ] The landing-burn predictor and the reserve account for the transient's maximum, not its mean, so the trigger covers the worst start.
- [ ] Re-assert the engine-out reserve test.

**UI (minimal).**
- [ ] Six engine marks in two labelled groups, and a toggle per engine, from existing components.
- [ ] Test ids `raptor-0`…`raptor-5`, the first three keeping their meaning. Engines (all) keeps its 2021 behaviour.
- [ ] `parity.spec.ts` stays green. The look is Phase 8's.

### Task 5: Drag (split in two)

**5a: the area.**
- [ ] Replace the `/2.1` with the geometric nose-on area of a 9 m cylinder. The cross-section becomes the projected area at the attitude.

**5b: Cd.**
- [ ] A Mach curve per regime from the named sources: a broadside blunt cylinder (crossflow Cd vs Mach, Jorgensen / Hoerner) and a nose-on cone-cylinder (DATCOM), blended by the angle into the wind.
- [ ] Hypersonic broadside Cd is about 1.2–1.3, not the 2.5 cap. Expect re-entry and the deorbit to move hard.
- [ ] The predictor follows automatically. Re-derive the deorbit range; every scenario lands, or the task parks.

### Task 6: Normal force and centre of pressure (Fidelity)

- [ ] The body normal force acts at a centre of pressure from slender-body theory plus crossflow (Allen & Perkins; Jorgensen), giving a moment about the moving CoM.
- [ ] It replaces the hand-tuned Cl curve. Whether the belly-flop's feel survives is recorded with numbers; if it is lost, that is a finding, not a tuning target.
- [ ] Attitude control includes the aerodynamic moment as a known term.
- [ ] Record the RCS share of control torque through the descent, for Task 11.
- [ ] A belly-flop that is statically unstable beyond the fins' authority is a finding for Steve, recorded and parked, not tuned away.

### Task 7: Fins as surfaces (Fidelity)

- [ ] Each fin pair produces lift and drag (a force and a moment) at its own arm, from its area and deflection. This replaces the torque-only model and the ×1.8 body area, and the fin-authority estimate calls the same function.
- [ ] Re-record the RCS share of control torque.
- [ ] The horizontal adjustment's ±5 m/s cap is checked against the new dispersion; widening it is a schedule change, so it does not count as a principled attempt.

### Task 8: The heat shield (Fidelity)

- [ ] Convective flux from Sutton & Graves (NASA TR R-376) with **k = 1.7415e-4 kg^0.5/m, in W/m²**. Peak flux in physical terms is about 1,000 × today's number; the old "unit" was 1 kW/m².
- [ ] Surface temperature at **radiative equilibrium**, T = (q / εσ)^¼, with the tile emissivity from the TPS fact sheet. A thin surface lag only if cited.
- [ ] Failure at the decided limit: **1,533 K (HRSI 1,260 °C), tier-B**.
- [ ] Consumers in stated units: the HUD (K), the visual and audio scales, the black box and the debrief.
- [ ] The re-entry assertion in `flies-every-scenario` bands the **flux** (or temperature within ±5% of the measured value), not "60–100% of the limit", which T ∝ q^¼ makes nearly vacuous.
- [ ] If the deorbit cannot survive the limit, the task parks. That is the expected outcome on today's numbers, and the limit does not move.

### Task 10: Wind profile and seeded turbulence (Fidelity; independent of 5–9)

- [ ] Mean wind with altitude from NASA TM-2008-215633, scaled by the scenario's surface wind.
- [ ] Dryden turbulence (MIL-HDBK-1797 / MIL-F-8785C) from its own seeded RNG stream, keyed so the ignition draws do not shift.
- [ ] None in the intro. `flies-every-scenario` determinism holds. The editor's wind keeps its meaning; gust stays out of the editor.

### Task 11: RCS (Fidelity; after 6 and 7)

- [ ] Flown Ships use cold-gas nitrogen thrusters with no published thrust, so the thrust and reserve are a named tier-B assumption with its reasoning. The reserve becomes gas mass.
- [ ] Off-axis thrusters translate as well as turn.
- [ ] Using Tasks 6 and 7's recorded RCS share: if realistic RCS cannot hold the belly-flop, the descent keeps attitude on fins and gimbal, the way the real vehicle does. The vacuum flip moves to the gimballed engines if the RCS cannot do it before the firing point.

### Task 9: The rotating frame (last; split in two)

**9a, Refactor.**
- [ ] Integrate in the rotating ground frame, adding Coriolis and centrifugal terms (a_r += 2ωv_t + ω²r, a_t −= 2ωv_r) to the existing polar integrator, with ω a parameter.
- [ ] At ω = 0, bit-identical (golden digests unchanged).

**9b, Fidelity.**
- [ ] ω = Earth's sidereal rate (cited). The surface speed along the flight is Starbase's 26°N (about 418 m/s); +x is east (prograde).
- [ ] The touchdown check (`step.ts:144`, |speedX| < 2) reads ground-relative speed, which it already is.
- [ ] Orbital presets (`CIRCULAR`, `scenarios.ts:218`) are stated inertial and converted to ground-relative.
- [ ] The never-re-blessed truth tests are proved by transforming to the inertial frame.
- [ ] Re-derive the deorbit aim; every scenario lands.

### Task 12: Close

- [ ] `docs/reference/physics-model.md` rewritten to the new models, with every source and every tier-B assumption listed.
- [ ] Remove the backlog rows this phase answers, and list every parked task with its numbers.
- [ ] Full gate, `npm run mutation` (with a mutant per new model), truth report, `/code-review high`, and an independent physics reviewer.
- [ ] Merge, verify the deploy, tick Phase 6, write the Phase 7 plan.
