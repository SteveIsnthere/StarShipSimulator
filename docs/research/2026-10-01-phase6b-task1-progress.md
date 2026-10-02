# Phase 6b Task 1 progress — 2026-10-01

Started on `claude/entry-on-lift` from Phase 6 merge `080f108`, closure-doc checkpoint `a769e9d`. Tier Fidelity, Task 1 must land as one coherent change, not coefficient/force/guidance fragments.

Completed partial work (uncommitted source):
- Watched geometric area test fail on 30.2939291596 m² instead of the 63.6172512352 m² base. Removed /2.1 and selectively ported the parked coefficient functions plus 10 relevant tests; excluded getBodyDragCoefficient blend, step wiring and XLIFT. All 10 tests passed.
- Watched physical broadside integrator test fail before force implementation. Added body-axis force tests for full attitude-domain dissipation and symmetry, axial endpoints, broadside value, 90-degree continuity, upward lift in both flight directions, zero-density/zero-speed control and caller-owned output buffer. All seven body-axis checks passed after implementation.
- One getBodyAxisAccelerations function is used by step, tailFirstDragDeceleration and unpowered fall acceleration. No simulation-state fields or fixture shapes changed. Caller buffers avoid per-frame allocation.
- Lint and production build passed. The first build exposed tuple inference in the new test; marking the two direction fixtures as fixed tuples resolved it, with no behavior or assertion change. Existing guidance-physics suite: 23 passed, one failed. Exact failure is `landingBurnStartAltitude: the edges > returns null, within the cap, when the burn cannot stop the vehicle`: 4,000 m/s at 200,000 kg on three engines now produces 19,410.927732 m instead of null. No assertion was edited. This model-dependent expectation needs an independent stopping/cap witness before any decision; the new model or sweep may instead park under the approved stop rule. Diagnosis attempt 1: changed axial drag is the current hypothesis, not an established resolution.
- Truth report before and after model wiring: all eight rows IN. Full task verification, mutation and Linux goldens have not run.

Pre-change belly-flop measurements (same main physics, timestep 1/120 s):

| preset | descending speed at 1 km (m/s) | peak absolute attack during flip (deg) | peak skin (K) | final minus target (m) | outcome |
|---|---:|---:|---:|---:|---|
| before-flip | 70.0764 | 144.9222 | 288.2110 | +0.3165 | landed |
| reentry | 63.9842 | 137.3271 | 1372.4900 | -815336.1942 | landed |
| deorbit | 64.0340 | 145.6911 | 1458.8174 | +295.4078 | landed |

The reentry preset lands where its uncontrolled downrange entry takes it; its initial target remains Starbase. Do not relabel its huge offset as a pad landing. Task 1's explicit within-10-km sweep stop rule judges deorbit. Record both actual offsets in the sweep.

Source rulings (NASA TR R-474 https://ntrs.nasa.gov/api/citations/19770026166/downloads/19770026166.pdf):
- Eq 2.12 uses alphaPrime=min(abs(alpha),pi-abs(alpha)) for normal-force magnitude over 0..180 degrees. The plan's unfolded shorthand must not make drag negative in reverse flow.
- Eq 2.3 uses crossflow Mach M*abs(sin(alpha)).
- Printed p77 Figure 4 circular-cylinder curve at length/diameter 50/9 reads approximately eta=0.63. It is a low-subsonic measured factor. The plan's constant extension to every Mach is a named approximation; source p17 says eta generally approaches one at supersonic/hypersonic crossflow.
- The approved plan's lift magnitude N*abs(cos(alpha)) neglects axial lift; this is explicitly documented as an engineering approximation in aero.ts, not asserted to be the full NASA force rotation.
- Existing fall-agreement tests allow max(10% range,50 m), not the plan's claimed metre. Preserve them and add a controlled tight witness.

Next: failing schedule/continuity tests, schedule with Mach 5→2 blend, entry:sweep for 45/50/55/60/65/70/75/90 degrees on deorbit and reentry, compare temperatures and actual landing misses, then follow the stop rule or complete Task 1 acceptance. Do not move 1,533 K or a landing bound. Be careful that retrograde upward-lift attitude and the current broadside law stay continuous when blending. No entry angle has been selected yet.

Execution scratch: `.superpowers/sdd/modernization-phase-6b/`, ledger and baseline script. Logs are retained alongside this note.
