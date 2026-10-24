# Full-capacity pristine exposure — single actual-flight outcome,2026-10-03

**Negative combined proof witness. Natural heating succeeded; applied elastic authority change and proof loss did not.** The one authorized run stopped on the unchanged skin-temperature guard during the paid burn. No retry or production changes were made. Declaration, reproducible script and sampled trace are `full-tank-live-declaration.md`, `full-tank-live-diagnostic.ts.txt` and `full-tank-live-diagnostic.jsonl`; source hashes are recorded in the trace before execution.

## Measured outcome

| Boundary | Actual evidence |
|---|---|
| Initialization |80km, circular7860.594m/s, full3650000kg fuel, pitch−π/2, zero spin/wind, pristine198.638576K roots, grids neutral|
|800°C trigger |495.316667s; roots1073.158160K, altitude79454.965m, speed7855.566m/s, skin1387.303K, q620.570Pa|
| Real ignition |All33requested through `toggleRaptor`; deterministic countdowns0.302796–1.185825s; real fuel paid, no running-mask injection|
| First terminal |568.925s, before4000m/s cutoff; skin1533.084218K, q7183.186Pa, felt4.675286g|
| Terminal motion |Hull altitude57638.740m, airspeed5892.846m/s; pitch−2.263562rad; snapshot spin−0.009508567rad/s|
| Hardware |Roots1139.861879K, below1173.15K mechanical-domain boundary; no proof/domain or ownership event before terminal|
| Fuel |Terminal snapshot retains1813232.671kg before legacy cleanup; zero published fuel after terminal is not physical burn exhaustion|

The original50kPa and13g guards remained below threshold. Terminal reason4is`Temperature`; every grid's final disposition is terminal transfer, not progressive proof detachment.

## Actual first divergence from analytical ideal braking

The frozen analytical estimate assumed a symmetric, exactly retrograde force throughout braking. The real individual ignition delays are unequal. Partial engine availability produces off-axis torque during startup, even though all engine commands were issued together. The first sampled burn states depart from zero spin, and once all engines are running the acquired spin remains approximately−0.0095086rad/s. No attitude hold or artificial damping was declared or applied.

Pitch then drifts from−90° at burn request to approximately−129.69° at terminal. The thrust progressively points downward; actual descent becomes much faster than the fixed-horizontal-thrust perturbation estimate. At73.61s after requesting ignition, the hull is already at57.64km and still moves at5.89km/s. Increasing density overtakes the speed reduction; the unchanged equilibrium skin guard terminates the flight. This is an ignition/attitude/trajectory divergence, not a root thermal-capacity, fuel-budget or material-domain failure.

The terminal event snapshot preserves the pre-reset spin/fuel; reported live spin0and fuel0after breakup are cleanup symptoms and must not be used to diagnose the preceding motion. All original torque/actuator authority remained unchanged.

## Thermal authority evidence and limitation

The exposure naturally raises root temperatures from198.64K to1139.86K, crossing several sourced mechanical knots with finite energy. The nonmutating45°hypothetical authority probe at the800°C trigger gives live angle0.785386642rad versus cold0.785391512rad at identical current flow: thermal capability is measurably reduced, with no proof/domain mask.

However, actual grids remained neutral during the entire coast/burn, exactly as declared. Their delivered angles and actual grid forces remained0. Therefore maximum **applied** thermal angle/lift/drag reduction is0; hypothetical capability change is not applied flight-control degradation. The cutoff/45°actuation phase was never reached. This run must not be promoted to natural applied-control or proof-loss acceptance.

The cold comparison clone remained unchanged. Source material, root geometry, physical limits, fuel capacity, initial seed and controls were not adjusted after observing the result.

## Next decision boundary

Do not repeat this run automatically. Any new attempt first needs an evidence-backed assessment of existing attitude-hold behavior under staggered ignition, including actual RCS/gimbal authority and fuel bookkeeping. The already observed first divergence supports investigating that existing control path; it does not authorize torque/reserve increases, simultaneous ignition injection, orientation resets or a custom hold. Preserve this negative result and the off-nominal editor/operational-mission distinction.
