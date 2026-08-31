# M10 — Verification: physics and control on their own terms

> **Status:** planned 2026-08-30. Live task state is `docs/ROADMAP-TASKS.md` (M10.1–M10.8).
> The autonomous-run contract is `docs/VERIFICATION-GOAL.md`.

## Why this milestone exists

Nine milestones of physics were built by **porting** — the 2021 tree was the reference, and
"correct" meant "bit-identical to what `backend/physics.js` did". That standard has been retired by
owner decision (2026-08-30): *"no need for parity with old — old one is just a fun project, we have
a much higher standard now."*

Retiring it leaves a hole. `tests/parity/` was 86 of the strongest assertions in the repo, and
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

1. **Parity is retired.** `tests/parity/` (7 files, 86 tests, including `legacy.ts`) is DELETED.
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
imports, reads or executes the 2021 tree. **Verified by:** the gate is green with 86 fewer tests,
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

## Risks

- **Deleting 86 tests before the replacements exist.** M10.2 runs second, not last, so the campaign
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
