# Full-capacity low-orbit exposure candidate — analytical review,2026-10-03

**Credible for one frozen diagnostic; not a guaranteed proof-loss flight.** Official3650000kg fuel capacity removes the500t example's rocket-equation deficit. The proposed initial retrograde orientation and neutral grids remove the need to invent a turn or attitude constraint. No actual flight was executed in this review. `full-tank-exposure-bounds.ts.txt` evaluates the ideal rocket law and a small-departure orbit perturbation quadrature; it does not call `step()`.

## Scope and initial condition

A pristine, ambient-temperature, full-capacity booster at80km circular speed, fixed initial pitch−π/2, engines off, zero initial spin, neutral grids and zero wind is physically admissible as a **flight-editor initial condition** in this simulator. Heat, later actuation, fuel and forces must evolve through actual core steps. No orientation lock is imposed: neutral grids, symmetric engines and zero spin only remove the modeled torque initially. Any later pitch change is retained.

This is not a realistic Super Heavy orbital mission. The editor has not demonstrated that launch reaches this orbit with a full tank; this booster architecture normally remains suborbital. Report it as an off-nominal pristine exposure demonstration, separate from nominal preset acceptance, not as realism validation of Super Heavy operations. Its use for the owner's natural-exposure requirement is defensible **only with that explicit scope**: natural refers to thermal/structural progression after initialization, not a verified launch history.

## Paid burn and load estimates

| Frozen source calculation | Result |
|---|---:|
| Initial wet mass |3850000kg|
| Current circular airspeed,80km |7860.594m/s|
|33engine vacuum thrust |86595418.58N|
|33engine paid mass flow |25229.358kg/s|
| Ideal tangential braking duration to4000m/s |103.047s|
| Ideal final wet mass |1250194kg|
| Ideal remaining fuel |1050194kg|
| Initial/final thrust-only felt load |2.294g /7.063g|

Ambient pressure is extremely low during this burn, so vacuum thrust is an appropriate upper thrust estimate. Actual force, fuel, countdowns, throttle slew and perceivedg still determine the real result. Existing engines must ignite through public commands; setting their running flags would bypass the paid ignition sequence. No minimum throttle or13g guard changes are required. The thrust-only endpoint has substantial margin below13g, but it is not a bound on unmeasured later aerodynamic/constraint forces.

## Heating and altitude interaction

The initial80km nose/tail-on flux is171307W/m²; legacy equilibrium skin1373.20K. The required root energy to reach the800°C source knot1073.15K is30.766MJ. Initial frozen-flow bounds are443.44–718.84s, including the conservative cold-hull conduction loss in the upper estimate. They are not coupled trajectory guarantees.

Full-tank neutral initial body drag is43187.75N, only0.01122m/s². A constant-initial-drag circular perturbation estimate over718.84s produces1692m inward displacement and7.063m/s inward velocity. This estimate omits increasing density and the resulting feedback, so it is a scale estimate, **not an upper bound**. Its much smaller radial excursion than the500t case supports considering this candidate without fitting fuel.

For braking, use the exact ideal rocket-law tangential speedv(t), and estimate radial acceleration at the initial circular radius:

```text
v(t) = v0 − ve ln[m0/(m0−mdot t)]
ar(t) ≈ g80 [(v(t)/v0)²−1]
Δh ≈ ∫₀ᵗ (t−s) ar(s) ds
```

Simpson quadrature128vs512 intervals differs by6.96e−7m; that checks only integration of this **approximate equation**, not model/flight accuracy. The burn estimate gives11138m additional radial drop, approximately66.44km final altitude and−344.49m/s radial velocity. Sampled initial/quarter/mid/three-quarter/end skin estimates are1419/1341/1262/1184/1057K and q remains647–1086Pa. Decreasing speed can outweigh the increasing density, so the burn is not automatically blocked by the global skin guard. Actual body incidence/COM/force evolution is excluded from these estimates and must be observed.

At the800°C root temperature, estimated net root power falls from52.6kW initially to−2.23kW near cutoff. Integrating that scale suggests another order2–3MJ during braking, i.e. material warming of order50–75K. The900°C availability boundary is only100K above the burn trigger. An upper loss-free incident-energy bound does not exclude crossing it; **material-domain detachment is a serious alternative outcome and never counts as proof loss**. The actual finite network must decide this, rather than holding the root at its trigger temperature.

## Cutoff precision and remaining unknowns

The exact previously derived safe nose-on speed at800°C proof demand is3996.246m/s. Rounded4000m/s is therefore **not a guaranteed safe envelope** at exactly800°C. It is a legitimate frozen candidate only if actual warmer-root demand and actual flux are measured and the unchanged global guard still wins whenever necessary. Do not relabel a temperature-domain event or terminal transfer as proof.

Define the candidate's4000m/s cutoff using **actual air-relative speed magnitude**, not downrange speed. The approximate tangential4000m/s endpoint with radial−344m/s has total speed4014.8m/s. The small extra braking interval is affordable, but must be paid naturally.

After cutoff,45°grid actuation creates real body torque and lift/drag. Density, incidence, falling speed, root cooling/reheating, body rotation and proof demand are coupled. The quasi-orbital burn estimates provide no proof that q later crosses hot-root capacity before speed/temperature reduce it. This is the principal unresolved observation.

## One frozen diagnostic recommendation

1. Initialize only the declared editor inputs: official full fuel,80km circular speed, retrograde pitch, pristine ambient hardware, zero spin/wind and unchanged deterministic seed. Grids neutral; engines off. Disable autopilot modes that would replace these prescribed controls.
2. Coast through actual mechanics until any exposed grid root reaches the published800°C knot1073.15K. Use the minimum of the three roots for the trigger so every root is preheated. Stop negatively on any original terminal, proof/domain disposition, or the declared initial-flow upper heating cap718.841451s. The cap is a fixed diagnostic budget, not a claimed variable-flow upper bound.
3. Request all33engines through existing ignition commands, command100% throttle, and retain retrograde attitude dynamics without a servo or reset. Stop negatively on any original terminal or domain disposition. Cut off once actual air-relative speed≤4000m/s. The source full-fuel emptying time3650000/mdot bounds the paid portion; add only the actual declared ignition countdown for an execution-time cap, not an outcome-selected extension.
4. Shut down using existing commands and issue the fixed45°grid command through real actuator slew. Advance until first proof/domain/terminal/ground event. Use the declared80km circular orbital period as a finite overall observation budget; crossing that cap is a negative result, never grounds for an automatic extension.
5. Record same-flow cold/live authority at healthy endpoints, actual loaded angles, finite energy, paid fuel and original guards. Success specifically requires natural pre-loss modulus/force change followed by in-domain proofMask with domainMask0 and no earlier global terminal. Preserve and explain every other outcome.

This is one candidate, not an authorized parameter search. Do not change material data, source geometry, tank capacity, engine authority, presets or thresholds if it fails. No second flight has been run yet.
