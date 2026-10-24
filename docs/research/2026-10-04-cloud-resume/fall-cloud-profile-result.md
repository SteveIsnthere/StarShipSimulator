# Repaired cloud fall profile result

2026-10-04 UTC. Exact one CLI-repaired profile completed with exit 0 on Node
22.23.3, Linux x64. Before/after source and harness digests match. Fresh reviewer
approval and the lead's exclusive idle CPU-slot grant preceded execution. The
CPU slot was released immediately after the completed process. Production
source, tests, configurations and all work/timing budgets were unchanged.

The failed original CLI startup receipt remains preserved and is not counted
as a completed kernel profile. The repaired receipt is
`fall-cloud-profile-cli-fix1-receipt/`; its `fall.cpuprofile` is the raw artifact,
`output.txt` the complete driver output, and `attribution.json` the derived
sample summary. Profiling overhead means these per-call times establish no
budget acceptance:

| Diagnostic workload | Warm / runs | Observed ms/call | Endpoint |
|---|---|---|---|
| Burn | 200 / 2,000 | 0.0462680905 | start 69.09474954728736 m; duration 1.421244144191255 s |
| Normal fall | 20 / 200 | 1.25613866 | reached; 910 steps; 227.276593764986 s; 207713.16688728545 m downrange |
| Capped fall | 5 / 50 | 4.01329564 | unreached; exactly 4,000 steps; 3246.2139561608574 m downrange |

Both falls retain pitch 0.5235987755982988 rad. The exact cap count and unchanged
nonzero lateral displacement corroborate the original workload and the rejected
constant-motion memo assumption.

The accepted first-platform **unprofiled** bench result remains red: 12 tests,
10 pass; normal fall 1.077726785 ms against 1 ms; capped fall 3.89177782 ms
against 2 ms. Closing the capped cloud measurement would require approximately
48.61% reduction, much greater than the historical Mac's approximately 10.06%
gap. Do not substitute profiled times or historical platform times for that
baseline. No benchmark rerun occurred under this startup repair.

## Sample attribution and limits

There are 1,193 recorded samples spanning 1,356.331 ms in time deltas. The process
profile includes module import, transformation, JIT, warm-up and all three
workloads; it is not a capped-only steady-state trace. CPU profiles can attribute
inlined work to callers. Recorded frame line numbers are transformed-code
locations and are not verified current TypeScript source line references.

The principal `unpoweredFallInto` node has 519.544 ms inclusive sampled time.
Within that call tree:

| Visible node | Self ms | Inclusive ms | Inclusive share of fall tree |
|---|---|---|---|
| `advanceUnpoweredFall` | 48.480 | 510.187 | 98.20% |
| `fallAcceleration` | 255.195 | 456.420 | 87.85% |
| Fall `isaAtmosphereInto` | 17.797 | 59.218 | 11.40% |
| `writeAccelerationComponents` | 24.201 | 27.543 | 5.30% |
| `getCrossSectionalArea` | 24.421 | 24.421 | 4.70% |
| `writeDamageControls` | 3.349 | 3.349 | 0.64% |

Inclusive rows overlap and must not be summed. Separate burn/initialization
instances of functions are not merged into the fall-attribution percentages.
The dominant visible self cost remains the acceleration kernel, about 49.12%
of the fall tree, where trig and validation may be inlined. Across the entire
process GC accounts for 42.693 ms; the profile does not locate this entirely
inside the fall workload, so it does not establish a kernel allocation defect.
Imports/transform/loader wait also occupy substantial process samples and must
not be presented as predictor call cost.

This evidence confirms where to investigate but does not establish an exact-output
change capable of the required cloud reduction. Even ideal removal of the visible
ISA or component-composition call-tree cost individually would not close the
gap. Their actual removal is prohibited by the unchanged force laws anyway.
No new implementation, historical rejected patch replay, work reduction or
acceptance weakening follows from this profile alone. Give this source-pinned
artifact to a fresh independent performance assessment before selecting the
remaining bounded attempt; preserve the numerical oracle and all exceptions,
slice/interleave and mutable-scratch proof obligations.
