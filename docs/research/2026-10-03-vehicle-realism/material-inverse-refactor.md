# Exact material inverse and repeated orbit work — 2026-10-03

Tier: Refactor, within the approved V3 Fidelity integration. No material fit, physical limit, integration cadence or test tolerance changes.

A Node CPU profile of 200,000 active V3 circular-orbit steps after 10,000 warm-up steps attributed approximately 47% of samples to steel enthalpy inversion. The existing exact-cell certificate frequently fell back to all 48 expensive enthalpy comparisons.

The hint now stops when a Newton update rounds to the same temperature. The existing cheap floating midpoint traversal retains its actual depth-40 bounds. After the unchanged depth-48 certificate fails, a strict `H(lower) < E <= H(upper)` ancestor certificate permits the final eight original enthalpy comparisons. Uncertified hints still take the original 48-step fallback. No reconstructed interval, approximate temperature authority, clipping, tolerance or memoized global state is introduced.

Independent review approved this approach before implementation, subject to exact proof and execution of the recovery/fallback paths. The expanded numerical witness covers the full domain, every cold-table boundary, adjacent representable energies, original midpoint boundaries at depths 39–41 and 47–48, and signed near-zero energies. Focused verification: 25 pass, one existing opt-in timing test skipped. Independent native V8 coverage of the dense exact-output comparison alone confirms1154 depth40 recoveries,9232 final comparisons,23 full48 fallbacks and7149 Newton stagnation exits. The narrow diagnostic correctly exits1 under unchanged whole-core coverage floors; it is not a coverage-gate pass. See `material-hud-independent-audit.md`.

Isolated profile (same Mac/harness, descriptive measurements, not a release budget proof): 200,000 steps decreased from 3457.984458 ms to 2074.445375 ms. Both report altitude 299999.8036251226 m, simulation time 1750.0000000084772 s, damage revision zero and no terminal state. The dense inverse proof, rather than these few endpoint scalars, establishes bit identity.

The orbit and angular-momentum test files now reuse frozen scalar results from identical complete flights within each file. Every original step, initial condition, assertion and bound remains. No mutable SimState is shared between assertions; isolated test execution still computes the full flight lazily. This removes three duplicate full orbit laps and one duplicate 6000-second angular-momentum flight. Current orbit/angular-momentum/Verlet/orbital-demo verification passes66/66 in109.46s; every original limit and timeout remains. Targeted lint passes. This is not a complete gate-budget measurement.

Evidence: `v3-material-exact-refactor.txt`, `v3-orbit-profile.txt`, `v3-orbit-refactor.txt`, `v3-shared-orbit-lint.txt`. Raw local profiles: `/tmp/v3-orbit-current.cpuprofile` and `/tmp/v3-orbit-refactor.cpuprofile`.

The added simultaneous two-body renderer lifecycle witness passes:50 breakup/pause/reset cycles retain every startup scene node and mesh identity, bounded component inventories and exactly8000 particle sprites. The complete HUD/UI/resource cohort passes120/120. This synthetic renderer witness does not substitute for natural physical detachment or browser GPU-budget acceptance.

Runtime note: these local profiles and focused receipts use the login runtime Node25.8.1. Recording remains exclusively Linuxx86/Node22; the repository declares Node22. Release gate runtime must be explicit.
