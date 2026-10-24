# V3 renderer and damage integration audit — 2026-10-03

Assessment only. Owner now selects V3 physical vehicles and progressive component damage that affects flight; the older Flight5/view-only proposal in the phase plan and reference ledger is superseded for scope, not evidence. This audit recommends the rendering contract for the concrete plan. No production source edits, browser tests, heavy tests or new ChatGPT jobs were performed.

## Conclusion

Replace both existing hull depictions with one startup-owned component geometry/material system. The same component meshes depict intact, damaged and detached hardware, and their visibility, articulation, temperature and motion come from actual core component state. Keep Pixi, the existing scene layers, sun, environment, camera mechanics and tested exhaust system. Do not layer further detail or a breakup animation over the legacy photograph.

The core and source audit must freeze the V3 generation first. The supplied Deep Research report says52m Ship,72m booster, three larger/lower grid fins, Raptor3, integrated hot stage and removal of old booster shrouds/skirt/base closeout. These are report claims with linked sources, not independently verified dimensions in this audit. The local ledger's directly inspected photographs are Flight5-era. The V3 plan must add directly inspected V3 reference images and source-backed physical definitions before code. In particular, do not retain four grids or paste a pre-V3 perforated detachable ring onto the new booster.

## Current code establishes the problems

| Source | Current behavior | Consequence for V3 |
|---|---|---|
| `src/view/vehicle.ts` | Single legacy photographed hull quad; four Graphics flaps at SHIP stations; dimensions still imported from global constants | No component-specific hull removal; generation silhouette/material partition comes from the photograph |
| `src/view/booster.ts` | Literal9×71m rectangle, four grids with two axial rotation groups and alternating scale0.45 | Wrong new-generation geometry/count, no cylindrical surface response or correct near/far hardware |
| `src/view/vehicle-detail.ts` | Weld/rim/skirt/bell overlays; every engine drawn at its projected offAxis, all at one axial plane | Literal all-engine silhouettes overlap without depth/occlusion; booster detail is pre-V3 |
| `src/view/lighting.ts` and `heat-shield.ts` | Legacy silhouette-derived normals and delight gain; neutral authored tile patch fixed inherited material bias | Useful directional-light math; photo-dependent reconstruction should leave the production entry graph when geometry replaces the photo |
| `src/ui/session/scene-vehicles.ts` | Independent body pools, but visibility depends on selection/debug only; one shared Ship lighting instance is used by main/inset | Failed bodies remain intact; no local component state reaches geometry; material uniforms must not be shared across differently moving components |
| `src/view/effects.ts:370` | First crash/breakup emits600/800 generic explosion particles | Cosmetic burst cannot represent structural mass or progressive local damage |
| `src/view/reentry.ts` | Whole Ship capsule sheath plus capsule skin glow; fixed Ship aspect/inset dimensions | Glow may survive across missing structure; damage must not leave an incandescent intact ghost hull |
| `src/ui/session/camera-follow.ts` | Ship bounds use existing flap constants; booster bounds use literal17m width | V3 bounds should come from the component definition; do not recalibrate camera mechanics to disguise geometry errors |
| `src/view/world.ts` | Ground shadow uses global Ship dimensions and selected pose | Model/remaining-body dimensions are required; a selected booster must not cast a Ship shadow |
| `src/view/post.ts`, `scene.ts` | Heat filter runs on entire vehicle layer using selected body intensity/centre | Selected Ship heat can distort the cold booster in the same layer; local heat must stay body/component-local |
| `src/core/physics/step-dynamics.ts:155` | Current terminal breakup ORs felt-g, skin-temperature and pressure limits, then zeroes spin/fuel | Existing terminal flags are insufficient progressive damage evidence; renderer must consume the new core damage/event contract |

Existing process protections still apply: original intro/preset/control behavior and original sunlight/thermal/pixel bounds stay acceptance. V3 numeric/model changes require the explicit physics tier and trajectory audit in the parent plan; this audit does not authorize recalibration or golden updates.

## Component contract and model frame

Use a small physical component catalogue with stable IDs, axial station above engine plane, attachment parent, mass/inertia contribution, actuator/engine identity and damage channel. Core owns the physical fields; view owns authored profile points, circumferential placement, depth, normal/material mapping and detail. A component can have multiple surface patches but one physical identity. No render file independently copies52/72m, engine counts or fin stations.

Choose one fixed orthographic visual projection. It depicts a 2D simulator with authored depth; it does not invent roll/yaw dynamics. Declare the TPS-facing side and near/far ordering using V3 references. Ensure projected lateral engine/actuator attachment coordinates are consistent with the physical model's offAxis convention. If the physical catalogue lacks circumferential depth, supply it as view-only authored metadata tied to stable mount IDs. Do not silently rotate nozzle coordinates away from the model while exhaust still uses the old offsets.

Use the same body-centre/engine-plane transform helper for intact hull, flaps, grids, engine bells, emitter origins, heat surfaces, catch lugs, bounds and fragments. The legacy standalone Ship nozzle arm differs from mission Ship half-height today (`scene-vehicles.ts` and `effects.ts`); the V3 model migration must resolve the physical coordinate convention deliberately rather than adding another renderer exception.

Author a curved nose profile, barrel sections, flap root/hinge volume, V3 grid frames, integrated hot-stage surfaces, raceways, visible engine-bay structure and actual engine bells. Use surface tessellation and component-local normals; no photographed lighting or camera-facing silver stripe. The geometry catalogue supplies a conservative silhouette bounds function for camera/framing and heat coverage.

## Material and mesh architecture

Prefer a compact analytic lit Mesh shader shared as one compiled program across Ship, booster and detached structural parts. Each instance has its own transform and sun/material/heat uniforms. Geometry buffers and material atlas are allocated at startup and reused. Near/far surfaces use a fixed sorted component order, updated only if articulation changes an ordering boundary; avoid a per-frame generic3D scene sort or depth engine.

The shader separates neutral albedo, actual surface normals, roughness/specular, coverage and emission. Stainless uses coherent directional highlights with restrained environmental fill; tiles are matte dark material with a generation-specific authored TPS contour. Main and inset use the same geometry/material definitions, separate uniforms and actual component damage. Dynamic sunlight still comes from `lightInVehicleFrame`, while detached parts use their own core pose. Do not approximate a fragment's sunlight by the former parent body's pitch.

Encode resolved welds, tile seams, vent slots and weathering as an original startup atlas or compact shader detail. Avoid one Graphics object per tile, ring cell or engine-bay fastener. Low LOD retains silhouette, TPS boundary, fin/grid outline and steel cylinder contrast; unresolved tiles, welds and lattice fade away by projected texel/pixel footprint. Geometry never grows to meet a detector. Use full/reduced paths with explicit static counts, not per-frame store updates.

No WebGPU claim from API preference alone: existing custom hull/sheath/post shaders provide only `GlProgram`. Confirm actual backend support or explicitly retain the tested WebGL path for this scope; a new GPU-program port is additional implementation that requires its own validation.

## Progressive damage and disintegration

Core must publish actual component integrity/attachment state and bounded detached physical bodies or event snapshots. The renderer cannot decide that a fin fell off from a global temperature, invent a leak that changes fuel, or decrease a control surface after a timer. Damage quantities need defined units/meaning; do not colour a core-less generic health bar and call it progressive physics.

An attached damaged component remains positioned by its actual parent and actuator state. Missing TPS exposes the core-identified patch/material; lost actuator authority changes actual fin motion; engine loss removes its actual bell/emitters only when physical attachment/failure says so. Tank rupture, mass release and major breakup occur only on their physical events. V3's integrated hot stage is not automatically jettisoned on the old staging timer.

For detached substantial parts, render actual core pose/velocity/spin and attachment transition. Reuse the same mesh immediately at separation, with no duplicate intact copy or disappearance before fragment creation. At zero separation impulse, inherited point velocity must equal parent velocity plus angular velocity crossed with the centroid offset from its actual velocity reference point. Coordinate/mass contracts belong to core tests; view tests check the representation matches them. View-only spark/dust flecks may be pooled cosmetics, clearly excluded from the flight force/mass account.

Consume per-step damage transitions for both body IDs, independent of selection and culling. Preserve reset generation, sequence and event time across a batch of120Hzsteps, including sequential and simultaneous failures. Current render `previous` cannot reconstruct impact spin/fuel already zeroed by core. Prefer explicit core transition records that the physics implementation can emit at the verdict; if a session observer uses last-intact step-start snapshots, document the≤1/120s timestamp approximation. No object-reference identity and no propagation from mission `stagingFailed` to both bodies.

Use simulated time only. Pause freezes damage visuals and debris; debug stepping advances them by exactly the step duration; restart clears old generation history. Core state should determine fragment motion, not an independent wallclock integrator in view. Cosmetics may age by worldDt with event-age correction, never by whole-frame dt when the event occurred at the frame end.

Preserve current plasma/skin causal separation. Put local incandescent emission on extant component surfaces using their core temperatures; use the existing `tileGlow` authored mapping without moving1533K. Atmospheric plasma/wakes follow actual flux and relative wind independently. Suppress whole-body sheath when gross breakup destroys its shape, and never illuminate missing TPS as an intact tile field. Heat distortion must not warp an unrelated cold body; body-local bounded effect regions or omitting optional distortion are preferable to one selected-body full-layer filter.

## Resource and entry-graph strategy

Current particle allocation is4000 per system, two systems=8000sprite slots; do not describe it as4000combined. Retain its existing occupancy/coverage contracts. Before implementation choose explicit maximum substantial core fragments, rendered cosmetic shards and additional trails across both bodies; preallocate their geometry/instances. Use one shared material/texture resource per class, not another4000particle pool for each fragment. Pool exhaustion must drop cosmetics before structural parts or damage cues.

Remove superseded production paths: photographed Ship load from `assets.ts`, photo readback/delight generation from `lighting.ts`, `vehicle-detail.ts` overlays, old booster rectangle/four-grid construction, old Ship fin-redraw path and the generic terminal explosion switch in `effects.ts` once the replacement event system supplies compatible cosmetics. Do not retain an alternate legacy renderer behind a runtime flag merely for comparisons; historical captures/commits provide that baseline. Keep tests of meaningful sun, coverage, geometry and startup ownership with revised physical V3 definitions.

Deleting `Starship.webp` loading reduces external bytes, not first-load JS. The prior measured entry budget has roughly0.8kBheadroom; treat this as a measured historical value, not current proof. Replacing reconstruction/overlays may save JS, but measure the actual entry dependency graph early. Use no new runtime package, fracture solver, general3D scene library or duplicate shader framework. Never lazy-load code needed to start or simulate V3 and pretend it escaped the budget; genuine optional reference viewers/diagnostics may stay outside production entry.

Measure startup asset generation separately from steady-frame and failure-onset cost. Repeated resets must retain pooled allocations, reset state and release resources on session destruction. Benchmark six required scenes plus simultaneous disintegration/onset spikes at original desktop/phone budgets,300warmedframes per scene, actual session/HUD/core/GPU cost and RAF cadence. GPU timer disjoint/unavailable cases must be reported honestly. Emulated viewports are not real handset verification.

## Proposed file ownership for the parent plan

| File | Responsibility |
|---|---|
| `src/core/vehicle.ts`, `vehicles/super-heavy.ts`, new core component/damage modules | Source-backed V3 physical catalogue and progressive mechanics; separate physics workstream |
| new `src/view/vehicle-geometry.ts` | Pure authored component profiles, projection, normals, immutable depth/LOD metadata; references core catalogue |
| new `src/view/vehicle-material.ts` or rewritten `lighting.ts` | Shared analytic material program and startup atlas; remove legacy photo reconstruction from production |
| `src/view/vehicle.ts`, `booster.ts` | Thin factory adapters to one shared component renderer; keep stable body labels for debug/tests |
| new `src/view/component-vehicle.ts` | Startup object ownership, local transforms, material uniforms, physical attachment/visibility/LOD; no physics decisions |
| new `src/view/damage-effects.ts` | Bounded event-driven cosmetic secondary effects; substantial motion remains core-owned |
| `src/ui/session/scene-vehicles.ts`, `session.ts`, `mission-controller.ts` | Route both physical bodies/events and reset generations into view; preserve selection independence |
| `src/view/effects.ts`, `emissive-bell.ts`, `engine-glare.ts` | Reuse pressure/throttle/gimbal look; obtain actual intact engine attachment frames and stop lost mounts |
| `src/view/reentry.ts`, `heat-look.ts` | Shared inset components, actual model aspect, local surface emission and surviving plasma coverage |
| `src/ui/session/camera-follow.ts`, `src/view/world.ts`, `scene.ts`, `post.ts` | Model/remaining-component bounds and shadows; body-local heat; retain existing mechanics and HUD layers |
| `src/view/render-quality.ts` | Explicit combined budgets, LOD and optional cosmetic/post reduction |
| `src/hud/engine-groups.ts`, `metrics.ts`, `timeline.ts`, `debrief.ts` | Display actual damage/engine availability and event reasons; no new React per-frame path |

## Focused verification to name in the plan

- `tests/view/vehicle-geometry.test.ts`: V3 catalogue coverage/counts, finite profiles, units/stations, projected mounts, depth order, remaining-component bounds, startup object identity.
- `tests/view/component-vehicle.test.ts`: actual articulation, one component removal, local damage material, matching intact/detached replacement transforms, independent main/inset uniforms, no per-frame object growth.
- `tests/view/damage-effects.test.ts`: event identity, exact aging/pause/reset/debug behavior, bounded combined cosmetics, both-body separation and pool exhaustion; core mechanics tested separately.
- Update `tests/view/booster.test.ts`, `vehicle-detail.test.ts`, `engine-effects.test.ts`, `reentry.test.ts`, `lighting.test.ts` around approved V3 contracts rather than preserving obsolete four-grid or photographed-material expectations.
- Extend `tests/ui/mission-session.test.ts`, `mission-camera.test.ts`, `camera-follow.test.ts` for hidden/unselected body damage, batch transitions, component-derived bounds and catch ground framing; preserve intro motion/controls.
- Actual GPU material witness: independently sweep sun and attitude with authored source, steel/TPS controls and local hot/cold equal-flux controls; retain original `sun.spec.ts`, `reentry.spec.ts`, `post-compositing.spec.ts` detector/threshold bounds.
- Real-session `tests/e2e/vehicle-damage.spec.ts`: core-driven progressive fin/TPS/engine loss and degraded flight; Ship-only/booster-only/sequential/simultaneous breakup, staging selection, failed emitters, no intact ghost hull, fragments visible with fire/smoke disabled, pause/debug/reset/camera pan/zoom/terrain contact.
- Extend original six-scene `visual-scenes.spec.ts` and opt-in `visual-budget.spec.ts`; capture50px/200px/close-up rendering and compare V3 silhouette/material/near-far checklist to directly inspected V3 references. No existing passing test is a realism sign-off.

## Boundaries and remaining uncertainty

This is a source audit and candidate architecture, not a performance or visual certificate. Mesh versus atlas detail cost, grid/bell occlusion and faithful V3 projection need actual native-session prototypes. The physical component model must settle how detached mass, fuel release, local temperature and authority affect flight before the renderer interface is final. Do not reinterpret public accident photographs as fracture strengths or tune damage to produce an impressive animation.

The parent plan should first update the old no-core-change/Flight5 scope clauses with the owner's explicit V3/progressive decision, then define source-backed model truth, damage mechanics and component contract, then replace the renderer, and finally validate actual degraded flights and release acceptance. No extra decorative pass on the old model is warranted.
