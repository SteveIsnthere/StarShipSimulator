# Phase 8 — V3 physics, progressive damage and visuals

Updated 2026-10-18 UTC. Full approved scope is retained. Execute the existing
implementation's remaining gaps through [C0–C4](modernization-completion-plan.md),
under [GOAL](modernization-GOAL.md). Read the [handover](modernization-handover.md)
for source custody and failed acceptance; [the audit](../../research/2026-10-18-modernization-remaining-audit/README.md)
records 52 different and 25 absent paths against the latest source manifest.

## Active status and next step

| Area | State |
|---|---|
| Original Tasks 1–4 | Historically implemented/reviewed; preserve, then include current regressions in final integration |
| Bounded RTLS scheduling feasibility | Complete; do not repeat |
| R1 V3 catalogue/propulsion | Implementation exists; complete flight/unit/golden acceptance |
| R2 progressive damage | Implementation and focused witnesses exist; complete integrated physical acceptance |
| R3 vehicle/damage rendering / Task 5 | Implementation exists; reference/motion/integration acceptance incomplete |
| Task 6 / R4 | Frame budgets and complete release acceptance open/failed |

**Next: C1 measured descending-row failures and model-aware orbital targeting.** C0
selected committed `8126077a` as the reviewed successor basis; unknown later
bytes/results remain unknown. Never apply historical patches. The reviewed
source-derived orbital failure deadline is frozen; actual controller bounds
are not thereby proved. New 18-row matrix source and exact default-constructor
proof exist; both landing-burn rows pass after a bounded reviewed booster
initialization correction. Super Heavy/intro also passes, but before-flip and reentry crash; reentry
also exceeds the original 30 s case budget. Other rows and whole integration
remain open. Current C1 source/tests are uncommitted WIP after `0d87c758`.
All starts/targets, other fourteen 900 s caps and physical/control/work/health/
catch limits remain binding. [Evidence](../../research/2026-10-18-phase8-successor/README.md).

One C3 allocation debt is addressed: six projection call sites now use
factory-owned output. Changed build/scoped lint and 85/85 expanded checks pass;
independent high code review accepts the bounded change. See the
[successor checkpoint](../../research/2026-10-18-phase8-successor/README.md).
Fresh body-presence optics pass five scenes; catch setup times out at its
original 60 s limit. This is no reference/plume/motion/frame, full gate,
whole-phase or release acceptance. A subsequent reviewed progress getter and
31/31 focused checks enabled the changed catch assertion pass in 18.5 s, with
saved shell 0 but conflicting outer tool 1; retain the bounded scope. The next
physical/CPU diagnosis and remaining optical work are specified in the
[diagnostic handoff](../../research/2026-10-18-phase8-successor/next-diagnostics.md).

The checklists below retain the original physical and visual obligations.
An unchecked implementation obligation is not an instruction to rebuild code
that already exists: map it to current source and source-pinned evidence, then
fill only the actual gap. Completed historical evidence retains its own source
scope. Never rerun consumed diagnostics or recreate RED records to claim history.
The previous chronological plan is preserved
[byte for byte](../../research/2026-10-18-modernization-remaining-audit/plans-before-update/manifest.json).

**Goal:** Six distinct, physically driven launch/staging/belly-flop/entry/landing/
catch scenes with sourced V3 geometry/propulsion and a bounded progressive
engineering-surrogate damage model that affects flight and visible structure.
Use existing TypeScript/PixiJS/Vitest/Playwright, fixed 120 Hz, shared sun,
startup geometry and pooled resources; no new runtime dependency.

## Owner realism amendment — 2026-10-03

Steve rejects current Ship and Super Heavy appearance as unrealistic and requests deep online/image research, faithful simplification of real hardware, possible structural disintegration, and an external ChatGPT Pro review. This supersedes Task5 visual acceptance; existing passing framing/control checks remain regression evidence only. Do not close Task5 or merge Phase8 on those checks alone.

- [x] Inspect original photographs/footage and record generation-specific silhouette, appendages, steel/tiles, hot-stage ring and engine-bay references, distinguishing sourced measurements from image estimates and authored simplifications.
- [x] Owner selected V3 with physics updates and progressive damage affecting flight, then instructed plan and implementation with subagents (2026-10-03).
- [x] Write a scrubbed self-contained external review document, cold-read it, deliver it to Steve, and attempt one ChatGPT Pro review. Collect the parallel Deep Research report; verify recommendations against sources/code before adopting them. Completed2026-10-03; Pro supports conditionalprototype, notvisualsignoff. Findings and rejections in `docs/research/2026-10-03-vehicle-realism/pro-review.md`; same externalbrief revised tov2.
- [x] Amend the concrete implementation and visual acceptance here after the choices/reference audit. Reuse shared authored geometry/material definitions for intact and broken bodies; avoid more decorative patches to the legacy photo/flat booster.
- [ ] Validate real failure transitions, inherited motion, loss of intact-body visibility, independent two-body state, pause/restart and reduced-quality behavior. A particle explosion alone does not satisfy disintegration.
- [ ] Inspect real native-session captures at relevant scales against the reference checklist; retain all original regression, physical and release gates.

Historical pre-amendment evidence: Task5 campaign64788 passed88/88 with zero retries at8c9a0c5. The source has since changed substantially; that campaign is regression history, not current realism or release acceptance. The owner explicitly amends the no-core-change constraint for V3/progressive damage under the Fidelity tier; the concrete amendment below governs implementation.

## Global constraints

- Ship every approved area: engines/plumes; re-entry/heat; environment; vehicle/camera. Phase 9 retains UX ownership.
- V3 and progressive damage are approved Fidelity changes under the implementation amendment. Physics remains serial; goldens require the recording platform and all truth/flight checks. Preserve preset intent, intro sequence, pig, physical limits and parity. View code only reads core state.
- First-load JavaScript ≤300 kB gzip; six-command gate ≤300 seconds in the current cloud acceptance environment; hosted CI ≤20 minutes. Floors remain unchanged.
- Render curves are authored visualization, not quantitative exhaust photometry, geographic surveying or temperature imaging. Label compression in source and reference docs.
- Desktop full-frame work p95 ≤16.67 ms and measured steady cadence ≥59 frames/s (60 fps target); phone reduced-quality full-frame work p95 ≤33.33 ms and measured cadence ≥29.5 frames/s (30 fps target). Full-frame work includes the actual session tick, simulation, HUD, scene and GPU completion, not rendering alone. Viewport emulation is not an actual handset claim.
- Build before tests; no concurrent heavy checks. All existing bounds, positive controls and zero local retries remain. Renew coverage seals only after auditing all affected closures; otherwise retain conservative full coverage.
- Existing worktree stays in use. Steve authorizes subagents: give disjoint file ownership; physics/goldens remain serial. Independent release review must be fresh.

## Design critique and direction

The existing image already has atmospheric depth, coherent sunlight, a readable plume and a real staging camera. Its weakest cues are the generic aggregate particle exhaust, flat rectangular booster, shared flux-driven skin wash, and repeated inland ground with no coastline. Improve these cues with restrained material detail and state-driven transitions. Keep the monochrome flight instruments legible; no ornamental overlays, scripted stage events, white exhaust slabs or bloom over the HUD. Publish the direction before product edits and proceed without waiting for Steve’s verdict.

## Review focus

1. A selected booster must not steal Ship heat, exhaust or motion history during attached/separated missions (Tasks 2/3/5).
2. A paused flight and a restarted flight must hold/reset all new animation and quality state without sim RNG consumption (Tasks 2/3/6).
3. An RVac that is off or failed must contribute no exhaust; its fixed direction must remain different from a gimballed SL Raptor (Task 2).
4. Surface glow must follow the simulated equilibrium temperature; a cold hull under bright daylight must not appear incandescent (Task 3).
5. Reduced motion, small landscape viewports and reduced-quality graphics must preserve vehicle framing, ground geometry and control visibility (Tasks 4/5/6).

## File responsibilities

- `src/view/engine-look.ts`: pure nozzle class, pressure, throttle and mount visual curves. `effects.ts` and `emissive-bell.ts` consume them.
- `src/view/heat-look.ts`: pure skin-temperature incandescence; `reentry.ts` owns independent plasma/skin shaders.
- `src/view/coast.ts`: startup-owned coastline/ocean/pad geometry using world coordinates and the existing sunlight. `world.ts` integrates beneath scenery.
- `src/view/{vehicle-geometry,vehicle-material,component-vehicle}.ts`: shared V3 component geometry/materials consumed by intact, detached and inset rendering; vehicle adapters stay thin.
- `src/view/render-quality.ts`: explicit full/reduced visual policy, bounded particles and optional post cost; scene owns transitions.
- `src/ui/session/scene.ts`, `scene-vehicles.ts`: wiring only; keep files under500 lines and all per-frame output preallocated.
- `tests/view/{engine-look,heat-look,coast,component-vehicle,render-quality}.test.ts`: pure and graph behavior.
- `tests/e2e/visual-scenes.spec.ts`: all six screenshot witnesses with positive controls; `visual-budget.spec.ts`: opt-in browser/GPU benchmark.
- `docs/design/visual-direction.html`: self-contained all-area review prototype; `docs/research/2026-10-03-phase8-visuals/`: measured evidence; presentation/reference docs describe shipped behavior.

### Task 1: Publish the visual direction

- [x] Create `docs/design/visual-direction.html` with accessible scene buttons for Launch, Staging, Belly flop, Entry, Landing, Catch; desktop/phone previews; full/reduced toggle; all four areas visible. Use inline SVG/CSS/JS, no remote dependencies, no claim that prototype is actual simulation output.
- [x] Verify the HTML in a real browser at1280×720 and390×844, inspect screenshots, ordinary controls and reduced-motion behavior. Revise before publication if vehicle/controls clip or the six scenes are indistinguishable.
- [x] Publish privately using an available Artifact/review-page capability. If literal Artifact is unavailable, use private Pages HTML visualization; inspect receipts/readback and document the capability fallback. Do not make the page public or await owner acceptance. Link the actual page URL from roadmap and handover.
- [x] Commit/push `docs(design): establish the six-scene visual direction` with the page receipt and prototype. Publication is required acceptance, not a local-file substitute.

### Task 2: Distinct per-engine exhaust and glare

**Consumes:** `VehicleDefinition.engines`, `SimState.engines`, `atmosphere.airPressure`(kPa), throttle, actual nozzle position and simulation dt.
**Produces:** `enginePlumeLook(pressure:number, throttle:number, vacuum:boolean, out:EnginePlumeLook):void`; mutable `EnginePlumeLook={spread:number,scale:number,diamonds:number,cellLength:number}`. Output is preallocated per body/engine.

- [x] Write pure RED witnesses for sea-level/vacuum distinctions, finite clamps, zero throttle, pressure endpoints, monotonic expansion and shock fading; graph witnesses for healthy/off/failed engine mounts and SL/RVac orientation. Preserve existing plume widths and startup-age assertions.
- [x] Run build then focused affected tests and observe the missing-function/behavior failures. Implement small look helper, per-engine mesh texture/geometry and per-engine particle origins, retaining independent RNG streams, pool ceiling, continuous soft coverage and birth front. Reuse pressure expansion, existing shock curves and correct gimbal policy.
- [x] Add actual staging/landing glare driven by firing engines and physical separation/catch events; no timer pretending a stage occurred. Keep emission behind hull/HUD, additive alpha coverage, cropped-input bloom dimensions and zero-cost filters at idle.
- [x] Verify focused tests, original plume/emissive/compositing browser positive controls and real attached-to-separated mission with independent bodies. Archive captures and source pins; commit/push `feat(view): distinguish sea-level and vacuum exhaust`.

The pure witness starts with this output contract; use the actual mutable fields consumed by both renderers:

```ts
const sl = { spread: 0, scale: 0, diamonds: 0, cellLength: 0 };
const rvac = { ...sl };
enginePlumeLook(101.325, 100, false, sl);
enginePlumeLook(101.325, 100, true, rvac);
expect(sl.diamonds).toBeGreaterThan(0);
expect(rvac.spread).not.toBe(sl.spread);
enginePlumeLook(0, 100, false, sl);
expect(sl.diamonds).toBe(0);
```

### Task 3: Surface-temperature heat and belly shading

**Consumes:** `SimState.forces.surfaceTemperature`(K), existing thermal flux, angle of attack, pitch and shared sun. This is an equilibrium-temperature model, not a stored thermal-inertia model; do not invent residual heat history or add a core field.
**Produces:** `tileGlow(temperature:number):number` bounded0..1; independent surface glow uniform in existing sheath/inset, with plasma still driven by current heat input.

- [x] Write RED tests for tileGlow(300)=0, tileGlow(1533)>tileGlow(900)>0, finite handling and monotonicity; scene witnesses for independently injected hot/cold surface temperatures at equal flux, opposite windward sides, selected booster and pause/restart.
- [x] Build/test RED; implement smooth authored incandescence onset at800K, full by1533K with no physical threshold change. Separate skin color/emission from atmospheric shell strength. Keep actual flux-driven plasma/windward direction; preserve inset thresholds and original cold visibility witnesses.
- [x] Add belly heat-shield material shading/detail driven by hull orientation and shared sun. Geometry is startup-owned; redraw only on geometry/quality changes.
- [x] Run pure/graph tests and existing reentry/hot/cold pixel witnesses, record actual six-scene captures; commit/push `feat(view): show surface temperature separately from plasma`.

Start the meaningful curve witness with:

```ts
expect(tileGlow(300)).toBe(0);
expect(tileGlow(900)).toBeGreaterThan(0);
expect(tileGlow(1533)).toBeGreaterThan(tileGlow(900));
expect(tileGlow(Number.NaN)).toBe(0);
expect(tileGlow(Infinity)).toBe(0);
```

Run `npm run build` then `npx vitest run tests/view/heat-look.test.ts tests/view/reentry.test.ts`; inspect actual RED/GREEN outputs. The browser must compare independently injected surface temperatures at equal flux, in addition to genuine reentry flights. The pure witness cannot substitute for shader pixels.

### Task 4: Starbase and coastal depth

**Consumes:** world camera/viewport, existing sun/groundTint/horizon geometry, actual tower verdict; no geographic data fetch.
**Produces:** `createCoast():{container:Container,update(camera:CameraState,viewport:Viewport,sun:SunLight):void}`; startup-owned ocean/coast/pad assets at authored fixed world coordinates.

- [x] Write RED graph/look tests for coast tied to world coordinates through pan/zoom, night/day tint, objects culled offscreen, shared curved ground clip and unchanged pig/pad positions. Add render positive controls isolating ocean vs land and night lighting.
- [x] Build/test RED; add restrained ocean band, coast boundary, concrete pad/roads, tower truss/mechanical detail and night lights. Reuse horizon mask and shared sunlight; keep secured indicator exclusively tied to physical catch. Preserve existing generated ground texture and clouds/sky/night behavior.
- [x] Drive actual near-pad launch/landing/catch plus20/100km daylight/night scenes. Inspect silhouettes, coast readability and ground/sky seams on every viewport. Keep existing terrain/tower assertions unchanged; commit/push `feat(view): place Starbase on a coherent coastline`.

Use the actual container/world transform as the graph witness, keeping GPU image proof separate:

```ts
const coast = createCoast();
const camera = createCamera(viewport, 0, 0, 0);
coast.update(camera, viewport, sun);
const initial = coast.container.x;
camera.posX += 100;
coast.update(camera, viewport, sun);
expect(coast.container.x - initial).toBeCloseTo(-100 * viewport.scale);
```

Use the existing camera/sun fixture factories in `tests/view/catch-tower.test.ts` and `tests/view/sun.test.ts`; all fixtures are real shared types. Position the coast container at the world origin so this invariant is exact.

### Task 5: V3 vehicle material, disintegration and framing

Superseded by R3 below. The pre-amendment detail-overlay implementation and
four-grid booster assumptions are historical. Active V3 has three grids;
shared component geometry/materials own intact and detached rendering. Preserve
original camera/intro/shake/motion limits and framing tests.

- [ ] Complete R3's source/reference/motion checklist on the recovered or
      explicitly reconstructed current source; reuse existing geometry/tests.
- [ ] Verify original framing, two-body staging/catch, pause/restart and all six
      scenes across desktop/phones, including actual progressive component loss.
- [ ] Record current acceptance and commit/push the coherent reviewed change.
      Historical Task 5 screenshots alone do not establish V3 realism.

### Task 6: Measured quality paths and release

**Consumes:** same actual six scenes and existing renderer; **Produces:** `renderQuality(width:number,height:number,dpr:number,reduced:boolean):RenderQuality` with named bounded particle/detail/post policy, chosen on startup/resize or explicit quality transition, never from per-frame store writes.

- [ ] Write behavior tests for bounded full/reduced resource counts, startup allocation, pause/restart and reduced-motion; no per-frame wall assertions in the gate. Add opt-in `RUN_VISUAL_BUDGET=1` Playwright spec with warmed fixed deterministic flights and at least300 measured frames per scene, actual full session tick plus GPU completion, mean/median/p95 and RAF cadence, renderer/backend/DPR metadata. Run desktop1280×720 andphone390×844/844×390; CPU-throttled emulation is clearly labeled.
- [ ] Measure full graphics on idle desktop then reduced phone path serially. Require p95 full-frame work ≤16.67ms desktop and≤33.33ms phone, plus actual steady RAF cadence ≥59frames/s desktop and≥29.5frames/s phone. Both cost and cadence must pass; a slow simulation cannot pass a render-only budget. An over-budget effect gets bounded reduced geometry/particle/post policy, retaining all meaningful scene cues and physical data; run original pixel controls on both paths. Do not weaken benchmark bounds after measurement.
- [ ] Write/execute `visual-scenes.spec.ts` for Launch/Staging/Belly flop/Entry/Landing/Catch. Capture actual PNGs as artifacts; assert actual drawn vehicle/environment/effect structure with absence controls, not just screenshot file existence. Run original full five-browser suite; no retries added.
- [ ] Audit changed coverage-root closures, retain full coverage on any uncertainty, and renew seal only after independent audit. Run ordered complete timed gate, truth report and all21mutations; preserve current core source/goldens. Fix actual failures through approved bounded diagnosis cycles.
- [ ] Obtain fresh high-depth independent whole-phase review, fix real findings and record dispositions. Merge/push `claude/visuals` to main, run main gate, check hosted CI/Pages, served-byte identity and current live smoke. Tick Phase8 only then; promote decisions to references, delete finished plan and write Phase9 plan. Owner visual verdict remains separate.

Quality values are explicit resource contracts rather than magic per-frame decisions:

```ts
interface RenderQuality {
  readonly mode: 'full' | 'reduced';
  readonly particleCapacity: number;
  readonly hullDetail: boolean;
  readonly heatPost: boolean;
}
expect(renderQuality(390, 844, 2, true).mode).toBe('reduced');
expect(renderQuality(390, 844, 2, true).particleCapacity).toBeLessThanOrEqual(4000);
expect(renderQuality(1280, 720, 1, false).mode).toBe('full');
```

Retain current4000 capacity ceiling and original occupancy/coverage witnesses. A lower-quality path may bound visual cost, not remove flight instruments or change simulator dt. The browser benchmark uses actual renderer timing, not this pure policy test, as frame-budget evidence.

## V3 and progressive damage implementation amendment — approved 2026-10-03

**This section supersedes the historical conditional candidate, Task5's four-grid/photo-detail implementation and the former no-core-change restriction.** Steve selected V3 with physics updates and progressive damage affecting flight, and instructed planning followed by implementation. No second owner checkpoint is required. Tasks1–4 retain their completed evidence; update their integrations where the new vehicle requires it. Task6 and Phase9 remain required.

**Goal:** Fly a coherently modeled current V3 Ship and Super Heavy, see their recognizable steel/TPS/appendage geometry, and experience progressively impaired control followed by physical component loss and disintegration.

**Architecture:** One generation-specific physical catalogue supplies dimensions, propulsion, control geometry and component identity. Shared deterministic mechanics owns thermal state, remaining capability, detachment and substantial debris. The renderer shares authored geometry between attached components and detached pieces; it never invents flight damage. Retain the existing broadside body aero and flight-control policy, adapting their inputs to V3 and surviving hardware.

**Tech stack:** Existing TypeScript/PixiJS8/Vitest/Playwright, fixed120Hz; no dependencies, language or renderer engine added.

**Specification/evidence:** owner decision in GOAL; `docs/research/2026-10-03-vehicle-realism/{v3-source-audit,damage-code-audit,v3-render-audit,reference-ledger,pro-review}.md`. The earlier Pro review did not inspect this new physics proposal. Primary-source/material audits are part of this specification, and every assumed geometry/material parameter is labeled separately from manufacturer data.

### Model decisions fixed before flight testing

- Current flown V3: Ship52m, Super Heavy72m, diameter9m, capacities1600000/3650000kg; six engines (3SL+3RVac) and33 respectively; SL250tf, RVac275tf. Use exact standard gravity9.80665 for conversion. Three booster grid fins, integrated retained hot stage, no old external engine skirt/shrouds. The124.4m prospectus stack figure is rounded differently from the124m component sum: do not manufacture a0.4m separate ring.
- Keep inherited dry mass120000/200000kg and efficiency327/350/380s as explicit uncertain engineering inputs, not verified V3 specifications. Do not use the283t aggregate residual as a stage mass. Thrust and fuel flow change together (`mdot=T/(g0*Isp)`); ambient-pressure slope is derived consistently. Manufacturer aggregate thrust is a cross-check with rounding/condition uncertainty, never a tuning target.
- Preserve each scenario's selected propellant load and launch/entry intent. Capacity increases do not fill every preset. Model-dependent surface contact, tanks, camera and catch offsets derive from the current geometry. Preserve exact intro choreography and framing intent; inspect its actual resulting flight under V3. Do not silently run a V2 intro and label it V3.
- Declare V3 control stations/areas as authored estimates where unavailable, using inspected V3 image proportions. For grids, inherited aggregate24m² ×3/4 ×1.5 =27m² is the explicit relative approximation. Never apply1.5 to both dimensions or use36m² aggregate. Publish uncertainty; retain gimbal, throttle, catch and original acceptance bounds.
- Preserve all historical truth rows and numerical bands. Historical Raptor2/Block1 quantities must probe an explicit historical profile through the same propulsion/mass functions, while new V3 rows probe the active profile and its actual forces. Never relabel a Raptor2 band as V3, substitute literals for probes, or delete a row to pass. Generation tests must prove both profile dispatch and the live default. Avoid importing the historical profile into production entry merely for the test registry.
- Progressive damage is a **declared reduced-order engineering surrogate**, not a prediction of proprietary V3 fracture. Implement finite heat capacity/conduction and temperature-dependent stiffness/strength using named published surrogate material data. Keep current equilibrium1533K,50kPa and13g terminal checks unchanged as independent conservative stops. No arbitrary damage-per-second, random neighbour failures, animated countdowns, invented ablation or unsourced fatigue law.
- Start with thermally weakened control-surface attachments and engine-support availability. Continuous thermal/stiffness evolution changes delivered control capability; a capacity breach irreversibly removes a component or shuts down its supported engine. A conservative connection-loss criterion must be identified as such; material proof stress is not measured fracture stress. Hot-but-unbroken stiffness may recover with cooling; lost hardware never heals. A natural deterministic exposure witness below the global limits is mandatory; initial damage injection alone does not satisfy progression.
- Do not add tank-pressure simulation or unequal LOX/CH4 leaks without the necessary inventories/constitutive data. Terminal breakup partitions retained propellant into released material; it must not vanish from the mass ledger. This is a bounded scope choice within progressive damage, not a claim to model every accident mechanism.
- Component masses and centroid inertias form one positive partition of the inherited dry mass. Match intact mass/COM/inertia analytically before any detachment; reserve hull residuals explicitly. Substantial detached pieces inherit the parent's rigid velocity field and gravity/drag. No artistic impulse is added to the physical momentum account. Sparks/flame/smoke are separate bounded cosmetics.

### Frozen initial material surrogate

Use the exact NIST304 enthalpy/cp/conductivity and Monash304 modulus/proof table in `damage-code-audit.md` (primary URLs, units and rows preserved there). The Monash coupon ramp was10°C/min and includes creep: this is a conservative surrogate, not flight-rate fracture data. Hold100°C stiffness/proof values below100°C; at temperatures above900°C declare attachment capability unavailable with an explicit out-of-domain reason, rather than extrapolate. No nominal flight may depend on claiming that disposition is validated V3 failure. For cold flight, use NIST's4–300K304 cryogenic fit, a declared continuous273.15–293.15K bridge (the two fits differ approximately1.95% at293.15K), and the exact hot-fit primitive above293.15K. Startup0.0625K piecewise-linear cold cp has an independently tested<0.1% interpolation bound and<0.5J/kg enthalpy quadrature error; H and cp match at every bridge. The initial0.25K table failed the cold interpolation bound; the implemented0.0625K table is the accepted correction, not a weakened tolerance. The hot thermal domain ends1200°C; do not discard energy at its boundary. Above its domain use a reported terminal model-domain event and preserve released energy/mass accounting, never pretend a clamped value is measured temperature.

The initial exposed attachment is the audit's hollow rectangular beam: B=.10D,h=.15D,L=.05D,t=.004m; all four are authored geometric assumptions. Section area/inertia/modulus and7920kg/m³ mass derive analytically. Receive current heat flux on B×L, use authored0.8 damage-patch emissivity as a blackened-surface assumption and conduct to a finite hull node with k×As/L. Derive elastic load rotation M×L/(E×Is), solve force/compliance with a bounded deterministic residual, and latch conservative loss when M/Z exceeds tabulated proof stress. This is not a fracture-energy or plastic-wear law. Do not add this root mass on top of dry mass. Ship protected hinges require the separately source-verified TPS conductance before integration; exposed booster roots can exercise the foundational law first. Unsupported tank leaks, plastic strain, ablation and cascades are explicitly excluded from this implementation.

### Contracts and ownership

| File | Responsibility |
|---|---|
| `src/core/vehicles/v3.ts` | Immutable sourced V3 inputs, propulsion profile and declared assumptions; no state or renderer imports |
| `src/core/vehicle.ts`, `vehicles/super-heavy.ts` | Active V3 definitions and shared type; retained historical test profile lives outside production entry |
| `src/core/physics/propulsion.ts`, `engines.ts` | Pressure-dependent per-kind thrust/flow shared by actual mechanics and guidance |
| `src/core/control/guidance-physics.ts`, `booster-prediction.ts`, `autopilot/{index,landing-burn,booster}.ts` | Consume actual vehicle propulsion/capability; preserve policy, authority and deadlines |
| `src/core/physics/damage-material.ts` | Pure finite thermal/strength equations with verified domains, SI units and source citations |
| `src/core/physics/damage-{flight,thermal,controls,mass,detachment}.ts`, `vehicle-components.ts` | Bounded component state, thermal evolution, capability calculation, connection loss and mass partition |
| `src/core/physics/damage-{debris,terminal}.ts` | Physical detached rigid pieces and exact discrete first-terminal payload before legacy resets |
| `src/core/state.ts`, `physics/step-dynamics.ts`, `control/mechanical.ts`, `mission.ts` | Initialize/deep-clone and advance the same damage mechanics in all live/forecast paths |
| `src/view/vehicle-geometry.ts`, `component-vehicle.ts`, `vehicle-material.ts` | Shared startup component geometry, source-defined projection, cylinder/steel/TPS lighting and LOD |
| `src/view/{vehicle,booster,effects,reentry,emissive-bell}.ts` | Thin vehicle adapters, surviving exhaust, local glow/plasma and bounded secondary cosmetics |
| `src/ui/session/{scene-vehicles,scene,session,camera-follow}.ts` | Both-body routing, reset and model-derived bounds, no renderer-side damage verdict |
| `tests/core/{v3,damage-material,damage,fragments}.test.ts` | Physical invariants, source anchors, evolution, degradation and accounting |
| `tests/reference/{anchors,registry-completeness}.ts`, `tests/golden/` | Generation-specific truth and recording-platform trajectory audit |
| `tests/view/{vehicle-geometry,component-vehicle,damage-effects}.test.ts` | Representation, attachment, articulation, independence and bounded allocation |
| `tests/e2e/vehicle-damage.spec.ts`, existing visual specs | Actual progressive degraded flights and replacement/disintegration in a running session |

`PropulsionProfile` carries full-throttle SL/vacuum thrust and mass flow per engine kind; `engineThrust(profile,kind,pressureKPa)` and `engineMassFlow(profile,kind)` serve all consumers. No caller can accidentally use Raptor2 performance for a V3 predictor.

`DamageState` contains fixed-length component arrays (temperature K, attached boolean, permanent failure state), detached-body slots and monotonically increasing transition sequence. `writeCapabilities(state,model,out)` writes surviving areas/authority/engine availability and mass properties into reusable scratch. State cloning owns every mutable array; forecast evolution cannot mutate live state. No separate random stream is needed for deterministic physical damage.

`TerminalEvent` stores reason bitset, discrete time, pose, velocity-reference convention, angular rate, retained masses and articulation before mutation. At clockwise angular rate `omega`, local offset transformed to world `(rx,ry)` inherits `vx+omega*ry, vy-omega*rx`. Capture both body identities independently, including culled/unselected bodies. A mission staging failure is not automatically both bodies' destruction.

### Review focus

1. Historical reference probes can remain green while live guidance accidentally uses old engine inputs: test actual V3 force, flow and predictor together.
2. Hot weakened controls can have stale healthy forecast commands: invalidate capability-dependent plans and test an in-progress rollout across damage.
3. Component removal changes mass/COM and velocity reference: test zero-impulse momentum and remaining-body conversion for standalone and attached/separated missions.
4. Batched steps can erase the first impact motion or duplicate fragments: preserve core transition payload and exact post-event age, including simultaneous failures and restart.
5. A detailed close-up can conceal wrong small-scale silhouette or exceeded mobile cost: inspect50px,200px and close-up at matched light, all six scenes, plus two-body failure spikes.

### R1 — V3 catalogue and generation-aware propulsion

- [ ] Save the pre-change `npm run truth:report` output in the research directory. Predict all powered/atmospheric scenario trajectories can move; empty/static helpers should retain their analytic invariants. New thermal/debris state also changes recorder shape even where motion is unchanged; distinguish these.
- [ ] Write RED tests in `tests/core/v3.test.ts` for published dimensions/capacities/counts, exact thrust-unit conversion, pressure endpoints, constant flow, no unsupported efficiency credit, three-fin aggregate area, and deep immutability. Run build then focused tests; record RED.
- [ ] Implement the immutable V3 catalogue and pure propulsion functions first. Unit-test the new model before selecting it as live default. This temporary unselected checkpoint is explicitly not a shipped V3 vehicle.
- [ ] Thread the profile through force, flow, torque, burn sizing and return predictor. Move geometry consumers from historical constants to their selected definition. Make active Ship/booster V3; retain a test-owned historical profile for old truth rows. Add V3 reference rows and inventory checks without changing old bands.
- [ ] Run build, focused engine/mass/guidance/mission/reference tests, then nominal per-scenario flight witnesses with original limits. Diagnose actual regressions under the standing three-attempt/review rule. Do not increase reserve or alter aim without measurement/health tests; do not change preset starts to conceal insufficient authority.
- [ ] Coherent Fidelity checkpoint only after truth/unit acceptance, full Linux golden generation and all-scenario audit; source, fixtures and audit row together. No Mac fixtures and no partial filtered recording.

Example independent source witness: `expect(engineThrust(V3_PROPULSION,'sea-level',101.325)).toBeCloseTo(250000*9.80665,6)`; verify vacuum thrust/flow divided by9.80665 equals the explicitly assumed350s, not a second hardcoded force. A real V3 `step` must pay the same flow and impulse.

### R2 — Progressive physical capability and component loss

- [ ] Freeze the material supplement's source tables, temperature domain, thermal geometry and conservative connection criterion before evaluating successful flight scenarios. Document uncertain component geometry; source evidence may refine it, successful landings may not.
- [ ] RED tests: thermal equilibrium/no-input cooling, energy transfer balance, material table knots/interpolation/domain bounds, unchanged cold capability, continuous loss under finite exposure, irreversible detached state, no phantom thrust/area, deep cloning/determinism and dt convergence at1/120 versus1/240s.
- [ ] Implement the smallest two-node TPS/substrate thermal model and temperature-dependent attachment capability. Reject invalid numerical inputs at construction; bound temperature integration physically without clipping away incident energy. Keep the existing equilibrium hard stop and expose finite component temperatures separately.
- [ ] Apply surviving fin area/stiffness to all actual drag/torque/actuation and guidance authority queries. Apply engine support failure through existing failed/running/countdown masks, preserving thrust/fuel consistency. Cancel stale pending ignition and invalidate damage-dependent forecasts.
- [ ] Implement positive component mass partition and detached rigid-body slots (maximum12 per vehicle,24 combined). Define remaining-body mass/COM/inertia once and use it everywhere fuel bookkeeping previously overwrote dry mass. Check no double counting/negative residuals. Retained ratio propellant remains on parent until terminal release.
- [ ] Capture first terminal event before crash/breakup clears state. On terminal failure partition surviving structure/retained mixture into bounded pieces/released material with exact ledger. Integrate substantial pieces at fixed dt; terrain stops cannot add kinetic energy. No physics dependence on visibility.
- [ ] Run real exposure-to-degradation-to-loss flight test while global limits are still below terminal, then actual impact/thermal/q breakup, stacked/separated-body independence, forecast/live parity, pause/debug/reset integration. Injected-damage unit cases supplement this witness; they do not replace it.
- [ ] Repeat required truth report; run full units and regenerate full Linux goldens only after genuine acceptance. Commit the coherent Fidelity source/fixtures/audit. Do not treat material surrogate acceptance as real-world flight certification.

### R3 — Reference-based V3 rendering and actual disintegration

- [ ] Directly inspect V3 reference photographs, record original URLs and image-estimated stations/outline uncertainty. Freeze one consistent2.5D azimuth/projection, near/far order, hull profile, tile boundary and three-grid projection. Preserve images as research references, not unlicensed production textures.
- [ ] RED geometry/graph tests for physical model dimensions, three grids/four flaps, correct nozzle depth occlusion, component identity, independent body articulation/heat, and missing components absent from intact render. Shared attached/detached geometry must meet at the same transformed vertices.
- [ ] Replace the legacy photo hull/normal reconstruction, generic booster rectangle and additive `vehicle-detail.ts` overlays with original shared geometry/material code. Keep steel diffuse/specular response separate from TPS albedo/glow; use the shared sun. Integrated hot stage remains with booster after staging. No all33bells exposed in side view.
- [ ] Startup-generate resolved surface detail; fade tile/lattice/weld detail below pixel resolution rather than enlarging it. Main and inset consume the same physical configuration. Remove superseded assets/code from the production entry, not merely hide them behind flags.
- [ ] Render physical component temperatures/detachment, suppress failed/missing engine emitters, and replace terminal hull atomically with the core pieces. Existing8000combinedparticle allocation is the ceiling; reuse it for cosmetics, no per-piece pools. No intact ghost behind a fireball.
- [ ] Run material comparisons in managed cloud headless Chromium/SwiftShader at50px/200px/close-up and through a sun sweep; inspect launch/staging/bellyflop/entry/landing/catch. Capture actual animated failure with fire/smoke disabled to verify recognizable structural pieces and inherited motion. Real progressive damage must visibly match loss of flight authority. Record the browser, backend and viewport with each capture.
- [ ] Retain original camera/sun/plume/reentry/pause/restart/parity tests and bounds. Add local hot/cold independence, hidden body failure, simultaneous breakup, terrain contact and repeated reset memory checks. Reduce cosmetic cost if bundle/frame budgets fail; never weaken the budgets.
- [ ] Commit/push only after focused build/lint/behavior/browser acceptance and source-pinned evidence; no realism claim from graph tests alone.

### R4 — Complete Phase8 release and continue Phase9

- [ ] Finish original Task6 in this cloud environment at300 warmed measured frames for each of six scenes on desktop and both phone viewport orientations in managed headless Chromium/SwiftShader. Keep the original full-session CPU/GPU-work/cadence budgets unchanged. Add simultaneous damage-onset frame-spike checks and pool exhaustion. Record actual backend, browser, viewport and machine for every result; viewport evidence describes the configured browser profile.
- [ ] Fresh independent high review of the completed protected physics/render integration; resolve real findings and document rejected suggestions. The other-agent CLI authentication preflight failed on2026-10-03 before inference; use the documented Pro/fresh-review fallback for required release independence if unavailable again.
- [ ] Run the whole ordered gate, full five-project browser suite, truth and mutation acceptance, with no concurrent heavy checks or retries. Inspect actual final motion/reference captures; update published review page and durable reference docs.
- [ ] Merge Phase8 to main, run required main gate, push and verify Pages/live exact final assets and smoke before checking Status. Delete completed Phase8 plan only after closure; preserve decisions/evidence in reference/research/Git.
- [ ] Write and execute Phase9's full plan, including per-id scenario completion audit and last-three-main-CI requirement. Whole-roadmap completion remains GOAL's full conjunction; neither this amendment nor successful damage demo closes it early.



## Release and continuation

C4 closes this phase only after all original scope and R1–R4 acceptance, fresh
independent protected review, ordered gates, reviewed main merge and deployed
build verification. Promote decisions into reference docs, record closure and
close/delete this plan only then. Write Phase 9's complete implementation plan
before its implementation; C5 retains its whole approved UX scope. No focused
physics/damage demonstration or successful launch packet closes the phase.
