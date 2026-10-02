# Modernization roadmap

Take the 2D Starship simulator from a rebuild that has never shipped to a game with realistic, test-proven physics and UX at the level of `flight_sim` — all in the JavaScript/TypeScript ecosystem, no Rust, still 2D.

The evidence behind every phase is [docs/research/2026-09-30-modernization-audit.md](../../research/2026-09-30-modernization-audit.md). How the code works today is in `docs/reference/`.

## Steve's decisions (2026-09-30)

- **Base:** the rebuild (`v2/`, from `claude/first-project-rebuild-bjniik`), not a restart. `origin/exp` and `origin/feat/modernize-app` are dead ends and are not used.
- **UI stack:** React 19 + Tailwind 4, with PixiJS 8 kept as the canvas. flight_sim's portable `web/src/ui/` core is **vendored by copy** into this repo, with a provenance note and a drift-check script. Nothing is changed in flight_sim.
- **Visual language:** flight_sim's system (monochrome chrome, 0 px radii, Inter / Inter Tight / JetBrains Mono, motion tokens, one focus owner, contract scanners) with a **Starship brand layer** in place of the Flying Bricks wordmark, brick field and copy rules.
- **Realism scope:** full Ship realism **plus a separate Super Heavy** (33 Raptors, grid fins, hot staging), so booster scenarios fly the booster.
- **Tracking:** local. `docs/plans/` is the system of record; no Jira.

## Steve's decisions (2026-10-01)

- **Entry on lift, as Phase 6b.** Physical drag (cited, built) halves hypersonic drag, and with the physical heat shield the deorbit breaks up at 1,533 K because the autopilot flies entry broadside, where lift is zero. Phase 6b gives the autopilot an entry angle-of-attack schedule that flies on lift, then lands the parked aero tasks on it. The tile limit never moves.
- **Phase 6 resume:** one additional diagnosis attempt (attempt 4) for the iPhone portrait vacuum-plume width failure, with all assertions, bounds and retries unchanged. It passed final verification; Phase 6 is merged and live at `080f108`. The original three-attempt history is retained; the 2026-10-02 standing reviewed-cycle approval governs any new failure.
- **Graphics and visuals get their own phase, before UX** (Phase 8), covering engines and plumes, re-entry and heat, the environment, and the vehicle and camera. Like Phase 3, it publishes its visual direction to a private review page and proceeds without waiting; Steve's verdict folds in as a scope change.

## Steve's standing autonomy decisions (2026-10-02)

- After three failed diagnoses, obtain a fresh independent review, record a new evidence-backed approach, then continue another bounded cycle without owner permission. This covers the entire roadmap, including the current one-km range miss and later 300 km/plume failures. All physical limits, assertion bounds, control authority, coverage and merge gates remain unchanged; no reruns for luck.
- If independent review proves the approved Phase 6b aero infeasible within existing authority, use its existing broadside fallback, retain Task 5 Bug fixes, record the parked work, verify/merge the phase and continue Phases 7–9. A red calibration alone does not prove infeasibility. Do not substitute the fallback merely because it is easier to pass.
- Full scope remains all phases through 9. Visual/UX review pages are published and work proceeds without waiting for owner acceptance. No owner decision is currently pending.

## Phases

| # | phase | depends on | end state | verified by |
|---|---|---|---|---|
| 1 | **Green gate and cut-over** | — | `v2/` promoted to the root; a gate that is green on Steve's Mac and in hosted CI; `main` holds the rebuild; Pages serves it | gate exit 0 on arm64 macOS; 3 consecutive green CI runs on `main`; the live URL serves the new build |
| 2 | **Truth harness** | 1 | the three-tier truth hierarchy in TypeScript: closed-form tests, a cited reference-band registry with a report, row-level goldens; property tests; a mutation check; a `window.__simDebug` API | the band report runs in CI; every mutation is caught; light gate ≤ 5 min |
| 3 | **Design pass** | 1 | a written design system for Starship (tokens, type, density, motion, live-scene chrome, brand layer), a new information architecture for every surface, and reviewed prototype screenshots | `docs/design/design-system.md` and `docs/design/ia.md` exist; a review page of prototypes is published for Steve |
| 4 | **React shell** | 3 | no `.svelte` files; React 19 + Tailwind 4 + vendored flight_sim kit; `App.svelte`'s jobs split into Zustand slices and hooks; the design scanners in the build | `npm run build` runs the scanners with self-tests; e2e smoke and a11y specs pass; first-load JS ≤ 300 kB (re-baselined from 250 for React DOM, 2026-10-01) |
| 5 | **Guidance on real physics** | 2 | autopilot burns, throttles and triggers use the simulation's own gravity, thrust and drag instead of g = 9.807; the HUD predictor drops `airResistance_k = 250` for the simulation's drag | every scenario lands under autopilot; the guidance truth tests pass; goldens re-blessed once per change, each with an audit row |
| 6 | **Ship realism** | 5 | felt g, the 1976 thermosphere, Earth's GM and radius, a measured landing reserve, 3 sea-level + 3 vacuum Raptors with the start transient, a heat shield in W/m² and K with a 1,533 K tile limit, a wind profile with seeded turbulence, a rotating ground frame (at rate zero; Earth's rate switches on in 6b) | every Ship scenario lands; truth report 8 of 8 in band; one Linux golden regeneration per change with its audit row; the drag, normal-force, fin and RCS tasks and Earth's rate moved to 6b |
| 6b | **Entry on lift** | 6 | an entry angle-of-attack schedule that flies on lift and holds the tile under 1,533 K, with range control, and Earth's rotation switched on; then, on it, per-component drag (geometric area, cited Cd), body normal force at a centre of pressure, fins as lifting surfaces, and real RCS | the deorbit and re-entry land with the physical drag and heat models; every scenario lands; the parked models' tests pass; a belly-flop that cannot be held is a recorded finding, not a tuning target |
| 7 | **Super Heavy** | 6b, 4 | a second vehicle: 33 Raptors, grid fins, hot staging; booster-sep and RTLS fly the booster to a tower catch; a two-vehicle camera and HUD (functional rendering; the look is Phase 8's) | booster bands in-band; booster scenarios caught under autopilot; e2e covers staging |
| 8 | **Visuals** | 7 | the graphics a player sees, physically driven: per-engine plumes (sea-level and RVac) that expand with altitude, Mach diamonds, staging and landing glare; plasma and tile glow from the skin temperature; atmospheric sky by altitude and sun, the Starbase pad, tower and chopsticks, ocean, coastline, clouds and night; a detailed Ship and Super Heavy with moving fins; cinematic camera, shake, bloom; within a phone frame budget | a published visual-direction review page; pure look functions pinned by tests (as `atmosphere-look.ts` is); screenshot specs per scene; 60 fps desktop and the phone frame budget measured in CI-runnable benches |
| 9 | **UX to flight_sim level** | 4, 8 | modal behaviour, pause, modern keymap with rebinding, gamepad and key legend; guided first flight and per-scenario objectives; a Starship HUD (including the six-engine look); an instrument-grade Black Box; a phone layout that never hides flight data; a graded debrief; toasts | flight_sim's UI quality checklist at desktop / 1024×768 / 390×844; witness specs with positive controls; Steve's verdict on a motion-review page |

Phases 2 and 3 both depend only on 1. The run takes them in table order.

## Why this order

- **The gate comes first.** The rebuild's own log claimed green for eleven milestones while CI failed. Nothing built on a red gate can be trusted, and `main` cannot receive anything until the Pages cut-over.
- **Truth tests before any physics moves.** Phase 1 loosens the goldens from bit-exact to a tolerance; Phase 2 adds the closed-form and reference-band nets that make further golden moves safe.
- **Design before the port.** Porting the flat, mid-tier layout faithfully and then redesigning it would rewrite the UI twice.
- **Guidance before aero.** The autopilot lands only because tuned constants match tuned aero. Changing aero first breaks every landing with no way to tell which change did it.
- **Super Heavy after the Ship is real and the UI is React.** It reuses the Ship's aero and thermal models, and its HUD is built once, in the new shell.
- **Entry on lift before Super Heavy.** The booster reuses the Ship's drag, normal-force and fin models, which only land once the Ship can survive entry on them.
- **Visuals after Super Heavy, before UX.** The booster, staging and the tower catch are the scenes the visuals most need, and the UX phase's motion-review page should show the finished graphics.

## Risks

- **Realism vs playability.** Real aero, real RCS and real heating can make hand-flying unplayable. Phases 6 and 6b keep every scenario landable under autopilot; Phase 9 adds guidance cues and onboarding for hand-flying. If a human cannot land a scenario at all, that is a finding for Steve, not something to tune away.
- **Public Starship data is uneven.** Tier-2 bands carry an A/B source rating; only A rows gate.
- **Vendored kit drift.** The drift check reports differences from flight_sim; it does not block. Steve decides when to sync.
- **Live-site cut-over.** Returning visitors have the 2021 service worker. Phase 1 ships a replacement worker at the same scope and a rollback.
- **Entry on lift may not be enough.** If no schedule within the vehicle's control authority keeps the tile under 1,533 K on physical drag, 6b parks its aero tasks again and reports; the limit does not move and 2021's broadside drag stays.
- **Graphics cost on phones.** Every visual addition is measured against the phone frame budget; an effect that breaks it gets a reduced-quality path, not a pass.
- **Over-importing flight_sim process.** No known-red lists, no 15 MB baselines, no full audit longer than the light gate. Copy the principles, not the machinery.

## Deferred

Recorded, not built: [docs/plans/backlog/README.md](../backlog/README.md).

## Status

Finished phase plans are closed out (`repo-docs-layout`): their record is the merge commit, and their decisions live in `docs/reference/`.

- [x] Phase 1 — Green gate and cut-over (merged `f14aadb`, live 2026-10-01)
- [x] Phase 2 — Truth harness (merged `53e3c26`)
- [x] Phase 3 — Design pass (merged `53e3c26`)
- [x] Phase 4 — React shell (merged `dfab3c8`)
- [x] Phase 5 — Guidance on real physics (merged `b84b746`; goldens on the recording platform `3429ea1`)
- [x] Phase 6 — Ship realism (merged `080f108`, live 2026-10-01 Vancouver time). Complete gate green on main; branch full e2e 438 passed / 0 failed / 11 configured skips. CI `36956332929` and Pages `36956332944` succeeded at the merge SHA. Live deployment smoke 5/5 passed; served service worker matches the verified build byte for byte, cache version `b72a7b0bad39`. Hosted menu smoke needed existing retries on two checks; retained as Phase 9 debt. [Close evidence](../../research/2026-10-01-phase6-close.md). Earth's rate and the parked aero moved to 6b.
- [ ] Phase 6b — Entry on lift ([phase plan](modernization-phase-6b.md))
- [ ] Phase 7 — Super Heavy
- [ ] Phase 8 — Visuals
- [ ] Phase 9 — UX to flight_sim level

Phases 7–9 get their phase plan when the phase before them lands, written by the run from this roadmap with `superpowers:writing-plans`.


## Current checkpoint (2026-10-02)

Phase6 is merged/live at`080f108`; six of ten phases complete (60%). Phase6b remains on existing`claude/entry-on-lift`. Fresh independent review confirmed the approved prescribed entry family cannot meet the scenarios within modeled authority after identical-handoff numerical repair. Steve’s conditional fallback is implemented: affected Tasks1–4 restored to shipped Phase6 broadside force/control/rate/reserve/aim; Task5 current-force/support/throttle fixes, independent descent braking and first-breakup debrief retained. Parked scientific/source tests and all measurements/reviews remain recoverable; the backlog names the deferrals. No further range/fin feasibility campaign is needed. The prior approved extra300km verification passed and is consumed.

Linux recording`37035784562` at immutable`845c41d9` succeeded; all21corepins match. All8fixtures integrated and field-audited against both shippedPhase6 and parkedc242 checkpoints. Intro physicalmotion/enginesequence exact; reentry original180s motion exact and the retained600s window now lands. Original numericdescent bounds are checked at exact180s plus stronger600s landing assertions, independently reviewed. Fresh physics and camera reviews found no actionable runtime defect. Existing camera framing checks pass after decorative shake is constrained to rendered clearance; physical follow law unchanged.

The corrected complete local gate exits0: lint/build,1977units,1977instrumentedtests with unchangedcoveragefloors, smoke and5subpath checks pass. The first typo failure remains recorded. Fullfive-browser verification at committed `eb703cb` finished436pass/2fail/11configuredskips. Pixel landscape plume width and iPhone portrait ground captures require the bounded reviewed diagnosis recorded in [browser diagnosis](../../research/2026-10-02-phase6b-body-moment/fallback-browser-diagnosis.md). Its narrow cadence/restart repair and exact-altitude terrain setup pass focused units/build/lint; all ten focused browser checks pass; the complete gate after renderer changes passes and mutation catches all21faults. Final fullbrowser, mutation, fullgate after renderer changes, finalreviewacceptance, coherentcommit/push/mainmerge/gate/deploy remain required; no phase tick or shipped6b claimed. Continue7–9 after closure. Follow the [goal contract](modernization-GOAL.md), [restoration evidence](../../research/2026-10-02-phase6b-body-moment/fallback-restoration.md) and [Linux audit](../../research/2026-10-02-phase6b-body-moment/fallback-golden-audit.json).

## Reviewed browser repair release checkpoint (2026-10-02)

The repaired source passes the complete localgate (1980units/1980instrumented,13smoke,5subpath), unchanged floors, docs-layoutcheck and all21mutation faults after848greencontrol tests. Focused five-project original plume/terrain assertions10/10pass; fresh independent and high-depth source review clean. No seed tuning or effectparameter/assertion/retry changes. Preserve/push the coherent checkpoint, then run finalfullbrowser against its unchanged runtime and obtain finalreviewacceptance before merging. Main/live080f108,60%; Phase6b–9 remain.

## Candidate verification in flight (2026-10-02)

Reviewed repair76c60e3 committed/pushed; complete1980-test localgate and all21mutationfaults green. Finalfullbrowser running (session2684; /tmp/starship-browser-cycle1-full-final.log), hostedCI37044401235 succeeded at sameSHA. Independent physics revalidation:21Linuxcorepins/all8fixtures unchanged; no actionable boundaryconcern, conditional on finalbrowser/CI results. Main/live080f108,60%; no phase tick/merge/deploy claim. Finish existingverification, then close6b and execute7–9.

## Hosted candidate gate verified (2026-10-02)

HostedCI37044401235 succeeds at76c60e3; Linuxgate/hygiene green. Configured hostedfullbrowser/bench skipped, not claimed. Local fullbrowser session2684 still running and the previously failing Android landscape vacuum assertion now passes. iPhone outcomes/finalfullsuite result remain required; no merge/deploy/phase tick. Main/live080f108,60%,four phases remain.

## Final browser failure and next bounded diagnosis (2026-10-02)

At committed candidate `76c60e3db222118fe342560efe8d1fff2c6464bc`, the final full browser run completed with exit 1: 435 passed, three failed, 11 configured skips, 30.8 minutes, zero local retries. Session 2684 is complete; never resume or restart it. Full raw log, all three failure screenshots/context and the last-run manifest are preserved in `fallback-browser-cycle1-final/`, with SHA256 manifest. Hosted CI 37044401235 succeeded at the same candidate; local gate and all 21 mutation faults remain green. These checks do not override the failed browser acceptance.

Cycle 1 attempt 1 is unsuccessful as release acceptance. Both original failures passed: Pixel landscape vacuum width and iPhone portrait exact-altitude terrain. Remaining failures are iPhone portrait low-altitude plume length 0.9156261427575323 and landscape length 0.8853575099391015 against original >1, plus landscape vacuum width 0.43333333333333335 against original >0.4994324415041085 (low width times 1.2). No bounds, retries, effect parameters or seed were changed. No merge, phase tick or deployment is authorized yet.

Fresh independent `fallback_camera_review` confirms the cadence/restart repair remains valid, but does not prove pixel acceptance. Low landscape qualifying pixel counts 3286/3324/3326/3166 are nearly constant while measured lengths vary 0.89/0.70/0.89/2.29. This argues against wholesale starvation; it does not establish the cause. The detector collects an unrestricted bounding box, with no connectedness filter. Screenshots taken after the measurement show dotted distal tails but cannot establish RGB at the actual failed sample.

Cycle 1 attempt 2 starts with diagnostic evidence, not parameter tuning: preserve each original paused subject/background pair, record unchanged threshold decisions and exact step/viewport/nozzle, repeat a capture of the same frozen sample to distinguish compositor variation from state-dependent threshold crossing. If needed, expose read-only per-emitter live count/age/alpha/geometric extent and replay prescribed startup/render cadence through the real frame path. Do not use debug.step alone: it advances physics/camera without particle time. Retain original four samples, intervals, assertions, bounds, seed and retries. Record the hypothesis and evidence before any causal repair; no unchanged-code rerun for luck. Main/live remain 080f108, six of ten phases complete (60%). Full scope remains 6b, 7, 8 and 9; no owner question is pending.

## Completed attempt 3 and fresh cycle review (2026-10-02)

Cycle1attempt3 completed exit1: three diagnostic checks passed, iPhone landscape vacuum width failed, 1.9 minutes, zero retries. The instrumented run is not release acceptance. Its HTML reporter preserved all exact measurement inputs:24 subject/background/frozen-repeat pairs,49deduplicated PNGs including automaticfailure screenshot. Every24subject/frozen-repeat PNG pair is byte-identical, confirming no observed compositor variation within frozen states. Variation between different sampled flight states remains; its cause is not established. Full log/testresults/HTMLreport/extracted report JSON/capture-summary/hash manifest are preserved in fallback-browser-cycle1-attempt3/. The existing full435pass/3fail result remains authoritative release evidence.

Three cycle1attempts are recorded. Fresh independent plume_cycle2_review is active, read-only, inspecting actual saved pixel inputs and source before a new bounded cycle approach is recorded. Do not run another browser diagnostic, tune parameters/seed/thresholds, or claim success from the three focused passes. Next compare distal threshold and reference-exclusion decisions with actual images; emitter-internal read-only diagnostics remain an option if necessary. No further core/aero feasibility work. Main/live080f108,60%,6b/7/8/9 remain unfinished; no owner question.


## Cycle2 compositing repair and remaining width diagnosis (2026-10-02)

Fresh independent review identified real additive-alpha occlusion through bloom. The public renderer-local adapter passes actual WebGL fire/smoke, both controlled mixed draw orders and real context restoration; original state fails four witnesses. The high-depth Canvas fallback finding is fixed with an explicit renderer guard. All original five low-length checks pass, but original vacuum width still fails four projects (focused31pass/4fail); no release acceptance or phase tick. Read-only emitter snapshots now expose real counts/ages/alpha/geometry/emission inputs and last positive worldDt. Build/lint/68 focused checks pass. Cycle2attempt2 five-project original captures are running with HTML attachment persistence; analyze and preserve actual results before another repair. Original assertions, bounds, seed, effect parameters and retries remain unchanged. Main/live080f108,60%; full6b/7/8/9 scope remains authorized, no owner question.


Cycle2attempt2 completed:5passed/5failed,4.6min,zero retries; all five vacuum-width checks fail. Exact60 frozen PNG pairs are byte-identical; steady full core/bell populations rule out wholesale starvation in this run. Camera-normalized geometry expansion is present. All raw captured geometry/pixels/logs/reports/hashes retained in fallback-browser-cycle2-attempt2/. Fresh independent analysis requested for cycle2attempt3; do not repeat unchanged source for luck. High-depth rotated-streak diagnostic finding fixed; final build and69 focused checks pass. Main/live080f108,60%,four unfinished phases; no owner question.


Cycle2attempt3 is running original5projectplume+30rendererchecks,session92029,/tmp/starship-plume-cycle2-attempt3-browser.log,HTML/tmp/starship-browser-cycle2-attempt3-html. A precise watched-red bloom coordinate defect is repaired: identical localemission differed46RGB with canvasdimension alone; corrected suppliedinputtexels retainallkernelparameters and yield0difference/visiblepositivecontrol432. All6desktoprendererchecks/build/lint/focused65units pass; high-depthfollowuprequested. Preserveactualfinalresult before furtherdiagnosis; this isthirdattempt ofcycle2. Main/live080f108,60%; no merge/tick orownerquestion.


## Cycle2attempt3 final result and fresh cycle3 review

At source d4f3606, originalfiveprojectplume plus30rendererwitnesses completed37passed/3failed,exit1,zero retries,4.9min. All30rendererwitnesses andall5lowlength checks pass; iPhoneportrait/landscapevacwidth also pass. Vacuumwidth remainsfailed on desktopChromium,Pixelportrait,Pixellandscape. All60exact frozenpairs arebyteidentical. FullactualPNG/JSON/HTML/rawlogs/results/hashmanifest retained in fallback-browser-cycle2-attempt3/. This isnotreleaseacceptance anddoesnotclosePhase6b. High-depth/independent source reviewfoundnoactionablefinding ininput-coordinate fix; meaningfulpositivecontrols caughtinitialsharedprecisionlinkfailure,correctedwithoutkernelparameter changes.

Allthree cycle2attempts arecomplete. Fresh independent plume_cycle3_review isactive,read-only,analyzingactualremainingpixels/source before recordingnewbounded evidence-backedcycle3 approach. No furtherbrowserdiagnosis orsourceparameterchanges before thatreview/approach. Noownerquestion; approvedstandingcycles apply. Main/live080f108,60%,6b7 8 9remainunfinished. Existingsourcebuild/lint/focusedchecks green; finalfullgate/fullbrowser/mutation/releasereviews/merge/main-gate/deploy stillrequired.


## Cycle3attempt1 sampling repair and continuous-bell prerequisite

Fresh independent cycle3 review established expandedvisiblegas outsideoriginalbrightthresholds; no newbugwasassumed. Controlledfrozenproduction-driver tests provedfilterdownsampling/MSAAcoverage loss onDPR2: watchedredconfiguredsource maxloss204RGB,26–58sourcepixelserased; bothsettingsinherit preserveall12DPR2cases within0–1RGB/zeroerasedpixels. Bloom-onlyresolution/antialiasinherit implemented; heatunchanged. All7desktoprendererwitnesses/build/lint/65focusedunits pass; freshindependentandhigh-depthsource reviews clean. DPR1notuniversal1RGB anddetectorwidthsnearlyunchanged,so no originalwidthclosureclaim. Rawdata/logs/HTML/failurecapture/hash in fallback-browser-cycle3-attempt1/.

Nextnativecycle3attempt2 follows continuous-bell-plan.md: continuousnozzle-framefield alongsideunchangedparticles,existingpressurecurves/bellgeometry/tint/alpha/per-running-enginecontributions,preallocatedmeshes/lifecycle/meaningfulabsencecontrols,originalacceptancebounds unchanged. This brings minimumvisible-bell prerequisite forward fromapprovedvisualscope; Phase8remainsunfinished. Planreview requested beforeimplementation, noownerquestion. Nocore/aerorestoration/feasibilitywork. Main/live080f108,60%,6b7 8 9unfinished.

## Cycle3attempt2 actual visual rejection and next approach

Cycle3attempt2:51checks pass(original10five-project plume/36renderer/5scene),all60frozenpairs byte-identical. ActualPNG review rejects saturated straight-sided white interior before6bclosure. Cycle3attempt3 maps transverseUV by actualx/radius to spread unchangedsoftprofile acrossfullenvelope; no oldconfig/seed/threshold/bound changes. Revised capture-hide regression watchedred; all5actualscene lifecycle checks pass after effectiveparentvisibility fix. Execute thirdapproach natively, inspectpixels and originalacceptance, thenfullreleasechecks. Main/live080f108,60%,fourphasesunfinished; noownerquestion.
