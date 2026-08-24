# Starship Rebuild Plan

Status: **proposal, awaiting approval.** No application code has been written and
nothing in the existing tree has been modified.

Branch: `claude/first-project-rebuild-bjniik`
Baseline: 52 commits, 4,663 lines of JavaScript, summer 2021.

---

## The read

The simulator works. Served locally with the dead CDN links patched, it boots, the
intro autopilot lands the vehicle, the panels slide in, and manual control behaves.

What is good is the physics and the guidance logic. What holds it back is everything
around them: no build step, no modules, no types, no tests, 355 globals, and a
simulation loop welded to the renderer's frame rate.

This is not a rewrite. It is an extraction.

---

## Keep — the soul

Ported to TypeScript modules with the same equations, constants, tuning and behaviour.

- **The flight model.** Layered ISA atmosphere, Mach-dependent body drag, the piecewise
  lift-coefficient curve keyed to angle-into-the-wind, dynamic pressure, reentry heating,
  angular drag through the `∫r³dx` term, moment of inertia recomputed as propellant
  drains, per-engine off-axis thrust torque.
- **The autopilot library.** `presisionAlignment`, `controlEnginebyTWR`,
  `verticalSpeedAdjustment`, `horizontalSteering`,
  `controlHorizontalAccelerationByAeroBreaking`, `raptorAutoShutDown_KeepMinTWRBelow1`.
- **The staged landing program.** Aero descent → belly-flop trigger altitude computed
  from pessimistic available thrust → flip → horizontal adjustment → final descent, with
  distinct branches for one-, two- and three-engine landings. Boost-back attempts
  aerodynamic deceleration, gives it five seconds, falls back to propulsive.
- **The intro.** The ship falls into frame already belly-flopping, the autopilot lands it,
  and the instant the legs touch the panels slide in and the tanks refill. Non-negotiable.
- **Scenarios, black box, keybinds, tilt control, the starhopper, and the pig at x = 0.**

---

## Fix — what is actually wrong

### The simulation is tied to the frame rate

`updateBackEnd()` runs inside PixiJS's ticker and takes its timestep from measured frame
time, clamped to a 30 ms ceiling. Any frame slower than 33 fps under-integrates.

Measured in a throttled browser: **8.01 s wall clock produced 6.47 s of simulated time —
19% slow**, and it degrades further as the browser stutters. A landing burn that works on
a laptop does not work on a phone, and no two runs of a scenario are the same run.

### Confirmed bugs

| Bug | Effect |
|---|---|
| `upperStrato()` is never called — `updateAtmosphere()` only branches between `tropo()` and `lowerStrato()` | Above 11 km the atmosphere model is wrong for the entire reentry regime |
| `getReentryHeatPower(vehicleNoseRadius)` is called with `crossSectionalArea` | Heating scales by `√(ρ/area)` instead of `√(ρ/noseRadius)`; heat limit triggers at the wrong speeds |
| `frontFinEffectiveAreaFraction` initialised as an area, updated as a fraction | ~24× discrepancy on frame one |
| Every engine cutoff allocates a new `PIXI.Container` + emitter into `starShipAndEffects`, never removed | Unbounded growth across a long flight |

### Structure

- 355 globals on `globalThis`; the `<script>` order in `index.html` *is* the dependency graph.
- The physics loop reads the DOM (`getElementById("throttleControl").value`) every frame,
  so simulation and interface cannot be separated, tested, or run headless.
- Three CDN dependencies with no local fallback — blocked the network and the app is a
  white screen, despite a manifest advertising offline play. PixiJS is pinned to 5.1.3
  because the code uses `PIXI.loader`, removed in v6.
- No tests, no types, a two-line README, 13 committed `.DS_Store` files.

---

## Measured: the stack question

Same HUD built five times, production builds, real compression.

| Runtime | Minified | Gzip | Brotli |
|---|---|---|---|
| Vanilla TS | 1.4 kB | 0.7 kB | 0.6 kB |
| Preact + hooks | 14 kB | 5.8 kB | 5.3 kB |
| Solid | 17 kB | 6.3 kB | 5.7 kB |
| **Svelte 5** | 42 kB | **15.9 kB** | 14.5 kB |
| React 19 + react-dom | 192 kB | 58.7 kB | 50.8 kB |
| *PixiJS v8 (tree-shaken)* | *563 kB* | *161 kB* | *133 kB* |

16 numeric HUD fields, 2,000 updates, forced synchronous layout flush each time:

| Runtime | Per update | Share of a 60 fps frame |
|---|---|---|
| Direct DOM writes | 0.184 ms | 1.10% |
| **Svelte 5** | 0.198 ms | 1.19% |
| Preact | 0.218 ms | 1.31% |
| Solid | 0.232 ms | 1.39% |
| React 19 | 0.245 ms | 1.47% |

Fastest to slowest is 0.06 ms — about a third of one percent of a frame. Framework
reactivity cannot be the bottleneck; the cost is dominated by the browser's layout flush,
which every option pays equally.

**The bundle problem that already exists:** every visit downloads Plotly at **1,008 kB
gzipped** for nine charts hidden behind a button — six times the entire modern Pixi
renderer, thirty-five times the project's own code. Lazy-loading it, or swapping it for
uPlot (~40 kB), is worth more than every framework decision combined.

### Recommendation

**Svelte 5 + TypeScript + Vite.** Compiles to near-direct DOM updates; 16 kB against a
renderer already costing 161 kB; single-file components suit a control panel; TypeScript
would have caught the fin-area unit bug at compile time. Solid or Preact are equally
defensible if the last 10 kB matters. React costs four times the bytes for measurably
identical performance.

Renderer: **PixiJS v8**, 2D, WebGPU where available. Existing sprites reused.

---

## Target architecture

One rule drives the design: **the framework never runs inside a frame.**

```
Layer 4  Shell        Svelte components — menus, scenario editor, black box.
                      Renders on interaction only.
              ↑ state read · commands ↓
Layer 3  Instruments  HUD binder. One rAF subscriber, diffs sim state against
                      last frame, writes changed values to text nodes.
              ↑ reads state
Layer 2  View         Pixi renderer. Sprites, particles, camera, sky.
                      Owns no game logic and mutates nothing.
              ↑ reads state · inputs ↓
Layer 1  Core         Simulation — pure TypeScript. Physics, flight control,
                      autopilot, failure detection. Pure functions over a typed
                      state object. Zero DOM, zero Pixi, zero globals.
```

Dependencies point one way only: down. The core does not know a renderer exists.

### Fixed timestep, interpolated rendering

```ts
const DT = 1 / 120;              // seconds, fixed
let accumulator = 0;

function frame(now: number) {
  accumulator += Math.min((now - last) / 1000, 0.25);   // cap the spiral of death
  last = now;

  while (accumulator >= DT) {
    previous = current;
    current  = step(current, DT, input);   // pure: state → state
    accumulator -= DT;
  }

  render(previous, current, accumulator / DT);   // interpolate the remainder
  requestAnimationFrame(frame);
}
```

Time warp becomes running the `while` loop N times per frame rather than scaling `dt`, so
warped flight obeys exactly the same physics as unwarped flight. The current
implementation scales the timestep, which changes the results.

---

## Migration, in order

Each phase leaves the project in a working state. Nothing is deleted until its
replacement flies.

1. **Scaffold** — Vite, TypeScript, Svelte, ESLint, Vitest, Playwright, a `.gitignore`
   that excludes `.DS_Store`. The 2021 code stays untouched and still runs.
   *Done when: `npm run dev` serves a blank typed app.*
2. **Extract the core** — physics, flight control and autopilot into pure TypeScript over
   a typed `SimState`. Equations and constants copied verbatim; the four confirmed bugs
   fixed behind flags so the change can be measured.
   *Done when: the sim runs headless in Node.*
3. **Lock the behaviour** — golden-trajectory tests. Run each of the six scenarios
   headless, record the full state history, commit it. Every later refactor asserts
   against these.
   *Done when: all six scenarios land, reproducibly.*
4. **Fixed-timestep loop** — accumulator, interpolation, honest time warp.
   *Done when: identical results at 30, 60 and 144 fps.*
5. **Renderer on Pixi v8** — port the sprite scene, camera and particles, then bloom on
   the plumes, heat shimmer and shock on reentry, parallax StarBase, altitude-graded sky.
   Effects pooled, not reallocated.
   *Done when: the intro landing plays, and looks better.*
6. **HUD and controls** — Svelte panels, per-frame binder for readouts, keybinds, tilt and
   touch restored. The 40 inline `onclick` attributes become typed component events.
   *Done when: the game is fully playable.*
7. **Black box and shell** — telemetry plots on a lazy-loaded charting library, scenario
   editor, guide, about. Plotly leaves the critical path.
   *Done when: first-load JS is under 250 kB gzip.*
8. **Ship it** — service worker that genuinely caches everything, no CDNs. Real README,
   real deploy. Old tree removed once the new one has flown every scenario.
   *Done when: it works with the network off.*

---

## How we will know nothing broke

- **Golden trajectories.** Each scenario run headless, full state history committed. A
  refactor that changes the flight beyond tolerance fails the build. Only possible because
  the core has no DOM in it.
- **Autopilot outcome tests.** Auto-land, boost-back and auto-liftoff must succeed from
  every preset. Assert results, not intermediate numbers, so genuine improvements pass.
- **Determinism test.** Same seed and inputs produce identical output at 30, 60 and
  144 fps. Impossible today; guaranteed after phase 4.
- **Bundle budget in CI.** First-load JS capped so Plotly cannot quietly return.

---

## Open questions

1. **Fix the physics bugs, or preserve them?** Correcting the atmosphere and heat models
   will change how reentry feels, quite possibly making it harder. Proposal: fix behind
   flags, compare, fly both. Some hand-tuning may have been compensating for them.
2. **Rename as we port, or stay verbatim?** `presisionAlignment`, `gimbolPosition`,
   `throttleLowwerLimmit`, `lunchpad`. Leaning toward porting verbatim first and renaming
   in a separate pass, so every port stays a line-by-line comparison.
3. **Sound?** None today, and the largest available upgrade to "feel" per unit of effort.
   Not in this plan; say the word and it becomes a phase.
4. **Does the pig stay?** The pig stays.
