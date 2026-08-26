# Graphics — the M9 plan

Investigated 2026-08-26, after M8 shipped, on the owner's question: *"look into
graphics quality, like particles, ground, clouds — how can we improve?"*

The honest answer came back in two halves, and the order is the whole plan.

**The first half is that one of the six scenarios does not draw the vehicle at
all.** Not dimly, not small — a kilometre and a half off the left edge of the
frame, permanently, within a quarter of a second of loading. Every re-entry
screenshot taken during the investigation is a photograph of an empty sky. The
plasma trail, the velocity streaks and the flight-path marker M7 built are all
attached to a ship that is not on screen.

**The second half is the look question as asked**, and the answers there are
real but ordinary: nine particle effects share one texture, the plume is shorter
than the vehicle, the cloud deck is eighteen hard-edged vector ellipses, and the
ground is a flat plate.

So M9 fixes what is broken, builds a way to tell the difference, and then makes
it look better — in that order. A milestone that reversed them would spend its
effort tuning a plume nobody can see.

---

## 1. The evidence

Everything below is a measurement from the running build at 1280×720, not an
impression. The probe was a temporary spec that screenshotted the live canvas,
decoded it in-page with `createImageBitmap`, and printed a coarse luminance map
plus a colour histogram; and a temporary `console.log` in the tick reporting the
vehicle's `worldToScreen` position. Both were removed. **M9.1 makes the first one
permanent**, because the investigation twice nearly reached the wrong conclusion
from looking at a PNG.

### 1.1 The vehicle, on the `reentry` preset

```
t=0.25  x=-148   lead=1094 m   camSpeedX=7300   shipSpeedX=7299
t=0.43  x=-200   lead=1166 m   camSpeedX=7362   shipSpeedX=7299
t=0.68  x=-682   lead=1836 m   camSpeedX=8801   shipSpeedX=7298
t=1.12  x=-1282  lead=2669 m   camSpeedX=8084   shipSpeedX=7296
t=3.94  x=-1734  lead=3298 m   camSpeedX=7325   shipSpeedX=7286
```

`x` is the ship's screen x on a 1280 px canvas; `lead` is `camera.posX -
downRangeDistance`. The vehicle leaves the frame immediately and the error then
*settles* at 3298 m rather than recovering. It is drawn every frame —
`vehicle.visible` is `true`, the layer has one child, alpha is 1, the sprite is
6 × 36 px — at a screen position no viewport contains.

For contrast, the same probe on `landing-burn`:

```
t=0.22  x=640  lead=0 m   t=2.79  x=640  lead=0 m
```

Dead centre, the whole way. Which is why this survived M6, M7 and M8: every
screenshot anyone took of a landing was correct.

### 1.2 The frame, at re-entry

A 160 × 160 crop centred on where the camera math *should* have put the ship,
quantised to four bits per channel:

```
1,1,1 ×16 — 84.3%      (sky)
5,5,4 ×16 — 13.4%      (the distant-earth band, lower third)
everything else        — 2.3%, all of it star field
```

Nine distinct colours in the whole crop. There is nothing there.

### 1.3 Airframe shake, on an RTLS

```
shake 0.00,0.00   at every sampled frame
```

---

## 2. The bugs

### 2.1 The view integrates wall time; the vehicle integrates simulated time

`App.svelte`'s tick computes one `frameTime` from `performance.now()` and uses it
for two different things:

```ts
const frameTime = (now - last) / 1000;
advance(loop, frameTime, loopOptions);      // return value discarded
...
updateCamera(view.camera, cameraTarget, view.viewport, frameTime, cameraOptions);
distantEarth.update(viewport, altitude, speedX, frameTime);
clouds.update(viewport, altitude, speedX, frameTime);
effects.update(particles, camera, viewport, s, loop.previous, frameTime);
```

`advance` does not simulate `frameTime` seconds. It clamps at
`MAX_FRAME_TIME = 0.25`, it drains whole `DT` steps and leaves a remainder in the
accumulator, and it has a max-steps bailout that *zeroes* the accumulator and
returns `clamped: true`. It also divides by the slow-motion factor. It returns
`{ steps, alpha, clamped }` precisely so a caller can know how much time actually
passed, and the caller throws it away.

So whenever the simulation cannot keep up — which is exactly the fast, particle-
heavy, five-times-field-of-view re-entry — the camera integrates 7300 m/s across
wall seconds the vehicle never flew. In the trace above the sim ran about 5%
behind wall time; 5% of 7300 m/s is 365 m/s of pure camera runaway, and 3.7
seconds of it is 1350 m.

The same defect runs the other way under time warp: the sim takes N times as many
steps per wall frame, the vehicle moves N times as far, and the camera integrates
one wall frame's worth. The camera falls behind instead of ahead. Nobody noticed
because a time-warped landing is still centred by the follow law within its
recovery radius — see the next section for why re-entry is not.

**The fix is one clock.** The view is downstream of the simulation and must be
driven by the simulation's own elapsed time. `advance` already computes it.

### 2.2 The give-up radius is a one-way latch

`centerizeAcceleration` is a verbatim port of `drawMethods.js:184` and its third
branch reads:

```ts
if (magnitude < threshold) return difference / timeToAlign;
if (magnitude < max)       return (difference / timeToAlign) * ((max - threshold) / (max - magnitude));
return 0;                                  // <- here
```

`max` is `viewport.physicalWidth / 2` — 889 m at re-entry. Past it the position
term is exactly zero and only `matchSpeedAcceleration` runs, which drives the
*relative velocity* to zero and therefore freezes the error wherever it happened
to be. There is no path back. The trace shows it settling at 3298 m and staying.

The 2021 intent was "do not lurch after a vehicle that just exploded", and that
intent is worth keeping. What is not defensible is applying it to a vehicle that
is flying normally. M7.4 already hit this once from a different direction —
`startFlight` carries a comment about a flight configured at 20 km being
"permanently off screen with no way to recover" — and fixed the seeding without
removing the latch. § 2.1 re-creates the condition on every dropped frame.

**The fix is to make the give-up conditional on the thing it was written for**
(`crashed`), and to keep it frame-rate-independent and damped: the five
properties M7.3 established as the camera's acceptance line still hold, with a
sixth added — *the vehicle returns to frame from any starting error*.

> **Owner decision, 2026-08-26.** Give up only when `crashed`. The two
> alternatives were offered and declined: fixing the clock alone and leaving the
> branch verbatim (re-entry would work, but the same branch would still be
> waiting for the third time it bites), and removing the give-up entirely (the
> lens would chase debris, which is the behaviour 2021 deliberately wrote out).
> This is the smallest change that keeps the original intent and makes a flying
> vehicle always recoverable.

### 2.3 Dynamic pressure is in kPa and three constants think it is Pa

`getDynamicPressure` is `airDensity * trueSpeed ** 2 * 0.0005` — one half, with a
Pa→kPa conversion folded into the constant. Its own JSDoc says so, and then
labels the return `psi` because that is what the 2021 HUD called it. It is
neither Pa nor psi: it is kPa. Sea level `airPressure` is 101.3 in the same
units, and `view/atmosphere-look.ts` has had `SEA_LEVEL_PRESSURE = 101.325`
correct since M6.7.

Two consumers got it wrong, one already fixed:

| Where | Constant | Should be | Effect |
|---|---|---|---|
| `audio/params.ts` | `AERO_FULL_Q = 30_000` | `30` | airflow noise inaudible — **fixed at M8.3** |
| `view/camera.ts` | `SHAKE_FULL_Q = 30_000` | `30` | airframe shake never fires |

Q peaks at 23.6 kPa on a launch and 28.6 kPa on an RTLS, so `q / 30_000` is
0.00095 and the aerodynamic half of the shake has contributed nothing since M7.3
shipped. The doc comment beside it says "Max-Q on an ascent is around 30 kPa" —
the intent was right and the units were not.

> **Owner decision, 2026-08-26.** The shake lands at M7.3's designed amplitude —
> `SHAKE_FRACTION = 0.006`, 0.6% of viewport height at full — rather than being
> dialled back for its first outing. It has never once fired, so every ascent
> will feel different the moment M9.3 lands; whether that amplitude is right is a
> viewing decision to be made after seeing it, not a number to hedge in advance.

The same class of error is live once more as a *look* defect rather than a dead
one: `effects.ts` ramps the fin vortex trail to full intensity at
`dynamicPressure / 2`, which against `dynamicPressureLimit = 50` means the effect
is saturated from 4% of the structural limit onwards and carries no information
for the rest of the flight. That one is a threshold to retune, not a unit to fix.

**The fix is a unit audit with a test that cannot rot**: every Q threshold in
`view/`, `audio/` and `hud/` asserted to lie inside the range the seven golden
scenarios actually visit. A constant a thousand times outside the observed range
is a bug whatever its comment says, and this test would have caught both of them.

---

## 3. The look

### 3.1 One texture for nine effects

`createParticleTexture` builds a single 64 px white radial gradient and every
effect in `EFFECTS` draws with it. The Raptor plume, ground dust, re-entry
plasma, the transonic cone, fin vortices, velocity streaks and the explosion are
the same soft dot in different tints. M7.5 added `stretch` so the streaks are at
least a different *shape*; nothing else varies.

This is the largest quality-per-line item in the milestone and it is nearly free:
the texture is generated at runtime from a canvas, not shipped, so more of them
cost nothing against any budget. Four is enough to separate the classes:

| Texture | Falloff | For |
|---|---|---|
| `core` | tight, hot centre, sharp shoulder | additive fire — plume core, plasma, aeroHeat |
| `soft` | the current gradient | the fallback, and everything already tuned against it |
| `smoke` | low-frequency value noise, ragged edge | groundSmoke, raptorShutdown, explosion |
| `wisp` | soft, elongated, feathered ends | aeroTrail, sonicBoom, cloud puffs (§ 3.3) |

Generated, seeded, and pinned by a test the same way the cloud puff hash is.

### 3.2 The plume is 22 metres long on a 50 metre vehicle

With `speed: 95`, `drag: 2.2` and `life: 0.32`, a plume particle travels
`(v/drag)(1 - e^(-drag·life))` = 43.2 × 0.506 ≈ **21.9 m** before it dies. The
vehicle is 50 m tall. Three Raptors at full throttle emit at `rate: 220` × 1.0,
so roughly 70 particles are alive at once, out of a pool of 4000 (M7's measured
peak was 576). It reads as a candle because it is one.

A Raptor stack has three visible parts and the current effect has one:

- a **short, near-white, high-velocity core** at the throat, barely spreading;
- the **bell**, translucent, expanding with ambient pressure — this is what
  `plumeScaleFactor` / `plumeSpreadFactor` already model, correctly, from M6.7;
- **shock diamonds** in the first few vehicle-lengths at low altitude, which
  disappear as the flow goes underexpanded.

Three emitters on the same nozzle point, sharing the existing ambient-pressure
curves, with the core using the new `core` texture. The diamonds are a periodic
brightness along the core rather than a new effect — a spacing that is a function
of ambient pressure and nozzle diameter, faded out as the air thins, and pinned
as a pure curve in `atmosphere-look.ts` beside the two that are already there.

Pool headroom says the cost is affordable; § 5 says it has to be proved rather
than assumed.

### 3.3 The cloud deck is eighteen vector ellipses

`CLOUD_PUFFS = 18`, each a `Graphics` of three overlapping ellipses, all at
`alpha = opacity * 0.5`, all the same tint. Three hard-edged vector shapes at
uniform opacity is a paper cutout, and the screenshot reads as one: a grey band
with a scalloped bottom.

Clouds need soft edges and varied density far more than they need silhouette.
The change is to draw them as sprites on the `wisp` texture with per-puff alpha,
scale and aspect jitter from the existing `puffRandom` hash, and to split the
deck into two sub-decks at slightly different parallax so it has thickness.

Everything M7.6 established stays: built once and transformed after,
deterministic across runs, never drawn below the horizon, the fade above
`CLOUD_FADE_ALTITUDE`, and the parallax ratio against the distant earth. Those
are the acceptance line and they are already tested — this task must not move
them.

### 3.4 The ground is a flat plate, and the far earth is a tan band

`GROUND_COLOR = 0x9a8c78` fills a single `Graphics` with a 16-segment curved top
edge, tinted by `skyLightness`. There is no texture anywhere in it, so at 120 m
the bottom third of the screen is one colour. The nine `GROUND_OBJECTS` sit at
fixed world positions around StarBase — two of them roam, plus the pig — so
outside a narrow band of downrange the world is empty ground.

`distant-earth.ts` has the same problem one layer further out: a band with a hard
top edge and a repeating mark pattern that reads as bumps rather than terrain.

Both want the same two things and neither wants new art:

- **a generated low-frequency noise fill**, tinted rather than coloured, so the
  existing palette and the existing `groundTint` lighting still drive it;
- **a horizon-to-foreground value gradient**, because the flatness is as much a
  lighting problem as a texture one — real ground gets hazier and lighter toward
  the horizon and this ground does not.

Plus more scenery instances at more downrange positions, from the sprites already
loaded. The pig stays at x = 0.

---

## 4. What is explicitly not in this milestone

- **New art assets.** Everything here is generated or is the 2021 art reused. The
  asset budget does not move.
- **A post-processing rebuild.** `post.ts`'s hand-written bloom and heat shimmer
  are fine; they are not what is wrong.
- **Anything in `core/`.** See § 6.
- **3D, a new renderer, or lighting.** Not this milestone, possibly not ever.

---

## 5. How we will know it is better

This is the hard part, and it is the reason M9.1 comes first.

Two of the three bugs above shipped through three milestones of screenshot review
because **looking at a picture is not a test**. The investigation itself made the
same mistake twice: once concluding the vehicle was hidden by a post-processing
filter (it was not), and once concluding from a Node-side reproduction of the
camera path that the ship was centre-frame (the Node model was wrong; the browser
was right).

So M9.1 builds a pixel harness in `tests/e2e/`, and it asserts *structural*
claims rather than comparing images:

- **Occupancy.** Given a scenario and a moment, which regions of the frame have
  non-background pixels. "The vehicle is somewhere in the middle 60% of the frame"
  is a claim a machine can check and is exactly the claim that was false.
- **Extent.** The plume's bright region measured in vehicle-heights, so "longer
  than the ship" is a number.
- **Separation.** A colour histogram over a crop, so "the cloud deck is not one
  flat tone" and "smoke and fire are different colours" are assertions.

No golden-image diffing. Screenshot comparison across five Playwright projects
and two renderers is a maintenance tax that pays out in false failures, and the
project already decided against pixel parity once, at M6.

**The vehicle-in-frame invariant is the one that matters most**, and it runs over
all seven scenarios: at every sampled second, the ship's projected position is
inside the viewport. That test fails today on `reentry`. Per the constitution's
Bug-fix tier it lands *in the same commit as the fix*, failing first.

What no test will cover is whether it looks good. That is a viewing decision, and
this plan says so for the same reason the sound plan said it.

---

## 6. Constraints, all pre-existing

- **`core/` does not change and the seven golden digests do not move.** M9 is
  pixels, exactly as M6 and M7 were. The milestone rule is checked at every
  commit: `git diff v2/src/core` empty.
- **Zero allocation in the frame path**, and the particle pool stays pooled. New
  emitters take from the same fixed pool; nothing is constructed per frame.
- **Budgets.** First-load JS ≤ 250 kB gzip (196.3 kB today), fonts ≤ 80 kB, audio
  ≤ 250 kB. Every new texture is generated at runtime, so the asset budget is
  unaffected by construction.
- **Frame budgets.** Sim step < 1 ms @ 240 Hz, HUD update < 2 ms. The particle
  update is per-frame work and § 3.2 adds to it; M9.8 measures rather than hopes.
- **Determinism.** `view/` may call `Math.random`, and the cloud deck deliberately
  does not. Everything generated here — textures, puff jitter, diamond spacing —
  uses the same seeded-hash discipline, so two players see the same sky.
- **Five Playwright projects**, phone viewports included.
- **The frozen 2021 tree at `v2/tests/fixtures/legacy/` is never modified.**

### Units in `core/`: resolved, and wider than one comment

`SimState.forces.dynamicPressure` is documented `/** psi. */` and it is kPa. That
comment is the root cause of two shipped bugs — one found at M8.3, one at § 2.3 —
and it is inside `core/`, where the milestone rule says nothing changes.

> **Owner decision, 2026-08-26.** Fix it, **and audit every unit annotation in
> `core/` against what the code actually produces.** Comment-only, its own commit,
> with the seven golden digests re-verified in that commit as proof. A comment
> cannot move a digest.

That widening is the right call and it changes the shape of the milestone. One
wrong unit comment is a typo; the question of how many others are wrong is a
different question, and it is worth answering once rather than discovering the
answer one shipped bug at a time. `dynamicPressure` is already known to be
mislabelled, `thermalPower` is documented as "arbitrary thermal units" and
compared against a limit that M2.10 recalibrated, and the 2021 tree mixed psi,
kPa and Pa freely — this port inherited that and has never checked it.

So it gets **its own task and its own commit** (M9.4), rather than riding along
inside M9.3. A commit that touches `core/` must be reviewable at a glance as
touching nothing but comments; mixing it with a behavioural fix in `view/` is
exactly how a core diff stops being obvious. The seven digests are re-verified in
that commit, and every correction is justified against the arithmetic that
produces the value — a unit comment is a claim, and each one gets checked rather
than assumed.

---

## 7. Tasks

The task list is `docs/ROADMAP-TASKS.md` § M9.

| Task | What |
|---|---|
| M9.1 | The pixel harness — structural assertions about what is on screen |
| M9.2 | One clock for the view, and a camera that always recovers |
| M9.3 | Q is kPa — the unit audit in `view/`, `audio/` and `hud/` |
| M9.4 | Units, audited in `core/` — comment-only, digests re-verified |
| M9.5 | The particle texture set |
| M9.6 | The Raptor plume: core, bell, diamonds |
| M9.7 | The cloud deck, softened |
| M9.8 | The ground and the far earth |
| M9.9 | Perf, budget, mobile, ship |

> **Owner decision, 2026-08-26.** All nine run straight through in one goal, with
> the report at the end. The alternative — stopping after the bug fixes to look at
> a working re-entry before spending effort on the look — was offered and
> declined.

M9.1 first for the reason § 5 gives — the same reason M6.1 moved the test ids
before a single pixel changed. M9.2 and M9.3 before any look work, because a
plume tuned against a frame the vehicle is missing from is tuned against nothing.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Fixing the camera dt moves the feel of every scenario | it is a bug fix with an acceptance line: M7.3's five properties still hold, plus recovery. The landing and the intro are the ones to watch, and they are the ones the harness covers best |
| Three emitters per nozzle blows the frame budget | the pool is fixed at 4000 and peaked at 576; M9.8 measures the per-frame particle cost against the M7 baseline and reports it |
| Generated textures cost startup time | four canvases at 64–128 px, built once at mount, off the critical path. Measured in M9.8 |
| The pixel harness becomes flaky across five projects | structural assertions with wide tolerances, never image diffs. A test that asserts "somewhere in the middle 60%" does not care about a renderer's antialiasing |
| Noise fills look like noise | tinted through the existing `groundTint` and `skyLightness` path rather than coloured independently, so the palette cannot drift from the overlay's |
| The milestone drifts into a renderer rewrite | § 4 says what is out, and the eight tasks are all additive to what exists |
