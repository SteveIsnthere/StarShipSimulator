# Retained failed SSR profile: cause and bounded cost evidence

The original standalone diagnostic remains **exit1**. Its raw `deepStrictEqual` witness comparison stopped at actual `forces.aftFinDrag=-0` versus stored witness `0`; JSON serialization cannot retain signed-zero identity. No assertion was weakened, no original receipt changed and no profile/flight was repeated. The second, separately reviewed offline arithmetic completed successfully after a diagnosed change to the failed first arithmetic's timestamp assumption.

Exhaustive **JSON-storage comparison** found zero differences in all seven selected physical trees (`kinematics`, `vehicle`, `forces`, `atmosphere`, `engines`, `status`, `failures`) for both current and previous observations, plus catch tick40550 and current time337.91666666652367. This checks every retained storage field; it cannot recover raw signed zeros elsewhere, whole-state RNG/damage/planner identity or establish a bit-exact witness. The raw failure remains in the analysis output with `bitExactWitnessClaim:false`.

Final arithmetic input source/declaration pins were independently approved; actual one-run output is `ssr-profile-retained-analysis-v2.json`, SHA256 `65f6bfd571b42c9cfaebf12b42ffc974ded33dd0c1a99b78f1491214925e1180`. It records31437native samples, raw signed delta sum35597717microseconds and the unchanged negative delta at sample22346:-3microseconds. V1 source/failure are preserved. Native sample counts are primary; signed deltas are only a labelled diagnostic weighting proxy, never exact CPU time or accepted duration. This is not a green profile or Vitest/gate timing proof.

## What the existing samples support

| Source function | Exclusive leaf samples | Inclusive ancestry samples | Inclusive share of31437 |
| --- | ---: | ---: | ---: |
| `terminalBurnDue` |91|18525|58.93%|
| `landingBurnStartAltitude` |709|18314|58.26%|
| `commandGridTorque` |67|2091|6.65%|
| `writeFlightGridForces` |377|2873|9.14%|
| `writeDamageControls` |988|2894|9.21%|
| `loadedRootAngle` |1001|1592|5.06%|

Inclusive rows overlap; they cannot be added. URL/function-name aggregation merges same-name callsites. The largest exclusive source functions were `pressureInLayer`4671samples (14.86%), `burnDeceleration`3869 (12.31%) and `tailFirstDragDeceleration`3314 (10.54%). These are original changing-state burn physics queries, not material-grid preparation. No direct `steelProofStrength` leaf/ancestry node appears in this sampled profile; inlining or sparse sampling means that does not prove zero material evaluation cost.

Native sample endpoint allocation to recorded pre-step live spans: unset34, align-boost2251, boostback2933, coast17129, entry8310, terminal779, outside declared spans1. Within coast, `landingBurnStartAltitude` ancestry covers9908samples; within entry6026. Work inside those windows can include scheduled forecast/future-policy operations: a live phase span does not establish the internal policy phase of each call. Preserve endpoint jitter and no boundary/intra-step precision claim. The terminal span is about0.849seconds in the recorded standalone harness; that is diagnostic wall time with overhead, not acceptance.

Disjoint grid-query ancestry buckets contain2012command-target samples,168other alignment-delivery samples,152forecast/rollout-name-matched samples and541other live/fall samples. Name matching is a heuristic, not exact mechanics/call counting. The command-dependent `loadedRootAngle` solve remains a substantial part of grid/control ancestry; fixed preparation cannot remove it.

No exclusive sample leaf has a vite-node/Vite/Vitest library URL. This does **not** establish zero SSR dispatch overhead. Anonymous frames mapped to source URLs include constants728, units380, aero661 and propulsion322samples; some may be transformed import/export bindings, and source URL/name data alone cannot uniquely separate those from original anonymous functions. Their original frame locations are retained in the native profile. A new transform/instrumentation experiment would be a separate reviewed diagnostic, not an inference from absent library frames. This single SSR process cannot reproduce Vitest three-worker contention or repair its30second timeout receipt.

## Bounded next proposal

Repeated burn-source ancestry, not terminal material preparation, motivates considering a private one-call immutable burn context. Source inspection shows every midpoint recomputes the same per-engine sea-level mass-flow/vacuum-thrust/effective-exit-area expressions and exact tail-first projected area while pressure, altitude, speed and mass continue to vary. `prepared-burn-context-refactor-proposal.md` describes hoisting only those fixed expressions with exact original order, preserving all ISA calls, pressure-dependent terms,1200/24caps,1kg root tolerance, scratch outputs and physical trigger. The sample profile cannot quantify the achievable gain or guarantee the30second/300second limits. Implementation is not approved; fresh high review and meaningful original-source domain oracles are required first.
