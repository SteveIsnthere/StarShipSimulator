# V3 vehicle realism — evidence index, 2026-10-03

The [latest cloud qualification checkpoint](../2026-10-06-native-unit-cost-renewal-source-plan/current-cloud-qualification-checkpoint.md) adds accepted bounded proof-reader and graphics-data checks. It leaves Phase 8/9, the complete gate, rendering and release open; private proof preservation remains unfinished.

Current execution instructions live in [GOAL](../../plans/modernization/modernization-GOAL.md), [Phase8](../../plans/modernization/modernization-phase-8.md) and the [handover](../../plans/modernization/modernization-handover.md). Steve explicitly cleared the pause and moved acceptance to the cloud. Current replacement recovery and fresh measured outcomes are in the [cloud-resume index](../2026-10-04-cloud-resume/README.md). The original pause recovery below is historical; never apply it to the current dirty checkout or chain it with later snapshots. Historical “pending” statements do not override the current GOAL/handover.

| Area | Read first | Establishes |
|---|---|---|
| Sources and model | [V3 source audit](v3-source-audit.md), [progressive model](../../reference/progressive-damage.md) | Published hardware vs declared assumptions |
| External review | [Pro review](pro-review.md), [V3 follow-up](pro-v3-review.md) | Conditional design findings, not release approval |
| Material/HUD | [independent audit](material-hud-independent-audit.md), [inverse](material-inverse-refactor.md) | Exact inverse, first-impact velocity and fixture decisions |
| Force epoch | [review](paid-force-epoch-review.md) | Original paid interval vs retained endpoint authority |
| Damage exposure | [natural browser audit](natural-browser-audit.md), hold-refinement declaration/outcome | Physical loss, convergence and per-component visible absence |
| Completed seed123 | [attempt3 outcome](booster-planner-attempt3-outcome.md), `booster-planner-attempt3-continuation.jsonl` | Timely proof and actual catch, not default acceptance |
| Default RTLS | [attempt1](booster-cycle2-attempt1-outcome.md), [attempt2](booster-cycle2-attempt2-outcome.md) | Deadline failure and rejected first-candidate replay |
| Rejected proposals | [hint-first review](booster-cycle2-attempt3-independent-review.md), [reuse review](booster-cycle2-paid-observer-independent-review.md) | Wrong-direction hint and unproved cache feasibility |
| Next feasibility | [final read-only ledger](booster-cycle2-final-readonly-ledger.md) |5865paidcalls, carry/reuse hypothesis and strict limits |
| Predictor cost | [held-control Refactor](held-zero-control-refactor.md), [second cycle](fall-performance-cycle2.md) | Exact outputs; current2mscap remains red |
| Browser cost | [probe implementation](visual-budget-implementation.md) | Harness implemented; no measured full-scene pass |
| History | [implementation ledger](implementation-history.md), [handover history](handover-history.md) | Superseded chronology retained for diagnosis |

Raw `.txt`, `.json`, `.jsonl`, frozen source harness snapshots and browser images beside these summaries are evidence. Failed receipts stay available. Never rerun an old harness merely because it exists: obey the current bounded diagnosis task and recording platform.

## Recovering the uncommitted implementation

`pause-recovery.patch` is a source/tests/config checkpoint relative to runtime base32e5bb386cadee9098d703c67ebdfc9444eb46a6. `pause-recovery.json` records its SHA256 and every included path’s expected SHA256 (or deletion). It is evidence stored in Git, not applied production source, a golden rebaseline or a release claim.

On the existing dirty worktree, compare the manifest and continue without applying it. On a fresh checkout of this documentation checkpoint, confirm the implementation paths match the recorded base, run `git apply --check docs/research/2026-10-03-vehicle-realism/pause-recovery.patch`, apply once, then verify all manifest hashes. Never apply over dirty files or use reset/checkout to force it. A mismatch requires inspection, not overwrite. Forward application in a clean base and reverse-check on the original worktree are required checkpoint checks.

The branch keeps the runtime dirty until truth and all other units pass and the full Linux x86 Node22 golden set is recorded. Only then commit source, fixtures and the trajectory audit coherently. All current documentation/research is committed separately so the pause can be recovered from another machine.

## Frozen diagnostic scripts

Historical one-off harnesses are stored as `.ts.txt`/`.mjs.txt` source receipts. Their bytes are unchanged; [snapshot inventory](harness-snapshots.json) maps original filenames andSHA256 to each stored receipt. Some are incomplete tails appended to a specific frozen bundle, so treating them as maintained executable modules was incorrect. Restore only an explicitly declared diagnostic in an isolated location with its pinned source; do not execute every receipt or add these files to the gate. Project source/tests and ESLint policy are unchanged.

## Pause verification

- Node22 final [build](v3-pause-build.txt): exit0,297.4KiB essential JS against300KiB.
- Full [lint](v3-pause-lint-final.txt): exit0, no errors; one existing BlackBox hook dependency warning remains. The [first lint failure](v3-pause-lint.txt) identifies frozen diagnostic sources subsequently preserved as textual evidence.
- Restored exact fall/vector/incidence proof:33/33; targeted TypeScript/ESLint pass, recorded in `fall-thrust-rejected-checks.json` and `fall-thrust-rejected-proof.txt`.
- [Docs-layout check](v3-pause-docs-check.txt): exit0, zero failures/warnings. Canonical plan/handover/index relative links resolve.
- No current full gate, coverage, full browser suite, mutation, golden recording, merge or deployment. Known physical/timing failures remain explicit.

The [fresh fallback plan review](pause-plan-review.md) resolved both findings and independently checked the recovery manifest against every dirty implementation path. This approves the pause documentation, not the runtime release.
