# Proposed single default separation phase CPU profile

Research-only proposal, not yet executed or authorized to run. A concrete driver/launcher must receive fresh independent review and parent exclusive CPU grant. One attempt, no retry, no acceptance or physics change.

Research driver `default-separation-ssr-profile.ts.txt` and launcher `run-default-separation-ssr-profile.sh` are now prepared, not executed. They run source through the locked vite-node SSR CLI, preserving original core functions and paid observer lineage, instead of a native bundle. This standalone SSR process is not identical to Vitest4's three-worker module-runner scheduling, imports or contention and cannot reproduce/qualify the actual30s test timeout. It permits attribution of SSR-transformed dispatch versus repeated force preparation. If exact failing-worker attribution is required, profile the existing named Vitest test under its original configuration as a separately reviewed alternative; do not label standalone SSR results as that worker.

The launcher uses a fresh atomic receipt directory, exact SSR package-bin/export resolution, a temporary source-only driver in the research directory, before/after full working-source/config/tool/harness/witness pins, exit-status preservation and outer125s TERM plus5s kill-after. The driver verifies all existing catch-witness core hashes before stepping, independently compares both original scenario constructions, and compares final/previous physical trees and catch tick exactly with the source-pinned successful physical witness. Equality is a semantic witness only, not a new timing acceptance. Native profiler interval remains1000microseconds; exported16MiB cap and partial-failure receipts remain. Driver monotonic/CPU-profile start-clock compatibility is recorded; incompatible clocks deny phase-specific sample attribution. No runtime/test/config edits, numerical authority change or new profile has run.

The complete nongolden cohort has two unchanged30000ms default-separation timeouts despite successful physical catch diagnostics. Duplicate test execution and fresh shared unit/coverage evidence may reduce gate work, but cannot excuse one named test exceeding its original timeout. Node exposes four available CPUs; installed Vitest run defaults to three workers, so a five-worker oversubscription claim is unsupported. A two-worker experiment is a separate proposal, not part of this profile.

## Exact physical recipe

Use `PRESETS.find(p=>p.id==='booster-sep')`, `createScenarioVehicle(preset)` with omitted default seed, and set only initial `autopilot.autoLandOn=true`. Assert complete initial-tree equality to an independently constructed `ALL_SCENARIOS` recipe with `toggleAutoLand`; assert identical original SUPER_HEAVY model and `DT=1/120`. Invoke the original imported `step(state,DT,{},SUPER_HEAVY)` for at most108000 ticks (900 simulated seconds). Stop immediately at the first landed, crashed or inFlightBreakUp endpoint, retaining the previous raw state and original outcome precedence. No alternate physics driver, manually decomposed step, observed-state replay, altered seed/preset, shortened horizon, forced catch, warmed trajectory, kernel-only surrogate or paid observer replacement.

Retain selected final/previous physical trees with time/tick, lug pose, fuel/RCS, all failures, damage revision and final phase. Planner metadata and full prediction trees are not exported by this driver. Do not clone the entire owned prediction tree per tick. Existing receipt production and exact function/model/dt/input/epoch matching run through unchanged `step`; no wrappers, mocks, passive counters or transformations replace mechanical/force functions. The full source stays unchanged on disk and in memory.

## Profile method and attribution contract

Select a phase CPU profile rather than instrumenting core entry points. After imports and recipe construction, start Node's native Inspector CPU profiler at its ordinary1000microsecond interval immediately before the first physical step. Stop at the original endpoint/horizon. Capture original function/script URLs and sample stacks. Record lightweight external monotonic timestamps around each original step, aggregating consecutive spans and ticks by the actual live phase before the step. A phase-changing step belongs to its pre-step phase; transition-boundary intervals are not separately retained and these spans do not isolate intra-step policy phases. Synchronize those markers to the profiler's timestamp domain using a declared common monotonic origin. If synchronization cannot be verified, report whole-flight stack attribution plus external phase spans without claiming phase-specific sample attribution.

Classify samples by full ancestor stack: `commandGridTorque`/`align` grid queries separately from other live-mechanics and forecast/rollout grid work. Native samples are not exact call counts. Report exclusive samples and inclusive ancestry separately; do not sum nested costs. Account for profiler/harness overhead as diagnostic overhead, never subtract it to claim a passing30s test. No second unprofiled timing run is included.

Source inspection establishes the bounded maximum18 queries in an alignment: one current-delivery query plus two endpoints,14midpoints and one final query. The17 command queries happen only when endpoint torque span exceeds1; zero-span/no-grid/q-zero paths differ. `writeFlightGridForces` redoes speed/q, pitch trig and `evaluateControls`. `writeDamageControls` repeats validity/proof/material/root evaluation per surviving column; `loadedRootAngle` remains command-dependent. A profile must distinguish invariant preparation/material cost from that irreducible command-dependent solve. Static18-query arithmetic is a maximum, not a measured invocation count.

## Bounds and provenance

Use one fresh atomic receipt directory and exact locked Node22/vite-node package-bin resolution. Fail before execution on missing CLI or source/build/harness pins. Full source/config/lock/provider manifest and exact driver/launcher hashes are required before and after. Preserve inherited proxy/CA; no dependency install or browser run. Operation deadline120seconds is a diagnostic termination bound; the existing30second unit acceptance and300second whole-gate bounds remain unchanged. Reserve at most5seconds for bounded profiler stop/receipt cleanup, with an outer owned-process termination bound130seconds. Cap exported CPU profile16MiB; mark partial/truncated failures, preserve primary error and source identity, and forbid automatic retry. Concrete launcher must prove these bounds and preserve exit status before approval.

Current source pins:

| File | SHA256 |
| --- | --- |
| `src/core/autopilot/booster.ts` | `c5a7a17e93999173ca160dc83d26e6f390010332c1b56cd57999bfde4395597d` |
| `src/core/physics/damage-flight.ts` | `727d66df66399eb182f82f1d80a7a4a8c88e62ebc0c934ad52bfe6293303f300` |
| `src/core/physics/damage-controls.ts` | `a623039b9844dc5325aa5d9dd786a096306c79e02d60ad56c9ba58e898248e5e` |
| `src/core/physics/damage-root.ts` | `9ee949e1bc1c6c0f277a1258763c01a6a7149d570da5fac57b903484e601649e` |
| `src/core/physics/damage-material.ts` | `b13040799017fc0bf59fd0309f3ec08766a135d128798f5246a92f342f32de84` |
| `src/core/step.ts` | `d5fb9bb02df532df7afcb2c63219613a363af4999287111863abdee4df789986` |
| `src/core/control/mechanical.ts` | `2b3351540043f038af5a184a88c9cc193b64681f891c4ae1bcb113bfefb09a5f` |
| `src/core/scenarios.ts` | `d88f1d64122134491106fe540aee4152ab15e8c444a6731d0dc0f3adb0a7fd3e` |
| `src/core/state.ts` | `1759e4c7a6581d5fdd8a46409feaf15a4c42db184aaa08537e41ce47885b8f5d` |

## Decision this evidence can support

A meaningful repeated invariant-preparation share may justify proposing a Refactor context private to one synchronous align, with original query operation/order, masks/material checks and mutable scratch ownership proved against source-exact oracles. It does not justify caching loaded angles between commands or ticks, dropping validations, reducing14/40bisections, changing tolerances, fin slew, RCS payment, caps, observer lineage or authority. Absent attributable cost, do not implement a prepared-query optimization merely from call multiplicity. Any implementation requires its own high review and original numerical-domain proof before acceptance.
