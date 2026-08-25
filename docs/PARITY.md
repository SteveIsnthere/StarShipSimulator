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

## Physics differences

Every one is a declared tier with its evidence in the commit that made it. The
short list: the pitch-rate frame-rate dependency (M2.4), the nose-radius unit
error in the heating correlation (M2.2), the unclamped keyboard throttle
(M4.3), and the inert random-failure toggle (M4.4) — all Bug fix. Planet-centered
gravity, real speed of sound, full ISA and the collapsed trig ladders are Fidelity,
**all off by default**
pending the owner's decision in M2.10.

`heatLimit` is the open one: it was tuned against a model that understated both
density and heating, and with those fixed the Re-entry preset breaks up. Flagged
at M2.1 and M2.2, still awaiting a decision.
