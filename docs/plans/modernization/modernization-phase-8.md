# Visuals Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking. The approved goal authorizes implementation, publication, independent review and clean merges without another owner checkpoint.

**Goal:** Make launch, staging, belly flop, entry, landing and tower catch visually distinct, physically driven and affordable on desktop and phone.

**Architecture:** Preserve the existing scene graph, shared sun, pooled particles, nozzle meshes, lighting and deterministic camera. Add small pure look functions and startup-owned geometry; the framework-free scene consumes simulation state without writing it. Reuse existing browser pixel detectors and real session flights.

**Tech Stack:** TypeScript, PixiJS 8, WebGL/WebGPU, existing shader pipeline, Vitest and Playwright; no new runtime dependency.

**Spec:** `modernization-roadmap.md` Phase 8, `modernization-GOAL.md`, `docs/design/design-system.md`, `docs/reference/presentation.md`.

## Global constraints

- Ship every approved area: engines/plumes; re-entry/heat; environment; vehicle/camera. Phase 9 retains UX ownership.
- No numerical core changes, golden regeneration, preset changes, intro sequence edits or pig movement. State is read-only; all physical limits and parity assertions remain.
- First-load JavaScript ≤300 kB gzip; six-command gate ≤300 seconds on Steve’s Mac; hosted CI ≤20 minutes. Floors remain unchanged.
- Render curves are authored visualization, not quantitative exhaust photometry, geographic surveying or temperature imaging. Label compression in source and reference docs.
- Desktop full-frame work p95 ≤16.67 ms and measured steady cadence ≥59 frames/s (60 fps target); phone reduced-quality full-frame work p95 ≤33.33 ms and measured cadence ≥29.5 frames/s (30 fps target). Full-frame work includes the actual session tick, simulation, HUD, scene and GPU completion, not rendering alone. Viewport emulation is not an actual handset claim.
- Build before tests; no concurrent heavy checks. All existing bounds, positive controls and zero local retries remain. Renew coverage seals only after auditing all affected closures; otherwise retain conservative full coverage.
- Existing worktree and native inline execution stay in use. Independent reviewers are for review; do not dispatch implementation tasks.

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
- `src/view/vehicle-detail.ts`: reusable startup-owned hull welds, heat shield and engine skirt details; `vehicle.ts` and `booster.ts` consume them.
- `src/view/render-quality.ts`: explicit full/reduced visual policy, bounded particles and optional post cost; scene owns transitions.
- `src/ui/session/scene.ts`, `scene-vehicles.ts`: wiring only; keep files under500 lines and all per-frame output preallocated.
- `tests/view/{engine-look,heat-look,coast,vehicle-detail,render-quality}.test.ts`: pure and graph behavior.
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
- [ ] Run pure/graph tests and existing reentry/hot/cold pixel witnesses, record actual six-scene captures; commit/push `feat(view): show surface temperature separately from plasma`.

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

- [ ] Write RED graph/look tests for coast tied to world coordinates through pan/zoom, night/day tint, objects culled offscreen, shared curved ground clip and unchanged pig/pad positions. Add render positive controls isolating ocean vs land and night lighting.
- [ ] Build/test RED; add restrained ocean band, coast boundary, concrete pad/roads, tower truss/mechanical detail and night lights. Reuse horizon mask and shared sunlight; keep secured indicator exclusively tied to physical catch. Preserve existing generated ground texture and clouds/sky/night behavior.
- [ ] Drive actual near-pad launch/landing/catch plus20/100km daylight/night scenes. Inspect silhouettes, coast readability and ground/sky seams on every viewport. Keep existing terrain/tower assertions unchanged; commit/push `feat(view): place Starbase on a coherent coastline`.

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

### Task 5: Vehicle material and cinematic framing

**Consumes:** existing Ship/booster physical poses, articulated fins, model dimensions and deterministic camera. **Produces:** reusable startup geometry from `createVehicleDetail(height:number,diameter:number,booster:boolean):Container`; no new camera mode or scripted physics.

- [ ] Write RED graph tests for detail scaling with actual dimensions, finite zoom, all four moving booster grids, independently articulated Ship fin pairs and shared day/night shading. Add real scene assertions for staging with both bodies and caught booster remaining at tower.
- [ ] Build/test RED; add restrained weld/ring/skirt detail, projected engine bells, distinct stainless/tile faces and fin structure. Improve existing camera composition/lead/shake/bloom only where screenshots establish a gap; preserve original intro follow/FOV and reduced-motion zero shake.
- [ ] Run original camera golden-framing, staging/catch/restart/shake witnesses plus six-scene screenshots across desktop andphones. Keep existing motion bounds; commit/push `feat(view): give both vehicles readable flight detail`.

Verify model-scale geometry without baking a pixel scale into the model:

```ts
const detail = createVehicleDetail(71, 9, true);
expect(detail.label).toBe('booster-detail');
expect(detail.children.length).toBeGreaterThan(0);
const before = detail.children.length;
detail.scale.set(2);
expect(detail.children.length).toBe(before);
```

Run build then focused `tests/view/booster.test.ts`, new detail suite and original camera tests; use real browser screenshots for material quality.

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

## Execution ledger

Phase7 main/live closure is complete and its documentation is merged at e8a06ff. Branch claude/visuals is created from that main. Task1 is in progress; no runtime implementation has started. Native execution and the full Phase8 scope are already approved. Skill handoff confirmation and default plan directory are overridden by the standing goal. Ruling: persist the next phase plan while the last Phase7 hosted follow-up finishes; implementation remains blocked on truthful Phase7 closure. This preserves the plan without skipping the dependency.

Task1 publication: private Pages fallback at https://chatgpt.com/space/page_86fcf9be7d708191ad082fb932b96ef0; successful visualization receipt and readback confirm the embed. Identical local source inspected in the real in-app browser at1280×720/390×844, all six scenes/full+reduced, 24 saved JPEGs. Reduced DOM checks show no horizontal overflow, 44px scene targets, one pressed scene and zero visible extra-detail elements; Tab/Enter selects Staging and preserves native focus. Prototype is entirely static between user interactions/resize, with no animation, timer or RAF: reduced-motion needs no moving-effect override. Corrected duplicate Catch tower and CSS transform-box misalignment before publication. Private Page browser viewer requires login, so host embed rendering is explicitly unverified; connector publication itself is verified and does not block approved runtime work. No owner question or runtime change.

Task2 per-engine checkpoint: look helper drives actual mesh geometry and per-mount particle origins; SL follows actual gimbal and RVac stays fixed. All engine birth debt/RNG slots are startup-owned; aggregate rate and4000-particle pool are retained. Existing cadence regression diagnosed by arithmetic:80/s at120Hz emitted159 over2s vs160 at4Hz because fractional modulo lost integer boundaries. Compensated cumulative births fix it; original assertions unchanged. Browser cycle1:47pass/5fail, all failures the original positive-thrust/zero-throttle unsaturated gas control; restored existing mesh reach floor, then all5 affected controls pass. Original vacuum/length/bloom/smoke/restore/production-lifecycle controls passed; all5 real staging/selection/pause/restart witnesses pass. Full view suite25files/347tests passes; build296.2kB. No core/golden/preset/legacy change. Task2 remains open for explicit staging/landing glare and final integration acceptance; Tasks3–6 and Phase9 remain owed. Staging screenshot establishes tiny high-altitude vehicle framing to assess in Task5, not an excuse to weaken any test.


Task2 complete: actual state-driven nozzle/ground glare integrated per physical body; 350 view tests, 57 plume/emissive/compositing browser tests, 15 staging/bell/glare integration tests and five strengthened absence-detector tests pass without retries. Build296.6kB/lint0 errors. Evidence: docs/research/2026-10-03-phase8-visuals/task2-glare/. Task3 surface-temperature heat is next. Whole-phase gate/review/merge/budgets remain owed.


Task3 temperature checkpoint: actual equilibrium-temperature curve independent of plasma; main/inset preallocated uniform. Focused12/fullview354 tests pass, allfive equal-flux actual pixel controls and allfive original hot/cold reentry witnesses pass; isolated PNGs retained, desktop inspected. Build296.9kB/lint0 errors/existing warning. Task3 is still open for belly material, opposite-windward/selected-booster/restart witnesses and final capture/integration scope. Evidence: task3-temperature-checkpoint research. No core/golden/preset/legacy change.

Task3 material cycle1 exhausted: attempt1 +x flank failed5sun checks; attempt2 normal.z belly passed29/30 with one iPhone landscape ratio failure; attempt3 display range .38/.44 passed29/30 with one Pixel landscape failure. Original sun limits/detectors unchanged.357view/build297.2kB green. Fresh independent reviewer tile_cycle2_fresh_review is assessing frozen source after peer CLI subscription authentication preflight failed; no next cycle before terminal review/new evidence approach. Temperature/windward/restart/booster controls pass allfive. Task3 material and six-scene captures remain open; researchtask3-material/result.md.

Task3 material corrected in cycle2attempt1 after fresh independent source-asset review: neutral authored tile RGB and same-mask unitgain remove retained photographic bias; steelalpha/gain/rims/normals/sun/matte preserved.359view/build297.2kB/lint0errors and35browser tests allfive pass zero retries, original sun limits unchanged. Task3 six-scene captures/final integration and allTasks4–6/all9 remain owed; noTask3done line yet. Researchtask3-material/result.md.
