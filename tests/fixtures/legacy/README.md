# The 2021 tree — archived. Nothing executes this.

This is the original Starship Simulator, as it was in 2021. It is **archived**:
not built, not served, not deployed, not imported, not executed, and on no code
path a user or a test can reach. `v2/` is the application.

## What changed, and when

Until M10.2 (2026-08-31) this directory was **executed**. `tests/parity/legacy.ts`
loaded four of these files into a Node VM and 416 tests compared v2's simulation
against the real thing, value for value, with `Object.is` rather than tolerances.
That was the evidence the port was faithful.

By owner decision, parity is retired:

> "no need for parity with old — old one is just a fun project, we have a much
> higher standard now."

So `tests/parity/` is gone. Correctness is no longer "agrees with
`backend/physics.js`"; it is agreement with closed-form physics, published
reference data and stated contracts — things that are true independently of any
implementation. See `docs/VERIFICATION-PLAN.md`.

## Why the files are still here

They are kept as a **historical reference for humans**, not as an authority:

- The commit history of the rebuild refers to this code constantly. Nine
  milestones of porting notes cite file and line — `physics.js:283`,
  `autoPilotLowLevelFunctions.js:147` — and those citations should keep
  resolving to something.
- Several deliberate departures are only intelligible against the original: the
  mistranscribed `0.0299` lapse coefficient, the doubled tangential term, the
  nose radius passed where an area belonged. The record of what was wrong is
  worth more than the code.

## The rules

- **Do not modify it.** Not to fix a lint error, not to modernise a `var`. It is
  a historical artefact; editing it makes it a worse one.
- **Do not import it.** No test, script, or source file under `v2/` may read or
  execute anything in this directory. `grep -rl "fixtures/legacy" v2/tests
  --include='*.test.ts'` must return nothing.
- **Do not treat it as authority.** If this tree and v2 disagree, that is not by
  itself a defect in v2. It was a fun project, and its physics has known errors
  that the rebuild fixed on purpose.
