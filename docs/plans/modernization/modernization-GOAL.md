# Modernization — goal contract

Continue independently through ONLY this roadmap:
/Users/stevewang/dev/StarShipSimulator-realism/docs/plans/modernization/modernization-roadmap.md

Run from the worktree `/Users/stevewang/dev/StarShipSimulator-realism`. Each phase gets its own `claude/<slug>` branch from `main` and merges back into `main`; Phase 6 is `claude/ship-realism` (checked out here, pushed, unmerged), Phase 6b is `claude/entry-on-lift` (create it from `main` after Phase 6 merges).

There is no Jira board for this repo. `docs/plans/` is the system of record: the roadmap's Status checkboxes, the phase plans' task checkboxes, `modernization-handover.md`, and `docs/plans/backlog/README.md`. Do not look for tickets.

## Current truthful status

- Phases 1–5 are done and live on `main` (merges `f14aadb`, `53e3c26`, `dfab3c8`, `b84b746`, `3429ea1`). **Phase 6 is built, gated and independently reviewed on `claude/ship-realism` (head `f81908b`, pushed) but NOT merged.** 5 of 10 phases done (1–5, 6, 6b, 7, 8, 9); about 58% counting Phase 6 as nearly complete.
- **The exact first unfinished task is Phase 6's close** (`modernization-handover.md`, "Where Phase 6 stopped"): merge `claude/ship-realism` (full e2e already green: 428 passed, 0 failed); merge it `--no-ff` into `main`; push; verify the deploy; tick the roadmap's Phase 6 line with the merge commit. Then Phase 6b, Task 1 (`modernization-phase-6b.md`) on `claude/entry-on-lift` from `main`; its coefficient functions come from `claude/drag-parked` (commit `a06a7a4`; not its blend, not its `step.ts` wiring, not its `XLIFT` experiment line).
- Already done and must not be redone (on `claude/ship-realism`):
  - Phase 6: felt g and the g-limit on felt g; the USSA76 thermosphere; the starting Mach; the emptying-step thrust; GM and R; the 18 t `landingReserve`; six Raptors with fixed RVacs (no gimbal); the 1.2 s start transient; the heat shield (Sutton-Graves W/m², skin temperature against a radiative sink, break-up on 1,533 K); the wind profile and Dryden turbulence; the rotating ground frame and all its plumbing at rate zero (`frameRotationRate`; Earth's rate is 6b Task 1b).
  - Golden audit rows P6.1–P6.5, P6.8, P6.10–P6.12 in `tests/golden/unification.test.ts`.
- Tried and rejected, do not repeat:
  - **Physical drag with a broadside entry** (`claude/drag-parked`): the deorbit breaks up at 1,533 K at 65 km. Swapping only the lift coefficient for a Newtonian one changes nothing at 89°. Phase 6b does it on lift, with body-axis forces.
  - **Earth's rate on a broadside, uncontrolled descent:** the circularize-then-deorbit flight misses by 11.1 km against its 10 km acceptance; no single `DEORBIT_ENTRY_RANGE` holds both that and the 1 km health test. It waits for 6b's range control (Task 1b).
  - **Codex as the peer reviewer:** `~/.codex/config.toml` names `gpt-6.1-sol`, unsupported on a ChatGPT login. Go straight to ChatGPT Pro (`ask-chatgpt`, the GitHub connector at the pushed SHA), then a fresh subagent.
  - **Editing source while `npm run mutation` runs:** it mutates and restores files in place; an edit during the run is lost or corrupts the result. Run it alone.
  - **A landing reserve computed from the burn predictor** (one engine from the trigger plus the ignition delay, 6.3 t): the landing programme spends 12–14 t; it would crash every deorbit. The reserve is measured.
  - **A single `precisionAlignment` in `horizontalSteering`:** it moves two goldens.
  - **Added flip-trigger margins** (a flat 100 m; 0.9 s) on the old 12 t dump: they ran the engine-out deorbit dry.
  - **Re-blessing goldens on the Mac:** they replay exactly only on x86-64 Linux / Node 22. Regenerate through `.github/workflows/golden-regenerate.yml` (`git push origin HEAD:golden/<name>`, `gh run download <id> -n golden-fixtures`), then delete the `golden/` branch.
  - **Pinning Node to fix goldens; trusting the agent container's green log; all five Playwright projects in the merge gate; `origin/exp` and `origin/feat/modernize-app`; steve-ui; porting Svelte one-for-one; aero before guidance** (all from Phases 1–5; still dead ends).

## First task

Close Phase 6. Everything is verified on `claude/ship-realism` (gate, mutation 18/18, truth 8/8, `/code-review high`, three-round independent review, full e2e 428 passed / 0 failed); every commit after the e2e run is docs only. From the main checkout `/Users/stevewang/dev/StarShipSimulator` (on `main`): `git pull`, `git merge --no-ff claude/ship-realism`, `npm run gate`, push, and confirm the Pages deploy and the smoke tier against https://steveisnthere.github.io/StarShipSimulator/. Tick the roadmap's Phase 6 line with the merge commit and update the handover's table. If any code changes before the merge, re-run the full e2e (`plume.spec.ts` "blooms wider than the ship in vacuum" is a known flaky backlog row).

Then Phase 6b, Task 1: create `claude/entry-on-lift` from the new `main`; cherry-pick the coefficient functions and `tests/core/drag-model.test.ts` from `claude/drag-parked`; write the failing body-axis tests (`tests/core/body-axis-aero.test.ts`); then the one force function, the sweep script, the schedule, and the Linux regeneration, exactly as the plan lists.

## Preserve these boundaries

- **The soul:** the intro auto-landing sequence, the scenario presets, the pig at x = 0 (`AGENTS.md` § Protected).
- **Capability parity:** every 2021 control keeps a working equivalent (`tests/e2e/parity.spec.ts`). Labels, layout and keys may change.
- **The seven walls** and a pure, deterministic `step()` (`sim-core-conventions`). The one sanctioned global is `window.__simDebug` in `src/app/debug.ts` (Phase 2 Task 5).
- **Physics changes only under a tier** from `physics-change-policy`. This roadmap is the approval for the Fidelity changes Phases 5–7 name. Truth tests are never re-blessed; no tuning constant moves to pass one.
- **Budgets:** first-load JS ≤ 300 kB gzip (250 until the React shell, whose React DOM costs about 45 kB; re-baselined in Phase 4 and recorded in the handover); the light gate ≤ 5 minutes on Steve's Mac; hosted CI ≤ 20 minutes.
- **`tests/fixtures/legacy/`** (the archived 2021 game) is never modified.
- **flight_sim is read-only.** Copy from `/Users/stevewang/dev/flight_sim/web/src/ui/`; never edit that repo.
- **Stay JavaScript/TypeScript.** No Rust, no WASM, no new language runtime.
- **The tile limit is 1,533 K** and never moves to make a flight survive. The 18 t landing reserve and `DEORBIT_ENTRY_RANGE` are measured constants with health tests; re-measure them, never loosen their tests.
- **Graphics budget:** every Phase 8 effect is measured against 60 fps on desktop and the phone frame budget the Phase 8 plan states; an effect that breaks it ships a reduced-quality path.

## Decisions already made (do not re-ask)

Steve, 2026-09-30:
- **UI:** React 19 + Tailwind 4, PixiJS 8 kept. flight_sim's portable `web/src/ui/` core (primitives, `input/`, `motion/`, `styles/`, `tokens.css`) is vendored by copy into `src/ui/kit/`, with a `PROVENANCE.md` naming the flight_sim commit it came from and a `scripts/kit-drift.mjs` that reports (does not fail on) differences.
- **Look:** flight_sim's visual system with a Starship brand layer: its own wordmark, loading moment and copy vocabulary in place of the Flying Bricks ones.
- **Realism:** full Ship realism and a separate Super Heavy.
- **Tracking:** local, no Jira.

Steve, 2026-10-01:
- **Phase 6b, Entry on lift**, takes the parked drag, normal-force, fin and RCS tasks, on an entry angle-of-attack schedule (`modernization-phase-6b.md`, with its stop rule).
- **Phase 8, Visuals, before Phase 9, UX.** All four areas: engines and plumes (per-engine sea-level and RVac plumes expanding with altitude, Mach diamonds, staging and landing glare); re-entry and heat (plasma and tile glow from the skin temperature, belly-flop shading); environment (sky by altitude and sun, Starbase pad, tower and chopsticks, ocean, coastline, clouds, night); vehicle and camera (detailed Ship and Super Heavy, moving fins, cinematic moves, shake, bloom). Phase 8 publishes its visual direction to a private review page with the `Artifact` tool and proceeds without waiting; Steve's verdict folds in as a scope change.

Phase 6 calls made unattended (now in `docs/reference/physics-model.md` and the handover): the HRSI 1,533 K limit, judged on the tile's temperature against a radiative sink (the air below 86 km); the six-engine UI minimal until Phase 9; *Engines* (all) lights the three sea-level engines and shuts all six; the RVacs are fixed (no gimbal) and the autopilot lights none; the RVac exit diameter 2.3 m (commonly reported, no primary source); the rotating ground frame at 26°N built at rate zero, Earth's rate switched on in 6b once the entry has range control; spool-up is the existing ignition delay; the wind is a surface wind on NASA's profile, held above 150 m.

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
- Keep the roadmap truthful after each phase: tick its Status line, close out the finished phase plan (delete it; the merge commit and `docs/reference/` hold the record), and write the next phase's plan with `superpowers:writing-plans` (`modernization-phase-<n>.md`) before starting it. Keep `modernization-handover.md` current at each checkpoint.
- When a phase closes, move any decision that still holds into `docs/reference/` and keep `AGENTS.md`, the skills and the backlog true.
- **A real defect found by a new test is fixed, even in a phase that otherwise forbids physics changes.** Bug-fix tier only: the failing test first, the fix, a trajectory audit of every golden in the commit body, and an independent reviewer before merge. That precedence beats any phase's "no core behaviour change" constraint.
- **Diagnosis is bounded.** A failing or flaky check gets at most three diagnosis attempts, each recorded (trace, screenshot, hypothesis, result). Then it is fixed, or the phase stops with that check named as the blocker and its evidence kept. Never loosen a bound, delete an assertion, or add a retry to get past it.
- Independent work runs in parallel only where it does not share files or goldens: reviews in the background while the next task proceeds. Physics tasks are serial (they share `step.ts` and every golden).

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
- [ ] `npm run truth:report` shows every tier-A row IN, and the registry covers at least: Raptor sea-level and vacuum Isp and thrust, RVac Isp, Ship and Super Heavy propellant and dry mass, engine counts, planet radius, max-Q altitude and value on an ascent, and re-entry peak heating — a row may not be deleted to make this true
- [ ] `npm run mutation` shows every mutation CAUGHT by a named assertion failure, with the unmodified control run passing first
- [ ] every scenario, Ship and Super Heavy, lands (or is caught) under autopilot, asserted per scenario id in `tests/flies-every-scenario.test.ts` — not "reaches a definite outcome"; or, if Phase 6b's stop rule fired, the deorbit lands on 2021's broadside drag and the parked tasks are named in the handover as Steve's decision
- [ ] Phase 8's visual-direction review page is published and linked from the roadmap, the screenshot specs for launch, staging, belly flop, entry, landing and catch pass, and the phone frame budget is measured and met
- [ ] no `.svelte` file remains, and the design-contract and UI-contract scanners pass with their self-tests in `npm run build`
- [ ] `docs/reference/` describes the shipped system, `bash ~/.agent-config/skills/repo-docs-maid/scripts/check.sh` exits 0, and the backlog names every deferral in words
- [ ] the roadmap's closing section summarises what shipped, with the merge commit of each phase
- [ ] a motion-review page for Steve (launch, staging, belly flop, landing, catch) is published and linked from the closing section; his verdict is owner acceptance, recorded separately — the run is engineering-complete without it

Do not continue into the backlog's unphased items (shareable flights, licensed audio, a sixth preset) after this condition is met.
