# Reference-Faithful Starship and Super Heavy Rendering and Breakup Design

## Conclusions

For the simulator’s **baseline vehicle, lock the art and breakup assets to the Flight 5 configuration of 13 October 2024**—the specified Ship 30 / Booster 12 pairing—and resist “improving” it with later hardware. The defensible Flight 5 envelope is a **50 m × 9 m Ship over a 71 m × 9 m Super Heavy**, with four Ship flaps, six Ship Raptors, 33 booster Raptors, four booster grid fins, and the pre-V3 vented/detachable hot-stage architecture. The FAA explicitly depicts the 50 m × 9 m Ship and lists the earlier 50 m/71 m vehicle dimensions; NASA’s September 2024 wind-tunnel article independently shows and describes the four-grid-fin, 33-engine Super Heavy. citeturn35view0turn36search6turn32search3

The largest fidelity gain is therefore **not more texture detail**. It is replacing the legacy photographed Ship sprite and rectangular booster with generation-specific silhouette geometry: correct nose-to-barrel transition, unequal forward/aft flap shapes, a deliberately traced heat-shield boundary, external raceways and ring seams, recognizable grid fins and vented hot-stage ring, and distinct sea-level/vacuum engine bells. SpaceX’s Flight 5 footage supplies the authoritative moving reference for launch, hot staging, controlled entry and splashdown: https://www.youtube.com/watch?v=hI9HQfCAw64. citeturn38youtube6

For rendering, use a **single fixed orthographic-like three-quarter projection**, authored rather than synthesized from a photograph. A shallow azimuth exposing both the dark windward tile field and reflective leeward steel gives far more identification value than a strict side view. At game scale, silhouette and material partition matter before rivet-level detail. PixiJS’s own v8 guidance favors batched sprites/spritesheets and warns that numerous filters, masks and blend-mode switches are expensive, especially on mobile. citeturn45view0turn45view1

For destruction, eliminate the current “particle burst + intact vehicle still present.” **On failure, the intact renderable must be replaced by persistent, recognizable parent fragments whose initial motion inherits the vehicle’s translation and rotation.** Ground impact, aerodynamic breakup and thermal failure should have different precursors and debris fields. SpaceX’s documented Flight 2 and Flight 7 failures, NASA reentry-analysis methodology, and FAA analysis of SN9 all argue against one universal spherical explosion. citeturn31search1turn33view3turn34view1

Finally, keep **V2 and V3 as separate asset families**. Flight 7 on 16 January 2025 introduced an upgraded/new-generation upper stage; contemporaneous reporting reproducing SpaceX’s preflight description says its forward flaps became smaller and moved toward the tip and away from the heat shield, while propulsion changes increased propellant volume by 25%. The Flight 7 booster was not V3. citeturn42search0turn42search1turn42search4 V3 was formally introduced by SpaceX on **12 May 2026** and has much more radical, independently NASA-confirmed changes: Raptor 3, **three 50%-larger booster grid fins**, integrated hot stage, and deletion of the former booster engine skirt/shrouds/large base heat shield. citeturn32search0turn32search1turn33view0

## Flight Five visual inventory and proportions

Treat measurements below as three different classes: **published** means externally documented; **image estimate** means my approximate tracing range from the cited Flight 5 imagery/footage and should be tuned against high-resolution source frames; **render simplification** is an artistic prescription, not a claimed vehicle dimension.

| Feature | Flight 5 reference | Recommended 2D abstraction |
|---|---|---|
| Overall Ship | **50 m × 9 m, published** by FAA schematic; length/diameter ratio 5.56. citeturn35view0 | Make this the invariant scaling frame. Never stretch a later 52 m design back to 50 m. |
| Nose | Smooth ogive-to-full-diameter transition; **~10.5–12 m image estimate** from Flight 5 silhouettes, roughly 1.2–1.3 diameters. citeturn38youtube6turn37view1 | Use a curved outline, not a cone. Preserve its narrowing even below 100 px. |
| Cylindrical body | Remainder is predominantly constant-diameter barrel; **~38–39.5 m image estimate**, counting the aft cylindrical region. citeturn38youtube6 | Perfectly parallel main sides are preferable to photographic perspective taper. |
| Forward flaps / hinges | Flight 5 has the **larger V1 forward-flap arrangement**; roughly **8–9 m axial root length and ~2–3 m visible projection** are image estimates, not published dimensions. The V2 redesign had not yet flown. citeturn42search1 | Separate near/far flap layers. Show a substantial root/hinge fairing rather than an aircraft-style razor hinge. |
| Aft flaps / hinges | Visibly larger than forward flaps; **~10–12 m axial extent and ~3–4 m projection** are tracing estimates. citeturn38youtube6 | They should dominate the belly-flop silhouette; do not make all four flaps interchangeable sprites. |
| Windward tiles | Dark TPS covers the windward surface and flap-facing regions; the boundary is **not usefully represented as a straight 180° half-cylinder split**. SpaceX’s reentry program explicitly focuses on high heating and TPS survival. citeturn38search1turn33view4 | Trace a generation-specific mask from references. At high LOD suggest tile tessellation; at low LOD retain only the unmistakable black-field contour. |
| Steel skin / weld rings | Bright metallic leeward skin shows broad lighting gradients and repeated circumferential manufacturing seams in close imagery. citeturn37view1turn38youtube6 | One broad longitudinal highlight plus restrained ring bands. Do **not** bake the sunset/highlight from a photograph into the base texture. |
| Raceways | Narrow longitudinal external raised features are visible on Flight 5-era vehicle surfaces, especially Super Heavy. citeturn37view4turn43image0 | One or two carefully placed strips with a shadow edge; not random vertical ribs around the cylinder. |
| Super Heavy | **71 m × 9 m baseline, published** in FAA’s earlier configuration table; 33 Raptors and four grid fins are corroborated by NASA’s 2024 model. citeturn36search6turn32search3 | A tall cylinder, not a rectangle: include a narrow top interstage, fin silhouettes, raceways and an articulated engine base. |
| Grid fins | Four, high on booster; exact flight-hardware dimensions are not published in the cited engineering material. NASA says the four fins stabilize/control reentry. citeturn32search3 | Estimate shape from long-lens return photos; a coarse lattice silhouette is enough below ~150 px. |
| Hot-stage ring | Flight-5-era architecture uses the earlier protective interstage; SpaceX had introduced post-boostback jettison of this adapter on Flight 4. NASA CFD shows upper-stage exhaust escaping through **interstage vents** and expanding around the booster. citeturn32search0turn32search2 | Render obvious open slots, not a solid collar. During staging let plume light pass through the slots; support a detached-ring object later in booster flight. |
| Engine bays | Ship: six engines, with three sea-level and three larger vacuum units in the era represented; Super Heavy: 33 engines. Flight 5 footage shows six-engine Starship ascent. citeturn38youtube6turn36search3 | Side view should show only plausibly unobscured bells. Make RVac bells conspicuously larger; reserve full 33-engine pattern for bottom-oblique views or debris rotation. |

The tile mask deserves particular care. NASA aerothermodynamic work emphasizes that local geometry, roughness and TPS details alter heating; it is therefore more credible to show a coherent windward field, flap-edge/hinge hot regions and localized disturbed areas than a uniform orange “reentry skin.” citeturn33view5

### Generation boundaries

**V2, first flown 16 January 2025:** SpaceX describes Flight 7 as an “upgraded design of the upper stage.” Its preflight description, preserved contemporaneously by Spaceflight Now, specifies smaller forward flaps shifted toward the tip and away from the heat shield, plus a 25% propellant-volume increase, vacuum-jacketed feedlines and revised Raptor-vacuum feed architecture. Treat the often-reported ~52 m V2 length as a secondary-source dimension unless you deliberately adopt that source; do not silently insert it into Flight 5 art. citeturn42search0turn42search1

**V3, announced 12 May 2026:** this is a separate full asset set. SpaceX specifies three rather than four booster grid fins, each 50% larger, lowered/re-clocked fins with more hardware internalized, an **integrated hot stage**, Raptor 3, increased Ship tank volume, revised aft systems, deletion of individual engine shrouds/large aft closeout, and revised aft-flap actuation. NASA independently lists the V3 booster’s Raptor 3 propulsion, lack of the old engine skirt/shrouds/large base heat shield, three larger grid fins and integrated hot stage. citeturn32search0turn32search1turn33view0 SpaceX’s current page gives the current vehicle as **52 m Ship + 72 m Super Heavy, 124 m overall**; its June 2026 prospectus gives 124.4 m overall. These are **not Flight 5 dimensions**. citeturn40search0turn40search5

By Flight 13 on **24 July 2026**, SpaceX explicitly called the mission the second flight of Starship/Super Heavy V3; Flight 14 on **28 September 2026** remained V3 and continued heat-shield experiments including extra tile retention, blocking plasma flow paths behind tiles and curved tile areas. citeturn32search4turn39search0turn40search3

## Projection, materials and level of detail

Use one authored camera: **orthographic or extremely weak perspective, approximately 20–30° around the vehicle from a pure tile/steel boundary view**. That angle allows the player to read the dark windward surface and reflective steel simultaneously while retaining a clean cylinder. Fix camera azimuth across intact and fragment assets; convey vehicle attitude by rotating the assembled 2D hierarchy, not by swapping between unrelated photographs.

Construct each vehicle from a small hierarchy: rear flap, hull, far-side appendages, tile overlay, raceway/highlight layer, near-side appendages, engine-bay/nozzle layer, then transient plasma/plume. Author normal-like lighting analytically from the cylinder coordinate rather than generating normals from photographic luminance. A simple cylinder term `N·L` plus rough/specular response for steel and a nearly diffuse dark TPS field prevents the classic error where a baked photograph remains lit from camera-left while the game sun is elsewhere.

For **PixiJS 8.20.0/WebGL**, pre-bake static geometry into a compact atlas and keep movable flaps, hot-stage ring and major fragment classes as separate sprites or simple meshes. PixiJS recommends spritesheets, identifies sprites as its fastest rendering path, notes hardware-dependent batching of multiple textures, and warns that filters, sprite masks and blend-mode alternation can multiply cost. citeturn45view0turn45view1 One shared hull-lighting shader/filter is preferable to individual filters on every ring, tile and fragment; particle glow should be grouped by blend mode rather than alternating normal/additive objects. Use application-level culling for debris once outside the camera envelope. citeturn45view2

The LOD priority should be explicit:

| Hull height | Must remain readable |
|---|---|
| **~50 px** | nose/barrel silhouette; forward-vs-aft flap size; black-vs-steel division; booster grid fins; hot-stage collar; engine/plume end |
| **~100 px** | flap-root masses, one/two raceways, several weld bands, vent slots, RVac-vs-sea-level nozzle size |
| **~200 px** | restrained tile tessellation, hinge details, more weld rings, raceway brackets, engine-bay recesses and reentry discoloration |

Individual tiles, every weld seam and a literal 33-bell drawing become aliasing noise at the low end. Exaggerate **contrast or minimum line width**, not geometry: for example, a real seam may become a one-pixel low-contrast band, while a fin must not be made twice its physical width merely to survive downsampling.

## Breakup and failure appearance

The breakup renderer should be **state-driven visual reconstruction after the flight model declares failure**, not an unvalidated structural solver. For each fragment, initialize

`v_fragment = v_vehicle + ω × r_fragment + Δv_separation`

with inherited vehicle velocity and angular motion dominating; `Δv` should normally be modest except for an explicitly energetic event. This immediately fixes the current radial-firework look. NASA’s actual reentry-risk tools propagate trajectories, aerodynamics, heating and component demise together; a game debris layer that lacks those validated inputs must not claim to predict Starship failure mechanics. citeturn33view3turn33view2

**Ground impact:** first show contact and gross body disruption, then fire/vapor/debris. Preserve several recognizable masses: nose/forward barrel, one or more tank/barrel cylinders, aft engine section, individual flaps, and—on Super Heavy—the engine base and grid-fin-bearing upper section. Small shards follow as secondary debris rather than replacing those masses. The FAA’s public March 2024 assessment records that SN9’s 2 February 2021 event lacked uniform visible shock waves and that most fuel burned in a lower-pressure deflagration; nearby structures did not show signs characteristic of a uniformly high-yield blast. That directly argues against a perfectly spherical orange detonation sprite. https://www.faa.gov/media/76836 citeturn34view1turn35view0

**Aerodynamic overload:** begin with a flap, panel, hot-stage component or local body section separating, then let large pieces continue approximately down-track before aerodynamic divergence grows. Give high-area fragments more relative deceleration and tumbling than dense engine sections, without pretending the coefficients are known. NASA’s reentry work treats breakup as subsequent fragment trajectories and heating, rather than an instantaneous disappearance of the parent spacecraft. citeturn33view2turn33view3 SpaceX also documents materially different real sequences: Flight 2 Super Heavy suffered engine problems followed by an energetic engine failure and cascading breakup, whereas Flight 7 Starship developed an aft leak/pressure rise and sustained fires before loss of vehicle. citeturn31search1

**Thermal failure:** start locally on the windward system: tile loss/flecking, brighter flow at a gap or flap-edge region, intermittent glow/plasma leakage and only then larger separation if the scenario calls for it. Do not turn the entire hull uniformly incandescent. SpaceX’s Flight 3 data showed unexpectedly severe heating during an off-nominal entry; its September 2026 Flight 14 program still specifically addressed plasma paths behind tiles and gap heating. citeturn38search1turn39search0 NASA’s Columbia investigation is useful only as a generic engineering precedent that a TPS breach can admit hot gas, damage internal structure and eventually contribute to aerodynamic breakup—not as a Starship-specific failure template or threshold. citeturn17search5

Fire should therefore be **attached to causes**: localized aft fire near propulsion failures; brief brighter combustion where mixed propellants ignite; expanding condensation/vapor and vent jets around ruptured cryogenic plumbing; persistent burning only where the scenario provides fuel. A universal explosion obscures exactly the causal visual information that makes a simulator convincing.

Progressive damage that **changes flight dynamics** is a different project. Flap loss, TPS damage or tank/engine failures should affect forces, control authority or mass only when the flight model has explicit validated rules for doing so. Until then, damage state may select visuals, but visuals must not silently generate invented structural limits.

## Compact reference shot list and rights

| Reference | What to extract | Rights / use note |
|---|---|---|
| SpaceX Flight 5 official video: https://www.youtube.com/watch?v=hI9HQfCAw64 | Full-stack silhouette; six-engine Ship ascent; hot stage; entry attitude/plasma; flap proportions. citeturn38youtube6 | Official SpaceX material; use as visual reference unless separately licensed for redistribution. |
| Steve Jurvetson, pre-IFT-5, 12 Oct 2024: https://commons.wikimedia.org/wiki/File:SpaceX_Starship_before_IFT-5.jpg ; original https://www.flickr.com/photos/jurvetson/54071480516/ | Stack proportions, bare-surface highlights, major longitudinal details. citeturn37view1turn37view2 | **CC BY 2.0**: credit Steve Jurvetson, link license, indicate modifications. https://creativecommons.org/licenses/by/2.0/ citeturn37view0 |
| Jurvetson Flight 5 booster return, 13 Oct 2024: https://commons.wikimedia.org/wiki/File:SpaceX_Starship_booster_landing_approach_IFT-5.jpg ; original https://www.flickr.com/photos/jurvetson/54071531061/ | Flight-stained booster silhouette, fin placement, lower body/engine region. citeturn37view4turn43image0 | **CC BY 2.0**, same attribution obligations. citeturn37view3 |
| NASA Ames 2024 Super Heavy wind-tunnel article: https://www.nasa.gov/image-article/starship-super-heavy-breezes-through-wind-tunnel-testing-at-nasa-ames/ | Clean four-grid-fin geometry and 33-engine-era aerodynamic reference. citeturn32search3 | Images on page are credited NASA; verify the specific asset credit before redistribution. |
| NASA Marshall hot-staging CFD: https://www.nas.nasa.gov/SC24/research/project24.php | Correct qualitative behavior of plume exiting vented interstage and spreading around booster. citeturn32search2 | NASA-produced visualization; retain stated NASA/Marshall credit and check asset-specific terms. |
| SpaceX V3 announcement, 12 May 2026: https://www.spacex.com/updates/reusability | Three fins, integrated hot stage, revised aft/engine architecture; **V3 only**. citeturn32search0turn32search1 | Reference-only absent a separate reusable-media license. |
| NASA V3 wind-tunnel article, 31 Jul 2026: https://www.nasa.gov/directorates/esdmd/artemis-campaign-development-division/human-landing-system-program/nasa-spacex-advance-wind-tunnel-tests-for-starship-rocket/ | Independent visual/engineering cross-check of V3 booster differences. citeturn33view0 | Page imagery explicitly credits NASA; check each asset before reuse. |
| Flight 13 / intact post-entry heatshield: https://www.spacex.com/launches/starship-flight-13 | V3-only intact heatshield and splashdown reference; useful for surface weathering, not V1 geometry. citeturn32search4 | SpaceX reference material. |

## Adversarial realism checklist

| Misleading approximation | Acceptance test |
|---|---|
| **Hybrid “best-of-Starship” vehicle** | Can every visible feature be assigned to Flight 5, V2, or V3 without borrowing across generations? |
| Photographed Ship pasted over procedural booster | Do both stages share the same projection, light direction, scale convention and edge treatment? |
| Booster as featureless rectangle | At 50 px, can a viewer still recognize four Flight-5 fins, hot-stage collar, cylinder and engine end? |
| Perfectly half-black Ship | Was the tile boundary traced from the selected generation rather than generated as a mathematical semicircle? |
| Equal-size/equal-position flaps | Are V1 forward/aft silhouettes distinct, and are V2 forward flaps a separate asset rather than a scaled V1 sprite? citeturn42search1 |
| V3 three fins or clean Raptor-3 base on Flight 5 | Flight 5 must retain four fins and pre-V3 aft/interstage architecture; V3 is explicitly different. citeturn33view0 |
| Solid hot-stage band | Are large vents readable, and does hot-stage exhaust visibly escape through them? citeturn32search2 |
| Thirty-three identical bells drawn edge-on | Is nozzle visibility governed by occlusion, with the full pattern reserved for appropriate viewing angles? |
| Uniform chrome/noisy normal map | Does steel read through one coherent cylindrical highlight while weld/raceway detail remains subordinate? |
| Whole hull glows orange on entry | Is thermal emphasis localized to windward flow, edges, gaps and damage sites? citeturn33view5turn39search0 |
| Generic radial explosion | Do large parts retain down-track momentum and angular inheritance before dispersing? |
| Particle burst while intact sprite survives | Is the intact renderable removed/replaced at the structural-failure transition? |
| Every failure burns identically | Can ground impact, aft propulsion fire, aerodynamic breakup and TPS failure be distinguished with the effects hidden? |
| “Physics-based” debris claim from hand tuning | Documentation must call it **evidence-informed post-failure visualization**, not prediction of actual Starship structural breakup. NASA’s predictive methodologies require coupled trajectory, aero/thermal and failure modeling that this design intentionally does not invent. citeturn33view3 |

The practical target is thus not photographic imitation but **generation-locked visual evidence translated into stable 2D cues**: Flight 5 first, V2 and V3 as explicit later variants, with breakup preserving the same recognizable geometry. That approach corrects all three major weaknesses of the present renderer—legacy baked lighting, a structurally anonymous booster, and failure effects disconnected from the vehicle that supposedly failed—without asserting proprietary material limits or pretending that a debris animation is an engineering failure analysis.