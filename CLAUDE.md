# Starship Simulator — Rebuild Constitution

Read this before touching anything. It is the contract every session — human or AI —
works under. The roadmap is `docs/REBUILD-PLAN.md`; the live task state is
`docs/ROADMAP-TASKS.md`; implementation is driven with Claude Code's built-in `/goal`
command — the goal prompts live in `docs/REBUILD-PLAN.md` § Driving implementation.

## Ground rules

- All work happens on branch `claude/first-project-rebuild-bjniik`. Never push elsewhere.
- The 2021 tree (`backend/`, `render/`, `utilities/`, `displayComponents/`, `index.html`)
  is the reference implementation. **Do not modify it** until milestone M5 retires it.
  All new code lives under `v2/`.
- One task per commit. Commit messages start with the task id (e.g. `M1.3: ...`).
- If a task's acceptance criteria can't be met as specified, stop and say so — do not
  reinterpret the task.

## Working loop (how a goal-driven session proceeds)

1. Take the first unchecked task in `docs/ROADMAP-TASKS.md`, in document order — or the
   task the goal names. Never skip unfinished predecessors silently.
2. The task's acceptance line is the definition of done. Not a suggestion.
3. Verify before committing: `cd v2 && npm run lint && npm run test && npm run build`
   all green (once v2 exists), plus whatever the task's own acceptance line demands
   (golden diffs, proofs, parity spot-checks).
4. Check the task's box, append to the Log section (date · task id · note), commit
   everything as ONE commit prefixed with the task id, push with retry/backoff.
5. Golden fixtures never change except under a declared Bug-fix or Fidelity tier
   justified in the same commit.
6. Then take the next task. Report anything surprising rather than working around it.

## Architecture (dependencies point down, only down)

```
v2/src/ui/     Svelte 5 panels — menus, editor, black box. Interaction-driven only.
v2/src/hud/    HUD binder — ONE rAF subscriber, diffs sim state, writes text nodes.
v2/src/view/   PixiJS v8 — sprites, pooled particles, camera, sky. No game logic.
v2/src/app/    The loop (fixed dt + accumulator + interpolation), input, wiring.
v2/src/core/   Pure TypeScript simulation. The protected zone.
```

`core/` is pure: state in, state out. It runs in Node with no browser. Everything
that makes this project testable depends on keeping it that way.

## The six walls (lint-enforced; each maps to a 2021 wound)

1. `core/` may not import from `view/`, `ui/`, `hud/`, or `app/` — the boundary.
2. `core/` may not reference `document`, `window`, or PIXI — getElementById was in the physics loop.
3. `core/` may not call `Math.random` — use `core/rng.ts` seeded streams; unseeded randomness breaks golden tests.
4. `core/` may not call `Date.now` / `performance.now` — time enters the sim only as `dt`.
5. `core/` may not call `setTimeout` / `setInterval` — engine ignition ran on wall-clock timers; it is a dt-ticked field in SimState now.
6. No assignment to `globalThis`, anywhere in `v2/` — the old tree had 355 globals.

These are ESLint errors (see `docs/REBUILD-PLAN.md` § Implementation kit for the
config). A `tests/lint-walls` test feeds violation fixtures to ESLint and asserts they
fail — the walls themselves are tested.

## Physics change policy — nothing changes physics silently

Every change to `core/` declares exactly one tier, named in the commit message:

| Tier | Meaning | Obligation |
|---|---|---|
| Refactor | behaviour must not change | numerical proof over the input domain, max abs diff ≤ 1 ULP, committed as a test |
| Bug fix | provably wrong today | failing test FIRST, then the fix; before/after trajectory diff on all six scenarios in the commit |
| Fidelity | more accurate, changes feel | behind a flag in `core/flags.ts`, off by default, both paths golden-tested; defaults flip only on the owner's explicit say-so |

## Determinism rules

- `step(state, dt, input)` is pure. Same state + dt + input → identical output, always.
- Randomness only via `core/rng.ts`: counter-based, seed + named stream + counter, with
  counters stored in SimState. Sim streams and render-effect randomness never mix.
- Time warp = run the step loop N times per frame. Never scale dt.
- Golden trajectory fixtures in `v2/tests/golden/` are the behavioural contract.
  A refactor that moves them fails CI. Regenerating fixtures requires a Bug-fix or
  Fidelity tier justification in the same commit.

## Naming & units

- Port 2021 code verbatim first — misspellings included (`presisionAlignment`,
  `gimbolPosition`) — so porting diffs are line-by-line comparable. The mechanical
  rename pass is task M1.10, after goldens lock behaviour, with its mapping table
  committed at `docs/RENAME-MAP.md`.
- SI units everywhere; document units in JSDoc on every SimState field.
- Angles use branded types from `core/units.ts` (`Rad`, `Deg`). Passing degrees where
  radians are expected must not compile.

## Performance rules

- No framework code inside a frame. Svelte renders on interaction; the HUD binder and
  Pixi own the per-frame path.
- Zero allocation in the per-frame path. Particles are pooled — the 2021
  engine-shutdown effect leaked a container + emitter per cutoff.
- DOM references cached at startup (the old HUD did 45 getElementById per frame).
- Budgets (CI-enforced): sim step < 1 ms @ 240 Hz · HUD update < 2 ms ·
  first-load JS ≤ 250 kB gzip. Charting (black box) is lazy-loaded, never in first load.
- Do not optimise physics maths for speed. Any "optimisation" that changes results is a
  Refactor owing a 1-ULP proof.

## Verification before any commit

`cd v2 && npm run lint && npm run test && npm run build` — all green, budgets included.
For physics changes, also the tier obligation above. One validated commit beats three
speculative ones.

## What must never change (the soul)

The intro auto-landing sequence. The six scenario presets. The tuned feel of the 2021
flight model as the reference configuration. The pig at x = 0.
