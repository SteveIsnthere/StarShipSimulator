# Cycle 3 phase-separated kernel diagnostic

2026-10-04 UTC. Research preparation only following the
[fresh independent cycle-3 review](fall-cloud-cycle3-independent-review.md).
The exhausted cycle-2 candidate remains rejected. No implementation is selected,
no benchmark acceptance rerun is authorized, and no production/runtime policy
or numerical limits change.

Run exactly one source-frozen diagnostic after fresh harness review and the
parent's exclusive CPU grant. The driver calls the retained original functions
in original order: burn 200 warm / 2,000 measured calls, normal fall 20 / 200,
capped fall 5 / 50. Original inputs, burn-speed variation and separate original
scratch per workload are preserved. Inspector CPU profiles start/stop around
each warm and measured phase; six profiles are labelled separately. There are
no extra warm-ups, repetitions or sentinel force calls. Profiler sampling uses
Node's default interval, without forcing optimization tiers.

Each phase records process CPU usage in microseconds, local monotonic wall time,
cgroup `cpu.stat` before/after/deltas, and contemporaneous `/proc` process census
(names/IDs/CPU ticks, no command-line/environment credential data). Inspector
start/stop and census collection are outside wall/process-CPU intervals; the
CPU profile includes nearby cgroup reads, which must be separated from kernel
attribution. The runner records cgroup location/quota and `CLK_TCK`. Cumulative
throttling is not assigned to a workload; only local deltas may support a claim,
and cgroup totals include all contemporaneous processes. Logged times include
profiling/generated-code-output overhead and establish **no timing acceptance**.

Every fall call checks source-pinned exact reached/time/downrange and step
endpoints from the existing Node22 receipts: normal 910 steps, cap 4,000 steps.
All 50 measured cap calls retain 200,000 midpoint steps. Force counts are explicitly
derived from the retained, independently proved two-query midpoint topology:
8,000 per cap call, 400,000 for measured cap. They are not a new observed spy count;
no helper wrapper or breakpoint is inserted to perturb kernel attribution.
Endpoint/assertion bookkeeping adds a small declared diagnostic overhead while
leaving every original force evaluation and expression untouched.

Exact Node 22.23.3 V8 inventory advertises `--print-opt-code` and
`--print-opt-code-filter`. The runner captures that inventory and fails closed
if either is missing. Only `--print-opt-code --print-opt-code-filter=fallAcceleration`
are passed for generated-code evidence; no tier/inline/physics policy is forced.
Imports/tooling and Inspector activity are identified separately from force math.
If no filtered code is produced, report missing evidence rather than silently
rerunning. Prior raw compiler/profile/candidate failures remain preserved.

Bounded storage: raw stdout/stderr file capped at 32 MiB by the shell file-size
limit; each JSON/profile artifact <= 8 MiB and aggregate driver JSON/profiles
<= 32 MiB. Wall execution is bounded to 30 seconds. Exceeding any bound is a
retained diagnostic failure, not permission to truncate and claim success or
repeat unchanged. The runner records exit status, broad before/after source/
script/config/package/harness and resolved CLI hashes, exact Node options,
process/cgroup preflight metadata and all raw phase artifacts. Receipt-directory
creation refuses overwriting. Temporary source copies are uniquely named and
removed on success/failure; original source and harness remain unchanged.
An EXIT trap records the final script status and last attempted stage for every
post-receipt failure, including early preflight or source-snapshot failures.
The kernel workload status is recorded separately when it ran; a later source
integrity failure remains final exit 70 rather than being masked by workload 0.
If complete before/after manifests were not produced, verification is explicitly
unavailable. Early runner stderr and any cleanup failure are retained too.

Only a quantitatively defensible removable-cost mechanism exceeding the
48.61% required original capped saving can justify a new exact-output prototype.
ISA/composition inclusive shares overlap and cannot be summed or deleted. The
failed smaller boundary provides no renewed savings premise. Generated static
instruction counts are not timing estimates; unavoidable canonical libm and
physics work cannot be relabelled removable overhead. Fresh independent
assessment must inspect the actual phase-specific profiles and code before
selecting any implementation. This diagnostic is cycle-3 diagnosis, not an
unreported extra candidate attempt.
