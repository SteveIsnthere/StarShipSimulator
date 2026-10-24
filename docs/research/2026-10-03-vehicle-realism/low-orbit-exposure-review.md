# Next natural exposure approach — source-equation review,2026-10-03

**A long shallow coast can plausibly demonstrate natural elastic authority change. It does not, by itself, demonstrate proof loss. A combined coast/burn/entry witness remains unproved.** No second flight, trajectory integration, sweep or production changes were performed. `low-orbit-exposure-bounds.ts.txt` evaluates only frozen material/thermal/propulsion equations at the three predeclared80/90/100km altitudes.

## Physical constraints

Current `frameRotationRate=0`; the actual air-relative circular speed is approximately7.85km/s, not7.4km/s. The current orbital presets are150km, not300km (`scenarios.ts:229`). Correct these assumptions before preparing a mission. Ship orbital presets also have protected LI900 hinges; they are not exposed booster roots. A booster low-orbit editor condition is a declared diagnostic of an orbital-returning booster, not a claim that Super Heavy follows this real mission.

| Initial circular altitude | Airspeed | q | Legacy skin | Initial-flux root100°C heating time* |
|---|---:|---:|---:|---:|
|80km|7860.59m/s|570.25Pa|1373.20K|75.61–76.47s|
|90km|7854.51m/s|102.88Pa|1108.26K|188.68–194.03s|
|100km|7848.44m/s|16.34Pa|880.50K|474.14–509.43s|

*These are **fixed initial-flow energy bounds**, not integrated-flight durations. Lower bound ignores every loss; upper bound uses the maximum sourced steel conductance to a cold hull and radiation at the target. Neither replaces evolving trajectory flux. At80km the root needs5.246MJ to reach373.15K. A first-order circular-orbit drag estimate gives only approximately10m radial displacement over76s for a neutral-grid nose-on700t body, so early stiffness change is credible, though still unmeasured in actual flight. This estimate is not a validated mission solver.

For an exposed root with initial sinkTs and targetT:

```text
Erequired = mroot [H(T) − H(Ts)]
Pmax = Aheat flux
Pmin = Aheat [flux − εσ(T⁴−Ts⁴)] − Gmax(T−Ts)
Erequired/Pmax ≤ initial-fixed-flow heating time ≤ Erequired/Pmin
Gmax = kSteel(1473.15) As/(L/2) =2.56366554W/K
```

The upper bound requiresPmin>0. The finite hull warming makes this conduction-loss bound conservative for the frozen-flow comparison. It does not license treating density, attitude or speed as fixed during a coast.

## Proof demand and tile guard cannot be separated at orbital speed

Using the canonical loaded-angle solver and9m²/root with the physical2.07m span-centroid lever:

| Source root knot | Grid proof demand at45°command | Maximum nose-on speed satisfying1533K at that demand |
|---|---:|---:|
|600°C,873.15K|45.201kPa|3283.59m/s|
|700°C,973.15K|37.223kPa|3446.94m/s|
|800°C,1073.15K|20.603kPa|3996.25m/s|

The inequality follows directly by eliminating density:

```text
flux = SuttonK v² sqrt(2q/Rnose)
v² ≤ εlegacy σ (1533⁴−Ts⁴) / [SuttonK sqrt(2q/Rnose)]
```

Even at the weakest in-domain900°C proof knot, this permitted speed is below approximately4.6km/s. An orbital-speed coast therefore hits the equilibrium tile guard before proof demand across the complete available strength table. Crossing the900°C capability boundary while still at lowq would be a **material-domain disposition**, not the required in-domain proof witness.

## Heating, braking and fuel must coexist

At80km, fixed initial flow requires30.766MJ to reach the800°C source knot, with bounds443.44–718.84s. At90km the analogous bounds are1056–11067s. At100km the radiative-only equilibrium is893.92K, below the800°C target; its frozen-flow target is impossible. Increasing density during decay increases heat, but also approaches the global tile guard. The80km heating interval overlaps that decay risk; current bounds do not guarantee reaching800°C before terminal.

The inherited500t booster fuel and200t dry mass provide ideal vacuumΔv4299.89m/s. An assumed7860.59→3000m/s burn needs4860.59m/s and would require final mass169857kg, below dry mass. That version is fuel-infeasible before considering losses. Reaching roughly4000m/s at an800°C root is compatible with the ideal fuel budget, but leaves little thermal/trajectory margin and is not a verified burn.

Three centre engines provide7.872MN and2293.58kg/s; a roughly3.86km/s ideal braking burn lasts about206s. During retrograde braking gravity removes the former circular support, so a low80km orbit cannot be treated as an unchanged orbital platform throughout that burn. Approximate cooling also matters: at800°C, source radiation plus cold-hull conduction can remove order26kW/root;200s with little incident heat can remove approximately5MJ. Root temperature at coast cutoff is not root temperature at later proof demand.

Using additional existing engines can reduce burn duration, but must respect actual ignition, throttling, mount torque, remaining fuel and the unchanged **felt13g** guard.33engines cannot remain at even40% throughout fuel depletion without eventually exceeding that guard; engine groups must change using existing authority. Turning180° must also be paid through real actuators. An instantaneous turn or velocity change would invalidate the witness.

## Bounded next approach

The clean next candidate is an **early natural stiffness witness**, which can succeed without pretending to prove detachment:

1. Predeclare a pristine80km circular booster editor start, actual current circular speed,500t inherited fuel, ambient root/hull temperatures, engines off and unchanged seed. No artificial hot state, attitude lock or station keeping.
2. Command only existing actuators. Coasting with grids neutral avoids manufacturing heat from a force-selected trajectory. At the200°C material knot473.15K, apply the existing45°grid command and compare canonical live/cold forces at identical actual flow. This source knot gives a meaningful modulus change from187210→176314MPa, rather than choosing a barely detectable threshold after seeing a trace.
3. Stop at that comparison, any original guard/domain exit, or a declared energy-based duration bound. Preserve negative outcomes. No proof-loss claim follows from this result.

For a later combined proof mission, freeze a fully paid turn/braking policy **before** running it, and predict whether the root can reach the800°C source knot while retaining enough fuel and skin margin to brake toward<3996m/s. Then require actual same-flow E-change, in-domain proofMask, domainMask0 and retained original guards. If source-derived turn/burn/time bounds cannot establish that overlap, do not run repeated variants to discover a passing trajectory. Review the reduced-order assumption instead.

The present evidence supports thermal authority change as physically reachable in the authored model, but **does not settle existence of a complete natural proof-loss flight**. The responsible bottleneck is finite root thermal mass/residence time combined with an instantaneous equilibrium1533K global stop and the high orbital-speed flux law. None of those constants should be fitted or removed to satisfy acceptance. The uniform application of hull stagnation flux to each exposed root is itself an authored thermal-surrogate assumption, not measured local V3 heating. Keep that limitation visible whether the candidate passes or fails.
