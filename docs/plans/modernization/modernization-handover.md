# Modernization — current handover

**Paused by Steve, 2026-10-03.** Current assigned work is closed; implementation resumes only on explicit instruction or the refreshed `/goal`. No autonomous job is being left running. The complete earlier narrative is preserved as [historical evidence](../../research/2026-10-03-vehicle-realism/handover-history.md), not current instructions.

## State and recovery

- Worktree: `/Users/stevewang/dev/StarShipSimulator-realism`; existing branch `claude/visuals`. Runtime baseline32e5bb3. Documentation checkpoint is on this branch; runtime/tests remain deliberately uncommitted pending physics acceptance and coherent Linux goldens.
- Main and last verified live build:e8a06ff. This pause does not merge, deploy, regenerate fixtures or claim a current full gate.
- Eight of ten phases complete by phase count (80%):1–7 including6b. Phase8 integration and all remaining Phase9 scope are open. This is not an effort estimate.
- The [recovery manifest](../../research/2026-10-03-vehicle-realism/pause-recovery.json) and patch preserve all dirty runtime/tests/config files. Existing worktree: verify hashes and continue; **never reapply the patch over it**. Fresh checkout: follow the [recovery instructions](../../research/2026-10-03-vehicle-realism/README.md#recovering-the-uncommitted-implementation).
- Node22 is required by `.nvmrc`. Available local executable: `/Users/stevewang/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node` (22.23.3). Login Node25.8.1 was used for earlier receipts and is not the remaining gate runtime.
- No Jira board. Plans and backlog remain the system of record. Original Pro review is complete; no browser/file-access action is pending from Steve.

## Completed work to preserve

| Work | Evidence and limits |
|---|---|
| Prior phases | Phase6 main080f108,6b fallbackc2ae5e4,7 closuree8a06ff. Do not rerun their completed campaigns or reopen parked aero. |
| V3 physical model | Source-pinned dimensions, capacity, engine profile/counts; shared mass/geometry/control queries;17TierA rows IN. Generic TierB max-Q altitude limitation remains named OUT. |
| Progressive damage | TPS/material/root evolution, actual capability loss, retained mass/COM/inertia, first terminal snapshot and bounded physical debris. Natural cold-origin loss converges at120/240/480Hz below global guards; this is an off-nominal editor witness. |
| Vehicle appearance | Shared component geometry/materials for attached and detached hardware; dead photographic renderer removed. Current material GPU checks10/10 across5profiles. |
| Natural damage presentation | Per-grid absence controls pass5/5browserprofiles without retries. Landscape guard2/2passes;3configured non-landscape skips. Camera follows surviving hull, terminal camera follows debris. |
| HUD/resources |120focused tests pass; first-impact COM-to-hull debrief conversion;50simultaneous breakup/reset cycles preserve node identity and8000particles. Booster HUD fixture4/4passes with unchanged1mm-above-lug meaning. |
| Exact cost work | Material inverse matches original48bisections, dense25tests plus configured benchmarkskip; orbit/angular/Verlet/orbitdemo66/66passes. Held-zero controls, metadata and vector/validation Refactors preserve original same-runtime fall outputs. |
| Seed123 booster | Real catch337.975s,88541.48kgfuel, no faults; cutoff proof publishes33.675s before33.741667s. This does not substitute for default seeds. |

## Open blockers and rejected approaches

**Default RTLS:** unchanged diagnostic shows successful2540-step fine proof completing16.308333s after13.283333s cutoff. No plan publishes; continued boostback exceeds50kPa at21.275s with75.465t retained fuel and healthy cold roots. Zero returned fuel is terminal disposition, not starvation. Cycle2attempt2 replays the first5.033333s candidate exactly and misses all four catch gates. Do not remove its lateral veto or repeat that replay.

**Default booster separation:** crashes341.6s. Its first catch-plane/terminal trace remains a separate declared diagnosis; RTLS evidence does not explain it.

**RTLS proposal review:** unanchored hint-first rejected from existing seed123 data (wrong direction). Exact observer reuse is only conditionally feasible. Existing inputs differ;0.05s steady steps cannot certify120Hz. Integer ledger has5865searchcalls; stage carry alone saves2ticks. Ideal1097exactcredits plus carry could leave4ticks, but metadata equality, force slices, idle transitions and storage costs remain unproved. No production cache was implemented. Read [final ledger](../../research/2026-10-03-vehicle-realism/booster-cycle2-final-readonly-ledger.md).

**Predictor timing:** current retained incidence/vector implementation is numerically proved but capped fall remains2.223620840ms against2ms on Node22; normalfall/burn pass. The subsequent exact thrust-hoisting experiment passes34proofs/lint/tsc but measures2.3216ms, so it is rejected and removed, with source delta/evidence preserved. No lucky rerun or limit change. Geometry memo was rejected before implementation:30°pitch creates lateral lift, so the motion key does not stay constant. ISA shortcut remains unimplemented and unlikely to close the gap alone.

**Integration:** last full unit baseline was39failures/2556passes/1configuredskip on Node25, not a current full pass. Focused cohorts fixed many failures; default booster cases and old golden shapes remain known red. Whole current unit/coverage/gate acceptance is outstanding. `--exclude` did not remove golden files across Vitest projects; use an explicit non-golden file inventory before fixture recording.

## Resume order

1. Read GOAL, Phase8’s next bounded RTLS feasibility task and the indexed receipts. Finish the integer ledger, exact source-input normalization proof and bounded byte/copy estimate before any shared-work implementation. Declare any diagnostic replay first; no new candidate/live flight hidden inside it.
2. Resolve timing using the existing fresh-reviewed performance cycle (attempt1 retained but red; attempt2 rejected; one further attempt remains before another fresh review). Separately diagnose default separation and restore default scenario outcomes within unchanged caps.
3. Node22 build/lint, truth, full non-golden units and coverage; then full unfiltered Linux x86 Node22 golden recording and all-scenario audit. Source, fixtures and audit land together. The recovery patch is not a substitute for that commit.
4. Add actual renderer/filter quality metadata and run full-frame Task6 baseline on an idle machine; restore genuine RTLS catch first. Implement measured reduced graphics if necessary. Keep300warmedframes,16.67/33.33ms,p95 and59/29.5fps, all6scenes and damage onset.
5. Complete Phase8 ordered gate/full5browser/truth/mutation/fresh protected high review, merge/main gate/CI/Pages/exact live assets/smoke, then close Phase8. Write Phase9’s full plan before starting it.

Phase9 retains full UX scope, menu flakes, phone debrief obstruction, clock clipping/trajectory placement, every2021capability, per-id root-file landing/catch audit, motion review page and final last-three-main-CI requirement. The landscape fix is a narrow dependency brought forward, not completion.

## Verification at pause

Final restored implementation: Node22 build exits0,297.4KiB essential JavaScript against300KiB; full lint exits0 with one existing BlackBox hook warning and no errors. Exact incidence/vector/fall proof33/33passes; targeted TypeScript passes. Docs-layout check exits0 with no failures/warnings. The189-file recovery patch passes forward/reverse and exact restored-hash checks. Final review disposition is recorded in the research index. No full gate, current full browser matrix, mutation, fixture recording or deployment was run for this pause; none is claimed green.
