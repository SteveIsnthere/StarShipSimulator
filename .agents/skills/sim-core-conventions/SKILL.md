---
name: sim-core-conventions
description: Use when writing or reviewing any code under src — deciding which layer a piece of code belongs in, adding an import between layers, touching core/ (physics, control, autopilot, rng, units, state), adding randomness or time to the simulation, or anything on the per-frame path. Owns the layer map, the seven lint-enforced walls, the determinism rules, units, and the per-frame performance rules. Changing what the physics computes is `physics-change-policy`; running the gate is `verification-and-gates`.
---

# Sim core conventions

The simulation is pure TypeScript that runs in Node with no browser. Everything that makes this project testable depends on keeping it that way. How the layers work is explained in [docs/reference/architecture.md](../../../docs/reference/architecture.md); this file is the rules.

## Layer map — dependencies point down, only down

```
src/ui/     UI shell — menus, editor, black box. Renders on interaction only.
src/audio/  Web Audio graph and the SimState -> sound bindings.
src/hud/    HUD binder — ONE rAF subscriber, diffs sim state, writes text nodes.
src/view/   PixiJS — sprites, pooled particles, camera, sky. No game logic.
src/app/    The loop (fixed dt + accumulator + interpolation), input, wiring.
src/core/   Pure simulation. The protected zone.
```

A value the UI, HUD or audio needs that is not in `SimState` is derived in that layer. It is never added to `core/` for their benefit — that moves the goldens for a presentation reason.

## The seven walls

ESLint errors, configured in `eslint.config.js` (`CORE_WALL_RULES`). `tests/lint-walls/` feeds one violating fixture per wall and asserts it fails, so the walls themselves are tested. A new wall gets a fixture in the same commit.

1. `core/` imports nothing from `view/`, `ui/`, `hud/`, `app/`, PixiJS or the UI framework.
2. `core/` never references `document`, `window` or PIXI.
3. `core/` never calls `Math.random` — use `core/rng.ts`.
4. `core/` never calls `Date.now` or `performance.now` — time enters only as `dt`.
5. `core/` never calls `setTimeout` or `setInterval` — timed behaviour is a dt-ticked field in `SimState`.
6. Nothing in the repo root assigns to `globalThis`.
7. `core/` imports nothing from `audio/` — sound is an output of the simulation, never an input.

`src/app/debug.ts` is the one file that attaches a global (`window.__simDebug`, defined rather than assigned, and only in a dev build or with `?debug=1`). No other file may.

Never disable a wall with an inline `eslint-disable`. If a wall is in the way, the code is in the wrong layer.

## Determinism

- `step(state, dt, input)` is pure: same state, dt and input give the identical output, always.
- Randomness only through `core/rng.ts`: counter-based, seed + named stream + counter, with counters stored in `SimState`. Simulation streams and render-effect randomness never mix — a particle effect never draws from a sim stream.
- Time warp runs the step loop N times per frame. **Never scale dt.**
- The loop in `app/` uses a fixed dt with an accumulator and interpolates the render pose by the remainder.

## Units

- SI everywhere inside `core/`. Every `SimState` field documents its unit in JSDoc.
- Angles use the branded types in `core/units.ts` (`Rad`, `Deg`). Passing degrees where radians are expected must not compile.
- Convert for display only at the HUD/UI boundary.

## Per-frame performance

- No framework code inside a frame. The UI renders on interaction; the HUD binder and Pixi own the per-frame path.
- Zero allocation on the per-frame path. Particles are pooled.
- DOM references are resolved once at startup, never per frame.
- `npm run build` enforces the bundle budgets (`scripts/check-budget.mjs`): first-load JS ≤ 300 kB gzip, plus fonts and audio; charting is lazy-loaded and never in the first load. Vitest enforces the step and HUD budgets (`tests/view/perf.test.ts`, `tests/hud/binder.test.ts`): a sim step < 1 ms, so 240 steps per second of wall clock fit easily (the fixed dt is 1/120 s, and time warp multiplies the steps), and a HUD update < 2 ms.
- Do not optimise physics maths for speed. An "optimisation" that changes results is a physics change (`physics-change-policy`).

## The archived 2021 tree

`tests/fixtures/legacy/` is the 2021 game, kept for humans only. Nothing imports, executes or consults it. Never modify it, and never treat a disagreement with it as a defect.
