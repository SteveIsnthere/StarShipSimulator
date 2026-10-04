# Cloud modernization resume — 2026-10-04

This is a research checkpoint, not Phase8 acceptance or a release. Main/live remain `e8a06ffe3e0fc5b28f6aad0ad733e6be25917428`; phases1–7 including6b remain complete, Phase8 and9 open. Steve explicitly resumed the goal and subsequently moved remaining acceptance to this cloud environment. All limits, sample counts and review requirements remain unchanged; record the actual backend.

## Current implementation recovery

The latest complete replacement is [checkpoint-recovery-02.json](checkpoint-recovery-02.json) and [checkpoint-recovery-02.patch](checkpoint-recovery-02.patch). It contains209 changed non-documentation paths,1061694bytes, SHA256 `d3b5ca056e93c1a052cb6860329543dd0071ab5d8657cc1549a2ca38a6b43796`, against runtime base `32e5bb386cadee9098d703c67ebdfc9444eb46a6`. It captures the reviewed terminal-grid candidate and current diagnostic tooling, whose broad physical acceptance remains outstanding.

**Existing dirty checkout: verify every manifest file hash and continue; never apply any patch over it.** A mismatch means investigate and preserve subsequent work, not overwrite it. Snapshots are immutable and replacement patches, not a chain. `checkpoint-recovery.patch` and the original2026-10-03 pause patch are historical; never apply them before or after02.

For a genuinely clean recovery checkout, first follow its cloud startup instructions. Verify a clean index/worktree and all non-doc baseline paths against the exact base above; verify patch byte count/digest; run `git apply --check` on02, apply it once, and verify every resulting file SHA/deletion in02's manifest. Stop on any mismatch. Keep documentation from the chosen documentation checkpoint. This does not authorize a new worktree in the current workspace.

[create-recovery-snapshot.py](create-recovery-snapshot.py) preserved the current source without touching the live index or worktree: it constructed a separate clean-base index, captured a replacement patch, checked and applied it once in a second clean-base index, compared trees, and verified every disk hash. Its verification is recovery evidence, not tests or integration.

## Measured results and remaining work

- Reviewed RTLS scheduling implementation physically catches the default preset in its sole cycle2attempt3 flight, publishes before cutoff, and respects four mechanics calls/512hint bound. See `rtls-cycle2-attempt3-*`; subsequent terminal-grid changes need separate regression acceptance.
- Original default separation crashed with finite retained fuel and exhausted RCS. The positive-control shadow ledger supports testing early delivered-grid torque allocation, not a catch claim. The scoped terminal candidate has fresh high review and108 focused passing tests; its sole separately declared source-pinned flight catches337.916667s with91.764486t fuel and8.816620s RCS reserve, no faults. Whole integration acceptance remains open.
- Complete non-golden inventory baseline is243files,2621passes/5failures/1configuredskip. Focused scheduling/schema fixes pass21/21; no current complete integration pass or golden recording is claimed.
- Cloud timing baseline fails normal/capped fall (1.077727/3.891778ms against1/2ms). Profiling and compiler evidence support an exact-output research prototype; no candidate timing acceptance yet.
- First frame baseline failed/incomplete. The one all-thread browser trace succeeds as a diagnostic only: software-GPU work is throttled under the four-core quota. Renderer/context and supported worker configuration investigations remain open. No shader reduction or frame acceptance follows.

Evidence declarations, raw receipts, source pins and independent assessments are adjacent. Failed starts, rejected measurements and original artifacts are retained. Whole gate, coverage, unfiltered Linux goldens/audit, full browser/render/performance acceptance, fresh integration review, main merge and verified live deployment remain outstanding. Phase9 starts with its complete plan after Phase8 release.
