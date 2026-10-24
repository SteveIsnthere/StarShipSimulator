# Remaining modernization work — repository audit

Observed 2026-10-18 UTC (2026-10-17 Vancouver). This is a static audit, not a
release review or a new test result. It follows the current goal, handover,
Phase 8 amendment, research index, source, retained pins and GitHub state.

The subsequent documentation update consolidated the active plans and preserved
their previous exact bytes in [planning history](plans-before-update/manifest.json).
The missing-link counts and document hashes below describe the audit before
that consolidation. Use the [current completion plan](../../plans/modernization/modernization-completion-plan.md)
and [saved goal prompt](../../plans/modernization/modernization-RESUME-PROMPT.md)
to drive the remaining work. No implementation acceptance changed.

## Actual completion

Eight of ten roadmap phases are merged. Phases 8 and 9 remain open. The 80%
figure counts phases; it does not measure remaining engineering effort.
Phase 8 now includes the approved V3 physics and progressive damage amendment,
so it is much larger than the original visual phase. Phase 9 still needs its
concrete implementation plan and substantial product work.

GitHub reports `main` at `e8a06ffe3e0fc5b28f6aad0ad733e6be25917428` and the
latest successful Pages workflow at that same commit. The fetched visual
branch is `cd0118c0d9aeefdf2729581b9168caabb6eb75af`. The originally requested
`dd72908e9e5e277f63af27fbdb64d560bc9af355` is its ancestor. None of Phase 8
is merged into main. The latest three main CI outcomes are success, success,
failure; the final three-green condition is not currently satisfied.
See [remote observations](remote-status.json).

Fresh startup succeeded: the versioned task-start route loaded repository
guidance/four local skills and completed reconciliation, including the actual
Chromium functional page check. Managed Node is 22.23.3 and Chromium is
151.0.7922.34. Startup readiness establishes no application acceptance result.
The user's cloud acceptance instruction remains authoritative; old Mac-only
wording is superseded. Frame and performance thresholds stay unchanged.

## First blocker: the newest working state is not preserved in this checkout

The fetched branch's documents describe later work than its committed source.
Comparison against V22's retained 803-file source manifest finds:

| Result | Paths |
|---|---:|
| Exact SHA-256 match | 726 |
| Present with different bytes | 52 |
| Absent | 25 |

This includes 18 changed production source files and one absent production
source file, `src/app/visual-stage-diagnostics.ts`. The rest includes test,
runner, configuration and diagnostic differences. Some missing diagnostics
are historical; the count is a recovery inventory, not a demand to execute
every diagnostic.

Concrete examples:

- The V22 review pins `tests/flies-every-scenario.test.ts` at 13,541 bytes and
  SHA-256 `ecb37ed056299d07a5edc05b4e9d3fed9345ca8fbb1510849dc3604f731b3959`.
  The fetched source has 8,665 bytes and the older partial scenario assertions.
  It does not contain the documented 18-row matrix or Ship/RTLS correction.
- `package.json` still runs `eslint .`; the later recorded lint wrapper
  `scripts/lint-repo.mjs` is absent. Its reported 718-file lint success cannot
  be assigned to this checkout.
- The default `docs/verification/native-flight-qualification.json` is absent.
  The official test runner therefore selects its ordinary SSR fallback unless
  an explicit valid qualification is supplied. Historical native results do
  not establish eligibility on this machine.
- The linked V21 result/contract reviews, Task 6 trace-accounting report,
  V9 damage-browser bundle and latest full-gate report are absent. Their
  outcomes are described by the documents or previous conversation, but their
  source/result correspondence cannot be rechecked from these files here.
- The four active documents contain 749 occurrences of missing local Markdown
  links. Many point into historical investigations. This is a documentation
  continuity defect, not evidence that each historical task must be repeated.

Both the original pause patch and Recovery08 still match their recorded patch
digests. They describe older states: the original manifest has 167 matching
and 22 different current paths; Recovery08 has 235 matching and 15 different
current paths. Neither is the newest V22 state. No patch was applied. Applying
one now would reintroduce historical code over an implementation already
preserved by later commits.

Next: locate the previous dirty checkout or a newer complete source/evidence
snapshot, inventory it without overwriting anything, and verify the newest
manifest. A hash alone cannot reconstruct absent source bytes. If those bytes
cannot be recovered, record the missing work explicitly and build a reviewed
successor from the preserved source; do not claim exact restoration. No newer
candidate branch appeared in the current GitHub branch listing. The absence
here does not prove every external copy is lost.

[Machine-readable comparisons](source-audit.json) list all 77 nonmatching
source paths and the recovery/document observations.

## Phase 8: implementation exists, acceptance remains open

| Work area | Preserved implementation or recorded progress | Still required |
|---|---|---|
| Visual direction and original Tasks 1–4 | Published concept page; per-engine exhaust/glare, separate surface glow/plasma, coastline/Starbase and lighting code. Plan checks these tasks complete. | Preserve completed work; reconcile later V3 appearance against references and final integrated captures. |
| R1 V3 physics | Live definitions consume V3 propulsion and dimensions: 52 m Ship, 72 m booster, six/33 engines, 1,600/3,650 t capacity and three booster grids. Uncertain dry mass/Isp/stations are labeled. | Restore later scenario harness; complete supported per-ID flights, unit/truth acceptance, full golden replay and coherent physics source/fixture/audit checkpoint. |
| R2 progressive damage | TPS/substrate thermal state, material weakening, reduced control authority, component mass/COM/inertia, support failure, detachment, terminal capture and physical debris exist in source. | Complete integration acceptance: thermal/impact/q transitions, energy/mass accounting, forecasts, independent mission bodies, pause/reset and coverage/mutations. Narrow natural-flight witnesses do not accept the whole model. |
| R3 vehicle and disintegration rendering | Shared component geometry/materials replace the old vehicle rendering; detached pieces and quality policy exist. Latest documents report a natural breakup with seven visible components and moving debris. | Recover that capture/source correspondence; inspect V3 materials/silhouette at 50 px, 200 px and close-up through the sun sweep. Verify six scenes, missing hardware/emission, no intact ghost, both bodies, terrain contact, reset and full/reduced behavior. |
| Task 6 frame budgets | Measurement code and full/reduced policies exist. Earlier measurements failed, and latest diagnosis identifies no actionable source bottleneck. | Establish a falsifiable source hypothesis, then measure actual full-session work/cadence for six scenes plus damage onset across desktop and both phone orientations. At least 300 measured frames, existing controls, p95 16.67/33.33 ms and cadence 59/29.5 fps remain required. |
| Phase release | Focused tests and narrow independent reviews are recorded. | Complete ordered gate, whole five-project browser suite, truth, all mutations with green control, fresh independent whole-phase protected review, reviewed main merge and deployed-build verification. |

The bounded RTLS scheduling-feasibility task is completed and must not be
reopened. It is not the current next task. The implementation includes paid
receipt scheduling; later whole-suite/CPU failures remain separate obligations.

### Scenario contract and flight failures

The latest handover reports V21 at 20/30 passing, 10 failing, with 18 required
scenario × vehicle rows, the same 900-second/108,000-step horizon, 30-second
case timeout, one worker and zero retries. Those result files are absent here,
so this audit preserves the reported failure without claiming a fresh replay.

There is a genuine unresolved mission contract: `deorbit` starts half a lap
from Starbase at 150 km. The source puts that gap at about 20,015 km; orbital
speed covers about 7,036 km in 900 seconds. Ship's existing deorbit controller
waits for return geometry; Super Heavy has no corresponding orbital-return
mode. These facts expose an unsupported start/target/horizon combination;
they are not a new proof of model-wide impossibility. The existing product
question remains pending: which mission behavior should the orbital and
cross-vehicle rows require? Keep every row/start/assertion/budget while that
decision is unresolved. The narrow V22 Ship/RTLS mode correction cannot fix
the broader contract by itself.

### CPU gate and golden acceptance

The previous conversation recorded one full gate stopping in units with
2,737 passes, 12 failures and one skip: ten matrix failures plus two
booster-separation catch/golden timeouts. Its raw output was not retained and
its source differs from this checkout, so those counts are historical
observations, not a reproducible gate receipt. The fetched handover's latest
header predates that run and says the full gate remains outstanding.

Prepared landing-burn/ISA work is a credible historical CPU hotspot, but the
latest independent diagnosis did not establish current-run causation. Do not
optimize that path solely from the headline or increase timeouts. Recover the
retained profiles/results and choose one bounded source-backed diagnosis.

The ten-fixture Linux Node 22 golden recording is preserved with its audit
comment. Recording succeeded historically; replay acceptance still failed
the separation timeout. Do not regenerate fixtures merely to make tests pass.
Full coverage has no current complete passing result at the unchanged floors.
The five-minute cloud gate target is also open: the bootstrap preparation
receipt recorded an 840-second gate even for stable main in its then-current
environment. That is historical timing, not a new benchmark of this instance.

The reported V3 truth result is 25/26, with all 17 Tier A rows IN and the
existing Tier B max-Q altitude OUT at 9,528 m against 10–15 km. Preserve the
named reference-data limitation and every row; do not tune physics or bands
to erase it. This is distinct from the missing all-scenario acceptance.

## Phase 9: concrete product work remains

There is no `modernization-phase-9.md`. Write it after Phase 8 closes. The
roadmap and IA already define the scope; ordinary implementation choices are
authorized.

| Area | Actual preserved source | Remaining work |
|---|---|---|
| Keyboard | Fixed mappings in `src/app/input.ts`, including Control/Backspace. | Modern bindings, persisted rebinding/conflict handling, key legend and equivalent access to every existing command. |
| Gamepad/tilt | No application `getGamepads`/connection handling found; tilt toggle exists. | Gamepad flight/UI ownership and disconnect behavior; iOS permission action. A help claim that gamepad works is not implementation. |
| First flight/objectives | `FirstFlight.tsx` is a static hint dismissed on input. | Guided four-step flight, skip/restart persistence, per-scenario objectives and dismissible start toast. |
| Flight UI | Minimal engine marks/groups and current control sliders exist. | Designed six-engine/booster presentation, autopilot-following throttle/yoke, telemetry-loss states and entry flap pictograms; resolve protected intro mode behavior without changing its sequence. |
| Debrief | Figures and reasons exist; source explicitly defers grading/comparison. | Outcome grade, previous-attempt comparison, advice and obstruction-free actions. |
| Black Box | Channels, shared cursor, ghost overlay, CSV, selected-body histories and lazy plots already exist. | Audit against IA and polish concrete gaps; retain existing functionality. |
| Layout/modal readiness | React surfaces, three layouts and pause-on-layer behavior exist. | Desktop/1024×768/390×844 quality audit, keyboard/focus/accessibility checks, portrait debrief obstruction, short-header clock clipping and trajectory-card placement. Diagnose the two hosted menu flakes without extra retries. |
| Audio/review | Synthesized audio and visual prototype exist. | Assigned RCS sound/audio polish, final motion review publication and actual final-build captures. |

The backlog also assigns interpolation, per-frame allocation issues, heat-post
resize behavior and several visual debts to Phase 8. The preserved source
still shows `worldToScreen()` returning allocated objects on drawing paths.
Audit each assigned debt against the recovered latest source before deciding
whether it remains open; the backlog has not been reconciled after all work.
Unphased features and the explicitly parked Phase 6b physics remain deferred.

## Order to finish

1. Recover/preserve the actual latest source and required evidence. Reconcile
   GOAL, handover and plan into a concise current checkpoint with historical
   detail linked from research. Preserve immutable failure records.
2. Resolve the genuinely missing scenario mission decision, then finish the
   supported 18-row acceptance harness and diagnose remaining real flight/CPU
   failures under the existing three-attempt/fresh-review rule.
3. Finish R1/R2 truth, all-unit, complete coverage, golden replay and mutation
   acceptance with exact source and unchanged floors/limits.
4. Finish reference-based V3/damage rendering and Task 6 budgets. Earlier
   failed traces do not justify another unchanged measurement or speculative
   renderer edit. Cloud results must name the actual backend and machine.
5. Obtain fresh independent whole-phase review; close Phase 8 only after its
   gate, browser, main integration, CI/Pages and final served-build checks.
6. Write and execute Phase 9, verify its UX/input/accessibility/layout scope
   and publish the final motion review. Owner verdict is recorded separately.
7. Finish the complete goal conjunction: all phases checked, green timed gate
   on main, three green main CI runs (or documented billing exception), truth,
   mutations, all scenarios, docs/reference/backlog closure and exact live
   build with smoke. The global docs-maid script is unavailable here; no
   successful execution of it is claimed.

This is more than final cleanup: two engineering phases, substantive flight
and performance blockers, and the release sequence remain. A reliable time
estimate depends first on recovery and the mission contract. No source edit,
physics change, historical patch application, workload retry, merge or
deployment was performed by this audit.
