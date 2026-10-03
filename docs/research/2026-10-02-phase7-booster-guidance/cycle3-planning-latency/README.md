# Cycle 3: timely planning and live alignment

Phase 7 Task 3 remains unfinished. Phases 8 and 9 remain required. Main and the live site are unchanged. Cycle 3 has consumed two of three full-flight attempts; one remains. No owner question is pending.

## What changed

The first-source planner now proposes an interior from the initial unpowered range, actual full13-engine acceleration and fall time, bounded by the existing fuel interval. A valid low endpoint tries the adjacent maximum ignition delay before spending a wide probe. Two valid same-source responses may propose an interior; neither a response derivative nor an invalid forecast is bracket or cutoff authority.

The planner reuses only the identical alignment prefix. Its immutable source pointer, mechanics callback, policy, model, coast angle and timestep must match. Fuel, RNG, actuator state, logical step count and elapsed forecast time are preserved. The cache saves actual repeat computation; it does not erase steps from the4000-step/900s physical replay caps or grant extra work. Both scenarios, three fractional paid durations, immutable previous state and six context changes have bit-exact/provenance controls. There is one retained alignment endpoint, not an unbounded state cache.

Numerical terminal screening at0.05s produced false negatives and false positives relative to1/120s. The raw candidate calculations retain both. One coarse catch failed fine acceptance; another coarse position miss was a genuine fine catch. Screening is removed from runtime. Fine replay always starts from the immutable original paid-ready input. Nominal final pitch and the existing catch half-width of the balanced target prioritize work; these are scheduling hints, not new catch limits. A supported nonzero candidate outside that numerical neighbourhood still receives fine validation at the unchanged16trial cap, explicitly tested with100m balanced error. Zero residual is not required. No hint publishes a plan.

## Attempt 2: failed full returns

Command: `BOOSTER_TRACE=1 npx vitest run tests/core/booster-guidance.test.ts`. Exit1: two failed catches and two passing engine/RNG controls. Source:22files in `attempt2-source-sha256.json`, patch against9c9949a; forward/index and reverse/worktree checks pass. Build/lint and68focused checks were green,14truth rows IN, before this changed-source attempt. All original starts, seed, timestep,900s cap, physical guards and assertions were preserved. Full raw event traces are `cycle3-attempt2-flight.log`; concise observed events are `attempt2-event-summary.json`.

| scenario | publication | commanded cutoff | final x | outcome |
|---|---:|---:|---:|---|
| booster-sep |35.016667s|36.115493s|−851.911368m|ground crash/fuelRunOut|
| rtls |12.958333s|13.818121s|+105.472014m|ground crash/fuelRunOut|

The timer defect is resolved at this source: both full flights really publish a future plan. Their paid-ready state is wrong, so their terminal-only fine catches do not prove the full flight. Predicted handoff x was+61.066m and+6.033m. First observed three-engine terminal readiness was near−1408.588m and−307.956m. The latter trace rows are observations at recorded engine events, not an exact independently saved ready-state fixture. First plane crossing is ineligible: Sep x near−958.4m/vx34.86m/s, RTLS x5.35m/vx33.03m/s. Final fuel0 includes the later ground/crash consequence; do not infer the initial cause from it alone.

## Alignment cadence regression and correction

A bounded alignment-only witness compares the default paid forecast endpoint with the shared mechanical callback at live1/120 cadence, from each immutable first source. It fails first: Sep forecast alignment9.600000s versus live9.508333s; RTLS8.050000s versus7.950000s. The state comparison also fails. The coarse forecaster delayed ignition by roughly0.1s while its absolute cutoff was applied by the live flight. This is an established upstream inconsistency, not a catch tolerance defect. It is not yet proved the sole full-flight cause.

Alignment now uses the live1/120 cadence, while retaining owned state, shared integrator and all budgets. Identical alignment state/time/step-count controls now pass. The cached prefix saves repeat fine alignment work. Other forecast phases retain their existing step policy. Paid boost startup, cutoff quantization, entry/coast and full return agreement have not been accepted.

Current first-source timing controls at this changed source: Sep physical fine catch receipt32.533333s, paid duration26.507436s, positive remaining fuel86619.15kg; RTLS receipt13.341667s, duration5.765621s, remaining fuel89935.78kg. Both decisions are source-matched and still future. These tests freeze actual flight kinematics/fuel after one live frame, advance receipt time and limit work to four shared future advances/frame; they are calculator controls, not additional full flights.

Current build/lint exit0;70focused tests in11files pass, including Ship step/guidance and RCS preservation proofs. Truth before/after remains14/14IN. Current build287.5kB/300kB; exact budget is in `cycle3-live-alignment-build.log`. No full unit gate, golden regeneration, main merge or deploy is claimed.

Current22-file source/test/input snapshot is `live-alignment-source-sha256.json` and `live-alignment-source.patch` against9c9949a, with forward/index and reverse/worktree checks. Never apply either patch over existing work. The attempt2 snapshot remains historical and differs from the current alignment source. Existing input JSON files are starting states, not re-blessed trajectory goldens.

## Next bounded task

Before spending attempt3, establish short paid ignition/cutoff cadence and source-consistent handoff controls. Isolate the first divergence with the actual shared mechanics; preserve the existing4000/900 caps, four-advance budget,16trials, actual fuel/engine/RNG/actuator physics and unchanged catch bounds. Any change needs appropriate RED→GREEN controls, timely decisions for both original first sources, build/lint/truth/Ship preservation and new pins before the next actual full flight. Every full command includes `BOOSTER_TRACE=1`; no unchanged reruns. After three failed full diagnoses, obtain the standing fresh independent review and record a new bounded approach. No physical impossibility or fallback is established for Super Heavy.
