# Actual-flight natural exposure feasibility — 2026-10-03

**Outcome: this predeclared example does not demonstrate progressive thermal authority loss.** It crosses the unchanged50kPa pressure terminal guard after71actual120Hz steps (0.591667s), while the exposed grid roots remain below100°C, where the declared material model holds the100°C stiffness/proof baseline. No thermal proof/domain loss precedes terminal breakup. A successful fixed-flow material exposure is therefore insufficient evidence for this live flight.

## Declaration and reproduction

One bounded diagnostic only, no sweep or retries. Run `npx vite-node docs/research/2026-10-03-vehicle-realism/live-exposure-diagnostic.ts.txt` in the realism worktree. The observed command exited0 in1.12s. Source script and sampled raw trace are `live-exposure-diagnostic.ts.txt` and `live-exposure-diagnostic.jsonl` in this directory. No production files, preset definitions, golden fixtures or failure limits were changed for this diagnostic.

The previously proposed35km/3000m/s/nose-on/45°grid condition did not specify velocity direction or fuel. Before running, the diagnostic explicitly chose **descending nose first**: geometric altitude35000m, velocity(0,−3000)m/s, pitch180°, zero spin, all grids initially at the45°command and held at the same manual command every tick. Hardware begins pristine at the actual236.513372K sink; no root temperatures or damage are injected. Propellant remains the booster-sep preset's500000kg, engines are off, wind zero, seed1463897163. Position is a custom editor input; no shipped preset changes. The bounded stop is first component ownership change/terminal/ground or60s, whichever occurs first.

This uses actual `step()`, including translation, body rotation, drag, finite thermal soak, endpoint loss and terminal capture. It does not hold position, velocity, incidence or heat flux fixed. All autopilot modes start off, manual input holds the physical grid command; no attitude servo is invented to preserve nose-on motion.

## Observed evidence

| Quantity | First actual step,0.008333s | Terminal endpoint,0.591667s |
|---|---:|---:|
| Hull altitude |34974.9998m|33224.3408m|
| Dynamic pressure |38085.148Pa|50122.290Pa|
| Applied convective flux |203916.587W/m²|232160.649W/m²|
| Legacy equilibrium skin temperature |1434.451K|1481.680K|
| Felt specific acceleration |0.525681g|1.089918g|
| Exposed root temperature |236.537368K|238.332576K|
| Root energy, common enthalpy reference |−1682754.534J|−1631187.873J|

The original tile1533K and felt13g guards remain comfortably below threshold when pressure first exceeds50kPa. The terminal reason bit is2(`Pressure`). All three grids remain attached until that terminal transaction; there is no earlier revision, thermal invalidity or proof mask. Terminal transfer of every component must not be counted as progressive loss.

At each healthy endpoint, the nonmutating canonical `writeDamageControls` evaluates the live root temperatures and an unchanged cold clone at **the same current q, incidence and interval grid command**. Maximum live-minus-cold temperature-induced angle/lift/drag reductions are exactly0. The cold reference and original incoming state's thermal nodes remain unchanged. The small loaded-angle decrease during descent is entirely increasing aerodynamic load, not thermal softening. The final zero live area results from terminal ownership removal and is explicitly excluded from the thermal comparison.

Roots rise1.819204K above initialization. Their finite energy increases approximately51.6kJ between the first and terminal samples. The material's conservative ambient-to100°C mechanical hold therefore makes thermal authority exactly unchanged here; this is a model implication, not detector insensitivity. Independent root strength/stiffness source values were not altered to manufacture an effect.

## Implication for remaining acceptance

Keep the fixed-flow exposure as a material/network foundation witness, and this live trace as a negative residence-time/control witness. Neither satisfies the required natural-flight progression-to-proof acceptance. This result establishes only that **this declared descending condition terminates too quickly**, not that all natural flights can never thermally weaken a root.

A later candidate needs an evidence-backed integrated residence-time argument under retained pressure/tile/g limits, including rotation and changing airspeed. Predict cumulative absorbed energy and mechanical load from an unmodified trajectory before choosing its witness. Review that prediction before another attempt; do not reduce root mass/insulation, increase initial temperature, lower proof strength, hold external flow artificially or change guards to obtain proof. Existing nominal campaign results remain a separate acceptance obligation.

## Measured source fingerprint

SHA256 read immediately after the single trace (the parent was independently integrating other core work; this is the sampled working tree, not a commit/release identity):

```text
d5fb9bb02df532df7afcb2c63219613a363af4999287111863abdee4df789986  src/core/step.ts
db6e0c31f17944b25f1b4dedf392294b632a0bdef71684821e9addb3c1db4e38  src/core/physics/step-dynamics.ts
2b3351540043f038af5a184a88c9cc193b64681f891c4ae1bcb113bfefb09a5f  src/core/control/mechanical.ts
6b81d44e4d75715b68e560d93c8cbfd099dc2e6ef3cf8af5ef31740ebd7c9d12  src/core/physics/damage-flight.ts
b56ad9e9e49ab2662da200f3a3e57b9349075afdd7400b1d296dde6a025904e9  src/core/physics/damage-material.ts
7afc7c163aff1ec97ea824f65193b257733eecd599a013daed4615333b6510fe  src/core/physics/damage-controls.ts
cf5bc06d5e59a4c983ff6fd88a2bbf4c01316e826f9acc9358b09ac17b4f9fc0  src/core/physics/damage-thermal.ts
980368dd3ecbf4d96723a41b2cad85e133b1570a2d255b71907fc57052e17bd8  src/core/physics/damage-debris.ts
94a13190d1e4c7169e4e30592fe34c40330f1f231d2bf60a8e9c4f387fe1f86b  src/core/vehicles/super-heavy.ts
72c34e346e7bcbc27103b47e38dbab9e58b629b13e793e657e15c63030b5c8e4  docs/research/2026-10-03-vehicle-realism/live-exposure-diagnostic.ts.txt
```
