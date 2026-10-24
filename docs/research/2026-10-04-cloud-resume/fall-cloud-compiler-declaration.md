# Source-frozen cloud compiler diagnostic declaration

2026-10-04 UTC. Prepared following the
[fresh independent assessment](fall-cloud-independent-performance-assessment.md).
The raw CPU profile cannot show optimization tiers, actual inline decisions or
deoptimization reasons. This one bounded unchanged-kernel run gathers those
traces before choosing the remaining implementation attempt. No production
source, tests, dependencies, runtime configuration or acceptance budgets change.

The supported Node 22.23.3 V8 inventory advertises all four declared flags:
`--trace-opt`, `--trace-deopt`, `--trace-turbo-inlining`, `--trace-file-names`.
Preparation inspected that inventory without executing any workload. The runner
will retain the exact inventory and fail closed if any flag is missing. It will
not substitute unsupported flags or runtime options. The diagnostic uses normal
optimization decisions; it does not force compilation tiers or alter V8 policy.

After independent review approval and an explicit lead grant of the exclusive
idle CPU slot, execute exactly once from the repository root:

```bash
STARSHIP_CPU_SLOT_GRANTED=fall-diagnostic bash docs/research/2026-10-04-cloud-resume/run-fall-cloud-diagnostic.sh compiler
```

`fall-cloud-compiler-receipt` is distinct from the completed baseline/profile
receipts and rejected CLI startup receipt; `mkdir` refuses any existing receipt.
The repaired CLI path resolves from package exports, crosschecks the declared
bin and regular-file existence, and records its path/hash. The runner captures
HEAD, dirty status, actual Node architecture/runtime, all files under `src/`,
`tests/` and `scripts/`, all root `package*.json` and `*config.*` files, `.nvmrc`,
and the declared research harness hashes before and after; the V8 inventory,
declared flags, combined
raw compiler/driver output and actual exit status. Source changes during the run
invalidate its pinned result. The driver is a temporary unique `.ts` sibling of
the preserved `.txt` and is the only temporary file removed after execution.

The immutable `fall-cloud-profile.ts.txt` driver stays byte-for-byte unchanged:
burn 200 warm/2,000 measured calls; normal fall 20 warm/200 measured calls;
capped fall 5 warm/50 measured calls. Original inputs, varying burn-speed inputs,
all 4,000 capped midpoint steps, both force queries and endpoint checks remain.
Its logged times include compiler-trace overhead and establish **no acceptance**.
Do not rerun the unprofiled baseline, revive the rejected thrust preparation or
memo, reduce work, change warm/run counts or weaken any numeric/timing assertion.
This source-frozen diagnostic does not consume an implementation attempt.

Map actual trace entries for `fallAcceleration`, `advanceUnpoweredFall`,
`writeAccelerationComponents`, ISA, damage validation and their hot helpers.
Separate startup/import/tooling compiler events from kernel events. Report
which tiers actually completed, explicit deoptimization reasons and sites, and
positive/negative inline decisions; missing entries establish no such claim.
Compiler addresses are process-local and transformed frame locations need
source mapping before treating them as TypeScript line references. A visible
helper node in the CPU profile was not proof of failed inlining. Likewise,
tracing a successful optimization alone is not proof that a rewrite will meet
the required approximately 48.61% capped reduction.

Only an evidenced mechanism may inform the next exact-output candidate. Preserve
original arithmetic/order, scratch side effects and caller mutations, exceptions,
signed zeros, both midpoint force/ISA evaluations, and slice/interleave semantics.
If no actionable mechanism is found, retain that negative evidence and seek
fresh assessment; do not manufacture an optimization premise or run for luck.
