# Existing-hold natural exposure — third authorized actual diagnostic,2026-10-03

**The prescribed off-nominal editor flight demonstrates natural applied thermal authority reduction followed by in-domain proof loss below the original global guards.** This is not a nominal-scenario, operational Super Heavy mission, dt-refinement or release-acceptance claim. Exactly one run was executed after lead approval; no controller/material/geometry/limit changes and no fourth flight.

Inputs/caps remain those in `full-tank-live-declaration.md`; the sole declared change is the existing paid attitude utility during the burn, approved in `existing-hold-review-third-declaration.md`. `hold-live-diagnostic.ts.txt` is the reproducible actual120Hz step script; `hold-live-diagnostic.jsonl` contains declaration, pre-run source hashes, sampled controls/energies/forces and exact event endpoint. `hold-proof-reconstruction.ts.txt` evaluates source constitutive equations at that saved endpoint only; it is not another flight.

## Event sequence

| Event | Measured result |
|---|---|
| Pristine full-capacity initialization |80km, circular7860.594m/s, full3650000kg fuel, ambient198.638576K, retrograde pitch−π/2, zero spin/wind; no injected damage/temperature|
| Source800°C trigger |495.316667s, roots1073.158160K, altitude79454.965m; all33real ignitions requested|
| Paid speed cutoff |599.391667s, relative airspeed3999.832941m/s, altitude67831.972m; remaining fuel1044578.236kg; all engines shut down through command|
| Actual45°actuation |Manual command after cutoff, existing actuator slew from neutral; no extension reset|
| First progressive event |645.833333s, all three grid roots latch`ProofExceeded`, revision1; terminal remains inactive|

At proof event:

- q15823.890Pa <50000Pa.
- Legacy skin1433.487944K <1533K.
- Felt specific acceleration0.707152g <13g.
- Root1126.580834K <1173.15K mechanical availability boundary; no thermal invalidity or domain disposition.
- Hull altitude44510.693m, speed3880.377m/s; fuel1044578.236kg retained, engines off.

`permanentFailure=1` on the three source grids means proof loss; there is no terminal payload/reason. The post-transaction canonical writer skips detached components and consequently returns zero masks/areas. Those post-commit zero masks do not erase the recorded proof disposition.

## Actual applied thermal signal

At the last sampled healthy endpoint645.808333s, actual and cold-reference commands are both45° at identical liveq/incidence. The delivered live angle is0.785032029rad versus cold0.785229096rad. The difference0.000197067rad is approximately0.0113°. Aggregate source-law grid lift is0.08985N lower and drag100.724N lower than the cold comparator. These are small real surrogate effects; do not amplify them or describe accumulated plastic wear.

The maximum healthy endpoint angle reduction tracked every tick is0.000197511rad. Early coast/burn hypothetical45°probes remain labeled separately and are not used as applied-control evidence. The cold clone is unchanged. Actual applied grid forces after real deployment supply the pre-loss comparison; zero post-detachment area is not counted as continuous softening.

Saved endpoint source reconstruction independently separates hot proof demand from cold hardware:

| Same actual flow/45°command | Ambient cold reference | Actual hot root |
|---|---:|---:|
| Proof capacity |223.000MPa|47.573675MPa|
| Loaded demand |47.623454MPa|47.618463MPa|
| Demand/proof ratio |0.213558|1.000941|

The material has thermally lost proof capacity, while passive compliance slightly reduces the demand. The cold body would remain far below proof at the same flow. This is a conservative sourced proof-stress connection disposition, **not measured fracture strength or proprietary V3 failure prediction**.

## Hold and paid actuator observations

The existing utility arrests the staggered-ignition disturbance without changing authority. Sampled burn spin magnitude is at most8.63e−6rad/s and pitch stays within approximately2e−6rad of initial retrograde. RCS reserve falls from25to24.912514s by cutoff, about0.08749equivalent full-thrust seconds; no reserve was added. Paid fuel and observed7.1101g near cutoff remain consistent with the analytically predicted mass/force scale.

At cutoff hold is disabled and manual full-grid command resumes. The utility-enabled RCS remains enabled under the unchanged existing controls, so that full manual yoke also commands real RCS until its finite reserve empties. This is inherited actuator coupling, not new authority or a hidden attitude servo. It contributes substantial entry spin; the eventual proof event is therefore not a tidy held-attitude maneuver. It remains an actual paid/free dynamic trajectory and the same-flow hot/cold comparison isolates thermal capability at its real flow.

The existing reserve arithmetic overshoots zero by0.004153s on its last firing tick and then stops firing; this run did not modify that historical behavior. Log this limitation rather than claiming exact nonnegative RCS accounting. No extra RCS was supplied. Final spin2.242641rad/s and actual body rotation are preserved in the proof trace.

## Acceptance limits

This resolves existence of one pristine actual editor trajectory with applied thermal weakening and in-domain proof loss under the frozen surrogate. It does not establish realistic booster orbital operations, nominal preset outcomes, visual readability of the tiny elastic signal,120/240/480Hz event convergence, independent whole-phase review, gate/bundle/performance compliance or permanence-after-cooling replay. The existing irreversible disposition records loss; no cooling replay was run here. Those requirements remain separate.

Preserve the two earlier negative traces alongside this source-approved third candidate. Do not execute a fourth flight automatically, alter the proof source/guards, or present this as final phase/release acceptance.
