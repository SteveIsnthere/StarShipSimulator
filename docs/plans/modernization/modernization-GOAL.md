# Modernization — goal contract

Continue independently through ONLY this roadmap:
/Users/stevewang/dev/StarShipSimulator-realism/docs/plans/modernization/modernization-roadmap.md

Run from the worktree `/Users/stevewang/dev/StarShipSimulator-realism`. Each phase gets its own `claude/<slug>` branch from `main` and merges back into `main`. Phase 6 is merged and live at `080f108`. Phase 6b's `claude/entry-on-lift` already exists, created from that new `main` and checked out here; do not recreate it.

There is no Jira board for this repo. `docs/plans/` is the system of record: the roadmap's Status checkboxes, the phase plans' task checkboxes, `modernization-handover.md`, and `docs/plans/backlog/README.md`. Do not look for tickets.

## Current truthful status

- **60% complete by phase count: 6 of 10 phases done.** Phases 1–6 are merged and live; Phase 6 merge `080f108` is on `main`. Phases 6b, 7, 8 and 9 remain unfinished. Steve confirmed this full remaining roadmap scope on 2026-10-01.
- **Phase 6 closure is verified:** final branch full suite 438 passed, 0 failed, 11 configured skips; fresh independent high-depth review clean; complete gate green on main; hosted CI `36956332929` and Pages `36956332944` succeeded at `080f108`; live deployment smoke 5/5 passed. Served service worker matches the locally verified build byte for byte, version `b72a7b0bad39`. Exact logs and the two initial Node certificate-trust failures are retained in `docs/research/2026-10-01-phase6-close/`; certificate checking remained enabled. Two hosted menu smoke checks needed their existing retries, recorded for Phase 9 in the backlog. Do not redo Phase 6's finished verification or measurement repairs.
- **Next action:** Cycle3attempt2:51checks pass(original10five-project plume/36renderer/5scene),all60frozenpairs byte-identical. ActualPNG review rejects saturated straight-sided white interior before6bclosure. Cycle3attempt3 maps transverseUV by actualx/radius to spread unchangedsoftprofile acrossfullenvelope; no oldconfig/seed/threshold/bound changes. Revised capture-hide regression watchedred; all5actualscene lifecycle checks pass after effectiveparentvisibility fix. Execute thirdapproach natively, inspectpixels and originalacceptance, thenfullreleasechecks. Main/live080f108,60%,fourphasesunfinished; noownerquestion.
- **Historical parked-model checkpoint — Tasks1+1b accepted on branch:** Earth rate on,65-degree entry,M_t20/M_b2,reserve22t,common aim2,758,826m. Fixed65 deorbit1424.614K at68.328km,+0.3m,landed;only qualifying fixed-sweep deorbit row. Operational120km+37.322km within40km. Approved600s reentry recording is audited and every literal assertion retained.
- **Historical parked-model checkpoint — range diagnosis resolved:** an exact-input trace proved endpoint interpolation left17.8km residual with unsaturated authority. Watched-red Bug-fix witness and bounded nonlinear solve now pass. Health/scenario/demo/reserve acceptance passed at aim2,924,026; the approved extra300km verification passed and is CONSUMED. Fixed-sweep co-calibration then found common aim2,758,826 with both fixed10km and operational120km40km acceptance. Final non-golden units1987pass and truth8/8pass under that aim; retain every failed approach.
- **Historical parked-model verification:** fullunits153files/1995tests pass;lint/build/truth8/8pass. Linux37016645116/8c5f85a extends only reentry:original361samples exact,840newtail audited,sevenother files byte-identical to initial36985191265/764d191. All46 runtime pins unchanged. Narrowwindow/camerahelper reviews clean;fullphase gate/coverage/mutation/fullbrowser/finalhighreview/merge still required.
- **Owner decisions resolved:** coast firing-geometry replacement, Earth rotation, standing reviewed diagnosis cycles and conditional broadside fallback. The separately approved extra300km verification has PASSED and is consumed; ordinary release checks may include it. The narrow600s golden-window exception is also approved; no owner question is pending. Neither failed calibration nor numerical error proves aero infeasibility.
- Already done and must not be redone (merged in Phase 6):
  - Phase 6: felt g and the g-limit on felt g; the USSA76 thermosphere; the starting Mach; the emptying-step thrust; GM and R; the 18 t `landingReserve`; six Raptors with fixed RVacs (no gimbal); the 1.2 s start transient; the heat shield (Sutton-Graves W/m², skin temperature against a radiative sink, break-up on 1,533 K); the wind profile and Dryden turbulence; the rotating ground frame and all its plumbing at rate zero (`frameRotationRate`; Earth's rate is 6b Task 1b).
  - Golden audit rows P6.1–P6.5, P6.8, P6.10–P6.12 in `tests/golden/unification.test.ts`.
  - `4c03814`'s graphics repair: rate-crossing birth times, exact integration of each newborn's remaining frame, camera reprojection, nozzle-frame core/bell motion, and flight-start clearing of particles and emitter history. Keep the regression tests for cadence, camera transforms, orbital carrier velocity and pool reuse. These fixes passed focused checks and independent review, but did not make the full suite green.
- Tried and rejected, do not repeat:
  - **Treating focused plume checks as release proof:** attempt 3 passed all 10 focused checks, but final full-suite verification still failed iPhone portrait vacuum width. Do not repeatedly rerun until green, change bounds, add retries or merge on the focused result.
  - **Staggered births alone:** attempt 2 passed 9 of 10 plume checks; camera motion still displaced existing particles. Camera reprojection without nozzle-frame carrier motion then detached an orbital-speed plume; keeping old emitter history across flight restarts teleported births. Those defects are fixed in `4c03814`; reuse their regressions instead of rediscovering them.
  - **Physical drag with a broadside entry** (`claude/drag-parked`): the deorbit breaks up at 1,533 K at 65 km. Swapping only the lift coefficient for a Newtonian one changes nothing at 89°. Phase 6b does it on lift, with body-axis forces.
  - **Earth's rate on a broadside, uncontrolled descent:** the circularize-then-deorbit flight misses by 11.1 km against its 10 km acceptance; no single `DEORBIT_ENTRY_RANGE` holds both that and the 1 km health test. It waits for 6b's range control (Task 1b).
  - **Codex as the peer reviewer:** `~/.codex/config.toml` names `gpt-6.1-sol`, unsupported on a ChatGPT login. Go straight to ChatGPT Pro (`ask-chatgpt`, the GitHub connector at the pushed SHA), then a fresh subagent.
  - **Editing source while `npm run mutation` runs:** it mutates and restores files in place; an edit during the run is lost or corrupts the result. Run it alone.
  - **A landing reserve computed from the burn predictor** (one engine from the trigger plus the ignition delay, 6.3 t): the landing programme spends 12–14 t; it would crash every deorbit. The reserve is measured.
  - **A single `precisionAlignment` in `horizontalSteering`:** it moves two goldens.
  - **Added flip-trigger margins** (a flat 100 m; 0.9 s) on the old 12 t dump: they ran the engine-out deorbit dry.
  - **Re-blessing goldens on the Mac:** they replay exactly only on x86-64 Linux / Node 22. Regenerate through `.github/workflows/golden-regenerate.yml` (`git push origin HEAD:golden/<name>`, `gh run download <id> -n golden-fixtures`), then delete the `golden/` branch.
  - **Pinning Node to fix goldens; trusting the agent container's green log; all five Playwright projects in the merge gate; `origin/exp` and `origin/feat/modernize-app`; steve-ui; porting Svelte one-for-one; aero before guidance** (all from Phases 1–5; still dead ends).

## First task

**Execute cycle3attempt3 per the accepted actual visual review and continuous-bell-plan.md, then close Phase6b and continue Phases7–9.** Fresh cycle2 independent review is complete: additive particle alpha incorrectly occluded the background through bloom. Real WebGL watched-red witnesses establish the cause; renderer-local public state adapters fix light compositing while preserving normal smoke, mixed draw order, pool and effect parameters. Real context restoration passes. WebGPU checks establish descriptor behavior only, not hardware rendering. High-depth review's Canvas fallback guard is fixed.

Cycle2attempt1 focused original plume plus compositing run:31 passed,4 failed,exit1,zero retries. All five original low-length checks and25 new real compositing witnesses pass. Vacuum width fails desktop, Pixel landscape, iPhone portrait and iPhone landscape; Pixel portrait passes. Evidence is retained in fallback-browser-cycle2/. No release acceptance or merge claim.

Cycle2attempt2 adds on-demand read-only emitter snapshots to the existing debug presentation API. There are no per-frame allocations, no physics or effect-parameter changes. Build, lint and69 focused tests pass after corrected rotated-streak diagnostic bounds. Its original five-project plume run completed at session66633:5passed/5failed,exit1,zero retries; all60 exact frozen pairs persisted with byte-identical repeats. Analyze actual particle geometry, alpha and emission timing alongside exact subject/background/frozen pairs before any new repair. Preserve all raw evidence before another browser command overwrites test-results.

Earlier final full five-project run at76c60e3 remains failed:435 passed,three failed,11 configured skips,exit1,zero retries. The complete local gate,21 mutation faults and hostedCI37044401235 pass at that earlier candidate; these are not final-source verification. All24 cycle1attempt3 frozen pairs were byte-identical. The detector has no connectedness logic. No seed/effect-parameter/threshold/bound/retry changes are justified. At most three attempts per reviewed cycle, then fresh independent review and a new recorded evidence-backed approach under existing approval. No fallback restoration or fin/range feasibility redo.

Finish full browser/gate/mutation/final review, coherent commit/push, main merge/gate/deploy before ticking Phase6b. Then write and execute Phase7 followed by8–9. Main/live remain080f108,60%,four phases unfinished; no owner question is pending.

## Historical fallback execution instructions — completed restoration

The following retains the prior campaign and provenance. The First task above supersedes its commands to restore source or rerun feasibility. Restoration and Linux integration are already complete at `eb703cb`.


**Close the implemented approved broadside fallback, then continue Phases7–9.** Do not redo the restoration or feasibility campaign. Read the latest checkpoint and body-momentresearch/fallback-restoration.md, fallback-golden-audit.json and fallback-independent-review.md. The complete localgate is green against the integrated Linux fixtures; fullfive-browser suite is running. Complete mutation, fullbrowser, fullgreenphasegate, highreview, finalindependentacceptance, coherentcommit/push, mainmerge/gate/deploy. The prescribedfamily model/authority conclusion is independently established; no owner permission needed.

Fresh ideal_family_review confirms approvedprescribedfamily infeasible withinexistingmodeledauthority aftercommonhandoffnumericalrepair.22completehandoffs/44rows;alloriginal1/120physicsfields exact. Deorbitdt differences≤.00834s/.00805K/.0415equivalentgas seconds;reentry≤.0125s/.0327K/.0958s. RemovingALLinertial allowance stillselected65±3/operationalrequire84.985–97.305svs25s;lowestnonthermal47.660s@900stimeout;deorbit45–75alloverreserve,90thermalfailsbeforeMach5with~6.504sused. Full736MNmsgeometricbudget,freealignment/instantfins/free trimjumps. Noledger/model/numericaldefectexplainsmargin;notglobaloptimalcontrolprooforscenarioacceptance. Exactruling inbody-momentresearch/coupled-fin-fallback-ruling.md.

Next executeSteve'sauthorizedparking: restoreaffectedTasks1–4aero/schedule/Earthrate/model-dependentreserve/aimtoshippedPhase6broadside baseline through deliberateauditedsourcechange;retainTask5currentforcebreakup/support/fullthrottleTWRfixes andnecessaryindependentbraking/debrief fixes. Preserve source,scientifictests,logs and reviews;do notclaimparkedphysics shipped. acceptedc242source/fixtures remainsinGithistory;latest15unacceptedsource/testfiles preservedbyparked-coupled-source.patch+SHA256 againstdaffd60,51787bytes,forward/reversechecksPASS. Oldpatches historical. Noreset/rebase/discard.

Then requiredfull6b gate/coverage/mutation/fullbrowser/highreview/independentphysicsreview/Linuxfixtures/audit/merge/deploy;continue7–9. No partialphase merge. Main/live080f108,60%,fourphasesremain. Noownerquestionorblockedgoal.

Task1/1b acceptancecheckpointc24235f isnowhistorical recoveryforparkedaero, nottheshippedfallback model. Camera consumer repair556617d remainsvalidandkept. Hosted37020750232 passed2011unit/instrumentedtests butfailedunchangedcoveragefloors;fullphaseclosuremustmakecoveragegreen. Restoreprofiledependentregressioncharacterizations coherently, preservealltruth/sourceevidence andphysicalacceptancebounds, remeasureifretainedBugfixeschangethem. GoldensstillTask1model;regenerateonLinuxonlyafterfallbackruntimeaccepted/non-goldenunits/truthpass. Preserveintroexactsequence. No partialphase merge.

## Standing autonomy approval — Steve, 2026-10-02

These two explicit question-tool answers supersede all earlier automatic diagnosis stops, exhausted-attempt prohibitions and pending exception requests in this contract, the phase plan and handover. Historical evidence and attempt counts remain unchanged.

1. **Reviewed diagnosis cycles for the entire roadmap.** Steve selected “Approve reviewed diagnosis cycles for the entire roadmap”. After three failed diagnoses, obtain a fresh independent review, record a new evidence-backed approach, then continue in another bounded cycle without asking Steve. This explicitly reopens the current one-km range failure and later failed 300 km/plume checks. Physical limits, test bounds, control authority, coverage and merge gates stay unchanged. Never loosen an assertion, add retries, delete a truth row, reshape the fixed eta bridge to pass a flight, or rerun for luck.
2. **Existing broadside fallback.** Steve selected “Allow the existing broadside fallback and continue”. If independent review establishes that Phase 6b's approved physical aero model cannot meet the required scenario within existing authority, execute its existing parking fallback: preserve the measurements, review and unfinished work, restore the affected aero to the shipped 2021 broadside model through a deliberate audited change, retain the independent Task 5 Bug fixes, document every parked task and reason, finish the phase gate/reviews and continue Phases 7–9. Do not reset/rebase/discard the checkout. This is an authorized conditional fallback, not permission to prefer an easier model, skip a required diagnosis/review, claim parked models shipped, or omit later phases. If the prescribed feasibility sweep fails, the independent review must confirm the model/authority conclusion before parking; a failed numerical calibration alone does not prove infeasibility.

Routine implementation, scientific diagnosis, measured calibration under the plan, in-scope visual/UX choices, phase planning, clean reviewed merges and deploy verification are autonomous. Keep every 2021 capability, the intro/presets/pig and all other protected contracts. Publish the planned design/motion review pages and proceed without waiting for an owner verdict; record any later verdict separately. Unrelated scope stays deferred. External credential/access failures may still require Steve, but unavailable peer review uses the documented fresh-reviewer fallback and hosted billing uses the existing CI exception. The narrow reentry golden-window exception is approved on2026-10-02; the standing diagnosis/fallback decisions remain resolved.

## Earlier resume decisions — approved by Steve, 2026-10-01

Historical approval wording follows. Its one-verification/automatic-stop restrictions are superseded by Standing autonomy approval above; its physical and assertion boundaries remain binding.

Steve's latest “sounds good” approves both recommendations previously presented. Do not ask again:

1. Replace only the obsolete >1500 s coast characterization with a calculated firing-geometry witness. Retain burn sequence, duration bounds and total-flight checks. The observed pad gap8,811,094.695 m matched predicted8,811,117.731 m; do not turn that observed23 m agreement into a tuned tolerance. Derive the witness's bound from the existing mechanical prediction/conic contract.
2. Bring Task 1b Earth rotation forward and finish Tasks 1+1b as one coherent Fidelity change. Re-measure aim, reserve health, flux and range under the rotating model as the phase plan specifies. Permit exactly one further named 300 km verification after that change and other focused acceptance. Three authorized diagnoses plus accidental run 4 are recorded. This is one verification after run 4, not a fourth diagnosis campaign. If it fails, stop that named work and report; independent authorized tasks may continue. If it passes, ordinary required release gates may include it; no reruns for luck.

The1533 K tile limit, one-km health, ten-km landing, burn bounds, ±3° authority, source bridge and general diagnosis rule remain binding. Both approved changes are implemented in the current checkpoint: Earth's projected rate is on and the obsolete coast floor is replaced by the firing-geometry witness. Their remaining flight acceptance is governed by First task.

Pre-flight source check: NASA TR R-474 equation 2.12 folds the normal-force
angle above 90 degrees (`alphaPrime = pi - |alpha|`); its crossflow coefficient
uses `M * |sin(alpha)|` (equation 2.3), and Figure 4 contains the finite-length
factor. Record these conventions and any necessary ruling in the implementation
ledger before writing tests; do not blindly extrapolate the plan's shorthand
into negative drag or reversed lift. Source: https://ntrs.nasa.gov/api/citations/19770026166/downloads/19770026166.pdf.

Phase 6 closure completed: main merge, gate, push, deploy, live smoke and roadmap tick. Its completed plan was already closed out. Retain the bounded plume history. A recurrent failure follows the 2026-10-02 standing review rule; do not redo the finished phase.

## Earlier model approvals — Steve, 2026-10-01

These model/characterization approvals remain binding. References to the original diagnosis budget are historical; Standing autonomy approval governs new cycles.

Steve approved both recommended exceptions (“sounds good”) after the goal was blocked. These exceptions are resolved; do not ask again. Full remaining scope stays Phases 6b, 7, 8 and 9. Phase 6 is done and must not be redone.

1. **Predictor characterization:** replace only the obsolete assertion `landingBurnStartAltitude(3, 200_000, 4_000, 25, scratch) === null`. The new physical axial drag stops the mathematical descent inside the unchanged60 s cap. Add an independent forward mechanical integration witness that reaches the target stop within the existing burn-agreement tolerance (max0.1% of burn distance or2 m), and assert its duration is below60 s. Use the shared force function; do not create a second aerodynamic model. Preserve the one-engine/full-tank null assertion, BURN_STEP_CAP=1200, and every genuine cap/null case. Separately retain a real-step witness that this start breaks up: a mechanical prediction is not a flightworthiness claim. The predictor’s force-only contract remains; full-trajectory structural/thermal rejection is not added by this approval. Never disable failures in the real-step witness.
2. **Crossflow factor:** correct the plan’s all-Mach0.63 assumption using NASA R474 §2.3.2 printed pp17–18 and Figures4/6. Retain0.63 for low crossflow Mach and recover1 at hypersonic crossflow. The Ship-specific transonic bridge is a declared tier-B engineering assumption, not measured data and not an optimization against heating.

**Bridge fixed before testing:** use crossflow Mach `Mn = M * abs(sin(alpha))`; eta=0.63 for Mn<=0.4; eta=1 for Mn>=1.6; between them use `t=(Mn-0.4)/1.2` and `eta=0.63+0.37*t*t*(3-2*t)`. The0.4–1.6 interval comes from Figure6’s available crossflow-Mach range for fineness10/12; applying its endpoints and a smooth monotone bridge to fineness50/9 is the explicit assumption. This does not model Figure6’s transonic dip, which lacks Ship-specific data. Cite that limitation. Do not subsequently reshape the bridge to pass heating, landing, truth or goldens; an independently established source/model defect is reviewed and recorded first.

The narrow approvals do not change the1,533 K tile limit, one-km health check,10 km landing acceptance,900 s reentry harness, reserve-health fraction, coverage floors, golden tolerances, control authority or diagnosis budget. Re-measure reserve/aim under the corrected model as already authorized. Existing source-derived coefficient tests remain truth; new body-force literal cases may be updated only to independently calculate the newly approved eta, retaining every assertion’s force/sign/continuity property. All analytic tests and reference bands remain binding. The prescribed eight-angle sweep must be run for the corrected model, since earlier tables describe the superseded constant factor; retain those tables as evidence, not current acceptance.

**Implementation status:** both approvals above are implemented and focused tests passed. Their prescribed eta red/green cycle and predictor witnesses are retained in the progress evidence. The thermal-envelope diagnosis exhausted its original three attempts; First task now governs the rotating range failure after the HUD/view fixes. The 2026-10-02 standing approval governs further reviewed cycles; reruns for luck remain prohibited.

**Recovery:** Tasks1+1b checkpointc24235f iscommitted/pushed. Unfinished Task2 plus the unconnected Task3 primitive are preserved in docs/research/2026-10-02-phase6b-body-moment/task2-3-in-progress-source.patch with task2-3-source-sha256.json (eight files, base556617d); forward/index and reverse/worktree checks pass. The earlier six-file patch/pins remain historical. Never apply either over existing changes. Thepatchbase c242 hasthesamecorebytesaftertest-only/doccommits. The coherent Tasks1+1b checkpoint commits runtime,tests,Linuxfixtures and audits on this branch and is pushed. Use the branch’s committed source. The historical in-progress-source.patch and sourcepins retain the initial uncommitted checkpoint for provenance;never apply that old patch over current committed work.

## Preserve these boundaries

- **The soul:** the intro auto-landing sequence, the scenario presets, the pig at x = 0 (`AGENTS.md` § Protected).
- **Capability parity:** every 2021 control keeps a working equivalent (`tests/e2e/parity.spec.ts`). Labels, layout and keys may change.
- **The seven walls** and a pure, deterministic `step()` (`sim-core-conventions`). The one sanctioned global is `window.__simDebug` in `src/app/debug.ts` (Phase 2 Task 5).
- **Physics changes only under a tier** from `physics-change-policy`. This roadmap is the approval for the Fidelity changes Phases 5–7 name. Truth tests are never re-blessed; no tuning constant moves to pass one.
- **Budgets:** first-load JS ≤ 300 kB gzip (250 until the React shell, whose React DOM costs about 45 kB; re-baselined in Phase 4 and recorded in the handover); the light gate ≤ 5 minutes on Steve's Mac; hosted CI ≤ 20 minutes.
- **`tests/fixtures/legacy/`** (the archived 2021 game) is never modified.
- **flight_sim is read-only.** Copy from `/Users/stevewang/dev/flight_sim/web/src/ui/`; never edit that repo.
- **Stay JavaScript/TypeScript.** No Rust, no WASM, no new language runtime.
- **The tile limit is 1,533 K** and never moves to make a flight survive. The landing reserve (18 t shipped;22 t currently re-measured in Task 1) and `DEORBIT_ENTRY_RANGE` are measured constants with health tests; re-measure them, never loosen their tests.
- **Graphics budget:** every Phase 8 effect is measured against 60 fps on desktop and the phone frame budget the Phase 8 plan states; an effect that breaks it ships a reduced-quality path.

## Decisions already made (do not re-ask)

Steve, 2026-09-30:
- **UI:** React 19 + Tailwind 4, PixiJS 8 kept. flight_sim's portable `web/src/ui/` core (primitives, `input/`, `motion/`, `styles/`, `tokens.css`) is vendored by copy into `src/ui/kit/`, with a `PROVENANCE.md` naming the flight_sim commit it came from and a `scripts/kit-drift.mjs` that reports (does not fail on) differences.
- **Look:** flight_sim's visual system with a Starship brand layer: its own wordmark, loading moment and copy vocabulary in place of the Flying Bricks ones.
- **Realism:** full Ship realism and a separate Super Heavy.
- **Tracking:** local, no Jira.

Steve, 2026-10-01:
- **Phase 6 resume:** one additional diagnosis attempt (attempt 4) for the iPhone portrait vacuum-plume width failure, with all assertions, bounds and retries unchanged. If it remains red, stop again; the general three-attempt rule stays in force.
- **Phase 6b, Entry on lift**, takes the parked drag, normal-force, fin and RCS tasks, on an entry angle-of-attack schedule (`modernization-phase-6b.md`, with its stop rule).
- **Phase 8, Visuals, before Phase 9, UX.** All four areas: engines and plumes (per-engine sea-level and RVac plumes expanding with altitude, Mach diamonds, staging and landing glare); re-entry and heat (plasma and tile glow from the skin temperature, belly-flop shading); environment (sky by altitude and sun, Starbase pad, tower and chopsticks, ocean, coastline, clouds, night); vehicle and camera (detailed Ship and Super Heavy, moving fins, cinematic moves, shake, bloom). Phase 8 publishes its visual direction to a private review page with the `Artifact` tool and proceeds without waiting; Steve's verdict folds in as a scope change.

Phase 6 calls made unattended (now in `docs/reference/physics-model.md` and the handover): the HRSI 1,533 K limit, judged on the tile's temperature against a radiative sink (the air below 86 km); the six-engine UI minimal until Phase 9; *Engines* (all) lights the three sea-level engines and shuts all six; the RVacs are fixed (no gimbal) and the autopilot lights none; the RVac exit diameter 2.3 m (commonly reported, no primary source); the rotating ground frame at 26°N built at rate zero, Earth's rate switched on in 6b once the entry has range control; spool-up is the existing ignition delay; the wind is a surface wind on NASA's profile, held above 150 m.

Made by the planner, stated so the run inherits them:
- **The live site cut-over is approved as part of Phase 1.** Pages switches to the Actions source, the 2021 game stays reachable as tag `v0-classic` and branch `classic` (the rollback target), and returning visitors are handed over by a kill-switch `serviceworker.js`.
- **Goldens:** a measured per-field relative tolerance (never above 1e-8), plus a bit-exact fingerprint that runs only on x86-64 Linux / Node 22.
- **Zero known-reds.** A Tier-2 row out of band is reported and ratcheted, never listed as a tolerated failure.
- **Super Heavy lands by tower catch:** a catch box at the tower in 2D, with speed and position limits written in the Phase 7 plan from public flight footage.
- **Keymap:** 2021 parity is broken for a modern scheme (pause, Escape, no Control or Backspace bindings, rebinding, gamepad).
- **Phase 3 publishes, then proceeds.** The design pass publishes its prototypes to a private review page for Steve and continues into Phase 4 without waiting. Steve's verdict, if it arrives, is folded in as a scope change.
- **The M11.3 amended acceptance** (the dt² proof moved to a Kepler ellipse) is accepted.

## Execution rules

- "Unlimited time and resources" is false. Optimize for shipping this roadmap.
- Product implementation is primary. Plans, harnesses, tests, reviews and docs are supporting work.
- Understand the affected code before editing it.
- Do not reset, rebase, discard, or redo completed phases.
- Focused tests while implementing; the full gate once per phase.
- Defer unrelated discoveries to `docs/plans/backlog/README.md`. Do not let them expand the current task.
- Commit at coherent checkpoints using `git-conventions` (`type(scope): outcome sentence`; no milestone IDs).
- Push at those checkpoints. Unattended work that exists only on this disk is one failure from gone.
- Review each phase before you merge it, and fix what is real. Not once at the end — a review of eight phases at once is not eight reviews. Invoke the **`code-review` skill** at `high`. It runs perfectly well unattended; the slash command is not the only way in, and a run that believes otherwise merges every phase on a self-review.
- A phase that touches a protected surface — the live site (Phase 1), physics goldens (Phases 5–7), the soul — gets a reviewer that never saw the code: use the `cross-agent-review` skill, which asks the other coding agent and falls back to ChatGPT Pro, then a fresh subagent. It merges without Steve, so this is required, not optional.
- Merge each phase to `main` once its gate is green and its review is clean (Phase 1 merges `claude/modernization` itself). This roadmap is Steve's approval. Work it did not ask for is not built: add it to the backlog with a `needs-steve` note and report it.
- If hosted CI cannot start because of billing or spending limits, record the exact message and proceed on the complete local gate and a clean independent review.
- **No PR for the program.** Each phase's merge commit is its record and the roadmap's closing section is the summary.
- Never rewrite history.
- Keep the roadmap truthful after each phase: tick its Status line, close out the finished phase plan (delete it; the merge commit and `docs/reference/` hold the record), and write the next phase's plan with `superpowers:writing-plans` (`modernization-phase-<n>.md`) before starting it. Keep `modernization-handover.md` current at each checkpoint.
- When a phase closes, move any decision that still holds into `docs/reference/` and keep `AGENTS.md`, the skills and the backlog true.
- **A real defect found by a new test is fixed, even in a phase that otherwise forbids physics changes.** Bug-fix tier only: the failing test first, the fix, a trajectory audit of every golden in the commit body, and an independent reviewer before merge. That precedence beats any phase's "no core behaviour change" constraint.
- **Diagnosis runs in reviewed cycles.** At most three recorded attempts per cycle (trace/screenshot, hypothesis, result). If exhausted, obtain a fresh independent review and record a new evidence-backed approach before the next cycle. Steve’s 2026-10-02 standing approval covers the whole roadmap and supersedes earlier automatic stops, including range/300 km/plume. Never loosen bounds, delete assertions, add retries or rerun unchanged code for luck. Only the explicitly approved predictor/coast characterizations and reentry600s recording extension may change as specified above. Proven aero infeasibility uses the independently confirmed parking fallback above; it does not redefine full-roadmap completion.
- Independent work runs in parallel only where it does not share files or goldens: reviews in the background while the next task proceeds. Physics tasks are serial (they share `step.ts` and every golden).

## Reporting

Report phases done vs remaining, product changes shipped (what a player can now see or do), completion %, and the current concrete blocker. Test counts and review volume are not progress.

## Autonomy boundary

- Make routine technical decisions without asking.
- Do not ask again for diagnosis-cycle permission, the approved Phase 6b fallback, routine in-scope design choices, clean reviewed merges or deploys. Ask only for a genuinely new product/scope decision outside this approval or an external credential/access action that cannot be resolved through the documented fallback. Defer unrelated work and continue authorized work where possible.
- Do not execute, extend, or scan any other roadmap. Do not invent new campaigns. Do not edit flight_sim.

## Completion condition

Stop when all of these are objectively true:
- [ ] every phase in the roadmap's Status list is checked off
- [ ] on `main`, `npm run gate` exits 0 on Steve's Mac, and the last three hosted CI runs on `main` are green (or the billing exception above is recorded)
- [ ] https://steveisnthere.github.io/StarShipSimulator/ serves the React build, and the smoke tier passes against that URL
- [ ] `npm run truth:report` shows every tier-A row IN, and the registry covers at least: Raptor sea-level and vacuum Isp and thrust, RVac Isp, Ship and Super Heavy propellant and dry mass, engine counts, planet radius, max-Q altitude and value on an ascent, and re-entry peak heating — a row may not be deleted to make this true
- [ ] `npm run mutation` shows every mutation CAUGHT by a named assertion failure, with the unmodified control run passing first
- [ ] every scenario, Ship and Super Heavy, lands (or is caught) under autopilot, asserted per scenario id in `tests/flies-every-scenario.test.ts` — not "reaches a definite outcome"; or, if Phase 6b's stop rule fired, the deorbit lands on 2021's broadside drag and the parked tasks are named in the handover as Steve's decision
- [ ] Phase 8's visual-direction review page is published and linked from the roadmap, the screenshot specs for launch, staging, belly flop, entry, landing and catch pass, and the phone frame budget is measured and met
- [ ] no `.svelte` file remains, and the design-contract and UI-contract scanners pass with their self-tests in `npm run build`
- [ ] `docs/reference/` describes the shipped system, `bash ~/.agent-config/skills/repo-docs-maid/scripts/check.sh` exits 0, and the backlog names every deferral in words
- [ ] the roadmap's closing section summarises what shipped, with the merge commit of each phase
- [ ] a motion-review page for Steve (launch, staging, belly flop, landing, catch) is published and linked from the closing section; his verdict is owner acceptance, recorded separately — the run is engineering-complete without it

Do not continue into the backlog's unphased items (shareable flights, licensed audio, a sixth preset) after this condition is met.

## Deliberate fallback implementation checkpoint (2026-10-02)

Affected Tasks1–4 source now deliberately restored to shippedPhase6 broadside baseline: constants/state/commands/actuation/guidance/aero byte-identical to080f108; sourcepins in body-momentresearch/fallback-restoration-pins.json. Task5 current-force/support/throttle/shutdown fixes, independent braking and first-loss debrief remain. Scientific source/tests/sweep preserved verbatim in parked-files/*.txt +SHA256 and earlier pushedcheckpoint/patches. Tasks1–4 are parked, notshipped. Backlog names every deferral; physical/reference/assertion bounds unchanged.

Build/lint/truth8/8 and focused91pass. New600s broadside record exposes camera shake bypassing rendered groundfloor; fresh independent fallback_camera_review confirms minimaldecorative-offsetclearancefix. Original four framingfailures nowpass; newfivecheapclearancechecks pass aftercorrecting invalidnovelfixture/input andgroundprojection inequality. Allredlogs retained. Explicitnon-fixture collection1915pass/onefixednoveltest; live timeline and comparechecks separate. Expectednewreentryevents include touchdown within600s; fixturesstillparkedmodel untilLinuxregen. No completegate/coverage/mutation/fullbrowser/finalphasereviews/merge/deploy claimed.

Next: Linuxrecording/audit coherentfallbackstate, then fullPhase6bclosure and7–9. Main/live080f108,60%;noownerquestion.

## Integrated Linux fallback checkpoint (2026-10-02)

Linux37035784562/845c41d9succeeds;21corepins identical. All8fixtures integrated anddual-baseline fieldaudited againstmain080f108/c242. Introphysicalmotion/enginesequence exact, reentry180sphysicalmotion exact;retained600sendpointlands457.158s. Freshphysicsreview independentlyapprovesoriginal numericdescentchecks at exact180s world.updatedFrameCount21600 plus600sendpointlanded/no-crash/vy0/alt<26; allsample survival and900sfullscenario capunchanged. Broadside1459K/170900Wm²characterizations pass withoriginalwidths. Scientificmodels/source preserved16parkedfiles+hashes/latest15filepatch/Githistory. No truthrowdeleted.

Fresh physicsreview noactionableruntime/protectedfinding,52focusedpass; freshcamerareview noactionablesourcefinding; liveframing160pass,cheapclearance5pass, standalone91retainedphysics/38wind-frame/21timeline/5comparepass. Initialfixtureintegration duplicateimport andwrongframefield typo corrected; firstfullgate1976pass/oneknownfieldtypo, nopost-unitgate stage ran. Correctedreplay17pass; coverage inprogress. SnapshotCI37035784487expectedred onstalefixtures; it is recordingbranch, notacceptedreleaseSHA. Allredlogsretained. No fullgategreen/mutation/fullbrowser/finalhighreview/merge/deployyet. Main/live080f108,60%,fourphasesremain.

## Gate-green fallback checkpoint (2026-10-02)

Complete localgate exits0:1977units and1977coverage-instrumentedtests; unchangedcoveragefloors, smoke and5subpath checks pass. All8Linuxfixtures/audits coherent with source; intro motionexact, reentryoriginal180s motionexact,600slanded. Full5-browser suite nowrunning; mutation/finalreleaseacceptance/merge/main-gate/deploy stillrequired. High-depth branchreview found onlystale authoritative-roadmap checkpoint; accepted/corrected, followup requested. No partialphase merge; main/live080f108,60%,fourphasesremain. Next finishfullbrowser, runmutationALONE, finalreviewfollowups, phaseclose/merge/deploy then7–9.

## Browser diagnosis checkpoint (2026-10-02)

Fullfive-browser verification completed436pass/2fail/11configuredskips at eb703cb. The complete rawlog and both screenshots/context are preserved; no rerun for luck. Fresh independent diagnosis rules out the decorative camera clamp as the vacuum cause. Shared render RNG cadence/restart defects have watched-red witnesses and a narrow per-emitter-stream repair;61focused tests green. Terrain photographs are now at exact configured altitudes while paused. All10focusedbrowser checks, fullgate and all21mutations pass; finalfullbrowser/mutation/gate/reviews/merge/deploy remain required. Main/live080f108,60%,fourphases remain; no owner question.

## Reviewed browser repair release checkpoint (2026-10-02)

The repaired source passes the complete localgate (1980units/1980instrumented,13smoke,5subpath), unchanged floors, docs-layoutcheck and all21mutation faults after848greencontrol tests. Focused five-project original plume/terrain assertions10/10pass; fresh independent and high-depth source review clean. No seed tuning or effectparameter/assertion/retry changes. Preserve/push the coherent checkpoint, then run finalfullbrowser against its unchanged runtime and obtain finalreviewacceptance before merging. Main/live080f108,60%; Phase6b–9 remain.

## Pushed candidate verification in flight (2026-10-02)

Repair checkpoint76c60e3 is committed/pushed. Final fullfive-browser session2684 is running with449configured specs and unchanged retries/bounds, log /tmp/starship-browser-cycle1-full-final.log. HostedCI37044401235 succeeded at the sameSHA. Do not restart live verification or edit runtime/tests/fixtures during capture. Independent physics revalidation confirms all21corepins/eightLinuxfixtures unchanged and offers conditional sourceacceptance only; fullbrowser/CI/merge/main-gate/deploy remain required. Current documentation updates are verification records only. Main/live080f108,60%,four phases remain.

## Hosted candidate gate verified (2026-10-02)

HostedCI37044401235 succeeds at76c60e3; Linuxgate/hygiene green. Configured hostedfullbrowser/bench skipped, not claimed. Local fullbrowser session2684 still running and the previously failing Android landscape vacuum assertion now passes. iPhone outcomes/finalfullsuite result remain required; no merge/deploy/phase tick. Main/live080f108,60%,four phases remain.

## Final browser failure and next bounded diagnosis (2026-10-02)

At committed candidate `76c60e3db222118fe342560efe8d1fff2c6464bc`, the final full browser run completed with exit 1: 435 passed, three failed, 11 configured skips, 30.8 minutes, zero local retries. Session 2684 is complete; never resume or restart it. Full raw log, all three failure screenshots/context and the last-run manifest are preserved in `fallback-browser-cycle1-final/`, with SHA256 manifest. Hosted CI 37044401235 succeeded at the same candidate; local gate and all 21 mutation faults remain green. These checks do not override the failed browser acceptance.

Cycle 1 attempt 1 is unsuccessful as release acceptance. Both original failures passed: Pixel landscape vacuum width and iPhone portrait exact-altitude terrain. Remaining failures are iPhone portrait low-altitude plume length 0.9156261427575323 and landscape length 0.8853575099391015 against original >1, plus landscape vacuum width 0.43333333333333335 against original >0.4994324415041085 (low width times 1.2). No bounds, retries, effect parameters or seed were changed. No merge, phase tick or deployment is authorized yet.

Fresh independent `fallback_camera_review` confirms the cadence/restart repair remains valid, but does not prove pixel acceptance. Low landscape qualifying pixel counts 3286/3324/3326/3166 are nearly constant while measured lengths vary 0.89/0.70/0.89/2.29. This argues against wholesale starvation; it does not establish the cause. The detector collects an unrestricted bounding box, with no connectedness filter. Screenshots taken after the measurement show dotted distal tails but cannot establish RGB at the actual failed sample.

Cycle 1 attempt 2 starts with diagnostic evidence, not parameter tuning: preserve each original paused subject/background pair, record unchanged threshold decisions and exact step/viewport/nozzle, repeat a capture of the same frozen sample to distinguish compositor variation from state-dependent threshold crossing. If needed, expose read-only per-emitter live count/age/alpha/geometric extent and replay prescribed startup/render cadence through the real frame path. Do not use debug.step alone: it advances physics/camera without particle time. Retain original four samples, intervals, assertions, bounds, seed and retries. Record the hypothesis and evidence before any causal repair; no unchanged-code rerun for luck. Main/live remain 080f108, six of ten phases complete (60%). Full scope remains 6b, 7, 8 and 9; no owner question is pending.

## Attempt 2 capture transport result and attempt 3 (2026-10-02)

Diagnostic attempt 2 at e707f3c completed exit 1: three passed, one failed (iPhone portrait vacuum width), 1.7 minutes, zero retries. Every logged frozen pair has matching extents; this does not prove matching pixels. The list-only reporter leaves body attachments in memory, so the exact PNG/JSON inputs were not preserved. This is a diagnostic harness transport defect; do not treat this run as release acceptance or infer pixel stability. Complete log and available failure artifacts are in fallback-browser-cycle1-attempt2/ with hashes. Earlier full run remains the authoritative release failure.

Fresh fallback_camera_review checked installed Playwright source and confirmed HTML reporter persists binary body attachments under data/. Reviewed cycle 1 attempt 3 changes only capture transport: run the same diagnostic harness with list+HTML reporters and isolated /tmp/starship-browser-cycle1-attempt3-html output. No runtime, seed, emitter parameters, sample count/interval, detector bounds, assertions or retries change. Confirm files/hashes before pixel analysis. Direct writeFile(outputPath) plus path attachments is the more robust future option, but unnecessary source changes are avoided for this capture. This rerun obtains missing diagnostic evidence; it is not a rerun for luck. After this third attempt, any further diagnosis requires fresh independent review and a newly recorded evidence-backed cycle under standing approval. No phase merge/tick; main/live080f108,60%,four remaining phases.

## Historical diagnostic capture checkpoint

Cycle 1 attempt 3 is running as session51428, log /tmp/starship-browser-cycle1-attempt3-capture.log, isolated HTML report /tmp/starship-browser-cycle1-attempt3-html. Existing committed diagnostic harness e707f3c/runtime76c60e3 unchanged. Do not edit runtime/tests or restart this run while live. Resume handle, preserve completed log/test-results/HTML data and hashes before another browser invocation; verify actual PNG/JSON artifacts, then compare frozen pairs and distal threshold decisions. This is diagnostic evidence only, not release acceptance. After third attempt, obtain fresh independent review/new evidence-backed cycle before further diagnoses. Main/live080f108; no owner question.

## Completed attempt 3 and fresh cycle review (2026-10-02)

Cycle1attempt3 completed exit1: three diagnostic checks passed, iPhone landscape vacuum width failed, 1.9 minutes, zero retries. The instrumented run is not release acceptance. Its HTML reporter preserved all exact measurement inputs:24 subject/background/frozen-repeat pairs,49deduplicated PNGs including automaticfailure screenshot. Every24subject/frozen-repeat PNG pair is byte-identical, confirming no observed compositor variation within frozen states. Variation between different sampled flight states remains; its cause is not established. Full log/testresults/HTMLreport/extracted report JSON/capture-summary/hash manifest are preserved in fallback-browser-cycle1-attempt3/. The existing full435pass/3fail result remains authoritative release evidence.

Three cycle1attempts are recorded. Fresh independent plume_cycle2_review is active, read-only, inspecting actual saved pixel inputs and source before a new bounded cycle approach is recorded. Do not run another browser diagnostic, tune parameters/seed/thresholds, or claim success from the three focused passes. Next compare distal threshold and reference-exclusion decisions with actual images; emitter-internal read-only diagnostics remain an option if necessary. No further core/aero feasibility work. Main/live080f108,60%,6b/7/8/9 remain unfinished; no owner question.

## Reviewed cycle 2 approach — additive compositing (2026-10-02)

Fresh independent plume_cycle2_review found a concrete source/pixel defect. All24 nominal additive captures contain channel decreases against the same frozen background; landscape low step566 has6547 pixels decreasing a channel by>3 and minimum RGB differences[0,-31,-75]. Core/bell sprites use Pixi add[ONE,ONE], but the parent effectsBehind bloom filter retains accumulated particle alpha and composites with normal[ONE,ONE_MINUS_SRC_ALPHA]. The filtered emission therefore subtracts background light. The original detector is reproduced exactly offline; low-altitude reference exclusion is zero, vacuum landscape excludes only16pixels per capture. Distal particles are present but fall below original200luma/100warmth cutoffs. This establishes compositing defect, not final acceptance or every remaining cause.

Cycle2attempt1: watched-red real WebGL witness with actual production particle system/post pass over uniform opaque background, compare direct additive with bloom enabled and retain normal smoke control. A fix must preserve mixed normal/additive semantics; switching the entire layer/filter to add would incorrectly turn smoke into light. Keep source effects/seed/thresholds/bounds/retries unchanged. A test-only bundled renderer fixture is served by Playwright routing, avoiding a production debug API or build entry. Then narrow causal repair and focused original capture; emitter read-only count/age/extent/worldDt diagnostics if vacuum still fails. Do not claim focused checks releaseproof; finishfullsuite/gate/reviews beforemerge.

## Cycle2attempt1 focused browser outcome

Original plume measurements plus five renderer witnesses across allfive projects:31pass/4fail,exit1,3.7minutes,zero retries. All five original low-altitude length checks pass; all25 realcompositing/mixed-order/contextrestore witnesses pass. Vacuumwidth stillfails desktop,Pixel landscape,iPhoneportrait,iPhonelandscape; Pixelportraitpasses. Compositingrepair causallyvalid butnotreleaseacceptance. Preservefullrawlog/captures beforeanyotherbrowserrun. No numericalthreshold/bound/seed/effectparameter changes. Main/live080f108,60%,fourphasesremain.

Fresh high-depth reviewfoundoneP2: non-WebGL wasassumedWebGPU, butPixi8.20 canselectCanvas. Fixwith explicitWEBGPUguard/no-opunsupportedrenderer andtargetedno-state test. No otherfinding. Independentsource reviewno blockingGL/GPUalgebra/lifecyclefinding, currentpremultipliedparticletextures covered; futureadd-npmtextures separatetreatment. WebGPUchecks descriptors only, nothardware. Firstnovelmixedfixture accumulated8bitroundingoverhundredssmokedraws; replacedwithtwoexactcontrolSprite drawsto isolatealgebra,keepingoriginal1roundingbound. Originalrendererstatefailsfourcorrectedwitnesses; fixedpassesfive. Manualrestorationfixture usedwrongextensionpath; correctedpublicPixiforceContextLosspath,actualrestorationpasses. Allintermediatefailedlogs/capturesretained.

Cycle2attempt2: obtain read-only per-emitter livecount/age/alpha/geometricextent/effectiveemissionscale andactualframe worldDt alongsideactualpausedpairs, then distinguish sparseoverlap fromemission/timing loss before furtherrepair. Keepcurrentcausalrendererfix andoriginalbounds/retries. Diagnosticcaptureisnotreleaseproof.


Cycle2attempt2 completed:5passed/5failed,4.6min,zero retries; all five vacuum-width checks fail. Exact60 frozen PNG pairs are byte-identical; steady full core/bell populations rule out wholesale starvation in this run. Camera-normalized geometry expansion is present. All raw captured geometry/pixels/logs/reports/hashes retained in fallback-browser-cycle2-attempt2/. Fresh independent analysis requested for cycle2attempt3; do not repeat unchanged source for luck. High-depth rotated-streak diagnostic finding fixed; final build and69 focused checks pass. Main/live080f108,60%,four unfinished phases; no owner question.


Cycle2attempt3 watched-red exactlocalbloom kernel witness confirmed46RGBvariation solelyduecanvassize. Sourceoffsets nowusePixisupplieduInputSize.zw. Tap/weights/strength/thresholdunchanged. Initialshareduniformprecisionmismatchproducedlinkfailureandblankfilter; meaningfulpositivecontrols caughtit. Explicitsharedhighp fixeslinking;6desktoprendererwitnesses pass(diff0,432visiblebleed),finalbuild/lint/focused65unitspass. Original5projectplume+30rendererwitness capture running session92029; do notlaunchanotherbrowser or editruntimeuntilcomplete. SavecompleteHTML/rawlog/results first. Release acceptance remainsunknown; main/live080f108,60%,four unfinishedphases.


## Cycle2attempt3 final result and fresh cycle3 review

At source d4f3606, originalfiveprojectplume plus30rendererwitnesses completed37passed/3failed,exit1,zero retries,4.9min. All30rendererwitnesses andall5lowlength checks pass; iPhoneportrait/landscapevacwidth also pass. Vacuumwidth remainsfailed on desktopChromium,Pixelportrait,Pixellandscape. All60exact frozenpairs arebyteidentical. FullactualPNG/JSON/HTML/rawlogs/results/hashmanifest retained in fallback-browser-cycle2-attempt3/. This isnotreleaseacceptance anddoesnotclosePhase6b. High-depth/independent source reviewfoundnoactionablefinding ininput-coordinate fix; meaningfulpositivecontrols caughtinitialsharedprecisionlinkfailure,correctedwithoutkernelparameter changes.

Allthree cycle2attempts arecomplete. Fresh independent plume_cycle3_review isactive,read-only,analyzingactualremainingpixels/source before recordingnewbounded evidence-backedcycle3 approach. No furtherbrowserdiagnosis orsourceparameterchanges before thatreview/approach. Noownerquestion; approvedstandingcycles apply. Main/live080f108,60%,6b7 8 9remainunfinished. Existingsourcebuild/lint/focusedchecks green; finalfullgate/fullbrowser/mutation/releasereviews/merge/main-gate/deploy stillrequired.


## Cycle3attempt1 sampling repair and continuous-bell prerequisite

Fresh independent cycle3 review established expandedvisiblegas outsideoriginalbrightthresholds; no newbugwasassumed. Controlledfrozenproduction-driver tests provedfilterdownsampling/MSAAcoverage loss onDPR2: watchedredconfiguredsource maxloss204RGB,26–58sourcepixelserased; bothsettingsinherit preserveall12DPR2cases within0–1RGB/zeroerasedpixels. Bloom-onlyresolution/antialiasinherit implemented; heatunchanged. All7desktoprendererwitnesses/build/lint/65focusedunits pass; freshindependentandhigh-depthsource reviews clean. DPR1notuniversal1RGB anddetectorwidthsnearlyunchanged,so no originalwidthclosureclaim. Rawdata/logs/HTML/failurecapture/hash in fallback-browser-cycle3-attempt1/.

Nextnativecycle3attempt2 follows continuous-bell-plan.md: continuousnozzle-framefield alongsideunchangedparticles,existingpressurecurves/bellgeometry/tint/alpha/per-running-enginecontributions,preallocatedmeshes/lifecycle/meaningfulabsencecontrols,originalacceptancebounds unchanged. This brings minimumvisible-bell prerequisite forward fromapprovedvisualscope; Phase8remainsunfinished. Planreview requested beforeimplementation, noownerquestion. Nocore/aerorestoration/feasibilitywork. Main/live080f108,60%,6b7 8 9unfinished.

## Cycle3attempt2 numeric green, visual rejection

Cycle3attempt2:51checks pass(original10five-project plume/36renderer/5scene),all60frozenpairs byte-identical. ActualPNG review rejects saturated straight-sided white interior before6bclosure. Cycle3attempt3 maps transverseUV by actualx/radius to spread unchangedsoftprofile acrossfullenvelope; no oldconfig/seed/threshold/bound changes. Revised capture-hide regression watchedred; all5actualscene lifecycle checks pass after effectiveparentvisibility fix. Execute thirdapproach natively, inspectpixels and originalacceptance, thenfullreleasechecks. Main/live080f108,60%,fourphasesunfinished; noownerquestion.
