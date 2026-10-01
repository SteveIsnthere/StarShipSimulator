# UX critique — the interface as it is

Walked on 2026-10-01 against the production build at 1280×720, 1024×768 and 390×844 (phone, 2×). Screenshots: [screenshots/critique/](screenshots/critique/). The bar is flight_sim: a precise instrument, legible under pressure, nothing on screen that the moment does not need.

**The one-line verdict.** The simulation underneath is serious and the world is beautiful; the chrome on top of it is a developer's control panel. Everything is the same 11 px uppercase weight in the same hairline box, so nothing tells the player where to look or what to press.

## The first ten seconds

*What the player is trying to do:* understand what this is and what to press.

- The intro is flying itself, but the screen does not say so in a way that lands: a hint card in the middle of the vehicle says "**All Raptors** lights the engines, then push **Thrust**" — neither label exists on screen (they are `TOGGLE-ALL` and an unlabelled slider). The desktop copy prefixes "IT IS FLYING ITSELF", which reads as a status, not an invitation.
- Thirty-odd controls are visible at once around the vehicle (engines, yoke, autopilot, utilities, zoom, cinematic, sound, black box, menu), all equal weight. A first-time player cannot tell the throttle from the zoom.
- **The one change:** a guided first flight that names one control at a time, with the control itself highlighted, and a chrome that starts minimal and reveals the rest when the player asks.

## The HUD in flight

*What the player is trying to do:* read altitude, speed and vertical speed, and know whether they are going to land.

- Primary flight data is split across three styles: dials for speed and altitude, a text strip for V/S, H/S, TWR, G, THR, MACH, Q, HEAT, RANGE, and bars for propellant. The number that decides a landing — vertical speed — is the smallest thing on screen.
- `FS 200 M/S` and `FS 1 KM` under the dials (full scale) are cryptic. `THR 100 %` shows with every engine off and `TWR 0.0`; there is no engines-off state. `RANGE -1943.4 KM` is signed where the debrief says "short / long".
- Configuring the Re-entry preset from the menu labels the flight "CUSTOM".
- **The one change:** one primary cluster — altitude, vertical speed, speed — in large tabular type with a landing-cue (time to impact, suicide-burn altitude) beside it; everything else secondary and hidden until relevant.

## Controls

- Developer labels: `R1 R2 R3`, `TOGGLE-ALL`, `DUMPFUEL`, `THRUST SAFE GUARD`, `ATT-HOLD`, `LIFT-OFF`. The throttle and the yoke are bare range inputs with no visible label or value.
- Autopilot modes and utilities sit in the same grid as each other and look like the engine buttons.
- **The one change:** group by use — Engines (lit count, throttle with its value), Attitude, Autopilot (one mode at a time, its state named), Systems — with words a player uses.

## Menu and flight editor

- One long screen does four jobs: scenarios, the flight editor, time warp, and (below the fold) settings and about. "ORBITAL · NEW IN V2" leaks development history.
- The editor's eight boxes carry their units only as placeholders (`M`, `M/S`, `DEG`), which vanish on typing; no ranges, no validation, no preview. "X-POSITION", "SPEED-X" are internal names.
- Time warp is a button whose label is its state ("Speed Things Up" / "Slow Things Down").
- Escape does not close it, focus is not trapped, the simulation keeps running underneath, and there is no pause.
- **The one change:** a tabbed menu (Fly · Flight setup · Settings · About) as a real modal that pauses the flight, with validated fields that show units and limits.

## Debrief

The strongest surface: each figure is judged against the limit that decided it. It covers the controls behind it, shows `0 %` heat as "of limit", has no grade and no comparison with the last attempt, and its buttons sit flush against its lower edge.

## Black Box

Stock chart styling with 2021 channel names ("PROPELLENT IN TONS", "CONTROLINPUT", "FLYPATH", `speedX (last)`), angles in radians with full-height ±π wrap spikes, axis labels colliding with tick labels, and every legend value reading `--` until hover. **The one change:** instrument-grade channels — human names, degrees, unwrapped angles, a shared cursor that reads out on load.

## Phone

- The top bar wraps to two rows; the onboard inset floats between them.
- Opening Engines covers the bottom third — speed, altitude and vertical speed disappear while the player throttles, which is exactly when they are needed.
- The hint card covers the vehicle.
- **The one change:** a flight-data strip that is never covered, and controls in a sheet that sits below it.

## Input

The 2021 keymap: Control steps the throttle (a browser modifier), Backspace triggers boost-back, Space toggles every engine with no guard. No pause key, no Escape, no gamepad, no rebinding, no on-screen key legend.

## What to keep

The world rendering (sky by sun elevation, real stars, plasma sheath, the depth layers), the framework-free HUD binder, tabular digits everywhere, measured contrast on the scrim, reduced-motion handling, the debrief's judging model, help text generated from code tables.
