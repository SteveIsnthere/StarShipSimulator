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

## Schedule and sweep checkpoint

Schedule built after two watched holding-attitude failures; 21 coefficient/body-axis/schedule checks passed. Mach five to two blend joins the old broadside law in both travel directions. Lint and production build passed; missing Rad import in the first schedule build was fixed. Added two controlled lifting-fall witnesses: predictor and step agree within one metre in both directions; existing looser fall tests remain unchanged. Checkpoint build found a test setup typo (backFinExtension instead of aftFinExtension); corrected it, reran both witnesses successfully, and rebuilt. Both failed and corrected build logs are retained.

Two complete prescribed 16-row sweeps ran. At the legacy 841800 m aim, five deorbit angles survived but missed by millions of metres. As required by the plan, the coolest 60° row's measured +3641642.4 m miss gave a trial aim of 4483442 m. At that aim, 60° peaked at 1515.292 K at 68228.2 m and landed -7667.1 m from the pad. The preset sweep stop rule did not fire. This is a provisional selection, not finished landing acceptance.

| angle | deorbit peak K | deorbit miss m | outcome | reentry peak K | reentry miss m | outcome |
|---|---:|---:|---|---:|---:|---|
| 45 | 1533.012 | -3863393.2 | brokeUp | 1448.234 | +4186220.8 | landed |
| 50 | 1524.161 | +2286254.7 | landed | 1434.327 | +3312842.6 | landed |
| 55 | 1516.024 | +1053612.7 | landed | 1430.566 | +2536160.4 | landed |
| 60 | 1515.292 | -7667.1 | landed | 1436.223 | +1847865.8 | landed |
| 65 | 1522.330 | -925059.0 | landed | 1450.856 | +1236421.2 | landed |
| 70 | 1533.011 | -3804055.9 | brokeUp | 1473.673 | +695225.4 | landed |
| 75 | 1533.027 | -3895571.8 | brokeUp | 1503.301 | +231571.3 | landed |
| 90 | 1533.062 | -4035615.2 | brokeUp | 1533.053 | -1017101.5 | brokeUp |

At 60°, descending speed at 1 km is 80.581 m/s deorbit and 80.397 m/s reentry; peak flip attack is 136.908° and 166.780° respectively. Reentry takes 966.983 s, exceeding the existing 900 s acceptance harness. Its landing assertion and time cap have not been edited.

The tighter one-km health check remains red. Measured constant-plus-miss calibration: 4483442→4475775 gave -2197.36 m; 4475775→4473578 gave -2516.31 m. This is not a green calibration. At 18 t, engine-out reserves left 1.91/1.86/1.89 t, below the unchanged 2.25 t bound. Worst use is 16.15 t; approved use-plus-third rule gives 21.53 t, rounded up to 22 t. All three engine-out reserve assertions pass at 22 t, but the heavier descent moves the aim: at 4473578 m miss is -23139.10 m, deriving 4450439 m. At 4450439 m miss is approximately -4.70 km, deriving 4445737 m. Current source remains 4450439 m pending a principled range-control resolution; do not label it healthy or keep repeating calibrations for luck.

Focused landings at 18 t / 4473578 m: 39 pass, 15 fail. Named failures include reentry's two 900 s landing assertions, the pad-health check, three reserve checks (subsequently resolved by the measured 22 t), deorbit timing/old heat characterization, circularize-demo breakup/range/duration, longitude and engine-out range envelopes, 120 km range envelope and 300 km breakup. Exact output is retained. No assertion, tile limit, tolerance or retry has moved.

## Bounded diagnoses and pending owner exception

Predictor diagnosis attempt 2: its 19410.927732 m answer for 3 engines/200000 kg/4000 m/s takes 20.987677 s mechanically, within the unchanged 60 s cap. Forward flight breaks at 0.016667 s: 44.05 g, 782.77 kPa, 2415.47 K. Fresh independent review agrees the old assertion's cap premise is obsolete; adding a start-only structural guard to restore it would change the documented force-only predictor contract and incompletely validate flightworthiness. Steve was asked through the question tool to approve replacing this single model-dependent characterization with a forward witness, keeping all true cap tests, or explicitly extend flightworthiness, or park the model. **Approval is pending; preserve the red assertion.** No third diagnosis attempt has been spent.

Circularize-demo diagnosis attempt 1: trace shows it follows the selected entry near |alpha|=60.76° and reaches 1533.02 K at 67.945 km, vx7459.50 m/s, vy-93.56 m/s. Attempt 2: all eight prescribed fixed angles break up, including 60°; this is an independent flight, not the preset calibration. No third attempt has been spent.

Fresh source review of NASA R474 §2.3.2 printed pp17–18: Figure 4's eta is confined to very low crossflow Mach; the source recommends approximately unity for most supersonic/hypersonic crossflow. Figure 6 printed p78 shows a transonic dip and recovery toward unity around Mn1.4–1.6 for fineness10/12, not50/9. Holding0.63 throughout orbital entry is a named approximation, but not source-backed high-Mach behavior. A Mach-aware correction is principled independently of the demo failure; the source does not uniquely determine the bridge for50/9. No correction or bridge has yet been implemented. Steve was also asked to approve this correction of the plan’s explicit constant-factor assumption, with a declared transition fixed before testing, or retain it and park if the remaining control attempt fails. Approval is pending. Record any correction to the approved constant assumption before rerunning flights; never select its curve from the heating result.

Next: resolve the pending assertion exception only after Steve answers; resolve the hypersonic-factor approximation with a source-justified ruling; then entry/range acceptance, flux measurement, mutation and full Linux golden audit. No golden was regenerated and no core change committed.

Execution scratch: `.superpowers/sdd/modernization-phase-6b/`, ledger and baseline script. Logs are retained alongside this note.

## Independent Task5 preflight while owner decisions are pending

Prepared and watched three failing regression assertions, with no runtime-source change:
- At60% current throttle, asking for TWR2 commands thrust for TWR3.333333 instead. Existing nominal100% throttle test hides the denominator error. New test lives in tests/core/control-contracts.test.ts and independently evaluates commanded thrust against local weight.
- The first overpressure step computes a pressure above the unchanged50 kPa limit but returns inFlightBreakUp=false because it checked the incoming safe reading.
- A safe orbital state with an incoming stale overpressure reading returns inFlightBreakUp=true despite computing a safe current pressure.

Both freshness assertions live in tests/core/failure-freshness.test.ts and verify the current pressure is respectively unsafe/safe before checking the verdict. Exact3-failure output is task5-red.log. These failures are required TDD evidence for the already-approved Task5; they are intentionally unresolved, not additional attempts at the Task1 heating/predictor checks. Task5 core fix has not begun, to preserve serial physics work and atomic golden audits. No owner response has arrived for either Task1 exception.

Task5 preflight lint and production build exit0. The targeted3 assertions fail for the documented defects, with37 unrelated tests filtered out by name; this does not claim a green unit suite. Logs retained beside task5-red.log.
