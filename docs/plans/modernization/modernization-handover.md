# Modernization — handover

The unattended run's report. Updated as phases land; the last section is always current.

## Status at a glance

| phase | state | merged |
|---|---|---|
| 1 Green gate and cut-over | done, live | `f14aadb` (2026-10-01) |
| 2 Truth harness | done | `53e3c26` |
| 3 Design pass | done (review page published) | `53e3c26` |
| 4 React shell | done, live | `dfab3c8` |
| 5 Guidance on real physics | done, live | `b84b746`, fixed `3429ea1` |
| 6 Ship realism | Tasks 1–4 and 8 done on `claude/ship-realism`, unmerged; 10, 9 and the close remain ([phase 6](modernization-phase-6.md)) | — |
| 6b Entry on lift | planned ([phase 6b](modernization-phase-6b.md)): the parked drag, normal force, fins and RCS, on an entry flown on lift | — |
| 7 Super Heavy | not started | — |
| 8 Visuals | not started (added 2026-10-01) | — |
| 9 UX to flight_sim level | not started | — |

## Shipped

- **The rebuild is live** at https://steveisnthere.github.io/StarShipSimulator/ in place of the 2021 game. Returning visitors' 2021 service worker is retired by a kill switch; the 2021 game is tag `v0-classic`, and branch `classic` is the one-command rollback (`docs/reference/architecture.md`).
- **A gate that is green on your Mac and in hosted CI.** Before: 48 of 1,585 unit tests red on arm64, CI green 2 of 132 runs. Now: `npm run gate` about 3 minutes locally, CI about 8 minutes, green on every push since.
- **A truth harness.** Cited reference bands with a ratchet (`npm run truth:report`), property invariants over every configurable flight, a mutation matrix the suite must turn red (`npm run mutation`, 13 of 13 caught), a debug surface and a browser witness with a positive control.
- **Two real physics bugs fixed**, both found by the new tests: the tank went negative on the emptying step, and the flight editor accepted negative propellant (a vehicle lighter than its own structure).
- **The design pass**: `docs/design/ux-critique.md`, `design-system.md`, `ia.md`, and the review page below.

## For you to look at

- **The prototype review page** (private): https://claude.ai/artifact/9rAusShWLCkpoHMhoVy5TR — today's interface against the proposed one, surface by surface. Your verdict feeds Phase 4/8 as a scope change.

## Decided on your behalf

- **Pages cut-over executed** as part of Phase 1 (it was in the plan), after an independent review that drove the migration and rollback in a real browser.
- **Goldens**: a measured tolerance (1e-8) off the recording platform, exact on it.
- **Fonts**: Inter / Inter Tight / JetBrains Mono, subset to 52 kB, replacing Barlow.
- **Kit reuse**: flight_sim's `web/src/ui` vendored byte for byte, type-checked under its own settings; nothing in flight_sim changed.
- **Layers pause the flight**, Escape closes the top layer, P pauses (from the IA).

- **Flight screen layout (Phase 4)**: the primary cluster moved from bottom-centre to top-centre. At the bottom it covered the vehicle on the pad and at touchdown. On a phone the world ends above the controls so the camera reframes instead of being covered, and a phone held sideways gets its own compact layout. `docs/design/ia.md` records the change.
- **Flight backing deepened from 62% to 68% black**: the new contrast test measured the label grey at 4.11:1 over a noon sky, under the 4.5:1 floor.
- **Engine states drawn by shape, not blinking**: the old blink tests were passing on nothing; the new specs check the shapes and that reduced motion adds no transition.
- **Bundle budget 250 → 300 kB** for React DOM (275 kB measured), and one design-scanner exception for the throttle slider's measured fill. Both recorded where the rules live; confirm or overrule.

- **Phase 6 calls, made unattended (you are buying these; details in [phase 6](modernization-phase-6.md)):**
  - the tile limit is NASA's Shuttle HRSI 1,260 °C (Starship's is not public), so the deorbit may park rather than move the limit;
  - the six-engine UI is minimal now and the look is Phase 9's (UX);
  - *Engines* (all) lights the three sea-level engines, as in 2021;
  - Earth rotation uses a rotating ground frame at Starbase's 26°N, done last;
  - spool-up is the existing ignition transient, not a second invented one;
  - **the landing reserve is measured, not computed (changed during Task 3).** The plan's formula gave 6.3 t, but the landing programme spends 12.0 t engine-out, so a computed reserve would have crashed every deorbit. It is 18 t after Task 4c (the worst engine-out use plus about a third), health-checked the way the deorbit aim is; engine-out deorbits now land with 3.8 t instead of 0.0–0.2 t;
  - **the RVacs (Task 4b)**: 258 tf and 380 s from Wikipedia; the 2.3 m exit is the commonly reported figure with no primary source found. The autopilot lights no RVac in Phase 6 (a vacuum deorbit burn on RVacs is later work); *Engines* (all) lights the sea-level three and shuts everything down. The controls and HUD show six marks in two labelled sets, keys 4–6 for the RVacs: a minimal UI, the look is Phase 9's;
  - **the flip trigger plans on the slowest engine start** (1.2 s, Task 4c), not 2021's 0.6 s constant.

## Parked — yours to decide


- **No LICENSE** in a public repo. Choose one before this grows further.
- **Two dead remote branches**, `origin/exp` and `origin/feat/modernize-app`: nothing in either is worth keeping. Delete when you agree.
- **Codex can't run as a peer reviewer**: `~/.codex/config.toml` names `gpt-6.1-sol`, which a ChatGPT login does not support. ChatGPT Pro and fresh subagents reviewed instead.

- **Guidance (Phase 5)**: the autopilot's throttle laws, landing-burn sizing and the HUD impact predictor run on the simulation's own gravity, thrust and drag. The flip trigger keeps its one-engine pessimism with no added margin, because a one-engine-out deorbit lands with almost no propellant (the 12 t dump limit is the real constraint; backlog).

## Follow-ups recorded for Phase 9 (UX)

- The throttle and yoke sliders follow the simulation only on keys, store changes and when touched, not while the autopilot moves them (the Svelte slider never followed at all).
- The debrief has no grade or comparison with the previous flight yet (ia.md asks for both).

## Incidents

- **2026-10-01, main red for one merge.** Phase 5's goldens were re-blessed on the Mac; they replay bit-exactly only on x86-64 Linux / Node 22, so CI failed in the 16th digit and the deploy did not publish (the live site kept the previous build). Fixed in `3429ea1`: fixtures now come from `.github/workflows/golden-regenerate.yml` (push a branch as `golden/<name>`), `golden:regenerate` refuses anywhere else, and the policy says so.

## Blocker

None.

## Phase 6 progress (2026-10-01)

- Tasks 1–4 on `claude/ship-realism`, each pushed with its Linux-regenerated goldens and an audit row (P6.1–P6.5): felt g, the 1976 thermosphere, the starting Mach, the emptying-step thrust; Earth's GM and radius; the measured landing reserve; six Raptors; the start transient.
- **Independent review of Tasks 1–3** (a fresh subagent; Codex cannot run here): no correctness bugs in the physics. It found one real edge (an ignition finishing on the emptying step thrust for free, fixed in `cff0046`), stale docs and four tests my planet rewrite had made tautological (re-anchored to fixed figures). Both fixed.
- Task 8 (the heat shield) done: Sutton-Graves in W/m², skin temperature in K, the 1,533 K limit; the deorbit peaks at 1,459 K. Task 5 parked (see Parked), and 6, 7, 11 with it.
- Next: Task 10 (wind profile and turbulence), Task 9 (Earth's rotation), then the close (full e2e, `/code-review high`, an independent physics review of the whole phase, merge).

## Roadmap update (2026-10-01, Steve)

- **Phase 6b, Entry on lift**, approved: the autopilot gets an entry angle-of-attack schedule, and the parked aero tasks land on it, with a stop rule if no angle keeps the tile under 1,533 K.
- **Phase 8, Visuals**, added before UX (now Phase 9): engines and plumes, re-entry and heat, the environment, the vehicle and camera. It publishes its visual direction and proceeds without waiting.
- The finished Phase 1–5 plans are closed out; the roadmap's Status names each merge commit.

