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

## Independent Task 5 preflight while owner decisions are pending

Prepared and watched three failing regression assertions, with no runtime-source change:
- At60% current throttle, asking for TWR2 commands thrust for TWR3.333333 instead. Existing nominal100% throttle test hides the denominator error. New test lives in tests/core/control-contracts.test.ts and independently evaluates commanded thrust against local weight.
- The first overpressure step computes a pressure above the unchanged50 kPa limit but returns inFlightBreakUp=false because it checked the incoming safe reading.
- A safe orbital state with an incoming stale overpressure reading returns inFlightBreakUp=true despite computing a safe current pressure.

Both freshness assertions live in tests/core/failure-freshness.test.ts and verify the current pressure is respectively unsafe/safe before checking the verdict. Exact3-failure output is task5-red.log. These failures are required TDD evidence for the already-approved Task 5; they are intentionally unresolved, not additional attempts at the Task 1 heating/predictor checks. Task 5 core fix has not begun, to preserve serial physics work and atomic golden audits. No owner response has arrived for either Task 1 exception.

Task 5 preflight lint and production build exit0. The targeted3 assertions fail for the documented defects, with37 unrelated tests filtered out by name; this does not claim a green unit suite. Logs retained beside task5-red.log.

## Owner approval checkpoint —2026-10-01

Steve’s “sounds good” approved both recommended exceptions after the goal was marked blocked. Historical pending statements above describe the prior wait and are superseded. No new question is required. Exact approved replacement scope and source-based correction, including the predeclared smooth bridge, are in modernization-GOAL.md and the phase plan. Neither exception is implemented; old red assertions/source remain unchanged. Full roadmap scope remains6b,7,8,9.

A recovery-only patch is retained beside this note as in-progress-source.patch. It captures the current uncommitted source/tests (including untracked files) so the approved atomic Fidelity work survives loss of this checkout. It is not a completed core commit or a regenerated baseline. In the existing worktree, do not apply it over the already-present changes. In a clean checkout at this documentation checkpoint, check with git apply --unidiff-zero --check, then apply with --unidiff-zero only if the source changes are absent.

## Latest corrected-model checkpoint — goalgen refresh

**Both approved corrections are implemented in the working tree.** The shared force model uses the exact predeclared Mach-aware eta bridge, and the obsolete 4 km/s null characterization is replaced by forward mechanical and real-breakup witnesses. Focused coefficient/body/schedule checks pass; the complete predictor suite passes 27/27. Actual flown hypersonic lift points outward in both directions (entry suite 6/6). Build, lint and the current truth registry (8/8 IN) passed after the eta/predictor edits, before the later Mach-20 schedule and flown-lift additions; these checks are not a final gate.

The corrected Mach-five sweep gives 60° deorbit peak1446.925 K but reentry takes977.183 s against the unchanged 900 s harness. A predeclared, tested trial begins the linear blend at Mach20 instead, ending at Mach2. Its full eight-angle/two-preset sweep gives 60° deorbit1447.895 K and reentry1346.043 K in815.958 s. This resolves the measured duration problem in the sweep, not all landing acceptance. The selected60° and Mach20 schedule remain provisional pending pad/range acceptance.

Current source constants: reserve22,000 kg, angle60°, M_t20, M_b2, DEORBIT_ENTRY_RANGE3,966,736 m. At the previous4,416,537 m aim, the Mach20 sweep misses -449,800.9 m; the current measured calibration lands but misses -114.37 km (raw script derives3,852,370 m; not applied). The calibration is red. Use the two measured points for a principled numerical correction, then address range dispersion with the plan's permitted bank-free lift/range modulation; do not keep guessing or weaken the one-km health/10 km acceptance.

The broader corrected-model landing run was 43 pass/11 fail before the Mach20 change: demo now lands (source correction resolved its third thermal diagnosis) but misses158.23 km; reentry duration, pad health, timing, old peak-temperature characterization, longitude/light-mass/120 km envelopes and300 km breakup remained red. Recheck affected cases only after a justified change. No new diagnostic attempts are authorized by this refresh; the resolved demo-heating diagnosis used its third attempt. Engine-out reserve checks passed with22 t before Mach20; revalidate under the final schedule. Task 5's three watched-red regressions are preserved; runtime fixes have not begun. No Linux golden regeneration, task core commit, mutation run or full phase gate has been completed.

**Next bounded task:** finish Task 1's deorbit aim/range acceptance on the existing branch, using measured calibration and permitted guidance authority. Preserve the exact eta bridge, all physical limits and diagnosis counts. Measure actual peak flux for the plan's dated ±5% band, finish scenario/engine-out acceptance, then recording-platform goldens and audit. Earth's rotation remains zero until Task 1b. Task 1 is not checked off.

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

## Retained bounded-feedback checkpoint (before Task 5)

Both owner corrections remain implemented. Task 1 now includes scheduled-entry range prediction through the same fallAcceleration/body forces as step(), including planned dumping to22 t, current fin area, mean wind and rotating-frame gravity. It forecasts to1 km with midpoint0.5 s steps and a2500 s cap; convergence at0.25 s and real-step witnesses in both directions hold the unchanged new2 km prediction bound. That is an entry-range approximation, not the existing metre-accuracy burn/fall witnesses, which remain intact. The first range witness failure came from a fixture whose locked fins retracted; its setup was corrected without changing the2 km bound. Genuine tracking-bias cases then watched red and passed after prediction carried the observed near-track pitch error. No attitude command is enlarged by that bias.

Operational guidance solves an entry-angle trim within the existing±3° authority, refreshed once per simulated second. Countdown and trim are in SimState; synchronous scratch buffers carry no flight history. Explicit offline entryAngleOfAttack overrides keep the prescribed sweep open-loop. Determinism, reset and override witnesses pass. Measured update cost1.825 ms once per simulated second; actual entry steps including updates average0.02185 ms in the on-demand probe. This is not the complete phase benchmark.

Secant calibration from recorded aim/miss pairs gives currentDEORBIT_ENTRY_RANGE3,812,057 m. Final fixed-angle sweep at that aim selects60°: deorbit1463.710 K at70.051 km, miss-14.8 m, landed2959.675 s; reentry1346.043 K, landed815.958 s. This satisfies the preset sweep's thermal/10 km feasibility rule. With bounded feedback and measured tracking bias, preset one-km health, demo ten-km acceptance, all three reserve checks, longitude/light/engine-out/120 km range envelopes and all intended auto-land scenarios pass. The last full54-check landing run was51 pass/3 fail; its residual flux characterization was subsequently remeasured under Task 1's explicit±5% permission:161759.227 W/m², band centred161800, absolute thermal limit retained. The updated scenario/entry-prediction focused run passes24/24. Build and lint pass; final truth report8/8 IN. No complete unit suite, mutation, Linux goldens/audit or phase gate yet.

**Outstanding acceptance:** coast starts1433.05 s against the unchanged>1500 s assertion;300 km entry still breaks at1533.03 K/68.441 km. Neither assertion is changed. Range diagnosis1 rejected fin-area variation as the principal shortfall (neutral/current forecasts differ<1 km), found actual tracking offset~2.5° causing late inward lift; measured-bias prediction fixed preset/demo range. The300 km case has used only diagnosis1: trace shows thermal breakup atalpha60.60°, trim-0.113°, not pressure. Next bounded task: forecast the thermal envelope of the existing±3° range authority for that300 km entry, using the shared aero and thermal functions, before choosing a constrained guidance change. Record diagnosis2, then its result; no extra attempts are authorized. Do not change the tile limit, burn bounds, eta bridge or range limits. The coast assertion still needs its own principled diagnosis; do not delete or relax it. Earth's rate remains zero until Task 1b. Task 5 regression tests remain watched-red, with runtime fixes not begun.

### Final calibrated fixed-angle sweep

```csv
angle,preset,peakKelvin,peakAltitudeMetres,missMetres,outcome,seconds,speedAt1km,peakFlipAttackDegrees
45,deorbit,1496.027,70565.0,3209426.9,landed,3461.283,81.905,159.516
45,reentry,1360.261,72868.9,3337084.1,landed,1148.525,81.912,160.278
50,deorbit,1478.070,70707.0,1985853.8,landed,3272.500,81.928,159.305
50,reentry,1344.826,72785.4,2607584.0,landed,1025.383,81.916,160.266
55,deorbit,1467.289,70545.3,919647.3,landed,3105.417,81.934,159.351
55,reentry,1340.577,72112.2,1960159.2,landed,914.967,81.931,160.200
60,deorbit,1463.710,70051.4,-14.8,landed,2959.675,81.642,152.031
60,reentry,1346.043,70923.7,1388111.1,landed,815.958,81.930,160.585
65,deorbit,1467.478,69179.0,-780365.5,landed,2834.383,82.086,142.214
65,reentry,1360.614,69161.8,878544.5,landed,726.350,81.915,162.086
70,deorbit,1479.211,67827.9,-1429824.8,landed,2725.308,82.097,142.046
70,reentry,1383.396,66910.8,421763.7,landed,645.142,81.850,167.549
75,deorbit,1499.454,65873.1,-1986660.1,landed,2629.158,82.101,141.145
75,reentry,1412.693,64253.6,31413.5,landed,571.700,81.792,167.562
90,deorbit,1533.054,65771.3,-3362585.7,brokeUp,2143.308,,0.000
90,reentry,1524.321,55645.5,-664741.9,landed,416.442,81.679,138.966
```

Raw broad acceptance: bias-landings.log; updated flux/scenario/entry witnesses: range-final-focused.log; bounded diagnoses: range-diagnosis1.log and range-diagnosis.ts. Missing-import build/test failures are retained as range-build.log/range-focused.log and corrected green logs, not hidden. Recovery patch refreshed and checked both ways with --unidiff-zero.

## Thermal diagnosis and Task 5 checkpoint (2026-10-01)

Task 1's 300 km diagnosis is stopped after attempt 3. Diagnosis 2 added peak skin temperature to the existing entry predictor using the shared Sutton-Graves/radiative-sink functions; four flown fixed-fin/tracking-bias witnesses and step convergence retain the new 1 K bound. Watched red and green are retained. At the actual 300 km flight's 80 km crossing, forecasts at 57/60/63° gave 1549.25/1544.99/1542.88 K using observed -0.212° bias. Even the -3° tracking-bias forecasts exceed 1533 K. No fixed choice within existing authority was thermally feasible.

Diagnosis 3 retained safe range solutions and otherwise chose the coolest reached forecast among the range candidate and the same ±3° endpoints, once per simulated second. Selector red/green and 51 focused passes are retained. The real 300 km check still returned `brokeUp`; its landing assertion remains unchanged. No fourth run, including a full suite containing that check, is authorized while Steve's exception is pending. Thermal build/lint passed and truth remained 8/8 IN before the subsequent throttle change.

Coast diagnosis 1 independently records ignition at 1433.05 s: pad gap 8,811,094.695 m versus predicted burn + coast + entry range 8,811,117.731 m. Keeping ignition after 1500 s would require changing the measured aim by approximately 523 km. Its old assertion remains unchanged pending the owner's choice of a firing-geometry witness.

Independent Task 5 is partial. Its previously watched-red 60%-actual-throttle regression now passes: requested acceleration divides by full-throttle `getTotalMaxThrust`, retaining NaN/Infinity clamps. All 38 control-contract tests pass. Failure-freshness runtime changes and current-thrust/felt-g witnesses are not implemented; two pressure regressions remain red. No build/lint after the throttle edit, golden audit, complete gate, independent review or source commit is claimed. Earlier landing acceptance predates this throttle change and must be verified under the final model.

Owner decisions pending: replacing only the obsolete coast floor; bringing Earth rotation forward into coherent Tasks 1+1b with exactly one additional 300 km verification. Until recorded, rate stays zero and the diagnosis stop remains binding. The preset fixed-angle sweep's stop rule has not fired. Preserve physical limits, source bridge, guidance authority and every other assertion.

Evidence: `thermal-predictor-red.log`, `thermal-predictor-green.log`, `thermal-envelope2.log`, `thermal-envelope.ts`, `thermal-trim-red.log`, `thermal-focused.log`, `thermal-build.log`, `thermal-lint.log`, `thermal-truth.log`, `300km-attempt3.log`, `task5-throttle-green.log`. Logs are raw, including failures. The refreshed `in-progress-source.patch` includes current thermal/throttle code and passes forward/index and reverse/worktree checks with `--unidiff-zero`; it is recovery evidence, not shipped physics.

## Refreshed checkpoint and owner approvals (2026-10-01)

This section supersedes earlier checkpoint status. Phase 6 remains merged/live at `080f108`; six of ten phases are done (60%). Phase 6b is unfinished on existing claude/entry-on-lift. No unfinished runtime source has been committed or merged.

Steve's latest “sounds good” approves both previously presented recommendations:
1. Replace only the obsolete >1500 s coast characterization with a calculated firing-geometry witness. Keep burn sequence, duration bounds, total-flight checks and genuine predictor cap/null cases.
2. Bring Task 1b Earth rotation forward and finish Tasks 1+1b as one coherent Fidelity change. Permit exactly one further named 300 km verification after that change and its other focused acceptance. The three authorized diagnoses are exhausted. An accidental fourth run occurred when Vitest ignored the global CLI exclude; it still broke up and grants no authority. The new exception is one further verification after that accidental run. If it fails, stop that diagnosis again and report; do not change physical limits or rerun for luck. A successful result permits the ordinary required release gate containing the case, not a new diagnosis campaign.

Current source still has rotation zero and the old coast assertion; the approvals authorize their next implementation. Preserve1533 K, one-km health, ten-km landing, burn bounds, ±3° authority, the fixed source bridge and general three-attempt rule. The preset sweep stop rule has not fired.

Task 5's current-force fixes are implemented: fresh pressure/felt-g breakup checks, ground support from current vertical specific force, collision before fuel use, fresh TWR, and breakup shutdown with dry mass/inertia and cancelled ignition. Full-throttle demand correction is retained. Real physical fixtures replace fabricated stale values without weakening their properties. The dependent final-descent v²=2ah braking envelope/feed-forward belongs to Task 1 Fidelity; intro keeps its original descent law. Before-flip/two-out now lands. Do not redo these fixes.

Build, lint and truth report passed on the reviewed source. Explicit safe collection passed 805 core/proof tests; the focused landing acceptance passed 36. Independent review found one P2 wet inertia after breakup: watched red, fixed, reviewer independently passed 10 regression tests. No substantive finding rejected. This partial review does not replace the phase's final high-depth code review/independent physics review.

Mac preview trajectory audit separates entry context, Task 5 and the dependent profile. Task 5 changes RTLS kinematics (max86.7589 m altitude/2.5201 m/s vertical speed); other seven kinematics are identical, though fresh force/time readings move. Profile changes landing-burn and headwind trajectories (max12.3379 m/4.11582 m/s); intro is byte-identical across that adaptation. No golden fixture was changed. Linux regeneration, complete phase audit/coherent source commits, mutation and complete gate remain required.

The remaining-layer run is red: 1099 passed/4 failed in 94 files. Three failures are in tests/hud/debrief.test.ts (breakup reason, measured vertical speed and peak-Q exceedance). One is tests/view/dynamic-pressure.test.ts (shake witness attitude speed6.38 deg/s against unchanged<6). First task: understand and fix these real regression/fixture causes while preserving each assertion's property and bounds. Read affected code and applicable frontend conventions before changing it; count each diagnosis. Then finish the approved coast/rotation changes and their bounded verification. Do not start Phase 7 yet.

Recovery patch includes all unfinished tracked/untracked source and tests. Check forward against the index and reverse against current source with --unidiff-zero; never apply over existing edits. Vitest --exclude did not prevent orbit-demo execution. Use explicit filenames and verify collection before any run while a named check is stopped. Vitest list --json takes an optional output filename: an earlier invocation overwrote analytic-laws.test.ts; it was restored byte-for-byte from HEAD and has no diff. Always supply a separate JSON output path. Exact failures/restoration/review/audit are retained in the progress evidence. Earlier green acceptance is historical where the model has subsequently changed.

### Task 5 evidence and reproduction

Raw task5 logs retain all watched-red, failed collection, accidental orbit execution, corrected collection, build/lint/truth and unit results. task5-review.md records the fallback reviewer and accepted P2. task5-analytic-restore.json proves exact HEAD restoration. task5-trajectory-audit.json records input hashes and every changed field of all eight trajectories.

The audit used isolated source snapshots, not the working tree's fixtures: extract e86e282, apply its committed in-progress-source.patch for entry context. For entry-before-task5 only, restore the throttle denominator/import from getTotalMaxThrust to the preceding getThrust implementation. For entry-with-task5, retain that checkpoint's autopilot/index.ts and overlay the current recovery patch's step.ts/primitives.ts. For entry-with-profile also overlay current autopilot/index.ts. Verify the three source hashes against task5-trajectory-audit.json before replay. Symlink the same installed node_modules into each snapshot, copy task5-trajectory-record.ts to its root as audit.ts, then run npx tsx audit.ts /absolute/output.json. This records in memory at the golden specs' existing2 Hz cadence; it writes no golden fixture. Compare each sample/field between stages. This is Mac arm64 preview evidence, not the Linux golden baseline or final phase audit.

## Rotating-entry implementation ledger (2026-10-01)

Approved coherent Tasks1+1b, Fidelity: switch only frameRotationRate to the existing Earth projected rate (WGS84 rate, Starbase latitude, 2D projection already documented), then measure current operational range/flux/reserve under the rotating model. Keep fixed eta,±3° authority and1533 K. Explicitly exclude the300 km named check until other focused acceptance passes; exactly one further verification is authorized. Coast characterization becomes a first-crossing firing-geometry witness, retaining existing burn/duration/total-flight assertions. No physics constant is fitted to truth.

HUD/view diagnosis1: current-force breakup rejected by airborne observer; add one loss latch capturing the first returned failure and freezing debris. New first-step/freeze/reset witness watched red; focused 72 passed after fix. Shake diagnosis1:20 t CoM19.8 m below neutral fin station21.61 m; current normal force develops sufficient alpha for unstable fins to exceed6 deg/s. Choose empty tanks with dry CoM21.8 m on restoring side, not an optimized load. All bounds and old unstable positive control retained; focused 72 and desktop browser 2/2 passed. Build/lint passed. These interface fixes change no simulation number or fixture.

Rotation measurement1: current operational 60° lands deorbit at1404.640 K, miss-1851.705 m,3108.525 s with6.518 t left; reentry lands at1309.148 K but985.450 s, outside the unchanged 900 s harness. Diagnosis1 of this new duration regression includes the prescribed rotating16-row sweep: fixed60° reentry1070.583 s,65°931.942 s,70°808.042 s. The operational range solver shortens the60° flight using its existing positive trim. Try the next prescribed sweep angle65° under the same±3° trim, before considering any Mach-boundary change. This is the coolest next sweep candidate with a plausible900 s operational envelope; it is not accepted until measured. Do not alter M_t20/M_b2 or the900 s bound. Its fixed-angle deorbit miss-896527.1 m supplies the first measured aim estimate3,812,057-896,527=2,915,530 m; remeasure after the angle choice and derive any correction from measured residuals, not guesses.

Rotating range calibration: initial65° fixed-sweep aim2,915,530 m yields operational miss-1097.610 m. The mandated constant-plus-miss estimate2,914,432 m instead misses-1239.458 m; safe acceptance66 passed/1 failed/1 intentional named300 km exclusion. Every other orbit/demo/scenario/reserve/predictor check passes. Diagnosis2 rejects unit-slope calibration under bounded feedback: these two measured aim/residual pairs give slope0.129187289. Diagnosis3 uses their secant root2924026 m. This is measured physical aim calibration explicitly authorized by Task 1/1b; no health bound or guidance authority changes. Verify the named one-km health next; if still red, stop this range diagnosis after its third attempt. The300 km exception remains unused.

## Rotating-entry checkpoint and range stop (2026-10-01)

This section supersedes the previous checkpoint. Phase 6 remains merged/live at `080f108`; six of ten phases are complete (60%). Phase 6b remains unmerged on claude/entry-on-lift. All unfinished source/tests stay uncommitted, with the refreshed recovery patch checked forward/index and reverse/worktree. No golden fixture has changed.

The four HUD/view regressions are fixed: the watch captures the first current-force breakup state and freezes it before debris motion; first-step/freeze/reset witness watched red. The shake rendering subject is dry, with CoM21.8 m beyond the area-weighted neutral fin station21.61 m; the former20 t load is on its unstable side. No pressure, motion, screenshot or timing bound changed; the old unstable positive control remains. Focused72 and desktop browser 2/2 passed before switching rotation on. The final safe unit run after rotation also includes those HUD/view checks; the browser result is pre-rotation evidence, not final phase release proof.

Approved coast replacement is implemented: the sequence check retains coast-before-burn, burn/hand-over order, burn duration and total flight bounds, and brackets the first fixed step crossing the mechanical burn+coast+entry firing point. The obsolete1500 s assertion alone is removed. The geometry checks pass.

Approved Task 1b rate is now EARTH_FRAME_ROTATION_RATE (0.0000655427691429454 rad/s). The new default-rate test watched red at0 and passed after the switch; all 43 orbital analytic/frame/law checks passed. The rotating16-row sweep showed the60° operational reentry taking 985.450 s against the unchanged 900 s harness. The next prescribed 65° candidate lands it in 855.217 s at 1315.063 K, peak flux144021.289 W/m². M_t20/M_b2, eta, authority and tile limit are unchanged. The plan-authorized dated reentry±5% band is centred 144000 W/m²; deorbit's unchanged±5 K characterization is remeasured 1424 K (actual sink-inclusive peak1424.636 K at the first calibrated aim). This is candidate-model acceptance, not a deployed build.

Range calibration remains red. The fixed65° sweep miss-896527.1 m gave aim2,915,530 m; operational miss-1097.610 m. Constant-plus-miss estimate2,914,432 m instead missed-1239.458 m. Secant estimate2,924,026 m misses -1333.183 m. Both focused acceptance runs were66 passed/1 failed/1 intentional300 km exclusion; the sole failure is tests/core/deorbit-range.test.ts's unchanged one-km health check. Its three calibration diagnoses are stopped. Steve has been asked for one further trace-based range diagnosis and one verification, with all limits unchanged; no answer yet. Do not rerun that health flight, including indirectly through a full suite, without that specific answer. Do not continue numerical aim guesses. The approved extra 300 km verification is still UNUSED and must wait for the other focused acceptance to pass. No 300 km run occurred this turn.

The broad unit run initially found three inertial-fixture assumptions after switching the default rate. Diagnosis1 converts the achievable orbital controller fixture to ground-relative circular speed, makes the zero-angular-momentum degeneracy proof explicitly omega0, exercises the same finite-arc bounds at both0/Earth rates, and converts the real caller's post-burn radial input. All assertion properties/bounds stay intact;81 focused checks pass. Final explicit safe collection:147 files/1905 tests pass, with stopped orbit-demo/deorbit-range files and golden replay files absent. This is not the complete unit suite or phase gate. Final build, lint and truth8/8 pass. No mutation, Linux fixture generation, complete gate, final phase reviews or runtime source commit is claimed.

Next dependent action is the owner's narrow range-diagnosis decision. While pending, preserve all source and investigate only independent authorized checks/review preparation that cannot rerun the stopped health/300 km cases. Tasks2–4 have not started; do not silently skip Task 1 acceptance or start Phase 7. Keep the full remaining6b/7/8/9 scope. This turn made concrete source and verification progress; the goal stays active.


## Independent review and browser checkpoint (2026-10-02)

This adds evidence to the rotating-entry checkpoint; it does not complete Phase 6b or authorize stopped range work. The final rotating build passed the shake rendering witness across all five Playwright projects (10/10, exit 0). A fresh independent in-harness reviewer found no actionable findings in the bounded implemented physics/HUD scope, passed 111 narrow tests and four filtered observer cases, and confirmed all 32 source hashes. Claude CLI authentication failed and Chrome was unavailable, so neither cross-vendor fallback ran. No stopped health/300 km flight, full gate, coverage, mutation or golden regeneration ran. Final phase acceptance/reviews remain required.

Full remaining scope is still Phases 6b, 7, 8 and 9. Steve requested goalgen to refresh the handover command; the specific extra range-diagnosis authorization is presented separately with options. Existing approvals and unused extra 300 km verification remain intact.

[Review provenance and browser evidence](2026-10-01-phase6b-task1-progress/rotation-independent-review.md).
