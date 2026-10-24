# Modernization — current handover

Updated 2026-10-18 UTC (2026-10-17 Vancouver). Read
[GOAL](modernization-GOAL.md) first. Execute the
[completion plan](modernization-completion-plan.md); the detailed model and
render contracts remain in [Phase 8](modernization-phase-8.md).

## What is shipped

Eight of ten phases are merged, including 6b. This is 80% by phase count.

| Phase | Merge record |
|---|---|
| 1 Green gate/cut-over | `f14aadb` |
| 2 Truth harness | `53e3c26` |
| 3 Design pass | `53e3c26` |
| 4 React shell | `dfab3c8` |
| 5 Real-physics guidance | `b84b746`, Linux fixture correction `3429ea1` |
| 6 Ship realism | `080f108` |
| 6b Approved broadside fallback | `c2ae5e4` |
| 7 Super Heavy | runtime `17657d1`, verified harness `b3263a9` |
| 8 V3/damage/visuals | open, unmerged |
| 9 UX | open; implementation plan not yet written |

Players on main have the React simulator, deterministic Ship physics,
33-engine Super Heavy, physical hot staging/two-body selection and tower catch.
Phase 6b's parked body/fin/RCS/Earth-rate models remain named in the backlog.
Phase 8's V3/damage implementation is not deployed.

## Current checkout and recovery gap

The fresh cloud was prepared from stable main `e8a06ff`. Startup reconciliation
and the actual Chromium functional check passed. The existing isolated checkout
was inspected clean and switched to `audit/remaining-work` at fetched visual
HEAD `cd0118c0d9aeefdf2729581b9168caabb6eb75af`; no worktree was created.
The requested `dd72908e9e5e277f63af27fbdb64d560bc9af355` is an ancestor.
The reviewed documentation audit was committed/pushed as `8126077a` on
`audit/remaining-work`. Current branch `claude/visuals` was fast-forwarded to
that checkpoint before the bounded successor edits; no reset/rebase/worktree.
The remaining-work audit itself ran no implementation acceptance workload.
The reviewed source/evidence/plans checkpoint was committed and pushed on
`claude/visuals` as `a41df348`. Documentation checkpoint `0d87c758` records that pin and raw-log whitespace.
The constructor Refactor/proof is committed as `f76d740c`; the reviewed debug
progress/catch checkpoint is `bd018042`. The C1 horizon/matrix/descending-mode
source and new diagnostic are preserved with this handover as explicitly
unfinished WIP, with source-pinned results. Full Fidelity/matrix acceptance is
open; inspect actual HEAD/diff and preserve any newer dirty work. No Phase 8
merge or deployment has occurred.
Source changes and their actual checks are recorded below.

V22's retained manifest has 803 paths: 726 exact matches, 52 changed and
25 absent at the pre-change audit. Exact historical V22 matrix bytes, lint
wrapper, one production instrumentation module and recent result/review bundles
remain unavailable. The reconstructed 18-row successor is now present with its
own source pins; it does not recover those historical bytes or results. [Source audit](../../research/2026-10-18-modernization-remaining-audit/source-audit.json)
lists every mismatch. Different bytes do not prove a defect; they prevent
assigning the previous working state's results to this source.

Original pause/Recovery08 patch digests match, but their source states are
historical and partially already committed. Do not apply them. A bounded
exact-content search hashed 19,717 tracked research/design files plus 338
bounded gzip contents and found none of the 77 missing later digests. No
external/embedded-copy absence is inferred. C0 selected a fresh successor from
committed `8126077a`, independently reviewed at high depth. The pre-change
803-path manifest remains explicitly historical; changed input/result hashes
are recorded separately. No patch was applied or historical acceptance inherited.
See the [successor checkpoint](../../research/2026-10-18-phase8-successor/README.md).

Current production checkpoint is `df16fb2c59cf69883cf1440d90795b135dfc2a40`
on `claude/visuals`, after terminal coallocation `3fa8c522` and C1 WIP
`d30d23f9`. The [early-acquisition packet](../../research/2026-10-18-phase8-successor/early-acquisition/README.md)
preserves the reviewed nominal design and recorded 3 s constraints. Acquisition
source and its RED boundary test are not implemented. Next write that boundary
witness, implement only supported paid acquisition, then obtain independent
HIGH source/readiness review before one changed before-flip test. Keep one
arrival clock, real central cohorts and orientation-gated ignition; no free
coast authority or deadline reset. Reentry/orbital range remains separate.

## Acceptance state

| Area | Last recorded state | Current interpretation |
|---|---|---|
| RTLS scheduling feasibility | Completed bounded task; paid receipts and default-catch evidence retained in research | Preserve; do not restart this task |
| V3/damage source | Catalogue, propulsion, thermal/material/control/mass/detachment/debris and shared rendering exist | Whole R1/R2/R3 acceptance open |
| Lint/build | Latest bounded root-kernel build passes 299.6/300 kB; scoped lint 0. Earlier terminal build passes 299.2 kB. Retained 300.4 kB and removed esbuild 308.2 kB trials fail | Current bounded patch only; full lint/gate open |
| Scenario matrix | New 30-test successor includes all 18 ID/model rows; horizon 4/4, model proof/existing 53/53, mocked clock/contact 4/4 | Ship/landing-burn, Super Heavy/landing-burn and Super Heavy/intro pass across separate selections. Super Heavy/before-flip and reentry fail; other 13 rows unrun |
| Descending booster mode | Auto-land now starts coast when descending unless explicit boostback is requested; existing phases/ascending initialization preserved | 25/25 direct/boundary checks and changed genuine catch pass; full golden replay/audit and whole Fidelity acceptance open |
| Projection allocation | Six render sites use factory-owned output; focused 5/5 and expanded 85/85 pass, independent high code review | One C3 allocation debt addressed; no optical/frame/gate acceptance |
| Gate | Conversation records 2,737 pass/12 fail/one skip, stopped in units | Raw custody absent; complete gate/coverage not green |
| Goldens | Full ten-fixture Linux Node 22 recording preserved; replay timed out on separation | Recording is not replay acceptance; do not regenerate to pass |
| Truth | Fresh initializer before/after reports are byte-identical: 25/26, all Tier A IN; Tier B max-Q altitude 9,528 m OUT | Current bounded source evidence; retain rows and the existing data limitation |
| Damage demonstration | Selected CPU/browser natural-loss assertions reported passing | Narrow evidence; recent bundles absent, full integration/visual acceptance open |
| Body-presence optics | Fresh Chromium attempt: launch, staging, belly flop, entry and landing pass presence/absence checks; catch setup times out at 60 s, with teardown timeout too | Original epoch 5/6 only. Later reviewed progress getter records the changed catch assertion pass in 18.5 s, saved shell 0 but conflicting outer tool 1; actual SwiftShader retained. No single current-source six-scene, plume/reference/motion or frame acceptance |
| Frame budgets | Latest documented seven-case desktop diagnostic failed; no actionable source path in trace diagnosis | No performance acceptance; no unchanged trace retry/speculative edit |
| Full browser/mutations/review | Historical focused results exist | Current whole-phase release checks remain open |
| Main/CI/deploy | API observed main/last successful Pages `e8a06ff`; last three CI success/success/failure | Final phase integration and three-green condition unmet |

The prior 840-second stable-main cloud gate in bootstrap preparation is
historical timing, not a measurement of this current instance. The goal still
requires a complete gate within 300 seconds. Software-rendered/viewport results
must state actual environment; they do not establish hardware-GPU or handset
performance. Steve explicitly moved acceptance to cloud with thresholds intact.

## Mission ruling — resolved duration decision

All nine scenario IDs × both vehicles remain required. Deorbit starts about
20,015 km from Starbase at 150 km; 900 seconds at orbital speed spans about
7,036 km. Current Ship return geometry/controller and Super Heavy tower-catch
policy do not support the literal former duration contract. Steve answered on
2026-10-18 UTC: “Keep starts and targets; approve a physically derived orbital
mission horizon.” Independent review has since frozen the test-only failure
deadline at `Tground + TKepler + 900 s`, currently 11,381.230608843909 s /
1,365,748 ticks. Four structural checks pass; actual controller success and paid
phase witnesses remain open. The 900-second non-orbital cap, test timeout,
physical/control limits, starts and targets remain binding. No off-site target, missing row or weaker outcome is
approved. Current booster orbital-return support still needs implementation
and physical acceptance; a duration ruling alone does not establish it.

## Immediate next actions

1. Preserve the C0 reviewed successor/source-result checkpoint. Exact latest
   recovery remains unknown; do not reapply historical patches or inherit results.
2. C1 (next): design/review earlier lateral acquisition and model-correct
   reentry/orbital targeting. Terminal coallocation is implemented and reviewed:
   71 focused checks across selections, identical truth, build/scoped lint pass.
   One changed before-flip row still impacts at 16.658 s, but catch-plane pitch/
   downspeed now pass; lateral error −129.26 m and speed +11.84 m/s reject contact.
   Both Super Heavy landing-burn and intro regression catches pass. Separate
   built-render smoke passes 2/2 with actual SwiftShader metadata and unchanged
   shader tokens. [Bounded evidence](../../research/2026-10-18-phase8-successor/terminal-coallocation/README.md).
   No whole Fidelity, matrix, frame or release acceptance follows. The one declared
   [physical/CPU diagnostic](../../research/2026-10-18-phase8-successor/descending-diagnosis/README.md)
   reproduced both impacts; no thermal-domain loss or pre-impact detachment.
   Reentry impacts approximately 716 km short. Do not repeat this capture unchanged. Preserve the failures and source pins
   in [descent evidence](../../research/2026-10-18-phase8-successor/booster-descent/README.md). The reviewed test-only deadline is
   `Tground + TKepler + 900 = 11,381.230608843909 s` / 1,365,748 ticks at the
   unchanged 150 km start and zero frame rotation. It applies only to four orbital
   rows; actual paid preparation/burn/transit still need witnesses. The new
   18-row source shares one charged loop. Two landing-burn rows now pass; other
   outcomes remain open. Booster orbital targeting remains held until its range
   proposal and actual paid validation fit original limits; Ship's 841,800 m entry
   constant and unpowered approximation cannot supply cutoff authority.
   [Current result scopes](../../research/2026-10-18-phase8-successor/README.md).
   Use the [bounded diagnostic handoff](../../research/2026-10-18-phase8-successor/next-diagnostics.md)
   for the remaining source-matched orbital feasibility witness. The observer/
   profile is implemented and consumed; do not repeat it unchanged to seek a pass.
3. C2: close physics/damage, CPU timeouts, golden replay, coverage and mutations.
4. C3: the lightweight live getter and changed catch assertions now pass their
   bounded checks; preserve the outer tool exit conflict and exact scope in
   [progress evidence](../../research/2026-10-18-phase8-successor/progress/README.md).
   Next develop exhaust captures through actual RAF/physics advancement, then
   finish V3 reference/motion verification and measured full/reduced budgets.
5. C4: whole-phase independent review, ordered release gate, main/CI/Pages/live
   verification; then close Phase 8.
6. C5/C6: plan and implement complete Phase 9, publish motion review and finish
   every GOAL criterion on final main/live.

Keyboard/gamepad/rebinding, guided onboarding/objectives/toasts, debrief grade
and previous-attempt comparison remain substantive Phase 9 work. Black Box
already has channels, cursor, previous-flight overlay and CSV; preserve them.
Include HUD/slider follow, phone obstruction/clock/card placement, hosted menu
flakes, accessibility/focus and assigned audio/tilt work. No unphased expansion.

The independently reviewed [scoped root-kernel Refactor](../../research/2026-10-18-phase8-successor/root-reuse/README.md)
now passes 43 focused tests across selections, build 299.6 kB/scoped lint and
identical truth. One changed reentry diagnostic retains the entire recorded
trace byte-for-byte and the same crash. Reduced kernel work is proved;
23.015 s versus prior instrumented 23.429 s does not establish a wall-time cure.
Broad CPU, matrix, golden, coverage, gate and release acceptance stay open.

## Evidence and preservation

- [Remaining-work audit](../../research/2026-10-18-modernization-remaining-audit/README.md)
  and [GitHub observations](../../research/2026-10-18-modernization-remaining-audit/remote-status.json).
- [Exact previous planning texts](../../research/2026-10-18-modernization-remaining-audit/plans-before-update/manifest.json),
  with original hashes. Old next actions and consumed packets remain history.
- [V3 evidence index](../../research/2026-10-03-vehicle-realism/README.md)
  for sources, model assumptions and historical recovery lineage.
- [Phase 7 closure](../../research/2026-10-03-phase7-close.md)
  remains completed evidence, not a task to repeat.

Global skills/docs-maid access and external review authentication remain
unverified/unavailable. Steve authorized best practices for missing guidance;
independent high review remains required. Do not claim any unavailable tool ran.
Source/result records support the bounded allocation and C1 checks described
above and the five body-presence optical cases only. Full matrix, golden
replay, gate, coverage, reference/motion optics, frame, phase integration, main
and deployment acceptance remain open; no final release is claimed. This
documentation pass runs no new flight or acceptance campaign.
