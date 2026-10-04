# Third-witness120/240/480Hz refinement —2026-10-03

**The positive off-nominal exposure witness survives all three rates on the same current source. Event timing and common-time thermal/applied-control quantities refine; the sampled maximum authority reduction is not monotonic.** This is numerical evidence for this authored surrogate, not a plausible Super Heavy orbital mission, real V3 fracture prediction, a nominal-flight audit or full gate acceptance.

The lead authorized required timestep refinement, with no tuning/new scenario. Inputs/commands/hold/guards/caps match the original third witness. Current grid station is0.90H and RCS pays its final partial interval. Allcore SHA256 maps match across rates and remain unchanged during each run. Original three-attempt evidence is untouched. Pre-run interpretation: `hold-refinement-declaration.md`; runnable source: `hold-refinement.ts.txt`; separate rate JSONL/console files; machine-readable adjacent errors/brackets: `hold-refinement-analysis.json`.

## Same positive physical event at every rate

| Quantity |120Hz|240Hz|480Hz|
|---|---:|---:|---:|
|1073.15K ignition request,s|495.316667|495.312500|495.312500|
|Paid4000m/s cutoff,s|599.391667|599.387500|599.385417|
|First progressive loss,s|645.833333|645.816667|645.812500|
|Root at loss,K|1126.579610|1126.562788|1126.563264|
|q at loss,Pa|15820.518|15813.471|15814.662|
|Skin at loss,K|1434.691855|1432.555891|1431.077245|
|Felt specific acceleration,g|0.678742|0.725602|0.760129|
|Retained fuel,kg|1044578.236|1044511.340|1044535.232|
|Hot demand/proof ratio|1.000721|1.000180|1.000258|
|Cold same-flow demand/proof ratio|0.213513|0.213417|0.213434|
|Actual wall time,s|1.481|2.889|5.574|

All three grids permanently latch`ProofExceeded` (reason1), revision1; terminal is inactive at first loss. Roots remain below1173.15K availability boundary. Original50kPa/1533K/13g guards remain below limits. Same-flow source reconstruction uses each actual catalogue load lever and command; hotproof is~47.574–47.579MPa versus223MPa ambient cold. No domain disposition is being passed off as proof failure. Cold clone remains unchanged.

At the last healthy endpoint the actual45°command has a warm-vs-cold loaded angle reduction of0.0001974664/0.0001974607/0.0001975317rad. Actual lift reductions are0.090367/0.090374/0.090467N, drag reductions101.114/101.118/101.188N. These are small delivered surrogate changes, not an amplified visible bend, fatigue or wear. Neutral-phase hypothetical45°probes are not this applied-control evidence. Post-loss zero areas are not counted as continuous weakening.

## Numerical refinement and its limits

Absolute adjacent120→240,240→480 errors:

| Quantity |First difference|Second difference|Interpretation|
|---|---:|---:|---|
|Cutoff time|0.0041667s|0.0020833s|apparent order1.00|
|Loss time|0.0166667s|0.0041667s|contracts4×; apparent order2.00 is event quantization, not proof of a second-order integrator|
|Loss altitude|9.02875m|3.48601m|contracts; apparent order1.37|
|Loss skin|2.13596K|1.47865K|contracts; apparent order0.53, not a demonstrated clean first-order asymptotic regime|
|Loss feltg|0.0468598g|0.0345270g|contracts; apparent order0.44, also phase-sensitive|
|Loss root|0.0168221K|0.000475584K|contracts but changes sign; no order assertion|
|Lossq|7.04701Pa|1.19096Pa|contracts but changes sign; no order assertion|
|Maximum actual angle reduction|5.71881e−9rad|7.09958e−8rad|noncontracting and sign-changing; unresolved sampled-extremum order|

The last row's largest adjacent change is0.036% of the physical reduction. That scale is context, not a newly invented acceptance tolerance. Raw signed errors and conditional Richardson estimates are saved; a near-zero denominator/signed reversal does not establish asymptotic order. Three endpoint detections have at most3dt total quantization;120Hz3dt=.025s and240Hz3dt=.0125s. Loss differences fall within these scales, but this does not bound dynamically amplified ignition/hold phase errors. Each exact detection interval is in the analysis JSON.

Common-time probes separate trajectory refinement from different failure phases. At400s, root errors0.000684703→0.000342353K andq errors0.000836040→0.000418023Pa show order~1.00. At550s and600s root/q adjacent errors contract; apparent root orders>2 after thresholded ignition are not an upgraded integrator claim. At600s, real applied angle-reduction errors2.90155e−9→1.45363e−9rad show order0.997; both probes use actual commanded hardware at identical live flow versus ambient cold clone. This provides converging applied weakening, while the near-event maximum does not justify a blanket all-observables convergence claim.

## Payment and ownership

At every rate minimum RCS reserve is exactly0, never negative. Summed delivered equivalent firing time is25s to ordinary summation roundoff (maximum discrepancy7.65e−12s at480Hz). Maximum per-interval reserve-payment discrepancy is5.18e−15s. No reserve is added. All33ignitions/hold authority/cutoff remain original; retained-fuel differences are discrete engine-readiness/cutoff payments, not unpaid thrust.

Same-endpoint parent-plus-three-piece reconstruction gives maximum mass residual2.33e−10kg, linear momentum residual1.91e−6kg·m/s and angular momentum residual1.20e−7kg·m²/s. Actual newborn velocities match the original hull's rigid velocity field to4.55e−13m/s. These errors are floating-point scale relative to the~1.4millionkg/~5billionkg·m/s system. This audits the transaction at its endpoint; it does not claim conservation across gravity/drag/thrust evolution. Parent, partition mass/inertia, physical centroid offsets and original pieces are counted once.

## Irreversibility and scope

The exact loss state continues for30s through actual canonical steps with neutral manual pitch and throttle0, no pose/temperature edits. All three grids stay detached with reason1 at the endpoint, and later global terminal occurs at every rate. Source has one mutation of`attached` during evolution, `damage-detachment.ts:91` settingfalse; only fresh construction sets true (`damage-state.ts:133`). Thus intermediate reattachment is excluded by the source transition as well as the saved endpoints.

A separate loss-damage clone receives30s zero-flow/zero-heat standalone thermal/control evaluation and also remains detached. **Detached pieces have no modeled thermal cooling.** Their root temperatures remain frozen; residual hull temperature is also unchanged in this particular all-grids-gone zero-input clone. Do not call this a cooling replay or permanence-after-cooling validation. The actual neutral continuation remains exposed to real atmospheric flow/heat, so it is unloading the command, not erasing environmental forcing.

No production changes, additional tuned witness, heavy gate, natural nominal flight or release claim. First-rate runtime revised the conservative3–10minute estimate: the three actual runs total9.944s, excluding launcher overhead. All rate outputs and earlier negative traces remain preserved.
