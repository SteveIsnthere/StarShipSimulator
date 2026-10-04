# Read-only unit/gate cost assessment

2026-10-04. Research only; no new test, profile, flight, build, runtime or configuration change was executed for this assessment. Parent owns the current complete nongolden cohort and CPU lane. The unchanged whole-gate ceiling is 300 seconds. This document proposes work for fresh review; it does not authorize implementation or claim timing acceptance.

## Existing evidence and its limits

`non-golden-first-output.txt` records 214 files, 2506 passes, five failures and one skip, 288.10 seconds wall time. Summed test time was 681.18 seconds, import 81.28, transform 6.46 and environment 10.36; these overlapping worker costs must not be added to wall time. The separate 29-file kit cohort passed 115 tests in 13.57 seconds. These sequential split receipts total 301.67 seconds before lint, build, coverage or browsers. They are a diagnosis baseline, not a current complete-gate receipt. Current terminal-grid source and corrected scheduler assertions require the parent's fresh complete cohort.

The two old default-separation executions consumed 33.378 seconds in `booster-guidance.test.ts` and 33.718 seconds in `flies-every-scenario.test.ts`. The new actual separation catch is at 337.9167 seconds rather than the old crash around 341.65: only about 1.09% fewer live ticks. Powered terminal grid allocation adds bounded grid queries during roughly 2500 terminal ticks; therefore a passing catch alone implies no speed improvement. The managed CPU quota is four cores (`cpu.max`: `400000 100000`). Worker-parallel CPU savings do not directly establish whole-gate wall savings.

The parent's current 244-file cohort subsequently finished in 283.36 seconds: 2631 passes, two failures, one skip (2634 named tests). Both failures are unchanged 30000 ms test timeouts for default separation, 35.089 seconds in the scenario contract and 33.973 seconds in guidance. There is no reported physical-assertion failure; both named RTLS cases passed. Summed tests were 695.03 seconds, imports 86.51 and environments 31.48. Receipts are in `non-golden-terminal-grid/`; this is not a full golden-inclusive unit/coverage/gate acceptance run.

### Actual worker default, not a quota assumption

A lightweight current-environment query returned Node v22.23.3, `os.availableParallelism() = 4`, `os.cpus().length = 5`, cpuset `0-4`, and four-core CPU quota. Installed Vitest's `resolveMaxWorkers` uses `availableParallelism()` when present, then subtracts one for run mode: the unchanged Linux unit default is **three**, not five workers. Same-order project specs share the group with that worker limit; they do not silently add independent unit and kit limits. Installed implementation SHA256: `a236001d048380e2c67d05423fc9ea3f26b07ee019ba8d6e622082f29d49102e` (`node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js`). This static/runtime environment read did not run tests or resolve their configuration via a new test invocation.

There is no evidence-backed oversubscription bug to fix by merely capping the default at four. An explicit two-worker test run could reduce per-test contention, but may worsen total wall time; only an approved source-pinned measurement could establish the tradeoff. It must preserve the original 30-second timeout and whole-gate 300-second ceiling. Repeating unchanged acceptance with different luck is not justified.

## Source-exact duplicate flight pair

For each of `booster-sep` and `rtls`, these two existing tests request the same physical run:

| Input | Guidance contract | Scenario contract | Source proof |
| --- | --- | --- | --- |
| Preset | `PRESETS.find(id)` | `ALL_SCENARIOS.find(id)` | `ALL_SCENARIOS` spreads `PRESETS`; same objects |
| State/model | `createScenarioVehicle(preset)` | Same call | Omitted seed reaches `createInitialState(seed = DEFAULT_SEED)`; same `SUPER_HEAVY` definition |
| Enable auto-land | Assign `true` | `toggleAutoLand` | Initial `autoLandOn` is false; toggle only negates that field |
| dt | Local `1/120` | Imported app `DT` | App exports exactly `1/120` |
| Horizon | `i < 900 / DT` | `i < Math.round(900 / DT)` | Both 108000 iterations |
| Inputs | Fresh `{}` each tick | Fresh `{}` each tick | No command/event inputs injected |
| Stop | First landed/crashed/breakup | First landed, then crashed, then breakup | Same first endpoint; scenario outcome label keeps its priority |

Guidance additionally owns the previous raw state, records trace/event observations, recursively checks finite values and checks a cloned held step. Scenario tests retain their outcome, seconds and touchdown assertions. These assertions and their original named registrations must all remain. Separate failed-engine seeded flights and independent determinism tests are not duplicates and must remain independent.

A concrete candidate would co-locate these four named contract registrations with a single invocation-scoped runner per exact run recipe. Before sharing any result, independently construct and compare the two complete initial trees and model identity, dt, input recipe, horizon and stop semantics; mismatch must decline reuse. Capture the previous state and trace/event observations during that real run, then provide owned immutable snapshots to each contract. Preserve `BOOSTER_TRACE` and `BOOSTER_EVENT_INPUTS` behavior and outcome/seconds labeling. No durable cache, fixture substitution, borrowed golden, cross-run cache, seed change, shorter horizon or reduced assertions. A helper imported by two isolated Vitest files alone does not remove duplicate execution. Moving registrations needs an exact before/after named-test inventory and proof/mutation mapping. This is a proposed implementation requiring independent review, not approval.

## Fresh shared unit/coverage proof candidate

Current gate independently invokes unit and coverage over substantially overlapping domains. A fresh complete V8-instrumented unit invocation could provide both proofs, followed by fresh threshold validation, while retaining separate unit-failure and coverage-floor receipts. Reviewer consultation supports the principle, subject to concrete implementation review:

- Run all original unit and kit named tests, forcibly complete despite `coverageExclusions`; do not reseal changed trees to hide tests.
- Retain the original unit 30000 ms timeout for unit acceptance. The current standalone coverage command's 120000 ms override cannot silently replace it.
- Build before the instrumented unit invocation. Pin exact source/build/config/lockfile/provider, declared complete file and named-test inventory, fresh run identifier, report digests and command order.
- Clean or use a fresh run-specific report directory before execution. Missing, partial, stale, mismatched or failed reports deny threshold-validation reuse. A passing test report with a threshold failure is a unit pass and coverage failure, never a false complete pass.
- Preserve every current aggregate/per-module floor and full source include domain. Standalone coverage remains a complete independent command. No cached result accepted merely because timestamps or source hashes match.

The gate still needs meaningful ordered lint/build/unit/coverage/smoke/subpath stage evidence and independent review of any orchestration change. This candidate could remove duplicate paid unit execution; it cannot yet prove the 300-second gate or justify altered budgets, exclusions or assertions. V8 overhead and worker scheduling must be measured once under a declared source-pinned trial after approval. Existing Linux coverage configuration caps workers at two; adopting that instrumentation path may lengthen the critical path.

## Production cost candidates, without physical changes

The terminal fix's grid target uses the original 14 bisection iterations. An active powered alignment can perform up to 18 grid-force queries: current delivered grid, two endpoints, fourteen midpoints and final command. `writeFlightGridForces` repeatedly computes airspeed/q, pitch trigonometry, material/control compliance and root loading before per-column lift/drag/COM torque. Within one synchronous alignment, physical state/material/COM/airspeed stay fixed and only the query command changes. A narrowly scoped prepared-query context could retain those exact invariants for that single call, while evaluating command-dependent loaded-root forces exactly as before. This needs profile evidence and independent old/new query oracles across q, heating, damage masks, angles and mutable scratch ownership before implementation; no cross-tick memo, reduced iterations, altered force law, actuator slew or RCS charge is justified.

The existing `loadedRootAngle` optimization certifies the original forty-bisection cell and falls back to the original algorithm. Its tolerances/iteration cap cannot be reduced for speed. Existing fall profile attribution shows `fallAcceleration` as the large inclusive/self cost, but that profile includes imports/JIT/multiple workloads and predates terminal allocation. ISA removal alone cannot close the measured fall budget gap, and inclusive costs overlap. Whole-process GC attribution is not evidence that receipt cloning is the bottleneck.

Paid observer `returned`/`expected` clones and exact provenance remain required. Sharing mutable observer aliases or dropping post-plan verification would weaken accepted ownership, event/RNG/material/model matching and is not a legitimate optimization. Receipt storage is already immutable and bounded. Any new production optimization must preserve full original work/physics caps and pass source-exact oracles rather than weakening acceptance.

## Source pins for this assessment

```text
a5eaca6986392da131d45c5c646204c2a58a2e9b1dc16af8a934175b9e2196f5 package.json
4debcf42809334dfc4fefcc4f8d7274fbdcfdc429d7fc99b06310eea588061b0 vitest.config.ts
e3cdb55da04d0a6b7cc68adb17d8de062093a1c71f165907ed199f646f40ebad scripts/coverage-exclusions.mjs
ad948c60d31abd37794cc09c4ef378928efbf36c35f7a33d251c170a3afd9ca9 tests/flies-every-scenario.test.ts
3c33d75d067ffc72eddcfee3281f148407ba81f814c2fb7da279860ad09327b7 tests/core/booster-guidance.test.ts
d88f1d64122134491106fe540aee4152ab15e8c444a6731d0dc0f3adb0a7fd3e src/core/scenarios.ts
51a362d3051620da175320041e782d313e4b6f1d965aaec600508cc77ae62c66 src/app/loop.ts
9079a0297811e2fd3288ffe5515b0675ada126b467de68cf0538371c26603e40 src/core/control/commands.ts
1759e4c7a6581d5fdd8a46409feaf15a4c42db184aaa08537e41ce47885b8f5d src/core/state.ts
c5a7a17e93999173ca160dc83d26e6f390010332c1b56cd57999bfde4395597d src/core/autopilot/booster.ts
```
