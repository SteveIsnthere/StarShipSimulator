# Independent fin assessment — 2026-10-02

Fresh in-harness reviewer `fin_envelope_review`, read-only, no flights or edits.
This is the approved peer-unavailable fallback, not a final phase review.

The declared exact longitudinal-hinge candidate fails decisively at the
intended hypersonic entry attitude. At negative attack the front force creates
negative torque and the aft force alone supplies the required positive torque.
Even ignoring incidence and projection losses, the candidate family's generous
positive bound is about 1,149 q N m, versus required 2,322–2,388 q N m.
Attainable pressure moment is only 480–519 q N m. These are pre-breakup wet-CoM
witnesses, not the final rows after the breakup resets mass properties.

Accepted measurement findings: entry-stage flag must use the controller's
`!aeroDescentCompleted && !manualControlOn`, and returned pitch/relative wind
must determine actual attack. The original log retains the earlier stored-step
attack. Corrected script/log keep both snapshots explicitly. No flight-model,
assertion, control limit, retry or temperature limit changed.

Timeline: reentry RCS empties at 283.5 s/1,307.37 K, first >10° error at
284.775 s, breakup at 337.175 s. Deorbit empties at 2,435.85 s/1,431.51 K,
first >10° error at 2,436.933 s, breakup at 2,441.558 s. This establishes
ordering under the current body moment/old fin model, not causation for all
possible surface implementations.

The reviewer initially requested exclusion of every defensible alternative.
On reconsideration, that is broader than Task2's literal parking criterion:
a declared defensible model's proven static insufficiency can be recorded and
parked without implementing a known-insufficient candidate. The full broadside
fallback still needs the explicit approved-model/authority conclusion, including
the remaining RCS reserve/compensating impulse or other decisive witness.

New primary source inspected by both author and reviewer: Zhang et al (2021),
doi:10.7527/S1000-6893.2020.24058. It supports the general along-axis deflection
mode, but explicitly says the FRONT rotation axis is not parallel to the body
axis (printed p7, discussion of Fig12). Thus the exact-longitudinal bound does
not yet cover that sourced front geometry. Its CFD control cases are 50 m/s;
no hypersonic coefficients or its different CoM are transplanted. Source:
https://hkxb.buaa.edu.cn/CN/10.7527/S1000-6893.2020.24058

Next: inspect the front hinge/force direction and declared 2D force-centroid
approximation before choosing an implementation. Do not fit a skew angle or
pressure multiplier to erase the deficit. If a defensible model remains
insufficient, complete the reserve/authority bound and independent disposition
before executing the standing conditional fallback. No fallback is claimed now.

## Third measurement and next reviewed cycle

At every 1/120 s observed-path step, the generous hypersonic deficit integrates
to 452.813 MN m s (reentry) and 209.511 MN m s (deorbit). Favorable unchanged
full RCS budgets, granting the largest observed arm and all gas in the useful
direction, are 480.780 and 575.998 MN m s. Attainable candidate deficits are
694.635 and 322.063 MN m s. The generous screen does not decide combined
authority. A deficit along the old-fin path is not a proof about new translation.

Fresh reviewer explicitly recommends one bounded implementation diagnosis:
retain the declared longitudinal pair simplification and fixed Newtonian law,
with the front-skew omission stated. One shared force supplies translation,
moment and authority; remove body fin inflation. Authority must reflect actual
paired targets (front+aft=100%) and the existing slew, including neutral torque.
Fly reentry/deorbit with unchanged RCS/gimbal and stop at Mach5 if reached.
A Mach5 success is only hypersonic feasibility, not landing acceptance.
No invented low-Mach law or fitted skew/pressure factor. Failure requires a
fresh causal/model disposition before fallback. This starts a new bounded
cycle after the three recorded measurement attempts above.

Implementation tier: Fidelity, approved Phase6b Tasks2–3. First build the
caller-owned hypersonic surface-force primitive and independent force/vector
proofs, then couple step/controller using that exact primitive. No golden
recording or accepted runtime commit until required flight acceptance.

Narrow primitive review: no actionable finding in the unconnected surface
function or tests. Reviewer checked mirrored/obtuse force projections and
world-vector clockwise torque, reused output and allocation. Caller contracts
are explicit: wrapped attack[-pi,pi], extension0..100, physical nonnegative
inputs, and Mach>=5 gating. This review is not runtime/flight acceptance.
