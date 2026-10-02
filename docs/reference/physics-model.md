# Physics model

How `src/core` simulates a flight. The code is the source of truth. Paths are relative to
`src/core/`; `C:` means `constants.ts`.

`step(state, dt, input)` (`step.ts:227`) is pure: it clones the state, reads no clock, DOM or
global, and returns a new `SimState`. The app steps at a fixed `DT = 1/120 s`
(`app/loop.ts:28`); warp runs more steps per frame and never scales `dt`.

## State and frame

The planet is Earth as a non-rotating sphere: R = 6 371 000 m, the IUGG mean radius
(`constants.ts`, `planetRadius`), and GM = 3.986004418e14 m³/s², IERS 2010 / WGS 84
(`planetGravitationalParameter`), one cited constant rather than G × M. The pull at the surface
is 9.820 m/s², above g₀ = 9.80665 because g₀ is read on a rotating Earth. The vehicle is a
point with one rotational degree of freedom, in a local frame:

| field | meaning, sign |
|---|---|
| `altitude` | m above the surface, up + |
| `downRangeDistance` | m along track, downrange +; StarBase at half a circumference (`C:74`); wraps at the surface circumference |
| `speedX` / `speedY` | tangential (downrange +) / radial (up +), m/s |
| `pitch` | rad from local vertical: 0 nose up, +π/2 prograde, −π/2 retrograde; wrapped to (−π, π] |
| `angleOfMotion` | `atan2(speedX, speedY)`, measured from vertical (`physics/aero.ts:113`) |

Angle of attack is pitch minus the relative-wind angle, wrapped; `angleInToTheWind` folds the
rear half onto the front (`aero.ts:157`). Pressure is in kPa, temperature in °C, controls in %.
Angles are branded `Rad`/`Deg` types (`units.ts`).

Two polar correction terms make the local frame exact for a central force:

- vertical `v_t²/r − GM/r²` (`verticalGravityAcceleration`): centrifugal plus gravity, cancelling at circular speed;
- tangential `−v_r·v_t/r` (`tangentialAcceleration`): conserves angular momentum `r·v_t`.

**The ground frame can turn** (Phase 6, Task 9). Speeds are ground-relative; with the frame turning
at ω the inertial tangential speed is `v_t + ω·r` (`inertialTangentialSpeed`, and its inverse
`groundTangentialSpeed`), and the two terms gain the Coriolis and centrifugal parts:
`a_r += 2ω·v_t + ω²·r`, `a_t −= 2ω·v_r`. `step()`, felt g and the guidance predictors all read
these functions, so one rate (`C.frameRotationRate`) moves them together. **The rate is 0**:
Earth's, `C.EARTH_FRAME_ROTATION_RATE` = 7.292115e-5 · cos 26° rad/s (WGS 84; Starbase heading
due east, 417.6 m/s at the pad), remains parked with Phase 6b’s physical entry model. At 0
every term short-circuits to the inertial expression on the same operands, signed zeros included.

## Step order

Order is a contract; several phases read what the previous one wrote.

| # | phase | contents |
|---|---|---|
| 0 | airspeed | relative airspeed from the incoming speeds, before a crash can zero them |
| 1 | environment | atmosphere at the current altitude |
| 2 | status | collision, fuel-out; propellant burn and dump; fuel-out shutdown; ignition countdowns |
| 3a | params | fin fractions, max area, cross-section (previous `angleInToTheWind`), angles, gimbal direction, heat, q, pitch rate, TWR, drag (Cd from previous Mach), lift, thrust at ambient pressure |
| 3b | translation | current vertical support and felt g from specific force; Verlet; radius refreshed after position; `trueSpeed`, Mach |
| 3c | rotation | mass properties for this load; Verlet rotation with all torques |
| 4 | controls | autopilot, then manual input (overrides), then fins/RCS/gimbal, then throttle slew |
| 4b | failure | current pressure, skin temperature and felt g; shutdown cancels pending ignition |
| 5 | clocks | `environmentTime`; `timeSpent` only while flying |

Phase 6b Task 5 makes breakup read the current step’s forces and ground support read current vertical specific force. Collision still shuts down before fuel use. A scenario’s first step uses spawn Mach against local speed of sound and relative wind.

## Integrator

Velocity Verlet (`step.ts:340–537`):

1. Drag, lift and thrust accelerations are computed once from the incoming state and **held for
   the step**.
2. `a_n` = those + gravity and polar terms at `r_n, v_n`.
3. `x_{n+1} = x_n + v_n·dt + a_n·dt²/2`.
4. `a_{n+1}` = held terms + gravity at `r_{n+1}` + polar terms at `r_{n+1}` with the predicted
   velocity `v_n + a_n·dt`.
5. `v_{n+1} = v_n + (a_n + a_{n+1})·dt/2`; the stored acceleration is `a_{n+1}`.

Second order in gravity, first order in drag. Rotation has the same form with `α_n` the angular
acceleration stored by the previous step; angular damping reads the predicted `ω_n + α_n·dt`.
**Ground hold** (`step.ts:387`): on the ground, landed or crashed with net vertical acceleration
≤ 0, all accelerations and rotation are zero, so the pad reads 1 g. On a 1500 km vacuum ellipse
the position error quarters per dt halving and energy error is 7e-13 at 1/120
(`tests/core/verlet.test.ts`).

## Gravity

Inverse-square from GM. `C.gravity = 9.807` is never applied as a force; it is a unit for the TWR
display, plus an add/subtract pair that cancels (`getVerticalAcceleration`). Felt g subtracts the
simulation’s gravity and polar terms by reading the current specific-force decomposition, then divides by g₀ (`standardGravity`). Ground support supplies the opposing gravity/polar force. The g-limit judges this current felt g at the end of controls.
`coastDownrangeDistance` gives a drag-free conic's downrange arc by Simpson's rule (64 intervals),
from the ground-relative speed: the inertial arc less `ω·∫r dt` (`dt = r²/h dν` on the conic);
`Infinity` if the orbit never reaches the target radius, 0 for a radial fall. `verticalWeight(r)`
is what a vehicle with no downrange speed weighs: gravity less the turning ground's `ω²r`.

## Atmosphere

`physics/isa.ts`. R = 287.053 J/(kg·K), T₀ = 288.15 K, P₀ = 101 325 Pa (`C:240`, shared with the
thrust anchors), g₀ = 9.80665 (`C:227`, shared with Isp).

- **To 86 km:** US Standard Atmosphere 1976, seven lapse-rate layers (`isa.ts:65`), base pressures
  integrated upward so layers join exactly, against geopotential altitude `r₀·h/(r₀+h)` with the
  standard's r₀ = 6 356 766 m (its eq. 18), not the planet's radius, so 86 km is the table's top.
- **Above 86 km:** 20 exponential bands with transcribed scale heights (`isa.ts:164`) and densities
  chained from the ISA's 86 km value, so the seam is continuous; the first band's 5.44 km is
  derived to hit the table's 100 km density. Temperature is the 1976 standard's kinetic
  temperature (eqs. 25–30): isothermal 186.87 K to 91 km, an elliptical rise to 240 K at 110 km,
  12 K/km to 360 K at 120 km, then an exponential approach to 1000 K. Density never reads it;
  pressure is recovered from density by the ideal gas law, and the Mach number is its only
  consumer.
- **Speed of sound:** `√(1.4 · 287.053 · T)` (`physics/atmosphere.ts:68`), also for a scenario's
  starting Mach (`scenarios.ts:321`), so the first step's drag reads the same air as every
  later one.

Density: 1.225 kg/m³ at 0, 1.0e-3 at 50 km, 5.3e-7 at 100 km, 2.1e-9 at 150 km, 2.4e-11 at 300 km.

## Propulsion

Six Raptor 2s in `C.RAPTORS`: three sea-level engines (indices 0–2) and three RVacs (3–5). A
sea-level engine's full-throttle thrust is `max(0, T_vac − p·A_eff)` (`thrustPerRaptorAt`); an RVac's
is 258 tf in vacuum less `p·A_e` through a 2.3 m exit (`thrustPerRVacAt`, tier B, the diameter a
named assumption), 380 s, 2.11 MN on the pad. *Engines* (all) lights the sea-level three only and
shuts down every running engine; the autopilot never lights an RVac, and its landing logic counts
sea-level engines.

| constant | value | where | source |
|---|---|---|---|
| sea-level thrust | 230 tf = 2.2555 MN | `C:230` | public Raptor 2 figure |
| Isp sea level / vacuum | 327 / 350 s, same nozzle | `C:232`, `:234` | public figures (380 s is RVac, a different engine) |
| mass flow | 703.4 kg/s, constant with altitude | `C:243` | derived, T_sl/(Isp_sl·g₀) |
| vacuum thrust | 2.4142 MN (+7.0 %) | `C:246` | derived |
| effective exit area | 1.566 m² (geometric ≈ 1.33) | `C:251` | derived, (T_vac − T_sl)/p_sl |
| throttle | 40–100 %, slew 60 %/s | `C:166–170` | tuned, no source |
| gimbal | ±15°, slew 600 %/s | `C:190–192` | tuned, no source |
| engine offsets | N1 −1 m, N2/N3 +0.5 m | `C:173–176` | tuned, no source |

Thrust and fuel flow scale with working engines × throttle % (`physics/engines.ts`). The
sea-level engines' thrust acts along `pitch − gimbal% × 15°`; the RVacs are fixed and push along
the hull (`gimballedShare`), so the gimbal's torque and the autopilot's gimbal authority read the
sea-level share alone; the gimbal's lateral component and the engine-offset
term act only as torques about the engine arm. The step the tank runs dry thrusts in proportion
to the propellant it actually burned (`updatePropellant` returns the fraction). Fuel-out stops all
engines and cancels any ignition still counting down; dump runs at
3500 kg/s down to 12 t unless forced (`dumpLimit`); autoLand stops its own dump at the 18 t
`landingReserve`. **Ignition** is a dt-ticked delay drawn
uniformly in 0.3–1.2 s (`engines.ts:147`), preceded by a failure roll at rate 0, or 0.1 with
Random Failure on (`C:153`, `:163`); the roll is drawn either way.

## Mass, centre of mass, inertia

Dry 120 t (`C:102`), default load 350 t (`C:104`), capacity 1200 t (`physics/mass.ts:46`).
Stations above the gimbal plane: tank bottom 5.0, aft fins 9.2, dry CoM 21.8, RCS 41.8, front fins
45.1, nose 50 m — the 2021 arms read about the dry CoM, so empty-tank arms equal them. LOX (12.94 m
full) sits under CH₄ (9.67 m), O/F 3.6, densities 1141 / 424 kg/m³; both fill from the bottom and
drain in ratio. Inertia: dry hull as a 9 × 50 m cylinder plus each propellant column, by parallel
axes (`mass.ts:98`). Arms: engine = CoM, aft fin = CoM − 9.2, front fin = 45.1 − CoM,
RCS = 41.8 − CoM.

| load | CoM | I (kg·m²) | ∫\|r\|³ (m⁴) |
|---|---|---|---|
| dry | 21.8 m | 2.56e7 | 2.15e5 |
| 350 t | 12.7 m | 5.03e7 | 4.90e5 |
| 1200 t | 14.6 m | 7.97e7 | 4.02e5 |

## Aerodynamics

Every aero term uses airspeed `|(speedX − airX, speedY − airY)|` (`aero.ts`, the air's velocity
from the Wind section). θ is
`angleInToTheWind`.

| term | formula | where | source |
|---|---|---|---|
| q | `ρv²·0.0005` kPa | `aero.ts:24` | ½ρv² / 1000 |
| max area | `450 + 1.8·(sin(1.03·f%)·24.2 + sin(1.03·a%)·45.8)` m², ≤ 558 | `aero.ts:267` | 1.8 tuned, no source |
| cross-section | `\|sin θ\|·maxArea + \|cos θ\|·63.6 / 2.1` | `aero.ts:35` | **/2.1 unexplained**, tuned, no source; nose-on floor 30.3 m² vs geometric 63.6 |
| body Cd | `0.1347·M + 1.153`, 2.5 for M ≥ 10 | `aero.ts:91` | tuned, no source |
| drag | `½ρv²·Cd·A`, against the relative wind | `aero.ts:46` | — |
| lift | `Cl·½ρv²·maxArea`, normal to it; sign by AoA quadrant | `aero.ts:77` | — |
| Cl | five segments: rise to 0.35 rad, spike 0.47–0.52, decay | `aero.ts:63` | tuned, no source |
| fin force | `½ρv²·2·\|sin θ\|·area·sin(1.03·ext%)`, front/aft opposite signs | `aero.ts:212` | Cd 2 (`C:307`) tuned; torque only |
| angular damping | `ρ·9·ω²·∫\|r\|³ / I`, against spin | `aero.ts:193` | tuned form, no source |

Fins are 24.2 and 45.8 m² (`C:296`, `:300`), 1.03 rad full deflection, slew 120 %/s; idle fins go
fully out as an airbrake unless locked. **RCS** is 800 kN (`C:283`) at its arm, torque only, from a
25 s reserve drained in proportion to thrust; the yoke is bang-bang past ±99 %, otherwise the
autopilot's proportional command applies.

## Thermal

Phase 6, Task 8 (`physics/thermal.ts`).

- **Flux:** Sutton & Graves (NASA TR R-376), `q = 1.7415e-4 · v³ · √(ρ / R_n)` in W/m², v the
  airspeed, R_n the hull's 4.5 m radius. Broadside the Ship is a cylinder in crossflow, whose
  stagnation line takes 1/√2 of a sphere's flux (2-D against axisymmetric; Anderson); the factor runs
  from 1 nose-on to 0.707 broadside with |sin| of the angle into the wind (the blend is an assumption).
  2021's 1.83e-7 was the same form on a scale 951.6 times smaller.
- **Temperature:** radiative equilibrium with the surroundings, `εσ(T⁴ − T_sink⁴) = q`, ε = 0.85
  (the Shuttle HRSI coating, tier B). The sink is the air below 86 km and the mesopause's
  186.95 K above it (`radiativeSinkKelvin`; the thermosphere's 1,000 K gas is too thin to warm
  anything, tier B), so an unheated tile reads its surroundings, 288 K on the pad. No soak, no
  ablation.
- **Limit:** 1,533 K, the Shuttle HRSI reuse limit (1,260 °C, tier B), judged on the temperature;
  `heatLimit` = εσT⁴ = 266 kW/m² is the flux scale the plasma, audio and warnings use. Peaks: the Re-entry preset 1,372 K (171 kW/m²), the deorbit 1,459 K.

## Limits and failure

| check | condition | where |
|---|---|---|
| g | `perceivedG > 13`: felt g, (acceleration − gravity) / g₀, what the structure carries | `step.ts:193`, `C:298` |
| heat | `surfaceTemperature > 1,533 K` (`TILE_LIMIT_KELVIN`): the tile itself; `heatLimit` is the matching flux scale for the cues | `step.ts` |
| q | `> 50` kPa (goldens peak at 28.6) | `C:461` |
| contact zone | `altitude ≤ 25·\|cos pitch\|` | `step.ts:139` |
| landed | in zone, `speedY < −0.5`, `\|speedX\| < 2`, `\|speedY\| < 10`, `\|pitch\| < 0.09` rad | `step.ts:143`, `C:463–465` |
| crashed | in zone, `speedY < −0.5`, any landing criterion missed | `step.ts:155` |
| resting | in zone, not falling, current vertical specific force ≤ local weight | `updateGroundContact` |
| fuel out | `propellantMass ≤ 0` | `step.ts:199` |

Break-up empties propellant and RCS, restores dry mass/inertia, stops engines and pending ignition, and zeroes rotation; the vehicle then falls with this step’s already paid impulse. A crash
also zeroes speeds and pitch.

## Wind

`physics/wind.ts` (Phase 6, Task 10). `world.wind` (m/s, downrange) is the scenario's **surface**
wind, the steady wind at the 18.3 m reference height, from `ScenarioPreset.wind`; no shipped preset
sets it, the flight editor can. The air's velocity at the vehicle is `(airVelocityX, gustVertical)`:

- **Mean profile:** NASA/TM-2008-215633 §2.2.5.2 eqs. (2.1)–(2.2), `u(z) = u18.3·(z/18.3)^k`,
  `k = 0.52·u18.3^(−3/4)` (mean c; constant below 2 m/s), held at its 150 m value above the surface
  layer. Tier B: the law is fitted to peak winds and applied to the steady one; winds aloft are not
  scaled from the surface (the TM: they are set by large-scale conditions).
- **Turbulence:** Dryden, MIL-F-8785C low-altitude form: `σw = 0.1·W20`, `σu = σw/(0.177 +
  0.000823h)^0.4`, `Lw = h`, `Lu = h/(0.177 + 0.000823h)^1.2` (h in ft), held at the 10 ft and
  1,000 ft edges. u downrange (`world.gust`) is a first-order filter, w vertical (`gustVertical`) is
  Dryden's `(1 + √3τs)/(1 + τs)²`; the 2D world has no lateral v. The sweep speed is the vehicle's
  speed through the mean air (Taylor's frozen field), with no floor: a hover sweeps the whole
  wind, a vehicle drifting with it sweeps nothing. Calm air (`wind = 0`) has no turbulence and takes no draw.

Every aero term and the autopilot's fin-authority estimate read the relative wind; guidance, HUD and
touchdown use ground speeds; the fall predictor reads the mean profile and leaves out the zero-mean
turbulence. In calm air the relative-wind maths is bit-identical to the ground-speed maths.

## Randomness

`rng.ts` hashes (seed, stream, counter); counters live in `SimState`, so a state fixes every future
draw and any draw can be sought directly. Three independently keyed streams: `ignitionDelay`,
`ignitionFailure` and `turbulence`. Default seed `0x57414C4B` (`state.ts`). Ignition draws happen only
when an engine is commanded to light; turbulence takes two a step, only in wind.

## Scenarios

| id | alt (m) | x from pad (m) | vx, vy (m/s) | pitch | prop (t) |
|---|---|---|---|---|---|
| launch-pad | 25 | 0 | 0, 0 | 0° | 350 |
| booster-sep | 70 000 | +45 000 | 1130, 1130 | 45° | 500 |
| rtls | 15 000 | +5 000 | 330, 430 | 30° | 200 |
| reentry | 80 000 | −1 980 000 | 7300, −30 | 30° | 50 |
| before-flip | 1 000 | −100 | 0, −70 | 90° | 30 |
| landing-burn | 200 | 0 | 0, −35 | 0° | 20 |
| circularize | 150 000 | 0 | 7798.3, 0 | 90° | 200 |
| deorbit | 150 000 | −π·R | 7818.3, 0 | 90° | 300 |
| intro | 199 | 0 | 0, −50 | 0° | 12 |

`createScenarioState` (`scenarios.ts:279`) floors altitude at 25 m and caps propellant at 1200 t;
the intro also locks the fins, arms the demo autoland and lights all engines. **Every scenario flies
the Ship** (50 m, three sea-level Raptors and three RVacs): Booster Sep and RTLS place it at booster-like
conditions, and there is no Super Heavy. Orbits sit at 150 km (`scenarios.ts:215`), where a lap
loses ~100 m; at 100 km an orbit decays within a lap.

## Autopilot and guidance

Modes run each step in order (`autopilot/index.ts:758`): demoAutoLand, autoMaxThrust, pitchHold,
autoTakeOff, autoLand, autoBoostBack, autoDeorbit. Later modes overwrite earlier commands; manual
input overwrites all.

- **`precisionAlignment`** (`control/primitives.ts:112`): `α = −Δθ/T² − 2ω/T − offAxisTorque`,
  critically damped, through gimbal, fins or RCS; arms and inertia follow the load.
- **Pitch hold** re-latches below 0.4 rad/s (`C:569`).
- **Ascent**: pitch 0→55° by 25 km, →85° by 80 km (`C:531–533`), fins locked; cuts at 12 t.
- **Max-thrust guard**: holds the speed for q = 35 kPa, hard-coded (`primitives.ts:89`).
- **Landing reserve**: autoLand dumps to `landingReserve`, 18 t (Phase 6), not the 12 t
  `dumpLimit`. It is measured, not derived: the worst one-engine-out deorbit spends 13.7 t from the
  flip trigger to touchdown (flip, a long horizontal adjustment, final descent), about twice the
  predictor's ideal one-engine burn, and the reserve is about a third over that. Engine-out
  deorbits land with about 3.8 t; `deorbit-range.test.ts` fails below an eighth of the reserve.
- **Start transient**: the 0.3–1.2 s ignition delay is the engine's start transient (tier B; no
  spool-up on top), and the flip trigger plans on its 1.2 s maximum.
- **Landing**: aero descent → flip (`index.ts:275`) → horizontal adjustment → final descent at
  `vy = −h/3 − 0.1` (`index.ts:504`); engine-out sets get tuned trims (`index.ts:403`, `:488`).
- **Deorbit**: holds retrograde on RCS from the first coast step; fires when the ground left equals
  burn arc + conic coast to 80 km + 841.8 km (`DEORBIT_ENTRY_RANGE`, fitted); cuts when range-to-go matches it,
  within 75–240 m/s around 150 nominal (`C:384–397`); hands to autoLand once falling. Miss: 7 km
  from 150 km with the tile at 1,459 K of 1,533 (the 120–300 km rows were measured before Phase 6), 50 km
  from 200 km, 90 km at 95 % from 300 km.

**What guidance assumes** (Phase 5, `src/core/control/guidance-physics.ts`):

- **Throttle laws** (`controlEnginebyTWR`, `controlEnginebyEffectiveVerticalTWR`, `getTWR`) size
  thrust against `localGravity`: gravity at altitude less the centrifugal term, exactly as `step()`
  applies it, floored at 0.1 m/s² near orbital speed. A commanded TWR of 1 holds a hover within
  0.02 m/s² at any altitude. Boost-back commands its 1.6 g0 deceleration as an acceleration
  (`controlEngineForAcceleration`), so no g enters it. The flat `C.gravity` survives only in the
  TWR display and the add-back in `getVerticalAcceleration`.
- **The landing burn** (`autopilot/landing-burn.ts`) is sized by `landingBurnStartAltitude`:
  integrated backward from touchdown with midpoint steps of 0.05 s, the weight at each altitude
  (`verticalWeight`: no downrange speed, so only the turning ground's centrifugal term), thrust at that altitude's
  pressure, drag tail first with the Mach-dependent coefficient, and the touchdown mass solved by a
  bracketed regula falsi (Illinois). It agrees with fine-step `step()` runs to within 0.5 m on burns of 176 m to
  11.8 km, and returns null (read as "start now") when no burn can stop the vehicle, including
  when it needs more propellant than is aboard.
- **The flip trigger** plans on 2021's one-engine ladder (two or three engines only when 80% of
  one cannot hold the weight, capped by the engines not failed): a deliberate engine-out
  pessimism. It adds the flip's fall and the ignition delay's 1.2 s maximum (Phase 6; it was a
  0.6 s constant), and **no further margin**. Phase 5 tried two (a flat 100 m, and 0.9 s of
  ignition spread plus throttle slew), and each ran the one-engine-out deorbit dry on the old 12 t
  dump; the 18 t reserve is what pays for the earlier flip now. The horizontal adjustment
  hands over at 1.1 × the predicted burn on the engines running, plus one second.
- **The deorbit aim** `DEORBIT_ENTRY_RANGE` (841.8 km since Phase 6) is fitted to `autoLand`; its health
  is the deorbit flight's miss (0.30 km, `tests/core/deorbit-range.test.ts`), and
  `npm run deorbit:range` prints the re-derived value (the constant plus the miss).
- **The HUD's impact predictor** (`hud/prediction.ts`) is a conic above the 80 km entry interface
  and, below it, `unpoweredFallInto`: the fall integrated with gravity, drag and lift composed as
  `step()` composes them, at the attitude held now. It cannot know that a controller will move the
  attitude, which is what remains of its error. `airResistance_k` is gone.

## Known simplifications

- The ground frame’s rate remains 0 under Phase 6b’s approved fallback: no ~418 m/s launch bonus, no Coriolis yet. The
  machinery and its tests are in place (State and frame).
- Attitude is relative to local vertical with no frame-rotation term: the vehicle keeps its pitch
  to the horizon, turning inertially at the orbital rate.
- Downrange is arc length at orbital radius, wrapped at the surface circumference.
- Wind has no direction change with height and no lateral component; above 150 m the mean wind and
  above 1,000 ft the turbulence intensity are held.
- Body Cd depends on Mach only: attitude-blind, no transonic peak.
- Aero and thrust forces are held at the incoming state for each step.
- One vehicle: no Super Heavy, no staging.
- Isp does not vary with throttle; engines reach thrust instantly after the ignition delay.
- Fins, RCS and the gimbal's lateral component make torque only, never translation.
- Heating is an instantaneous stagnation flux at radiative equilibrium: no soak, no ablation, one
  temperature for the whole windward hull.
- Since the centre of mass moves with the propellant (M11.8), the RTLS flight reaches apogee
  before MECO, and the HUD's impact prediction is less accurate at high altitude on it: the
  predictor holds the attitude of the moment, and the vehicle is still turning under thrust.

## Phase 6b parked aerodynamics

The shipped model remains the Phase 6 broadside force curve, legacy fin torque and800kN/25s torque-only RCS. NASA R474 body-axis/CoP forces, sourced paired hypersonic surfaces, the65° schedule/range trim, Earth rate and their22t reserve/aim are parked under Steve’s approved fallback. Fresh independent review confirmed the prescribed family exceeds existing attitude-control authority after identical-handoff convergence checks. This is a conclusion about that family/model, not universal optimal-control infeasibility. Evidence and complete source/scientific-test recovery are in `docs/research/2026-10-02-phase6b-body-moment/`. Task5 failure/support/throttle corrections, the independent final-descent braking envelope and first-loss debrief capture remain. No parked model is claimed as shipped.
