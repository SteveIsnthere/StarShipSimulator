# Phase 8 Task 2 glare integration

Startup-owned per-engine sprites reuse the particle atlas. Actual healthy firing and positive thrust drive nozzle light; physical nozzle height and hull orientation drive ground wash. Each mission body owns independent light, reset and visibility. Light stays behind the hull/HUD and uses the existing additive pipeline with no additional filter or clock.

Missing-module unit/build RED observed before implementation. Focused 18 tests pass; complete view suite 350 tests in 26 files passes. Build and lint exit zero: first-load JS 296.6 kB; existing BlackBox dependency warning retained. Full original plume/emissive/compositing campaign plus glare: 57 passes, zero failures/retries. Real staging/selection/pause/restart plus bell/glare: 15 passes, zero retries. Strengthened detector uses an independently hidden source baseline, separates engine and ground bands: all five projects pass with engine energy12608, ground17740; off/failure/shutdown/far-ground/pause differences0, bloom loss0. Captures retained. Full view check briefly overlapped the browser regression; no timing budget is claimed from these checks. Phase 8 Task 6 still owes isolated full-frame timing.

No core, preset, golden, legacy, simulation RNG, tolerance or retry change. Task 2 is complete; Phase 8 remains open for Tasks 3–6 and whole-phase verification/review/merge/live deployment.
