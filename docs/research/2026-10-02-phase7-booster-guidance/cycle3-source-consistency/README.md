# Cycle 3: source consistency, paid work and actual near misses

Phase7Task3 remains unfinished. Cycle3 is3/3 full-flight attempts consumed. Phases7,8,9 remain required; main/live site are unchanged. Do not run another unchanged full flight. Fresh independent diagnosis review is required before cycle4 and is dispatched with `review-packet.md`; it is now collected in `fresh-review.md`, with accepted disposition and ordered cycle4 approach in `cycle4-approach.md`.

## Implemented and verified changes

Fidelity under approved Phase7Task3; Ship/control-order proofs remain unchanged. The first-source planner previously copied a frame inside controls, before policy, actuator slew and clock bookkeeping. A complete returned-frame witness failed on both presets. Planning now runs after the same shared mechanical step returns; owned future mechanics remain prediction-free. The existing physical control/actuator/contact order is unchanged.

A paid13-engine startup endpoint also failed comparison with live1/120 cadence: coarse startup reached full running engines later with different fuel/state. Alignment and startup now use live cadence. Common startup and full0.05s steady boost steps reuse exact immutable mechanical prefixes. Fractional cutoff steps never enter the cache. A short candidate cannot borrow a longer prefix. Counters are reconstructed by the same repeated fine/startup and full steady subtractions as uncached work. All-state/result/fuel/RNG/shutdown/cap accounting is bit-exact for the tested sources and fractional durations. Model, source, mechanics, policy, coast and timestep provenance guards remain. Logical physical steps/time include reused work; four actual future advances/live frame remain the budget.

The initial zero trial spent alignment and a coast without offering a future paid cutoff. Original return jobs now start at the existing fuel-bound paid interior; coast diagnostics retain zero. Recent valid same-source responses may propose a secant strictly inside the actual valid sign bracket; all other proposals fall back to the original bracket method. No invalid endpoint, transported derivative or numerical proposal commands engines. The fixed16trial/catch/contact/fuel/engine/actuator/replay/time bounds remain.

The fine cutoff witness failed by exactly one extra live paid step. Controls see the incoming clock after the interval physics has been paid; the accepted forecast names its end. The cutoff check now uses `environmentTime + dt`, matching the fine forecast's time, fuel, speed, RNG and actual engine state in both paid startup controls. No additional impulse is granted.

Coarse terminal screening was already rejected for false positives and false negatives. Every published plan still requires actual fine1/120 catch validation from the immutable paid-ready input, support and a future cutoff. Near balanced error and nominal end pitch only prioritize work; a supported nonzero trial still receives fine validation at the unchanged16trial cap.

## Short verification and numerical caveats

Current source22files are pinned in `attempt3-source-sha256.json`; checked recovery patch `attempt3-source.patch` against08c050d. Forward/index and reverse/worktree checks pass. Never apply over existing changes. Build/lint exit0,81focused checks in11files pass including Ship step/guidance/RCS preservation,14truth rows remain IN before/after. Build287.9kB/300kB. Source bytes still match the pins after the full attempt.

First-source calculator results: Sep receipt29.300000s/cutoff35.976412s, actual fine catch with86200.35kg remaining; RTLS12.983333/13.688234s, fine catch with89789.63kg. Kinematics/fuel freeze after one returned live frame; receipt time and work follow the production scheduler. These are short controls, not successful original full returns.

Steady boost/coast/entry forecasts retain declared coarser timesteps. Full forecast-to-live handoff accuracy is not proved by origin/startup/cutoff or local coast witnesses. One intermediate refinement build failed TypeScript's exact-optional assignment check; its dependent test was mistakenly started before reading that failure. It is retained as diagnostic only, not acceptance. The subsequent corrected build and final81check result are authoritative. Initial scheduling changes caused genuine latency regressions; every RED output is preserved, then exact reuse restored the clock controls. No assertion/budget/retry was weakened.

Raw calculators keep their original relative imports and execution paths. To reproduce an archived `.ts`, copy it to `.superpowers/sdd/modernization-phase-7/` and run from repository root with vite-node. Its explicitly named input logs must exist at the retained original path as well. These copies preserve original bytes rather than rewriting diagnostic provenance.

## Actual attempt 3: not caught

Command: `BOOSTER_TRACE=1 npx vitest run tests/core/booster-guidance.test.ts`. Exit1,2failed catches and2passing engine/RNG controls,4.92s. Original scenario starts/seed/DT/900s harness and every catch/physical/assertion bound stay unchanged. Full traces: `cycle3-attempt3-flight.log`; observed events: `attempt3-event-summary.json`.

|scenario|observed paid-ready x/vx|first plane body x/vx|final ground x|
|---|---|---|---|
|booster-sep|+73.299m/−5.632m/s|−6.597m/−1.347m/s|−10.600m|
|rtls|−7.835m/−0.529m/s|−4.851m/−2.834m/s|−13.462m|

The plane observations carry real fuel (84323kg/88390kg), then later ground crash/fuelRunOut. They are ineligible under the unchanged rotating-lug contact bounds; body x in the table is not itself a substitute for the lug detector. Full raw traces retain actual lug position/velocity, pitch and plane interpolation. Observed ready rows are engine-event frames, not saved exact immutable ready inputs. The source fixes greatly reduce divergence compared with attempt2 but do not establish full catch validity. Do not claim final fuel0 was the initial cause, or model impossibility from these misses.

## Required next step and reviewer availability

Fresh assessment uses the unchanged `review-packet.md` and22-file source pins. Claude's launcher subscription check exits2: “CLI authentication check failed; inspect native login status. No model was started and no credentials were changed by this helper.” Pro fallback cannot reach the logged-in Chrome: connected CUA inventory has only MCP Apps and IAB, no Chrome browser surface. A new in-harness reviewer `booster_cycle3_fresh_review` was dispatched with fresh context and tools. This is the weakest documented fallback, not a cross-vendor review or phase release approval. Review remains pending at this checkpoint; collect and disposition substantive findings before cycle4. Keep the source frozen meanwhile. No new owner question is required under Steve's standing approval.

After the review, record a genuinely new evidence-backed bounded approach, implement short RED→GREEN controls, preserve all limits, recheck timeliness/Ship/truth/build/lint, pin changed source, then use traced full attempts within a new three-attempt cycle. Do not rerun unchanged source for luck. Finish actual booster catches, hot staging and functional two-vehicle UI before phase release; phases8/9 and the complete final gate/live condition remain required. No full gate, golden regeneration, main merge or deploy is claimed.

## Collected review

`fresh-review.md` is the exact independent assessment; `cycle4-approach.md` accepts all three substantive findings and records the bounded new approach. This supersedes pending-review wording above. Source stayed frozen; cycle4 starts0/3 and no full flight is admitted yet.
