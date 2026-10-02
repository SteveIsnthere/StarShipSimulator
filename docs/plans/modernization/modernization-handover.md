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
| 6 Ship realism | built, physics reviewed on `claude/ship-realism`; **unmerged** — attempt 4 passed focused vacuum-width checks; separate iPhone low-altitude length failure remains; full suite pending; Earth's rate (9b) and the parked aero moved to 6b | — |
| 6b Entry on lift | planned ([phase 6b](modernization-phase-6b.md)): the parked drag, normal force, fins and RCS, on an entry flown on lift | — |
| 7 Super Heavy | not started | — |
| 8 Visuals | not started (added 2026-10-01) | — |
| 9 UX to flight_sim level | not started | — |

## Shipped

- **The rebuild is live** at https://steveisnthere.github.io/StarShipSimulator/ in place of the 2021 game. Returning visitors' 2021 service worker is retired by a kill switch; the 2021 game is tag `v0-classic`, and branch `classic` is the one-command rollback (`docs/reference/architecture.md`).
- **A gate that is green on your Mac and in hosted CI.** Before: 48 of 1,585 unit tests red on arm64, CI green 2 of 132 runs. Now: `npm run gate` about 3 minutes locally, CI about 8 minutes, green on every push since.
- **A truth harness.** Cited reference bands with a ratchet (`npm run truth:report`), property invariants over every configurable flight, a mutation matrix the suite must turn red (`npm run mutation`, 13 of 13 caught), a debug surface and a browser witness with a positive control.
- **Two real physics bugs fixed**, both found by the new tests: the tank went negative on the emptying step, and the flight editor accepted negative propellant (a vehicle lighter than its own structure).
- **Phase 6, Ship realism** (on its branch, merging next): a real Earth (GM, radius, the 1976 atmosphere to its thermosphere), felt g, six Raptors with three fixed RVacs, a heat shield in kelvin against a 1,533 K tile, wind that grows with height and gusts, and a rotating-frame model ready for Earth's spin. Every scenario still lands under autopilot.
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

- **Phase 6 calls, made unattended (you are buying these; the model is in `docs/reference/physics-model.md`):**
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
- **Codex can't run as a peer reviewer**: `~/.codex/config.toml` names `gpt-6.1-sol`, which a ChatGPT login does not support (still so on 2026-10-01, Phase 6's close). ChatGPT Pro and fresh subagents reviewed instead. Changing that lever is yours.

- **Guidance (Phase 5)**: the autopilot's throttle laws, landing-burn sizing and the HUD impact predictor run on the simulation's own gravity, thrust and drag. The flip trigger keeps its one-engine pessimism with no added margin, because a one-engine-out deorbit lands with almost no propellant (the 12 t dump limit is the real constraint; backlog).

## Follow-ups recorded for Phase 9 (UX)

- The throttle and yoke sliders follow the simulation only on keys, store changes and when touched, not while the autopilot moves them (the Svelte slider never followed at all).
- The debrief has no grade or comparison with the previous flight yet (ia.md asks for both).

## Incidents

- **2026-10-01, main red for one merge.** Phase 5's goldens were re-blessed on the Mac; they replay bit-exactly only on x86-64 Linux / Node 22, so CI failed in the 16th digit and the deploy did not publish (the live site kept the previous build). Fixed in `3429ea1`: fixtures now come from `.github/workflows/golden-regenerate.yml` (push a branch as `golden/<name>`), `golden:regenerate` refuses anywhere else, and the policy says so.

## Blocker

Phase 6 is stopped by `plume.spec.ts` "and blooms wider than the ship in
vacuum" on iPhone portrait. The final full run on `4c03814` failed it after
three recorded diagnosis attempts. The complete local gate and hosted CI
passed, but they do not replace this required release check. No merge or
Phase 6b implementation has happened. Final result: 427 passed, 1 failed, 11 configured skips (32.5 minutes).
Vacuum width was 0.70 against >0.7176042091538909.
Steve approved one additional diagnosis attempt on 2026-10-01, with all
assertions, bounds and retries unchanged. Attempt 4 repaired the screenshot/renderer pixel-scale mismatch and passed focused vacuum-width checks. A separate low-altitude length failure remains; final full-suite verification is pending. Resume
from the retained evidence and the goal contract's First task. If the same
check remains red, stop again; no fifth attempt is authorized.

Evidence and diagnosis: [plume investigation](../../research/2026-10-01-phase6-plume-diagnosis.md).

## Where Phase 6 stopped (2026-10-01)

- Latest graphics change: `4c03814`, the plume timing/projection and flight-reset repair. Physics and goldens are unchanged from the independently reviewed implementation. Checkpoint `6e3f514` changes the screenshot-scale helper and adds its regression fixture; its complete local gate passed. The checkpoint is pushed; the low-altitude length failure and pending full suite still prevent a merge.
- Historical verification before the requested rerun, on `f81908b`: `npm run gate` green (1,935 tests, coverage floors, e2e smoke, subpath deploy); `npm run mutation` 18 of 18 caught; `npm run truth:report` 8 of 8; `/code-review high`; independent physics review (ChatGPT Pro, three rounds, every finding fixed: fixed RVacs, the turbulence sweep, the radial coast, the throttle law, break-up on the tile temperature).
- Historical `npm run test:e2e:full` before this goal's requested rerun: **428 passed, 0 failed** (33 min, all five projects). This is superseded by the failing reruns below. Earlier full-run failures (the debrief's stale heat bound, a pixels flake) are fixed or re-ran green.
- Current source verification on `4c03814`: complete local gate green (1,940 tests, coverage floors, smoke and subpath deployment), hosted CI `36940931396` green, independent graphics review clean; **full e2e red: 427 passed, 1 failed, 11 configured skips**.
- Requested rerun on `92ed3d6`: 426 passed, 2 failed, 11 configured skips. The repair changed no browser bounds or retries. Final gate and hosted CI passed, but the final full-suite rerun still fails the iPhone portrait vacuum-width check. The three-attempt contract stopped the phase; Steve has now approved exactly one further attempt, now in progress.
- Left: merge `--no-ff` to `main` from the main checkout, push, confirm the Pages deploy and the smoke tier against the live URL, tick the roadmap's Phase 6 line with the merge commit, then start 6b.

## Phase 6 progress (2026-10-01)

- Tasks 1–4 on `claude/ship-realism`, each pushed with its Linux-regenerated goldens and an audit row (P6.1–P6.5): felt g, the 1976 thermosphere, the starting Mach, the emptying-step thrust; Earth's GM and radius; the measured landing reserve; six Raptors; the start transient.
- **Independent review of Tasks 1–3** (a fresh subagent; Codex cannot run here): no correctness bugs in the physics. It found one real edge (an ignition finishing on the emptying step thrust for free, fixed in `cff0046`), stale docs and four tests my planet rewrite had made tautological (re-anchored to fixed figures). Both fixed.
- Task 8 (the heat shield) done: Sutton-Graves in W/m², skin temperature in K, the 1,533 K limit; the deorbit peaks at 1,459 K. Task 5 parked (see Parked), and 6, 7, 11 with it.
- Task 10 done (`172fcb1`): a scenario's wind is the surface wind, carried up NASA's power-law profile, with MIL-F-8785C Dryden turbulence from its own seeded stream. Calm air is untouched: seven goldens kept their rows bit for bit; the headwind fixture moved and still lands.
- Task 9a done (`3facf39`), and the rest of the rotation plumbing (`8515c18`): Coriolis and centrifugal terms, the ground-relative deorbit conic, the converted orbital presets, the weight the burn predictor uses, every inertial truth test transformed and proved with Earth's rate on.
- **Earth's rate is NOT switched on — decided on your behalf.** With it on, the circularize-then-deorbit flight missed by 11.1 km against its 10 km acceptance; the broadside descent has no range control, and the turning ground widens the heavy/light spread from 5 to 14 km. No constant holds both that bound and the 1 km health test. Range control is what Phase 6b's entry on lift builds, so the switch is 6b Task 1b, with the measured numbers in the plan.
- The close: independent physics review by ChatGPT Pro in three rounds (Codex still cannot run). It found the RVacs steering with the gimbal (in the integrator, the torque, and the throttle law), a turbulence sweep-speed floor, and two latent rotating-frame edges; all fixed with tests. The full e2e run found the tile reading 0 K on the pad (equilibrium against absolute zero, and the debrief e2e bound still in the old units); fixed with a radiative sink, the air below 86 km.

## Roadmap update (2026-10-01, Steve)

- **Phase 6b, Entry on lift**, approved: the autopilot gets an entry angle-of-attack schedule, and the parked aero tasks land on it, with a stop rule if no angle keeps the tile under 1,533 K.
- **Phase 8, Visuals**, added before UX (now Phase 9): engines and plumes, re-entry and heat, the environment, the vehicle and camera. It publishes its visual direction and proceeds without waiting.
- The finished Phase 1–5 plans are closed out; the roadmap's Status names each merge commit.


Phase 6 checkpoint: attempt 4 corrects screenshot DPR; all five focused vacuum-width checks passed. A separate iPhone portrait low-altitude length failure (0.735 against >1) remains. Its first diagnosis identified white-core exclusion and fixed-region hull contamination; no classifier repair has been made. Final full-suite verification remains required; the no-fifth-attempt vacuum stop rule still applies. See the plume investigation for exact evidence.
