# Orbital mission duration ruling

Steve answered on 2026-10-18 UTC:

> Keep starts and targets; approve a physically derived orbital mission horizon.

This resolves the duration-policy decision. Preserve every original start,
Ship landing/Super Heavy Starbase tower target, all 18 ID/model rows and all
physical/control/work/fuel/thermal/catch bounds. Non-orbital missions retain
900 seconds/108,000 steps. The 30-second test timeout and zero retries remain.

A fresh independent high review by `/root/orbital_horizon_review` examined
a pre-flight physical derivation for
circularize/deorbit × both models. No new horizon is selected by observing a
passing flight. Reentry remains a non-orbital-start mission despite its
orbital-speed description; it keeps 900 seconds.

The candidate two-period-plus-terminal formula uses unchanged R=6,371,000 m,
h=150,000 m, μ=3.986004418e14 m³/s² and current frame rate zero:
T=2π√((R+h)³/μ)=5,240.6153044219545 s. 2T+900=11,381.230608843909 s.
Reviewer disposition: conditional approval as a predeclared mission cap, HOLD
any claim that current controllers meet it. At DT=1/120 s the discretized cap
would be 1,365,748 ticks / 11,381.233333333334 s. Interpretation: at most one
ground-relative revisit to acquire firing geometry, another period for
preparation/finite burn/vacuum transit, then the original 900-second terminal
allowance. All ticks count. Paid RCS has finite 25-full-thrust-equivalent-second
reserve; usable attitude before opportunity needs a witness. For a bound
subcircular transfer from apogee, entry transit is at most half its elliptic
period and no more than half the initial circular period, but the actual finite
burn/radial conditions must satisfy those hypotheses. If rotation changes,
opportunity acquisition must use the ground-relative period.

This remains a candidate envelope; controller/geometry and paid-attitude/burn/
transit allowances need justification before adopting it. The “orbit or two”
comment in scenarios refers to passive decay at 100 km and is not supporting
evidence for a mission bound at 150 km. No flight has run for this proposal.

The current booster branch does not call autoDeorbit. Ship's deorbit functions
also contain Ship-specific mass/propulsion/ignition and entry-range assumptions.
Longer mission time alone does not supply model-correct booster orbital return
or prove survival. Such implementation must receive its own physics-tier
witnesses, review and actual unchanged-limit flight acceptance.
