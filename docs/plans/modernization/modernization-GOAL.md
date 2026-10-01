# Modernization — goal contract

Continue independently through ONLY this roadmap:
/Users/stevewang/dev/StarShipSimulator-modernization/docs/plans/modernization/modernization-roadmap.md

Work on branch `claude/modernization`, in the worktree `/Users/stevewang/dev/StarShipSimulator-modernization`. It already exists; don't recreate it. It is the integration branch until Phase 1 lands it on `main` (Task 9 of the Phase 1 plan). After that, each phase gets its own `claude/<slug>` branch from `main` and merges back into `main`.

There is no Jira board for this repo. `docs/plans/` is the system of record: the roadmap's Status checkboxes, the phase plans' task checkboxes, and `docs/plans/backlog/README.md`. Do not look for tickets.

## Current truthful status

- 0% of the roadmap is complete; 0 of 8 phases are done.
- The exact first unfinished task is **Phase 1, Task 1, Step 1** in `docs/plans/modernization/modernization-phase-1.md`: the pure-rename commit that moves `v2/` to the repo root.
- Already done and must not be redone:
  - The rebuild itself, M0–M12.7 (commits up to `d2839b9`): the pure core, the walls, the goldens, the Svelte UI, the view, the audio.
  - The repo-docs pass, commits `d059bf6`..`94f4fe3` on this branch: `AGENTS.md`, `CLAUDE.md` = `@AGENTS.md`, `.agents/skills/` with the `.claude/skills` link, `docs/reference/` (architecture, physics-model, presentation, testing), `docs/research/2026-09-30-modernization-audit.md`, `docs/plans/backlog/README.md`, the old plan files deleted, every citation re-pointed.
- Measured state at the start (Steve's Mac, arm64, Node 25.8.1): lint passes, build passes (221.7 of 250 kB first-load JS), unit tests fail 48 of 1,585 — all in `tests/golden/replay.test.ts`, about 1 ULP. Hosted CI passed 2 of 132 runs on the rebuild branch.
- Tried and rejected, do not repeat:
  - **Pinning Node to fix the goldens.** Node 22 on arm64 still fails 30 of 57 golden tests; the fixtures are bound to the x86-64 Linux platform that recorded them. The fix is a measured tolerance plus a platform-gated fingerprint (Phase 1 Task 3).
  - **Trusting a green log line from the agent's own container.** The rebuild's M12.x entries claimed a green full gate while CI was red. Evidence is hosted CI or Steve's machine, named as such.
  - **Running all five Playwright projects in the merge gate.** About 40 minutes for one project on a shared runner, with timing specs failing under contention. The gate takes a `@smoke` tier; the full suite runs on demand.
  - **`origin/exp` and `origin/feat/modernize-app`** as a base or a source: the first swaps the drag axes, the second does not compile. Do not merge or cherry-pick from them.
  - **Steve-ui for this UI.** steve-ui is generated from on_step and flight_sim does not use it. The kit to reuse is flight_sim's `web/src/ui/`, vendored by copy.
  - **Porting the Svelte components one-for-one into React.** Phase 3's design pass comes first, and the port goes straight into the new structure.
  - **Changing aero before guidance.** The autopilot lands only because tuned constants match tuned aero; Phase 5 rebuilds guidance before Phase 6 touches aero.

## First task

Phase 1, Task 1: move every tracked path under `v2/` to the repo root in a commit containing only renames (`git show --stat -M HEAD` shows only `=>` lines), then fix every path in a second commit, then `npm ci && npm run lint && npm run build` from the root exits 0.

## Preserve these boundaries

- **The soul:** the intro auto-landing sequence, the scenario presets, the pig at x = 0 (`AGENTS.md` § Protected).
- **Capability parity:** every 2021 control keeps a working equivalent (`tests/e2e/parity.spec.ts`). Labels, layout and keys may change.
- **The seven walls** and a pure, deterministic `step()` (`sim-core-conventions`). The one sanctioned global is `window.__simDebug` in `src/app/debug.ts` (Phase 2 Task 5).
- **Physics changes only under a tier** from `physics-change-policy`. This roadmap is the approval for the Fidelity changes Phases 5–7 name. Truth tests are never re-blessed; no tuning constant moves to pass one.
- **Budgets:** first-load JS ≤ 250 kB gzip; the light gate ≤ 5 minutes on Steve's Mac; hosted CI ≤ 20 minutes.
- **`tests/fixtures/legacy/`** (the archived 2021 game) is never modified.
- **flight_sim is read-only.** Copy from `/Users/stevewang/dev/flight_sim/web/src/ui/`; never edit that repo.
- **Stay JavaScript/TypeScript.** No Rust, no WASM, no new language runtime.

## Decisions already made (do not re-ask)

Steve, 2026-09-30:
- **UI:** React 19 + Tailwind 4, PixiJS 8 kept. flight_sim's portable `web/src/ui/` core (primitives, `input/`, `motion/`, `styles/`, `tokens.css`) is vendored by copy into `src/ui/kit/`, with a `PROVENANCE.md` naming the flight_sim commit it came from and a `scripts/kit-drift.mjs` that reports (does not fail on) differences.
- **Look:** flight_sim's visual system with a Starship brand layer: its own wordmark, loading moment and copy vocabulary in place of the Flying Bricks ones.
- **Realism:** full Ship realism and a separate Super Heavy.
- **Tracking:** local, no Jira.

Made by the planner, stated so the run inherits them:
- **The live site cut-over is approved as part of Phase 1.** Pages switches to the Actions source, the 2021 game stays reachable as tag `v0-classic` and branch `classic` (the rollback target), and returning visitors are handed over by a kill-switch `serviceworker.js`.
- **Goldens:** a measured per-field relative tolerance (never above 1e-8), plus a bit-exact fingerprint that runs only on x86-64 Linux / Node 22.
- **Zero known-reds.** A Tier-2 row out of band is reported and ratcheted, never listed as a tolerated failure.
- **Super Heavy lands by tower catch:** a catch box at the tower in 2D, with speed and position limits written in the Phase 7 plan from public flight footage.
- **Keymap:** 2021 parity is broken for a modern scheme (pause, Escape, no Control or Backspace bindings, rebinding, gamepad).
- **Phase 3 publishes, then proceeds.** The design pass publishes its prototypes to a private review page for Steve and continues into Phase 4 without waiting. Steve's verdict, if it arrives, is folded in as a scope change.
- **The M11.3 amended acceptance** (the dt² proof moved to a Kepler ellipse) is accepted.

## Execution rules

- "Unlimited time and resources" is false. Optimize for shipping this roadmap.
- Product implementation is primary. Plans, harnesses, tests, reviews and docs are supporting work.
- Understand the affected code before editing it.
- Do not reset, rebase, discard, or redo completed phases.
- Focused tests while implementing; the full gate once per phase.
- Defer unrelated discoveries to `docs/plans/backlog/README.md`. Do not let them expand the current task.
- Commit at coherent checkpoints using `git-conventions` (`type(scope): outcome sentence`; no milestone IDs).
- Push at those checkpoints. Unattended work that exists only on this disk is one failure from gone.
- Review each phase before you merge it, and fix what is real. Not once at the end — a review of eight phases at once is not eight reviews. Invoke the **`code-review` skill** at `high`. It runs perfectly well unattended; the slash command is not the only way in, and a run that believes otherwise merges every phase on a self-review.
- A phase that touches a protected surface — the live site (Phase 1), physics goldens (Phases 5–7), the soul — gets a reviewer that never saw the code: use the `cross-agent-review` skill, which asks the other coding agent and falls back to ChatGPT Pro, then a fresh subagent. It merges without Steve, so this is required, not optional.
- Merge each phase to `main` once its gate is green and its review is clean (Phase 1 merges `claude/modernization` itself). This roadmap is Steve's approval. Work it did not ask for is not built: add it to the backlog with a `needs-steve` note and report it.
- If hosted CI cannot start because of billing or spending limits, record the exact message and proceed on the complete local gate and a clean independent review.
- **No PR for the program.** Each phase's merge commit is its record and the roadmap's closing section is the summary.
- Never rewrite history.
- Keep the roadmap truthful after each phase: tick its Status line, and write the next phase's plan with `superpowers:writing-plans` (`modernization-phase-<n>.md`) before starting it.
- When a phase closes, move any decision that still holds into `docs/reference/` and keep `AGENTS.md`, the skills and the backlog true.
- Phase 4 writes a `frontend-conventions` project skill with `establish-conventions`, modelled on flight_sim's, and adds it to `AGENTS.md`'s skills table.

## Reporting

Report phases done vs remaining, product changes shipped (what a player can now see or do), completion %, and the current concrete blocker. Test counts and review volume are not progress.

## Autonomy boundary

- Make routine technical decisions without asking.
- Ask Steve only when a decision materially changes scope, authority, or product direction — for example, a realistic model that makes a scenario impossible to land even under autopilot.
- Do not execute, extend, or scan any other roadmap. Do not invent new campaigns. Do not edit flight_sim.

## Completion condition

Stop when all of these are objectively true:
- [ ] every phase in the roadmap's Status list is checked off
- [ ] on `main`, `npm run gate` exits 0 on Steve's Mac, and the last three hosted CI runs on `main` are green (or the billing exception above is recorded)
- [ ] https://steveisnthere.github.io/StarShipSimulator/ serves the React build, and the smoke tier passes against that URL
- [ ] `npm run truth:report` shows every tier-A row IN, and `npm run mutation` shows every mutation CAUGHT
- [ ] every scenario, Ship and Super Heavy, lands under autopilot (`tests/flies-every-scenario.test.ts`)
- [ ] no `.svelte` file remains, and the design-contract and UI-contract scanners pass with their self-tests in `npm run build`
- [ ] `docs/reference/` describes the shipped system, `bash ~/.agent-config/skills/repo-docs-maid/scripts/check.sh` exits 0, and the backlog names every deferral in words
- [ ] the roadmap's closing section summarises what shipped, with the merge commit of each phase

Do not continue into the backlog's unphased items (shareable flights, licensed audio) after this condition is met.
