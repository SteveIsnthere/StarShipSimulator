---
name: physics-change-policy
description: Use before ANY change to src/core that could change a number the simulation produces — physics, control, autopilot, scenarios, constants, the integrator — and whenever a golden trajectory fixture fails, needs regenerating, or someone proposes re-blessing it. Owns the three change tiers (Refactor, Bug fix, Fidelity) and what each one owes, the golden regeneration procedure and its audit table, and the rule that no tuning knob is ever moved to make a truth test pass. Layer and wall rules are `sim-core-conventions`.
---

# Physics change policy — nothing changes physics silently

Every change to `src/core` declares exactly one tier, named in the commit message body.

| Tier | Meaning | Obligation |
|---|---|---|
| **Refactor** | behaviour must not change | a numerical proof over the input domain, max abs diff ≤ 1 ULP, committed as a test (`tests/proofs/` is the pattern) |
| **Bug fix** | provably wrong today | the failing test FIRST, then the fix; a before/after trajectory diff on every golden scenario in the commit |
| **Fidelity** | more accurate, changes the feel | an approved plan or Steve's explicit say-so, named in the commit; goldens regenerate with the justification |

A Fidelity change inside an approved plan in `docs/plans/` is approved by that plan. One outside any plan needs Steve before it is built.

## Truth outranks goldens

- **Closed-form and analytic tests are never re-blessed.** Kepler, vis-viva, energy and angular-momentum conservation, ISA tables (`tests/core/analytic-laws.test.ts`, `verlet.test.ts`, `isa.test.ts`). If one fails, the physics is wrong.
- **Golden trajectories are regression baselines.** They may move, but only under a Bug-fix or Fidelity tier, and only while every truth test still passes.
- **Never move a tuning constant to make a truth test pass.** Fix the physics. A new tunable must be a physical quantity with a real-world value and a cited source in a comment.

## Regenerating goldens

1. Every truth test and the rest of the unit suite passes first.
2. Regenerate from the full, unfiltered set: `npm run golden:regenerate`.
3. Predict which scenarios should move before looking. Compare the prediction with what moved: a change that moves a scenario it should not reach is a defect, not a re-bless.
4. Add a row to the audit table at the top of `tests/golden/unification.test.ts`: what changed, and which scenarios moved.
5. Code, fixtures and the audit row land in the same commit.

`tests/flies-every-scenario.test.ts` asserts the autopilot outcome for each scenario. A change that stops a scenario landing is not finished, whatever its tier.
