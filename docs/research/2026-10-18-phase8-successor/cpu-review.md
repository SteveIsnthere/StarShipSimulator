# Fresh bounded CPU diagnosis — held candidate

2026-10-18 UTC. Independent high-depth reviewer
`/root/cpu_source_diagnosis_fresh` inspected the preserved force allocator,
guidance, mass, atmosphere and relevant tests without running workloads or
editing source. No current timeout causation was established.

The fixed `writeBoosterForceRequest` sweep performs 17 coarse candidates and
12 refinements per observed sign crossing: N=17+12K, K≤16, N≤209. Each invokes
`writeUnpoweredAcceleration` on one synchronous state/model with only proposed
hull pitch changing. Retained mass/arms and the ISA altitude query repeat.
This supports considering one-call preparation, while every pitch-dependent
force evaluation and all candidates/work/deadlines remain unchanged.

The reviewer requires complete canonical state/helper/scratch ownership or
literal generic fallback. Propellant, topology, material state and command
inputs must not be reduced to damage.revision. Getters, mocked/replaced helpers,
exception behavior and mutable scratch prevent assuming universal immutable
ownership. The existing backward-burn/fall paths change altitude and velocity;
their ISA queries cannot inherit the fixed-sweep assumption.

Disposition: HOLD implementation/performance claims until complete admission
and ≤1 ULP proof can be supplied without expanding unrelated qualification
infrastructure. No force caching, physics/controller edit or timeout change was
made. A future candidate must compare pre-change force trials and final output,
candidate counts, errors/scratch state, state/RNG immutability and changed-state
second calls before one justified runtime measurement.
