# Orbital mission duration ruling and frozen deadline

Steve answered2026-10-18UTC:

> Keep starts and targets; approve a physically derived orbital mission horizon.

Preserve every original start, Ship landing/SuperHeavyStarbase tower target,
all18ID/model rows and physical/control/work/fuel/thermal/catch bounds. Only
circularize/deorbit x both models receive the reviewed test-only deadline.
Other fourteen, including reentry, keep900s/108000steps. Original30s case,
coverage timeout, worker limits and zero added retries remain.

Fresh independent high review by `/root/orbital_horizon_review` approved
freezing this physical-scale FAILURE DEADLINE before flight trials:

```
r = planetRadius + altitude = 6,521,000m
mu = 3.986004418e14m^3/s^2
n = sqrt(mu/r^3)
TKepler = 2pi/n
Tground = 2pi/(n-frameRotationRate)
H = Tground + TKepler + 900
```

Current frame rate0 givesT=5240.6153044219545s, H=11381.230608843909s,
ceil(H/DT)=1365748ticks /11381.233333333334s. The checked helper rejects
nonfinite periods/deadlines and unsafe integer steps; structural checks4/4.
[Source/result evidence](horizon/README.md). Matrix support ticks share one
counter; four mocked clock/contact units establish sequencing, not flight.

One ground revisit allocates firing geometry; a Kepler period shares paid
preparation/finite burn/vacuum transit;900s retains terminal allowance. This
is not a universal upper bound for actual PD settling, fuel, burn or transit.
A bound subcircular transfer from apogee reaches a lower interface within half
its elliptic period, at most half the initial circular period when its semimajor
axis is no greater; actual finite-burn/radial conditions must satisfy these
hypotheses. The finite25full-thrust-equivalent-second RCS reserve and all support
ticks remain paid. Rotation changes must recompute ground-relative timing.
The old100km passive-decay and35minute RCS comments are not supporting proof.

The booster dispatcher still bypasses Ship autoDeorbit, whose model-specific
mass/propulsion/ignition/entry-range assumptions cannot merely be parameterized.
A paid model-aware orbital successor needs independently reviewed proposals,
future ignition/cutoff validation, source lineage and unchanged-cap scheduling.
No orbital flight has been run or accepted for this deadline. Longer time does
not supply booster TPS, reserves, healthy entry, target accuracy or tower capture.
