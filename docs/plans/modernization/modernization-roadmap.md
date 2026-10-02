# Modernization roadmap

Take the 2D Starship simulator from a rebuild that has never shipped to a game with realistic, test-proven physics and UX at the level of `flight_sim` — all in the JavaScript/TypeScript ecosystem, no Rust, still 2D.

The evidence behind every phase is [docs/research/2026-09-30-modernization-audit.md](../../research/2026-09-30-modernization-audit.md). How the code works today is in `docs/reference/`.

## Steve's decisions (2026-09-30)

- **Base:** the rebuild (`v2/`, from `claude/first-project-rebuild-bjniik`), not a restart. `origin/exp` and `origin/feat/modernize-app` are dead ends and are not used.
- **UI stack:** React 19 + Tailwind 4, with PixiJS 8 kept as the canvas. flight_sim's portable `web/src/ui/` core is **vendored by copy** into this repo, with a provenance note and a drift-check script. Nothing is changed in flight_sim.
- **Visual language:** flight_sim's system (monochrome chrome, 0 px radii, Inter / Inter Tight / JetBrains Mono, motion tokens, one focus owner, contract scanners) with a **Starship brand layer** in place of the Flying Bricks wordmark, brick field and copy rules.
- **Realism scope:** full Ship realism **plus a separate Super Heavy** (33 Raptors, grid fins, hot staging), so booster scenarios fly the booster.
- **Tracking:** local. `docs/plans/` is the system of record; no Jira.

## Steve's decisions (2026-10-01)

- **Entry on lift, as Phase 6b.** Physical drag (cited, built) halves hypersonic drag, and with the physical heat shield the deorbit breaks up at 1,533 K because the autopilot flies entry broadside, where lift is zero. Phase 6b gives the autopilot an entry angle-of-attack schedule that flies on lift, then lands the parked aero tasks on it. The tile limit never moves.
- **Phase 6 resume:** one additional diagnosis attempt (attempt 4) for the iPhone portrait vacuum-plume width failure, with all assertions, bounds and retries unchanged. It is in progress; if it remains red, Phase 6 stops again. The general three-attempt rule remains.
- **Graphics and visuals get their own phase, before UX** (Phase 8), covering engines and plumes, re-entry and heat, the environment, and the vehicle and camera. Like Phase 3, it publishes its visual direction to a private review page and proceeds without waiting; Steve's verdict folds in as a scope change.

## Phases

| # | phase | depends on | end state | verified by |
|---|---|---|---|---|
| 1 | **Green gate and cut-over** | — | `v2/` promoted to the root; a gate that is green on Steve's Mac and in hosted CI; `main` holds the rebuild; Pages serves it | gate exit 0 on arm64 macOS; 3 consecutive green CI runs on `main`; the live URL serves the new build |
| 2 | **Truth harness** | 1 | the three-tier truth hierarchy in TypeScript: closed-form tests, a cited reference-band registry with a report, row-level goldens; property tests; a mutation check; a `window.__simDebug` API | the band report runs in CI; every mutation is caught; light gate ≤ 5 min |
| 3 | **Design pass** | 1 | a written design system for Starship (tokens, type, density, motion, live-scene chrome, brand layer), a new information architecture for every surface, and reviewed prototype screenshots | `docs/design/design-system.md` and `docs/design/ia.md` exist; a review page of prototypes is published for Steve |
| 4 | **React shell** | 3 | no `.svelte` files; React 19 + Tailwind 4 + vendored flight_sim kit; `App.svelte`'s jobs split into Zustand slices and hooks; the design scanners in the build | `npm run build` runs the scanners with self-tests; e2e smoke and a11y specs pass; first-load JS ≤ 300 kB (re-baselined from 250 for React DOM, 2026-10-01) |
| 5 | **Guidance on real physics** | 2 | autopilot burns, throttles and triggers use the simulation's own gravity, thrust and drag instead of g = 9.807; the HUD predictor drops `airResistance_k = 250` for the simulation's drag | every scenario lands under autopilot; the guidance truth tests pass; goldens re-blessed once per change, each with an audit row |
| 6 | **Ship realism** | 5 | felt g, the 1976 thermosphere, Earth's GM and radius, a measured landing reserve, 3 sea-level + 3 vacuum Raptors with the start transient, a heat shield in W/m² and K with a 1,533 K tile limit, a wind profile with seeded turbulence, a rotating ground frame (at rate zero; Earth's rate switches on in 6b) | every Ship scenario lands; truth report 8 of 8 in band; one Linux golden regeneration per change with its audit row; the drag, normal-force, fin and RCS tasks and Earth's rate moved to 6b |
| 6b | **Entry on lift** | 6 | an entry angle-of-attack schedule that flies on lift and holds the tile under 1,533 K, with range control, and Earth's rotation switched on; then, on it, per-component drag (geometric area, cited Cd), body normal force at a centre of pressure, fins as lifting surfaces, and real RCS | the deorbit and re-entry land with the physical drag and heat models; every scenario lands; the parked models' tests pass; a belly-flop that cannot be held is a recorded finding, not a tuning target |
| 7 | **Super Heavy** | 6b, 4 | a second vehicle: 33 Raptors, grid fins, hot staging; booster-sep and RTLS fly the booster to a tower catch; a two-vehicle camera and HUD (functional rendering; the look is Phase 8's) | booster bands in-band; booster scenarios caught under autopilot; e2e covers staging |
| 8 | **Visuals** | 7 | the graphics a player sees, physically driven: per-engine plumes (sea-level and RVac) that expand with altitude, Mach diamonds, staging and landing glare; plasma and tile glow from the skin temperature; atmospheric sky by altitude and sun, the Starbase pad, tower and chopsticks, ocean, coastline, clouds and night; a detailed Ship and Super Heavy with moving fins; cinematic camera, shake, bloom; within a phone frame budget | a published visual-direction review page; pure look functions pinned by tests (as `atmosphere-look.ts` is); screenshot specs per scene; 60 fps desktop and the phone frame budget measured in CI-runnable benches |
| 9 | **UX to flight_sim level** | 4, 8 | modal behaviour, pause, modern keymap with rebinding, gamepad and key legend; guided first flight and per-scenario objectives; a Starship HUD (including the six-engine look); an instrument-grade Black Box; a phone layout that never hides flight data; a graded debrief; toasts | flight_sim's UI quality checklist at desktop / 1024×768 / 390×844; witness specs with positive controls; Steve's verdict on a motion-review page |

Phases 2 and 3 both depend only on 1. The run takes them in table order.

## Why this order

- **The gate comes first.** The rebuild's own log claimed green for eleven milestones while CI failed. Nothing built on a red gate can be trusted, and `main` cannot receive anything until the Pages cut-over.
- **Truth tests before any physics moves.** Phase 1 loosens the goldens from bit-exact to a tolerance; Phase 2 adds the closed-form and reference-band nets that make further golden moves safe.
- **Design before the port.** Porting the flat, mid-tier layout faithfully and then redesigning it would rewrite the UI twice.
- **Guidance before aero.** The autopilot lands only because tuned constants match tuned aero. Changing aero first breaks every landing with no way to tell which change did it.
- **Super Heavy after the Ship is real and the UI is React.** It reuses the Ship's aero and thermal models, and its HUD is built once, in the new shell.
- **Entry on lift before Super Heavy.** The booster reuses the Ship's drag, normal-force and fin models, which only land once the Ship can survive entry on them.
- **Visuals after Super Heavy, before UX.** The booster, staging and the tower catch are the scenes the visuals most need, and the UX phase's motion-review page should show the finished graphics.

## Risks

- **Realism vs playability.** Real aero, real RCS and real heating can make hand-flying unplayable. Phases 6 and 6b keep every scenario landable under autopilot; Phase 9 adds guidance cues and onboarding for hand-flying. If a human cannot land a scenario at all, that is a finding for Steve, not something to tune away.
- **Public Starship data is uneven.** Tier-2 bands carry an A/B source rating; only A rows gate.
- **Vendored kit drift.** The drift check reports differences from flight_sim; it does not block. Steve decides when to sync.
- **Live-site cut-over.** Returning visitors have the 2021 service worker. Phase 1 ships a replacement worker at the same scope and a rollback.
- **Entry on lift may not be enough.** If no schedule within the vehicle's control authority keeps the tile under 1,533 K on physical drag, 6b parks its aero tasks again and reports; the limit does not move and 2021's broadside drag stays.
- **Graphics cost on phones.** Every visual addition is measured against the phone frame budget; an effect that breaks it gets a reduced-quality path, not a pass.
- **Over-importing flight_sim process.** No known-red lists, no 15 MB baselines, no full audit longer than the light gate. Copy the principles, not the machinery.

## Deferred

Recorded, not built: [docs/plans/backlog/README.md](../backlog/README.md).

## Status

Finished phase plans are closed out (`repo-docs-layout`): their record is the merge commit, and their decisions live in `docs/reference/`.

- [x] Phase 1 — Green gate and cut-over (merged `f14aadb`, live 2026-10-01)
- [x] Phase 2 — Truth harness (merged `53e3c26`)
- [x] Phase 3 — Design pass (merged `53e3c26`)
- [x] Phase 4 — React shell (merged `dfab3c8`)
- [x] Phase 5 — Guidance on real physics (merged `b84b746`; goldens on the recording platform `3429ea1`)
- [ ] Phase 6 — Ship realism — **built and reviewed on `claude/ship-realism`; NOT merged.** Latest source `4c03814`: local gate and hosted CI green, but full e2e **427 passed / 1 failed / 11 configured skips**. The latest focused run passed all five vacuum-width checks after attempt 4's screenshot-scale repair, but exposed iPhone portrait low-altitude length at 0.735 against >1. That separate check blocks the close; final full-suite verification is pending. Steve approved one additional vacuum-width diagnosis attempt (attempt 4, in verification); see [the goal contract](modernization-GOAL.md#first-task) and [retained evidence](../../research/2026-10-01-phase6-plume-diagnosis.md). Repair, verify the final build and review before merge; then verify the deploy and tick this line with its merge SHA. Its implementation plan was already closed out; branch commits and `docs/reference/physics-model.md` hold the record. Earth's rate and the parked aero moved to 6b.
- [ ] Phase 6b — Entry on lift ([phase plan](modernization-phase-6b.md))
- [ ] Phase 7 — Super Heavy
- [ ] Phase 8 — Visuals
- [ ] Phase 9 — UX to flight_sim level

Phases 7–9 get their phase plan when the phase before them lands, written by the run from this roadmap with `superpowers:writing-plans`.

Phase 6 checkpoint: attempt 4 corrects screenshot DPR; all five focused vacuum-width checks passed. A separate iPhone portrait low-altitude length failure (0.735 against >1) remains. Its first diagnosis identified white-core exclusion and fixed-region hull contamination; no classifier repair has been made. Final full-suite verification remains required; the no-fifth-attempt vacuum stop rule still applies. See the plume investigation for exact evidence.
