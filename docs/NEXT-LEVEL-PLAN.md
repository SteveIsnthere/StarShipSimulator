# M11 — Next level: physics and graphics pushed on the evidence

> **Status:** approved by owner 2026-08-31 ("Go"). Live task state is `docs/ROADMAP-TASKS.md`
> (M11.1–M11.9). Every physics task here is Fidelity tier and moves the golden digests; the
> owner's approval of this plan is the say-so each commit names.

## Why this milestone, and what was measured first

M10 established that the physics is *correct* — agreeing with closed-form laws and published
reference data to the precision the references are printed at. This milestone asks a different
question: where is it *simplified*, and where is the picture *flat*, and which of those gaps are
worth closing. Nothing here was planned from a guess; each item below was measured or read out
of the code on 2026-08-31, and two assumptions were retired by that survey (pad dust and the
transonic cone already exist).

### The integrator, measured

A 600 s vacuum coast from a 300 km circular orbit, stepping the real `step()`:

| dt | steps | ΔE/E | Δh/h | Δaltitude | cost |
|---|---|---|---|---|---|
| 1/60 | 36 000 | −2.681e-7 | −1.343e-7 | −94.6 m | 9.6 µs/step |
| 1/120 | 72 000 | −2.684e-7 | −1.342e-7 | −47.4 m | 3.4 µs/step |
| 1/240 | 144 000 | −2.684e-7 | −1.342e-7 | −23.8 m | 2.9 µs/step |
| 1/480 | 288 000 | −2.684e-7 | −1.342e-7 | −12.0 m | 2.9 µs/step |

Two things are true at once. **Energy and angular momentum do not depend on dt**, so their drift
is not truncation error — and it is drag: repeating at 800 km (ρ = 1.2e-14) gives ΔE/E =
+4.7e-11, and at 1500 km +2.2e-10. The integrator conserves energy to a part in 10¹⁰ over
72 000 steps. **Altitude drift halves every time dt halves.** That is a first-order phase error,
and the pair together is the signature of a symplectic Euler: bounded energy, position off by
O(dt). Cost is 3 µs against a 1 ms budget — three hundred times the headroom.

So the obvious upgrade is the wrong one. RK4 sharpens position and is *not* symplectic; over an
orbit it would leak the energy the current scheme keeps. The right scheme is second-order
symplectic — velocity Verlet — which keeps the conservation and removes the linear drift.

### The rest of the physics survey

| gap | evidence | tier |
|---|---|---|
| Thrust and Isp constant with altitude | `maxThrustPerRaptor` flat at 2.2 MN, fuel flow flat at 650 kg/s (implying 345 s). Public Raptor 2 sea-level-nozzle figures: 230 tf at 327 s on the pad, 350 s in vacuum — so **+7.0%** thrust with constant mass flow, not the +12% first written here (see below). | Fidelity |
| Wind is dead state | `WorldState.wind` and `.gust` exist, initialise to 0, and are read by **nothing**. Aero uses groundspeed. | Fidelity, but bit-identical at wind = 0 |
| Centre of mass fixed | 350 t of the 470 t gross is propellant (74%); every `…DistanceFromCenterOfMass` is a constant. | Fidelity, needs stated tank geometry |
| Cd is one scalar of Mach, attitude-blind | `0.1347·M + 1.153`, capped 2.5 at M ≥ 10. No transonic peak; hypersonic rising where it should plateau. `heatLimit` was calibrated against this Cd. | Fidelity, **decision open** |
| Earth rotation absent | ≈ 418 m/s at StarBase latitude, 5% of orbital velocity. | Fidelity, architectural, **decision open** |
| Thermal coefficient 10× | unresolved since M9.4 | **decision open** |

### The graphics survey

There is no lighting model: zero references to a sun, shading or a shadow anywhere in `view/`.
`GRAPHICS-PLAN.md` § 4 said "3D, a new renderer, or lighting — not this milestone, possibly not
ever." The owner has revisited that: a sun is in scope. It is the single input that unlocks
ground shadows, attitude shading, a terminator on the far earth, sky colour by elevation, dawn
launches and the plume as a light source — and it is achievable in 2D with a directional light
in a fragment shader against a generated normal map. No renderer change.

| gap | evidence |
|---|---|
| Re-entry reads small and dotted | at 80 km the vehicle is a few pixels; the plasma is a particle trail. `thermalPower` and `angleOfAttack` are both in SimState and nothing draws a sheath from them. |
| Vehicle is a flat 2021 PNG | one sprite plus drawn fins; no tint, alpha or filter. |
| Sky is 2021's linear darken | 20 → 80 km, squared per channel, four hue stops. |
| CINEMATIC only hides the HUD | `App.svelte:720`; the camera is untouched. |
| Stars are 220 seeded randoms | no catalogue. |
| Particles at 18% of pool | peak 731 of 4000; WebGPU preference already plumbed. Not a bottleneck. |

First-load budget: 204.0 kB of 250 kB. Everything here is shaders and generated textures.

## Owner decisions binding this milestone

1. **Lighting is in scope.** `GRAPHICS-PLAN.md` § 4's "possibly not ever" is retired.
2. **Generated art is in scope; new PNG assets are not.** The normal map is generated from the
   existing sprite's silhouette, so the asset budget does not move.
3. **Every physics change is Fidelity tier**, approved here, named in each commit, goldens
   regenerated with the before/after trajectory diff and the audit table extended.
4. **Three decisions are recorded as open and NOT implemented**: the Cd shape, the thermal
   coefficient, and Earth rotation. Each needs a specific answer, not a general go.

## Phases

### M11.1 — Wind, wired
`airspeed = groundspeed − wind − gust`, applied where aero reads speed. **Proof obligation:** at
wind = 0 the step is bit-identical to today (all seven goldens unmoved), so the wiring itself
moves nothing; a scenario with wind is added and its golden recorded. Verified by the gate.

### M11.2 — Thrust and Isp with altitude
`thrust = T_vac − p_ambient · A_eff`, with a constant mass flow, anchored on the public Isp pair.
Goldens move; the before/after diff is in the commit. Verified by the gate and by an ascent
gaining thrust with altitude in a test.

**A correction to this plan, found while building it.** The survey above first quoted +12% from
"2.53 MN vac". That is 258 tf, which is **RVac** — a different engine with a much larger bell.
A sea-level Raptor 2 in vacuum is ≈246 tf at 350 s. The physics exposed the mistake: anchoring
on RVac implies an effective exit area of 2.71 m² for a nozzle whose geometric exit area is
1.33 m², which is not a nozzle; anchoring on the Isp pair (327 → 350 s) with constant mass flow
gives 1.57 m², within 18% of the geometry, which is what a mildly overexpanded sea-level bell
should give. The gain is 7.0%. The mass flow moves from 650 to 703 kg/s (the old figure implied
345 s at 2.2 MN, too high for a sea-level Isp), so burns consume 8% more per second.

### M11.3 — Velocity Verlet
Second-order symplectic. **Proof obligation:** repeat the coast table above — altitude drift must
fall as dt², energy conservation must not degrade below today's 1e-10. Goldens move. The step
order comment in `step.ts` is rewritten to describe the new contract.

**A correction to this plan, found while building it.** The coast table above is a circular
orbit, and a circular orbit is a fixed point of the polar scheme: with v_r = 0 the radial
acceleration is exactly zero and nothing moves, so the "part in 10¹⁰" it reported was not the
integrator's energy behaviour at all, and the altitude drift it showed was the 1e-11 kg/m³
of thermosphere at 300 km acting through a first-order velocity update. On an eccentric vacuum
orbit the old scheme was first order in energy too (2e-6 at 1/120). The proof obligation was
therefore met against Kepler's closed form on a 1500 km ellipse — `tests/core/verlet.test.ts`
— where the position error ratio between rate halvings is 4.0 (Euler: 2.0) and the energy
error 7e-13 at 1/120. The circular table is repeated as well, and is a centimetre at every
rate.

### M11.4 — The sun
A sun elevation derived in `view/` from scenario and `environmentTime` — core stays pure. Sky
gradient keyed on elevation; a generated normal map for the vehicle sprite lit by direction;
ground shadow; far-earth terminator. Verified by the pixel harness: the lit and unlit sides of
the vehicle differ in luma by a stated margin, and the shadow moves with the sun.

**Found while building it.** (1) The 2021 sprite has its light baked in — right flank bright,
left dark — so a normal map alone would double the shading on one side and fight it on the other.
The lighting pass measures the baked profile across the straight hull and stores its reciprocal
as a per-texel gain, so the shader relights albedo; that is what makes the afternoon frame (left
flank lit) provable. (2) "Ground shadow" cannot be an ellipse on the ground in the shipped
framing: the camera's floor keeps the eye at ground height, the ground is edge-on, and a shadow
lying on it is a streak on the horizon line — which is what is drawn, with its geometry intact
for the camera that will look down on it (M11.6). (3) Longitude is measured from StarBase, not
from x = 0, which is where the pig is; the intro's first sun frame was midnight.

### M11.5 — Re-entry: the sheath and the onboard camera
A plasma sheath shader wrapping the windward side, driven by `thermalPower` and `angleOfAttack`;
an inset onboard view so the vehicle is legible at re-entry scale while the main view keeps the
world. Verified by the pixel harness on the re-entry preset.

### M11.6 — Camera modes
Ground-tracking (the webcast pad camera: the vehicle rises away, the camera pans up), chase,
onboard. Built on the existing follow law and its five properties. CINEMATIC gains a mode
selector. Verified by the camera property tests extended to every mode.

### M11.7 — Real stars
The ~300 brightest stars from a catalogue, positioned by right ascension and declination for the
launch site, replacing the 220 randoms. Verified by a test that the recognisable asterisms are
where they should be.

### M11.8 — Centre of mass
CoM as a function of propellant mass under a stated tank layout; moment arms derived from it.
Goldens move. Verified by the gate and by the flip test's torque changing as propellant drains.

### M11.9 — Ship
Perf and budget re-measured, screenshots regenerated, `docs/` and the audit table current, the
full gate green on all five projects.

## The gate for this milestone

Physics tasks (M11.1–M11.3, M11.8): `npm run lint && npm run test && npm run build && npm run
coverage`, plus the task's proof obligation, plus goldens regenerated in the same commit. View
tasks (M11.4–M11.7): the same, plus `npx playwright test` on all five projects, because they
change what is on screen. M11.9: everything. Stated here rather than decided task by task, so no
commit skips a browser run silently.

## Risks

- **Every physics phase moves the goldens.** That is the plan working, not failing; the risk is a
  movement that is not the one the change justifies. The before/after diff in each commit is the
  control, and the audit table gets a row per phase.
- **The sun changes the look of every existing screenshot.** They are regenerated at M11.9, and
  the pixel-harness assertions from M9 are re-derived rather than loosened.
- **Verlet changes the step order, which is a documented contract.** The comment is rewritten,
  not deleted, and the new order is stated with the same precision the old one was.
- **The soul.** The intro auto-landing sequence, the presets and the pig are unchanged. The sun
  defaults to the elevation that reproduces today's daylight look on the intro.
