# Modernization audit — 2026-09-30

Seven independent read-only audits plus a synthesis and a completeness critic, run before the modernization roadmap was written. Subjects: the rebuild branch (`claude/first-project-rebuild-bjniik` at `d2839b9`) — core, presentation, process; the 2021 tree on `main` and the two other side branches; and `flight_sim` as the bar — its UI system, its simulation and verification standard, and its repo layout. Everything below was measured on that date. It is a snapshot, not current status.

## Verdict

The rebuild is the base. Its pure, deterministic core, its tested lint walls and its framework-free HUD, view and audio layers are the most valuable code in any of the trees. It was not shippable: the gate was red everywhere except the container that built it, half the physics was still the 2021 hand-tuned model, the UX was mid-tier, and it had never been merged because the build agent's token could only push to its own branch.

## The rebuild, measured

**Size.** About 24.8k lines of source (TypeScript and Svelte) and 29.6k lines of tests under `v2/`; 141 commits, M0 to M12.7, in about 11 days.

**Gate on Steve's Mac (arm64, Node 25.8.1).** Lint passed (8 s). Build passed (5.5 s; first-load JS 221.7 kB of the 250 kB budget). Unit tests failed: 48 of 1,585, all in `tests/golden/replay.test.ts` — all 8 goldens × 6 replay variants, off by about 1 ULP in fields computed with `**`, `exp` or `sqrt`. Under Node 22.23.3 on the same machine, 30 of 57 golden tests still failed. So the goldens reproduce only on the x86-64 Linux / Node 22 platform that recorded them, and pinning Node does not fix them. Coverage, re-run with reporting on failure, cleared every floor (99.58% statements, 99.22% branches, 98.79% functions, 99.64% lines; every physics file at 100%). `tests/view/perf.test.ts:309` is a wall-clock ratio and failed under coverage load (62× measured against a 32× cap).

**Hosted CI.** 132 runs: 2 green, both before the first real test existed. The last 10 were cancelled at the 45-minute timeout or failed in the browser stage (`broadcast.spec.ts:96`, `plume.spec.ts:273/299` @mobile, `sound.spec.ts:216`). The M12.x log entries claimed a green full gate that no external check ever reproduced. CI runs one of the five Playwright projects, on SwiftShader, with one worker.

**Why it never merged.** The build agent's token was scoped to its branch: an HTTP 403 even on the v1.0 tag push. GitHub Pages builds `main:/` in legacy mode, so merging (which deletes the root `index.html`) would take the live 2021 game down until Pages is switched to the Actions source that `deploy.yml` needs. Returning visitors also carry the 2021 network-first service worker at scope `/StarShipSimulator/`.

**Docs.** 572 KB of markdown, 363 KB of it `docs/ROADMAP-TASKS.md` (about 3,050 lines of narrative log). Test counts, wall counts and the claim "there is no CI" contradicted each other across files.

## Physics: what is real and what is not

Real: inverse-square gravity with polar correction terms; US Standard Atmosphere 1976 to 86 km plus an exponential thermosphere to 1,000 km; Raptor thrust that falls linearly with ambient pressure (Isp 327 s sea level, 350 s vacuum); a centre of mass and moment of inertia that move as the LOX/CH4 columns drain; velocity Verlet (energy error 7e-13 on a Kepler orbit); a counter-based seeded RNG; wind through the relative airflow.

Still the 2021 feel model, or missing:

- **Aero.** Cd = 0.1347·Mach + 1.153 capped at 2.5 — no transonic peak, no supersonic fall-off. A hand-tuned lift curve with a spike at 0.47–0.52 rad. An unexplained `/ 2.1` in the cross-section. Fins as signed drag forces. No centre of pressure, no normal-force model, so stability and belly-flop trim come from tuning, not geometry.
- **Heating.** Sutton-Graves 1.83e-7·v³·√(ρ/Rn) on a unit nobody could resolve (possibly a 10× slip); `heatLimit = 389` calibrated to keep the 2021 margin; breakup is an instant threshold, with no heat load, no TPS temperature.
- **Guidance.** The autopilot and the free-fall predictor use a flat g = 9.807 and a fudge constant `airResistance_k = 250`. They land only because the goldens lock tuned behaviour, so any aero or thermal fidelity change will break landings unless guidance is rebuilt first.
- **Vehicle.** No Super Heavy: booster-sep and RTLS fly the 50 m Ship with 3 Raptors. The Ship has 3 engines, not 3 sea-level plus 3 vacuum. RCS is 800 kN at a 20 m arm. Planet radius 6,400 km.
- **Environment.** No Earth rotation (`planetLinearVelocity` is defined and unused). Wind is one constant scalar; `world.gust` is hard-wired to 0; no turbulence stream.
- **Harness gaps.** No cited reference-data registry, no property-based tests, no mutation check, no determinism fingerprint; several replay variants and one scenario assertion are tautological.

## UX, measured in a browser

Strong: a real tokens file, measured scrim contrast, tabular digits tested in a browser, reduced motion handled, a framework-free HUD binder, a debrief that judges each figure against the limit that decided it, help text generated from code tables.

Defects confirmed live: Escape does not close the menu; no focus trap, no `aria-modal`; the sim does not pause under the menu and there is no pause key. The first-flight hint names "All Raptors" and "Thrust", which are not on screen. At 375 and 390 px the top bar wraps to two rows, and the engine sheet hides speed and altitude while throttling. The Black Box is stock uPlot with camelCase channel names, radians, and full-height ±π wrap spikes. Labels are developer shorthand (R1/R2/R3, TOGGLE-ALL, DUMPFUEL, FS 200 M/S). Everything is the same 11 px uppercase weight. `App.svelte` is 1,365 lines and owns view, loop, audio, recorder, input, preferences and modals. The keymap is 2021's: Control steps the throttle, Backspace triggers boost-back.

Svelte surface: 14 components, 5,464 lines, of which about 2,060 are scoped CSS and about 34% of all lines are comments. About 72 reactive sites, 21 in `App.svelte`. The HUD, view, audio, app and about 2,000 lines of plain-TS UI logic do not import Svelte, and `src/ui/testids.ts` centralises the e2e selectors.

## flight_sim as the bar

**UI.** React 19, Tailwind 4, Radix, Zustand, GSAP, lucide. Its portable kit in `web/src/ui/` (about 30 primitives plus `input/` for gamepad and input ownership and `motion/` for tokens and reduced motion) imports only react, clsx, tailwind-merge, lucide, three Radix packages and gsap — `check-frontend-boundaries` enforces that. It is not published: no steve-ui registry, no package. Its design language is strict monochrome (black fields, white structure, 0 px radii, Inter / Inter Tight / JetBrains Mono, one dashed focus owner, motion tiers), written down in `docs/design/design-system.md` and enforced by self-testing scanners in `npm run build` (`check:design-contract`, `check:ui-contract`, `check:entry-graph`). It has no toast, no onboarding and no exported tooltip. Its HUD instruments are aviation-specific and coupled to its WASM sim, so only their patterns carry over.

**Simulation standard.** A three-tier truth hierarchy: closed-form truth that is never re-blessed; published reference bands (±25–30%, typed, sourced, tier A/B) with an IN-BAND / OUT ×N report; regression baselines that may be re-blessed only while the first two tiers hold. One rule ties it together: never move a tuning knob to pass a truth test. Determinism is gated by cheap state fingerprints. Visual claims go through browser witnesses that each carry a positive control, plus a small mutation matrix that proves the detectors fire. The merge gate is diff-routed with a ≤5-minute budget; the owner ruled on 2026-09-28 that iteration speed beats strictness. Not worth copying at 2D-TypeScript scale: 109 known-red entries, 15 MB baselines, a 36–43-minute full audit, 44 KB of gate process.

## The other branches

- `origin/exp` (2025-07): a class-based restructure of the 2021 code with swapped drag axes (a vehicle falling straight down gets horizontal drag and no vertical drag) and a cruder autopilot. Nothing to salvage.
- `origin/feat/modernize-app` (2025-08, an automated bot): a React scaffold that does not compile against `@pixi/react` 8 and is mostly TODO stubs. Nothing to salvage.
- `main`: frame-coupled explicit Euler, constant speed of sound, dead upper-atmosphere code, 236 globals. Useful only as a capability checklist (presets, keybinds, the nine Black Box channels, effects, art) — which the rebuild already covers. The live site's PWA manifest already 404s under the Pages subpath, and the About page shows a personal email and an old GitHub handle.

## Things nobody had checked

No LICENSE in a public repo that is about to vendor code from a private one and ships possibly SpaceX-derived imagery. No localStorage schema versioning across the stack change. No frame-time measurement on a real phone. No playability model for realistic physics (assists or difficulty).
