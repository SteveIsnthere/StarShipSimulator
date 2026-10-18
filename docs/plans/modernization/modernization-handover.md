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
Subsequent source changes and their actual checks are recorded below.

V22's retained manifest has 803 paths: 726 exact matches, 52 changed and
25 absent. The newer 18-row scenario matrix, lint wrapper, one production
instrumentation module and recent result/review bundles are missing from this
checkout. [Source audit](../../research/2026-10-18-modernization-remaining-audit/source-audit.json)
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

## Acceptance state

| Area | Last recorded state | Current interpretation |
|---|---|---|
| RTLS scheduling feasibility | Completed bounded task; paid receipts and default-catch evidence retained in research | Preserve; do not restart this task |
| V3/damage source | Catalogue, propulsion, thermal/material/control/mass/detachment/debris and shared rendering exist | Whole R1/R2/R3 acceptance open |
| Lint/build | Successor baseline and changed builds exit 0; changed JS 299.8/300 kB; scoped lint exit 0 | Current bounded patch only; full lint/gate open |
| Scenario matrix | Historical V21 20/30, ten failures; newer matrix absent | Duration ruling resolved; all 18 reconstructed rows and actual acceptance open |
| Projection allocation | Six render sites use factory-owned output; focused 5/5 and expanded 85/85 pass, independent high code review | One C3 allocation debt addressed; no optical/frame/gate acceptance |
| Gate | Conversation records 2,737 pass/12 fail/one skip, stopped in units | Raw custody absent; complete gate/coverage not green |
| Goldens | Full ten-fixture Linux Node 22 recording preserved; replay timed out on separation | Recording is not replay acceptance; do not regenerate to pass |
| Truth | Reported 25/26, all 17 Tier A IN; Tier B max-Q altitude 9,528 m OUT | Preserve rows/data limitation; refresh only for actual source changes/required acceptance |
| Damage demonstration | Selected CPU/browser natural-loss assertions reported passing | Narrow evidence; recent bundles absent, full integration/visual acceptance open |
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
mission horizon.” Derive/review the orbital bound before flight trials; the
900-second non-orbital cap, test timeout, physical/control limits, starts and
targets remain binding. No off-site target, missing row or weaker outcome is
approved. Current booster orbital-return support still needs implementation
and physical acceptance; a duration ruling alone does not establish it.

## Immediate next actions

1. Preserve the C0 reviewed successor/source-result checkpoint. Exact latest
   recovery remains unknown; do not reapply historical patches or inherit results.
2. C1 (next): validate the pre-flight orbital-horizon derivation, then reconstruct
   all 18 meaningful ID/model sequences. The conditional proposal is
   `2T + 900 = 11,381.230608843909 s` at the unchanged 150 km start;
   `ceil(H / DT) = 1,365,748` ticks. It applies only to circularize/deorbit ×
   both models. Paid attitude, first firing opportunity, finite burn and transit
   bounds still require witnesses; no new flight has run. Ship-specific deorbit
   assumptions and absent booster orbital routing require reviewed model-aware
   behavior. See the [ruling/review](../../research/2026-10-18-phase8-successor/mission-ruling.md).
3. C2: close physics/damage, CPU timeouts, golden replay, coverage and mutations.
4. C3: finish V3 reference/motion verification and measured full/reduced budgets.
5. C4: whole-phase independent review, ordered release gate, main/CI/Pages/live
   verification; then close Phase 8.
6. C5/C6: plan and implement complete Phase 9, publish motion review and finish
   every GOAL criterion on final main/live.

Keyboard/gamepad/rebinding, guided onboarding/objectives/toasts, debrief grade
and previous-attempt comparison remain substantive Phase 9 work. Black Box
already has channels, cursor, previous-flight overlay and CSV; preserve them.
Include HUD/slider follow, phone obstruction/clock/card placement, hosted menu
flakes, accessibility/focus and assigned audio/tilt work. No unphased expansion.

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
The source/result records accept only the bounded projection allocation change
and its focused checks. Full gate, coverage, optics, frame, phase integration,
main and deployment acceptance remain open; no final release is claimed.
