# M10 — Verification: physics and control on their own terms

> **Status:** planned 2026-08-30. Live task state is `docs/ROADMAP-TASKS.md` (M10.1–M10.8).
> The autonomous-run contract is `docs/VERIFICATION-GOAL.md`.

## Why this milestone exists

Nine milestones of physics were built by **porting** — the 2021 tree was the reference, and
"correct" meant "bit-identical to what `backend/physics.js` did". That standard has been retired by
owner decision (2026-08-30): *"no need for parity with old — old one is just a fun project, we have
a much higher standard now."*

Retiring it leaves a hole. `tests/parity/` was 416 of the strongest assertions in the repo, and
every one of them tested agreement with a program we no longer consider authoritative. What
replaces it is not fewer tests. It is tests against **closed-form physics, published reference data
and stated contracts** — things that are true independently of any implementation.

The second half of the milestone is the gap that survey work found on 2026-08-30, which parity
never covered because the 2021 tree had the same gap:

| module | lines | `if` branches | test files importing it directly |
|---|---|---|---|
| `autopilot/index.ts` | 704 | **82** | **0** |
| `control/primitives.ts` | 463 | **48** | 2 |
| `control/actuation.ts` | 192 | 10 | 1 |
| `control/commands.ts` | 176 | 8 | 18 |
| `step.ts` | 435 | 13 | 44 |

130 decision points in the control layer, reached only through seven nominal golden flights and
thirty black-box autopilot tests. The densest are the stage machines:

```
autoBoostBack                        17 if
horizontalAdjustmentStageController  11 if
autoDeorbit                          11 if
autoLand                             10 if
finalDescentStageController           9 if
```

`autoBoostBack` alone has more branches than the whole of `step.ts`. A nominal RTLS walks one path
through those seventeen. Nothing establishes what the other paths do — and a stage machine is
exactly where a wrong branch produces a plausible-looking wrong flight rather than a crash, which
is the failure mode a golden cannot catch, because the golden records whatever it did.

## Owner decisions binding this milestone

1. **Parity is retired.** `tests/parity/` (7 test files plus `legacy.ts`, 416 tests) is DELETED.
   `v2/tests/fixtures/legacy/` is **kept on disk, archived** — a historical reference that nothing
   executes and no gate consults. `CLAUDE.md` is amended to say so.
2. **Wrong physics gets fixed.** When a first-principles test shows the model is actually wrong,
   the correction lands under the existing Bug-fix or Fidelity tier with a failing test first and a
   before/after trajectory diff, and the seven golden digests move with a written justification in
   the same commit. The sim gets more correct even where the feel changes.

## Scope

**In:** `v2/src/core/**` — physics, control, autopilot, step, state, scenarios, rng, units,
constants.

**Out:** `view/`, `hud/`, `audio/`, `ui/`, `app/`. They have their own suites and are not what
"physics and control logic" means. Coverage thresholds introduced here apply to `src/core/**` only.

**Out:** re-tuning flight feel for its own sake. A correction needs a demonstrated error, not a
preference.

## Phases

Each phase is one or more commits, gated and merged before the next begins.

### M10.1 — The instrument: coverage, measured
Add a coverage provider and establish the truthful baseline. Nothing in this milestone can be
planned honestly against guesses, and no target can be set before the current number is known.
**End state:** `npm run coverage` works; a per-module line/branch table for `src/core/**` is
committed into this document. **Verified by:** the table exists and reproduces.

### M10.2 — Retire parity
Delete `tests/parity/`. Archive the legacy tree with a README stating its new status. Amend
`CLAUDE.md`'s ground rules and the parity clauses. **End state:** nothing under `v2/tests/`
imports, reads or executes the 2021 tree. **Verified by:** the gate is green with 416 fewer tests,
and `grep -rl "fixtures/legacy" v2/tests --include='*.test.ts'` returns nothing.

### M10.3 — The laws: analytic physics tests
Replace agreement-with-2021 with agreement-with-physics. Energy and momentum conservation over
ballistic vacuum flight; Kepler orbit closure and period; ISA against the published table values at
named altitudes; speed of sound against the standard formula; inverse-square gravity to ULP;
dimensional consistency of the aero terms. Every tolerance justified in the test, not chosen to
pass. **End state:** each physics module has assertions traceable to a named external reference.
**Verified by:** the gate, plus every tolerance carrying a written derivation.

### M10.4 — The domain edges
Physics functions asserted at the edges of their input domains: non-finite inputs, altitude below
sea level and above the ISA table, zero and negative mass, Mach 0 and Mach 30, dt of 0 and of a
whole second. Property sweeps rather than single points where the domain is continuous.
**End state:** no physics export has undefined behaviour at a reachable input. **Verified by:** the
gate; coverage of `physics/**` at the M10.1 target.

### M10.5 — Control primitives, directly
The 48 branches in `control/primitives.ts` and the 10 in `actuation.ts`, tested against their
contracts rather than through a flight: `precisionAlignment` converging and not overshooting,
`controlEnginebyTWR` reaching its goal TWR, dead zones, saturation limits, sign symmetry,
`raptorAutoShutDown_KeepMinTWRBelow1` firing exactly when it should. **End state:**
`control/**` at the branch target. **Verified by:** the gate and the coverage report.

### M10.6 — The autopilot's state machines
The 82 branches, worst-first: `autoBoostBack`, `horizontalAdjustmentStageController`,
`autoDeorbit`, `autoLand`, `finalDescentStageController`. Each stage transition asserted directly —
including the transitions a nominal flight never reaches. **End state:** `autopilot/**` at the
branch target, and every stage transition named in a test. **Verified by:** the gate and the
coverage report.

### M10.7 — Findings: fix what is actually wrong
Whatever M10.3–M10.6 surface. Each correction: failing test first, one declared tier, a before/after
trajectory diff across all seven scenarios in the commit, goldens regenerated with the justification,
and the audit table in `tests/golden/unification.test.ts` extended with the reason. A finding that
turns out to be a modelling preference rather than an error is written up and NOT changed.
**End state:** no known-wrong physics left unfixed or unrecorded. **Verified by:** the gate; the
audit table accounts for every digest movement.

### M10.8 — Gate it
Coverage thresholds enforced by the build so the number cannot regress. Docs updated, remaining
debt named in words. **End state:** a coverage regression fails the gate. **Verified by:** the
threshold demonstrably failing when lowered, then passing.

## The measured baseline — M10.1, 2026-08-31

Measured with `@vitest/coverage-v8@4.1.11` (`npm run coverage`), scope `src/core/**`, on an
idle machine with nothing else running. Reproduced exactly on a second consecutive run:
identical percentages and identical uncovered line numbers.

**The survey that planned this milestone was wrong about where the gap is, which is why
M10.1 exists.** `autopilot/index.ts` was described above as having "0 test files importing it
directly", and that is true — but it is nonetheless at **87.6% branch** coverage, reached
indirectly through the seven golden flights and the black-box autopilot tests. The milestone
is not starting from a bare module. It is starting from 92.9%.

Two columns, because M10.2 deletes 416 parity tests and any target set here has to survive that:

| module | branch (with parity) | branch (parity gone) | lines (parity gone) |
|---|---|---|---|
| src/core/autopilot/index.ts | 87.6% (205/234) | 87.6% (205/234) | 97.4% |
| src/core/constants.ts | — (0/0) | — (0/0) | 100.0% |
| src/core/control/actuation.ts | 96.3% (26/27) | 96.3% (26/27) | 97.4% |
| src/core/control/commands.ts | 95.7% (22/23) | 95.7% (22/23) | 94.3% |
| src/core/control/primitives.ts | 93.4% (99/106) | **76.4% (81/106)** | 83.2% |
| src/core/physics/aero.ts | 100.0% (24/24) | 100.0% (24/24) | 100.0% |
| src/core/physics/atmosphere.ts | 100.0% (4/4) | 100.0% (4/4) | 100.0% |
| src/core/physics/components.ts | 100.0% (80/80) | 100.0% (80/80) | 100.0% |
| src/core/physics/engines.ts | 98.2% (54/55) | 96.4% (53/55) | 96.2% |
| src/core/physics/gravity.ts | 91.7% (11/12) | 91.7% (11/12) | 100.0% |
| src/core/physics/isa.ts | 100.0% (12/12) | 100.0% (12/12) | 100.0% |
| src/core/physics/prediction.ts | — (0/0) | — (0/0) | 100.0% |
| src/core/physics/thermal.ts | — (0/0) | — (0/0) | 100.0% |
| src/core/rng.ts | — (0/0) | — (0/0) | 100.0% |
| src/core/scenarios.ts | 100.0% (6/6) | 100.0% (6/6) | 100.0% |
| src/core/state.ts | 100.0% (1/1) | 100.0% (1/1) | 100.0% |
| src/core/step.ts | 89.2% (33/37) | 89.2% (33/37) | 98.4% |
| src/core/units.ts | — (0/0) | — (0/0) | 100.0% |
| src/core/version.ts | — (0/0) | — (0/0) | 0.0% |
| **TOTAL** | **92.9% (577/621)** | **89.8% (558/621)** | 96.3% |

Aggregate: statements 97.5% → 95.8%, branches 92.9% → 89.8%, lines 98.1% → 96.3%.
Test count 1555 → 1139.

### What parity was actually holding up

Almost exactly one file. Deleting `tests/parity/` costs 19 branches, and **18 of them are in
`control/primitives.ts`** (93.4% → 76.4%); the nineteenth is in `engines.ts`. It contributes
**nothing** to `autopilot/index.ts` or `step.ts`, both of which are unchanged to the digit.

That is a useful correction to the plan's own reasoning. `tests/parity/autopilot.test.ts` is
named for the autopilot but tests the control *primitives* — `getPitchDifference`,
`controlEnginebyTWR`, `getEffectiveVerticalMaxThrust`. So the cost of M10.2 lands on M10.5,
not on M10.6.

### Where the remaining work is

63 branches are uncovered once parity is gone, and they are not spread thin:

| file | uncovered branches | share |
|---|---|---|
| autopilot/index.ts | 29 | 46% |
| control/primitives.ts | 25 | 40% |
| step.ts | 4 | 6% |
| engines.ts | 2 | 3% |
| gravity.ts, commands.ts, actuation.ts | 1 each | 5% |

**54 of 63 (86%) are in the two files M10.5 and M10.6 already target.** The phase ordering is
correct, though for a different reason than the one originally written down.

Sampled uncovered branches to check they are reachable rather than defensive dead code:
`autopilot:76-83` (the 25–80 km angle-of-motion ramp in `autoTakeOff`, and the >80 km case),
`autopilot:87-88` (propellant below `dumpLimit` with engines lit — shutdown during ascent),
`autopilot:175` (boost-back finish at `altitude < 700 && speedY < 0`), and `autopilot:370`
(`n1 && !n2 && !n3` → `targetDifference -= 12`, the off-axis compensation for a single lit
engine). All four are reachable, and all four change the flight. The last is the archetype
this milestone exists for: a wrong branch there yields a plausible wrong trajectory, which a
golden fixture records rather than rejects.

### The branch target, and why this number

**Target: `src/core/**` branch coverage ≥ 96%, with per-module floors:**

| scope | floor | from | what it demands |
|---|---|---|---|
| `physics/**` | 100% | 98.4% | 3 branches (engines:161, gravity:219). All reachable. |
| `control/**` | 95% | 82.7% | ~20 of primitives' 25 — the M10.2 debt plus the rest |
| `autopilot/**` | 95% | 87.6% | 17 of 29 |
| `step.ts` | 95% | 89.2% | 2 of 4 |

96% overall is 596 of 621: it requires covering 38 of the 63, and it sits above the 92.9% the
suite has *today with parity included*, so the milestone must demonstrably do better than the
standard it replaces rather than merely restore it.

It is deliberately not 100%. Some branches are defensive — clamps that fire only on inputs no
caller can produce — and the last few points are exactly where the incentive inverts: a test
written to reach a line without asserting behaviour scores the same as a real one and is worse
than leaving the branch uncovered, because it reads as covered. Where a branch turns out to be
genuinely unreachable, the rule is to document it here with the argument, not to manufacture a
test that executes it.

Two caveats about the instrument itself, for M10.8:

- **A module with no branches reports as 100%.** `thermal.ts`, `prediction.ts`, `rng.ts`,
  `units.ts` and `constants.ts` are all `0/0`. A branch threshold on those is vacuous; they
  are held by line coverage and by their tests, not by this number.
- **`version.ts` is 0% line** and always will be: it is a version string no test imports.
  It contributes no branches. Excluding it would flatter the aggregate, so it stays in.

`npm run coverage` runs with `--testTimeout=120000`. v8 instrumentation pushes
`tests/view/perf.test.ts` past the normal 30s budget (measured 33.4s); the timeout is raised
for the coverage run alone rather than globally, so the ordinary `npm test` keeps its tighter
hang detection. The perf assertions themselves are not trusted under instrumentation — that
run is for coverage, and timing budgets are enforced by `npm test` and `npm run build`.

## Risks

- **Deleting 416 tests before the replacements exist.** M10.2 runs second, not last, so the campaign
  is not built on top of a standard it is meant to remove — but it does mean M10.3–M10.6 are
  written without that net. Mitigation: the golden fixtures stay throughout and remain the
  regression contract; they are the thing that makes any accidental behaviour change visible.
- **A correction that moves all seven goldens.** Precedent exists (`M2.12 the doubled tangential
  term — ALL SEVEN`). It is allowed under decision 2 and needs the tier, the diff and the written
  justification. It is not allowed silently.
- **Coverage as a target rather than a measure.** A branch reached by a test that asserts nothing is
  worse than an uncovered branch, because it reads as covered. Every phase's acceptance is written
  in terms of asserted behaviour; the percentage is the floor, not the goal.
- **The soul.** The intro auto-landing sequence, the scenario presets and the pig at x = 0 are
  unchanged by this milestone. A correction that would remove the intro landing is out of scope and
  gets reported, not made.

## Success criteria

- `tests/parity/` gone; the legacy tree archived and executed by nothing.
- Every `core/` physics module has assertions traceable to an external reference.
- `control/**` and `autopilot/**` at the branch-coverage target set in M10.1.
- Every golden digest movement in the audit table has a tier and a justification.
- The gate fails on a coverage regression.
