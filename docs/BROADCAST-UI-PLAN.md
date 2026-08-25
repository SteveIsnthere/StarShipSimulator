# The Broadcast Overhaul — UI & graphics plan (M6)

Owner decision, 2026-08-25: the rebuild's visual layer is redesigned around the
soul of the SpaceX launch-webcast overlay, responsive down to a phone. This
document is the design research, the design language it distills into, the
layout and component specs, and the engineering constraints the work runs
under. The task list lives in `docs/ROADMAP-TASKS.md` § M6; the goal prompt in
`docs/REBUILD-PLAN.md` § Driving implementation.

One sentence of scope discipline before anything else: **this milestone touches
pixels, not physics.** `v2/src/core` is frozen for its entire duration, and the
seven golden digests in `tests/golden/unification.test.ts` must be byte-for-byte
where M2.14 left them at its end. A UI task that finds itself wanting a physics
change has left its lane and stops.

---

## 1. The reference, studied

The SpaceX webcast overlay (the graphics package won a NASA award in 2019 for
the DM-1 coverage) has two generations that matter to us:

**Falcon era.** A translucent dark scrim rises from the bottom edge of the
video. Bottom-left and bottom-right: one telemetry cluster per stage — a pair
of circular **gauges** (SPEED km/h, ALTITUDE km), each an arc with a large
numeral inside and a small uppercase unit below. Bottom-center: the **T+ clock**
and mission name. Across the bottom, an **event timeline** — a thin arc/track
with named milestone nodes (LIFTOFF · MAX-Q · MECO · STAGE SEP · ENTRY BURN ·
LANDING) that fill as the flight progresses, the next event labeled. Nothing
else. No boxes, no chrome, no borders — hierarchy comes entirely from type
size, weight, and opacity.

**Starship era.** The same skeleton, denser: per-vehicle **engine clusters**
drawn as dot diagrams (33 Super Heavy dots, 6 ship dots) that light and darken
individually as engines ignite, shut down, or fail — the single most loved
element of these broadcasts, because failures are visible the moment they
happen. **Propellant bars** labeled LOX / CH4 per vehicle. During entry, an
**attitude indicator** and flap-position pictograms. Telemetry-loss states
(values freeze and dim rather than vanish).

**Typography.** DIN-family throughout — geometric, condensed-capable,
engineered-looking. The open **D-DIN** (commissioned by Datto from Monotype,
released under SIL OFL 1.1) is the canonical free member of that family and is
what every faithful recreation uses. Uppercase micro-labels with wide tracking;
large numerals; weight contrast instead of color contrast.

**What makes it feel the way it feels** — the soul we are adopting, reduced to
six principles:

1. **Data is the hero.** The world fills the frame; the UI annotates it from
   the edges. Nothing floats mid-screen.
2. **Scrim, not cards.** Legibility comes from one gradient rising from the
   bottom edge, never from boxes drawn around things.
3. **White plus opacity is the whole palette.** 100% white for values, ~70% for
   labels, ~45% for inactive. Color appears only as meaning: amber for caution,
   red for failure. No decorative accent.
4. **The dial-and-digit pair.** A gauge arc gives rate-of-change at a glance;
   the numeral inside gives the value. Neither alone.
5. **The flight is a narrative.** The event timeline tells you where you are in
   the story and what happens next. It is the element that turns telemetry into
   drama.
6. **State is physical.** Engines are dots that light. Propellant is a bar that
   drains. Nothing is a green word saying "ON".

**What we deliberately do NOT copy.** The webcast is a passive broadcast; this
is a cockpit. SpaceX never shows a button because the viewer cannot press
anything. Our controls must exist — so they are designed *in the same
language* (same type, same opacity ramp, same hairlines) as a distinct
**flight-controls layer** that sits above the broadcast layer and can be hidden
entirely ("cinematic mode"), at which point what remains IS the broadcast.

Research sources:
[Shane Mielke — SpaceX Webcast UI](https://www.shanemielke.com/work/spacex/webcast/) ·
[KSP-x-webcast anatomy](https://github.com/ealdr/KSP-x-webcast) ·
[Figma community recreation](https://www.figma.com/community/file/771267635195064482/spacex-launch-webcast) ·
[Crew Dragon UI recreation study](https://uxdesign.cc/how-i-recreated-crew-dragons-ui-15877eddf3ed) ·
[D-DIN on Font Squirrel (OFL 1.1)](https://www.fontsquirrel.com/fonts/d-din) ·
[Datto's D-DIN repository](https://github.com/amcchord/datto-d-din) ·
[Starship flight telemetry logs (event/propellant reference)](https://starship-spacex.fandom.com/wiki/Starship_Flight_Test_3)

---

## 2. Design language spec

### Tokens (`src/ui/theme.css`, CSS custom properties)

| Token | Value | Use |
|---|---|---|
| `--ink-100` | `rgb(255 255 255)` | values, active states |
| `--ink-70` | `rgb(255 255 255 / 70%)` | labels, units |
| `--ink-45` | `rgb(255 255 255 / 45%)` | inactive, upcoming events |
| `--ink-25` | `rgb(255 255 255 / 25%)` | hairlines, gauge tracks |
| `--scrim` | `linear-gradient(transparent, rgb(8 10 14 / 82%))` | the lower third |
| `--scrim-top` | `linear-gradient(rgb(8 10 14 / 60%), transparent)` | top edge (clock/menu) |
| `--panel` | `rgb(8 10 14 / 55%)` + `backdrop-filter: blur(6px)` | control surfaces, sheets |
| `--caution` | `#FFB000` | limits approached (heat > 80%, Q, fuel low) |
| `--alarm` | `#FF453A` | breakup, crash, engine failure |
| `--good` | `#30D158` | used ONCE: touchdown confirmation. Nowhere else. |
| `--hairline` | `1px solid var(--ink-25)` | every border |
| `--radius` | `2px` | near-square. Neumorphic pillows are gone |

The neumorphic shadow (`3px 3px 7px…-4px -4px 9px…`) is **deleted from the
codebase** — its absence is grep-asserted in a test, because it is the single
clearest marker of the old look.

### Typography

- **D-DIN** (Regular, Bold) + **D-DIN Condensed** for dense labels. Self-hosted
  woff2, subset to latin + digits + punctuation, ≤ 80 kB total, OFL license
  file committed alongside. `font-display: swap`; SW-precached (offline gate
  already exists).
- **Numerals must be tabular** — a ticking readout that wobbles horizontally is
  disqualifying. D-DIN's figures are effectively monospaced; a unit test
  measures rendered widths of `1111` vs `0000` via canvas and fails if they
  differ by > 1px. If D-DIN fails that test, the fallback (decided by the same
  test, not by taste) is an OFL DIN-grotesque with true `tnum` — Saira or
  Barlow — same subset pipeline.
- Scale: values 28/40px (gauge numerals), labels 10–11px uppercase with
  `letter-spacing: 0.14em`, T+ clock 22px. Fallback stack:
  `'D-DIN', 'Helvetica Neue', Arial, sans-serif`.

### The two layers

```
┌────────────────────────────────────────────────────────────┐
│  broadcast layer   pointer-events: none, always visible    │
│    top: T+ clock · scenario name · (scrim-top)             │
│    bottom: gauges · engine dots · propellant · timeline    │
│                        (scrim)                             │
│  controls layer    pointer-events: auto, hideable          │
│    left: engine panel   right: yoke/autopilot panel        │
│    corners: menu · black box · cinematic toggle            │
└────────────────────────────────────────────────────────────┘
```

Cinematic mode hides the controls layer only. Every readout keeps a stable
`data-testid`; e2e stops depending on visible labels this milestone.

---

## 3. Layout

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ T+ 00:04:31   RE-ENTRY                          [BLACK BOX] [MENU] ▦ │ ← scrim-top
│                                                                      │
│   ENGINE            (the world — untouched center)        AUTOPILOT  │
│   CONTROLS                                                 PANEL     │
│   (left rail)                                             (right     │
│                                                            rail)     │
│......................................................................│
│  ╭─╮  ╭─╮      ● ● ●   CH4██████████░░ 62%                          │ ← scrim
│  │ │  │ │      RAPTORS LOX██████████░░ 62%          ▲ 12° PITCH     │
│  ╰─╯  ╰─╯                                                            │
│ 7,542  67.9    ○────●────●────◐────○────○────○                      │
│ SPEED  ALT     LIFTOFF MAXQ MECO ENTRY FLIP BURN TOUCHDOWN           │
│  M/S    KM                                                           │
└──────────────────────────────────────────────────────────────────────┘
```

- Gauges: SVG arcs (270° sweep), scale auto-ranged per scenario regime
  (0–8000 m/s, 0–200 km for orbital; tighter for hops). Digit inside, unit
  below, label above — the Falcon layout exactly.
- Engine dots blink during ignition countdown (existing indicator semantics),
  go `--alarm` on failure, dim on shutdown.
- Propellant: one physical tank in the sim → one bar, but drawn in the CH4/LOX
  double-bar visual style (both driven by the same fraction, labeled as the
  pair) — the honest note lives in the component's comment.
- The long-tail readouts (V/S, H/S, TWR, G, MACH, Q kPa, HEAT, RANGE) live in a
  collapsible **engineering strip** above the timeline — present, small,
  ink-70; hidden in cinematic mode. **Q is relabeled kPa** — the audit proved
  the value is kPa and the 2021 "PSI" label is a mislabel; keeping it would be
  printing a known lie on screen (display-only change, declared in PARITY.md).

### Phone portrait (< 600px)

```
┌──────────────────────┐
│ T+ 04:31   RE-ENTRY ▦│
│                      │
│      (world)         │
│                      │
│                      │
│ 7,542 M/S   67.9 KM  │  ← digits only; arcs become thin
│ SPEED       ALT      │    progress ticks under the digits
│ ●●● ██████░░ 62%     │  ← engines + one propellant bar
│   ◐ ENTRY → FLIP     │  ← timeline collapses to now → next
│ ┌──────────────────┐ │
│ │ ▲ CONTROLS       │ │  ← bottom sheet, drag handle;
│ └──────────────────┘ │    opens over the scrim
└──────────────────────┘
```

- Panels become **bottom sheets** (drag handle, one open at a time); touch
  targets ≥ 44px; `viewport-fit=cover` + `env(safe-area-inset-*)`; `100dvh`
  everywhere `100vh` is used today.
- Landscape phone = compressed desktop (rails narrow, gauges shrink one step).
- The canvas/camera already resizes by aspect (`view/camera.ts`); the work is
  CSS + layout, not renderer.

---

## 4. The mission event timeline (the one new *system*)

Events are **observed from SimState, never scripted** — the player can always
freestyle, and an event that never happens simply never lights. Derivation is a
pure function in `src/hud/timeline.ts` (hud layer — allowed to read core, no
DOM in the derivation), unit-testable headless:

| Event | Observed as |
|---|---|
| LIFTOFF | `onTheGround` → false while `speedY > 0` |
| MAX-Q | running max of `dynamicPressure`, confirmed after sustained decline (2 s) |
| MECO | all engines off after a powered ascent |
| APOGEE | `speedY` sign flip while high |
| DEORBIT BURN | `autopilot.deorbitBurnStarted` |
| ENTRY | descending through 80 km (the entry interface) |
| FLIP | `autopilot.flipCompleted` |
| LANDING BURN | final-descent stage active |
| TOUCHDOWN / LOSS | `status.landed` / `crashed || inFlightBreakUp` |

Each scenario declares its expected track (data, in `ui/`): the intro shows
LANDING BURN → TOUCHDOWN; Circularize shows CIRCULARIZE → COAST → DEORBIT →
ENTRY → FLIP → BURN → TOUCHDOWN. The derivation is tested by **replaying the
seven golden fixtures through it** and asserting each scenario's event order —
deterministic by construction, and it doubles as regression proof that the UI
work changed no behavior.

---

## 5. Graphics upgrades (view/ only)

The overlay deserves a world worth annotating. All four are render-layer reads
of SimState — nothing writes back, nothing changes a fixture:

1. **Horizon curvature + haze.** Ground drawn with altitude-dependent
   curvature; a scattering haze band that thins with altitude. High flight
   should *look* high — this is the single biggest visual payoff.
2. **Vacuum plume expansion.** Plume width/spread as a function of ambient
   pressure (already in SimState): tight Mach-diamond core at sea level, wide
   translucent bell above ~40 km. The broadcast look during ascent.
3. **Re-entry plasma.** The existing shock/shimmer post pass gains a trailing
   plasma streak scaled by `thermalPower` — reuses the pooled particle system.
4. **Pad night lighting** tied to the existing sky gradient's darkness, so
   high-warp ascents read as leaving a lit pad.

Same discipline as M3: pooled, zero per-frame allocation, effects detach at
zero intensity, heap-sampling perf test extended to cover them.

---

## 6. Engineering constraints (all pre-existing, all still binding)

- **One rAF subscriber.** The binder gains attribute-diff writes
  (`stroke-dashoffset` for arcs, `transform` for the attitude chevron) beside
  its text-node diffs — still resolve-once, still zero-alloc, still < 2 ms
  (benchmark re-run on the new DOM).
- **Budgets.** First-load JS ≤ 250 kB gzip (today: 183). New self-imposed cap:
  fonts ≤ 80 kB. uPlot stays lazy. No CDN (already lint/e2e-enforced; fonts
  self-hosted is not optional).
- **Offline.** Fonts and any new assets enter the SW precache; the
  full-playthrough-offline e2e must stay green.
- **Svelte renders on interaction only**; everything per-frame goes through the
  binder. No framework code in the frame path — unchanged law.
- **e2e evolution.** Control-presence specs move to `data-testid` (M6.1) so
  restyling can't break them; Playwright gains phone-viewport projects (Pixel 7
  / iPhone 14-class, portrait + landscape) running smoke, controls, and offline
  specs; the screenshot spec captures desktop + phone portrait and both land in
  the README.
- **The freeze.** At every M6 commit: `git diff v2/src/core` is empty and the
  seven digests in `unification.test.ts` are unchanged. The digests are the
  proof the overhaul is what it claims to be — pixels, not physics.

## 7. Decisions taken (defaults, reversible)

- **No decorative accent color.** White + opacity, exactly like the reference;
  color only as meaning (caution/alarm/touchdown). If it feels too austere
  after a real playtest, an accent is a one-token change.
- **Cinematic mode defaults OFF** (it's a cockpit first); the toggle lives
  top-right and is remembered per-device.
- **The light daytime sky stays.** The scrim exists precisely so the overlay
  survives any background; darkening the world to flatter the UI would be
  backwards.
- **D-DIN unless the tabular-digits test rejects it**; the test decides, not
  taste.

## 8. Risks

| Risk | Mitigation |
|---|---|
| D-DIN digits not tabular enough | width test in M6.1 decides font before anything is built on it |
| Gauge redraw cost on mobile | dashoffset-only updates; benchmark gate; arcs degrade to digit+tick under 600px anyway |
| e2e churn from restyling | data-testid contract lands first (M6.1), before any restyle |
| Scrim over bright sky at noon | scrim opacity tuned against the brightest fixture frame; contrast test asserts AA for ink-70 on the worst case |
| Scope creep into physics | the freeze + digest gate makes it structurally impossible to hide |
