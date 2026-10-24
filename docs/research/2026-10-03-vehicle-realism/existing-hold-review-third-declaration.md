# Existing attitude utility review and proposed third declaration —2026-10-03

**The existing booster attitude utility has credible authority to arrest the measured ignition spin. Recommend one otherwise unchanged diagnostic with that utility enabled during the burn, subject to lead review before execution. No third flight was run.** This is a source-capability assessment, not a closed-loop stability or proof-loss guarantee.

## Existing behavior, not a new controller

`autopilot/index.ts:775` dispatches non-returning booster utilities to `runBoosterUtilities`. `booster-utilities.ts:12–17` runs the hold only when manual override is off and the vehicle is not terminal. It calls the existing `alignBooster(...,.5,model)` allocator. Returning/landing modes must remain off, or the return controller takes priority.

The allocator in `booster.ts:46–91` requests angular acceleration `error/.5²−2ω/.5`, subtracts current off-axis/angular-drag acceleration, credits delivered grid/gimbal torque, and assigns remaining demand to existing gimbals and paid proportional RCS. Gimbal limit remains15°, slew600percentage-points/s; RCS limit800000N and reserve25equivalent full-thrust seconds are unchanged. `actuation.ts:128–155` consumes the proportional command and drains the real reserve. No healthy mass/torque assumption replaces the retained-mass query.

**It is not a strict fixed retrograde-angle servo.** Below the existing0.4rad/s pitch-rate threshold it continually relatches its target to current pitch. The measured startup spin0.0095086rad/s lies below that threshold, so the utility chiefly damps spin, allowing a small accumulated orientation offset. Do not pin `holdingPitch` each frame, remove the relatch or reset orientation to turn it into a new controller. Its actual cumulative pitch error is a required observation.

Passing manual `pitchControl:0` each burn tick would override the utility after it runs; setting `manualControlOn=true` would disable it altogether. The prospective burn must omit pitch input and release manual override through the existing public command. Throttle100remains an independent command. The utility can autonomously enable existing RCS; no reserve increase is needed. Slight commanded fin motion while engines await ignition is also retained rather than forcibly clamped away.

## Capability calculation

`existing-hold-bounds.ts.txt` uses the frozen catalogue and retained-mass writer only; it does not call `step()` or a control loop. The measured prior spin requires the following angular momentum removal:

| Quantity | Official full fuel | Ideal4000m/s remaining fuel |
|---|---:|---:|
| Inertia |1.272440431e9kgm²|4.210909698e8kgm²|
| RCS physical lever |36.4743m|46.9693m|
| Maximum RCS torque |29.1795MNm|37.5755MNm|
| Impulse to arrest observed spin |12.0991MNms|4.0040MNms|
| Equivalent full-RCS time |0.41464s|0.10656s|
| Existing reserve |25s|25s|
|13steerable engines' maximum gimbal torque |268.895MNm|176.233MNm|
|.5s allocator damping demand at measured spin |48.3964MNm|16.0159MNm|

Full-fuel damping demand exceeds instantaneous RCS torque alone, but available gimbal authority after readiness is much larger. Startup feedforward/slew/partial-engine availability may still saturate temporarily; this table does not pretend the entire request is delivered immediately. As a deliberately generous **reserve-only sufficiency comparison**, spending full RCS for the entire≤1.2s ignition window plus0.415s to arrest the observed residual would use1.615equivalent seconds, well inside25. This is not a bound on what the allocator actually consumes throughout the burn. Record saturation, reserve and gimbal history.

The previous trace remained exactly at−π/2 until ignition, then acquired persistent spin during unequal countdowns. There was no other earlier attitude disturbance. Source authority and this isolated first divergence make changing only the existing hold mode an evidence-backed next approach rather than a flight-parameter search. It cannot establish later proof feasibility until actual root temperature/entry forces are observed.

## Frozen third diagnostic — lead authorized before execution

The lead reviewed and authorized exactly this declaration on2026-10-03: one actual run, no controller/physics edits, prior inputs/caps unchanged, preserve its outcome. A failure ends this cycle for fresh independent review; no fourth flight is authorized.

Reuse **all** editor inputs, physical caps, ignition commands, speed cutoff and post-cutoff45°actuation from `full-tank-live-declaration.md`. Official full fuel is a source capacity; no root/material/limit/control-authority constants move. Label the run off-nominal editor exposure, not a plausible Super Heavy orbital operation.

1. Coast unchanged, manual neutral grid control, to the minimum grid-root1073.15K trigger or the original718.841451s cap. No hold during coast.
2. At the trigger, enable existing pitch hold with `togglePitchHold`, then call existing `recordHoldingPitchResumeAuto` to release manual override and capture current attitude. Request all33engines through `toggleRaptor`. No extra RCS reserve and no per-tick goal write.
3. During burn call actual `step()` with **throttle100only**, omitting manual pitch input. Leave landing/return/takeoff/max-thrust modes off. The existing utility owns gimbal/grid/RCS allocation. Do not alter its `.5`time, relatch threshold, slew, torque or budget. No forced orientation/velocity injection.
4. At actual relative airspeed≤4000m/s, disable hold through the existing toggle, restore manual override, shut down all engines through the existing command, enable the existing fin actuator if the utility disabled it, and issue the declared45°command through real slew. No extension reset; no RCS replenishment. No hold in the entry phase.
5. Stop at first progressive loss, global terminal, ground or the exact previously declared phase/overall caps. There is no automatic retry. Any root material-domain loss remains a negative proof result.

Add hold-specific logging: `holdingPitch`, actual pitch/spin/rate, gimbal percentage, independent fin command/extension, RCS thrust and remaining reserve, partial engine count/countdowns, thrust and off-axis torque acceleration. Preserve the prior same-flow cold/live authority and energy/guard logs, distinguishing hypothetical neutral-phase capability from actual delivered force.

Success still requires actual natural pre-loss control degradation followed by in-domain proof loss, below1533K/50kPa/13g. Merely holding attitude, reaching cutoff or warming hardware does not satisfy that conjunction. If the utility cannot hold with existing paid authority, diagnose that outcome and stop; do not increase authority or replace the controller to pass this witness.
