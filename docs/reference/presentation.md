# Presentation layers

Everything above `src/core` turns `SimState` into frames, numbers, sound and controls. The
invariant: **presentation reads `SimState` and never writes it.** Commands reach the sim only
as `ControlEvent`s; nothing in `view/`, `hud/` or `audio/` can move a golden digest.

| Layer | Directory | Cadence | Owns |
|---|---|---|---|
| Loop | `src/app` | per frame and per step | fixed-dt loop, input, recorder, SW registration |
| Instruments | `src/hud` | per frame, one subscriber | readouts, gauges, timeline, trajectory map |
| View | `src/view` | per frame | PixiJS 8 scene, camera, sky, depth, particles, post |
| Sound | `src/audio` | per frame, after first gesture | Web Audio graph, mixer, bindings |
| Shell | `src/ui` | interaction only | the session controller, React surfaces, the vendored kit, menus, black box |

`core/` may not import any of these (lint walls 1 and 7). `audio/` does not import `view/`; it
re-derives the engine edges it needs (`audio/events.ts`).

## The frame

### Fixed step — `app/loop.ts`

The sim advances only in `DT = 1/120` s steps. `advance(loop, frameTime, options)` feeds real
time into an accumulator and drains whole steps:

- frame time above `MAX_FRAME_TIME = 0.25` s is clamped (`clamped: true`) — a stall drops
  simulated time rather than spiralling;
- **warp** runs the step loop N times per drained DT; **slow motion** divides the real time
  entering the accumulator. `dt` is never scaled;
- `MAX_STEPS_PER_FRAME = 2000` zeroes the accumulator and bails out;
- `onStep` fires after every step, for anything that depends on the *path* the vehicle took;
- the result is `{ steps, alpha, clamped, simulatedDt }`.

`simulatedDt = steps × DT` is how much world actually went past, and **every view consumer is
driven by it, never by wall frame time** — the two differ one-directionally and cumulatively,
and a camera fed wall time drifts kilometres off a re-entering vehicle.

`loop.previous` / `loop.state` are kept for edge detection and interpolation. `alpha` and
`interpolate()` exist, but the view currently draws `loop.state` directly — nothing consumes
`alpha`.

### One tick — `ui/session/session.ts`

One `requestAnimationFrame` callback, in the framework-free session, drives everything in order
(`scene.draw` in `ui/session/scene.ts` is step 2):

1. `advance()` → `worldDt`. Per step inside it: `recorder.sample`, `watch.observe` (debrief),
   `view.followAltitude`, `updateCamera(…, DT)`.
2. `writeSun`; `sky`, `distantEarth`, `clouds`, `world`, `vehicle`; `effects.update(…, worldDt)`;
   sheath and inset; flight-path marker; post.
3. `timeline.observe`, one haptic per new event; `audio.update`; the HUD binders; the map
   (throttled).
4. End-of-flight flags, assigned only on change; the debrief card built once on the transition.

### Input — `app/input.ts`

Keys, tilt and buttons emit the same `ControlEvent`s (`ui/controls.ts`); there is no second
path into the sim. `resolveKeyDown` is pure and holds the keymap; `KEY_BINDINGS` is the table
the guide renders. Throttle keys send values core clamps. Tilt (`bindTilt`) yields to a hand on
the yoke. Input is suppressed while a full-screen panel is open.

### Recorder — `app/recorder.ts`

History lives outside `SimState` so steps stay O(1) and goldens stay small. It samples per
step on `updatedFrameCount`, so samples are frame-rate independent. `clear()` truncates in place
because the trajectory map holds the arrays; `copyFrom()` fills the previous-flight ghost.

### Offline — `app/offline.ts`, `scripts/build-sw.mjs`

`main.ts` registers `./sw.js` in production, silent on failure. The worker is generated from
`dist/`: every asset precached (lazy chunks included), scope-relative paths, a content-hashed
cache name. Cache-first with `ignoreVary`; any navigation gets the cached `index.html`.

## Instruments — `src/hud`

### The binder law — `hud/binder.ts`

One per-frame subscriber outside the renderer: **resolve elements once, diff before writing,
never write the unchanged.** Targets are narrow injected interfaces (`TextTarget`,
`ClassTarget`, `AttributeTarget`), so every binder runs in Node against stubs that count writes.

| Binder | Source | Diffed on | Write |
|---|---|---|---|
| `createHudBinder` | `readouts.ts` | formatted string | `textContent` |
| `createIndicatorBinder` | `indicators.ts` | boolean | `classList.toggle('is-on')` |
| `createMetricBinder` | `metrics.ts` | integer quantum | `setAttribute` (dashoffset, transform, `data-state`) |
| `createTimelineBinder` | `Timeline` tracker | integer state | attributes + narration |

Metrics diff integers because a gauge fraction moves every frame and formatting it to discover
no change would allocate. Only the timeline binder rebinds, at configure time, because its dots
depend on the scenario.

### Sources and trackers

- `readouts.ts`, `metrics.ts`, `indicators.ts` — pure over `SimState`. Gauges auto-range over
  `SPEED_SCALES`/`ALTITUDE_SCALES`; `limitState` (caution at 0.8) is shared with the audio
  warning tone so ear and eye agree.
- `timeline.ts` — events **observed, never scripted**: predicates over state, with only the
  memory a peak, sign flip or threshold crossing needs (MAX-Q confirms after 2 s of decline).
  Scenarios declare expected tracks; an event that never happens never lights.
- `debrief.ts` — `createFlightWatch()` witnesses every step, because `checkIfCrash` zeroes the
  speeds and pitch it judged in the same step. `debrief()` is pure over witness, timeline and
  state.
- `haptics.ts` — a tick per event, after a gesture, behind `prefers-reduced-motion`.

### Trajectory map

`trajectory.ts`: projection, auto-range and trail decimation into caller-owned objects. `prediction.ts`: the unpowered continuation — conic to
the 80 km interface above it, drag-limited fall below — returning `none` with a reason
(`orbit`, `out-of-domain`, `on-ground`) rather than a wrong number. `trajectory-draw.ts` draws
through a minimal `MapContext`, so every golden replays through a recording stub; it redraws at
`MAP_REDRAW_HZ = 10` and costs one read when collapsed.

**The honesty rule.** Compression is allowed in the depiction of the world, never in the
numbers. The map is an instrument: axes stretched and labelled, every value from `SimState` or
`core/` at true scale. The flight-path marker's angle is exactly `angleOfMotion`. Any
compressing curve in `view/` is a named function whose comment says it is one.

## View — `src/view`

### Scene — `view/app.ts`

Pixi 8 (WebGPU, falling back to WebGL; tests force `webgl`), resolution capped at DPR 2. Draw
order is fixed here, back to front: `sky` (gradient, stars) → `far` (distant earth, then clouds)
→ `world` (ground, StarBase, shadow, pad glow, the pig) → `effectsBehind` (particle pool; bloom)
→ `vehicle` (hull, fins, sheath; heat filter) → `effectsFront` (flight-path marker, inset). The
viewport is one `MutableViewport` updated in place; manual zoom, mode zoom and altitude FOV
multiply rather than fight.

### Camera — `view/camera.ts`

- **Altitude FOV.** `altitudeFov` is exactly 1 below 500 m — every landing and the intro are
  untouched by construction — then smoothstep-over-log to 5× at 20 km, flat above.
- **Follow law.** Second-order semi-sticky follow: `centerizeAcceleration` +
  `matchSpeedAcceleration`, semi-implicit Euler. It **gives up only when `crashed`**; a flying
  vehicle past the give-up radius gets gain held at `MAX_RECOVERY_GAIN = 2` (damping ratio
  ~0.35), so the error always closes and never rings.
- **Sub-stepping.** `updateCamera` integrates in steps ≤ `CAMERA_MAX_DT = 1/120` (≤ 64). The app
  calls it per sim step with `DT`, so the camera sees every position the vehicle occupied and
  frame-rate independence is an identity, not a tolerance.
- **Framing and shake.** Lead `speed × 0.6 s`, capped at 18% of the half-span, added to the
  *target* so it inherits the law's damping. Shake from Q (`SHAKE_FULL_Q = 30` kPa) and thrust,
  ≤ `SHAKE_FRACTION = 0.006` of viewport height, two irrational-ratio sines (deterministic),
  zeroed under reduced motion, applied in `worldToScreen` so every layer shakes together.
- **Modes.** `follow`, `pad`, `chase`, `onboard` — one law, different targets.
- **Properties** (`tests/core/camera.test.ts`): framed on every golden, damped, frame-rate
  independent, deterministic, never below ground, recovers from any error.

### Sky, sun, stars, lighting

`sky.ts` builds its gradient once and tints it; blue drains between 20 and 80 km. `sun.ts`
places the sun from the scenario hour (`LAUNCH_HOURS`), sim clock and downrange longitude
(equinox assumed); one preallocated `SunLight` drives every colour in `view/`, and above 15°
elevation every factor is 1. `stars.ts` places the 320 brightest Bright Star Catalogue stars
(`stars-data.ts`) for StarBase, facing north. `lighting.ts` derives a normal map and delighting
gain from the hull sprite once, so either flank can be lit.

### Depth

Depth is the *difference* between layer rates; there are three:

- `distant-earth.ts` — exactly the true projection until the ground line passes
  `FOLLOW_RATIO`, compressed after; hidden behind the real ground until that leaves, so the
  handover never jumps. Scroll compressed through a soft knee (`compressedScrollSpeed`).
- `clouds.ts` — a deck at 2.5 km, 60 `wisp` puffs in two sub-decks, 2.5× the far earth's rate,
  seeded, faded out by 45 km.
- `world.ts` — true scale. `terrain.ts` generates mottle and ramps tinted through `groundTint`
  so the palette cannot drift from the atmosphere's; `horizon.ts` is the one curvature both
  ground layers draw; `atmosphere-look.ts` holds the pure look curves.

`motion-cues.ts` adds screen-space velocity streaks (zero below 150 m/s, saturated at 2 km/s — a
compression). Everything generated uses seeded hashes: no art ships, every player sees the same
sky.

### Re-entry, particles, post

- `reentry.ts` — shader sheath around the hull, scaled by `plasmaIntensity`, windward-gated by
  angle of attack; an onboard inset shows the vehicle large while hot (show > 0.1, hide < 0.06).
- `particles.ts` — fixed pool of 4000 in parallel typed arrays with a free list, allocated once;
  four generated textures (`core`, `soft`, `smoke`, `wisp`), ten `EFFECTS`. Shock diamonds are
  brightness bands within the plume core, not an emitter. Each effect has a fixed, name-keyed
  random stream, so batching core and bell births at different frame rates preserves their
  jitter. Clearing a flight resets emitter debt and random history as well as live particles.
- `effects.ts` — emitters from state, bursts from `previous`→`state` edges. Q thresholds are
  kPa, range-checked against the goldens (`tests/view/dynamic-pressure.test.ts`).
- `post.ts` — hand-written bloom and heat-shimmer filters (`pixi-filters` would cost ~80 kB
  gzip), each *detached* below `POST_THRESHOLD` so the pad and cruise pay for no full-screen pass.

## Sound — `src/audio`

| File | Role |
|---|---|
| `engine.ts` | owns the context: `unlock`, `setMuted`, `setVolume`, `setBackgrounded`, `update` |
| `graph.ts` | master + `engine`/`aero`/`transient`/`warning` buses; seeded noise buffer |
| `params.ts` | pure `SimState` → `AudioParams` curves |
| `voices.ts` | engine, aero, warning voices; diffed `setTargetAtTime` (40 ms) |
| `events.ts`, `transients.ts` | edge latches; synthesised ignition, shutdown, touchdown, crash, breakup |

- **Synthesis, not samples** — filtered noise and oscillators as functions of state; the audio
  budget reads 0 kB. Transients sit behind one interface, so recordings could replace them in
  `transients.ts` alone.
- **Lazy and gesture-gated** — nothing is built until `unlock()` on the first pointer or key, so
  the intro is silent until the player takes control. The graph is built once (node count
  constant); one-shots schedule their `stop()` at creation.
- **Mute suspends the context**; volume is a gain on a running graph (0 is not mute). A hidden
  tab suspends; returning never overrides a mute.
- **Curves** — aero noise silent by 50 km, engine to a floor (`ENGINE_VACUUM_FLOOR`);
  monotonic, pinned at golden states, RMS-asserted under `OfflineAudioContext`.

## Shell — `src/ui` (React)

`main.tsx` mounts `shell/App.tsx` once. React renders on interaction only; it owns structure,
the binders own values. The rules are `frontend-conventions`; the look is
`docs/design/design-system.md`, the zones `docs/design/ia.md`.

- `session/` — the framework-free controller. `session.ts` owns the loop, the tick, the HUD
  binders and every command a surface may call; `scene.ts` owns every Pixi object; `store.ts`
  is a Zustand vanilla store of what the interface renders, written on transitions only.
- `shell/` — one folder per surface (`StatusBar`, `Hud`, `TrajectoryCard`, `Controls`, `Menu`,
  `BlackBox`, `Debrief`, `FirstFlight`). Each renders once and, in an effect, hands the session
  resolvers for the elements its binders write. `layout.ts` owns the three layouts (`wide`,
  `phone`, `short`); `--hud-bottom` and `--controls-bottom` carry one surface's edge to another,
  on resize only. `index.css` holds the fonts and the flight tokens over the kit's.
- `kit/` — flight_sim's interface kit, vendored byte for byte (`kit/PROVENANCE.md`).
- `shell/fonts/` — Inter, Inter Tight and JetBrains Mono, subset; `metrics.ts` records their
  digit widths and why D-DIN was rejected.
- `testids.ts` — the import-free `data-testid` contract e2e selects by.
- `guide.ts` — help generated from code tables (`KEY_BINDINGS`, autopilot modes,
  `ALL_SCENARIOS`) so it cannot drift.
- `charts.ts` — uPlot and its CSS behind a dynamic import. `blackbox.ts` — the recorder's
  channels as the black box plots them.
- `app/preferences.ts` — every persisted key in one list; all storage access guarded.

## Budgets

| Budget | Limit | Enforced by |
|---|---|---|
| First-load JS | ≤ 300 kB gzip (250 before the React shell) | `scripts/check-budget.mjs` in `npm run build` — `<script src>` + `modulepreload`, lazy chunks excluded |
| Fonts / audio | ≤ 80 kB / ≤ 250 kB raw | same script |
| First-load CSS | no chart theme | `tests/budget.test.ts` |
| Sim step | < 1 ms (240 Hz) | `tests/view/perf.test.ts` |
| HUD update | < 2 ms | `tests/hud/binder.test.ts`, `perf.test.ts` |
| Frame-path allocation | none | pool, loop and heap tests in `perf.test.ts` |
| Particle peak | < 75% of 4000 over every golden | `perf.test.ts` |
| Generated textures | < 120 ms, once at mount | `perf.test.ts` |

## Deploy shape

`vite.config.ts` sets `base: './'` so one build serves at a root or a subpath; the precache is
scope-relative for the same reason. `stage-subpath.mjs` + `playwright.subpath.config.ts`
(`npm run test:deploy`) prove it under `/StarShipSimulator/`. `.github/workflows/deploy.yml`
runs the gate, copies `index.html` to `404.html` (deep links land in the app), adds
`.nojekyll`, and publishes `dist` to Pages.

## Testing the picture

`tests/e2e/pixels.ts` asserts structure — occupancy (the vehicle is in frame on every
scenario), extent (plume length in vehicle-heights), tone and colour separation — never golden
images. Whether it looks or sounds good is a human decision no test covers. CI runs the desktop
Playwright project only; `@mobile-only` specs run under `npm run gate`.
