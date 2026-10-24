# Descending booster auto-land initialization

Tier: **Fidelity**, under the approved Phase8 integration. Missing phase used to
always select horizontal align-boost. A fresh baseline Super Heavy/landing-burn
crashed3.608s; both direct wrapper/policy witnesses failed for that exact cause.

Reviewed correction: descending autoLand starts coast only when explicit
boostback is absent. Explicit boostback, established phases, ascending/zero-vy
initialization and inactive/manual/terminal guards retain their behavior.
Same helper is used by live wrapper and forecast-free policy. No extra force,
fuel/TPS/control authority, work/deadline/candidate cap or target is supplied.

Changed build/scoped lint pass;13 new plus12 existing boundaries pass25/25.
The changed landing-burn row now passes genuine tower capture. A subsequent
reviewed selection passed Super Heavy/intro but failed before-flip (crash13.875s)
and reentry (crash350.850s). Reentry also took35.381s wall time, beyond the30s
case contract despite synchronous Vitest not interrupting it. Preserve both
physics and CPU failures; do not call this a passing matrix or retry unchanged.

Truth reports before/after are byte-identical:25/26 IN, all TierA IN, existing
TierB max-Q altitude9528m OUT. All eight Ship goldens are outside this booster
change; both booster goldens startascending and keep the original initialization.
Predict no fixture moves. Complete full-set replay/audit remains pending;
no fixture was regenerated and whole Fidelity acceptance is not claimed.

Independent high design/code and bounded-selection reviews are retained in the
agent record; no reviewer executed workloads or edits. [Input/results](result.json)
pin the actual source, raw exits, reports and both remaining failures. One
worker, unchanged30s case/900s non-orbital caps, zero added retries, no coverage.

Next diagnosis must capture actual phase, fuel, pointing/catch geometry and
thermal/control state for the named failures and investigate the CPU cause.
Use one predeclared bounded diagnostic, no luck rerun or changed acceptance.
Orbital targeting remains a separate reviewed design/paid-scheduling gap.
