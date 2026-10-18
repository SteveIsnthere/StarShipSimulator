# Modernization roadmap

Updated 2026-10-18 UTC. Complete this approved 2D TypeScript simulator roadmap
through Phase 9. The active contract is [GOAL](modernization-GOAL.md), current
source/evidence status is the [handover](modernization-handover.md), and the
remaining dependency sequence is [C0–C6](modernization-completion-plan.md).
[Original audit](../../research/2026-09-30-modernization-audit.md) records the
program's starting point. [Earlier planning text](../../research/2026-10-18-modernization-remaining-audit/plans-before-update/manifest.json)
is preserved exactly; superseded next actions are historical.

## Current position

Eight of ten phases are merged: 1–7 including 6b. Phase count is not an effort
estimate. Phase 8 expanded to include V3 physics/progressive damage and remains
unmerged; Phase 9 has no implementation plan yet. The latest audited main and
successful Pages workflow are `e8a06ff`, while the fetched visual branch is
`cd0118c0`. Last-three main CI outcomes were success/success/failure.

A fresh checkout does not contain the latest documented working state: 52
source files differ and 25 are absent against V22's 803-path manifest. The
[remaining-work audit](../../research/2026-10-18-modernization-remaining-audit/README.md)
records that recovery gap, missing recent evidence and remaining work.
C0 admitted a fresh independently reviewed successor from committed
`8126077a`; exact later restoration and absent acceptance are not claimed.
Six render projection allocations were removed with source-pinned build/lint
and 85/85 expanded checks; frame/optical acceptance remains open. C1 has frozen the
reviewed physical deadline and reconstructed 18 rows. Both landing-burn rows now
pass after a reviewed descending-booster initialization fix; broader mission
acceptance remains open. The declared physical/CPU capture reproduced both
impacts. Reviewed terminal coallocation now prevents the earlier tumble; its
one changed before-flip row still impacts at 16.658 s, with pitch/downspeed
inside catch bounds but lateral error −129.26 m and speed +11.84 m/s outside.
Next is earlier lateral/range acquisition and one paid orbital feasibility
witness. [Bounded evidence](../../research/2026-10-18-phase8-successor/terminal-coallocation/README.md)
includes 71 focused checks across selections, 299.2 kB build, unchanged truth
and 2/2 built-render smoke; no full Fidelity/matrix/release pass. Root/control CPU work has measured support; ISA preparation stays held.
Original body-presence optics passed five cases and timed out at catch. The
reviewed lightweight progress getter then enabled the changed catch assertions
in 18.5 s; saved shell/Playwright pass conflicts with outer tool exit 1 and is
preserved. Source epochs stay separate; R3 realism, motion and frame budgets
remain open. C1 source/tests and diagnostic evidence are preserved as unfinished WIP; the
constructor Refactor is `f76d740c`. Preserve newer dirty work before changes.
[Current successor evidence](../../research/2026-10-18-phase8-successor/README.md).
Do not apply historical recovery patches to existing work.

## Approved decisions retained

- React 19/Tailwind 4 shell, PixiJS 8, read-only vendored flight_sim kit and its
  monochrome visual system with Starship branding. Pure deterministic core;
  no Rust, WASM, new runtime or Jira board.
- Full Ship plus separate Super Heavy, followed by all four visual areas and
  the complete UX scope. Steve's V3/progressive-damage amendment is approved
  Fidelity; model/material/geometry assumptions stay explicit in Phase 8.
- Phase 6b closed with the independently confirmed broadside fallback. Its
  body-axis/paired-fin/translational-RCS/Earth-rate models stay parked and
  named; this does not waive any Phase 7–9 requirement.
- Standing reviewed diagnosis cycles: after three failed attempts, a fresh
  independent review and new evidence-backed approach permit another bounded
  cycle. Preserve authority, limits, assertions, floors and retry zero.
- Ordinary implementation, planning, commits/pushes, independent reviews,
  clean phase merges and deploy verification are already authorized. Publish
  design/motion review pages and proceed; owner verdict is recorded separately.
- Cloud acceptance supersedes earlier Mac-only wording, with unchanged budgets
  and honest CPU/browser/renderer/viewport metadata. Missing global guidance
  follows best practices; independent high review remains mandatory.
- Steve approved a physically derived orbital mission horizon with starts
  and targets fixed on 2026-10-18 UTC. Preserve all 18 rows, non-orbital
  900-second caps and all physical/work/terminal assertions. The reviewed test-only
  deadline is frozen; actual paid phase witnesses and missing model-aware
  guidance remain open. The decision is resolved, flight acceptance is open.

## Phases

| # | phase | depends on | end state | verified by |
|---|---|---|---|---|
| 1 | **Green gate and cut-over** | — | `v2/` promoted to the root; the gate is green in the reconciled cloud runtime and hosted CI; `main` holds the rebuild; Pages serves it | `npm run gate` exit 0 on `main` in the reconciled Debian 13/Node 22 cloud environment; 3 consecutive green CI runs on `main`; the live URL serves the verified build |
| 2 | **Truth harness** | 1 | the three-tier truth hierarchy in TypeScript: closed-form tests, a cited reference-band registry with a report, row-level goldens; property tests; a mutation check; a `window.__simDebug` API | the band report runs in CI; every mutation is caught; light gate ≤ 5 min |
| 3 | **Design pass** | 1 | a written design system for Starship (tokens, type, density, motion, live-scene chrome, brand layer), a new information architecture for every surface, and reviewed prototype screenshots | `docs/design/design-system.md` and `docs/design/ia.md` exist; a review page of prototypes is published for Steve |
| 4 | **React shell** | 3 | no `.svelte` files; React 19 + Tailwind 4 + vendored flight_sim kit; `App.svelte`'s jobs split into Zustand slices and hooks; the design scanners in the build | `npm run build` runs the scanners with self-tests; e2e smoke and a11y specs pass; first-load JS ≤ 300 kB (re-baselined from 250 for React DOM, 2026-10-01) |
| 5 | **Guidance on real physics** | 2 | autopilot burns, throttles and triggers use the simulation's own gravity, thrust and drag instead of g = 9.807; the HUD predictor drops `airResistance_k = 250` for the simulation's drag | every scenario lands under autopilot; the guidance truth tests pass; goldens re-blessed once per change, each with an audit row |
| 6 | **Ship realism** | 5 | felt g, the 1976 thermosphere, Earth's GM and radius, a measured landing reserve, 3 sea-level + 3 vacuum Raptors with the start transient, a heat shield in W/m² and K with a 1,533 K tile limit, a wind profile with seeded turbulence, a rotating ground frame (at rate zero; Earth's rate switches on in 6b) | every Ship scenario lands; truth report 8 of 8 in band; one Linux golden regeneration per change with its audit row; the drag, normal-force, fin and RCS tasks and Earth's rate moved to 6b |
| 6b | **Entry on lift — closed under approved fallback** | 6 | shipped Task 5/braking/debrief fixes and broadside aero; independently infeasible body/fin/RCS/Earth-rate models remain explicitly parked | completed closure `c2ae5e4`, retained evidence and named backlog deferrals; do not reopen this phase |
| 7 | **Super Heavy** | 6b, 4 | a second vehicle: 33 Raptors, grid fins, hot staging; booster-sep and RTLS fly the booster to a tower catch; a two-vehicle camera and HUD (functional rendering; the look is Phase 8's) | booster bands in-band; booster scenarios caught under autopilot; e2e covers staging |
| 8 | **V3 physics, progressive damage and visuals** | 7 | active sourced V3 propulsion/geometry; reduced-order thermal/material capability loss, conserved detachment and physical debris; shared reference-based intact/broken rendering; the graphics a player sees, physically driven: per-engine plumes (sea-level and RVac) that expand with altitude, Mach diamonds, staging and landing glare; plasma and tile glow from the skin temperature; atmospheric sky by altitude and sun, the Starbase pad, tower and chopsticks, ocean, coastline, clouds and night; a detailed Ship and Super Heavy with moving fins; cinematic camera, shake, bloom; within a phone frame budget | a published visual-direction review page; pure look functions pinned by tests (as `atmosphere-look.ts` is); screenshot specs per scene; 60 fps desktop and the phone frame budget measured in cloud benches; all R1–R4 physics/damage/scenario/coverage/review acceptance |
| 9 | **UX to flight_sim level** | 4, 8 | modal behaviour, pause, modern keymap with rebinding, gamepad and key legend; guided first flight and per-scenario objectives; a Starship HUD (including the six-engine look); an instrument-grade Black Box; a phone layout that never hides flight data; a graded debrief; toasts | flight_sim's UI quality checklist at desktop / 1024×768 / 390×844; witness specs with positive controls; Steve's verdict on a motion-review page |

Phases 2 and 3 both depend only on 1. The run takes them in table order.

## Remaining execution order

| Package | Required output |
|---|---|
| C0 Recovery | Admitted reviewed successor from committed source; exact later bytes/results remain unknown |
| C1 Mission contract | Explicit product ruling and meaningful land/catch assertions for all IDs/both vehicles |
| C2 Physics and CPU | Accepted R1/R2 integration, units, unchanged coverage, golden replay, truth and mutations |
| C3 Visuals and budgets | Reference-based V3/damage motion, six scenes, full/reduced behavior and actual frame/cadence acceptance |
| C4 Phase 8 release | Fresh independent review, complete gates, reviewed main merge, CI/Pages/live verification and closure |
| C5 Phase 9 UX | Concrete plan after Phase 8, complete input/onboarding/HUD/Black Box/debrief/layout/accessibility work and release |
| C6 Final goal | Every completion criterion on final main and final served build, including last three green CI runs |

[Completion plan](modernization-completion-plan.md) specifies admission, checks
and dependencies. No task or result is complete merely because a launcher,
source review, partial witness or recording exists. The bounded RTLS scheduling
feasibility task is already complete and must not be restarted.

## Status

- [x] Phase 1 — Green gate and cut-over (merged `f14aadb`, live 2026-10-01)
- [x] Phase 2 — Truth harness (merged `53e3c26`)
- [x] Phase 3 — Design pass (merged `53e3c26`)
- [x] Phase 4 — React shell (merged `dfab3c8`)
- [x] Phase 5 — Guidance on real physics (merged `b84b746`; goldens on the recording platform `3429ea1`)
- [x] Phase 6 — Ship realism (merged `080f108`, live 2026-10-01 Vancouver time). Complete gate green on main; branch full e2e 438 passed / 0 failed / 11 configured skips. CI `36956332929` and Pages `36956332944` succeeded at the merge SHA. Live deployment smoke 5/5 passed; served service worker matches the verified build byte for byte, cache version `b72a7b0bad39`. Hosted menu smoke needed existing retries on two checks; retained as Phase 9 debt. [Close evidence](../../research/2026-10-01-phase6-close.md). Earth's rate and the parked aero moved to 6b.
- [x] Phase 6b — Closed under the approved broadside fallback (merged `c2ae5e4`, live 2026-10-02). Task 5/braking/debrief and continuous exhaust fixes ship; body-axis/fin/RCS/Earth-rate remain explicitly parked. Complete main gate, independent high review, final full browser 480 passes / zero failures / 11 configured skips / zero retries, all 21 mutation faults, main CI37071475434/Pages37071475425 and live smoke5/5 pass. All 44 served assets match version3da4ee45585e. Two existing hosted menu flakes remain Phase 9. [Closure evidence](../../research/2026-10-02-phase6b-close.md).
- [x] Phase 7 — Super Heavy (runtime merge `17657d1`, verified harness merge `b3263a9`, live 2026-10-03). Actual main gate289.26s, main CI37128220108/Pages37128220122, post-deploy live13/13 and all44assets+worker pass. Five-project full browser505passes/zero failures/zero retries; all21mutations; all11TierA IN. Pages has two existing menu retry1 flakes, retained Phase9 debt. [Closure evidence](../../research/2026-10-03-phase7-close.md).
- [ ] Phase 8 — V3 physics, progressive damage and visuals
- [ ] Phase 9 — UX to flight_sim level

Phases 7–9 get their phase plan when the phase before them lands, written by the run from this roadmap with `superpowers:writing-plans`.

## Review pages

The private [six-scene visual direction](https://chatgpt.com/space/page_86fcf9be7d708191ad082fb932b96ef0)
is published; source/receipts are in `docs/design/visual-direction/`. It is an
authored concept, not actual simulation/performance evidence. Existing prototype
review: https://claude.ai/artifact/9rAusShWLCkpoHMhoVy5TR.
The final actual-build motion review remains required after UX/rendering work.

## Deferrals and risks

The [backlog](../backlog/README.md) retains assigned visual/UX debts and unphased
features. Reconcile assigned debts against the recovered source before closure;
do not expand into shareable flights, licensed audio, a sixth preset or parked
physics. Keep generic max-Q reference-data limitations named without changing
bands. Flight/CPU failures, unsupported mission contracts and failed cloud frame
budgets are open engineering blockers, not accepted known-reds.

## Closing record — pending

Phase 8 merge/deployment: pending. Phase 9 merge/deployment: pending.
Final main source, gate time, three CI runs, Pages/live asset identity, smoke,
truth, mutations, scenario matrix, frame/UX acceptance and motion-review URL
must be recorded here before marking the roadmap complete.
