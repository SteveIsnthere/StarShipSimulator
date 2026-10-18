# Descending booster physical/CPU diagnosis — attempt 1

2026-10-18 UTC. One predeclared serial selection of the original two failed
matrix rows; all assertions, 900 s/108,000 ticks, 30 s cases and zero retries
preserved. No physical/controller change in this measurement. Conditional
hooks dynamically load the observer/profiler only for this declared diagnostic;
ordinary matrix runs register no diagnostic hooks. The optional deeply-read-only
observer runs after the charged step and before handoff/terminal break.

Readiness: independent HIGH review by `/root/cpu_source_diagnosis_fresh`;
corrected primitive-branded readonly type after recorded build error. Review
fixes tag opaque operation leaves, classify secured/terminal-reset endpoints as
non-assessable, and protect old receipts with exclusive claims. Final build/lint
exit 0. Five mission sequencing/invariance units and nine diagnostic controls
pass (14/14); after the final classification rename, nine controls pass again.
No exact function identity is serialized; numeric/state data and opaque leaves
are explicitly distinguished. No helper spies or new production counters.

Measured failures (raw output/exit/results and full traces/profiles retained):

| Row | Outcome | Pre-reset fuel | Interpretation |
|---|---|---|---|
| Super Heavy/before-flip | Impact at 13.875 s, 1,665 ticks; case 883 ms | 18,473.047 kg | Missed catch and lost attitude, not fuel exhaustion |
| Super Heavy/reentry | Impact at 350.850 s, 42,102 ticks; case 23,429 ms | 281.250 kg | Approximately 716 km short; a failed range/control policy |

Both retain valid hull domains and all components attached immediately before
impact. Terminal reason is Impact=1. Reentry peaks 1,437.926 K / 34.418 kPa /
8.439 g, under existing stops. The prior uninstrumented reentry case took
35.381 s; this observed run is faster despite diagnostic overhead. There was
no performance correction, so do not attribute the difference or call the CPU
requirement fixed. Both flights still fail their original landing assertions.
Final zero fuel/velocity/RCS are crash resets; use retained terminal/previous data.

Before-flip enters terminal at 6.925 s, height 464.31 m, about 133 m short and
moving away at 9.55 m/s. Once all centres run, saturated translation gimbal
requests more rotational torque than delivered grids and paid RCS can counter;
its catch-plane crossing rejects lateral position/speed, downward speed and
absolute pitch. Reentry's initial coast consumes atmospheric range; its later
entry burns never recover the approximately 716 km deficit. These are this
policy's failures, not proof every admissible trajectory is impossible.

Sampling identifies production grid-root/control calculations as a stronger
CPU hypothesis than ISA. Reentry self interval weights: loadedRootAngle 3.941 s,
rootLoadCoefficient 2.241 s, writeDamageControls 2.491 s; source-tree equality
1.835 s and ISA 0.263 s. These are statistical profile weights, not exact CPU
attribution. Profiles include observer/assertion/serialization/GC overhead.
[Derived ancestry summary](profile-summary.json) retains raw profile frame paths.

Next supported physical correction: torque-feasible terminal coallocation,
with a clearly labelled recorded-constraint fixture and failing boundary test,
then one changed before-flip row. Earlier lateral acquisition is independently
required; a torque fix alone cannot promise catch. New coast authority needs
source-matched future-switch paid validation under existing work/trial/deadline
limits. Reentry range and orbital feasibility remain separate design work.

Next CPU candidate is held pending concrete proof/review: call-local reuse of
only the pure root-solving kernel after each original validation/material/getter
prefix, exact complete scalar keys and literal generic/mock fallback. No direct
exported-helper cache, weaker source comparison or ISA preparation is authorized
by these profiles. No numerical iteration/tolerance or physics limit changed.

No matrix, full golden, coverage, mutation, gate, frame, phase or release pass.
[Input/result hashes](result.json) preserve the exact 797-file capture basis;
unchanged passing checks are not scheduled for repetition.
