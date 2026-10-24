# Default RTLS: timely-cutoff failure, then pressure breakup

2026-10-03. One declared flight only, unchanged default RTLS, seed1463897163 (0x57414c4b), production120Hz, Nodev25.8.1. Frozen esbuild bundle ran to first terminal at21.275s;49 recorded rows. Source/bundle hashes and the declaration accompany the harness/JSONL. This is diagnostic evidence, not release or runtime-performance acceptance.

## Established causal chain

No accepted cutoff publishes. A physically successful fine catch completes at16.30833333333305s, after its candidate's13.28333333333322s cutoff:3.025s late. Production correctly refuses that expired command. A new bounded job begins16.316666666666382s. The live vehicle remains in boostback, all13 engines lit, until dynamic pressure exceeds50kPa at21.275s.

| milestone | time, s | evidence |
|---|---:|---|
| First upper candidate complete |5.258333|5.033333s burn; cutoff12.991667; residual385.794138m; lateralFeasible=false |
| Two hints complete; root starts |5.291667|Root duration5.2s |
| Next root starts |7.258333|Prior5.2s burn, residual165.312208m; next5.325s |
| Fine validation begins |9.250000|5.325s burn, cutoff13.283333; coarse residual16.444199m |
| Fine proof completed |16.308333|2540 fine advances; reached=true, failed=false; secured zero velocity; fuel90961.501868kg; residual−0.001162987m |
| Observer predicts terminal |21.266667|Source1 revokes only because its next paid advance terminates before policy |
| Actual first terminal |21.275000|Pressure reason2, exact same terminal ledger as prior observer prediction |

At fine-validation start, only4.033333s remains before cutoff. With three search advances per live tick, this catch's2540 advances cost847 ticks,7.058333s. Preserving that candidate/proof and original budget therefore requires starting it at least3.025s earlier. This is a measured scheduling requirement, not authorization to raise budget, skip proof or change cutoff. Investigate earlier paid candidate selection or shared exact work; do not assume a faster wall-clock kernel changes the fixed mechanical scheduling deadline.

## Physical disposition

Before terminal q=49.919240993kPa; terminal q=50.009076696kPa. Terminal g=11.2985348 and surface temperature860.201109K. Hull remains valid at216.650000345K; all three grid roots remain valid at217.861209862K. No component detaches or material node becomes invalid before this terminal. All component failures are Terminal=3, created by the terminal transaction, not earlier hardware failures.

Previous live fuel75547.910295624kg; terminal retained/released mixture75465.086646287kg, the difference82.823649337kg paid in the final interval. Returned live fuel0 is release accounting. Terminal retained dry mass200000kg. No starvation or missing engine support explains this failure.

The continuing source remains lineage1/revision0 and valid throughout the decision window. At21.266667s its next mechanical advance produces the terminal, so expected pre-policy callback is absent and it revokes. The next real step produces the same terminal time, reason, pose, fuel and momentum ledger. This rules out a preceding observer comparison/provenance mismatch for this receipt.

## Original ignition timeline

The13 engine commands occur7.966666666666852s, drawing13 ignition-delay and13 ignition-failure values exactly once. Engine indices light at:2@8.275;3@8.391667;5@8.45;7@8.508333;9@8.516667;11@8.683333;10@8.766667;4@8.858333;12@8.875;0@8.983333;8@9.091667;1@9.125;6@9.158333s. No engine fails before terminal. Full original delays and intervening paid force/control state remain in the JSONL.

## Limits of the finding

This isolates RTLS's proximal failure and the missed scheduling deadline. It does not prove which generic candidate/cache/scheduling change can meet that deadline within existing bounds. The default booster-sep341.6s crash remains separately undiagnosed; it must not be folded into this result. No source, preset, physical threshold, test assertion, mechanical cap or seed changed, and no second flight was run.

Artifacts: booster-cycle2-attempt1-declaration.md; booster-cycle2-attempt1-source-hashes.txt; booster-cycle2-attempt1-bundle-hash.txt; booster-cycle2-attempt1-rtls.ts.txt/.jsonl. Frozen executable:/tmp/booster-cycle2-attempt1-frozen.mjs; raw summary:/tmp/booster-cycle2-attempt1-rtls.txt.
