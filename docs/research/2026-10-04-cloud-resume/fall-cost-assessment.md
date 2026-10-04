# Fall predictor: read-only cost assessment

2026-10-04 UTC. No source edits, benchmarks, flight integrations or new performance
results were produced for this assessment. The current retained Mac Node 22 result
is **2.223620840 ms against the unchanged 2 ms cap**, recorded in
[cycle 2](../2026-10-03-vehicle-realism/fall-performance-cycle2.md). Cycle 2
attempt 2 was rejected at 2.321600 ms. One implementation attempt remains before
another fresh independent review. This assessment does not consume that attempt.

Updated execution decision: the user's subsequent instruction authorizes running
all acceptance here and fixing unsupported execution. The historical Mac result
remains historical evidence; it is not a measured result on this cloud machine.
Recommendation: obtain one source-pinned first-platform cloud baseline of the
unchanged timing suite under Node 22.23.3, then a bounded CPU profile if needed
before selecting attempt 3. Source
inspection and the retained evidence do not establish an exact-output
optimization with sufficient likely savings. No automatic ISA shortcut,
geometry memo, thrust-hoisting retry or unchanged acceptance rerun is justified.

## Why the evidence is insufficient

Closing the existing measurement requires more than 0.223620840 ms, or roughly
10.06% of current call cost. The cycle-2 record attributes only 7.2% inclusive
cost to ISA: even eliminating that entire reported cost would not close the
gap. This is a feasibility comparison using an earlier profile, not a current
runtime measurement or a hard lower bound. The retained textual standalone
profile receipt explicitly identifies Node 25.8.1; it must not be relabeled
as a Node 22 attribution. The actual raw profile referred to by the earlier
investigation is an absolute `/tmp` path, not a retained repository artifact.

`fallAcceleration` evaluates two force queries per midpoint step, for 8,000
queries at the 4,000-step cap. The variable motion uses `atan2(rx, ry)`;
area uses sine and cosine of the folded attack; component composition uses
sine and cosine of motion. These angles differ, so substituting one pair for
the other is not exact. Composition already shares motion trig and lift sign
between both axes. The prepared zero-control path already avoids the
validation-only incidence sine. Cross-section area then evaluates each folded
angle trig function once; lift uses its original piecewise coefficient, not
another trig evaluation. There is no remaining duplicate same-angle sine
in this path whose removal is supported by inspection.

The capped benchmark starts from the reentry preset, retaining its 30-degree
pitch. Lift changes horizontal motion despite zero initial speed and wind;
the recorded 3,246 m displacement confirms this. Geometry cannot be memoized
under a constant motion assumption. Wind already short-circuits to exact zero
in calm air. Root queries already return early for zero commands, and held
control preparation avoids repeated root evaluation. Further changes there
need current cost evidence, not the historical pre-preparation profile.

Signed-zero products, gravity cancellation/order, scratch mutations between
slices, nonfinite rejection and finite force-scale overflow are part of the
existing proof contract. Removing force terms merely because nominal thrust
or density is small, computing sine/cosine via normalized velocity, sharing
algebraically similar products with reordered arithmetic, or reducing
midpoint queries would not be an established exact-output Refactor.

## Bounded portable diagnostic

The lead must pin the final restored source manifest or immutable commit
before executing the portable diagnostic. HEAD alone is insufficient:
this assessment inspected restored uncommitted source above
`dd72908e9e5e277f63af27fbdb64d560bc9af355`.

| File | SHA-256 at assessment |
|---|---|
| `src/core/control/guidance-physics.ts` | `5698a8f7ad0da8927613a8cdd6efc2cfde88efd79563cc9d8f7bfd5c28f7ab77` |
| `src/core/physics/components.ts` | `8e2b3351beb67380842bd7d7b28a6b97b4ba0ad2847c134c002a62397991ffc4` |
| `src/core/physics/aero.ts` | `07542ac5bc81c74a6b8888fa272f0e4e3baac036adc9c8a27f5b52fcb7cabc6e` |
| `src/core/physics/isa.ts` | `bd83423a16ae1362073dc9f2a3e733a16125bfdb51cb03ca081c079da52a804e` |
| `tests/core/guidance-physics.timing.test.ts` | `8bfddfb28e72aee994f6a7fe0d352b13df76a63706cc4c58bd211c26a4965358` |
| `docs/research/2026-10-03-vehicle-realism/fall-idle-profile.ts.txt` | `88166e066ed77eea03d5227701a792d4caa27283231cb046b15f7cea3364a141` |

The executable plan is [fall-cloud-diagnostic-declaration.md](fall-cloud-diagnostic-declaration.md),
[runner](run-fall-cloud-diagnostic.sh) and [profile driver](fall-cloud-profile.ts.txt).
The baseline executes the entire original bench suite, including all three
guidance tests, untouched. Only a fall-cost failure justifies the separate profile
driver preserves all three original warm/run counts and inputs, but only gathers
diagnostics: it asserts no timing acceptance. Neither has been executed by this
assessment. CPU ownership must be granted after separation work releases it.

Inspect inclusive and self costs with inlining caveats and GC/deoptimization
activity. If an exact representation/call-boundary change in the acceleration
kernel is justified, declare it before implementation, preserve the original
scalar midpoint oracle, prove original results and exceptions over the dense
existing domain plus the new changed boundary, and preserve slice/interleave
and mutable-scratch witnesses. Cloud can run the CPU proofs, baseline and
unchanged post-change acceptance under the user's superseding instruction.
Preserve original warm-up/run counts and all three budgets. A green cloud
baseline establishes this environment's result and cannot rewrite the historical
Mac red or establish GPU/frame/gameplay acceptance by itself.

If no justified candidate emerges, retain the red result and obtain a fresh
independent assessment of the new profile. If attempt 3 is implemented and
fails, end cycle 2 and use a fresh independent review before any next attempt.
Do not rerun unchanged timing for luck or weaken any bound.
