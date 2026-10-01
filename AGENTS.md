# Starship Simulator — Project Guide

## What is this?

A 2D Starship flight simulator that runs in the browser. Fly it yourself or watch the autopilot land it, from the pad, a booster separation, a return to launch site, an orbital re-entry, a flip, or a landing burn. It started in 2021 as Steve's first project. The current app is a rebuild of it: a pure, deterministic TypeScript simulation core (real gravity, the 1976 standard atmosphere, Raptor thrust that varies with altitude, a centre of mass that moves as the tanks drain), drawn with PixiJS, with a framework-free per-frame HUD.

The bar is Steve's flight sim, `flight_sim` ("Flying Bricks"): realistic physics proven by tests, and Apple-level UX. Everything stays in the JavaScript/TypeScript ecosystem — no Rust, no WASM.

## Branches, tracking and deploy

- **No Jira board.** `docs/plans/` is the system of record. Branches are `<agent>/<slug>` with no key (`git-conventions`).
- `main` is the base: branch from it and merge back into it (`git-conventions`). Pushing to `main` deploys to GitHub Pages at https://steveisnthere.github.io/StarShipSimulator/ (`.github/workflows/deploy.yml`). The 2021 game is tag `v0-classic`; the rollback is in `docs/reference/architecture.md`.
- The live roadmap is [docs/plans/modernization/](docs/plans/modernization/).

## Repo map

| path | holds |
|---|---|
| `src/core/` | the pure simulation: `step.ts`, `state.ts`, `physics/`, `control/`, `autopilot/`, `scenarios.ts`, `rng.ts`, `units.ts` |
| `src/app/` | the fixed-step loop, input, flight recorder, offline/service worker wiring |
| `src/view/` | PixiJS world: camera, sky, sun, stars, clouds, re-entry, particles |
| `src/hud/` | the per-frame HUD binder and its readouts, timeline, debrief, trajectory map maths |
| `src/audio/` | Web Audio engine and the sim-state bindings |
| `src/ui/` | the UI shell (Svelte 5 today; moving to React), tokens, guide, test ids |
| `tests/` | Vitest suites by layer, `golden/` trajectories, `proofs/`, `lint-walls/`, `e2e/` Playwright specs |
| `tests/fixtures/legacy/` | the archived 2021 game — read-only, nothing executes it |
| `scripts/` | build helpers: service worker, budget check, font subsetting, subpath staging |
| `.github/workflows/` | `ci.yml` (every push) and `deploy.yml` (Pages, on `main`) |
| `docs/` | see Docs below |

## The gate

From the repo root. `npm run gate` builds before it tests; that order is required, not a preference:

```bash
npm run gate           # lint, build, test, coverage, e2e smoke, subpath deploy
npm run test:e2e:full  # every browser spec, all five projects (on demand)
npm run bench          # wall-clock budgets (on demand, idle machine)
```

What each proves, the coverage floors, and how to read a red gate: `verification-and-gates`.

## Skills

| skill | owns |
|---|---|
| `sim-core-conventions` | the layer map, the seven lint walls, determinism, units, per-frame performance rules |
| `physics-change-policy` | the Refactor / Bug fix / Fidelity tiers, truth tests vs goldens, regenerating goldens |
| `verification-and-gates` | the gate commands and order, coverage floors, CI coverage, reading results honestly |
| `frontend-conventions` | the interface: shell, session controller, vendored kit, per-frame rules, test ids, layout zones, interface tests |
| `git-conventions` *(global)* | branches, commits, review and the merge rule |
| `repo-docs-layout` *(global)* | where docs, plans and skills live |
| `goalgen` / `rng` *(global)* | turning an objective into a roadmap, phase plans and a `/goal` contract |
| `establish-conventions` *(global)* | writing new convention skills |
| `ui-foundations` *(global)* | UI rules no project may override |

## Protected — ask Steve before changing

- **The soul:** the intro auto-landing sequence, the scenario presets, and the pig at x = 0.
- **Every 2021 control keeps a working equivalent** (`tests/e2e/parity.spec.ts`). Layout, labels and key bindings may change; capability may not disappear.
- **Physics** changes only under a tier from `physics-change-policy`. Golden fixtures in `tests/golden/fixtures/` never move without one.
- **`tests/fixtures/legacy/`** is never modified.
- **The live site:** GitHub Pages settings, `deploy.yml` and the two service workers change only under an approved plan, with an independent review.

## Docs

Plans and specs go in docs/plans/ — this overrides the superpowers default location.

- `docs/plans/` — live plans only; `backlog/` holds deferred work. A finished plan is closed out and deleted.
- `docs/reference/` — how the system works today: architecture, physics model, presentation, testing.
- `docs/design/` — visual and product design, including the screenshots the README uses.
- `docs/research/` — dated audits and investigations.
