# Fresh independent diagnosis review — booster cycle3

**The planner still validates a different commanded trajectory from the one live mechanics executes.**

Two P1 defects and one P2 cadence defect are confirmed by short, independent mechanical controls.
They explain why a source-pinned, fine terminal catch can coexist with two failed actual returns.
They do not prove that fixing these three defects alone will catch both original returns.

## Scope and provenance

- Assessment only, 2026-10-02, in `/Users/stevewang/dev/StarShipSimulator-realism`.
- Read `docs/plans/modernization/modernization-GOAL.md` first, then the exact assessment packet in `docs/research/2026-10-02-phase7-booster-guidance/cycle3-source-consistency/review-packet.md`.
- Fresh same-harness independent reviewer. Not a cross-vendor review: the parent reports the peer CLI subscription and connected-browser fallback unavailable.
- All 22 files match `attempt3-source-sha256.json`, base `08c050df298479e12bce88711ff175f14df2dc15`. Recovery patch was not applied.
- No source/test/input edits, commits, merges, publications, delegated reviews, full gates or full preset-to-catch flights. The only saved file from this assessment is this review.
- Inspected callers, the shared Verlet path, atmosphere/wind, ignition/flow, throttle/gimbal/RCS/fin actuation and catch mechanics. No second force law or integrator was used for the witnesses.
- Cycle3 remains **3/3 exhausted**. No booster infeasibility, fallback, phase/release acceptance or phase7 completion is established.

## First rejected contact, not the final fuel value

The event archive reports hull coordinates; the lug coordinates decide eligibility.
`attempt3-event-summary.json` records these first descending plane frames:

| Return | Lug x | Lug vx | Lug vy | Pitch | Fuel | Immediate failures |
|---|---:|---:|---:|---:|---:|---|
| Sep | −4.706132 m | −2.740909 m/s | −1.652559 m/s | 0.064151 rad | 84,323.495 kg | all false |
| RTLS | −4.191490 m | −2.579392 m/s | −1.772580 m/s | 0.022358 rad | 88,390.324 kg | all false |

These are post-step observations near the crossing, not an independently reconstructed exact interpolated contact.
Both are well outside the frozen lateral position/speed bounds, while descent, pitch and fuel remain acceptable.
RTLS has already expired its terminal deadline and shut down at this frame.
Sep expires shortly afterward.
`src/core/step.ts` zeroes propellant on ground crash, so the final fuel0 does not establish that either first miss exhausted fuel.

The accepted predicted inputs differ materially from actual ready observations:

| Return | Forecast ready lug x / height / vy | Observed ready lug x / height / vy |
|---|---|---|
| Sep | 60.107560 / 2826.479554 / −277.966697 | 73.576268 / 2460.508514 / −254.540468 |
| RTLS | 4.680854 / 2782.515657 / −273.093717 | −7.818451 / 2951.437216 / −278.813609 |

Height is metres above the120m catch plane; velocity is m/s.
Actual engine-event frames are not immutable ready fixtures, so these comparisons show discrepancy, not a bit-exact reproduction or an allocation of causality among its sources.

## P1 — fractional candidate cutoff pays a different final impulse from live execution

**Locations:** `src/core/control/booster-forecast.ts:89`, `:95`, `:105–109`; `src/core/autopilot/booster.ts:191`; regression gap at `tests/core/booster-forecast.test.ts:117–129`.

The forecast truncates its last powered interval to the continuous `burnRemaining`.
Live mechanics completes an entire1/120s interval and only then shuts down when its interval-end time exceeds `shutdownAt`.
Changing the comparison to interval end repaired the earlier extra whole frame, but continuous candidate endpoints still do not lie on the live clock grid.
A fine terminal validation cannot correct this upstream fuel/velocity difference.

Smallest executed witness: from one identical local state with13 running engines and100% throttle, forecast a0.013s burn with `work.step=1/120`, then command its cutoff in live mechanical advances of1/120s.
Only two powered advances are needed on each side.

| Quantity | Forecast | Live |
|---|---:|---:|
| Cutoff time | 0.013000000 s | 0.016666667 s |
| Remaining fuel | 199881.131498471 kg | 199847.604485219 kg |
| VX | −2.020222618 m/s | −2.308052256 m/s |

Live spends33.527013252kg more and gains−0.287829639m/s additional VX.
RNG/start/authority are unchanged; this is the same engine/mechanical path with different paid time.
The existing cutoff regression uses0.25s, an exact30-live-tick duration, so it misses the defect.

The real traces show the same scheduling discrepancy:

| Return | Published cutoff | Actual cutoff frame | Delay |
|---|---:|---:|---:|
| Sep | 35.976411695 s | 35.983333333 s | 0.006921638 s |
| RTLS | 13.688233721 s | 13.691666667 s | 0.003432946 s |

**Necessary fix:** candidates must name and physically pay the actual executable live interval endpoint before validation/publication.
Root/probe durations may propose work, but the evaluated candidate must use the clock grid and never pay a fractional engine interval that live cannot execute.
Define this using the retained source clock and live tick arithmetic, including floating-point boundary behavior; a rounded diagnostic timestamp is not the authority.
Keep the existing control/physics ordering and live dt unchanged.

**Not proved:** how much of either final miss this cutoff discrepancy explains after nonlinear coast/entry guidance.

## P1 — paid-ready forecast suppresses the first terminal command that live delivers

**Locations:** `src/core/autopilot/booster.ts:242–243`; `src/core/control/booster-forecast.ts:114–125`, `createBoosterReadyWork`; `src/core/control/booster-prediction.ts:70–75`; regression gap at `tests/core/booster-forecast.test.ts:30–33`.

`boosterForecastHandoff` returns from policy as soon as all three terminal engines are running.
That skips arrival initialization/decrement, force allocation, attitude control and throttle command on the readiness frame.
The mechanical function still executes real actuator slew and reserve accounting afterward, using previous commands.
Live runs the terminal law before that same slew.
The validator clears the handoff flag but begins with the following physics interval, so it cannot recover the skipped command retroactively.

Smallest executed witness: a local terminal state at500m altitude, tower+10m, VX−1, VY−50, pitch0.01rad, two running centre engines and the third countdown1/240s.
Advance exactly one1/120s interval through `createBoosterReadyWork` and directly through `advanceMechanics` from identical inputs.
The returned kinematics, world time, propellant and ignition RNG match, but:

| Returned field | Ready forecast | Live policy |
|---|---:|---:|
| Commanded throttle | 100% | 74.796579950% |
| Delivered throttle | 100% | 99.5% |
| Gimbal position | 0% | −5% |
| RCS force | 0 N | −287325.210417 N |
| RCS reserve | 25s | 24.997007029s |
| Arrival deadline | absent | 15.744130184s |
| Pitch command | 0% | −28.774474842% |

The next physical interval therefore starts with different delivered controls and a different deadline.
The named existing readiness regression passes in isolation:1 passed,16 skipped.
It checks kinematics/world/propellant/RNG but does not compare delivered actuator/control state, RCS reserve or deadline.
Its phrase “bit-exactly” is too broad for those assertions.

**Necessary fix:** stop/observe the forecast at a complete production-equivalent returned readiness frame, after the actual first terminal command and its paid slew.
Alternatively split the shared mechanical advance at an explicitly shared pre-control observation boundary and resume both paths from that exact boundary.
Prefer the first option because it retains the established returned-frame contract and does not introduce a new mechanical stage.
The handoff estimate must describe the same state/deadline that the fine validator actually starts from.
Observation flags must not change delivered commands.

**Not proved:** that the one-frame command repair is sufficient for capture from the actual handoff discrepancies.

## P2 — terminal and entry ignition remain coarse, despite the paid startup consistency claim

**Location:** `src/core/control/booster-forecast.ts:84–89`.

Only boostback startup and alignment force live cadence.
Paid-ready return forecasts still advance terminal startup at0.05s, and entry startup is also coarse.
The same ignition/flow implementation does not mean the same startup trajectory: countdown expiration, burn-before-ignition ordering, gimbal/RCS delivery and event timing are dt-sensitive.
Terminal fine replay begins after the mismatch already exists.

Smallest executed terminal startup witness: local terminal input at3040m, tower−8m, VX−0.53, VY−278, pitch0.00057, omega−0.00075; no running engines; centre countdowns0.011,0.06,0.091s; throttle100%.
No new ignition draws are required because countdowns are already paid/scheduled in both inputs.
Compare the default ready forecast with `work.step=1/120`; stop at actual three-engine readiness.

| Quantity | Default forecast | Live cadence forecast |
|---|---:|---:|
| Readiness time | 0.100000000 s | 0.091666667 s |
| Mechanical advances | 2 | 11 |
| Height above catch plane | 2921.712489886 m | 2924.013577543 m |
| Lug VX | −0.540071745 m/s | −0.537507394 m/s |
| Lug VY | −277.469253402 m/s | −277.859738123 m/s |
| Fuel | 199964.831804281 kg | 199929.663608563 kg |
| RCS reserve | 24.999760098s | 24.999456584s |
| New ignition RNG draws | 0 | 0 |

A0.1s local window differs by2.301087657m in height and35.168195719kg in fuel.
This witness proves terminal startup mismatch; entry startup is the same exposed code branch, but its contribution to either full return is unmeasured.
The coarse coast/entry predictions are explicitly declared approximations, so ordinary integration disagreement is not a separate hidden-model defect.
The defect is admitting a terminal catch conditional on a coarse paid-ready input without establishing that the actual input remains supported.

**Necessary fix:** make discrete ignition/readiness and adjacent control transitions use executable live cadence, including the three-engine startup.
Keep coarser forecast steps where justified, but measure their effect on downstream admissibility rather than calling the shared integrator alone proof of equality.

## Bounded cycle4 approach

Use one coherent cycle: **make the command executable, preserve the complete handoff, then establish terminal support under measured upstream discrepancy.**
No model recalibration, authority increase, new integrator or catch changes are needed to begin it.

1. Add failing short controls for these three gaps first, retaining fractional cutoffs and arbitrary valid engine countdown phases.
   Expand the readiness comparison to delivered throttle/gimbal/fins, RCS force/reserve, engine countdowns, deadline/miss state, fuel and RNG, not just kinematics.
   Compare complete production state after stripping only forecast bookkeeping; do not strip a field that affects future mechanics.
2. Evaluate candidate cutoff on the live clock grid before every forecast/validation.
   Continuous root proposals should select executable endpoints; duplicate endpoint proposals must not waste the16-trial budget or acquire cutoff authority from interpolation.
   Preserve exact common-prefix arithmetic and logical step/time/fuel/RNG accounting.
   Carry a source-relative live-tick endpoint alongside forecast elapsed time; derive the executable cutoff from that source clock, including alignment/startup ticks.
   Pure numeric endpoint selection spends no mechanical advance; the selected endpoint must nevertheless receive the existing paid mechanical evaluation.
   Do not call a hidden extra `advanceMechanics` in rounding, admission or publication.
   Refinement windows replace forecast intervals inside the4000-step ledger and consume the scheduler's existing four-advance budget.
   Reused prefixes must match the same executable endpoint arithmetic, immutable source and all control inputs; count their logical time/steps without charging duplicated physical work.
3. Remove forecast-only suppression of the readiness command.
   Run the same terminal policy and slew before cloning the immutable handoff.
   Keep its initialized remaining deadline in the terminal replay; do not reset it or consume the readiness interval twice.
4. Use fine cadence for actual ignition/readiness and bounded event-adjacent transitions.
   Start with the short three-engine window; do not indiscriminately replace the whole return with1/120s forecasting.
   The historical Sep ready forecast already uses3409 steps and RTLS1674.
   A full319s live-cadence return would violate4000; startup/transition refinements must be explicitly charged and measured.
   Receipt timeliness must be tested for the final scheduler, not inferred from lower CPU latency.
5. Re-run only the existing first-source frozen-live calculator controls, with the corrected complete-handoff contract.
   Log executable cutoff, receipt, candidate count, every mechanical advance and all state/control fields at source, cutoff, terminal transition and ready handoff.
   Both must genuinely fine-catch under the frozen first-crossing limits, publish before their executable cutoff and remain within4000steps/900s,4advances per live tick and16candidate trials.
   RTLS currently has only about0.705s between receipt and requested cutoff; additional fine work across several candidates can consume that margin.
6. Before any full attempt, use short source-matched terminal/startup controls to test the measured discrepancy directions.
   Archived ready fixtures are exact inputs; recorded actual engine-event scalars are not.
   Treat reconstructed scalar cases as robustness diagnostics, never original-flight acceptance.
   If corrected first-source catches remain fragile to the observed ready-height/VX/VY/attitude differences, improve the bounded terminal guidance or measured coarse-transition handling before spending a flight.
   Separate position and lug-speed/omega behavior: both actual misses retain a substantial rotational contribution to lug VX.
   Do not revisit the rejected measured-point-alpha inversion, accept a coarse catch, or invent a capture force.
7. Require focused Ship bit preservation/guidance/RCS proofs, all existing booster controls, truth14/14IN, build and lint before the new source pin/patch.
   Then one changed-source, traced full attempt with `BOOSTER_TRACE=1` may consume cycle4attempt1 under standing approval.
   If that attempt is needed, capture immutable complete actual source/cutoff/pre-terminal/paid-ready states, so later short investigations can begin from exact inputs.
   Retain the prescribed starts/seeds and every physical/test/control/catch/work bound.

These are measurable admission conditions, not permission to keep extending a failed attempt.
There are at most three recorded full diagnoses in the new cycle.
Any new failure requires its own trace/hypothesis/result; no unchanged rerun.

## Alternatives rejected and uncertainty retained

- **All-return fine forecasting:** incompatible with4000steps, especially Sep. Fine event windows and measured downstream support must fit existing work/receipt bounds.
- **Merely adjust the interval-end comparison again:** cannot make a fractional planned engine interval executable at a fixed live dt.
- **Round `shutdownAt` only after validating:** validates the wrong impulse; round/select before physical evaluation.
- **Only assert more ready kinematic fields:** the first terminal command differs before the kinematics can reveal it.
- **Tune a target offset, seed, catch box or terminal speed to the two failures:** masks discrepancies without source-consistent mechanics.
- **Regard fine catches from coarse ready states as full-return acceptance:** establishes a conditional terminal catch, not the actual trajectory.
- **Infer model impossibility from the failed flights:** unsupported; physical short catches exist and confirmed command/replay gaps remain.

The exact division of observed ready error between steady boost/coast/entry discretization, cutoff quantization and readiness control suppression remains unproven.
No untraced/reconstructed actual ready state was called exact.
Fixes should be judged by executable equality and short terminal support first; both original full returns still require real catch acceptance.

## Reproduce the smallest controls without writing source

Run from the reviewed worktree.
The script bundles the current source in memory through the installed esbuild and executes a data URL.
It makes no source edits and runs no full flight.
The constants below are local diagnostic inputs, not changed presets/seeds.

```bash
node --input-type=module <<'JS'
import {build} from 'esbuild';
const code = `
import {createScenarioVehicle,PRESETS} from './src/core/scenarios';
import {advanceMechanics} from './src/core/step';
import {runBoosterPolicy} from './src/core/autopilot/booster';
import {createBoosterReadyWork,advanceBoosterForecast} from './src/core/control/booster-forecast';
import {cloneState} from './src/core/state';
import {SUPER_HEAVY} from './src/core/vehicles/super-heavy';
import * as C from './src/core/constants';
import {rad} from './src/core/units';
function local(){
 const s=createScenarioVehicle(PRESETS.find(p=>p.id==='rtls'),123).state;
 s.autopilot.autoLandOn=true;s.autopilot.boosterPhase='terminal';s.autopilot.boosterFallTime=15;
 s.kinematics.altitude=500;s.kinematics.downRangeDistance=C.starBaseXPos+10;
 s.kinematics.speedX=-1;s.kinematics.speedY=-50;s.kinematics.pitch=rad(.01);
 s.kinematics.angularVelocity=0;s.engines.running.fill(false);
 for(let i=0;i<3;i++){s.engines.running[i]=i<2;s.engines.ignitionCountdown[i]=i===2?1/240:null;}
 s.vehicle.throttle=s.vehicle.throttleCurrent=100;return s;
}
const s=local(),f=createBoosterReadyWork(s,rad(0),0,1/120);
advanceBoosterForecast(f,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
const l=advanceMechanics(s,1/120,runBoosterPolicy,SUPER_HEAVY);
const controls=x=>({throttle:x.vehicle.throttle,delivered:x.vehicle.throttleCurrent,
 gimbal:x.vehicle.gimbalPosition,rcs:x.forces.rcsThrust,reserve:x.vehicle.rcsRunTimeRemaining,
 deadline:x.autopilot.boosterArrivalTime,control:x.autopilot.pitchControl});
console.log('READINESS',JSON.stringify({forecast:controls(f.state),live:controls(l),
 equalKinematics:JSON.stringify(f.state.kinematics)===JSON.stringify(l.kinematics)}));
const b=cloneState(s);b.autopilot.boosterPhase='boostback';
b.autopilot.boostBackInitCompleted=true;b.autopilot.boostBackDirection=-1;
b.kinematics.altitude=100000;b.kinematics.pitch=rad(-Math.PI/2);
b.engines.ignitionCountdown.fill(null);b.engines.running.fill(false);
for(let i=0;i<13;i++)b.engines.running[i]=true;
const bw=createBoosterReadyWork(b,rad(0),.013,1/120);
while(bw.state.autopilot.boosterPhase==='boostback')
 advanceBoosterForecast(bw,1,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
let real=cloneState(b);real.autopilot.boosterReturnPlan={originTime:0,
 shutdownAt:b.world.environmentTime+.013,coastPitch:rad(0),
 handoff:{x:0,height:1,vx:0,vy:-1,time:1,lateralFeasible:true}};
while(real.autopilot.boosterPhase==='boostback')real=advanceMechanics(real,1/120,runBoosterPolicy,SUPER_HEAVY);
const impulse=x=>({time:x.world.environmentTime,fuel:x.vehicle.propellantMass,vx:x.kinematics.speedX});
console.log('FRACTIONAL',JSON.stringify({forecast:impulse(bw.state),live:impulse(real)}));
const c=local();c.kinematics.altitude=3040;c.kinematics.downRangeDistance=C.starBaseXPos-8;
c.kinematics.speedX=-.53;c.kinematics.speedY=-278;c.kinematics.pitch=rad(.00057);
c.kinematics.angularVelocity=-.00075;c.engines.running.fill(false);
[.011,.06,.091].forEach((d,i)=>c.engines.ignitionCountdown[i]=d);
const coarse=createBoosterReadyWork(c,rad(0),0),fine=createBoosterReadyWork(c,rad(0),0,1/120);
for(const w of [coarse,fine])advanceBoosterForecast(w,16,advanceMechanics,runBoosterPolicy,SUPER_HEAVY);
const ready=w=>({...w.result.handoff,time:w.result.time,steps:w.result.steps,
 fuel:w.state.vehicle.propellantMass,draws:w.result.ignitionDraws,reserve:w.state.vehicle.rcsRunTimeRemaining});
console.log('STARTUP',JSON.stringify({coarse:ready(coarse),fine:ready(fine)}));
`;
const r=await build({stdin:{contents:code,resolveDir:process.cwd(),sourcefile:'review-memory.ts'},
 bundle:true,write:false,format:'esm',platform:'node'});
await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
JS
```

The separate existing regression was executed with:

```bash
npx vitest run tests/core/booster-forecast.test.ts -t 'replays the selected coast plan'
```

Result:1 passed,16 skipped; this only confirms the partial regression's existing claim, not the complete handoff contract.
