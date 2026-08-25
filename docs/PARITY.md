# Parity sweep — v2 against the 2021 build

M4.6. Every user-facing behaviour of the 2021 tree, checked against v2.

The list was not written from memory. It is every `onclick` handler in
`index.html`, every function in `backend/utilities/switches.js` and
`backend/utilities/tools.js`, every readout in `displayComponents/dispUpdate.js`,
and every plot in `backend/utilities/plotting.js`. Where v2 differs, the
difference is stated and justified — "not ported" without a reason is not an
entry in this table.

Since M5.4 those paths are relative to `v2/tests/fixtures/legacy/`, where the
2021 tree is kept frozen. The line citations throughout this document only mean
something while those lines exist, which is one of the reasons the whole tree was
kept rather than only the four files the parity tests execute.

`tests/e2e/parity.spec.ts` is the machine-checkable half: it asserts every
control below is present and behaves.

---

## Flight controls

| 2021 | v2 | Notes |
|---|---|---|
| `toggleRaptor1/2/3` | ✅ R1 / R2 / R3 | Three copies of one function became one parameterised command. Lit during the ignition countdown, which 2021 was not. |
| `toggleAllRaptors` | ✅ Toggle-All | 2021's asymmetry preserved: with any engine running it shuts down only the running ones. |
| `throttleControl` slider | ✅ | Limits moved from the element's `min`/`max` into core, so they now hold for the keyboard too (M4.3). |
| `pitchControl` slider | ✅ | Grab suspends attitude hold; release adopts the current attitude. |
| `toggleFin` | ✅ Fins | |
| `toggleRcs` | ✅ RCS | |
| `toggleDumpFuel` | ✅ DumpFuel | |
| `toggleautoMaxThrust` | ✅ Thrust Safe Guard | |
| `toggleautoTakeOff` | ✅ Lift-Off | |
| `toggleBoostBack` | ✅ Boost-Back | |
| `togglePitchHold` | ✅ Att-Hold | |
| `toggleAutoLand` | ✅ Auto-Land | |
| — | ➕ **Deorbit** | New in v2 (M2.9(c), M2.13). No 2021 counterpart: the relief term was clamped at g, so orbit was structurally impossible and there was nothing to come home from. Holds retrograde, times the burn from a conic prediction of its own coast, cuts off when the range still to run matches the distance still to fly, hands over to Auto-Land. Lands within a few km of the pad from a 150 km orbit. |
| `zoomIn` / `zoomOut` | ✅ | Asymmetric 1.5/0.75 steps and the `* 0.85` limit guard kept, so the feel is unchanged. |
| `show_controlsL` / `show_controlsR` | ✅ | Panels collapse. Hidden, not unmounted — the indicator binder holds their nodes. |

## Keybinds — `utilities/eventListener.js`

| Keys | 2021 | v2 |
|---|---|---|
| A / ArrowLeft, D / ArrowRight | pitch | ✅ |
| W / ArrowUp / Shift, S / ArrowDown / Control | throttle ±10 | ✅ **now clamped** — see below |
| Z / X | throttle to max / min | ✅ |
| T | attitude hold | ✅ |
| Space | all Raptors | ✅ (`preventDefault`, which 2021 did not need) |
| 1 / 2 / 3 | one Raptor | ✅ |
| F / R | fins / RCS | ✅ |
| Backspace | boost-back | ✅ (`preventDefault`) |
| = / - | zoom | ✅ |
| keyup on A/D/arrows | centre yoke, adopt attitude | ✅ |
| all keys suppressed while the menu is open | ✅ | ✅ — extended to the black box and the guide |

**The one behavioural difference, and it is a fix.** `throttle += 10` had no
clamp in 2021: the engine limits lived on the slider element, so they applied to
dragging the slider and to nothing else. Eleven presses of W left the commanded
throttle at 210%, which the thrust model multiplied straight through. v2 routes
every key through the same core command as the buttons, so it inherits the same
clamp. Covered by a unit test and an e2e.

## Tilt — `tools.js:101`

| 2021 | v2 | Notes |
|---|---|---|
| ×2.4 gain, ±100 clamp | ✅ | Full deflection at 42°, unchanged. |
| ignored while manual control is on | ✅ | |
| `window.orientation` | ⚠️ `screen.orientation.angle` | The 2021 API is deprecated and gone from some browsers. Same four values, same branch structure. |
| `toggleTiltControl` | ✅ | In the menu, on by default as `tiltControlOn = true` was. |
| `requestTiltPermissionBtn` | ❌ not ported | iOS 13+ permission prompt. v2 attaches the listener directly; on a device that requires the prompt, tilt is inert rather than broken. Worth revisiting if anyone plays on iOS. |

## HUD — `displayComponents/dispUpdate.js`

| 2021 readout | v2 | Notes |
|---|---|---|
| altitude, speed (unit switch at 1000) | ✅ | Same switch, same asymmetric comparisons. |
| propellant, TWR, speedX, speedY, G, distance to site | ✅ | G still pinned to exactly 1 on the ground. |
| `show_hideFlightParamDispMid` | ✅ | Collapses everything but altitude and speed. |
| — | ➕ throttle, pitch, Mach, dynamic pressure, heat | Five readouts 2021 computed but never showed. |
| refresh rate | ⬆️ 12 Hz → 120 Hz | 2021 gated the whole block on `updatedFrameCount % 5`. The binder resolves once and diffs, so the faster rate costs less (M4.1). |

## Menu — `index.html:145`

| 2021 | v2 | Notes |
|---|---|---|
| Time warp: state toggle + 1..9 slider | ✅ | Speeding up runs more steps; slowing down feeds the accumulator less real time. dt is never scaled, which 2021's `renderTimeInterval` division did. |
| Scenario presets | ⚠️ **five, not six** | The About text and the in-game copy both say six. `index.html` ships **five** `configScenarioPreset` buttons: Booster Sep, RTLS, Re-entry, Before Flip, Landing Burn. v2 ports the five that exist and does not invent a sixth. |
| — | ➕ two orbital presets | Circularize and Deorbit Burn (M2.9). Separated in the UI because they need the planet-centered gravity flag to behave as their names suggest. |
| Six editor fields + Clear + Configure | ✅ | Per-field "empty means leave it alone" preserved; a preset fills the form rather than flying it. |
| `toggleRandomFaliure` | ✅ | **Was inert in the v2 port until M4.4** — the field existed, the roll ignored it. Fixed under Bug-fix tier. |
| `toggleTiltControl` | ✅ | |
| `restart` | ✅ | Appears on landing, crash, break-up or fuel exhaustion — the same four conditions. Shares its implementation with Configure; 2021 had two paths that disagreed. |
| About / Help | ✅ | |

## Black box — `backend/utilities/plotting.js`

All nine plots, all 19 channels, same titles and groupings.

| 2021 | v2 | Notes |
|---|---|---|
| Plotly from `cdn.plot.ly`, every page load | ✅ uPlot, dynamic import | ~3.5 MB on the critical path became ~45 kB fetched on first open. An e2e asserts no chart code and no third-party origin in the first load. |
| sample every 5 frames, not while the flight is over | ✅ | Keyed off `updatedFrameCount`, sampled per **step** — a v2 frame is many steps, so per-frame sampling would record a different flight at a different frame rate. |
| x-axis in warped frames | ⚠️ simulated seconds | 2021 added `timeAccel * recordTimeInterval`, so the same flight got a different time axis at a different warp setting. |
| propellant converted at plot time | ⚠️ converted at record time | 2021 rebuilt a scaled copy of the array every time the view opened. |

## Guide and About — `index.html:248`, `:330`

| 2021 | v2 | Notes |
|---|---|---|
| Basics, Keybinds, KSP note | ✅ | |
| Version / What's New / GitHub | ✅ | Rewritten for v2 rather than copied — the 2021 changelog describes the 2021 release. |
| keybind list as hand-written prose | ⚠️ generated from `KEY_BINDINGS` | 2021's had already drifted from the code: the guide says "+ or -" where the binding is "=" and "-", and it says A pitches *down* where the code sends -100. A help screen that can lie is worse than none. |

## Not ported, deliberately

| 2021 | Why not |
|---|---|
| Welcome screen (`startRunningGame`) | Already commented out in `index.html`. The intro auto-landing demo it gated is ported and is what you see on load. |
| `requestTiltPermissionBtn` | See Tilt above. |
| `isIOSPWA()` | Detected the standalone display mode and did nothing with the result. |
| Hideable-panel toggle buttons at the screen corners | The two commented-out `show_hidecontrolsL/R` buttons in `index.html`. The collapse behaviour they would have driven is ported; the duplicate buttons are not. |
| PWA install manifest | Not dropped — moved to M5.1, which owns offline support. |

## Is any of it realistic?

A separate question from parity, and asked separately: `tests/core/physical-scale.test.ts`
converts the simulation's own units into ones that mean something and checks
them against the physical world. The short answer, all of it measured:

| | model | reality |
|---|---|---|
| thermal unit | 951.6 W/m² | Sutton-Graves in SI, scaled — so ≈ kW/m² |
| `heatLimit` = 389 | 37 W/cm² | Shuttle nose peaked ~45-70 W/cm² on entry |
| 2021's `heatLimit` = 55 | 5 W/cm² | nothing is built that fragile — the recalibration was derived from 2021's own margin and landed here independently |
| re-entry peak, 246 units | 23 W/cm² | a low-orbit entry |
| `dynamicPressureLimit` = 50 | 50 kPa | launch vehicles fly max-q at 30-35 kPa (2021's JSDoc says psi; it is not) |

**Declared display fix, M6.2: the Q readout is labelled kPa.** 2021 printed
`PSI` beside this number on screen (dispUpdate.js) and it was never psi — the
two independent arguments are in the row above and in `$hud/readouts`: the limit
is 50 and vehicles fly max-q at 30–35, which is kPa (50 psi is 345 kPa, five
times anything a vehicle sees), and the value is `0.5·rho·v²` in SI over a
millesimal, which lands in kPa. Keeping the old label would have meant printing
a unit we had already proved wrong. **Nothing in `core` changed**: same number,
same physics, and the seven golden digests do not move. Only the three letters
under it do.
| GM | 3.986e14 | Earth's |
| escape velocity | 11.16 km/s | Earth 11.19 |
| 150 km orbit | 7800 m/s, 88 min | Earth 7814 m/s, 87.5 min |
| implied Isp | 345 s | Raptor 330 sl / 380 vac |
| lift-off TWR | 1.43 | |
| ΔV budget | 4.6 km/s | a landing ship's |
| RCS authority | 0.16 rad/s², 9 s to flip | 25 s of reserve — two flips, so it is a resource |

## Physics differences

Every one is a declared tier with its evidence in the commit that made it.

**Bug fix:** the pitch-rate frame-rate dependency (M2.4), the nose-radius unit
error in the heating correlation (M2.2), the un-called upper stratosphere and
its mistranscribed lapse rate (M2.1), the fin-fraction initialisation (M2.3),
the wall-clock ignition timer (M1.4), the unclamped keyboard throttle (M4.3),
the inert random-failure toggle (M4.4), the autopilot's proportional RCS command
being overwritten before it could take effect (M2.11), and the doubled
tangential acceleration term that destroyed angular momentum whenever the
vehicle climbed or fell (M2.12).

**Fidelity, and shipped unconditionally since M2.10** — the owner's decision,
recorded in CLAUDE.md: planet-centered gravity (M2.6), the local speed of sound
(M2.7), the full ISA (M2.8), a real thermosphere above it (M2.14) and the
collapsed trig ladders (M1.9). There is no flag machinery: the fidelity physics
is the only physics, and the 2021 model survives only as the frozen parity
reference the tests execute.

So the parity claim is precise rather than absolute:

> v2 is 2021, except for exactly five declared departures — gravity, speed of
> sound, atmosphere, trig, and the heating correlation's argument.

`tests/parity/step.test.ts` is where that claim is enforced. It steps both loops
from a common state and compares every field 2021 had: the ~35 retained fields
must match (three of them differ at the last bit, from the `X * dt` vs
`X / renderTimeInterval` substitution, and only those three), and every departed
field is pinned to the exact expression that replaced it rather than merely
excused. A separate free-running run over thousands of steps checks the control
chain — fuel, mass, throttle and gimbal slew, the RCS budget, the fuel-out
branch — still tracks 2021 exactly.

`heatLimit` is the sixth departure, and the only constant in
`core/constants.ts` that deliberately holds a value 2021 did not: **390 where
2021 had 55** (M2.9(a), Bug fix). The old number was tuned against a model that
understated density (M2.1) and expressed heating in units that came from passing
an area where the correlation wanted a radius (M2.2) — so it indexed a quantity
that no longer exists. The owner's rule was to preserve the *margin*, not the
number, and `tests/parity/heat-margin.test.ts` re-derives it on every run by
flying the Re-entry preset on both implementations: the frozen 2021 tree peaks
at 34.74 units against its limit of 55 (0.6317 of it), v2 peaks at 247.49, and
390 is that ratio rounded down so v2 never gets more headroom than 2021 had.
