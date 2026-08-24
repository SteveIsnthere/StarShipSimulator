---
description: Drive the Starship rebuild — pick the next roadmap task, implement it to convention, verify, commit
argument-hint: [task id e.g. M1.3 | status | empty = next unchecked task]
---

You are driving the Starship Simulator rebuild on branch `claude/first-project-rebuild-bjniik`.

## Ground truth — read all three before acting

1. `CLAUDE.md` — architecture, the six walls, physics change policy, determinism rules
2. `docs/REBUILD-PLAN.md` — roadmap v3 and the implementation kit
3. `docs/ROADMAP-TASKS.md` — the live checklist; the single source of truth for what is done

## Mode

- Arguments = `status` → report progress: tasks done/remaining per milestone, current
  milestone, whether CI would pass right now (`cd v2 && npm run lint && npm run test && npm run build`
  if v2 exists), and the next task up. Change nothing.
- Arguments = a task id (e.g. `M1.3`) → target exactly that task. If its predecessors in
  the same milestone are unchecked, say so and stop — do not skip ahead silently.
- No arguments → target the first unchecked task in document order.

## Pre-flight

- Confirm you are on `claude/first-project-rebuild-bjniik` with a clean tree; pull latest.
- Re-read the target task's acceptance line. That line is the definition of done — if you
  cannot meet it exactly, stop and report why instead of reinterpreting it.
- Confirm the task does not touch the 2021 tree unless the task text explicitly says so
  (only M0.5 and M5.4 do).

## Implement

- Follow CLAUDE.md without exception: the six walls, purity of `core/`, seeded RNG only,
  dt-only time, no globals.
- Any change to `core/` physics declares its tier in the commit message — Refactor
  (with ≤ 1 ULP proof committed as a test), Bug fix (failing test first, six-scenario
  before/after diff), or Fidelity (behind a flag, off by default). Nothing changes
  physics silently.
- Porting tasks port verbatim — names, constants, and quirks intact — unless the task
  text names a declared exception. Resist improving code the roadmap improves later.
- Prefer boring, readable code. Match existing v2 style. No new dependencies unless the
  task or the implementation kit names them.

## Verify — all green before any commit

- `cd v2 && npm run lint && npm run test && npm run build` (once v2 exists; budgets included).
- Whatever the task's own acceptance line demands beyond that (golden diffs, proofs,
  parity spot-checks, CI workflow runs).
- Re-read your diff adversarially before committing: what would make CI or the golden
  tests reject this?

## Record

- Check the task's box in `docs/ROADMAP-TASKS.md` and append one line to its Log section:
  date · task id · short note.
- Commit everything as one commit, message starting with the task id
  (e.g. `M1.3: port atmosphere, aero and thermal models verbatim`). Push with
  `git push -u origin claude/first-project-rebuild-bjniik` (retry with backoff on network failure).

## Report

End with: what was done, how it was verified (actual command results, not claims), what
the next task is, and anything that surprised you. If you stopped without completing the
task, say exactly what is blocking and what decision or input is needed.

## Hard rules

- One task per invocation, one commit per task. Do not batch ahead.
- Never modify golden fixtures except under a declared Bug-fix or Fidelity tier in the
  same commit that justifies it.
- Never check a box whose acceptance line you did not meet.
- If anything in the three ground-truth documents contradicts these instructions, the
  documents win — and flag the contradiction in your report.
