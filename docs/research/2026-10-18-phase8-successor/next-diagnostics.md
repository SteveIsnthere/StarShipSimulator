# Next bounded implementation and diagnosis

Updated 2026-10-18 UTC. This records reviewed proposals, not implemented fixes
or successful flight/performance evidence. Follow the active GOAL and C1–C3
contracts. Preserve the current uncommitted C1 source/tests and exact result
pins; `0d87c758` does not contain those changes. No new product decision is pending.

## C1/C2 — Two failed descending booster rows

Fresh independent source review: `/root/cpu_source_diagnosis_fresh`.
Current evidence is [the descent result](booster-descent/result.json):

| Row | Actual result | Remaining question |
|---|---|---|
| Super Heavy/before-flip | Crash at 13.875 simulated seconds | Does vertical stopping logic leave inadequate attitude/lateral acquisition time? |
| Super Heavy/reentry | Crash at 350.850 simulated seconds; 35.381 s wall time | Which physical failure occurs, and where does CPU work accumulate? |

Those explanations are hypotheses. Reentry crashing does not by itself prove
thermal impossibility. The original 30 s case contract remains failed even
though synchronous Vitest did not interrupt it.

1. Add an optional test-support observer to the existing `runScenarioMission`,
   after each actual step and before operator handoff. Do not add another flight
   loop, mutate source states, change stepping, or traverse/clone full states
   every tick. Prove unchanged default behavior and read-only observation first.
2. Predeclare one serial selection of only these two rows, with original
   assertions, 900 s / 108,000 ticks, 30 s cases and zero retries. Its purpose is
   explanation; an unchanged failure cannot become an acceptance pass by luck.
3. Retain compact initial/terminal previous-current records; sample at 1 Hz,
   4 Hz below 500 m, and at phase, engine/pending ignition, failure, damage,
   terminal ignition/deadline, fuel and catch-plane transitions. Record actual
   position/velocity/pitch/omega/lug, fuel/support, engine/throttle/gimbal,
   fin/RCS/reserve, planner stage/work, q/g/temperature/material-domain flags.
4. At catch-plane crossings record each actual eligibility clause separately:
   above ground, downward catch-lug crossing, lateral error ≤2.25 m,
   |catch-lug vx|≤1 m/s, -4.5≤catch-lug vy<0 m/s and |pitch|≤5 degrees at
   the interpolated crossing, with every canonical finite clause. Check the
   canonical model, not-already-landed and no crash/breakup/fuel-run-out guards;
   record positive remaining fuel separately as a matrix acceptance requirement. Use actual
   lug velocities rather than body-center speed. Retain nearest approach. Encode NaN/Infinity explicitly rather than JSON null.
5. Capture in-worker `node:inspector` sampling profiles for the same execution,
   with traces/profiles flushed in `finally`. Preserve timeout failures. Inspect
   burn/ISA, allocation, damage/support, attitude/grid-root, forecast cloning
   and observer/serialization stacks before selecting a production edit.
6. Never spy on or wrap canonical thrust/flow/area helpers for this measurement:
   that changes prepared-path admission. Mass/ISA preparation remains held
   until complete ownership or literal generic fallback and ≤1 ULP proof exist.

After the measurement, record hypothesis, source change and result by name.
After three failed diagnoses, obtain fresh independent high review before
another cycle. Full golden replay/audit, units, coverage, mutations and coherent
Fidelity acceptance remain open. No golden fixture has been regenerated here.

## C1 — Booster orbital feasibility before full controller

Use the [held design](orbital-targeting-design.md), independently reviewed by
`/root/successor_source_admission` and `/root/orbital_horizon_review`.
The approved horizon is already frozen; do not rederive it from a successful
flight or ask the resolved duration decision again.

Review one witness from the original 150 km booster state, live coast and a
model-derived opportunity, with one nominal 150 m/s candidate. Record actual
paid wait/attitude/ignition/burn/coast/terminal work and completion before future
ignition/cutoff, realized impulse, RCS, fuel, thermal/domain/loss state and genuine
fine catch. A second paid ignition-time proposal may follow measured response.
Keep four shared advances per scheduler call, original trial/publication limits,
4,000 advances / 900 s per rollout and all authority/health/catch limits.
Do not teleport coast, enlarge caps, add TPS/reserves, copy Ship's fitted
841,800 m range or publish an unpowered scalar as cutoff authority. Hold the
complete production orbital controller until feasibility is demonstrated.

## C3 — Catch optical setup and developed exhaust

Fresh independent design/image review: `/root/plans_goal_review`.
[Optical attempt](optical/README.md): five body-presence/absence cases pass;
catch hits the original 60 s setup limit, and teardown also times out. No catch
PNG/state/after-runtime receipt exists. This is separate from frame acceptance.

Static source inspection shows `debug.step(1)` uses canonical stepping without
per-tick rendering, while `debug.telemetry()` recursively flattens planner and
future trees on every tick. RAF is blocked inside the synchronous evaluation.
The telemetry traversal is a removable source cost, not an exclusively measured
cause of the timeout.

1. Add a debug-only `flightProgress()` snapshot containing landed, crashed,
   inFlightBreakUp, altitude and speedY. Read the current selected live loop on
   every call; do not cache state or alter mechanics/RNG/observations.
2. First prove values agree with full telemetry, state/counters are unchanged,
   replaced/selected states are followed and unrelated nested getters are not
   traversed. The full telemetry negative control should traverse them.
3. Prove old/new loops stop on the identical first terminal tick with identical
   final state/counters/observer sequence, including first-tick terminal and
   nonterminal cap cases. Keep step(1), predicate order, 108,000 cap and final
   full telemetry. No new batch mechanics are needed.
4. Obtain independent high review, build and focused checks, then retry only the
   changed catch optical case at the original 60 s limits, one worker and zero
   retries. Retain raw output, exact source/build and renderer metadata. Do not
   repeat all passing optical cases just to reproduce their output.
5. Separately capture developed exhaust through actual resume/RAF advancement,
   observing real simulation/world frames, then pause. Do not advance visual dt
   without physics. Keep shared performance setup unchanged initially. Current
   paused captures have zero particles and cannot accept plume appearance.

R3 still requires scale/sun/reference comparisons, separate staging-body and
plasma/glow controls, natural damage and recognizable inherited motion,
full/reduced/phone behavior and original CPU/GPU/frame/cadence budgets.
