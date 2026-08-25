# Depth and Speed — the M7 plan

The question that started this: *can we improve the graphics, particularly a
minimap, making it obvious the ship is moving fast, and making it more
immersive?*

The answer turned out to be measurable rather than a matter of taste, so this
document starts with the measurements. They are stronger than expected: the
simulator currently shows an **empty sky above about 100 metres of altitude**,
and at orbital speed there is nothing on screen moving at a rate a human eye can
resolve. It does not merely fail to *feel* fast — for most of every flight there
is no visual information about motion at all.

---

## 1. The diagnosis, measured

All numbers below are from the shipped `view/camera.ts` at a 1280×720 window,
computed over the seven golden scenarios.

### 1.1 The viewport is 356 × 200 metres, always

```
VIEWPORT 1280x720 = 356 x 200 m at 3.60 px/m
```

`computeViewport()` takes the window size, the vehicle height and the manual
zoom. **It does not take altitude.** The world shown is sized to make the
50 m vehicle 100–220 px tall, and it stays that size from the pad to 150 km.

### 1.2 The ground leaves the screen at ~100 m

In flight the camera centres the vehicle, so the horizon sits at
`height/2 + altitude × scale` pixels down the screen. With `scale = 3.6` and a
720 px window that runs off the bottom edge once altitude passes
`360 / 3.6 = 100 metres`.

That is the whole finding in one line. **Above 100 m of altitude the screen
contains the vehicle, a gradient, and nothing else.** The `docs/screenshot.png`
in the README is taken at 85 m precisely because that is the last moment
StarBase is visible.

Every scenario the game ships except the final seconds of a landing is flown
against a blank sky.

### 1.3 Where there IS ground, it crosses the screen in three frames

```
   30 m/s -> 11.852 s on screen, flow    108 px/s
  100 m/s ->  3.556 s on screen, flow    360 px/s
  310 m/s ->  1.147 s on screen, flow  1,116 px/s
 1130 m/s ->  0.315 s on screen, flow  4,068 px/s
 7300 m/s ->  0.049 s on screen, flow 26,280 px/s
```

At re-entry speed a ground object crosses a 1280 px screen in 49 ms — under
three frames at 60 fps. There is no display and no eye for which that is
motion rather than a smear. The band where world-locked scenery reads as
movement tops out somewhere around 150 m/s.

### 1.4 The vehicle is pinned, and the only other layer is static

The camera matches the vehicle's velocity with a one-second time constant, so in
steady flight the ship does not move in frame at all — measured horizontal drift
over the recorded window:

```
  launch-pad-takeoff       35 px of 1280
  booster-sep-boostback    61 px
  rtls-boostback          222 px
  reentry-autoland        156 px
  landing-burn-autoland     3 px
  intro-demo                2 px
```

There are exactly two parallax layers: the ground at 1× (absent above 100 m) and
the stars at 0.001×, which at 7300 m/s move **25 px/s**. The sky gradient never
moves at all.

**So the screen at 7 km/s and 75 km is pixel-for-pixel the same experience as
sitting still at 75 km.** That is the bug.

---

## 2. Why the obvious fix does not work

The instinct is to zoom out with altitude. Run the numbers: to see the ground
from 75 km you need the viewport to cover 75 km, which at 720 px is
0.0096 px/m — the 50 m vehicle would be **half a pixel tall**.

One camera cannot show both a 50 m vehicle and a 75 km altitude. This is not a
tuning problem, and it is why real launch broadcasts cut between an onboard
camera and a map, and why flight simulators have both a windscreen and an
instrument.

That fact drives the whole plan below: the answer is not one better view, it is
**a second display for the scales the first one cannot reach**, plus depth cues
in the main view that do not depend on world geometry.

---

## 3. Three answers

### 3.1 A trajectory map — the spatial display

The user asked about a minimap, and it is the structurally correct answer, with
one adjustment: this world has no lateral axis. Downrange and altitude are the
only two dimensions, so a top-down map would be a horizontal line. **The right
shape is a trajectory profile** — altitude against downrange, seen from the
side.

That is also the display that answers the question every scenario is really
about: *am I going to make it home?* `RANGE −1911.2 KM` is the answer as a
number; a map is the answer as a picture, with the landing site on it.

It shows:

| Element | Source |
|---|---|
| Ground line, landing site at x = 0 | `starBaseXPos` |
| The path flown | `app/recorder.ts` already records `altitude` and `downRange` |
| The vehicle, with a velocity vector | `SimState` |
| **The predicted path** | `coastDownrangeDistance()` (M2.9), `getFreeFallTimeRemainingPrediction()` |
| The 80 km entry interface | `ENTRY_INTERFACE_ALTITUDE` |
| Auto-ranged axes with distance and altitude labels | derived |

The predicted path is the valuable half. M2.9 built a conic coast predictor for
the deorbit autopilot and it is used nowhere the player can see. Drawn on a map
it becomes the single most useful instrument in the game: point the nose, watch
the predicted touchdown slide toward the pad.

At 7 km/s over a 2000 km map the marker crawls visibly. **Motion at a readable
rate is exactly what the main view cannot provide and this can.**

**Placement (owner decision, 2026-08-25): always-on and collapsible.** A panel in
the lower third, readable at a glance with no interaction — because the moment it
matters most is the moment you are least able to go and open something. It
collapses like the engineering strip and is remembered per device, and on a phone
it starts collapsed, since the phone lower third has no spare room.

### 3.2 Compressed-perspective depth — the world below

The main view can show the ground at altitude if it stops insisting the ground
is drawn at true scale. A **distant-earth layer** projects the ground with a
logarithmically compressed vertical scale, so it stays near the bottom of the
frame from 200 m to 200 km rather than vanishing at 100 m, and scrolls
horizontally at a rate chosen to land inside the readable band of § 1.3 rather
than at the true `speed × scale`.

This is a deliberate cheat, and § 5 says so out loud. It is the same cheat every
flight simulator makes, it is why they read as flight, and it costs nothing in
honesty as long as the *numbers* stay true — which they do, because the numbers
come from the HUD and the HUD reads SimState.

Beneath it, a **cloud deck** at a few kilometres gives the low-altitude regime a
middle distance. Right now the parallax jumps from 1× to 0.001× with nothing
between, which is why even a good ascent reads as flat.

### 3.3 Screen-space motion — cues that work at any scale

Three, none of which depend on there being anything in the world to look at:

- **Velocity streaks.** A pooled particle layer sweeping past the vehicle along
  the velocity vector, with density and length scaled by speed. Because it is
  screen-space it works identically at 100 m and 100 km. The rate must be
  perceptually compressed, not `speed × scale` — 26,280 px/s is a grey wash.
- **A flight-path marker.** The standard HUD velocity vector: a small chevron
  showing where the vehicle is actually going, as opposed to where its nose
  points. At high angle of attack those differ enormously and nothing on screen
  currently says so.
- **Camera response.** Shake under dynamic pressure and thrust, and a lead
  offset that puts the ship off-centre against its direction of travel so there
  is space ahead of it. Both are small; together they are most of what "weight"
  means on screen.

The particle pool has room: peak usage across all seven scenarios is 576 of
4000, so **86% is free**.

---

## 4. Tasks

The task list is `docs/ROADMAP-TASKS.md` § M7. In dependency order:

| Task | What |
|---|---|
| M7.1 | The trajectory map: projection, auto-range, canvas, flown path |
| M7.2 | The predicted path on it, from the existing conic predictor |
| M7.3 | Camera: retune the follow law, altitude FOV, lead and shake (§ 6.1) |
| M7.4 | The distant earth: compressed perspective, visible 200 m to 200 km |
| M7.5 | Velocity streaks and the flight-path marker |
| M7.6 | Cloud deck: the missing middle distance |
| M7.7 | Perf, budget, mobile, ship |

**The camera is third, and that is a dependency rather than a preference.** M7.4
and M7.6 are drawn *into* the frame the camera defines, so building them against
today's 356 m viewport and re-tuning them after the FOV moves would be paying
for the same work twice. The map comes first because it is independent of the
camera entirely — and because it is the answer to the question that started
this.

---

## 5. The honesty rule

This milestone introduces the first deliberate visual untruths in the project,
and they need a stated boundary or they will spread.

> **Compression is allowed in the depiction. It is never allowed in the
> numbers.**
>
> The distant earth may be drawn at a compressed vertical scale and scrolled at
> a compressed rate. The streaks may be calibrated to the eye rather than to
> physics. The trajectory map may not: every position, altitude and prediction
> on it is read from SimState or computed by `core/`, at true scale, and its
> axes are labelled with real distances.
>
> Anywhere the depiction is compressed, the function that does it lives in
> `view/`, is named for what it does, and says in its own comment that it is a
> compression and why.

The reason for the split is that the map is an *instrument* — a player will
plan a landing with it — while the world is a *view*. An instrument that lies
is a bug. A view that compresses is a camera lens.

---

## 6. Decisions needed

### 6.1 The camera control law — DECIDED, 2026-08-25

**Owner decision: retune the control law.** `view/camera.ts` had said the 2021
second-order follow was "worth preserving exactly, so the control law is ported
verbatim". That constraint is lifted. M7.5 is unblocked and may change the
follow dynamics, the framing, and the field of view.

The recommendation on the table was the conservative one — an additive offset
leaving the ported law bit-identical. The owner took the wider option, so this
plan records what that costs and what replaces it.

**What it buys.** The largest single lever on the § 1 problem becomes available:
**altitude-linked field of view**. Not enough to see the ground from 75 km — § 2
shows that is impossible — but enough that the 356 m viewport stops being a
constant. A moderate zoom-out with altitude gives the ship room, keeps
low-altitude scenery on screen for longer, and makes the distant earth of § 3.2
far more effective, because there is somewhere for it to be.

**What it costs.** The bit-identical test goes. "The camera is exactly what it
was" was a cheap and total guarantee, and nothing that permits retuning can keep
it. It has to be replaced by *properties* rather than a golden, and those
properties are now M7.5's acceptance line: the vehicle stays framed across all
seven goldens, the response stays damped rather than springy, frame-rate
independence holds, the result is deterministic, and the camera never looks
below the ground.

**How far it opens (owner decision, 2026-08-25): the moderate range, ~5×.** That
takes the drawn vehicle from 180 px to about 36 px and the viewport from 200 m to
about 1 km at high altitude — the world gets room to breathe while the ship stays
clearly the subject rather than becoming a marker. Worth being plain that even
the aggressive end of the range would not have reached the ground from 75 km; §
2 is not a tuning problem. What ~5× genuinely buys is the 500 m to 20 km band,
which is most of an ascent.

**The one hard constraint.** The FOV curve is **flat at 1× below 500 m**. The
intro auto-landing sequence is named in CLAUDE.md's soul and every landing
happens in that band; leaving the curve flat there means the moments that matter
most are untouched by construction rather than by careful tuning. Above 500 m it
may open up, monotonically, to a bounded maximum — the vehicle must never shrink
below a floor that keeps it identifiable.

### 6.2 Sound — PLANNED AS M8, 2026-08-25

**Owner decision: plan it now, build it after M7.** Absent entirely, and the
largest single immersion lever available — engine rumble by throttle,
aerodynamic noise by dynamic pressure, the silence of vacuum. It is also a new
asset class, a new budget line and new offline-precache surface, which is why it
stays out of this milestone rather than inflating it. The plan is
`docs/SOUND-PLAN.md`; the tasks are § M8.

---

## 7. Constraints, all pre-existing

- **`core/` does not change and the seven golden digests do not move.** Same
  invariant M6 ran under, checked at every commit. This is a graphics milestone.
- **One rAF subscriber.** The map redraws from the existing binder, throttled —
  a map does not need 120 Hz. Svelte renders on interaction only.
- **Zero allocation in the frame path.** Trail points come from pre-allocated
  arrays; streaks come from the existing pool.
- **Budgets.** First-load JS ≤ 250 kB gzip (today 189.0); fonts ≤ 80 kB (32.7).
  The map is canvas and code, no assets.
- **Mobile.** Five Playwright projects. The map needs a phone story — most
  likely collapsed to a toggle, since the phone lower third has no room.
- **Offline.** Anything new joins the precache.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| The map redraw costs more than the budget allows | throttled to ~10 Hz, pre-allocated arrays, benchmarked in the same test as the binders |
| Compressed perspective looks like a bug rather than a lens | the compression is monotonic and continuous with altitude; a test pins the curve at the altitudes the scenarios visit, as M6.7 did |
| Streaks read as dirt on the screen | density and length driven by one calibrated curve, tested at the speeds the scenarios reach; off below a threshold |
| The camera retune loses the 2021 feel | the owner chose it with the cost stated (§ 6.1); the FOV curve is flat below 500 m so the intro and every landing are untouched by construction, and the bit-identical guarantee is replaced by five property tests rather than dropped |
| The map becomes a second HUD nobody looks at | it carries the predicted path, which is information available nowhere else |
