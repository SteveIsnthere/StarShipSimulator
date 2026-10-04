# Renderer material witness cleanup — 2026-10-03

Approved view-only scope: replace obsolete photograph-normal shader acceptance with actual V3 component material GPU witnesses. Active renderer is `createVehicle` → `createComponentVehicle` → `createComponentMaterial`, using original metre geometry and analytic normals. `lighting.ts`/`heat-shield.ts` are no longer sampled; `vehicle-detail.ts` has no consumers. Ignored legacy vehicle/inset arguments retain misleading API surface.

Plan: preserve all pure historical photograph normal/gain/TPS equations and numerical assertions under explicit tests/view/fixtures imports, remove dead GPU wrapper and production overlay files/types/arguments, adapt narrow scene/inset callers. Render the current forward-barrel component alone and then the full authored Ship through its actual component renderer. Sample opposite cylindrical TPS faces at fixed physical stations, with identical mesh/normal/light/environment/exposure, then switch only material selection from tile to steel as the positive control. Preserve existing dark-versus-steel, day/night, reversed sun inequalities and1.25 face-ratio bounds. This control compares the complete authored material response (including its roughness/reflectance), not an albedo-only radiometry claim. Photo-specific "baked bias removed from real photo" wording becomes historical; no photograph remains in active geometry.

Fresh focused unit checks, normal build/budget and two focused GPU browser witnesses required. Do not claim full visual acceptance from standalone material captures. No simulation or physical damage changes.

## Implemented and checked

Removed dead production lighting, heat-shield and vehicle-detail modules, ignored vehicle/inset photo arguments and the unused STARSHIP_TEXTURE export. Adapted only their scene/inset callers. Original pure photograph lighting/heat-shield equations remain explicit historical test fixtures; their numerical assertions are unchanged. Current GPU witnesses invoke createVehicle and the actual component materials. The barrel witness isolates the forward hull; the second renders the full authored graph. Both sample fixed opposite TPS faces at stations 20–32m. Positive control changes only the sampled component material selector from tile to steel, preserving geometry, analytic normals, light, environment and exposure. All original inequalities and the 1.25 mirrored-face ratio bounds remain.

Fresh evidence (logs in renderer-material-cleanup/):

- Focused five unit files: 32/32 passed after final caller adaptation.
- Focused lint: exit 0, no diagnostics.
- Initial build exposed an overlooked three-argument scene factory test caller (TS2554); fixed the caller. Fresh normal build passed, first-load JS 294.6/300.0 kB gzip, fonts 50.9/80.0 kB, entry graph 9 files without uPlot/GSAP.
- Dedicated fresh port 4373: two GPU witnesses × all five configured projects, 10/10 passed, zero retries, 9.7 seconds. No renderer errors reported.

Actual red-channel means were identical in the five profiles:

| Material/light | Left | Right |
|---|---:|---:|
| TPS, day | 13.106796875 | 66.731875 |
| TPS, reversed sun | 67.2334375 | 13.105390625 |
| TPS, night | 2 | 4.54859375 |
| Steel positive control, day | 54.670859375 | 218.992890625 |

Directly inspected saved day, reversed-sun and steel-control PNGs: hex TPS cells remain dark, the cylindrical highlight changes sides with the sun, and the steel control is brighter on identical geometry. These are causal standalone material GPU witnesses under Chromium viewport emulation. They do not establish full-scene visual acceptance, real Safari/handset behavior, physical radiometric accuracy or natural disintegration acceptance. Obsolete photo-specific baked-bias comparisons are recorded as historical equations, rather than claimed as current acceptance.
