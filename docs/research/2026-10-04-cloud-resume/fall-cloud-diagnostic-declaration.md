# First cloud fall-cost diagnostic declaration

2026-10-04 UTC. Prepared only; no timing or profiling run has occurred here.
The user superseded the earlier Mac-exclusive execution requirement by directing
all checks to run here (exact user instruction: "it shouldnt be mac exclusive, everything should beable to run in this env, if not fix it"). This is one first-platform baseline of the retained
implementation, not a retry of the failed Mac measurement. No implementation
attempt is selected; cycle 2 still has one attempt remaining.

After the lead grants the idle CPU slot and any active build/check finishes,
run from the repository root:

```bash
STARSHIP_CPU_SLOT_GRANTED=fall-diagnostic bash docs/research/2026-10-04-cloud-resume/run-fall-cloud-diagnostic.sh baseline
```

The runner sources the existing managed activation route, requires exact Node
22.23.3, records architecture/platform, HEAD and dirty status, and hashes every
file in `src/`, `tests/` and `scripts/`, all root `package*.json` and `*config.*`
files, `.nvmrc`, and the declared research harness files before and after
execution. It refuses to overwrite an existing
receipt directory and reports source changes as failure. It changes no source,
dependencies, config, acceptance threshold or golden fixture. The explicit slot
grant is orchestration, not an idle-machine detector: the lead must establish
exclusive idle CPU ownership and record that condition.

Baseline command is the entire unchanged `npm run bench` suite through the
checked-in `vitest.timing.config.ts`, qualifying every preserved timing budget
once on this platform. Its guidance subset retains burn 200 warm/2,000 measured calls with
0.2 ms limit; normal fall 20 warm/200 measured calls with 1 ms limit; capped
fall 5 warm/50 measured calls with 2 ms limit. Each capped call retains 4,000
midpoint steps and both original force queries per step. Capture full output
and actual exit code. No test retries or unchanged lucky rerun.

Only if the baseline shows a fall-cost failure justifying attribution, after inspecting it and retaining its
result, the lead may explicitly run the separately bounded profile once:

```bash
STARSHIP_CPU_SLOT_GRANTED=fall-diagnostic bash docs/research/2026-10-04-cloud-resume/run-fall-cloud-diagnostic.sh profile
```

The profile uses the retained input/workload/call counts, Node `--cpu-prof`,
and a temporary `.ts` sibling of the research driver so imports remain valid.
It records raw `.cpuprofile`, numeric endpoints, and observed per-call times.
Profiling adds overhead; these times are diagnostics and cannot overturn the
baseline. Top-level import/JIT/warm-up samples are included; do not treat all
process samples as steady-state attribution. Inlining obscures named self
cost; compare inclusive cost and GC/deoptimization evidence before proposing
an exact-output change. The driver validates actual reached/capped behavior
and full capped-step count. It does not integrate live gameplay.

A first cloud green is this platform's CPU evidence; historical Mac results
remain unchanged. A cloud red requires evidence-backed diagnosis with unchanged
limits. If attempt 3 is eventually implemented and fails, obtain a fresh
independent review before opening another cycle. No rejected historical delta
is replayed by these scripts. Gate, coverage, GPU/frame and live-build acceptance
remain separate obligations.

## CLI startup repair 1

The first cloud bench finished: 12 tests, 10 passed, normal and capped fall
failed; capped cost was 3.89177782 ms against the unchanged 2 ms bound.
The requested first profile then failed **before any workload** because the
runner referenced nonexistent `node_modules/vite-node/vite-node.mjs` in the
locked vite-node 6 package. The full error, exit 1, source hashes and startup-only
raw CPU profile remain in `fall-cloud-profile-receipt`; that raw profile is not
an acceleration-kernel profile.

This research runner repair resolves the package's exported CLI and declared
bin, requires both to identify the same existing regular file, and pins its
package metadata/CLI file. The actual locked package points to `./dist/cli.mjs`.
The repaired run uses a new receipt directory, preserving the failed startup:

```bash
STARSHIP_CPU_SLOT_GRANTED=fall-diagnostic bash docs/research/2026-10-04-cloud-resume/run-fall-cloud-diagnostic.sh profile-cli-fix1
```

The lead must review this repair and grant the CPU slot before execution.
Exactly one bounded profile is authorized under this repair. It changes no
kernel, workload, thresholds or attempt accounting; it is a startup correction,
not an unchanged failed benchmark rerun or a cycle-2 implementation attempt.
Do not execute the baseline again. No completed workload profile is claimed
before the repaired invocation succeeds.

Pre-execution disposition: the lead reported fresh independent reviewer approval
for this CLI-only repair, completion of the source-kit complement at 115/115,
and granted `STARSHIP_CPU_SLOT_GRANTED=fall-diagnostic` with the CPU slot free.
The kernel, tests and runtime configuration remain frozen for the one repaired
profile invocation. Review approval concerns the startup correction, not the
unresolved timing budget or production release.
