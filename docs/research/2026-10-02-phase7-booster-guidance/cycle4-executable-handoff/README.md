# Cycle4 partial implementation — executable impulse and returned handoff

Phase7Task3 remains unfinished; cycle4 is0/3 full attempts. No full preset return was run this checkpoint. The completed fresh cycle3 review and accepted approach are `../cycle3-source-consistency/fresh-review.md` and `cycle4-approach.md`. Main/live and phases7/8/9 remain unchanged.

## Changes and controls

Approved Task3 Fidelity. Five new short command controls first failed: complete returned readiness delivery, arbitrary terminal countdown startup and fractional/exact boost cutoffs(.013,.25,.250001). The initial test build referenced a nonexistent controls property, failed compilation and was corrected before any test ran. All raw failures are retained.

Ready forecasting now observes the complete production policy/actuator return. It no longer skips the first terminal command; initialized/decremented arrival time is retained into fine replay. Actual vehicle/throttle/gimbal/RCS reserve/forces/engine/status/command/deadline/RNG comparisons pass. Terminal and entry startup use1/120 while engines are becoming ready; coarser declared steady/coast steps remain. The terminal arbitrary-countdown witness matches fine readiness state/result/time bit-exactly. Entry equivalence and its budget/event impact still need a focused control.

Boost proposals pay integer live ticks before physical evaluation. The last incomplete coarse interval is paid as actual fine ticks, never a fractional engine impulse. The forecast retains the source-relative clock by identical repeated live additions through alignment/boost. Reused prefixes retain that clock, paid startup ticks and six-tick steady intervals; logical physical accounting/caps remain. Fractional/exact cutoff mechanics and prior bit-exact prefix controls pass.

First candidates and further probes now record executable duration. A bounded immutable attempted-tick list prevents repeated mapped endpoints and authority from interpolation; no new strict interior endpoint means done without consuming a trial. A new endpoint-control pair failed before this correction, then passes. A further RED proved that naïve ceil(duration*120) advances a canonical31/120 duration by an entire extra tick. Canonical division round-trip equality now preserves existing ticks without any numerical tolerance; genuinely later durations still round up. The10000canonical-duration control passes. The original prescribed starts, seeds, physical/catch limits and16trial/4000step/900s/four-advance budgets remain.

## Current verification is red

Final build/lint exit0; truth14/14IN before/after. Final focused suite:86pass/3fail in11files. The failure names are both `booster-planning-latency` original first-source publication controls and `booster-prediction` previous-frame purity/deterministic publication control's publication assertion. Ship step/guidance/RCS preservation, terminal fixture catches, all forecast/cutoff/prefix and endpoint controls pass. This is not phase acceptance.

The final short frozen-live first-source calculator shows:

- Sep ends at the4000logical-step cap before readiness (time317.95s,81ignition draws,13candidate trials, receipt63.7333s). No supported endpoint or accepted cutoff. The fine entry/startup branch introduces paid work/event differences; examine repeated entry/coast/ignition transitions before changing scheduling. Do not increase caps or waive startup consistency.
- RTLS fine terminal validation genuinely catches with88624.62kg and no failures, but only after receipt19.1083s. The accepted future-cutoff publication is correctly rejected as expired. The candidate was not validated until receipt13.7083; fine replay requires2590advances. This is a planning/admission latency regression, not a successful actual return.
- The coast-only deterministic publication sample also misses its existing300scheduler-step expectation. Diagnose its actual work/result before changing anything; do not extend the assertion merely for the new startup cadence.

## Next bounded work

No full flight is admitted. Diagnose the exact entry/coast/readiness event/work ledger and original coast-only sample first. Fix bounded event handling/scheduling and establish real fine support within the existing first-source receipt/work controls. Keep ready/deadline and executable impulse fixes. Do not revert them just to regain stale conditional catches. Saved paid terminal fixtures and reconstructed actual scalar diagnostics remain separate from original full-flight acceptance.

Then recheck all focused controls/Ship bits/truth/build/lint, pin changed source and only then consume a traced changed-source cycle4attempt1. Capture complete immutable actual source/cutoff/preterminal/ready inputs for later diagnosis. No fresh review required yet: the cycle has0/3 full attempts. No full gate/goldens/main merge/deploy or7tick.

## Recovery

Current22source/test/input hashes are `source-sha256.json`; `source.patch` is against1239f43. Forward/index and reverse/worktree checks pass. Never apply over existing dirty files. Runtime/test source remains deliberately uncommitted while the publication tests are red; the docs checkpoint stores the exact recoverable source. Raw logs are unchanged. `first-source-calculation.ts` preserves its original `.superpowers/sdd/modernization-phase-7/` relative execution path; copy there to reproduce with vite-node. No source edits followed these final tests/pins.
