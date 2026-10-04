# Source-frozen compiler trace result

2026-10-04 UTC. Exactly one approved compiler diagnostic completed with exit 0
on Node 22.23.3 after the lead granted an exclusive idle CPU slot and confirmed
the quality edits had stabilized. Revised broad source/harness pins were freshly
approved before execution. All before/after hashes match, covering source,
tests, scripts, root configuration/package files, `.nvmrc` and declared harness/
CLI files. CPU ownership was released immediately after completion. No benchmark,
production source change, runtime-policy change or acceptance claim followed.

The durable receipt is `fall-cloud-compiler-receipt`. Its `output.txt` contains
all 3,692 raw trace/driver lines; `v8-options.txt` and `compiler-flags.txt` record
the actual supported flags, and `mapped-events.json` identifies relevant raw
lines without discarding the full trace. Event line numbers below refer to this
raw log, not TypeScript source. Background compiler output interleaves portions
of some lines; those should be read cautiously rather than mechanically parsed
into unsupported claims. All driver warm/run counts and endpoint checks stayed
unchanged.

## Concrete compiler evidence

Both `fallAcceleration` and `advanceUnpoweredFall` completed TurboFan compilation
and optimization (raw 3368–3376). `writeAccelerationComponents` and
`validateDamageControlForcing` also completed TurboFan optimization (3080–3081
and 3065–3066). This rejects a premise that the hot kernel simply never reaches
the optimizing compiler.

There are explicit negative inline decisions for `fallAcceleration` into the
outer continuation: raw 3373–3374 and 3681–3687 say **Cannot consider ... for
inlining (reason: 5)**. This is actual trace evidence of that boundary remaining;
the trace prints a numeric reason, not a textual cause, so this result does not
invent a hidden-class or polymorphism diagnosis from it.

Initial `fallAcceleration` compilation positively inlines multiple helpers:
`rad`, drag coefficient/force, attack wrapping/folding, calm mean wind, ISA,
gravity, tangential acceleration, lift and sound-speed functions (3118–3359).
The subsequent compilation explicitly inlines `writeAccelerationComponents`
(3592) and `getCrossSectionalArea` (3646), in addition to gravity, wrapping,
drag/lift and sound-speed helpers. Considering a helper or listing it as a
candidate is not an actual inline decision. In particular, validation is
considered repeatedly but no positive inline event for it was found in this
captured trace.

Several explicit deoptimizations occur at workload transitions:

| Raw line | Function/event | Reported reason |
|---|---|---|
| 3024, following burn output | `getCrossSectionalArea` | lost precision or NaN |
| 3025 | `verticalGravityAcceleration` | insufficient type feedback for generic named access |
| 3026–3028 | ISA/table/pressure helpers | insufficient type feedback for generic named access |
| 3380, following normal-fall output | dependent `fallAcceleration` code marked for deoptimization | code dependencies |
| 3381–3382 | component composition and lift-sign helper | insufficient type feedback for compare operation |
| 3672 | `advanceUnpoweredFall` | insufficient type feedback for generic named access; bytecode offset 520 |

ISA and `fallAcceleration` subsequently complete reoptimization (3406–3407 and
3673–3674). The outer continuation completes OSR and ordinary TurboFan
reoptimization (3688–3691). These are concrete transition events, not evidence
of repeated per-step deoptimization. The trace has no kernel wrong-map bailout;
the visible wrong-map events refer to Vite import/transformation functions.
The trace does not establish object-map churn in the predictor or quantify
steady-state cost removable by a representation rewrite.

## Workload verification and interpretation

The driver outputs remain diagnostic only: burn 0.0433393475 ms/call; normal fall
0.98031897 ms/call; capped fall 3.89792198 ms/call. Trace overhead and compiler
scheduling prevent treating these as acceptance. Normal output retains 910
steps, reached 227.276593764986 s and 207713.16688728545 m downrange. Capped
output retains exactly 4,000 steps, unreached and 3246.2139561608574 m downrange.
Both retain 30-degree pitch. These match the preceding profile endpoints.

The unchanged unprofiled first-cloud bench remains red at normal 1.077726785 ms
and capped 3.89177782 ms. Actual evidence now identifies an un-inlined outer
force boundary and some transition deoptimizations, while disproving that all
composition/cross-section helpers remain un-inlined. No measured evidence yet
shows that fusing or scalarizing that boundary can recover the approximately
48.61% capped cost reduction. The continuation already uses local coordinates
and stable factory fields; all force arithmetic, scratch side effects, dynamic
validation, caller mutation semantics and both midpoint evaluations remain
required.

Provide the actual raw compiler trace and this mapped summary for fresh
independent assessment before selecting the remaining exact-output attempt.
No rejected experiment was replayed and no implementation attempt was consumed
by the diagnostic. There is no authorized lucky rerun or acceptance weakening.
