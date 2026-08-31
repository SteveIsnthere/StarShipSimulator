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

## M10.7 — the findings, and what was deliberately left alone

Three defects were found by M10.3–M10.6 and fixed. Each landed with a failing test first, one
declared tier, and a before/after check across all seven golden scenarios. **None of the three
moved a single golden digest**, which is itself the useful result: every one lived on a branch
no nominal flight reaches, which is exactly the region the goldens cannot police and the reason
this milestone exists.

### Fixed

| # | where | tier | what was wrong |
|---|---|---|---|
| 1 | `physics/gravity.ts` `coastDownrangeDistance` | Bug fix (M10.4) | returned **NaN** for a radial trajectory |
| 2 | `control/primitives.ts` `controlEnginebyTWR` / `…EffectiveVerticalTWR` | Bug fix (M10.5) | **NaN escaped the throttle clamp** |
| 3 | `autopilot/index.ts` `autoDeorbit` | Bug fix (M10.7) | the **Infinity sentinel was inverted** |

**1. The radial coast.** With negligible tangential speed the conic degenerates to a line
through the planet's centre, both `anomalyAt` calls return pi, and Simpson's rule multiplies an
infinite integrand by a zero-width step. Reachable: `predictedDeorbitRange` passes
`speedX - DEORBIT_DELTA_V`, so any vehicle moving downrange within 4e-5 m/s of the deorbit
delta-v presents it. The guard tests the zero-width sweep rather than `p === 0`, because an
exact float comparison repaired one input and left a band of ~3e9 doubles broken.

**2. The NaN throttle.** The clamp is `if (x > upper) else if (x < lower)`, and NaN fails both,
so it reached `vehicle.throttle` unclamped. `goalTWR` is literally 0 at three call sites and
the denominator is 0 whenever nothing is lit: 0/0. The consequence was quieter than a NaN in
the state — `slewToward`'s comparisons against a NaN goal are both false, so it returns
`current - perStep` and the throttle walks *down* one step per frame into negative thrust,
inert while unlit and biting on relight. Guards on NaN only; Infinity must still reach the
clamp, which handles it correctly.

**3. The inverted sentinel.** `predictedDeorbitRange` returns Infinity for "this burn cannot
bring the vehicle down", but the firing test was `distanceToLandingSite <= predictedDeorbitRange`
and every finite distance is `<= Infinity`. The mode therefore fired immediately instead of
never, committed to a burn that could not happen, and wedged: nothing lit, no delta-v spent,
the cut-off condition never arrived, and it never handed over to autoLand.

The sibling call site was checked rather than assumed: at `index.ts:688` the comparison is
`rangeToGoFromHere() <= distanceToLandingSite()`, so `Infinity <= x` is false and the burn
simply continues — correct for an orbit that does not yet reach the entry interface. Same
sentinel, opposite direction, opposite and correct outcome.

### Found, written up, and NOT changed

These are modelling preferences or documented deviations, not errors. Each is asserted where it
can be, so the behaviour is a decision on the record rather than an accident waiting to be
"fixed" by someone who mistakes it for one.

- **`getMaxSpeedWithSafeDynamicPressure(0)` is `Infinity`.** Above ~1000 km the model's density
  is ~3e-15 and the ceiling is ~4.8e9 m/s — sixteen times the speed of light. This is correct:
  there is genuinely no dynamic-pressure limit in vacuum. The caller is the right place to care.
  Pinned by a test.
- **`getAcceleration(F, 0)` is `Infinity` and `getAcceleration(0, 0)` is `NaN`.** Unreachable —
  dry mass is a positive constant — and Infinity is the *right* answer anyway: it propagates
  visibly, where a clamp would invent an acceleration nobody asked for.
- **`speedOfSoundAt` is NaN below absolute zero.** Unreachable: the coldest the ISA gets is
  about -90 C. Asserted anyway, because a NaN Mach would quietly stop the vehicle decelerating.
- **The lift curve's top segment is unbounded below.** `-1.1*|aoa| + 1.728` is safe only because
  `getAttackAngles` wraps into [-pi, pi], where it reaches -1.7278; at 2pi it would be -5.18.
  Both halves are now asserted together, so removing the wrap fails loudly.
- **The `/ 2.1` in `getCrossSectionalArea`** is an unexplained 2021 tuning constant. It is part
  of the feel; changing it is a Fidelity-tier decision for the owner, not a correctness fix.
- **`getReentryHeatPower`'s `1.83e-7`** may be a transcription slip or a deliberate scaling —
  the source does not decide it, and `heatLimit` was calibrated against the scale it actually
  returns, so the two are consistent as they stand. Changing it would move re-entry and needs
  the owner.
- **`horizontalSteering` calls `precisionAlignment` twice** in the near-target case, the second
  overriding the first. Wasteful, and ported deliberately: the first call has side effects, so
  collapsing it would change behaviour.
- **`legacyEffectiveVerticalMaxThrust` and `legacyAtmosphere` remain in `core/`.** They existed
  for the parity suite, which M10.2 deleted. The first is NOT dead — `collapsed-trig.test.ts`
  uses it as the independent second implementation the collapsed form is proved against. The
  atmosphere ones (`legacyAtmosphere`, `tropo`, `lowerStrato`, `upperStrato`) and
  `legacyOrbitRelief` now have no consumer. Removing them is a Refactor-tier change to the
  protected zone and is left as named debt rather than folded in here unasked.

## M10.8 — the gate, and the debt that is left

### What is enforced

`npm run gate` is the whole thing, in order:

```
npm run lint && npm run test && npm run build && npm run coverage && npm run test:e2e
```

There is **no CI in this repository** — no `.github/workflows`, nothing that runs on a push.
Every "CI-enforced" budget in `CLAUDE.md` is in fact enforced by `npm run build` calling
`scripts/check-budget.mjs`, and the coverage floors are enforced the same way, by
`npm run coverage` failing. That is worth saying plainly rather than leaving the word "CI" to
imply a pipeline that does not exist: **the gate is a command a person has to run.**

Coverage thresholds live in `vitest.config.ts`, scoped to `src/core/**`, and were measured
rather than chosen:

| scope | branches | lines | functions | statements | measured at M10.8 |
|---|---|---|---|---|---|
| aggregate | 96 | 98 | 98 | 98 | 97.8 / 99.2 / 98.8 / 99.3 |
| `physics/**` | 100 | 100 | 100 | 98 | 100 / 100 / 100 / 99.7 |
| `control/**` | 95 | 95 | 95 | 95 | 97.5 / 97.3 / 95.6 / 97.4 |
| `autopilot/**` | 95 | 99 | 100 | 99 | 95.8 / 99.6 / 100 / 99.7 |

Enforcement was demonstrated, not assumed: raising the aggregate branch floor from 96 to 99
produces `ERROR: Coverage for branches (97.77%) does not meet global threshold (99%)` and the
command exits non-zero; restoring it passes. The per-module floors are deliberately tighter
than the aggregate, because a headline percentage is the easiest thing to hold up while one
module rots underneath it.

### The number, start to finish

| | M10.1 baseline | after M10.2 (parity gone) | M10.8 |
|---|---|---|---|
| branches | 92.9% (577/621) | 89.8% (558/621) | **97.8% (615/629)** |
| lines | 98.1% | 96.3% | **99.2%** |
| tests | 1555 (416 of them parity) | 1139 | **1258** |

Fewer tests than the milestone started with, and 37 more covered branches. That is the shape
the milestone was aiming for: 416 assertions that a 2021 file agreed with itself, replaced by
119 that say what the physics and the control logic are supposed to do.

### Remaining debt, in words

1. **Fourteen uncovered branches**, all in code whose reachability is not obvious:
   `autopilot/index.ts` 100, 129, 143, 312, 369, 373, 413, 477, 694, 703 (mostly the
   already-on guards of `toggleX` calls, and the horizontal-adjustment target offsets);
   `control/commands.ts` 48; `control/primitives.ts` 156, 455, 469. None is known to be wrong.
   They are named here rather than papered over with tests that execute without asserting.
2. **Five parity-orphaned exports in the protected zone.** `legacyAtmosphere`, `tropo`,
   `lowerStrato`, `upperStrato` (`physics/atmosphere.ts`) and `legacyOrbitRelief`
   (`physics/gravity.ts`) existed only for the suite M10.2 deleted and now have no consumer.
   Removing them is a Refactor-tier change to `core/` and was left rather than folded into an
   unrelated task. **`legacyEffectiveVerticalMaxThrust` is NOT in this list** — it is the
   independent second implementation `collapsed-trig.test.ts` proves the collapsed form
   against, and deleting it would silently remove that proof.
3. **`tests/e2e/shake.spec.ts` at max-Q had a budget below its own cost — FIXED at M10.8,
   after a first, wrong diagnosis.** At M9.15 it timed out once on `pixel-landscape`, passed
   alone in 2.7 min, and was recorded as CPU contention. That was incomplete: it failed again
   on the same project in the M10.8 full run, at the same 4.1 min ceiling, while passing on
   chromium (3.0 min) and pixel-portrait (3.5 min) in that very run. Twice on one project is
   not a flake.

   Measured cost: 2.7 min alone, 3.0–3.5 min on other projects under two workers, and over
   4.0 min on `pixel-landscape` under a full suite. The old 240 s budget left ~15% headroom
   idle and none under load. Raised to 420 s, with the numbers recorded in the test.

   The distinction is the whole point, because widening a timeout IS normally how a real
   regression gets hidden: this test does not fail when given time. It passes alone, and on
   three of four projects under load. The assertion is untouched and still fails if the frame
   does not shake. What was failing was the clock, not the claim.

   The underlying cost is still real — it flies to max-Q twice and reads a pixel silhouette on
   every sampled frame — and making it cheaper, or dropping to one worker, remains open.
4. **`tests/e2e/render.spec.ts`'s webp check was a race — FIXED at M10.8.** It counted network
   `response` events and sampled them once after `waitForLoadState('networkidle')`. But
   "networkidle" means no request for 500 ms, which is not the same as "the textures have
   arrived" — the loader can still be about to ask for one. Measured: it passed one full suite
   run, failed the next on `pig.webp` alone with no change to any code it touches, and passed
   in isolation. It now polls until the assets arrive, which asserts the same thing and simply
   lets a slow load be slow.

   **The first fix was wrong and is worth recording.** The obvious hypothesis was the service
   worker intercepting requests, so `serviceWorkers: 'block'` was tried — and the test then
   failed *deterministically*, with the page settling in 2.5 s having fetched no webp at all.
   The worker is part of how this app serves its assets, so blocking it does not isolate the
   test, it guts it. Two wrong diagnoses of flakes in this milestone (this and the shake
   budget at M9.15) shared a shape: a plausible mechanism accepted before it was tested
   against the alternative.

5. **`version.ts` is permanently 0% line** — a version string no test imports. It stays in
   scope rather than being excluded, which is why the aggregate line floor is 98 and not 99.
6. **`docs/PARITY.md` is historical** and marked so. The capability-parity claim it contains is
   still live and still enforced by `tests/e2e/parity.spec.ts`, which never reads 2021 code.

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

- `tests/parity/` gone; the legacy tree archived and executed by nothing. **Done, M10.2.**
- Every `core/` physics module has assertions traceable to an external reference.
  **Done, M10.3** — and the tightening found a wrong reference value that a 5% tolerance had
  been hiding.
- `control/**` and `autopilot/**` at the branch-coverage target set in M10.1.
  **Done** — control 97.5%, autopilot 95.8%, physics 100%, aggregate 97.8% against a 96%
  target.
- Every golden digest movement in the audit table has a tier and a justification.
  **Done — and no digest moved at all.** All three defects lived on branches no nominal
  flight reaches, which is the whole argument for the milestone.
- The gate fails on a coverage regression. **Done, M10.8, demonstrated rather than asserted.**
