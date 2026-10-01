# Backlog

Deferred work with no phase yet. This repo has no Jira board, so this file is the record. When a modernization phase picks an item up, it moves into that phase's plan and is deleted here. Items that a phase already owns are listed with the phase, so nobody files them twice.

## Owned by a modernization phase

| item | phase |
|---|---|
| Cd shape: Mach-only and attitude-blind, no transonic peak | 6 |
| The unexplained `/ 2.1` in `getCrossSectionalArea` (`src/core/physics/aero.ts`) | 6 |
| Re-entry heating coefficient 1.83e-7 vs the published Sutton-Graves 1.83e-8, and `heatLimit = 389` calibrated around it | 6 |
| Earth rotation (`planetLinearVelocity` and `planetTimeToRotate` unused); pitch integrated against local vertical with no frame-rotation term | 6 |
| Gust is never written; no turbulence stream (`src/core/scenarios.ts` comment) | 6 |
| Thermosphere temperature is 293 K at 100 km against the standard's 195 K (only Mach reads it) | 6 |
| The g-limit reads net acceleration including gravity, not felt g | 6 |
| Break-up and crash checks read the previous step's forces; a scenario's first step uses Mach against a constant 343 m/s (`src/core/scenarios.ts`) | 6 |
| With the moving centre of mass, RTLS reaches apogee before MECO and the high-altitude impact prediction is less accurate | 5 |
| `airResistance_k = 250` now feeds only the HUD impact predictor, and `src/hud/prediction.ts` claims the simulation integrates it | 5 |
| Legacy exports still shipped in `core/`: `legacyEffectiveVerticalMaxThrust` (`src/core/control/primitives.ts`) and six `legacy*Coefficient` exports (`src/core/physics/components.ts`) | 5 |
| `horizontalSteering` calls `precisionAlignment` twice (kept on purpose: the first call has side effects) — resolve when guidance is rebuilt | 5 |
| Render interpolation: `advance()` returns `alpha` but nothing reads it; the view draws the latest step | 4 |
| `src/app/input.ts` imports `ControlEvent` from `$ui/controls` — an upward import no wall catches | 4 |
| Per-frame allocations: `s.engines.running.filter(Boolean)` in `App.svelte`; `worldToScreen` returns a new object (`src/view/camera.ts`) | 4 |
| Stale comments: `camera.ts` header (claims interpolated state and real dt), `CameraTarget.dynamicPressure` says Pa (it is kPa), `effects.ts` `previous`, `record.ts` sampling rate (says 24 steps; it is 60), `eslint.config.js` and the workflows say "six walls" (there are seven) | 1 (workflows), 4 (view), 2 (golden) |
| `post.ts` sets `uTexelSize` once and never on resize | 4 |
| Telemetry-loss states (values freeze and dim) and entry flap pictograms from the broadcast reference were never built | 8 |
| Reversible defaults awaiting a playtest: no accent colour, cinematic mode off by default, the light daytime sky | 3 |
| iOS tilt control needs a permission button; not ported | 8 |
| 60 fps on a mid-range phone is a stated goal that nothing measures | 8 |
| RCS sound (high-passed noise from `forces.rcsThrust`) was planned and never built | 8 |
| Audio tuned "by ear" and never tuned: `ENGINE_VACUUM_FLOOR = 0.22`, `BUS_GAIN` in `src/audio/graph.ts`; camera `SHAKE_FRACTION = 0.006` | 8 |

## Not in any phase

- **Shareable flights.** Seed + scenario + input log, encoded in a URL and replayed deterministically. The determinism model already supports it.
- **Licensed audio recordings** in place of the synthesised transients. Only `src/audio/transients.ts` would change; needs a licence trail Steve accepts.
- **A sixth preset.** The 2021 About text says six presets; `index.html` shipped five. Ask Steve whether one was cut.
- **Max-Q shake test cost** is structural (two flights per test); the only lever left is the worker count.
