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

## Owner approval checkpoint —2026-10-01

Steve’s “sounds good” approved both recommended exceptions after the goal was marked blocked. Historical pending statements above describe the prior wait and are superseded. No new question is required. Exact approved replacement scope and source-based correction, including the predeclared smooth bridge, are in modernization-GOAL.md and the phase plan. Neither exception is implemented; old red assertions/source remain unchanged. Full roadmap scope remains6b,7,8,9.

A recovery-only patch is retained beside this note as in-progress-source.patch. It captures the current uncommitted source/tests (including untracked files) so the approved atomic Fidelity work survives loss of this checkout. It is not a completed core commit or a regenerated baseline. In the existing worktree, do not apply it over the already-present changes. In a clean checkout at this documentation checkpoint, check with git apply --unidiff-zero --check, then apply with --unidiff-zero only if the source changes are absent.

## Latest corrected-model checkpoint — goalgen refresh

**Both approved corrections are implemented in the working tree.** The shared force model uses the exact predeclared Mach-aware eta bridge, and the obsolete 4 km/s null characterization is replaced by forward mechanical and real-breakup witnesses. Focused coefficient/body/schedule checks pass; the complete predictor suite passes 27/27. Actual flown hypersonic lift points outward in both directions (entry suite 6/6). Build, lint and the current truth registry (8/8 IN) passed after the eta/predictor edits, before the later Mach-20 schedule and flown-lift additions; these checks are not a final gate.

The corrected Mach-five sweep gives 60° deorbit peak1446.925 K but reentry takes977.183 s against the unchanged900 s harness. A predeclared, tested trial begins the linear blend at Mach20 instead, ending at Mach2. Its full eight-angle/two-preset sweep gives 60° deorbit1447.895 K and reentry1346.043 K in815.958 s. This resolves the measured duration problem in the sweep, not all landing acceptance. The selected60° and Mach20 schedule remain provisional pending pad/range acceptance.

Current source constants: reserve22,000 kg, angle60°, M_t20, M_b2, DEORBIT_ENTRY_RANGE3,966,736 m. At the previous4,416,537 m aim, the Mach20 sweep misses -449,800.9 m; the current measured calibration lands but misses -114.37 km (raw script derives3,852,370 m; not applied). The calibration is red. Use the two measured points for a principled numerical correction, then address range dispersion with the plan's permitted bank-free lift/range modulation; do not keep guessing or weaken the one-km health/10 km acceptance.

The broader corrected-model landing run was 43 pass/11 fail before the Mach20 change: demo now lands (source correction resolved its third thermal diagnosis) but misses158.23 km; reentry duration, pad health, timing, old peak-temperature characterization, longitude/light-mass/120 km envelopes and300 km breakup remained red. Recheck affected cases only after a justified change. No new diagnostic attempts are authorized by this refresh; the resolved demo-heating diagnosis used its third attempt. Engine-out reserve checks passed with22 t before Mach20; revalidate under the final schedule. Task5's three watched-red regressions are preserved; runtime fixes have not begun. No Linux golden regeneration, task core commit, mutation run or full phase gate has been completed.

**Next bounded task:** finish Task1's deorbit aim/range acceptance on the existing branch, using measured calibration and permitted guidance authority. Preserve the exact eta bridge, all physical limits and diagnosis counts. Measure actual peak flux for the plan's dated ±5% band, finish scenario/engine-out acceptance, then recording-platform goldens and audit. Earth's rotation remains zero until Task1b. Task1 is not checked off.

### Corrected sweep evidence

The previous tables and pending statements are historical; this section supersedes their status. Both complete corrected-model sweeps are retained in `eta-sweep.log` and `mach20-sweep.log` alongside this note. The Mach20 table uses aim4,416,537 m and reserve22 t:

```csv
angle,preset,peakKelvin,peakAltitudeMetres,missMetres,outcome,seconds,speedAt1km,peakFlipAttackDegrees
45,deorbit,1477.981,71407.7,2886433.3,landed,3420.017,81.909,159.754
45,reentry,1360.261,72868.9,3337084.1,landed,1148.525,81.912,160.278
50,deorbit,1460.729,71537.6,1607863.8,landed,3223.808,81.925,159.257
50,reentry,1344.826,72785.4,2607584.0,landed,1025.383,81.916,160.266
55,deorbit,1450.693,71361.9,503940.9,landed,3052.117,81.936,159.291
55,reentry,1340.577,72112.2,1960159.2,landed,914.967,81.931,160.200
60,deorbit,1447.895,70853.4,-449800.9,landed,2903.333,81.978,140.589
60,reentry,1346.043,70923.7,1388111.1,landed,815.958,81.930,160.585
65,deorbit,1452.731,69947.7,-1265853.9,landed,2771.925,82.055,142.110
65,reentry,1360.614,69161.8,878544.5,landed,726.350,81.915,162.086
70,deorbit,1465.584,68555.9,-1940749.6,landed,2659.417,82.086,142.009
70,reentry,1383.396,66910.8,421763.7,landed,645.142,81.850,167.549
75,deorbit,1487.492,66510.7,-2516394.9,landed,2560.592,82.066,140.089
75,reentry,1412.693,64253.6,31413.5,landed,571.700,81.792,167.562
90,deorbit,1533.038,65645.4,-3941485.9,brokeUp,2067.967,,0.000
90,reentry,1524.321,55645.5,-664741.9,landed,416.442,81.679,138.966
```

Raw current-aim calibration: `mach20-range.log`; prior corrected Mach-five landing failures: `eta-landings.log`; latest flown-lift checks: `flown-lift.log`. All logs are retained with their original results, including watched-red runs. Recovery patch refreshed to include the current corrected source/tests; validated against the index and existing working tree. Never apply it over existing changes.
