# Candidate: active terminal grid/RCS coallocation

Research design only. Fresh independent high reviewer rtls_code_review reviewed
the13-frame endpoint query and2437-recorded-pair finite actuator/RCS ledger.
The latter reproduces actual old RCS payment/reserve bit-exactly and leaves
3.658749s counterfactual reserve at first plane. This motivates a bounded
controller trial, never a catch claim. No source/test/config edit or check may
start while the parent's complete browser baseline holds the source freeze.

## Smallest implementation and ownership

Tier Fidelity under the approved Phase8 vehicle-realism/flight-damage plan.
The sole runtime owner/file is src/core/autopilot/booster.ts. Extract the exact
existing unpowered14-bisection grid command into a local helper using existing
mass/grid scratch and the same operations/query order. Its old unpowered
argument remains the original torque, preserving that branch bit-exactly.

Add an optional powered-grid flag to align, default false. Only the active,
ready, non-missed terminal thrust-allocation call opts in. Ordinary exported
alignBooster utilities, manual transitions, alignment/ignition, entry and
non-ready/missed terminal calls retain their existing outputs even if old
phase metadata happens to say terminal. No phase-based implicit opt-in.

For opted-in powered terminal allocation, enable physical fins and request the
existing bounded grid helper to target required upright torque minus actual
currently delivered gimbal torque. Leave translational gimbal/throttle law,
RCS law/cap/reserve arithmetic, angles, slew, ignition, horizon, presets and
catch gates unchanged. RCS still uses actual delivered grid+gimbal torque,
captured before proposing a future fin target. No target credits impulse;
physical frontFinActuation and the next shared advance deliver actual torque.

Preserve14bisection iterations, all original scheduler/mechanical/hint/trial/
4000rollout/receipt budgets, damage capability queries and source provenance.
No extra force law, integrator, derivative cutoff or special preset branch.

## RED-first evidence before runtime edits

Create bounded controller/actuator tests with the retained actual320/330s raw
separation inputs, not an improved coarse-ready state. Original policy must
fail to enable a nonzero grid command. The proposed policy should enable it
with the physical sign and bounded target while leaving currently delivered
forces, RCS reserve and paid actual-grid/gimbal residual unchanged. Calling
existing actuation should move the fin by at most1percentage per120Hz interval;
a target cannot grant immediate torque. Only a subsequent actually delivered
fin angle may reduce the remaining RCS demand.

Use zero dynamic pressure and absent retained grid hardware as negative controls
for torque authority. Preserve full damaged-state/RNG ownership and all finite
payments. Test stale terminal phase on ordinary exported utility alignment to
prove no implicit grid opt-in. Numerical proof against frozen original align
code must compare full outputs across unpowered/coast, powered boost/ignition,
utility and damaged hardware domains; unchanged branches stay bit-exact.

Review the concrete implementation independently after narrow RED/green tests,
without weakening gates or acceptance. A separately declared, source-pinned
single new default separation flight is required to assess physical catch and
all original limits. RTLS/regression flights and full CPU/local gates require
honest declarations and environment evidence. No unchanged flight reruns for
luck, reserve increase, horizon reset, preset/catch adjustment or performance
acceptance claim follows from the shadow ledger.
