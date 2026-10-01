# Modernization roadmap

Take the 2D Starship simulator from a rebuild that has never shipped to a game with realistic, test-proven physics and UX at the level of `flight_sim` — all in the JavaScript/TypeScript ecosystem, no Rust, still 2D.

The evidence behind every phase is [docs/research/2026-09-30-modernization-audit.md](../../research/2026-09-30-modernization-audit.md). How the code works today is in `docs/reference/`.

## Steve's decisions (2026-09-30)

- **Base:** the rebuild (`v2/`, from `claude/first-project-rebuild-bjniik`), not a restart. `origin/exp` and `origin/feat/modernize-app` are dead ends and are not used.
- **UI stack:** React 19 + Tailwind 4, with PixiJS 8 kept as the canvas. flight_sim's portable `web/src/ui/` core is **vendored by copy** into this repo, with a provenance note and a drift-check script. Nothing is changed in flight_sim.
- **Visual language:** flight_sim's system (monochrome chrome, 0 px radii, Inter / Inter Tight / JetBrains Mono, motion tokens, one focus owner, contract scanners) with a **Starship brand layer** in place of the Flying Bricks wordmark, brick field and copy rules.
- **Realism scope:** full Ship realism **plus a separate Super Heavy** (33 Raptors, grid fins, hot staging), so booster scenarios fly the booster.
- **Tracking:** local. `docs/plans/` is the system of record; no Jira.

## Phases

| # | phase | depends on | end state | verified by |
|---|---|---|---|---|
| 1 | **Green gate and cut-over** | — | `v2/` promoted to the root; a gate that is green on Steve's Mac and in hosted CI; `main` holds the rebuild; Pages serves it | gate exit 0 on arm64 macOS; 3 consecutive green CI runs on `main`; the live URL serves the new build |
| 2 | **Truth harness** | 1 | the three-tier truth hierarchy in TypeScript: closed-form tests, a cited reference-band registry with a report, row-level goldens; property tests; a mutation check; a `window.__simDebug` API | the band report runs in CI; every mutation is caught; light gate ≤ 5 min |
| 3 | **Design pass** | 1 | a written design system for Starship (tokens, type, density, motion, live-scene chrome, brand layer), a new information architecture for every surface, and reviewed prototype screenshots | `docs/design/design-system.md` and `docs/design/ia.md` exist; a review page of prototypes is published for Steve |
| 4 | **React shell** | 3 | no `.svelte` files; React 19 + Tailwind 4 + vendored flight_sim kit; `App.svelte`'s jobs split into Zustand slices and hooks; the design scanners in the build | `npm run build` runs the scanners with self-tests; e2e smoke and a11y specs pass; first-load JS ≤ 250 kB |
| 5 | **Guidance on real physics** | 2 | autopilot and predictor use the simulation's own gravity, atmosphere and aero instead of g = 9.807 and `airResistance_k = 250` | every scenario lands under autopilot; Tier-1 tests pass; goldens re-blessed once with an audit row |
| 6 | **Ship realism** | 5 | Mach-dependent drag; normal force and centre of pressure; geometric fins; an integrated heat-shield model in stated units; Earth rotation in an inertial 2D frame; wind profile and seeded turbulence; real RCS; 3 sea-level + 3 vacuum Raptors with spool-up; R⊕ = 6,371 km | Tier-2 bands in-band for the Ship rows; every Ship scenario lands; one golden re-bless per change with its audit row |
| 7 | **Super Heavy** | 6, 4 | a second vehicle: 33 Raptors, grid fins, hot staging; booster-sep and RTLS fly the booster to a tower catch; a two-vehicle camera and HUD | booster bands in-band; booster scenarios land under autopilot; e2e covers staging |
| 8 | **UX to flight_sim level** | 4, 7 | modal behaviour, pause, modern keymap with rebinding, gamepad and key legend; guided first flight and per-scenario objectives; a Starship HUD; an instrument-grade Black Box; a phone layout that never hides flight data; a graded debrief; toasts; a phone frame-time budget | flight_sim's UI quality checklist at desktop / 1024×768 / 390×844; witness specs with positive controls; Steve's verdict on a motion-review page |

Phases 2 and 3 both depend only on 1. The run takes them in table order.

## Why this order

- **The gate comes first.** The rebuild's own log claimed green for eleven milestones while CI failed. Nothing built on a red gate can be trusted, and `main` cannot receive anything until the Pages cut-over.
- **Truth tests before any physics moves.** Phase 1 loosens the goldens from bit-exact to a tolerance; Phase 2 adds the closed-form and reference-band nets that make further golden moves safe.
- **Design before the port.** Porting the flat, mid-tier layout faithfully and then redesigning it would rewrite the UI twice.
- **Guidance before aero.** The autopilot lands only because tuned constants match tuned aero. Changing aero first breaks every landing with no way to tell which change did it.
- **Super Heavy after the Ship is real and the UI is React.** It reuses the Ship's aero and thermal models, and its HUD is built once, in the new shell.

## Risks

- **Realism vs playability.** Real aero, real RCS and real heating can make hand-flying unplayable. Phase 6 keeps every scenario landable under autopilot; Phase 8 adds guidance cues and onboarding for hand-flying. If a human cannot land a scenario at all, that is a finding for Steve, not something to tune away.
- **Public Starship data is uneven.** Tier-2 bands carry an A/B source rating; only A rows gate.
- **Vendored kit drift.** The drift check reports differences from flight_sim; it does not block. Steve decides when to sync.
- **Live-site cut-over.** Returning visitors have the 2021 service worker. Phase 1 ships a replacement worker at the same scope and a rollback.
- **Over-importing flight_sim process.** No known-red lists, no 15 MB baselines, no full audit longer than the light gate. Copy the principles, not the machinery.

## Deferred

Recorded, not built: [docs/plans/backlog/README.md](../backlog/README.md).

## Status

- [x] Phase 1 — Green gate and cut-over (merged `f14aadb`, live 2026-10-01) ([phase plan](modernization-phase-1.md))
- [x] Phase 2 — Truth harness ([phase plan](modernization-phase-2.md))
- [x] Phase 3 — Design pass ([phase plan](modernization-phase-3.md))
- [ ] Phase 4 — React shell
- [ ] Phase 5 — Guidance on real physics
- [ ] Phase 6 — Ship realism
- [ ] Phase 7 — Super Heavy
- [ ] Phase 8 — UX to flight_sim level

Phases 3–8 get their phase plan when the phase before them lands, written by the run from this roadmap with `superpowers:writing-plans`.
