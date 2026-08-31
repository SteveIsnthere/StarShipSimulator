# M10 Verification — goal contract

Continue independently through ONLY this roadmap:
`/home/user/StarShipSimulator/docs/VERIFICATION-PLAN.md`
Live task state, with acceptance lines that are the definition of done:
`/home/user/StarShipSimulator/docs/ROADMAP-TASKS.md` § M10

Work on branch `claude/first-project-rebuild-bjniik`. **It already exists — do not recreate it, do
not branch from it, do not open a second branch.** `CLAUDE.md` forbids pushing anywhere else. There
is no Jira project for this repo: the roadmap is the system of record and there is no ticket to
move.

## Current truthful status

- M10 is **0 of 8 phases done**. Nothing in this milestone has been started.
- M1–M9 are complete and merged on this branch, through commit `a7fc348` plus the working-tree
  commit that lands M9.15.
- The exact first unfinished task is: **M10.1 — add `@vitest/coverage-v8`, wire `npm run coverage`,
  and measure the `src/core/**` line/branch baseline.**
- Already done and must not be redone:
  - The graphics milestone M9, including the M9.10–M9.15 look-and-horizon work. Do not revisit
    `view/`. It is out of scope for this milestone entirely.
  - The seven golden trajectory fixtures and the audit table in
    `v2/tests/golden/unification.test.ts`. These STAY. They are the regression contract for the
    whole of M10 and the only thing that makes an accidental behaviour change visible now that
    parity is gone.
  - The survey that produced the branch counts in `VERIFICATION-PLAN.md` (82 `if` in
    `autopilot/index.ts`, 48 in `control/primitives.ts`, 0 test files importing the autopilot
    directly). Those numbers are current as of 2026-08-30; re-derive only if the code has moved.
- Tried and rejected, do not repeat:
  - **Do not add parity tests, and do not consult the 2021 tree for truth.** It is archived by owner
    decision. A test that asserts agreement with `backend/physics.js` is the exact standard this
    milestone exists to replace.
  - **Do not reach for `NODE_V8_COVERAGE` and a hand-rolled parser.** It was considered to avoid a
    new dependency and rejected: this milestone gates on coverage, so the provider needs to be a
    first-class, pinned, reproducible part of the build.
  - **Do not measure anything while another suite is running.** Two full runs were invalidated that
    way on 2026-08-26/27 — fifteen browser failures that were pure CPU contention, and a texture
    budget that measured 268 ms under load against 120 ms quiet. One suite at a time, on an
    otherwise idle machine, or the number is not evidence.

## First task

M10.1 only. Add `@vitest/coverage-v8` at the exact version matching the installed vitest (4.1.11),
pinned like every other dev dependency in this repo. Add an `npm run coverage` script and a
`coverage` block in `vitest.config.ts` scoped to `src/core/**`. Run it on an idle machine. Write the
per-module line/branch table into `docs/VERIFICATION-PLAN.md`, and set the milestone's branch target
from what you measure — with the reasoning written down, not a round number chosen because it looks
tidy. Stop there and gate before starting M10.2.

## Preserve these boundaries

- `CLAUDE.md`'s seven walls, the determinism rules and the physics change-policy tiers still hold in
  full. Retiring parity retires the 2021 tree as an authority; it does not relax anything else.
- **The soul:** the intro auto-landing sequence, the scenario presets, the pig at x = 0. A finding
  that would remove the intro landing is out of scope — report it, do not act on it.
- `src/core/` purity: no DOM, no PIXI, no `Math.random`, no `Date.now`, no timers, no `globalThis`.
  New tests must not smuggle any of these in through a helper.
- The golden fixtures move only under a declared Bug-fix or Fidelity tier, with a before/after
  trajectory diff on all seven scenarios and the justification in the same commit. That rule is
  unchanged and is now the ONLY guard on behaviour.
- Scope is `v2/src/core/**`. Do not add coverage thresholds to, or write tests for, `view/`, `hud/`,
  `audio/`, `ui/` or `app/` in this milestone.

## Execution rules

- "Unlimited time and resources" is false. Optimize for shipping this roadmap.
- Product implementation is primary. Plans, harnesses, tests, reviews and docs are supporting work —
  except in this milestone, where the tests ARE the product. Do not let that inversion tempt you
  into rewriting the simulator.
- Understand the affected code before editing it. The autopilot is 704 lines of stage machine; read
  the stage it belongs to before asserting anything about a transition.
- Do not reset, rebase, discard or redo completed phases or milestones.
- Focused tests while implementing; the full gate once per phase.
- **The full gate is:** `cd v2 && npm run lint && npm run test && npm run build`, then
  `cd v2 && npx playwright test` across all five projects, then `cd v2 && npm run coverage` once it
  exists. All on an idle machine, one at a time.
- A task's own acceptance line is part of its gate. Lint, test and build being green is the
  constitution's minimum, not permission to skip an acceptance criterion that asks for more. A
  commit was pushed on 2026-08-26 with the browser suite still running and shipped three real
  regressions; do not repeat it.
- Defer unrelated discoveries to the backlog. Do not let them expand the current task.
- Commit at coherent checkpoints, one task per commit, message prefixed with the task id
  (`M10.3: ...`), per `CLAUDE.md`.
- Push at those checkpoints with retry and backoff. Unattended work that exists only on this disk is
  one failure from gone.
- Run `/code-review high` on each phase before you merge it, and fix what is real. Not once at the
  end. On 2026-08-30 a review of one task found five defects the browser suite could not see,
  including a wedge of sky no assertion looks at.
- Keep `docs/ROADMAP-TASKS.md` truthful after each phase: check the box, append the Log entry with
  date, task id and what was actually found.
- Never rewrite history.

## Reporting

Report phases done vs remaining, what was found and fixed in the physics, completion %, and the
current concrete blocker. **Test counts are not progress** — a branch reached by a test that asserts
nothing is worse than an uncovered branch, because it reads as covered. Report asserted behaviour,
not lines touched.

## Autonomy boundary

- Make routine technical decisions without asking: test structure, helper placement, tolerance
  values (with derivations), which property-sweep library idiom to use, how to name things.
- Ask Steve only when a decision materially changes scope, authority or product direction.
  Specifically: any correction that would change the intro auto-landing sequence, remove a scenario
  preset, or move a golden digest by more than the correction plainly justifies.
- Do not execute, extend or scan any other roadmap. Do not invent new milestones.

## Completion condition

Stop when all of these are objectively true:

- [ ] every M10 task in `docs/ROADMAP-TASKS.md` is checked off, M10.1 through M10.8
- [ ] `cd v2 && npm run lint && npm run test && npm run build` passes
- [ ] `cd v2 && npx playwright test` passes on all five projects
- [ ] `cd v2 && npm run coverage` passes its thresholds, and lowering a threshold demonstrably fails
      the gate
- [ ] `v2/tests/parity/` no longer exists, and
      `grep -rl "fixtures/legacy" v2/tests --include='*.test.ts'` returns nothing
- [ ] `CLAUDE.md` no longer claims parity with the 2021 tree is enforced
- [ ] every golden digest movement is accounted for in the audit table in
      `tests/golden/unification.test.ts`, each with a tier and a written reason
- [ ] `docs/VERIFICATION-PLAN.md` carries the measured coverage table and every finding from
      M10.7, including the ones judged to be modelling preferences and deliberately not changed
- [ ] all work committed and pushed to `claude/first-project-rebuild-bjniik`

Do not continue into M11, into `view/` coverage, or into re-tuning flight feel after this condition
is met.
