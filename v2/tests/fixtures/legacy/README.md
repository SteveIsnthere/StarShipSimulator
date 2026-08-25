# The 2021 tree — frozen reference, not the application

This is the original Starship Simulator, as it was in 2021. It is **retired**:
it is not built, not served, not deployed, and not on any code path a user can
reach. `v2/` is the application.

It is kept because it is **executed**. `tests/parity/legacy.ts` loads these files
into a Node VM and the tests compare v2's simulation against the real thing,
value for value, with `Object.is` rather than tolerances. That is the evidence
the port is faithful, and it is evidence that cannot be reconstructed from
anything else: the golden fixtures record *what* v2 does, but only this records
what the original did.

Four files are executed today:

- `backend/physics.js`
- `backend/initBackEnd.js`
- `backend/flightcontrol/flightControl.js`
- `backend/flightcontrol/autoPilotLowLevelFunctions.js`

The rest of the tree is here because deleting the parts nobody currently reads
would be deciding, on their behalf, which questions future readers are allowed
to ask. `docs/PARITY.md` cites line numbers throughout this tree; those
citations only mean something while the lines exist.

## Rules

**Do not modify anything in this directory.** Not to fix a lint error, not to
modernise a `var`, not to correct a misspelling. Every edit destroys a little of
what the parity tests are measuring against, and an edit made to satisfy a
linter is the worst kind, because it looks harmless.

It is excluded from ESLint for exactly this reason — it predates all six walls
and violates most of them, including 355 assignments to `globalThis`, which is
wall 6, which is why wall 6 exists.

If you need to understand why v2 does something strangely, the answer is
probably in here, and the strangeness is probably deliberate.
