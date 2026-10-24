# Early paid acquisition — proposal before implementation

2026-10-18 UTC. Approved Phase 8 Fidelity scope. This is an unimplemented
proposal, not catch acceptance. It follows the independently reviewed
[terminal result](../terminal-coallocation/README.md), which removed the tumble
but retained a 129 m lateral miss. Reentry and orbital range remain separate.

The next witness uses the retained before-flip sample at 3 s. It is a compact
recorded constraint, not a new flight or exact recovered full state. Show that
vertical stopping alone leaves coast unchanged while ignition/rotation lead
erodes the lateral terminal envelope. Include an aligned in-envelope control
and depleted RCS, failed centre/support and zero-dt boundaries. Keep every
actual physical limit; a command proposal is not delivered force or a catch.

## Feedback policy and unchanged work

Add a local acquisition phase before terminal. The shared mechanical forecast
executes the same feedback law; no new forecast/candidate or mechanical advance.
No boostback-style 13-engine ignition, free coast attitude, force-only cutoff
authority, scenario ID branch, fitted altitude or enlarged work budget.

The trigger compares the cubic lateral demand against the torque-supported
upright terminal envelope, using existing central-engine thrust, actual mass,
grid torque, available RCS and gimbal bounds. Allow for physical preparation:
worst current central ignition delay, throttle/gimbal slew and rotation from
current pitch/angular velocity. Preparation is a nominal scheduling estimate, not a future mechanical proof.
Ignition gated on orientation must account for that dependency; a maximum of
rotation and ignition durations alone cannot be called conservative. A future coast-switch plan would still
need its own source-matched paid proof before that switch.

For an explicit rotation estimate, use actual RCS torque divided by retained
inertia: first stop current angular velocity, then the resulting angle with a
rest-to-rest bounded torque maneuver. Account for finite reserve; no unavailable
RCS can supply that maneuver. Aerodynamic/engine assistance is credited only
when actually delivered. Review this estimate and its unsupported domain before
it controls a trigger; do not call it an exact optimal maneuver.

On acquisition entry, establish one fixed absolute arrival deadline from the
existing model-derived vertical arrival envelope. All alignment, ignition and
cohort changes consume it. Never recreate it each tick or reset it at terminal
handoff. Existing 900 s/108,000 steps and 30 s cases remain unchanged.

Use the existing force-request and actual hardware alignment. Let the hull
approach the required force direction within the original 0.3 rad proposal cone,
then permit physical ignition only when delivered direction and rotational
support admit it. This is not instantaneous rotation or target torque credit.
Actual engine ignition, throttle/gimbal/fin slew, fuel and RCS payment remain
in mechanics. Realized flight is decisive.

## Reviewed central-cohort design boundaries

Three V3 centres at minimum throttle can already exceed the acceleration
needed by an early, long landing profile at this low mass. Lighting all three
early could arrest above the target and recreate deadline failure. Do not
increase the pitch cone, lower minimum throttle or reset the clock to hide it.

Independent HIGH review supports nested cohorts `[0]`, `[0,1]`, `[0,1,2]`.
Keep a running cohort when the request remains between its actual minimum and
maximum throttle and rotational support remains admissible; upgrade to the
smallest healthy supporting cohort without shutting down its running prefix.
The two-engine cohort is asymmetric: include its actual mount torque, individual
pending ignition and actual payment. Downshift only when minimum thrust makes
the current cohort unsupported and the smaller cohort supplies the request.
Once terminal handoff becomes admissible, request the missing centres with paid
ignition lead even if a smaller cohort still supplies instantaneous force.

Choose the single initial deadline to admit the THREE-centre terminal floor
as well as ceiling. For positive height `h` above upright catch centre, downward
speed `d`, final speed −2 m/s and time T:

`a_end(T) = 6h/T² − (2d+8)/T`.

Conservatively bound final net acceleration by
`a_min = F3_min_sealevel / retainedDryMass − g_catch` and
`a_max = F3_max_sealevel / currentRetainedMass − g_catch`.
For a positive acceleration bound `a`, its crossing time is
`T(a) = 12h / (sqrt((2d+8)² + 24ah) + 2d+8)`.
Intersect `[T(a_max), T(a_min)]` with existing `[0.5,60]` seconds and select the
existing balanced time clipped into that interval. Decline the new mode when
the interval/domain is unsupported; existing vertical emergency braking still
executes. Never widen a floor/ceiling to manufacture an intersection. Check
both endpoint vector/torque requests, not this vertical scalar alone.

Hand off to the existing upright terminal policy only when all three centres
are actually running, both endpoint force demands fit minimum AND maximum
thrust and torque/attitude preparation is supported before the remaining
deadline. Pass the remaining time, retaining existing deadline
expiry/shutdown behavior. A transient nominal feasibility estimate cannot claim
contact; all original catch clauses still judge the flight.

## Readiness and bounded next measurement

First review the exact trigger, cohort/payment and handoff design. Then capture
RED boundary witnesses, implement the smallest supported policy, build, focused
checks and independent HIGH source review. Only then declare one changed
before-flip invocation at original limits, retaining failures and exact source
pins. No unchanged torque flight or historical harness is to be rerun.
Full Fidelity truth/golden/unit/coverage/mutation and all C1 acceptance stay open.

This local mode must also decline a nominal acquisition whose endpoint vectors
lie outside the preserved 0.3 rad proposal cone or three-centre maximum force.
It is not an atmospheric/orbital range controller and cannot claim to recover a
716 km miss by requesting saturated terminal commands at high altitude.

## Concrete implementation contract for review

Reuse `boosterArrivalTime` as the single remaining clock rather than adding a
second resettable timer. Coast initializes it to the admitted duration only on
the transition into acquisition. Acquisition and terminal each call the existing
arrival evaluator once per actual interval, so every preparation/ignition tick
consumes it. Handoff never initializes a fresh duration. Zero time declares the
existing irreversible terminal miss and shutdown.

Compute an RCS-only preparation estimate from retained inertia and the actual
RCS moment arm: `alpha = RCSmax * abs(arm) / inertia`,
`t_stop = abs(omega)/alpha`,
`theta_stop = wrap(pitch + omega*t_stop/2)`,
`t_attitude = t_stop + 2*sqrt(abs(theta_stop)/alpha)`.
Require enough remaining RCS duration for this nominal full-authority maneuver.
Account for the ordering of actual preparation: ignition is gated on an
admissible delivered orientation, so its delay follows the part of rotation
needed to meet that gate. Throttle and gimbal slew may overlap only where the
physical actuation actually permits it. A maximum of all durations is merely
a nominal overlap estimate and cannot establish conservative feasibility.
Unsupported estimates decline the new mode and never postpone the existing
vertical stopping trigger. Test the gated-ignition boundary explicitly.

For trigger classification only, project current position at current velocity
over that preparation duration, subtract it from the nominal arrival duration,
and form the remaining cubic endpoint demands. This frozen-velocity estimate
is not a paid prediction or a catch proof. At assumed upright terminal pose,
engine lateral force times its actual COM arm must fit available RCS torque;
also retain gimbal and three-centre thrust minimum/maximum constraints. A failed
classification requests earlier acquisition only when the full-duration local
acquisition proposal itself fits the original cone/capacity domain.

Use the existing steady force-request evaluator for the acquisition proposal,
with an explicit prospective central mask for capacity only. Its alternate
attitude queries use the existing shared force law, not a teleported body.
This is necessary because measured aero at the current broadside attitude is
not the aero after rotation. Keep the ordinary force-request path exact in arithmetic, call order and
40% throttle floor, with a preserved-implementation numerical witness. No
unlit engine supplies delivered force.

For three healthy identical centres, the physical cohort intervals overlap:
`[0.4,1]E union [0.8,2]E union [1.2,3]E = [0.4,3]E`. A proposal-only inversion
may represent that union using maximum `3E` and equivalent floor `40/3%`.
That floor is never sent to physical actuation: choose an actually admitted
cohort and command at least 40%. Require three healthy centres and support,
or derive the representation from the actual available cohort. Check mount
torque, actual ignition and funding separately. Preserve the existing bounded
angle scan; no extra force-query scans or planner trials. See the
[independent design review](review.md).

Select/retain the nested central cohort by the request's real min/max force
range and actual mount moment; a downshift requires genuine minimum-thrust
infeasibility. Before requesting ignition, require that the actual hull/gimbal
can point within the requested force-direction envelope and that the proposed
rotation can be supported. Pending upgrade engines supply zero current force.
Actual alignment/coallocation uses delivered grid/gimbal, paid current thrust
and the conservative next-throttle interval, including ignition transitions.
Let the hull follow the force proposal within the unchanged 0.3 rad cone.

Handoff additionally checks actual upright preparation, all three centres lit,
both endpoint force floors/ceilings and torque support. The final nominal
upright endpoint requires `abs(ax_end * mass * engineArm) <= availableRCS`
with no target-fin credit. Actual contact remains the sole landing decision.

Forecasts execute this same feedback law. Mark acquisition powered and retain
fine cadence while its requested ignition is pending; do not create a new
rollout, source-publication exception, candidate, mechanical step or deadline.
Keep existing manual/failure/terminal guards and ordinary alignment proof.
