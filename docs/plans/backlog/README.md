# Backlog

Deferred work with no phase yet. This repo has no Jira board, so this file is the record. When a modernization phase picks an item up, it moves into that phase's plan and is deleted here. Items that a phase already owns are listed with the phase, so nobody files them twice.

## Owned by a modernization phase

| item | phase |
|---|---|
| Cd shape: Mach-only and attitude-blind, no transonic peak (a cited model is built and parked on `claude/drag-parked`) | 6b |
| The unexplained `/ 2.1` in `getCrossSectionalArea` (`src/core/physics/aero.ts`) | 6b |
| Break-up and crash checks read the previous step's forces | 6b |
| `controlEnginebyTWR` divides the required thrust by the thrust at `throttleCurrent`, not at full throttle (`src/core/control/primitives.ts`), a 2021 quirk that makes its TWR wrong whenever the throttle is not at 100%. Phase 5's truth tests use the effective-vertical law instead | 6b |
| Earth rotation (`planetLinearVelocity` and `planetTimeToRotate` unused); pitch integrated against local vertical with no frame-rotation term | 6 |
| Gust is never written; no turbulence stream (`src/core/scenarios.ts` comment) | 6 |
| Stale comments outside the view: `record.ts` sampling rate (says 24 steps; it is 60), `eslint.config.js` and the workflows say "six walls" (there are seven) | 6 |
| Render interpolation: `advance()` returns `alpha` but nothing reads it; the view draws the latest step | 8 |
| Per-frame allocations: `engines.running.filter(Boolean)` in `src/view/effects.ts`; `worldToScreen` returns a new object (`src/view/camera.ts`) | 8 |
| Stale view comments: `camera.ts` header (claims interpolated state and real dt), `CameraTarget.dynamicPressure` says Pa (it is kPa), `effects.ts` `previous` | 8 |
| `post.ts` sets `uTexelSize` once and never on resize | 8 |
| Reversible visual defaults awaiting a playtest: no accent colour, cinematic mode off by default, the light daytime sky | 8 |
| 60 fps on a mid-range phone is a stated goal that nothing measures | 8 |
| `plume.spec.ts` "blooms wider than the ship in vacuum" is flaky on `main` too (2 of 3 runs failed on desktop, 2026-10-01; the vacuum/sea-level width ratio ranges about 1.0–2.0 against a 1.2 bound). The measurement, not the plume, needs fixing before the bound means anything | 8 |
| The RVacs have no plume of their own: the view draws plumes from the running count, not per engine and nozzle | 8 |
| Camera `SHAKE_FRACTION = 0.006` set by eye | 8 |
| Telemetry-loss states (values freeze and dim) and entry flap pictograms from the broadcast reference were never built | 9 |
| iOS tilt control needs a permission button; not ported | 9 |
| RCS sound (high-passed noise from `forces.rcsThrust`) was planned and never built | 9 |
| The throttle and yoke sliders follow the simulation on keys, store changes and touch, not while the autopilot moves them | 9 |
| The debrief has no grade and no comparison with the previous flight (ia.md asks for both) | 9 |
| During the intro's demonstration landing the status bar reads "Autopilot · Land" while the Flight panel lights Manual: the panel lights only the real autopilot flags, not `demoAutoLandOn`. Lighting Land needs a decision on what Land and Manual do mid-demo; the intro is protected | 9 |
| Audio tuned "by ear" and never tuned: `ENGINE_VACUUM_FLOOR = 0.22`, `BUS_GAIN` in `src/audio/graph.ts` | 9 |
| The six-engine controls and HUD strip are minimal (two labelled sets of marks); their designed look | 9 |

## Not in any phase

- **Shareable flights.** Seed + scenario + input log, encoded in a URL and replayed deterministically. The determinism model already supports it.
- **Licensed audio recordings** in place of the synthesised transients. Only `src/audio/transients.ts` would change; needs a licence trail Steve accepts.
- **A sixth preset.** The 2021 About text says six presets; `index.html` shipped five. Ask Steve whether one was cut.
- **Max-Q shake test cost** is structural (two flights per test); the only lever left is the worker count.
