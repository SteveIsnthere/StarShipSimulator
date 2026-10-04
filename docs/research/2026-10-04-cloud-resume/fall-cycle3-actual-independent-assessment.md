# Independent high assessment of actual cycle3 diagnostic

2026-10-04 UTC. Reviewer `fall_cycle3_review`. Read the six completed section
receipts, raw measured normal/cap profiles and filtered optimized code directly.
Also inspected installed vite-node loader and existing production simulation
chunk/source map. No workload, build, test or browser executed in this assessment.
Raw evidence hashes and independently derived sample rows are in
`fall-cycle3-actual-independent-assessment-sources.json`.

## Result and limits

The diagnostic exits0 with unchanged broad source manifests and exact original
fall endpoints. Every section records zero new `nr_throttled`/`throttled_usec`.
Measured cap wall195.892997ms, process CPU201.685ms for50calls; normal wall
198.744981ms, process CPU204.441ms for200calls. Burn measured wall103.030512ms
for2000calls. These include profiler/code-print/assertion overhead and establish
no acceptance. The local data reject cgroup throttling as the explanation for
this particular profiled cap; they do not establish historical receipt conditions.

Normal and cap measured profiles each contain172samples. Their sample delta
totals are248.909/241.426ms, greater than the kernel windows because Inspector
`post` has50.998/45.327ms self attribution. Exclude that machinery from kernel
cost arguments. Normal force subtree172.687ms, cap170.150ms. Cap force self
96.959ms; outer advance self19.687ms, ISA self31.704ms and thermosphere self
10.886ms. Core anonymous frames total21.809ms at cap (about11.25% of the main
fall subtree), versus8.712ms normal. Short profiles and inlining limit precision.
Anonymous frames are not individually proved getters just by their empty names.

## SSR module overhead is an actual mechanism, with unquantified savings

Raw output prints the force's transformed source. Imported constants/helpers
are repeatedly obtained through `__vite_ssr_import_*__` properties, even `rad`.
Installed `node_modules/vite-node/dist/client.mjs` lines332–338 explicitly define
export-name getters via Object.defineProperty. Both optimized force blocks
(10028 and10152instruction bytes) retain25 LoadIC/LoadICTrampoline call sites.
Their nearby string keys name imported values: planetRadius, ISA, meanWindAt,
wrapped/folded angles, controls, rad, area, drag/lift, gravity and frameRotationRate.
For example raw lines99–102 and3755–3758 resolve planetRadius through LoadIC
despite it being an immutable numerical export. Imported helpers can inline
their body while their namespace-property fetch still remains; this is compatible
with the previous positive helper-inline trace.

The existing `dist/assets/simulation-3KOKl7kS.js` uses local constants, including
`var i=6371e3`, and has no `__vite_ssr_import` markers. Its source map's complete
guidance-physics source content equals the current retained source exactly.
This proves a concrete execution-representation difference, not faster production
timing or equality of all compiled outputs. Other source files and bundler
configuration must be freshly pinned before a research build.

Direct anonymous-frame self cost is far below required48.61% saving. LoadIC
dispatch and boxing/access overhead can also fall inside the kernel's self
samples; there is no reliable separate time for them. Twenty-five static call
sites include cold control paths, and static counts are not runtime frequency
or latency. Do not convert them into an invented predicted percentage. The
ordinary cloud exact-math goal remains unproved, but a loader-representation
investigation now has stronger direct evidence than another physics rewrite.

## Bounded next task recommended

Prepare a research-only module export entry for the **unchanged retained core
graph**, built with the existing production Vite/Rolldown settings and locked
dependencies. No copied/re-written physics, hand-selected constants, source
replacement, memoization or algorithm transform. Export the original public
predictor/work/scratch/scenario APIs needed by independent proofs and the three
original timing workloads. Inspect generated code to verify removal of SSR
accessor dispatch; retain exact build inputs/output hashes and sourcemaps. Keep
the checked-in bench/gate configuration unchanged while investigating.

Before timing, prove compiled-module equivalence against both frozen original
numerical fixtures and retained SSR production implementation. Use all76held
proof obligations plus dense scalar/component/preparation suites: complete
scratch/work ownership and mutations, signed zeros/Object.is, exception classes/
messages/side effects, nonfinite/overflow/invalid inventories, slicing/interleaving
and positive mutation controls. Compare all burn endpoints/scratch too. Each
module owns its complete source graph; avoid cross-importing half a scratch/control
graph and creating an accidental hybrid. Confirm compiled code still evaluates
both canonical midpoint force queries and every one of4000capsteps, with unchanged
work semantics. Do not regenerate fixtures or weaken any assertion.

Fresh independent harness review and green compiled equivalence proofs may
authorize **one research measurement**, explicitly charged as cycle3attempt1,
using original burn200/2000 at0.2ms, normal20/200 at1ms, cap5/50 at2ms. No profiler,
code printer or extra warmups during that measurement. Run with exclusive CPU,
source/output pins, complete exit receipt and exact endpoints/work checks; retain
original failed SSR baseline and candidate receipts. The quantitative criterion
is actual compiled cap below2ms, a saving greater than1.89177782ms (48.61%) versus
the original receipt, and normal/burn also under their original limits. No saving
is promised before measurement.

If green, this would support correcting timing setup to measure the shipped
bundled predictor rather than development-loader dispatch. Adoption still needs
fresh independent review of equivalence, representative production configuration
and original timing contract, followed by the complete unchanged-budget bench
and gate. It cannot retroactively make the original failed bench green or silently
replace its execution mode. If red, preserve it and select no production or bench
change on speculation. No new product decision, physics approximation, timing
relaxation or changed workloads follows from this assessment.
