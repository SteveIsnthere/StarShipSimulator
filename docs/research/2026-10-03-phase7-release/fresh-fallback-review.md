# Phase 7 fresh independent release review

**Do not merge this snapshot: the free-body continuation breaks the new mission's COM contract, and two further implementation defects remain after the inspected UI/render fixes.**

This is a fresh in-harness fallback reviewer, not a cross-vendor review. Claude's launcher failed its authentication preflight; ChatGPT Pro's Chrome route was unavailable. I did not invoke another review delegate.

Reviewed immutable implementation `87e3f287f9b704275adab5eb8201e091020b820b` against main `7a757d7`. Line references below belong to that immutable snapshot. The lead subsequently committed the dismissal fix at `91c15c6` and prepared a dirty plume-direction fix during this pass; both narrow follow-ups are assessed separately below. Any further implementation changes need affected-conclusion follow-up.

## Findings

| Priority | Finding | Disposition |
|---|---|---|
| P1 | Released bodies integrate geometric centres with mass-COM velocities | Open; physics acceptance fails |
| P2 | Enabled random-failure preference rejects physically successful return plans | Open |
| P2 | Inner booster exhaust applies hull pitch twice | Confirmed on snapshot; closed by inspected dirty follow-up |
| P2 | Permanently failed required centre engine leaves Stage reporting startup forever | Open |
| P2 | Dismissed debrief reopens on the next session advance | Confirmed on snapshot; closed by inspected dirty follow-up |

### P1 — Preserve a consistent reference point after physical release

Location: `src/core/mission.ts:158–160`, with the incompatible inputs produced at `src/core/mission.ts:121–126` and explicitly described by `bodyMassPose` at `src/core/mission.ts:66–71`. Downstream integration is `src/core/physics/step-dynamics.ts:406–411`.

Attached derivation writes each body's **geometric hull position**, but writes the **mass COM velocity and acceleration** into that same kinematics object. At release, the separated branch passes it directly to the ordinary `step`. That integrator advances `altitude/downRangeDistance` using those velocities. Rotation then changes the offset between the hull centre and its mass COM, so reconstructing the physical mass COM produces additional motion that was never paid by a force or release impulse.

For constant propellant, let `d = centreOfMass(propellant, model) - model.height/2` and pitch be clockwise. The physical coordinates satisfy:

```text
xCOM = xHull + d sin(theta)
yCOM = yHull + d cos(theta)
vCOMx = vHullx + d omega cos(theta)
vCOMy = vHully - d omega sin(theta)
```

The implementation stores the left-hand velocity as `speedX/Y` but integrates `xHull/yHull` with it. Thus the derivative of reconstructed `xCOM` gains the last rotational term again. This is not a tolerance issue or an intentionally applied separation impulse.

Actual paid-release reproduction: `/tmp/starship-phase7-release-continuity-repro.ts`. Start the real seeded attached mission with aggregate angular velocity `0.1 rad/s`, lift its altitude into negligible atmosphere/gravity, and request Stage until real engines produce release. Switch off propulsion immediately after release to isolate continuation. Advance one shared fixed tick. The returned rotation is `0.1000958387 rad/s`.

| Body | Stored COM speedX | Reconstructed COM displacement / dt | Difference |
|---|---:|---:|---:|
| Ship | 1134.2778617 m/s | 1133.6385736 m/s | −0.6392881 m/s |
| Super Heavy | 1130.2144597 m/s | 1129.2460482 m/s | −0.9684115 m/s |

A simpler torque-free separated-body control is retained at `/tmp/starship-phase7-physics-repro.ts`: zero stored COM translation and `1 rad/s` rotation produce reconstructed COM speeds of approximately −10.3576 m/s for Ship and −15.7023 m/s for booster on the first tick. Gravity cannot cause that horizontal movement in this setup.

Why it matters: the advertised no-kick physical separation proof holds only at the release instant. The immediately subsequent physical trajectory violates its own COM representation. Catch-point velocities, aero inputs and telemetry inherit the inconsistency. The existing hot-stage momentum test stops at the release state, while the next-tick test checks only that the hull gap increases.

Recommended correction: keep this change confined to the new mission path and reuse the extracted kernels. Establish one explicit canonical reference point for each body. Integrate the actual mass COM in mission free flight, then derive the geometric hull pose and matching point velocities/accelerations for existing geometry, catch, guidance and presentation consumers. `bodyMassPose` must recover actual COM velocity from that canonical representation. Do not globally change standalone Ship arithmetic.

Merely changing `deriveBody` to write hull velocities fixes the first derivative but is incomplete: integrating those hull velocities under COM force acceleration still omits rotational point acceleration. The acceleration transformation requires the corresponding alpha/centripetal terms:

```text
aCOMx = aHullx + d(alpha cos(theta) - omega² sin(theta))
aCOMy = aHully - d(alpha sin(theta) + omega² cos(theta))
```

Use a RED-before-fix mission continuation test with nonzero rotation and unequal COM offsets. Follow several free steps with constant mass and no propulsion/aero, compare against independently integrated COM motion, and check momentum/pose continuity through the actual release. Add torque and fuel-changing cases. Preserve the standalone Ship proofs and all ten existing fixtures without reblessing. The repair may require a bounded mission adapter around shared dynamics rather than an unconditional change to `step`.

### P2 — Separate failure preferences from realized failures

Location: `src/core/control/booster-prediction.ts:125–127`, consumed at `:203–205`.

`physicallyCaught` rejects `Object.values(state.failures).some(Boolean)`. That object contains `randomFailure`, the operator's enabled preference, as well as realized failures. Consequently every fine validation with random failures enabled is rejected even when no fault occurred and the shared mechanics physically caught the booster.

Reproduction: `/tmp/starship-phase7-random-setting-repro.ts`. Replay the committed RTLS paid-ready state through the actual terminal mechanics at `1/120`. With the preference false **and** true, it catches with every realized failure false. Supplying that completed physical validation to the scheduler accepts a still-future candidate when false and rejects the identical successful outcome when true. The completed-work setup isolates publication; it does not manufacture the terminal catch.

Why it matters: a preserved player capability makes return-plan acceptance impossible regardless of whether an engine actually fails. It can keep a boostback burning because the shutdown decision never becomes eligible.

Recommended correction: evaluate explicit realized failure flags, excluding configuration preferences. Share the predicate if multiple consumers need it. Add the successful enabled-preference positive control and a realized-failure rejection control. Do not alter RNG draws, rates, capture bounds or default-seed goldens.

### P2 — Use the world gimbal angle once for booster plumes

Location: `src/view/emissive-bell.ts:117`. The current test repeats the defect at `tests/view/booster.test.ts:46`.

`getGimbalPointingDirection` returns a world angle, `pitch - commandedGimbalAngle`. The renderer adds hull pitch again for gimballed booster engines. With a 45° hull and neutral gimbal, the inner engine plume rotates 90°, while a fixed outer engine plume rotates 45°.

Actual renderer reproduction: `/tmp/starship-phase7-plume-direction-repro.ts`, which constructs the real Pixi bell, computes the core's neutral world direction and updates both an inner and outer mount. Output: hull `45`, inner plume `90`, fixed outer plume `45` degrees.

Why it matters: visible thrust points the wrong way during boostback/staging whenever the booster is tilted. This contradicts the physical engine-direction presentation and cannot be deferred as merely detailed artwork.

Recommended correction: assign the world gimbal direction directly for steerable booster mounts and hull pitch for fixed mounts. Replace the mirrored-expression test with neutral-angle and nonzero-gimbal cases derived from the actual core direction. Preserve the existing standalone Ship presentation behavior.

Narrow follow-up disposition: I inspected the lead’s dirty one-ternary correction and its literal neutral45°/deflected42° versus fixed45° regression. The default Ship branch remains hull pitch. The identical actual renderer repro now returns `45°/45°/45°`. This finding is closed for those dirty source edits; their build/focused checks remain the lead’s verification obligation.

### P2 — Report an impossible Stage as failed

Location: `src/core/mission.ts:200–205`, presented by `src/ui/shell/Controls/MissionControls.tsx:20`.

The failure branch recognizes all failed Ship engines and breakup, but release requires every central booster engine to be running. A permanent failure of any required central engine makes that condition impossible, yet `stagingFailed` remains false. The UI keeps saying “Starting engines”, with Stage permanently disabled.

Actual fixed-step reproduction: `/tmp/starship-phase7-stage-failure-repro.ts`. Mark only booster engine 0 failed before requesting Stage, then advance 360 normal fixed ticks. The stack remains attached, Ship thrust is `14.832820 MN`, central flags are `[failed, healthy, healthy]`, central running flags are `[false, true, true]`, and `stagingFailed` is false. The failed engine cannot recover under the engine state machine.

Recommended correction: report permanent inability to satisfy the explicitly required engine condition. At minimum, a failed required central mount is a Stage failure under the current release contract. Keep real delay/readiness and partial healthy Ship-thrust cases distinct; don't turn ordinary pending ignition into failure or invent a release. Add one required-engine-failed control alongside the existing all-Ship-failed witness.

### P2 — Dismissal must update the owning body history

Snapshot location: `src/ui/session/session.ts:223` and `:332–333`.

`dismissDebrief` clears only the store. The next `session.advance`, including a paused zero-time advance, restores `histories.selected.debrief` to the store. Closing the report therefore lasts only until the next RAF for both Ship and booster.

Actual session reproduction: `/tmp/starship-phase7-review-repro.ts`. Construct a real headless session, expose a crash report through a fixed tick, dismiss it, pause and call `advance(0)`. Snapshot output: `CRASH → null → CRASH`.

Narrow follow-up disposition, committed by the lead at `91c15c6`: the lead added `histories.dismissDebrief()` to clear only the selected history's card before clearing the store. I inspected the dirty production diff and the two new session tests. They preserve `ended`, recorder, watch and timeline; test paused/no-step persistence, fresh reports after restart, and per-body selection/dismissal. Running the identical actual session repro on that follow-up now yields `CRASH → null → null`. This finding is closed for those inspected dirty edits. I did not run or claim its browser results; the lead owns those.

## Reviewed implementation and acceptance

The review started with the modernization goal contract, Phase 7 plan, project AGENTS and physics/sim-core/frontend/verification skills. Scope was established from the base-to-immutable-head source/test diff, not evidence summaries alone.

Reviewed areas included:

- Model definition/dispatch, 71×9 m geometry, 3400 t tank capacity, 33 mount allocation, 13 steerable mounts, 3/10/20 operator groups, per-engine ignition and pressure thrust/flow, moving tank COM/inertia and model propagation into forces/contact/guidance.
- Shared dynamics extraction and Ship preservation proof fixtures, original arithmetic operation order, ground/failure/fuel ordering and proportional paid booster RCS/grid-fin behavior.
- Actual tower lug geometry, crossing interpolation, fixed position/speed/pitch bounds, failed/ground/upward rejection, securing/shutdown and missed-crossing nonmutation.
- Booster boostback/entry/terminal policies, delivered versus requested actuator credit, fixed terminal deadline, return plan candidate validity, source-owned forecast work, executable tick durations/prefix provenance and fine terminal validation/publication.
- Attached force and torque aggregation about real COM, parallel-axis inertia, release readiness, actual propulsion payment, per-body constraint loads, shared clock and accumulator/warp/pause/restart adapters.
- Selected-body control and editor routing, separate recorder/timeline/watch/debrief histories, selected model HUD/engine counts, physical booster/tower rendering, independent effect pools, camera pair framing/selection, new browser witnesses and their negative controls.
- Meaningful force, catch-boundary, failed-engine, model-propagation, exact Ship proof, forecast/prediction, mission, rendering, golden and original-scenario tests. This was a bounded review; it is not a claim to have executed every changed test.

Independent fixture inspection confirms all **eight original Ship golden files are byte-identical** between base and immutable head. Both added booster fixture hashes match the committed Linux/x64/Node22 artifact audit. The additional goldens replay actual selected-model state/control leaves and enforce airborne catch/positive fuel; nested future work is excluded only from sampled golden serialization and receives separate exact planner tests. The retained artifact declares about 89.426 t and 90.447 t final fuel. This is fixture/provenance verification, not a fresh execution of the full golden flights.

I found no need to weaken the frozen 120 m lug plane, ±2.25 m catch width, 4.5 m/s downward limit, 1 m/s lateral limit, 5° pitch limit, 900 s scenario cap, 1533 K thermal limit, original starts or RNG authority. The findings above can be repaired without changing those contracts.

## Release acceptance remains incomplete

The lead's complete current coverage run is attributed to the lead, not this reviewer: 2186 tests passed across 183 files, but unchanged floors remain **red**. Reported global statements are 98.39% and branches 95.8%; physics branches are 99.29%; autopilot lines/statements/branches are 98.52%/97.29%/93.57%. A passing test count does not close coverage acceptance.

Required before release:

1. Repair the three open defects with genuine failing-before/fixed-after witnesses and affected-conclusion review.
2. Close unchanged coverage floors without lowering them or adding vacuous tests.
3. Complete the ordered gate on the final source, full five-project browser suite, mutation campaign and truth report; measure the actual gate/bundle requirements rather than infer them from focused runs.
4. Reconfirm original control parity, intro/presets/pig and all eight unchanged Ship fixtures on final source. Preserve the two approved booster fixtures unless an independently justified physics change truly reaches them.
5. Only after clean final review and acceptance: merge, run main gate, verify hosted deploy and the live exact build, then close Phase 7 documents. No merge/deploy/live acceptance is supplied by this report.

The prior hosted snapshot's coverage failure and the narrower 20/20 catch/restart browser evidence do not waive these obligations. Known portrait catch/debrief/control occlusion and landscape clock clipping remain recorded Phase 8/9 debt; they are not represented here as closed UX acceptance.

No source edits, commits, pushes, merge, concurrent gate, coverage or browser run were performed by this reviewer. Only isolated scratch scripts and this report were written under `/tmp`; all diagnostic commands returned their actual exit status.
