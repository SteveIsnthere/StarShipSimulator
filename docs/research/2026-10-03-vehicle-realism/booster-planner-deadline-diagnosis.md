# Booster-separation planner deadline diagnosis — 2026-10-03

One bounded corrected reproduction of the existing seed123 failure; production code/tests unchanged. The diagnostic uses the exact preset, physical120Hz mechanics, calculator-only four forecast advances per live tick, sixteen-trial ceiling, and current .90H grid station. Stop: first live terminal, first published plan, or60s. The baseline intentionally excludes the observer to isolate the preexisting search failure; it cannot grant production cutoff authority.

## Finding

The search discovers a valid signed high endpoint early, then wastes its remaining cutoff slack on far shorter capped forecasts. Its first nominally supported candidate enters fine validation only after its cutoff deadline. There is no completed fine-validation rejection in this corrected trace: the live body reaches the retained13g terminal while that validation is still running. This demonstrates a search liveness failure; it does not establish that the seed123 trajectory has no physically catchable candidate.

## Causal candidate record

| Live completion s | Burn s | Cutoff s | Slack s | Range residual m | Forecast status |
|---:|---:|---:|---:|---:|---|
| 7.766667 | 24.225000 | 33.858333 | 26.091667 | -553.276 | valid handoff; unsupported terminal hint |
| 13.400000 | 12.116667 | 21.750000 | 8.350000 | 196291.433 | 4000-step cap; no handoff |
| 18.583333 | 18.175000 | 27.808333 | 9.225000 | 100867.845 | 4000-step cap; no handoff |
| 23.766667 | 21.208333 | 30.841667 | 7.075000 | 50613.703 | 4000-step cap; no handoff |
| 28.950000 | 22.716667 | 32.350000 | 3.400000 | 24616.796 | 4000-step cap; no handoff |
| 33.591667 | 23.475000 | 33.108333 | -0.483333 | 9908.126 | valid handoff; unsupported terminal hint |
| 38.183333 | 24.191667 | 33.825000 | -4.358333 | -416.301 | valid handoff; unsupported terminal hint |
| 42.775000 | 24.166667 | 33.800000 | -8.975000 | -269.832 | valid handoff; unsupported terminal hint |
| 47.358333 | 24.125000 | 33.758333 | -13.600000 | -140.929 | valid handoff; unsupported terminal hint |
| 51.941667 | 24.083333 | 33.716667 | -18.225000 | 84.993 | supported: fine validation starts |

The first high endpoint completes at7.766667s with26.091667s of cutoff slack. The next four forecasts each consume4000 reported steps without reaching a terminal handoff. Their finite residuals are observations at the step cap, not valid root endpoints. Those four trials cost21.183333s of live planner time despite prefix reuse. At33.591667s, the first positive valid low arrives with its own cutoff already.483333s past. The subsequent root search progresses normally but too late. The first supported24.083333s burn is received at51.941667s; its cutoff33.716667s is already18.225s past. Even a successful later fine replay cannot legally publish that deadline (`acceptBoosterReturnPlan` rejects `shutdownAt<=now`).

The live acceleration terminal is53.758333333330924s, retained fuel67552.24260963257kg, altitude117280.4831175996m, vx−2173.442345851381m/s, vy630.0950814248911m/s. The previous baseline log used the prior grid station and differs by.0313m altitude; time and fuel agree exactly. The observer log independently predicted the same next-step terminal and correctly revoked authority; that is not the cause of this old-four-advance failure.

## Mechanism and bounded next approach

`completeCandidate` stores the first negative valid candidate as `job.high`. `continueSearch` has a special adjacent-tick probe only for a first positive `job.low`; the mirrored first-high case falls through to `(lo+hi)/2`. Here that sends a physically near-root24.225s high all the way to12.116667s. Four subsequent invalid/capped midpoint searches merely climb back toward the known valid neighborhood. No physical limit forces this sampling order.

Recommended minimal algorithm change: symmetrically probe one executable tick below the first valid high, just as the existing first-low path probes one tick above. Use the same-source measured response only to propose a bounded shorter-burn interior point when both negative endpoint samples support that direction; retain the valid sign bracket as authority. Reject duplicate/exterior ticks, retain the16 trials and total four advances including observer, and still require actual fine capture plus a source-matched future cutoff. Do not publish an interpolated root or waive a missed deadline. This is a search proposal improvement, not extra thrust or extra compute.

The existing completed high points24.225s/−553.276m and24.191667s/−416.301m imply a local secant proposal around24.09036s, close to the later supported neighborhood. That is postmortem evidence that a local response is informative, not authorization to hardcode that duration. No adjacent-probe or revised-search flight was run. A next diagnostic should predeclare the symmetric rule, preserve seed123 and all source inputs, log total advances/trials, and record whether fine capture completes before the resulting cutoff. If its candidate fails physical validation, record that failure and reassess rather than increasing deadlines or control authority.

## Harness correction and scientific limits

The first harness incorrectly used the default seed and invoked provenance verification without constructing an observer. That different-seed trace obtained a genuine fine catch for24.291667s and published before cutoff, but its next unobserved verification correctly removed calculator authority. It is not evidence about the seed123 failure. Both the erroneous harness and trace are preserved as `booster-planner-harness-error.ts.txt/jsonl`; do not use them for acceptance. The corrected harness explicitly uses seed123, `runBoosterPolicy`, and stops on publication. This correction changed no production constant and was not a physical parameter search.

This diagnosis leaves seed123 physical feasibility unresolved. A nominal pitch/lateral hint is not an actual catch. Its first selected fine replay is unfinished at the live terminal. Conversely, the absence of a completed fine proof cannot establish physical impossibility. The different-seed result establishes only that the current mechanics can admit a fine catch for another unchanged preset seed.

Artifacts: `booster-planner-causal-trace.ts.txt`, `booster-planner-causal-trace.jsonl`, raw execution `/tmp/booster-planner-causal-trace-corrected.txt`. No test assertions or production files were edited.

## Production hashes at diagnosis completion

- `src/core/control/booster-prediction.ts`: `c54cd62245c6b8aaa07c2d29dd76ce6817a367912699968a169a0fd9df8598aa`
- `src/core/control/booster-forecast.ts`: `67f3a01515b21a3adead7e7247166cd3789c540b8dd5841c9109e13bde00ef25`
- `src/core/autopilot/booster.ts`: `144ce23cc25a9226d26104bddc9f86876099ec35793059bdf721b4debc123113`
- `src/core/control/booster-arrival.ts`: `05c76fa404c450219f20d8c5af816c8837cea8265a44c5b71d21e756bfc386e1`
- `src/core/vehicles/super-heavy.ts`: `ae3e63aac8abcf45418ba048cb2af14c805b3510522514c3aa21b63a6940f7b0`
