# Starship Simulator — Rebuild Constitution

Read this before touching anything. It is the contract every session — human or AI —
works under. The roadmap is `docs/REBUILD-PLAN.md`; the live task state is
`docs/ROADMAP-TASKS.md`; implementation is driven with Claude Code's built-in `/goal`
command — the goal prompts live in `docs/REBUILD-PLAN.md` § Driving implementation.

## Ground rules

- All work happens on branch `claude/first-project-rebuild-bjniik`. Never push elsewhere.
- The 2021 tree is retired (M5.4) and archived (M10.2) at `v2/tests/fixtures/legacy/`. It
  is not the application — `v2/` is — and as of M10.2 it is **not the reference
  implementation either**: `tests/parity/` is deleted and nothing executes, imports or
  consults that tree. It is a historical reference for humans, kept so nine milestones of
  porting citations keep resolving. **Do not modify it, ever.** Not to fix a lint error,
  not to modernise a `var`. Do not import it, and do not treat a disagreement with it as a
  defect in v2. See `v2/tests/fixtures/legacy/README.md`.
- One task per commit. Commit messages start with the task id (e.g. `M1.3: ...`).
- If a task's acceptance criteria can't be met as specified, stop and say so — do not
  reinterpret the task.

## Working loop (how a goal-driven session proceeds)

1. Take the first unchecked task in `docs/ROADMAP-TASKS.md`, in document order — or the
   task the goal names. Never skip unfinished predecessors silently.
2. The task's acceptance line is the definition of done. Not a suggestion.
3. Verify before committing: `cd v2 && npm run lint && npm run test && npm run build`
   all green (once v2 exists), plus whatever the task's own acceptance line demands
   (golden diffs, proofs, coverage thresholds).
4. Check the task's box, append to the Log section (date · task id · note), commit
   everything as ONE commit prefixed with the task id, push with retry/backoff.
5. Golden fixtures never change except under a declared Bug-fix or Fidelity tier
   justified in the same commit.
6. Then take the next task. Report anything surprising rather than working around it.

## Architecture (dependencies point down, only down)

```
v2/src/ui/     Svelte 5 panels — menus, editor, black box. Interaction-driven only.
v2/src/audio/  Web Audio graph, mixer, the SimState -> sound bindings. Never imported by core/.
v2/src/hud/    HUD binder — ONE rAF subscriber, diffs sim state, writes text nodes.
v2/src/view/   PixiJS v8 — sprites, pooled particles, camera, sky. No game logic.
v2/src/app/    The loop (fixed dt + accumulator + interpolation), input, wiring.
v2/src/core/   Pure TypeScript simulation. The protected zone.
```

`core/` is pure: state in, state out. It runs in Node with no browser. Everything
that makes this project testable depends on keeping it that way.

## The seven walls (lint-enforced; the first six each map to a 2021 wound)

1. `core/` may not import from `view/`, `ui/`, `hud/`, or `app/` — the boundary.
2. `core/` may not reference `document`, `window`, or PIXI — getElementById was in the physics loop.
3. `core/` may not call `Math.random` — use `core/rng.ts` seeded streams; unseeded randomness breaks golden tests.
4. `core/` may not call `Date.now` / `performance.now` — time enters the sim only as `dt`.
5. `core/` may not call `setTimeout` / `setInterval` — engine ignition ran on wall-clock timers; it is a dt-ticked field in SimState now.
6. No assignment to `globalThis`, anywhere in `v2/` — the old tree had 355 globals.
7. `core/` may not import from `audio/` — sound is an OUTPUT of the simulation, never an
   input to it. Added at M8.1, the one wall with no 2021 wound behind it, because the 2021
   build was silent: if the audio layer needs a physical value that is not in SimState, the
   answer is to derive it in `audio/` rather than add it to core and move the goldens.

These are ESLint errors (see `docs/REBUILD-PLAN.md` § Implementation kit for the
config). A `tests/lint-walls` test feeds violation fixtures to ESLint and asserts they
fail — the walls themselves are tested.

## Physics change policy — nothing changes physics silently

Every change to `core/` declares exactly one tier, named in the commit message:

| Tier | Meaning | Obligation |
|---|---|---|
| Refactor | behaviour must not change | numerical proof over the input domain, max abs diff ≤ 1 ULP, committed as a test |
| Bug fix | provably wrong today | failing test FIRST, then the fix; before/after trajectory diff on all six scenarios in the commit |
| Fidelity | more accurate, changes feel | owner's explicit say-so, named in the commit; goldens regenerate with the justification. (The flag mechanism served M2.5–M1.9 and is retired at M2.10 by owner decision — fidelity work now lands directly.) |

## Determinism rules

- `step(state, dt, input)` is pure. Same state + dt + input → identical output, always.
- Randomness only via `core/rng.ts`: counter-based, seed + named stream + counter, with
  counters stored in SimState. Sim streams and render-effect randomness never mix.
- Time warp = run the step loop N times per frame. Never scale dt.
- Golden trajectory fixtures in `v2/tests/golden/` are the behavioural contract, and since
  M10.2 retired parity they are the ONLY guard on behaviour — so the tier rules below carry
  more weight, not less. A refactor that moves them fails `npm run test` (see Verification:
  there is no CI here). Regenerating fixtures requires a Bug-fix or Fidelity tier
  justification in the same commit, and the audit table in `tests/golden/unification.test.ts`
  must gain a row saying which scenarios moved and why.

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
- Budgets (enforced by `npm run build`, not by any CI): sim step < 1 ms @ 240 Hz · HUD update < 2 ms ·
  first-load JS ≤ 250 kB gzip. Charting (black box) is lazy-loaded, never in first load.
- Do not optimise physics maths for speed. Any "optimisation" that changes results is a
  Refactor owing a 1-ULP proof.

## Verification before any commit

`cd v2 && npm run lint && npm run test && npm run build` — all green, budgets included.
For physics changes, also the tier obligation above. One validated commit beats three
speculative ones.

Since M10.8 the FULL gate is one command:

```
cd v2 && npm run gate     # lint, test, build, coverage, playwright
```

`npm run coverage` enforces measured branch/line floors on `src/core/**` (aggregate 96%
branch; physics 100%, control 95%, autopilot 95%) and exits non-zero below them, so the
number cannot regress. Note there is **no CI in this repository** — no workflow runs on a
push. Every budget and floor described anywhere as "CI-enforced" is in fact enforced by
these scripts, which someone has to run. The browser suite takes roughly 50 minutes and
needs an otherwise idle machine: a timing measurement taken while another suite is running
is not evidence, and has twice produced failures that were pure CPU contention.

## What must never change (the soul)

The intro auto-landing sequence. The scenario presets. The pig at x = 0.

Amended by owner decision (2026-08-25, second amendment): **visual parity with 2021
is retired.** M6 redesigns the UI and graphics around the SpaceX broadcast-overlay
design language (`docs/BROADCAST-UI-PLAN.md`), responsive to phones. What remains
binding is *capability* parity — every 2021 control exists and works — plus the
soul above. During M6, `v2/src/core` is frozen and the seven golden digests in
`tests/golden/unification.test.ts` may not move: the overhaul is pixels, never
physics.

Amended by owner decision (2026-08-25): the soul's original "tuned feel of the 2021
flight model as the reference configuration" is retired. **The shipped physics is full
fidelity, with no flag machinery** — real gravity, local speed of sound, the full ISA,
the collapsed trig identities, and a heatLimit recalibrated to the fidelity model. The
2021 flight model was the frozen parity reference at `v2/tests/fixtures/legacy/` and was
never the shipped feel; as of M10.2 it is not a reference at all, merely archived.
(Effective as of task M2.10, which landed 2026-08-25: there is no
flag machinery anywhere in `v2/src`.)

Amended by owner decision (2026-08-30, effective M10.2 which landed 2026-08-31):
**parity with the 2021 tree is retired as a standard.** "Old one is just a fun project,
we have a much higher standard now." `v2/tests/parity/` — 416 tests across 7 files — is
deleted, and nothing under `v2/` executes, imports or consults the archived tree.
Correctness now means agreement with closed-form physics, published reference data and
stated contracts: things true independently of any implementation. The seven golden
trajectory digests remain the regression contract and are now the ONLY guard on
behaviour, so the Bug-fix/Fidelity tier rules below carry more weight, not less.
Note that *capability* parity (every 2021 control exists and works, `tests/e2e/parity.spec.ts`)
is a different claim, is still enforced, and is unaffected: it never read the 2021 code.
The replacement programme is `docs/VERIFICATION-PLAN.md`.
