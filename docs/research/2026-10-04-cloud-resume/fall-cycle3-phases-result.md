# Cycle 3 attempt 1: phase diagnostic result

2026-10-04 UTC. Exactly one fresh-reviewed, exclusive-CPU diagnostic completed
with final/workload exit 0. All 752 broad source/harness pins match before/after;
the temporary driver was removed. Six separately labelled warm/measured Inspector
profiles, local CPU/cgroup/process census records and filtered optimized code
remain in `fall-cycle3-phases-receipt`. CPU ownership was released immediately
after completion. This is diagnostic evidence, not a new acceptance benchmark.

| Measured phase | Calls | Wall ms | Process CPU user/system µs | Local throttled periods / µs |
|---|---|---|---|---|
| Burn | 2,000 | 103.030512 | 100693 / 7299 | 0 / 0 |
| Normal fall | 200 | 198.744981 | 192897 / 11544 | 0 / 0 |
| Capped fall | 50 | 195.892997 | 178457 / 23228 | 0 / 0 |

All six phases, including warm phases, recorded zero local throttling. These
deltas cannot retroactively qualify earlier receipts without their own local
accounting. Cgroup totals include every contemporaneous process and compiler
thread. CPU/wall differences do not by themselves identify a numerical bottleneck.

Normal endpoints remain exactly 910 steps, 227.276593764986 s and
207713.16688728545 m downrange; cap remains unreached, exactly 4,000 steps per
call and 3246.2139561608574 m. Measured cap retains 200,000 midpoint steps and
400,000 force queries derived from the already proved two-query source topology.
No helper instrumentation, force skip, extra repetition or changed input occurred.

Inspector profiles contain a significant `post` sample for start/stop overhead:
normal measured has 248.909 ms total sample deltas versus its 198.745 ms section,
and cap 241.426 ms versus its 195.893 ms section. Do not divide kernel cost by
those whole-profile totals. The cap continuation subtree is 192.813 ms;
acceleration self is 96.959 ms (50.29%) and inclusive 170.150 ms; cap ISA visible
inclusive cost is 41.504 ms (21.53%). Normal continuation subtree is 191.319 ms;
acceleration self 123.596 ms, inclusive 172.687 ms; ISA inclusive 19.703 ms.
Attribution remains coarse (172 samples per measured profile); inlined work may
appear in the caller. ISA alone still cannot close the required 48.61% saving.

Filtered generated code contains two `fallAcceleration` TurboFan bodies of
10,028 and 10,152 instruction bytes. Each has 25 static named-load call sites
(23 `LoadICTrampoline`, 2 `LoadIC`), including namespace/property loads for
`planetRadius`, ISA, wind, angle helpers, control validation, `rad`, drag/lift,
composition, gravity and rotation rate. This establishes concrete surviving
module/representation operations beyond the rejected argument-boundary premise.
It does not establish their execution frequency or removable time share: guarded
fallback/deopt/slow paths are also printed, and static instruction counts are not
timing estimates. Allocation slow-path code likewise is not observed per-query
allocation proof. `generated-code-sites.json` retains those sites/property
contexts; phase-specific attribution JSON derives directly from each raw profile.

Raw generated-code/driver log SHA-256:
`092e49d875b8d9696937ee52b03a9a969878137e5fd3ab69e28c32c54b7c2261`.
Raw output is about 490 KiB, well inside the declared cap. The source-frozen
original acceptance remains red. Fresh assessment may investigate ordinary
production-bundle bindings as a distinct backend mechanism only after full
numeric/scratch/error equivalence proof; this result does not authorize changing
the production bench harness or claiming changed acceptance.
