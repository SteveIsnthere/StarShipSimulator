# Super Heavy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steve authorized native continuous execution of the entire roadmap; do not request a handoff approval again.

**Goal:** Fly an actual 33-Raptor Super Heavy from the preserved Booster Sep and RTLS presets to a tower catch, and simulate hot staging with two independently flying physical vehicles.

**Architecture:** Pass immutable vehicle definitions through the existing pure physics and guidance functions, keeping Ship as the default and preserving its arithmetic. Extract the current force/integration phases without changing order; compose the attached stack from the two vehicles' forces, mass and inertia, then release two states into that same integrator. One accumulator advances the mission; the framework-free session selects the controlled vehicle and feeds the camera, HUD and two renderers.

**Tech Stack:** TypeScript, Vitest, existing PixiJS 8 renderer, React 19 shell, Playwright; no new runtime or physics library.

**Spec:** `docs/plans/modernization/modernization-roadmap.md` Phase 7 and `modernization-GOAL.md`, including standing autonomy and Phase 6b's accepted broadside fallback.

## Global Constraints

- Preserve all six starting values of every existing preset, the intro trajectory/handover, all 2021 capabilities and the pig at x = 0.
- Ship defaults remain 50 m × 9 m, 120,000 kg dry, 1,200,000 kg capacity, three sea-level plus three vacuum Raptors. No parked Phase 6b aero or Earth-rate model is restored.
- Refactor tier requires a committed numerical proof ≤ 1 ULP; Fidelity is authorized by this Phase 7 roadmap. Analytic truth, bands, tile limit 1,533 K, coverage floors, burn caps and existing assertions never weaken.
- Physics goldens are recorded only on x86-64 Linux / Node 22, from the unfiltered set after truth/unit green; predict changed scenarios and audit every fixture. Mac previews are not fixtures.
- First-load JS ≤ 300 kB gzip; light gate ≤ 5 minutes on Steve's Mac; hosted CI ≤ 20 minutes. No per-frame React updates or duplicated integrator.
- `tests/fixtures/legacy/` and flight_sim are read-only. No history rewriting. No PR; each reviewed phase merges normally to main and deploys.
- Focused checks during implementation; complete gate, full browser, truth and mutation at phase release. After three failed diagnoses, obtain a fresh independent review and ledger a new approach before another bounded cycle.
- Phase 8 owns visual polish; Phase 9 owns final HUD look, input rebinding, gamepad, onboarding and menu readiness repair. Phase 7 must be fully usable without those later tasks.

## Review Focus

- Switching controlled vehicle during staging must change commands, telemetry and camera together; it must not steer the other vehicle.
- Fuel exhaustion or ignition failure on one vehicle must not borrow fuel, engines or RNG draws from the other.
- Catch-plane overshoot, excessive speed, attitude or position must fail capture; ground touchdown must never masquerade as a tower catch.
- Pause, warp, slow motion and restart must advance/reset both vehicles coherently without a second clock or stale attachment.
- Custom flights based on a booster preset retain the booster model and its capacity; intro and Ship presets retain their exact old model and capabilities.

## Source cohort and declared approximations

Use the historical Raptor 2 / four-grid-fin cohort matching the retained Block 1 Ship, not the current V3/Raptor 3 vehicle. FAA appendix https://www.faa.gov/media/94371 (PDF p108, printed p41) states approximately 71 m × 9 m; PDF p230 cites SpaceX's page accessed 2025-02-07 for 3,400 t booster and 1,200 t Ship capacities. PDF p75 uses a different Ship capacity; do not mix it. The later 4,100/2,650 t planning caps in https://www.faa.gov/media/94346 are not this cohort.

Original SpaceX Flight 5 footage https://www.youtube.com/watch?v=hI9HQfCAw64 was inspected in the browser: the external view around 2:16 shows the burning booster descending alongside the tower; around 2:26 it is upright and held above the ground. The edited montage does not supply calibrated telemetry or a reliable speed time series. The catch bounds below are conservative 2D engineering limits informed by that visibly upright, slow, airborne approach, not official SpaceX tolerances.

Freeze before flight testing: catch lug at 65 m above the engine plane, chopstick plane at 120 m, upright geometric body-centre catch altitude `120 - (65 - 71/2) = 90.5 m`; lateral half-width `diameter/4 = 2.25 m`; downward speed ≤ `diameter/2 per second = 4.5 m/s`; lateral speed ≤ 1 m/s; pitch ≤ 5°; descending crossing only. The lug height/arm height are declared layout approximations, not photogrammetry. Reject ground landing and upward crossings. Attitude changes the lug position by its rotated station, so test the physical lug, not only body altitude. Do not widen these bounds after a failed flight.

No verified primary dry-mass declaration was found. Adopt 200,000 kg as a declared Tier-B engineering estimate; exercise 160,000–240,000 kg sensitivity and disclose it. Do not promote it to an A row. Likewise dry COM at half-height, 3 m tank bottom, four grid fins with a combined 24 m² projected area and station 66 m are explicit geometry approximations. Tanks use the existing mixture ratio/densities and must fit below 71 m at 3,400 t. Fin force uses a bounded flat-plate engineering model, not the parked Ship fin family. Keep existing structural/thermal limits conservative and named; do not invent a tile shield on Super Heavy.

SpaceX's reusability description https://www.spacex.com/updates/reusability corroborates 13-engine return burns, three central engines for tower approach, and hot staging with three booster engines and all six Ship engines. Flight 5 footage corroborates four visible grid fins and actual staging/catch. Model 3 centre / 10 inner / 20 outer sea-level mounts with symmetric 2D projections; only centre and inner mounts gimbal. Ring radii/fin coefficients are Tier-B geometry assumptions recorded in physics-model.md, not official measured dimensions.

## File structure and shared interfaces

- `src/core/vehicle.ts`: immutable `VehicleDefinition`, retained `SHIP`, mass-layout constructor; no UI or mutable scratch.
- `src/core/vehicles/super-heavy.ts`: `SUPER_HEAVY`, engine groups and catch specification with cited cohort/assumptions.
- Existing `physics/{mass,engines,aero}.ts`, `control/{commands,actuation,guidance-physics,primitives}.ts`, `state.ts`, `step.ts`: trailing default vehicle parameter; preserve old operation order and default APIs.
- `src/core/physics/step-dynamics.ts`: shared force/integration phases extracted from step, with Ship equivalence proof. No separate booster or mission integrator.
- `src/core/physics/grid-fins.ts`: booster fin forces/torque with zero-density, zero-command and saturation laws.
- `src/core/autopilot/booster.ts`: boostback, coast/entry, terminal catch guidance using actual shared thrust/drag/gravity and fuel.
- `src/core/mission.ts`: attached/separated two-body physics; seeded states, staging command, selected-vehicle command routing.
- `src/app/mission-loop.ts`: mission adapter into the existing accumulator policy; no extra RAF.
- `src/ui/session/mission-controller.ts`, `scene.ts`, `camera-follow.ts`, `session.ts`, `store.ts`: session integration; interaction-only selected vehicle state.
- `src/view/booster.ts`, `src/view/mission-camera.ts`: functional booster/grid fins and two-vehicle framing; existing Ship renderer remains intact.
- Shell `Controls/{Controls,EnginesGroup}.tsx`, `Hud/{Hud,EngineDots}.tsx`, flight editor: selected vehicle, engine groups, catch telemetry, staging action and capacity. Read frontend-conventions/ui-foundations before these edits.
- Dedicated core/proof/app/UI/browser tests below; extend existing reference anchors and scenario acceptance rather than replacing their assertions.

```ts
// New physical inputs; SimState's Ship shape stays unchanged in the Refactor.
import type { RaptorMount } from '../../../src/core/constants';
export interface VehicleDefinition {
  readonly id: 'ship' | 'super-heavy';
  readonly height: number; readonly diameter: number; readonly dryMass: number;
  readonly propellantCapacity: number; readonly initialPropellant: number;
  readonly dryCentreOfMass: number; readonly tankBottom: number;
  readonly loxTankHeight: number; readonly ch4TankHeight: number; readonly ch4TankBottom: number;
  readonly aftFinStation: number; readonly frontFinStation: number; readonly rcsStation: number;
  readonly minArea: number; readonly maxArea: number;
  readonly frontFinArea: number; readonly aftFinArea: number;
  readonly engines: readonly RaptorMount[];
  readonly ignitionGroup: readonly number[];
}
// RaptorMount remains exported by constants.ts; add optional gimballed there
// for new booster mounts. Existing Ship mounts' shape/value need not change.
export function createInitialState(seed?: number, vehicle?: VehicleDefinition): SimState;
export function step(previous: SimState, dt: number, input?: StepInput, vehicle?: VehicleDefinition): SimState;
export function createScenarioVehicle(preset: ScenarioPreset, seed?: number): { state: SimState; vehicle: VehicleDefinition };
export interface MissionState {
  readonly ship: SimState; readonly booster: SimState;
  readonly phase: 'attached' | 'separated'; readonly elapsed: number;
}
export interface MissionInput { readonly stage?: boolean; readonly ship?: StepInput; readonly booster?: StepInput }
export function createHotStageMission(seed?: number): MissionState;
export function stepMission(previous: MissionState, dt: number, input?: MissionInput): MissionState;
```

### Task 1: Explicit vehicle parameters with unchanged Ship physics (Refactor)

**Files:** Create `src/core/vehicle.ts`, `tests/proofs/ship-vehicle.test.ts`, `tests/proofs/ship-engines.test.ts`, `tests/proofs/ship-geometry.test.ts`, `tests/proofs/ship-step.test.ts`, `tests/proofs/ship-guidance.test.ts`, independent shipped mass/engine/aero proof fixtures; modify existing mass/engines/aero/state/step/control/guidance functions listed above. Tests: existing core/analytic/golden/intro suites.

**Interfaces:** Consumes current `SimState`, `RaptorMount`, constants and `step`. Produces `VehicleDefinition`, `SHIP`, trailing model inputs and unchanged Ship default results for Tasks 2–5. `createMassProperties(p = 0, vehicle = SHIP)` and `writeMassProperties(p, out, vehicle = SHIP)` preserve existing parameter positions.

- [x] Save the current mass implementation as a small independent proof fixture, with source SHA. Write the parameter-use test before adding the API:
```ts
const alternate = { ...SHIP, dryMass: SHIP.dryMass * 2, dryCentreOfMass: 30 };
expect(centreOfMass(0, alternate)).toBe(30);
expect(momentOfInertia(0, alternate)).toBeGreaterThan(momentOfInertia(0));
```
- [x] Run `npx vitest run tests/proofs/ship-vehicle.test.ts`. Expected: RED, missing vehicle module/API. This is an API-introduction failure; later physical tests must fail on assertions.
- [x] Define SHIP from the existing constants and exact tank expressions. Pass model through mass functions, preserving grouping/order; retain old exported Ship tank constants as aliases. Compare every mass output against the preserved fixture over 50,001 loads from 0 to capacity, negative/overfull boundaries and adjacent floats. Expected max difference 0 ULP, required ≤1 local-value ULP.
- [x] Repeat RED→GREEN for engine/aero/state/step parameter use. Engine proof covers all 64 Ship masks, each failed mask, pressure 0/0.001/1/25/101.325 kPa, throttle 0/40/73/100 and empty/near-empty fuel. Geometry proof covers pitch/attack boundaries ±π/±π/2/0 and fin commands 0/50/100. Preserve gimballed fraction arithmetic on Ship; booster fixed mounts are not introduced yet.
```ts
for (let mask = 0; mask < 64; mask++) {
  const running = Array.from({ length: 6 }, (_, i) => Boolean(mask & (1 << i)));
  for (const pressure of [0, 0.001, 1, 25, 101.325]) {
    expect(getTotalMaxThrust(running, pressure, SHIP)).toBe(getTotalMaxThrust(running, pressure));
  }
}
```
The default-vs-explicit comparison supplements independent old arithmetic; it alone is vacuous. Snapshot old engine/aero expressions in the proof, and add altered-model positive controls.
- [x] Pass model into collision height, mass/inertia, min/max projected area, fin dimensions, engine masks and guidance drag/dry-mass floors. Defaults preserve every Ship operation and RNG draw. Do not add a UI model id to SimState. Run `npm run build` then `npx vitest run tests/proofs/ship-vehicle.test.ts tests/proofs/ship-engines.test.ts tests/proofs/ship-geometry.test.ts tests/proofs/ship-step.test.ts tests/proofs/ship-guidance.test.ts tests/core tests/golden tests/flies-every-scenario.test.ts`. Expected: all pass, no changed Ship fixture. Run truth report and record same bands before/after.
- [x] Commit/push coherent mass, engine/geometry and final integration checkpoints, each with `Physics tier: Refactor` and measured domain/max ULP. Final task command: `npx vitest run tests/proofs/ship-vehicle.test.ts tests/proofs/ship-engines.test.ts tests/proofs/ship-geometry.test.ts tests/proofs/ship-step.test.ts tests/proofs/ship-guidance.test.ts tests/core tests/golden tests/flies-every-scenario.test.ts`.

### Task 2: Physical booster, grid fins and preserved preset identity (Fidelity)

**Files:** Create `src/core/vehicles/super-heavy.ts`, `src/core/physics/grid-fins.ts`, `tests/core/super-heavy.test.ts`, `tests/core/grid-fins.test.ts`; modify scenarios, state initialization, engines, step, reference anchors and physics-model.md.

**Interfaces:** Consumes Task 1 vehicle inputs. Produces `SUPER_HEAVY`, `createScenarioVehicle`, 33 correctly sized engine arrays, reusable booster force evaluation and frozen catch specification for Tasks 3–5. `createScenarioState` stays a Ship-default compatibility API until its callers are explicitly migrated; the player's preset adapter uses createScenarioVehicle.

- [x] Write counts/capacity/preset tests:
```ts
const preset = PRESETS.find(p => p.id === 'booster-sep')!;
const flight = createScenarioVehicle(preset, 123);
expect(flight.vehicle.id).toBe('super-heavy');
expect(flight.state.engines.running).toHaveLength(33);
expect(flight.state.vehicle.propellantMass).toBe(500_000);
expect([preset.altitude, preset.xPosition, preset.speedX, preset.speedY, preset.pitch, preset.propellant])
  .toEqual([70_000, 45_000, 1130, 1130, deg(45), 500]);
```
Test RTLS `[15_000,5_000,330,430,30,200]`, custom basedOn and all existing Ship ids.
- [x] Run `npx vitest run tests/core/super-heavy.test.ts tests/core/grid-fins.test.ts`. Expected: RED missing booster/adapter.
- [x] Build symmetric 3/10/20 sea-level mount tables, marking only 13 inner/centre engines gimballed. Use existing Raptor 2 pressure thrust/flow/ignition. Prove every engine has independent ignition/failure/fuel status; all 33 thrust sums, fixed outer-ring gimbal rejection, fuel-paid empty-tank impulse and seeded replay.
- [x] Implement four-grid-fin side force with `q = rho*v²/2`, combined area 24 m², bounded flat-plate `Cl = sin(2*delta)` for |delta|≤45° and `Cd = 1.2*sin(delta)²`; apply sign against commanded lateral error and torque at the 66 m station relative to moving COM. Grid command slew uses the existing fin actuator envelope; no force at zero rho/speed/command, drag never propels, mirror signs and saturation must be tested. Keep Ship branch byte-equivalent.
- [x] Add cited A geometry/capacity/count rows, declared B dry-mass/layout rows and independent tank/COM/inertia tests. Sensitivity covers 160/200/240 t, proving finite positive inertia and actual thrust/weight authority without claiming all uncertain variants are flight-certified. Run build, focused tests and truth report. Expected: all A IN, unchanged old A rows, no fake official dry-mass claim.
- [x] Commit/push with `Physics tier: Fidelity`, this plan and source cohort. Final task command: `npx vitest run tests/core/super-heavy.test.ts tests/core/grid-fins.test.ts tests/proofs/ship-vehicle.test.ts tests/reference`.

### Task 3: Booster boostback, descent and an actual tower catch (Fidelity)

**Files:** Create `src/core/autopilot/booster.ts`, `tests/core/booster-guidance.test.ts`, `tests/core/tower-catch.test.ts`; modify runAutopilot/step and `tests/flies-every-scenario.test.ts`; document measured fuel/guidance and catch limits.

**Interfaces:** Consumes SUPER_HEAVY, actual shared force/predictor functions and frozen catch geometry. Produces `runBoosterAutopilot(state, dt, vehicle): void`; model dispatch from runAutopilot. `status.landed` means secured for the selected model; presentation maps booster secured to `caught`, and only the physical catch detector can set it on the booster.

- [ ] Write catch predicate tests before implementation: descending lug crossing inside every fixed bound succeeds; at each bound's next float outside, upward crossing, ground contact, angular misalignment and failed vehicle reject. Run focused command. Expected: RED on missing catch detector.
```ts
// Use the actual lug pose and plane crossing, never clamp a missed vehicle in.
expect(catchEligible(previous, current, SUPER_HEAVY)).toBe(true);
current.kinematics.speedX = 1 + Number.EPSILON;
expect(catchEligible(previous, current, SUPER_HEAVY)).toBe(false);
```
- [ ] Implement model-specific contact: eligible capture cancels engines/countdowns, secures the actual body at its crossing pose and stops motion; ineligible crossing continues physically and may crash. No capture below ground, no arbitrary vertical snapping and no preset-id success override.
- [ ] Write flight acceptance for Booster Sep/RTLS at fixed DT and the existing 900 s cap, checking `caught`, every failure false, actual lug position/terminal velocity, positive remaining fuel and finite fields. Expected: assertion RED before booster guidance. Add engine-failure positive controls that produce an honest failed/alternate flight, not an unconditional caught flag.
- [ ] Guide boostback with13 inner engines and actual thrust/flow, matching the planned return to the tower. Cycle1 independent review establishes that a constant-attitude unpowered fall is insufficient once rotation/grid/entry/terminal forces act. Use a booster-only planned mechanical rollout through the same advance/actuator/engine implementation, with a forecast-free control callback and cloned state/RNG; retain the Ship fall predictor contract. Predict the attitude transition, actual entry policy, throttle/fin/gimbal slew and paid mass expenditure. Align with available torque before burning, terminate burn on computed return error, then coast/grid-fin correction. Terminal burn uses three centre engines, current mass/pressure/gravity, fuel-aware stopping distance and maximum ignition delay. Target zero horizontal speed and a slow descending lug crossing at the fixed catch plane with a finite joint arrival deadline, aerodynamic/gravity-subtracted thrust, feasible saturated-vector allocation and delivered-actuator torque credit. Paid proportional booster RCS remains available at gimbal saturation; manual full-yoke remains available. Keep real throttle/gimbal/slew limits and count all fuel. Cycle2 dispositions/attempt predictions: docs/research/2026-10-02-phase7-booster-guidance/cycle1-review.md. The shared mechanical callback seam is an early, bounded use of Task4 shared-dynamics extraction, not a second integrator or completion of Task4.
- [ ] Measure fuel requirement/reserve from both prescribed flights and source-derived ignition/throttle authority, record measured cost plus margin; a reserve is a fuel-planning input, not extra fuel. If either flight fails, trace first causal divergence and perform bounded reviewed cycles; do not alter starts/catch bounds/tile limit or substitute a ground landing. Run flight tests and Ship intro/reentry regression. Expected: both booster ids caught and every retained Ship outcome unchanged.
- [ ] Update every-scenario acceptance to use the selected vehicle adapter and assert caught per booster id. Preserve separate Ship acceptance. Run truth/unit first, predict only booster fixtures moving, then obtain Linux22 unfiltered fixtures and audit all eight existing trajectories plus new booster captures. Commit code/fixtures/audit together and push. Final task command: `npx vitest run tests/core/booster-guidance.test.ts tests/core/tower-catch.test.ts tests/flies-every-scenario.test.ts tests/golden tests/reference`.

### Task 4: Actual hot staging and a shared-clock two-body mission (Refactor then Fidelity checkpoints)

**Files:** Create `src/core/physics/step-dynamics.ts`, `src/core/mission.ts`, `src/app/mission-loop.ts`, `tests/proofs/step-dynamics.test.ts`, `tests/core/hot-staging.test.ts`, `tests/app/mission-loop.test.ts`; modify step/loop for shared policy.

**Interfaces:** Consumes common model/step and booster guidance. Produces MissionState/createHotStageMission/stepMission and `createMissionLoop(initial)` / `advanceMission(loop, frameTime, options)` returning existing AdvanceResult. Separate extraction proof checkpoint from new staging Fidelity.

- [ ] Write Ship extraction proof and a one-step two-force witness before changing the pipeline. Extract prepare forces/fuel, translation and rotation integration, and completion/control phases in exact existing order. `step` remains their Ship composition. Proof uses unchanged goldens plus independent before-extraction step observations at domain boundaries; do not duplicate a second production integrator.
- [ ] Run build and `npx vitest run tests/proofs/step-dynamics.test.ts tests/golden`. Expected: unchanged Ship output ≤1 ULP, all goldens. Commit/push Refactor before stack forces.
- [ ] Write staging witnesses: attached hull gap fixed, combined mass equals both actual masses, aggregate inertia is `Iship + Ibooster + mship*dship² + mbooster*dbooster²`; preparation pays each tank's actual gas. At release, positions inherit the physical centres, velocities `vCOM + omega × offset`, and impulses balance; no manufactured separation kick.
```ts
const mission = createHotStageMission(123);
const released = stepMission(mission, DT, { stage: true });
expect(released.phase).toBe('separated');
expect(released.ship.engines.running).toHaveLength(6);
expect(released.booster.engines.running).toHaveLength(33);
expect(released.ship.kinematics.altitude).not.toBe(released.booster.kinematics.altitude);
```
Expected RED before mission implementation; add a no-thrust angular-momentum/momentum control so a visual clone cannot pass.
- [ ] Initialize a bounded pre-separation mission at the protected Booster Sep pose, booster 500 t and Ship 1,200 t, hulls touching at the hotstage plane. This is a staging demonstration, not an unrequested full-stack ascent-to-orbit campaign. The player may trigger stage; the demonstration sequence commands three central booster engines and all six Ship engines using real delays. Release after Ship paid thrust establishes separation acceleration; an all-Ship ignition failure leaves the stack attached with an honest failure. After separation each vehicle advances shared step physics/guidance independently.
- [ ] Attached integration sums actual world forces and torques about the aggregate COM using the parallel-axis layout; use the extracted existing integration kernel once for the rigid aggregate, then derive both body poses. Convert between geometric body-centre and mass COM explicitly using each model's COM station; do not silently repair Ship's established coordinate convention. Flow carries exhaust momentum through the existing thrust model; no extra rocket-equation force. Maintain attached constraint until release, then remove it exactly once.
- [ ] Reuse the existing accumulator/warp/clamp policy for mission advance. Test identical trajectories under frame batching 30/60/144 Hz, paused states unchanged, slow motion, warp count, restart and seed/engine failure isolation. Expected PASS; no second RAF or frame-scaled dt.
- [ ] Run build/focused proof/core/app tests and truth. Commit/push Fidelity with source/assumption notes and an audited Linux golden change only if the new mission changes a recorded path. Final task command: `npx vitest run tests/proofs/step-dynamics.test.ts tests/core/hot-staging.test.ts tests/app/mission-loop.test.ts tests/golden`.

### Task 5: Functional booster and two-vehicle camera, controls and HUD

**Files:** Create session mission-controller, view booster/mission-camera, `tests/ui/mission-session.test.ts`, `tests/view/booster.test.ts`, `tests/e2e/staging.spec.ts`; modify existing session/scene/camera/store and Controls/Hud/editor surfaces in the file map.

**Interfaces:** Consumes model adapters/MissionState/mission loop. Produces session `selectVehicle(id: 'ship' | 'super-heavy'): void`, `stage(): void`, interaction state for mission/active model and stable actual state access for HUD/renderer. Shell talks only to session.

- [ ] UX critique before edits: six engine buttons identify Ship well; 33 tiny booster buttons would crowd the phone and hide flight telemetry. Preserve Ship's six individual controls; use centre/inner/outer booster groups with clear counts/failure indicators, a named Ship/Super Heavy selector, explicit Stage control only for an attached mission, and a visible catch objective/status. Keep keyboard/touch targets accessible. Avoid a new full cockpit redesign before Phase 9.
- [ ] Write session tests that route throttle/engine/pitch to only the selected vehicle, update HUD model/counts on switch, reset both on restart, keep intro identical and keep custom booster capacity. Expected RED without mission integration.
- [ ] Compose the session with a small mission controller; keep session.ts under frontend's 500-line limit through focused helpers, not duplicate sessions. Single RAF advances mission or single vehicle and sends the selected state to HUD/audio/recorder. Selection publishes interaction state only. Both physical states render every frame with independent engine/fin positions; hide/destroy/reset resources correctly.
- [ ] Implement a 71×9 m functional booster body with four articulated grid fins and actual 33-engine group activity. Camera fits both shortly after stage then follows selection; use actual world-to-screen poses, no cloned Ship telemetry. Empty/failed engines must not draw thrust. Retain pig/pad/Ship renderer and continuous exhaust resource contracts.
- [ ] Write Playwright witnesses: start hotstage, stage, observe distinct physical trajectories and actual engine counts; switch vehicle and read differing HUD/control state; pause freezes both; restart restores attachment; select Booster Sep and RTLS, engage autopilot, observe Caught at the tower. Include negative controls (no ignition/no stage yields no separation; capture disabled by bad position yields no Caught). Run build, focused unit/UI and all five viewport staging/catch specs. Expected PASS without retry/bound changes.
- [ ] Commit/push functional rendering/UI checkpoint. Final task command: `npx vitest run tests/ui/mission-session.test.ts tests/view/booster.test.ts tests/app/mission-loop.test.ts` plus `npx playwright test tests/e2e/staging.spec.ts` after build.

### Task 6: Verify, independently review, merge and verify the deployed booster phase

**Files:** Update physics/architecture/testing/presentation references, roadmap/handover/GOAL and backlog; preserve phase evidence in `docs/research/` and close this phase plan only after release.

**Interfaces:** Consumes all prior deliverables and exact final source SHA. Produces checked Phase 7 with main merge SHA/live verification, and a Phase 8 plan before its implementation. Phases 8–9 remain required and unchecked.

- [ ] Run `npm run gate`, `npm run test:e2e:full`, `npm run truth:report`, `npm run mutation`, docs-maid and source/scanner checks. Expected exit0; all A rows IN, control green and every named fault CAUGHT, Ship preservation and both booster catches genuine. Preserve outputs/SHA/platform/known skips; report hosted retries honestly.
- [ ] Dispatch one fresh-context whole-branch high review on the most capable available reviewer using code-review/cross-agent-review's protected-surface fallback and executing-plans package. Include source cohort, every ruled interface, actual flight/catch traces and original preset invariants. Fix Important/Critical findings RED→GREEN, retain minors in backlog, then satisfy the complete gate at final source. No owner merge reapproval.
- [ ] Merge normally to main, run main gate and push. Verify exact main CI/Pages SHA (or exact billing exception), served build identity and live smoke. Expected PASS; do not tick on focused results or a stale live cache.
- [ ] Tick Phase 7, preserve source/physical assumptions/deferrals/merge evidence in references/research, delete completed phase plan after review/closure, keep GOAL/handover accurate at 80%. Write `modernization-phase-8.md` from actual shipped code, then execute Phase 8 and 9 continuously under the active full-roadmap goal.

## Self-review

Phase 7's required 33 engines, grid fins, preserved Booster Sep/RTLS, genuine catch, hot staging, shared physical two-vehicle simulation and usable camera/HUD each map to Tasks 1–5. Sources distinguish geometry/capacity evidence from engineering dry mass/catch/layout assumptions. Every Review Focus input has a owning core/app/session/browser witness above. Release retains all later roadmap and final completion conditions; there is no claim that Phase 6b's plume work completed Phase 8.
