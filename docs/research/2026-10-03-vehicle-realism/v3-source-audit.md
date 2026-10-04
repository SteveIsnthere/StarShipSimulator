# V3 source audit — 2026-10-03

The current flown V3 configuration is a 52 m Ship and 72 m Super Heavy, both 9 m diameter, retaining six and 33 engines. It is not the older proposed stretched nine-engine “V3” roadmap. Geometry and nominal thrust/capacity can move to published V3 inputs; stage dry masses, detailed control geometry, Isp endpoints and progressive damage laws remain engineering assumptions.

Scope: read-only audit except this document. Clock checked at 2026-10-03 19:55:06 UTC before browsing. Steve’s latest explicit V3 + physics + progressive-damage choice supersedes the still-pending wording in the GOAL/readme at audit start. No production code, goldens, scenarios, thresholds or tests were changed. Existing realism research was read; no new ChatGPT job was launched. No relevant cross-project knowledge-base match was found.

## Primary sources

- **S1:** [SpaceX current Starship vehicle specifications](https://new.spacex.com/vehicles/starship), indexed last month, retrieved 2026-10-03. The canonical [vehicle URL](https://www.spacex.com/vehicles/starship) returned an empty browser-tool extraction; the indexed official `new.spacex.com` page exposes the tables. These are rounded manufacturer specifications, not measured flight telemetry.
- **S2:** [SpaceX, Introducing Starship V3, 12 May 2026](https://new.spacex.com/updates), indexed official full update retrieved 2026-10-03. Canonical [reusability update](https://www.spacex.com/updates/reusability). The index includes later updates; only the dated V3 section supports the V3-change claims below.
- **S3:** [NASA, SpaceX Advance Wind Tunnel Tests for Starship Rocket, 31 July 2026](https://www.nasa.gov/directorates/esdmd/artemis-campaign-development-division/human-landing-system-program/nasa-spacex-advance-wind-tunnel-tests-for-starship-rocket/), directly read. Independent confirmation of Raptor 3, three larger fins, integrated hot stage and removal of the earlier engine skirt/shrouds/large base heat shield. Tests used a 1.2% model; this article does not publish aerodynamic coefficient tables or failure limits.
- **S4:** [SpaceX EU prospectus, 5 June 2026](https://content.spacex.com/cms-assets/FINAL_Documents%20and%20Updates/SpaceX%20-%20EU%20Prospectus%20%28Approved%20by%20Bafin%29%20-%20June%205%2C%202026.pdf), PDF pages 106, 109–110 (printed 94, 97–98). Fleet chart gives 124.4 m and 5,533,000 kg aggregate mass; text specifies 33 booster engines plus three sea-level/three vacuum Ship engines and distinguishes future V4 capability. No “dry mass” match was found in the searchable PDF.

No new source image/video is claimed inspected in this audit. NASA’s model-image captions and engineering description were read; the existing photographic ledger remains separate. Browser surfaces were unavailable here, and direct Python HTTP retrieval failed certificate verification; neither was bypassed. Primary facts below come from web-tool primary text/index and the prospectus.

## Published delta table

Current values were read from `src/core/constants.ts`, `vehicle.ts`, `vehicles/super-heavy.ts`, `physics/grid-fins.ts`, `mission.ts`, and the Ship/booster view geometry.

| Input | Current model | Published V3 / required disposition | Evidence |
|---|---|---|---|
| Ship hull height / diameter | 50 / 9 m | 52 / 9 m | S1 |
| Booster hull height / diameter | 71 / 9 m | 72 / 9 m | S1 |
| Full stack | Geometric 121 m from model heights | Rounded 124 m; prospectus 124.4 m. Do not add another full interstage above a booster height that already includes it. | S1, S4 |
| Ship propellant capacity | 1,200,000 kg | 1,600,000 kg | S1 |
| Booster propellant capacity | 3,400,000 kg | 3,650,000 kg | S1 |
| Engine inventory | Ship 3 SL + 3 RVac; booster 33 | Inventory unchanged; Raptor 3 generation. Booster retains 13 maneuverable inner engines and 20 perimeter engines. | S1, S4 |
| Nominal SL-engine thrust | 230 tf at sea level | 250 tf = 2,451,662.5 N | S1, S2 |
| Nominal RVac thrust | 258 tf in vacuum | 275 tf = 2,696,828.75 N | S2 |
| Aggregate thrust | Computed from individual pressure-dependent engines | Advertised booster 8,240 tf; Ship 1,614 tf. Cross-check only; rounded/system figures are not exact individual-engine anchors. | S1 |
| SL-engine dimensions / mass | 1.3 m exit assumption; no individual engine mass bookkeeping | Published engine envelope 1.3 m diameter / 2.9 m height; SL-engine mass 1,525 kg. Envelope diameter is not automatically nozzle exit diameter. | S1, S2 |
| Booster grid fins | Four visual fins; coupled area 24 m²; station 66 m | Three, individually 50% larger, lowered and re-clocked; new catch point, protected internal actuator hardware. Exact area/station/clock angles not published here. | S2; count/size independently S3 |
| Booster hot stage | Earlier separated collar depiction / two-body geometry | Integrated, retained hot stage; tank forward dome and protective steel layer rather than discarded separate ring. | S2, S3 |
| Engine base | Legacy skirt/shield architecture | Remove old large skirt/shrouds/base shield; retain local shielding between engines and near TVC. | S2, S3 |
| Ship aft flaps | Two aft flaps in four-flap depiction | Aft actuation changes to one actuator with three motors per flap; source does not supply areas or station measurements. | S2 |

Numbers converted with the existing exact standard gravity, 9.80665 m/s². Thrust is force; propellant capacities are mass, not scenario spawn loads.

## Unknowns that must stay explicit

**Dry mass:** neither stage’s V3 dry mass is published by the primary sources inspected. The tempting subtraction `5,533 − 1,600 − 3,650 = 283 tonnes` is only an aggregate non-propellant residual if those separately published capacities correspond to that fully loaded chart. It can contain payload/other bookkeeping and cannot establish Ship dry mass, booster dry mass or a split. “283 t Ship dry” is unsupported. Likewise, subtracting the advertised approximately one-tonne-per-engine saving from old dry-mass estimates ignores tanks, fins and structural changes.

**Isp:** no current primary V3 sea-level/SL-nozzle-vacuum/RVac-vacuum triplet was found. Historical 350 s cards do not identify a current full endpoint pair. Current 327/350/380 s are inherited Raptor-2-era modeling inputs, not newly verified V3 measurements. Old 280/306 tf roadmap figures must not replace the current 250/275 tf operating publication.

**Flaps:** four-flap visual topology is the existing configuration; this audit has not independently measured a V3 photograph. Do not preserve legacy forward/aft planforms merely by scaling the old sprite. S2 confirms aft actuator topology, not flap area, hinge station, angular limits or thermal strength. Primary image tracing is required before freezing new outline/stations; uncertainty remains in aerodynamic area/lever arm, independently of appearance.

**Grid fins:** “50% larger” does not itself define physical reference area, solidity, projected area, aerodynamic coefficient or all three azimuths. Current `gridFins.area=24` enters the force equation once as aggregate coupled area. If the plan provisionally interprets larger as 1.5× per-fin area, the consistent aggregate is `24 × 3/4 × 1.5 = 27 m²`, not 36 m² and not 24 m² per fin. That is a relative approximation against an already assumed baseline. Scaling both visual linear dimensions by 1.5 would instead imply 2.25× area and is unsupported. Missing fourth-fin symmetry and wake effects need an explicit 2D projection assumption; NASA coefficients are not supplied.

**Catch/hot-stage geometry:** exact new lug height, attachment station and integrated dome profile are not given. Existing `lugStation=65`, `planeAltitude=120`, `bodyCentreAltitude=90.5` are frozen earlier approximations, not V3 observations. Derive centre altitude consistently from authored lug station and model height; do not hand-adjust it to pass catch. The 0.4 m difference between rounded stack table and prospectus is not proof of a separate 0.4 m ring.

## Conservative engineering assumption candidates

These are candidate model choices for the approved plan, not facts or acceptance:

1. **Mass hold rather than speculative savings:** retain 120 t Ship / 200 t booster as explicitly inherited dry-mass assumptions initially; claim no Raptor-3 dry-mass savings. Their combined 320 t exceeds the conditional 283 t residual, but that does not prove either stage conservative. Audit performance sensitivity to the uncertain split before interpreting flight success as realism.
2. **No unsupported efficiency credit:** retain the inherited 327/350/380 s triplet while adopting published thrust, with explicit generation/uncertainty labels. This is a no-new-efficiency-credit choice, not a manufacturer V3 Isp claim. At those assumptions, mass flow becomes 764.53 kg/s SL and 723.68 kg/s RVac. Recompute pressure slope and fuel use coherently; changing thrust alone with old flow would invent efficiency.
3. **Check, do not tune, aggregate thrust:** with that inherited SL vacuum Isp, Ship vacuum total is about1,627.75 tf versus advertised1,614 tf (about0.85% difference); 33×250 is8,250 versus8,240 tf (about0.12%). Record reference conditions/rounding uncertainty; do not tune Isp or engine count to force exact table agreement.
4. **Capacity is not forced initial load:** retain each protected scenario’s selected load unless a separately recorded necessary scenario migration is approved. Update capacity, tank volume/COM and model dimensions coherently. The existing boiling-point cylindrical tanks are themselves approximations; subcooled loading and dome/dead volume are not published tank geometry here.
5. **No damage calibration by aesthetics:** there are no sourced V3 flap fracture, tile detachment, tank leak, gimbal failure, residual strength or fatigue thresholds here. Keep the existing tile/g/q terminal boundaries. A progressive model needs named simplified mechanisms, units, deterministic integration and independently justified onset/rate assumptions; new “80% of limit” damage triggers or chosen random failure probabilities are not supported by this audit. Treat progressive outcomes as an engineering/game approximation, never flight-qualified V3 material behavior.

The first implementation plan should freeze this generation and assumption ledger before changing physics, then run dimensional/mass/engine/fin truth checks and the existing flight acceptance. Changes to plans, drawings, COM, contact points, nozzle stations, camera fit and damage component locations should consume one shared authored geometry rather than independent magic offsets.


## Supplemental direct image inspection — 2026-10-03

This supplement supersedes the earlier audit’s “no new image inspected” limitation. Eight official-source images were downloaded normally to `/tmp` using `curl` with TLS verification, then inspected with `view_image`; no browser warning, authentication or certificate check was bypassed. Source photographs were not added as production textures. Public SpaceX image provenance was obtained from the website’s own CMS API, exposed by its public application: [official updates JSON](https://content.spacex.com/api/spacex-website/updates), record `updateId=starship-v3`, dated2026-05-12. This also permits direct verification of S2 text instead of relying solely on the search index.

### Actual SpaceX hardware photographs inspected

| Photograph / direct pixels | Visually supported cues | Limits |
|---|---|---|
| [B19 transport, official March2026 photograph](https://sxcontent9668.azureedge.us/cms-assets/assets/B19_Transport_2603083576_1cc29f2c4f.jpg),11316×6365 | Three distinct lattice fin faces are visible around the upper barrel, with substantial edge depth and scalloped outer edges. An open repeated triangular-truss crown surrounds the domed top; upper actuator/catch-related housings and an external narrow raceway are visible. Steel has vertical directional reflections, fine seams and fastener rows, not a uniformly grey rectangle. | Close upper-body crop; camera sees different fin azimuths at different perspective heights. It cannot provide full booster height, exact clock angles or aerodynamic area. Building/lift hardware must not become vehicle geometry. |
| [S39 six-engine static fire, official April2026 photograph](https://sxcontent9668.azureedge.us/cms-assets/assets/S39_6_Engine_Static_Fire_04142600114_d9f1acc588.jpg),3607×2029 | Dark windward tile field wraps the rounded nose and barrel. Two compact swept/trapezoidal forward flaps and two much longer swept aft flaps are visible. Their spans and roots differ; they are not four copies of one rectangle. Narrow bright steel remains at the aft lip. | Low-angle perspective; black flaps/tiles overlap and support rig obscures aft geometry. Plume conceals nozzle count and precise engine plane. This is not a fully side-on metrology frame. |
| [Full May11 wet-dress stack](https://sxcontent9668.azureedge.us/cms-assets/assets/20260511_Wet_Dress_Actual_2_259bcb3ae9.jpg),5272×3948 | Complementary leeward view: mostly bright Ship steel, sharply delimited dark tile/flap edges, distinct forward/aft flaps, narrow axial surface features and an open triangular stage interface. Confirms that the dark belly photo must not be mirrored into an all-black vehicle. | Steam hides much of booster and its base; the aft flap and tower partly hide the interface. No absolute full-booster or catch-lug station can be measured confidently. |
| [B18 V3 transfer-tube construction photograph](https://sxcontent9668.azureedge.us/cms-assets/assets/B18_V3_Transfer_Tube_a2507080525_dab86ea975.jpg),5259×2958 | A large separate long ribbed internal tube is shown next to barrel sections; workshop barrel seam/fastener treatment provides useful steel reference. | The central ribbed tube is **internal propulsion hardware**, not the booster silhouette or an exterior raceway. This image does not independently expose the complete hot-stage dome/truss; that cue comes from B19. |

### NASA V3 model photographs inspected

All four are linked from S3 and credited NASA. They are 1.2% wind-tunnel models, useful for external geometry but not operational finish, tile material, wall thickness or strength.

- [acd25-0156-005](https://www.nasa.gov/wp-content/uploads/2026/07/acd25-0156-005.jpg?w=1536): full oblique booster; exposed bell array, long cylinder, short open top truss and projected grid-fin faces. Technician/rod are not flight hardware.
- [acd25-0156-012](https://www.nasa.gov/wp-content/uploads/2026/07/acd25-0156-012.jpg?w=1536): engine end face; concentric nozzle arrangement and open individual bell outlines, without the old enclosing deep skirt. Exact ring count is taken from S1, not claimed freshly counted from partially overlapped pixels.
- [acd25-0156-021](https://www.nasa.gov/wp-content/uploads/2026/07/acd25-0156-021.jpg?w=1536): close oblique engine plane; bell flares extend aft of the barrel/rim, and small external base strakes/chines are visible.
- [acd25-0156-026](https://www.nasa.gov/wp-content/uploads/2026/07/acd25-0156-026.jpg?w=1536): complementary full booster view; near grid-fin lattice faces, open triangular top crown, axial narrow external features and aft strakes. Circular white/black targets, red marks, metal model finish and mount rod are test artifacts, not flight paint.

### Proportional outline starting ranges

These are **manual visual estimates for authored silhouette**, not calibrated physical/aerodynamic constants. Coordinate `s/H` rises from the engine-plane end toward the nose/top; ShipH=52m, boosterH=72m, publishedD=9m. Wide ranges deliberately cover view angle, foreshortening, occlusion and endpoint ambiguity. The static-fire and stack views must agree visually before freezing an outline. They do not justify new truth rows at millimetre precision.

| Feature | Image-supported rough range / authored cue | Appropriate use |
|---|---|---|
| Ship nose-to-full-barrel transition | Rounded taper occupies roughly upper0.20–0.30H; no sharp cone-to-cylinder seam. | Initial curved outline, then compare both actual S39 views. |
| Ship forward-flap axial root envelope | Roughly0.80–0.94H above aft end; root extent approximately0.10–0.16H. Leading edge swept; compact trapezoidal face. | Render outline only; a single physical hinge station is still unmeasured. |
| Ship aft-flap axial root envelope | Approximately0.01–0.30H, with near-base lower edge and long swept upper edge. | Distinct longer outline; do not transplant a forward-flap shape. |
| Ship visible flap outboard projection | Roughly0.3–0.6D beyond a visible barrel flank, depending on flap/view; opposing face is foreshortened. | Perspective depiction bound, **not** true deployed span or aerodynamic area. |
| Booster hot-stage open crown | B19 suggests axial depth roughly0.3–0.5D; triangular exposed bracing and visible dome inside. | Rendering start range. Crown belongs to the72m booster envelope; do not double-count height/mass. |
| Booster grid-fin axial roots | Full NASA model views place roots roughly0.85–0.94H from aft end, below the top crown. | Rendering station bracket. Actual actuator/lug offsets remain unmeasured; do not infer catch centre from this bracket alone. |
| Booster fin face | Rounded/scalloped outer boundary, thick perimeter and dense lattice; near face appears around0.35–0.60D outboard while far faces are smaller by projection. | Author three physical appendages with visibility/projection, not four symmetric rectangles. |
| Booster aft chines/strakes | Short triangular projections in lowest approximately0.15–0.25H in NASA model. | Initial external silhouette; photographic validation needed for exact flight-cohort extent. |
| Engine bell rendering | Bells project below the rim; face view has rings, while side view occludes most engines. | Shared actual nozzle stations plus occlusion; do not show all33 bells in a side-on row. |

No defensible exact fin clock angles, fin surface area, flap hinge stations, catch lugs, thermal thresholds or dry-mass split can be extracted from these photographs alone. The next geometry pass can proceed with the broad authored ranges, while retaining their engineering-approximation provenance wherever they influence physics. A reference-derived silhouette is support for appearance, not validation of progressive damage laws.

### Inspected-byte identity

Original downloads stay in `/tmp` as research scratch files; the URLs above are the durable retrieval route. SHA-256 identifies the exact inspected original bytes (display was automatically downscaled by the image tool for large SpaceX images):

- SpaceX booster: `93516f354aae11f752fe2080d17e939209772e90690961155905075743869ee5`.
- SpaceX hotstage: `79e61237bad0a880912afc3dc9c56295eeee7b5f141e916b48b3d59c7db1fabb`.
- SpaceX ship: `8abd09d4a684c1c030d9d63ce4f88bb3a0fcd5f905c7aa4e75fd7ebf6218be01`.
- SpaceX stack: `62a0816886f5502e8886d670043bc3d41f178ac673adca781d730128c44fa3e0`.
- NASA fins: `2dce2eab37e3c11b062253fa46cd3118ae5907e48d53e7c25821728e4b5ded9c`.
- NASA model: `2b0e964121b32db64504982f722a15d9a136b5488b97ebee94725ee2620e1645`.
- NASA hull: `f98216e9dea72ea34d52f12691925a615c97b895b0d307694f44c9918e08cb58`.
- NASA stage: `5fb3d368554c295c3dcc95ecbef15c5cf939d24aefe67c37fb2b846028a9e20b`.


### Shared grid-hinge station correction declared before flight verification

The inherited `66/71*72=66.93m` hinge was retained during the initial V3 implementation. This is inconsistent with SpaceX's explicit lowered V3 grids and leaves only1.47m below the authored68.4m crown base; the unrotated face overlaps the crown. The later B19 photographic critique estimates a roughly0.35–0.45diameter hinge-to-crown gap, with projection uncertainty. This is not dimensional metrology.

Freeze the next shared authored grid station at `0.90*72=64.8m` above the engine plane: a3.6m(.4D) gap and a station within the original broad0.85–0.94H image bracket. This value is chosen from the silhouette evidence before new flight verification, never from catch outcomes. Rendering, root/component mass locations and grid torque must consume the same station. Keep the separately inherited RCS station66/71H and catch-lug65/71H assumptions until direct evidence supports moving those distinct pieces of hardware. This changes only the grid hinge, not control limits, force coefficients, catch bounds or RCS authority. The earlier natural proof witness remains evidence for its recorded source, and final refinement must use the corrected shared geometry.

Status: implemented after retained-guidance integration; 47/47 focused shared geometry, component partition, booster and torque tests pass (`v3-grid-station-check.txt`).
