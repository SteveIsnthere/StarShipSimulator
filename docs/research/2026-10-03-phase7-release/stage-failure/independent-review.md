# Phase 7 permanent centre-engine Stage failure: affected-conclusion review

**Close the original P2 permanent required-centre-engine staging-status finding for the pinned source.** No additional actionable issue found. This continues the independent in-harness fallback round, not a cross-vendor review or whole-release approval.

Reviewed dirty source atop `b5ac99a8cccf5182591dee2aafa868079c4cac47`. Final SHA-256 pins:

| File | SHA-256 |
|---|---|
| src/core/mission.ts | a6cbb167363b89295e05d06dadeac811f13340537374efc95fc027e349496ced |
| tests/core/hot-staging.test.ts | 28f8e0dfb633a10ce9dfb70fed564b9f11dd995a7a2e89bf683633f5e65aa5ae |
| tests/ui/mission-session.test.ts | 590c4fde9b391f4ef00187078b220125cd2c260cd936cecc8a895a7bfa29858e |
| tests/ui/session.test.ts | 025194a371cdeba96c0f0066b2985e7fd627cb909ce3fdd733943f40d36c7a0b |

## Why this closes the finding

Release requires every one of the three centre engines running. A permanently failed required engine cannot satisfy that condition: `commandIgnition` explicitly refuses a failed engine. Previously the mission nevertheless kept `stagingFailed` false forever, so the UI reported Starting engines without a possible release.

The only production change adds the matching permanent-failure condition to the requested-Stage failure latch (`mission.ts:208–210`). It uses `CENTRE_ENGINES` consistently with ignition commands and release readiness. Pending ignition is not failure, and unused-engine faults do not enter this condition. Before a Stage request, the mission remains Attached without a premature Stage-failed report. After a required permanent fault, actual paid attached mechanics continue and no artificial separation is permitted. Repeated Stage input neither retries failed ignition nor adds RNG draws. Restart creates a new healthy mission with a cleared request/failure latch.

I traced the controller, session store and shell. Session synchronization copies the actual mission failure flag (`session.ts:217–219`); `MissionControls.tsx:21` gives Stage failed precedence over Starting engines. The existing disabled/requested button behavior remains appropriate. There is no added physics, clock, callback or model change. The existing Ship-failure rule remains unchanged; this review closes the specifically reproduced booster-centre case rather than expanding the hot-stage protocol.

## Independent evidence

Reran the original reproduction `/tmp/starship-phase7-stage-failure-repro.ts`. After 360 actual fixed ticks with centre engine 0 failed, the corrected mission reports `stagingFailed: true`, remains attached, retains real Ship thrust (`14832820.139095278 N`) and two running healthy centre engines. Output retained at `/tmp/starship-phase7-stage-failure-review-repro.log`.

Independently ran the two affected suites: **25 tests / 2 files passed**, raw `/tmp/starship-phase7-stage-failure-review-tests.log`. Reviewed tests for each required engine 0/1/2: no premature report, immediate report on actual request, input purity, 360 paid attached steps, real upper-stage thrust, exactly two healthy centre ignition-delay draws versus six Ship draws, elapsed clock and rigid gap. Unused failed engines 3/13/32 are negative controls that still reach real separation with all required centres running. The controller test routes a failed Stage and then restarts the actual mission and reaches healthy release. Existing tests retain the pending ignition/readiness and force-based separation behavior.

The subsequent full-session store regression is also inspected and pinned above. Independently ran it by name: **1 passed / 13 skipped** (intentional name filter), raw `/tmp/starship-phase7-stage-failure-review-session.log`. It proves the actual store publishes the failed attached state, real session restart clears it even on a zero-step advance, and subsequent healthy actual Stage releases. This addition changes tests only.

Read lead-run RED: three required-engine status assertions failed with thirteen existing checks passing. Read the first corrected focused log: **76 tests / 8 files passed**, including all ten actual golden replays and continuation checks. The subsequent 77-test full focused rerun was pending when this report was saved; this report independently verifies its newly added case but does not pre-claim that rerun. The log's jsdom canvas-not-implemented message does not provide rendered browser evidence. Lint has zero errors and one existing BlackBox hook warning; truth-after has 14/14 rows IN. Build success is lead-run evidence; I did not run a full gate, coverage or browser suite.

## Disposition

The original five findings now have affected-conclusion closure: UI dismissal, booster plume heading, COM continuation, preference rejection and permanent required-centre Stage failure. These scoped closures do **not** establish a clean overall release: previously red coverage floors and remaining full release checks must still pass, and later source changes require the appropriate follow-up. No repository source was edited by this reviewer.
