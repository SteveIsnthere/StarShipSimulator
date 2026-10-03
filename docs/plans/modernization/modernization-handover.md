# Modernization — handover

The unattended run's report. Updated as phases land; the last section is always current.

## Status at a glance

| phase | state | merged |
|---|---|---|
| 1 Green gate and cut-over | done, live | `f14aadb` (2026-10-01) |
| 2 Truth harness | done | `53e3c26` |
| 3 Design pass | done (review page published) | `53e3c26` |
| 4 React shell | done, live | `dfab3c8` |
| 5 Guidance on real physics | done, live | `b84b746`, fixed `3429ea1` |
| 6 Ship realism | done, live; gate and live deployment smoke verified | `080f108` |
| 6b Entry on lift | closed under approved broadside fallback, live and verified | `c2ae5e4` |
| 7 Super Heavy | Tasks1–4 core/mission clock implemented; UI/release remain | — |
| 8 Visuals | not started (added 2026-10-01) | — |
| 9 UX to flight_sim level | not started | — |

## Shipped

- **The rebuild is live** at https://steveisnthere.github.io/StarShipSimulator/ in place of the 2021 game. Returning visitors' 2021 service worker is retired by a kill switch; the 2021 game is tag `v0-classic`, and branch `classic` is the one-command rollback (`docs/reference/architecture.md`).
- **A gate that is green on your Mac and in hosted CI.** Before: 48 of 1,585 unit tests red on arm64, CI green 2 of 132 runs. The complete local main gate is green at `c2ae5e4`; hosted CI and Pages succeed. The two existing hosted menu flakes remain named for Phase 9.
- **A truth harness.** Cited reference bands with a ratchet (`npm run truth:report`), property invariants over every configurable flight, a mutation matrix the suite must turn red (`npm run mutation`, 21 of 21 caught), a debug surface and a browser witness with a positive control.
- **Two real physics bugs fixed**, both found by the new tests: the tank went negative on the emptying step, and the flight editor accepted negative propellant (a vehicle lighter than its own structure).
- **Phase 6, Ship realism** (merged and live): a real Earth (GM, radius, the 1976 atmosphere to its thermosphere), felt g, six Raptors with three fixed RVacs, a heat shield in kelvin against a 1,533 K tile, wind that grows with height and gusts, and a rotating-frame model ready for Earth's spin. Every scenario still lands under autopilot.
- **The design pass**: `docs/design/ux-critique.md`, `design-system.md`, `ia.md`, and the review page below.

## For you to look at

- **The prototype review page** (private): https://claude.ai/artifact/9rAusShWLCkpoHMhoVy5TR — today's interface against the proposed one, surface by surface. Your verdict feeds Phase 4/8 as a scope change.

## Decided on your behalf

- **Pages cut-over executed** as part of Phase 1 (it was in the plan), after an independent review that drove the migration and rollback in a real browser.
- **Goldens**: a measured tolerance (1e-8) off the recording platform, exact on it.
- **Fonts**: Inter / Inter Tight / JetBrains Mono, subset to 52 kB, replacing Barlow.
- **Kit reuse**: flight_sim's `web/src/ui` vendored byte for byte, type-checked under its own settings; nothing in flight_sim changed.
- **Layers pause the flight**, Escape closes the top layer, P pauses (from the IA).

- **Flight screen layout (Phase 4)**: the primary cluster moved from bottom-centre to top-centre. At the bottom it covered the vehicle on the pad and at touchdown. On a phone the world ends above the controls so the camera reframes instead of being covered, and a phone held sideways gets its own compact layout. `docs/design/ia.md` records the change.
- **Flight backing deepened from 62% to 68% black**: the new contrast test measured the label grey at 4.11:1 over a noon sky, under the 4.5:1 floor.
- **Engine states drawn by shape, not blinking**: the old blink tests were passing on nothing; the new specs check the shapes and that reduced motion adds no transition.
- **Bundle budget 250 → 300 kB** for React DOM (275 kB measured), and one design-scanner exception for the throttle slider's measured fill. Both recorded where the rules live; confirm or overrule.

- **Phase 6 calls, made unattended (you are buying these; the model is in `docs/reference/physics-model.md`):**
  - the tile limit is NASA's Shuttle HRSI 1,260 °C (Starship's is not public), so the deorbit may park rather than move the limit;
  - the six-engine UI is minimal now and the look is Phase 9's (UX);
  - *Engines* (all) lights the three sea-level engines, as in 2021;
  - Earth rotation uses a rotating ground frame at Starbase's 26°N, done last;
  - spool-up is the existing ignition transient, not a second invented one;
  - **the landing reserve is measured, not computed (changed during Task 3).** The plan's formula gave 6.3 t, but the landing programme spends 12.0 t engine-out, so a computed reserve would have crashed every deorbit. It is 18 t after Task 4c (the worst engine-out use plus about a third), health-checked the way the deorbit aim is; engine-out deorbits now land with 3.8 t instead of 0.0–0.2 t;
  - **the RVacs (Task 4b)**: 258 tf and 380 s from Wikipedia; the 2.3 m exit is the commonly reported figure with no primary source found. The autopilot lights no RVac in Phase 6 (a vacuum deorbit burn on RVacs is later work); *Engines* (all) lights the sea-level three and shuts everything down. The controls and HUD show six marks in two labelled sets, keys 4–6 for the RVacs: a minimal UI, the look is Phase 9's;
  - **the flip trigger plans on the slowest engine start** (1.2 s, Task 4c), not 2021's 0.6 s constant.

## Parked — yours to decide


- **No LICENSE** in a public repo. Choose one before this grows further.
- **Two dead remote branches**, `origin/exp` and `origin/feat/modernize-app`: nothing in either is worth keeping. Delete when you agree.
- **Codex can't run as a peer reviewer**: `~/.codex/config.toml` names `gpt-6.1-sol`, which a ChatGPT login does not support (still so on 2026-10-01, Phase 6's close). ChatGPT Pro and fresh subagents reviewed instead. Changing that lever is yours.

- **Guidance (Phase 5)**: the autopilot's throttle laws, landing-burn sizing and the HUD impact predictor run on the simulation's own gravity, thrust and drag. The flip trigger keeps its one-engine pessimism with no added margin, because a one-engine-out deorbit lands with almost no propellant (the shipped reserve is now 18 t and is independently health-checked).

## Follow-ups recorded for Phase 9 (UX)

- The throttle and yoke sliders follow the simulation only on keys, store changes and when touched, not while the autopilot moves them (the Svelte slider never followed at all).
- The debrief has no grade or comparison with the previous flight yet (ia.md asks for both).

## Incidents

- **2026-10-01, main red for one merge.** Phase 5's goldens were re-blessed on the Mac; they replay bit-exactly only on x86-64 Linux / Node 22, so CI failed in the 16th digit and the deploy did not publish (the live site kept the previous build). Fixed in `3429ea1`: fixtures now come from `.github/workflows/golden-regenerate.yml` (push a branch as `golden/<name>`), `golden:regenerate` refuses anywhere else, and the policy says so.

## Current checkpoint

**Seven of ten phases are complete (70%).** Phase 6b is merged and live at `c2ae5e46a25db0bdd63504a8f93d37056176b069`. It ships Task 5/current-force corrections, independent descent braking, first-loss debrief capture, camera clearance and repaired continuous exhaust. The body-axis/fin/RCS/entry/Earth-rate models remain parked under Steve's independently confirmed fallback; recovery and reasons are in the backlog and physics reference.

Complete main gate passes 1,993 unit/coverage tests, unchanged floors, 13 smoke and five subpath checks. Final branch browser suite passes 480 checks with zero failures/retries and 11 configured skips. Mutation control passes; all 21 faults are caught. Fresh high-depth source review and independent final acceptance are clean.

Hosted CI `37071475434` and Pages `37071475425` succeed at the merge; both gates needed retry 1 for the two existing menu visibility checks. Phase 9 retains that debt. Live smoke passes 5/5 with certificate validation enabled. All 44 served assets and the service worker match verified build `3da4ee45585e`.

[Closure evidence](../../research/2026-10-02-phase6b-close.md) retains raw logs, hashes, exact limits and platform caveats. Prior diagnosis/approval history is in research and Git at `3f003ec`; do not reopen it. Phase 7 Super Heavy is next, then Phase 8 Visuals and Phase 9 UX. Phase7 Task1 shared vehicle parameterization is implemented on claude/super-heavy with bit-exact Ship proofs, unchanged goldens,2017 passing unit tests and8/8 truth rows IN. Task1 final847assertions pass and its completion is ledgered. Task2 physical33-engine booster/grid fins is complete (2030unit tests,14/14truth rows,25final focused assertions). Task3 physical catch is verified, but booster guidance is not accepted. Cycle1 and cycle2 each exhausted three attempts. Cycle2 attempt1 was terminated for measured CPU cost; attempts2/3 preserve structural survival but both miss the tower and exhaust fuel. Fresh source-pinned review is complete/dispositioned in cycle2-review.md: provenance, phase reinterpretation, unmatched coast, infeasible terminal and expired-arrival loiter are confirmed. Cycle3 is3/3 full-flight attempts consumed. Attempt2 fixed deadline publication but actual ready diverged by kilometres; attempt3 fixes complete returned-frame source, paid startup cadence, interval-end cutoff and wasted common powered work.22current source/test/input files are pinned against08c050d with a checked recovery patch in `cycle3-source-consistency/`.81focused/Ship proofs/build/lint0/14truthIN pass,287.9kB. Both original first-source clock controls deliver real fine catches before cutoff, but actual full returns remain unaccepted: Sep first plane bodyx−6.597m/vx−1.347,RTLS−4.851/−2.834; both latercrash/fuelRunOut, engine/RNG controls pass. This is not model impossibility. Required fresh diagnosis review is dispatched to new `booster_cycle3_fresh_review`, source frozen; peer authentication failed and connected Pro Chrome surface is unavailable. The fallback is not cross-vendor/release approval. Collect/disposition findings and record new bounded cycle4 approach before another full flight; no unchanged rerun. Exact source, failed RED controls, full traces, short calculations, current scope and packet are `docs/research/2026-10-02-phase7-booster-guidance/cycle3-source-consistency/README.md`. No goldenregeneration/mainmerge/deploy;7notshipped,7/8/9remain. No owner question pending. Active GOAL specifies the next task.

Fresh cycle3 review is now collected; all two P1 and one P2 findings are accepted. This supersedes the review-pending wording above. Cycle4 starts0/3 with executable cutoff, complete returned readiness command/deadline and live discrete startup controls. `cycle3-source-consistency/fresh-review.md` and `cycle4-approach.md` record assessment, disposition and admission. No full attempt is admitted yet; phases7/8/9 remain required and main/live are unchanged.

Cycle4 partial checkpoint: executable cutoff/complete returned readiness/startup/endpoint controls pass, but final suite86pass/3fail. Both original first-source publication controls and coast-only deterministic publication are red. Sep hits4000steps before readiness with81ignition draws; RTLS fine-catches after its cutoff, correctly unpublished. Build/lint0/14truthIN and Ship proofs pass. Current22pins/recovery patch against1239f43, raw logs and exact next bounded work are `../../research/2026-10-02-phase7-booster-guidance/cycle4-executable-handoff/README.md`. Cycle4 remains0/3; no full flight admitted/no7tick/merge/deploy. Diagnose paid event/work latency under fixed budgets, preserving reviewed corrections.

## Latest: cycle4 original booster catches green

Cycle4attempt2 original traced harness4pass; both physical airborne catches retain fuel/no failures/finite full state and hold. Attempt1 finite-origin metadata failure fixed at booster construction, without Ship change.110focused/Ship checks/build/lint0/14truthIN. Recovery23pins/patch/raw actual events in `../../research/2026-10-02-phase7-booster-guidance/cycle4-terminal-allocation/README.md`.2/3cycle consumed; current result green. Next finish Task3 selected-model scenario suite/fuel docs/fixtures, Task4hotstage/Task5controls/Task6release, then8/9.7phase notclosed; no gate/review/merge/deploy claimed. Steve approved only coast-only determinism wait4000actualstep/≤4percall exception; production deadlines unchanged.

Scenario integration follow-up: selected-model scenario/catch/analytic77pass, complete unit baseline2120pass/168files/67.06s including eight unchanged Ship goldens. Fuel/physics documentation measured. Current24pins/checked recovery patch against65e7641 (scenario-source files in cycle4-terminal-allocation). No runtime committed yet; next actual booster golden coverage/Linux audit then coherent Task3code/fixtures/audit commit, hotstage4/UI5/release6/8/9. No task3diagnosis replay needed.

## Latest: Task3 actual booster fixtures, Task4 next

Task3 final2128units/170files, build/lint0 and14truthIN. Both actual booster catches are represented by Linux22 fixtures; eight existing Ship files are byte-identical. Fresh independent fallback review found and verified the stale manual-input cutoff fix; Task5 generic autopilot and direct UI-event invalidation obligations remain. Hosted snapshot CI37100120187 fails coverage floors despite2122units passing. Record/fix all floor deficits before Phase7 release; do not lower them. Exact raw evidence/review/final source recovery is task3-goldens. Next shared-dynamics Refactor proof/checkpoint, physical hot staging, two-vehicle functional UI and complete release, then8/9. Main/live unchanged;70%byphasecount.

Task4 extraction follow-up: shared paid-force/translation/rotation phases pass47focused checks, all ten goldens and independent1200+7680Ship observations at0ULP, build/lint0/14truthIN. Refactor checkpoint precedes physical staging. Next actual COM/inertia/two-body attached mission; release coverage deficits remain.

## Latest: physical staging core and shared clock complete, Task5 next

Task4 final2143units/173files, build/lint0/14truthIN; all ten goldens and independent Ship proofs unchanged. Real engine delays/fuel, aggregate physical mass/COM/inertia/force/torque, no-kick release, all-Ship failure remaining attached and exact30/60/144Hz/warp/slow/pause/restart witnesses pass. Short default stage releases at1.208333s with6Ship/3booster engines. New mission radius/constraint-load defects were caught RED and fixed; zero-torque test keeps its assertion and uses actual underflow vacuum at300Mm. Source/raw evidence2026-10-02-phase7-hot-staging. No UI/main/live change yet. Next Task5 model-aware session, two-body camera/rendering/HUD/controls, including Task3 generic mode/direct event provenance obligations; then coverage/full release/high review/merge/deploy and8/9.70%byphase count remains.


Task5 routing checkpoint: actual-model standalone/shared mission controller, manual source invalidation, physical booster engine groups and model-aware guard/hold/ascent are implemented. Focused70checks include all ten unchanged goldens and independent Ship proofs; build/lint0/14truthIN before/after. Exact RED/GREEN logs in2026-10-02-phase7-mission-routing. Visible session/canvas/HUD integration remains unbuilt; next split session before connecting the controller and preserve per-body histories/canonical debug stepping. Main/live unchanged; coverage/full phase release still owed.


Task5 session follow-up: preference helper split reduces session to432lines; actual preset session now calls selected-model controller for operator events and frame/headless advances. Canonical debug callback steps actual shared mission; compatibility API retained. Final134headless session/shell/controller/debug checks pass, build/lint0, JS290.9/300kB. Exact RED/GREEN evidence in2026-10-02-phase7-mission-routing. Next hot-stage selection commands, separate body histories and cached binding reattachment, model-aware HUD/controls, two physical rendered bodies/camera and real browser witnesses. No phase gate/main/live change.


Task5 interface checkpoint: actual hot-stage commands/selection, separate per-body recorder/ghost/timeline/watch/endings, seed-preserving restart and shared failures are connected. Menu mission entry, Stage/status/selection and physical booster groups/counts/indicators/full-tank bars are rendered; Ship controls and presets remain.170focused checks plus9timeline-selection checks, build/lint0, JS292.8/300kB, session473lines. Evidence2026-10-03-phase7-mission-interface. Next both actual rendered bodies/camera/catch presentation, editor booster capacity and real browser witnesses; inspect/correct Stage cancelling non-centre engines via RED first. No physics source changed in this checkpoint, no full gate/coverage/main/live approval.
