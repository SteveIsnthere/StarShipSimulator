# Starship design language

The visual source of truth for the simulator's interface. It is flight_sim's design system ("Flying Bricks", `flight_sim/docs/design/design-system.md`) carried over to a space flight simulator, with a Starship brand layer in place of the Flying Bricks one. Where this file is silent, flight_sim's rule applies; where they differ, this file says so and why. Code structure belongs to the `frontend-conventions` skill (written in Phase 4); cross-project invariants belong to `ui-foundations`.

## 1. Character

A precise flight instrument laid over a beautiful world. The world — sky by sun elevation, real stars, plume, plasma sheath, the curved earth — keeps all its colour. The chrome over it is black, white and square, and gets out of the way: the player should be looking at the vehicle, and the numbers that decide whether it lands.

Three qualities, in order: **legible under pressure** (a landing burn is eight seconds long), **calm** (nothing moves, flashes or reflows unless the flight changed), **honest** (every number is the simulation's, in stated units, never decoration).

## 2. Non-negotiables

flight_sim's eight carry over unchanged:

1. Chrome is black, white and opaque neutral text grades. No accent hue, no user theme colour.
2. Zero corner radius on controls and surfaces.
3. Application surfaces are flat and opaque; in-flight chrome may use the translucent black backing of §8. No glass, blur, sheen, shadow or decorative gradient.
4. Boundaries are deliberate: around a control, an overlay, a selected state or a major region — not around every wrapper.
5. Selection is white fill with black content plus the semantic state (`aria-pressed`, `aria-selected`). Focus stays separately visible.
6. Text meets 4.5:1 against its actual surface — for in-flight chrome, against the live scene behind its backing, measured. Necessary boundaries meet 3:1.
7. Opacity never grades text or disabled state.
8. A role means one thing.

Two more for a flight simulator:

9. **Caution, alarm and good are never carried by hue alone.** Each pairs with a word or a glyph (`HEAT 82%` gains a caution bar and the word; an alarm adds a shape), so a colour-blind player loses nothing.
10. **A number never moves while it is being read.** Tabular digits everywhere, fixed widths for values that change every frame, units beside their values, unit switches (m → km) at a stated threshold with hysteresis.

## 3. Brand layer

- **Name.** "Starship Simulator", in Inter Tight, uppercase-tracked only in the wordmark. No SpaceX logo, X mark or imitation of either; the About screen states it is an unofficial fan simulator.
- **Mark.** Text only for now. A drawn mark, if one comes, follows flight_sim's §2.1 discipline: one colour, geometry fixed once approved, generated assets with a `--check`.
- **Loading.** Real progress only (textures, fonts, the first simulated frame). No fake percentage. The first paint is static HTML that the app replaces without a jump.
- **Copy.** Words a player uses, not internal names: *Engines*, *Throttle*, *Attitude*, *Land*, *Boost back*, *Dump propellant*, *Reaction control*, *Fins* — never `TOGGLE-ALL`, `DUMPFUEL`, `R1`, `ATT-HOLD`. Sentence case except eyebrows and instrument abbreviations (V/S, H/S, Q, TWR), which the HUD's legend explains.

## 4. Tokens

flight_sim's portable tokens (`web/src/ui/tokens.css`) are vendored into `src/ui/kit/` in Phase 4 and used as they are: `ui-bg`, `ui-surface*`, `ui-fg`, `ui-muted`, `ui-dim`, `ui-disabled-fg`, `ui-line*`, `ui-selected`, `ui-on-selected`, `ui-danger`, `ui-warning`, `ui-success`, the motion durations and the z-layers.

Product tokens, owned here and not in the kit: the semantic flight roles (`flight-caution`, `flight-alarm`, `flight-good`, mapped to the kit's warning, danger and success), the plume and heat colours the HUD's thermal readout shares with the renderer, and the trajectory map's data colours.

## 5. Typography

Inter for the interface, Inter Tight for display (the wordmark, debrief headings, the large primary readouts), JetBrains Mono for measured values, units, shortcuts and terse status. This replaces the rebuild's Barlow Condensed broadcast look: Barlow's narrow uppercase made every label the same weight, which is the hierarchy problem the critique names first.

The primary flight readouts (altitude, vertical speed, speed) are the largest type on screen during flight. Nothing else competes with them.

## 6. Geometry and density

Zero radius. Targets are 32 px for a fine pointer and 44 px where any coarse pointer exists or gamepad navigation is latched; `any-pointer` decides density, viewport width decides layout. Touch text entry renders at 16 px or more.

## 7. Motion

flight_sim's principles hold: motion is decorative, interruptible, instant under reduced motion, cheap or absent. Tiers for this product:

| transition | duration | note |
|---|---|---|
| first load | 280 ms | the wordmark only |
| HUD power-up on a new flight | ≈ 0.6 s | readouts settle once; an airborne start shows the settled HUD |
| restart | 120 ms, step | never holds up the pilot |
| sheet / panel open | 220 ms | close 140 ms |
| press | 1 px / 50 ms | |

Never animate a readout's value (no counting up), and never animate layout during a flight.

## 8. Live-scene chrome

In-flight chrome — the HUD, the control groups, the timeline, the trajectory map, touch controls — sits on a square black backing translucent enough to keep the scene present and opaque enough for §2.6 against the brightest and darkest scene measured behind it: the daytime sky at the pad, the plume at full thrust, the plasma sheath on re-entry, the night sky. Strengthen a specific backing before dimming any text. Menus, the flight editor, settings, the black box and the debrief are opaque surfaces over a scrim.

## 9. The flight HUD

**Primary, always visible during flight:** altitude, vertical speed, speed, propellant, engine state with throttle, attitude (pitch and the flight-path marker). One cluster, large, tabular.

**Secondary, visible but quieter:** horizontal speed, mach, dynamic pressure, g, TWR, range to the pad (as *short / long*, never a signed number), mission clock and phase.

**Situational, appear only when they matter:** heating during re-entry, max-Q on ascent, a landing cue below 2 km on descent (time to impact and the altitude to start the burn), propellant low.

**Engine state is explicit.** With engines off the throttle reads *Off*, not `100 %`. Each engine shows lit, igniting, failed or off by shape as well as fill.

**Units** are SI, shown next to every value, switching m → km at 1 km and m/s → km/s at 1 km/s with hysteresis so a value near the threshold does not flicker.

## 10. Overlays and input

Dialogs, sheets, the menu and the black box use the kit's Radix-backed Dialog: focus moves in and returns, Escape closes the top layer first, the rest of the page is inert, and **the flight pauses while a menu or the black box is open**. Focus has one owner (the kit's `focus.css`). Keyboard, pointer, touch and gamepad reach every control; the kit's input layer decides which owns input at any moment (flight or interface).

## 11. Responsive

Reflow keeps every control and meaning at 390 px, 320 px and 200 % zoom. On a phone in portrait the primary flight cluster is a strip that no sheet ever covers; controls open in a sheet below it. In landscape the layout is the desktop's, compressed. Layout never depends on viewport width alone to decide density (§6).

## 12. Ownership and change

The vendored kit owns component behaviour and visual primitives and is not edited in place; a change goes to flight_sim first, then the kit is re-synced (`scripts/kit-drift.mjs` reports the difference). Product adapters own copy, state and simulation policy. A new primitive or exception updates this file, its tests and the design-contract scanner in the same change.
