# Information architecture

Where every surface lives and how a player reaches it. The look is [design-system.md](design-system.md); what is wrong today is [ux-critique.md](ux-critique.md).

## The flight screen

The default screen is the flight. Four zones, each with one job:

| zone | holds | rule |
|---|---|---|
| **Primary cluster** (bottom-centre on desktop; a strip above the controls on a phone) | altitude, vertical speed, speed, propellant, engines and throttle, attitude | always visible in flight; never covered |
| **Status bar** (top) | wordmark, scenario and phase, mission clock, *Pause*, *Menu* | one row at every width |
| **Controls** (left: *Engines*; right: *Flight*) | grouped by use, below | collapse to a single button each on a phone, opening a sheet under the primary strip |
| **Situational** (beside the primary cluster) | the landing cue, heating, max-Q, warnings, toasts | appear only when they matter; never stack more than two |

The secondary readouts (horizontal speed, mach, Q, g, TWR, range) live in an expandable row beneath the primary cluster, collapsed on a phone. The trajectory map is a corner card, folded by default on a phone. The onboard camera inset appears during re-entry only, in a fixed corner that does not collide with the status bar.

### Controls, grouped by how often they are used

- **Engines** — *Engines* (all on/off), the three engines individually (named *Engine 1–3*, shown as dots that read lit / igniting / failed / off), *Throttle* (a labelled slider with its value and *Off*), *Throttle guard* (the old Thrust Safe Guard, with a one-line explanation on hover or long-press).
- **Flight** — *Attitude* (the yoke, a labelled slider with its value in degrees), then the autopilot as one segmented choice: *Manual · Lift off · Boost back · Hold attitude · Land · Deorbit*. Exactly one is current, and the current one is named in the status bar.
- **Systems** (inside Flight, below a divider) — *Fins*, *Reaction control*, *Dump propellant* (with a confirm while it would leave less than the landing reserve).
- **View** (status bar overflow) — *Cinematic*, camera mode, zoom, *Hide HUD*, *Sound*.

## The menu

A modal that pauses the flight. Escape, the close button or the menu key closes it and resumes. Four tabs:

1. **Fly** — the scenarios as cards (name, one-line objective, the three numbers that define it), grouped *Ascent · Return · Re-entry · Landing · Orbit*. Choosing one starts it. "New in v2" style labels are gone.
2. **Flight setup** — the editor: altitude, distance from the pad, horizontal and vertical speed, pitch, propellant, wind, time of day. Each field shows its unit as a suffix that does not vanish, its valid range, and an error in words when out of range. *Start flight* and *Reset to scenario*.
3. **Settings** — sound (on/off, level), controls (keymap with rebinding, gamepad, tilt control with its permission button on iOS), display (reduced motion follows the system; HUD scale), *Random engine failures*, time warp as a stepped control labelled by its value (*1×, 2×, 4×, 8×, 16×*, and slow motion below 1×), *Restore defaults*.
4. **About** — what this is (an unofficial fan simulator), how the physics works in a paragraph with a link to the reference, credits, the guide (generated from the code tables, as today).

## Black Box

Opens over a paused flight (and after one ends). Channels named for a player: *Altitude*, *Downrange distance*, *Speed*, *Vertical speed*, *Propellant*, *Acceleration (g)*, *Pitch and flight path (°)*, *Throttle and controls*, *Dynamic pressure and heating*. Angles in degrees, unwrapped. One shared cursor reads every channel, positioned at the end of the flight when it opens so no legend says `--`. The previous flight is a ghost line, toggled. *Export CSV*.

## Debrief

Appears when a flight ends, beside the vehicle rather than over the controls. A heading that says what happened (*Landed*, *Crashed: too fast*, *Broke up: heating*), a grade, the figures that decided it against their limits (as today), the comparison with the previous attempt (*0.4 m/s softer*), and one line on what to try next. Actions: *Fly again*, *Black box*, *Change scenario*.

## First flight

On a fresh profile the intro lands itself, then hands over with a guided first flight on the launch pad, one step at a time, each step highlighting the control it names:

1. *Light the engines* — press **Engines** (or Space).
2. *Throttle up* — drag **Throttle** past 70 % (or W).
3. *You are climbing. Cut the engines* — at 500 m.
4. *Land it* — choose **Land** in the autopilot, or fly it yourself with the landing cue.

Skippable at every step, never shown again once finished or skipped, restorable from Settings. Each scenario card then carries a one-line objective, shown again as a dismissible toast when the scenario starts.

## Input

| action | key | gamepad |
|---|---|---|
| Pause / resume | P | Start |
| Menu (closes the top layer first) | Esc | Select / View |
| Engines on/off | Space | A |
| Throttle up / down | W / S | Right trigger / left trigger |
| Full / cut throttle | Z / X | — |
| Attitude | A / D, or ← / → | Left stick |
| Autopilot: land, boost back, hold | L, B, H | D-pad |
| Fins, reaction control | F, R | Shoulder buttons |
| Zoom | + / − | Right stick |
| Black box | K | — |

Control and Backspace are no longer bound. Every binding is rebindable in Settings; a key legend shows on the flight screen (toggle with ?).

## The 2021 controls, and where each now lives

| 2021 | now |
|---|---|
| R1, R2, R3 | Engines → Engine 1, 2, 3 |
| Toggle-All | Engines → *Engines* |
| Throttle slider | Engines → *Throttle* |
| Thrust Safe Guard | Engines → *Throttle guard* |
| Pitch slider (yoke) | Flight → *Attitude* |
| Lift-Off, Boost-Back, Att-Hold, Auto-Land | Flight → autopilot: *Lift off*, *Boost back*, *Hold attitude*, *Land* |
| Fins, RCS, DumpFuel | Flight → Systems: *Fins*, *Reaction control*, *Dump propellant* |
| Zoom in / out | View → zoom, + / − |
| Tilt Control | Settings → Controls → *Tilt control* |
| Random Failure | Settings → *Random engine failures* |
| Time Warp | Settings → *Time warp* |
| Scenario config | Menu → *Fly*, *Flight setup* |
| About, Help | Menu → *About* (guide included) |
| Black Box | Status bar overflow, K, and the debrief |
| Restart | Debrief → *Fly again*; status bar → *Restart* |

Every one keeps a working equivalent, which `tests/e2e/parity.spec.ts` enforces.

## Review

Prototypes of these surfaces, current against proposed, are published for Steve as a private review page: https://claude.ai/artifact/9rAusShWLCkpoHMhoVy5TR (source in [review/](review/), published 2026-10-01). His verdict, when it arrives, is folded in as a scope change to Phase 4 or 8.
