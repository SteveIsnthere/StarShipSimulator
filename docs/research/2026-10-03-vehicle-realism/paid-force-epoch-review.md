# Paid-force epoch review —2026-10-03

**A genuine endpoint guidance defect is reproduced.** The mass cache is fresh: the error comes from dividing this interval's paid thrust by the new post-loss retained mass. Rebuilding the paid gimballed share from the next requested engine inventory is independently wrong. No production source edits or whole-flight tuning were made.

## Minimal actual loss witness

`paid-force-epoch-witness.ts.txt` runs one canonical `advanceFreeBody` tick, taking its observation inside the normal post-damage/pre-actuation control callback. It uses physical1millionkg fuel,20km altitude,−600m/s vertical speed,0.12rad pitch/0.4rad/s spin, thirteen gimballed engines at60% and20%gimbal, grids fully deployed. The warm case injects1160K roots with consistent source enthalpy; this is an explicitly supplemental unit endpoint, **not a natural exposure flight**. The cold case preserves the same inputs without heat. Console/JSON record source hashes and actual numeric output. A first harness typo used nonexistent component.index; it was corrected to catalogue enumeration before the warm case executed, with no physical parameter change.

The actual warm tick gives revision1, all three grids detached with reason1 and no terminal:16.0038kPa,573.344K skin,1.898g. Paid mass1199950.305810kg becomes retained mass1198903.174098kg after1047.131712kg of grids departs. Paid thrust20.394609131MN and `forces.thrustAcceleration=16.996211454m/s²` still refer to the paid mass. Independently, thrust/(dryMass+actualpost-paymentfuel) exactly matches that stored paid acceleration. At fixed requested netay=10m/s²:

| Quantity |Paid-consistent|Current helper|Error|
|---|---:|---:|---:|
|RequiredX,m/s²|0.979693220|0.980696547|+0.001003327|
|RequiredY,m/s²|20.768385960|20.783196642|+0.014810683|
|Delivered throttle,%|73.420437438|73.472796191|+0.052358754percentage points|

The healthy cold control has exactly zero required-vector/throttle errors. This is not a stale-mass test injection: all paid fuel, motion, heat, proof loss and mass refresh come from the real one-tick mechanical path. The injected heat only ensures that the bounded endpoint transaction occurs.

A separate read-only-style inventory probe temporarily changes the local test endpoint's next requested mask from thirteen steerable engines to all33 after its paid observation, then restores it. The paid interval stays identical; current helper's measured subtraction changes by(+0.570993818,−0.054688644)m/s² because it recomputes share1→13/33 and uses the endpoint hull pitch. This probe is not another paid flight interval. Production normally uses thirteen/three return engines, but old mixed33→requested13 is a valid transition from another operating mode. Public helpers accept arbitrary actual engine inventory and must not reconstruct history from next commands.

## Source contract

- `physics/step-dynamics.ts:338–375` evaluates paid thrust and scalar thrustAcceleration with the paid interval's mass, incoming pitch/gimbal direction and actual running share; `work.gimballedThrust` retains the paid share only in scratch.
- `mission-free-flight.ts:104–109` advances rotation and publishes the endpoint hull pose before controls. Stored vehicle.gimbalPointingDirection still names the force epoch; endpoint k.pitch does not.
- `control/mechanical.ts:20–27` commits endpoint heat/ownership before guidance, deliberately preserving paid impulse. `damage-flight.ts:166` refreshes retained mass and enforces engine-support availability.
- `control/booster-arrival.ts:31–36` rebuilds measured acceleration from paid force/current mass/current mask/endpoint fixed-hull pitch. `boosterDeliveredThrottle:99–105` repeats the same mismatch.
- `autopilot/booster.ts:241–259` can change requested engine inventory before the two helpers; post-step forecast scheduling occurs after actuator slew. Therefore reconstructing old fixed-hull orientation from current gimbalPosition is not generally sound either.

Existing `forces.thrustAcceleration` plus stored incoming gimbal direction **are sufficient when the paid interval is known to be entirely steerable**. They resolve the thirteen/three engine loss-mass witness without new state. That guarantee is not encoded in these helper inputs. Scalar total acceleration cannot reconstruct the old mixed fixed/steerable vector after masks/orientation change. `thrustVectorForce` stores paid lateral gimbal force for rotation, but recovering its incoming deflection from current gimbalPosition fails after actuation. Do not use next engine masks as evidence of the old interval.

## Recommended smallest coherent fix

Store two numeric paid world-component acceleration fields on the existing ForcesState, e.g. `paidThrustAccelerationX` and `paidThrustAccelerationY`. Compute them once alongside `thrustAcceleration` from the same paid mass, running share, incoming pitch and incoming gimbal direction, before translation/rotation and endpoint loss. Do not add another mass owner, engine-mask snapshot or damage schema. Clone/initialization and terminal propulsion clearing must include these scalars; terminal clear zeroes them, whereas a nonterminal loss preserves the already-paid observation until the next force epoch.

Both arrival helper and delivered-throttle helper subtract the stored paid vector from the endpoint acceleration. Their prospective maximum still comes from the canonical current retained mass, current required engine inventory and support availability. Their existing prospective direction/steering clamp/throttle floor remain unchanged for this bounded correction. Do not overwrite thrust/acceleration at detachment, recalculate the elapsed paid impulse with new mass, restore old support, or add unpaid thrust.

For healthy entirely gimballed return engines, calculate the fields using the existing multiplication order `thrustAcceleration*sin/cos(gimbalPointingDirection)` so required-vector arithmetic retains its previous result. Healthy mixed-engine behavior's incoming-versus-endpoint fixed orientation is an existing error and should be corrected explicitly, not silently claimed bit-identical. Existing numeric bounds do not need relaxation. Synthetic force-only test fixtures must initialize coherent paid acceleration or run real mechanics; defaultzero new observations do not justify inventing measured thrust.

Alternatives rejected: (1) use thrustAcceleration but retain current share: fixes mass only and still misattributes changed engine inventory; (2) always assume paid share1: overcredits mixed33mode and contradicts model; (3) recover old deflection from current gimbalPosition/thrustVectorForce: not valid after slew; (4) freshly evaluate all unpowered aero/gravity at the endpoint: a broader controller-law change, with different retained-mass/attitude/thermal forces even on healthy flights; (5) add full paid mass/share/pitch snapshots: more redundant state than the two components actually consumed.

## Focused red/green follow-up for the owner

1. Adopt the actual cold/warm one-tick witness: warm required vector and unsaturated throttle must equal the independently paid decomposition; healthy control stays identical.
2. Paid13→requested3, paidmixed33→requested13 and no-thrust→requested13: changing next authority cannot alter measured environment. Next maximum must still change with the actual current inventory.
3. Rotate hull and slew gimbal between paid epoch and post-step invocation; stored paid vector stays fixed while next authority/direction remains the helper's current bounded estimate.
4. Remove support: no available future acceleration/delivered thrust, failed/running/countdown masks remain enforced; preserve any just-paid measurement on the nonterminal endpoint and clear at next no-thrust interval/terminal.
5. Paid partial fuel interval and unchanged intact arrival/return reference tests retain original tolerances. Constructor/deep clone/reset/terminal clear cover the two fields, then normal build and focused lint/tests. No full flight retuning or coverage/golden blessing from this audit.

## Approved implementation checkpoint

Lead approved the proven Bug-fix tier before implementation. RED `/tmp/paid-force-epoch-red.txt`:4failed/4passed (actual13/mixed33warm loss and lifecycle). GREEN `/tmp/paid-force-epoch-green-final.txt`:46passed in6files including canonical paid/loss/mask/rotation/support/partial-fuel witnesses, existing command/retained-guidance/terminal tests and both full-state historical step proof suites. Owned-source focused ESLint and TypeScript check pass (`/tmp/paid-force-epoch-lint-final.txt`, `/tmp/paid-force-epoch-typecheck.txt`). No complete gate/truth/golden acceptance is claimed here.

Production now defines `forces.paidThrustAccelerationX/Y`, writes them only for active damage-model states at the paid force epoch, and subtracts them only as measured environmental decomposition. Current endpoint mass/mask/support still own future authority; historical damage:null helpers retain the exact original formulas. Null historical constructor gains only two schema-adapter zeros, and unused caches remain zero throughout its full-state proofs. Normal terminal failure preserves the paid fields on its failure interval and clears them next interval; incoming impact clears before spending new fuel. Deep clones copy fields through the existing forces spread.

One old synthetic command fixture explicitly supplied10m/s² paid propulsion only through raw thrust and a cached300000kg mass, while physical propellant remained500000kg. Its physical fuel now equals300000−selecteddryMass, and paid vector is explicitly(0,10); every old expected demand/throttle/delivered-force bound is retained. This is coherent fixture input migration, not a numeric tolerance change.

All active recorded/golden SimState shapes acquire two new force scalars. Ship kinematics and healthy entirely-gimballed booster decomposition are expected unchanged by this bounded fix; booster commands/forecasts that previously crossed a loss or changed paid-vs-next engine inventory can change. Full before/after trajectory diffs, truth audit and full Linux golden generation remain parent-owned phase acceptance, with no local blessing/partial recording here. Source edits are confined to state,step-dynamics,damage-terminal,booster-arrival and targeted tests/schema fixture; no controller, physics limit, engine authority or scenario tuning.
