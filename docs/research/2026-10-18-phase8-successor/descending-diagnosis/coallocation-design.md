# Bounded terminal coallocation design — next Fidelity correction

Proposal, not implemented or accepted flight. Approved Phase 8 Fidelity scope;
no physics force, authority, reserve, stop or planner-work limit changes.
Fresh independent physical diagnosis identifies an actual uncompensated gimbal
request; preserving rotation does not solve the separate lateral range deficit.

Keep ordinary `alignBooster`/entry/boostback behavior unchanged. Only fully
ignited terminal translation passes its requested gimbal percentage and dt into
the existing attitude allocator, instead of overwriting its result afterward.
Keep the existing incomplete-ignition branch, terminal deadline and manual guards.

Let A be the existing PD attitude torque (including delivered off-axis and drag
compensation), G the actual delivered grid torque, R the available paid RCS
force times its actual moment arm, and B the admitted steerable thrust times
engine arm. R is zero when unavailable/depleted and is bounded by the remaining
reserve's fraction of one step. Requested fin positions never contribute to G.

For each admitted thrust coefficient B, the attitude-supported condition is
|A-G-B*sin(delta)| <= R. Intersect the sine-angle constraints for BOTH lower
and upper coefficient endpoints, then hardware and next-step slew bounds. For
B=0, require |A-G| <= R or mark the proposal infeasible. A maximum coefficient
alone cannot certify nonzero attitude demand at lower thrust. Project the requested translation gimbal into that intersection. When
empty, choose the reachable command that minimizes rotational residual and
mark the scratch proposal infeasible; never call this a feasible catch or
invent countertorque. Preserve actual actuator slew/payment in mechanics.

Use current delivered thrust and conservatively account for the already-running
engine cohort and BOTH next-step throttle bounds, including decreases, so the final centre lighting
cannot be treated as free rotation authority at the old lower delivered thrust.
This is a command proposal, not a guarantee of the next evolving mechanical
interval. Paid replay remains decisive. Fin commands may pursue the attitude
residual, while RCS commands compensate actual delivered grid/gimbal torque.
No extra mechanical forecast or candidate is run.

A small pure scalar allocator with caller-owned scratch may expose feasibility
and residual for unit tests; do not add presentation-only core state. Preserve
sign convention: positive gimbal position supplies positive gimbal torque and
rotates thrust direction below body pitch. Existing engine/model dimensions,
actuator rates and reserves provide all physical quantities; no fitted constant.

Before source correction, freeze a clearly labelled control-boundary fixture
from the recorded saturated interval near 8.092 s. Its compact fields do not
make it an exact historical full state. Demonstrate the current terminal
translation override exceeds actual paid rotational support. Then verify the
projection, positive/negative nonzero attitude demand with unequal coefficient
endpoints (the Bmax-only false-feasibility counterexample), hardware/slew
boundaries, depleted RCS, missing grids, partial ignition and feasible unsaturated cases; paid forces, pose, fuel and RNG must
remain unmodified by command selection. Preserve ordinary alignment commands.

After independent source review, build and focused checks, run one changed
Super Heavy/before-flip row at original limits to inspect rotation and physical
outcome. A remaining range miss is expected evidence of the independent earlier
acquisition gap; keep the landing assertion red until genuine catch works.
Full Fidelity truth/golden/unit/coverage/mutation/integration obligations remain.
