# Fresh independent high review: exhausted fall cost cycle 2

2026-10-04 UTC. Independent reviewer `fall_cycle3_review`. This assessment read
the repository AGENTS.md, all four checked-in skills, current GOAL/Phase8/handover,
cloud-resume index, retained runtime and research prototype, original timing
workloads, raw CPU profile and raw compiler trace. No build, test, browser,
profile or benchmark was executed; no production change was made. Source pins
for this assessment are in `fall-cloud-cycle3-independent-review-sources.json`.
Unavailable global review skills are not claimed used; this is the fresh-agent
fallback, not authenticated external review.

## Verdict

The smaller held-force interface is rejected as a performance solution. Its
76 exact proofs pass, but its sole unprofiled measurement exits1: normal fall
1.007851805ms and capped fall4.194675780ms. Relative to the original cloud
baseline1.077726785/3.891777820ms, normal improves6.48% but remains red; cap
regresses7.78%. This is one negative result, not a statistical estimate of
representation cost. No unchanged rerun or production adoption follows.

Original cap acceptance requires saving strictly more than1.891777820ms/call,
48.61% of measured baseline cost. At8000 force queries/call that is more than
236.472ns/query, with the complete predictor below250ns/query on average,
including initialization and integration. Starting from the rejected candidate
would require saving52.32%. Normal acceptance requires more than0.077726785ms
(7.21%) from the original; burn retains0.2ms. These budgets and original
200/2000,20/200,5/50 warm/measured counts remain binding.

No current evidence supports a specific exact-math implementation expected to
save48.61%. Feasibility in this ordinary cloud environment is **unproved**, not
disproved. Passing semantics and moving a boundary are insufficient evidence.
Do not claim the goal impossible, or solved by a runtime flag, from these data.

## Evidence independently checked

All five receipts (baseline, repaired profile, compiler, prototype proof and
prototype measurement) have identical before/after manifests, respectively
720,722,748,754,754 entries. Their retained guidance source pin is
`5698a8f7ad0da8927613a8cdd6efc2cfde88efd79563cc9d8f7bfd5c28f7ab77`.
Runtime is Linuxx64 Node22.23.3, V8 12.4.254.21-node.57. The current inexpensive
environment read reports AMD EPYC7763, five exposed logical CPUs and cgroup
`cpu.max=400000 100000` (four CPU equivalents). Cumulative throttling exists;
without section-local deltas it cannot be assigned to the predictor receipts.
A serial kernel does not automatically accelerate with additional quota.

Raw `fall.cpuprofile` contains1193samples and1356.331ms of deltas. The retained
fall subtree is519.544ms; acceleration self255.195ms (49.12%), inclusive456.420ms
(87.85%). Advance self48.480ms (9.33%), ISA inclusive59.218ms (11.40%), area
self24.421ms (4.70%), composition inclusive27.543ms (5.30%). Inclusive costs
overlap. This mixed import/burn/normal/cap profile cannot establish capped-only
costs. Even ideal zero-cost ISA would project baseline cap to approximately
3.448ms; ISA plus composition to approximately3.242ms. Both remain far above2ms,
and deleting either physical calculation is forbidden. Removing49.12% kernel
self cost would barely meet2ms, while that attribution includes indispensable
math and inlined operations: it is not a removable call overhead measurement.

Raw compiler lines3368–3377 and3672–3691 show optimizing compilation, recovered
transition deoptimizations, and repeated outer `fallAcceleration` inline refusal
reason5. Lines3592/3646 explicitly inline composition/area. No repeated kernel
wrong-map storm is established. The held-interface experiment directly tests a
smaller dispatch boundary and fails cap; a second signature/shape rewrite has
no independent savings case. Full loop fusion is a different compiler hypothesis,
but duplicating two force bodies may enlarge optimized code and lose helper
inlining. Neither a guaranteed benefit nor a48.61% saving follows.

Runtime inspection finds per-query ISA, sqrt, atan2, attack fold, incidence/area
trig, sound speed, drag/lift, composition and gravity, plus dynamic damage
validation. Shared composition already reuses motion sine/cosine and sign. The
prepared zero-control branch already avoids full root mechanics when valid.
The retained source deliberately preserves gravity subtract/add order, zero
thrust multiplication and conditional fixed thrust. Geometry is not invariant:
the30degree attitude produces lateral displacement3246.2139561608574m at cap.
Thrust cannot be silently hoisted because callers may mutate scratch between
slices. Reducing math, skip counts or validation changes the contract.

## Concrete bounded next task: identify the removable portion before implementation

Open cycle3 with **one declared diagnostic**, not an implementation or acceptance
rerun. Prepare a research-only driver preserving original workloads, execution
order and every warm/measured count. Start/stop Inspector CPU recording around
each measured workload so capped-only and normal-only attribution are separate;
do not add repetitions. Record section-local wall time, `process.cpuUsage`,
cgroup `cpu.stat` deltas and contemporaneous process census. Obtain the parent's
exclusive CPU slot after its browser/GPU work completes. Freeze broad source,
harness, package/config and CLI pins; no production mutation or dependency install.
Check exact endpoints and4000steps, retaining original oracle/query semantics.
Profiled timing is diagnostic only. Preserve a failed launch; repair only after
fresh review, not by silently rerunning. Do not run this task during this review.

The same bounded diagnostic may capture supported filtered optimized-code output
for the retained force and continuation (preflight the installed Node's options).
Inspect actual generated calls/loads and optimized helper boundaries, separating
numerical math from dynamic dispatch, object access and module bindings. Compiler
flags are restricted to evidence capture, not proposed production policy. Named
function samples can hide inlined validation/access cost; generated code can
clarify that, but static instruction counts alone are not time estimates.

The decision threshold is quantitative: establish a defensible path to removing
more than48.61% of original cap cost while retaining all exact math. If removable
representation overhead is a share S, the required fractional elimination is
greater than0.486096/S; S at or below0.486096 cannot close the cap even ideally.
For example S=0.60 requires eliminating more than81.02% of that overhead. This
is a justified savings target, not an invented expected speedup. The current
evidence supplies no reliable S and therefore no credible expected saving.

Only if the diagnostic supports sufficient overhead should the next independent
review select a research exact scalar/fused evaluator. Require the frozen original
and retained production as independent oracles; preserve complete scratch/work,
Object.is signed-zero equality, exceptions and side effects, sliced/interleaved
mutation positive controls, damage overflow/inventory checks, two force queries
per iteration and8000at cap. Reuse all76proof obligations and original dense
proofs. A proof-green candidate then earns exactly one separately declared
unprofiled timing attempt with unchanged originalcounts and limits. Otherwise
record that no evidence-backed exact candidate has been found and keep the
acceptance blocker open; another representation guess is not justified.

Full gate, coverage, goldens, browser/frame acceptance and integration review
remain separate outstanding obligations. This review authorizes neither math
approximation, altered physics, environment-specific budget relaxation, a new
product decision, nor merge/publication.
