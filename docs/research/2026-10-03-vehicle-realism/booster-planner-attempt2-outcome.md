# Diagnosis cycle attempt2: failed publication, feasible physical catch

2026-10-03. One frozen actual seed123 production receipt followed by lead-authorized exact read-only replays of the two already evaluated fine candidates. No source changes followed the live failure; source hash check remains exact. Raw files: `booster-planner-attempt2-live.ts.txt/.jsonl`, `booster-planner-attempt2-fine-replay.ts.txt/.jsonl`, `/tmp/booster-planner-attempt2-live.txt`, `/tmp/booster-planner-attempt2-fine-replay.txt`.

**Actual future-plan acceptance remains RED.** The same unmodified live source predicts13g terminal at53.758333s; no future plan publishes. Focused60 tests, typecheck and targeted lint pass. These do not establish release acceptance.

| Event | Live seconds | Duration seconds | Range metres | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Initial full coarse | 10.358333 | 24.225000 | −553.275782 | First actual ready endpoint |
| Lower paid hint score | 10.941667 | 24.175000 | H=1186.906218 | Force-only sensitivity, not endpoint authority |
| Upper paid hint score | 10.966667 | 24.275000 | H=−599.623214 | H′=−17865.294319m/s |
| Selected full coarse | 16.416667 | 24.200000 | −465.118715 | Hint biased; actual residual still negative |
| Actual secant full coarse | 22.425000 | 24.075000 | +128.950773 | First actual sign bracket; fine begins here |
| Next actual interior full coarse | 33.441667 | 24.108333 | −47.509137 | Fine begins only.3s before cutoff33.741667 |

The first fine trial24.075s reaches the lug plane in2005steps/16.703981interpolated forecast seconds. It misses all four unchanged contact bounds: x78.370529m, lateral speed−10.522023m/s, downspeed−88.867667m/s, pitch−2.313608rad. Body angular speed+.832360rad/s demonstrates actual unstable terminal attitude. It has99725.097336kgfuel and no global fault/terminal at that crossing; this is a physical contact/control miss, not a domain or fuel result.

The later24.108333s trial **actually catches** in2490fine steps/20.75forecast seconds, fuel89228.019878kg, secured lugx+.004045717m, pitch.000010783rad, no failure/terminal. Coarse residuals and clocks match production exactly. Its proof finishes approximately live40.358333s, after cutoff33.741667s; late rejection is correct. The replay proves candidate feasibility but does not rescue the live deadline.

The measured force-only sensitivity is overthree times the first fully paid secant response magnitude: actual ΔR/Δd between24.225 and24.2 is~−3526.28m/s. Anchoring cancels a constant offset, not the strong duration dependence of paid entry/rotation/control. The approximate zero never became physical bracket/cutoff authority. This failure must not be patched with a residual threshold or calibrated hint gain.

Whole returned hint-score frames took2.541334 and2.168083ms, including source advancement and charged mechanics; these are conservative upper bounds for the force-only calls. A normal build overlapped execution, so this is not an idle timing benchmark or proof of a1ms sim-step budget. The approved hard bound is only two existing4000-step calls/job. Resumable use of that same force-predictor implementation needs independent performance/work accounting before claiming the spike is acceptable.

## Read-only third-proposal accounting

Lead suggests a simpler generic policy before considering inverse quadratic interpolation: after the first genuine sign bracket exists, evaluate a strictly interior executable root proposal before spending fine proof on the just-completed bracket endpoint. Here that removes the doomed2005-step fine trial and produces the already encountered, physically catching interior24.108333s. This is a bracketed-root ordering rule, not a threshold fitted to this outcome. Preserve behavior for unbracketed supported endpoints and exhausted executable brackets; fine actual capture remains mandatory.

Without other savings: current33.441667fine start−2005/360+2490/360 gives **34.788889s** publication, still1.047222s/~377advances late for33.741667cutoff.

A bounded rolling last8 distinct steady-prefix cache alongside sparse checkpoints can preserve the exact earlier source-local endpoints already paid during first/shorter/longer branches. Compute admissibility by142startup ticks+6nsteady ticks, not absolute duration modulo6. At most8 distinct steady snapshots; merge by the actual common paid source/lattice, keeping highest8 rather than discarding longer valid checkpoints when a shorter trial finishes. Source/model/control/RNG/material/cadence equality and older-frame immutability still require tests.

| Existing evaluation | Existing reused steady index | Closest exact retained index | Additional saved advances |
| --- | ---: | ---: | ---: |
| Lower24.175hint | 256 | 459 | 203 |
| Upper24.275hint | 459 | 460 | 1 |
| Full24.2 | 459 | 460 | 1 |
| Full24.075 | 256 | 457 | 201 |
| Full24.108333 | 457 | 458 | 1 |
| Total | | | **407** |

All five extra checkpoints existed in the first paid boost's last8 window453–460 or subsequent common extensions; no new physics advance is needed to create their physical history. Partial live tails remain separately charged. This count is derived from frozen prefix metadata/cadence and result.steps, not a new physical candidate trial.

Projected publication34.788889−407/360 =**33.658333s**, giving only **.083333s/~30advances** before the existing33.741667deadline. Discrete unused slots, source job scheduling and force-predictor resumption can erase that small margin. Therefore this is a credible but **marginal** third-approach candidate; do not claim a guaranteed timely plan. Any resumable score delay must be included explicitly before freezing an executable thirdattempt. No thirdfix/live run has occurred.

## Attempt3 preparation, source still frozen

Fresh independent review conditionally approves the generic one-shot first genuine sign-bracket interior priority plus rolling8 exact source-common steady cache. It additionally requires restoring immediate fine priority for a supported unbracketed endpoint before hint exploration, preserving the RTLS contract. No preset-specific branch, fitted residual threshold or IQI is necessary. New synthetic contract tests are prepared in `booster-bracket-priority.test.ts`; they have not run while the parent's full unit session holds production/check execution frozen. Core source remains unchanged. After release, isolate shared force-call cost and interpret the existing median-batch step/per-call fall timing contracts accurately before adding resumable scheduling that could erase the30-advance projected margin.
