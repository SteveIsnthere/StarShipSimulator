# Fresh independent Task 3 review — 2026-10-02

**The one confirmed Task 3 defect is fixed and passes the reviewer’s targeted recheck.**
Manual intervention now invalidates a trajectory-derived future cutoff before policy can execute it.
The autonomous physical/golden work has no additional confirmed defect in the inspected scope.
Generic booster autopilot controls remain a Task 5 integration obligation.

## Scope and identity

This is a fresh same-model independent fallback assessment, not cross-vendor approval.
Reviewed from `/Users/stevewang/dev/StarShipSimulator-realism`, branch `claude/super-heavy`, base `081d2c62d04ae952befb60603e187f0e08266dc7`.
The immutable recording source is `213307f3bbc4bca6fc518013115bddfaa99ec4e1`, tree `f88b5e7909759ea77e0047c1ed537de0bcce427e`.
I verified all 28 entries in `recording-source.json` against that immutable commit: zero mismatches.

The Linux recording artifact and later `booster-replay.test.ts`/unification audit additions were inspected separately.
Those later files are not attributed to the immutable recording snapshot.
Both downloaded booster fixture hashes match `linux-audit.json` and the replay test digest literals.
All eight existing fixture files compare byte-identically with the base commit in this reviewer checkout.

Read the project guide, sim-core/physics-change/verification skills, modernization goal and Phase 7 plan, architecture and physics-model references, changed runtime, caller/control paths, mechanical/prediction/command/terminal tests, recording/replay/serializer/comparison code and saved original flight events.
No implementation edit, commit, push, regeneration or complete original booster flight was performed by this reviewer.
The only owned repository file is this report.

## Confirmed Task 3 finding

### P2 — Invalidate pending and accepted cutoff authority when manual input changes its physical source

**Location in recording snapshot:** `src/core/step.ts:261–263` and `655–661`; `src/core/control/booster-prediction.ts:195–213`; `src/core/autopilot/booster.ts:159–176` and `209–211`.

**Trigger:** Start an automatic booster return, allow its first planning source to be captured, then provide an explicit throttle/pitch override while `manualControlOn` remains false.
This is supported by `StepInput`; the step contract expressly says the manual input overrides automatic controls.

**Observed short real-code witness:** Build the RTLS selected-model state, enable auto-land, advance one `1/120 s` step, then advance one step with `{pitchControl:100, throttle:40}`.
The prior planner source survives and continues:

| Field | Planner origin | Returned live state |
|---|---:|---:|
| environment time | 0.008333333333333333 | 0.016666666666666666 |
| pitch command | 0 | 100 |
| throttle command | 100 | 40 |
| manualControlOn | false | false |

The forecast continues to replay its immutable unmodified control law, while the live actuators slew toward the operator's different command.
The scheduler later checks physical catch in that old future and future shutdown time, but does not invalidate the old source for the intervention.
An already accepted plan also survives the same input; boostback consumes its shutdown timestamp without a source-change check.
Thus “fine-validated, still-future” remains true of the forecast while its source-matching premise is false for the live flight.
This is a provenance defect even if a particular small intervention happens to remain recoverable.

**Remedy:** Before booster automatic policy can consume an old cutoff, invalidate pending and accepted return authority for a manual override that departs from the planned control sequence.
Make the takeover/re-arm policy explicit and derive any resumed plan from the actual returned state.
Keep prior-frame purity, paid actuator/RCS/fuel/RNG semantics, and autonomous trajectories unchanged.
Do not solve it by loosening catch limits, accepting a coarse catch, or replaying the old source with a new timestamp.

**Required RED→GREEN controls:** Intervene during an in-progress job and after a real or contract-valid accepted plan; assert neither old job/source nor old cutoff remains authoritative, including an intervention on its execution tick.
Retain the existing positive control for proportional automatic RCS and manual full-yoke RCS.
Explicit `manualControlOn` already clears work/plan in `runBoosterAutopilot`; cover that as the independent takeover path rather than assuming raw `StepInput` sets it.

**Disposition:** Fixed during review and independently rechecked on the additive working-tree correction.
`invalidateBoosterReturn` removes both pending and accepted authority on the owned autopilot object.
`advance` calls it on the cloned incoming state for explicit pitch/throttle input, before automatic policy can consume the old cutoff.
Post-step prediction captures the complete returned overridden source.
The existing manualControlOn cleanup calls the same helper and still suppresses prediction while manual control is active.
The no-input autonomous path is unchanged by this branch.

Three added controls cover replacement source plus prior-frame purity, an accepted cutoff on its execution tick, and the existing explicit manual-control path.
Independent reviewer command/prediction/mechanical recheck:38 tests across3 files pass, exit0.
This closes the StepInput/core finding; player control-event routing remains the explicit Task5 obligation below.

## Task 5 obligation, not a Task 3 autonomous-flight rejection

### P2 — Booster dispatch bypasses generic autopilot capabilities

**Location:** `src/core/autopilot/index.ts:770–781`.
Super Heavy dispatch returns before `autoMaxThrust`, `pitchHold`, or `autoTakeOff` runs; the booster controller handles only auto-land/boostback.
A short real-code witness enables `autoMaxThrustOn` at throttle40 and calls Super Heavy `runAutopilot`: the flag remains enabled and throttle remains40.
Pitch-hold and takeoff flags likewise have no booster handler.

Task 5 must supply model-aware equivalents and actual UI/caller witnesses before the booster phase reaches release.
Blindly running the old Ship takeoff/hold controller on Super Heavy would not be an adequate fix.
The implementation owner explicitly retained this as required Task 5 capability integration.

The caller boundary also matters for the provenance finding: current `applyControl` mutates state via core commands, and the normal app loop does not require explicit `StepInput`.
`yokeGrab` sets `manualControlOn` only when pitch hold is enabled.
The planned model/mission integration must route manual engine/pitch/throttle events through the same invalidation/takeover contract; a StepInput-only fix is not complete player-facing protection.

## Numerical and architectural conclusions

- The supplied-control mechanical seam calls the existing integrator, engine/fuel/RNG and actuator phases in their existing order. Forecast control is nonrecursive. No alternative production force integrator was introduced.
- Resumed jobs clone the mutable rollout state/result and replace retained candidates/arrays rather than mutating prior published frames. Source and prefix reuse are constrained by source identity, mechanics, policy, model, coast and timestep. Existing exact controls cover startup/prefix/fractional cutoff mechanics and prior-state purity.
- Canonical burn duration maps to whole live ticks; final partial burn work is paid in live-sized intervals. Startup/readiness and alignment use live cadence. Default coarse coast/steady work is an approximation, not an all-flight bit-exact proof; the finite fine terminal replay and original flight acceptance remain essential.
- Range response, cubic balance and frozen-environment support are search hints. The reviewed production path requires paid physical readiness, actual fine terminal capture and a future executable cutoff; derivatives do not directly command cutoff. Invalid trajectories are not valid bracket endpoints.
- Terminal translation requests real gimbal direction while attitude uses delivered grid/gimbal torque and bounded proportional rotational RCS. Slew, throttle floor, fuel and RCS reserve remain paid. No direct translational RCS force or capture override was found.
- The catch geometry/velocity/attitude bounds are unchanged. Saved attempt2 final events show real first descending plane capture at tick40727 for separation and tick14495 for RTLS, with positive fuel89,425.6865159661kg and90,446.76144551557kg. Those are read evidence, not new flight runs.
- The booster finite initial pitch history is narrowly constructed at the actual preset pitch; Ship's legacy shape/arithmetic is retained. The stored immutable planning source exposes finite history rather than masking it.
- No confirmed maintainability defect beyond the control/provenance boundary above. New modules have coherent responsibilities and remain within core's dependency wall.

## Golden integration assessment

Workflow `37100120181` records the exact immutable snapshot on Linux/x64/Node22.
The artifact audit's eight existing recordings are byte-identical, independently confirmed against the base checkout.
The new files contain1801 samples/108000 steps at1/120s for each actual selected-model booster return.
Their final airborne/fuel outcomes match the accepted original flights.

The sampler removes only `autopilot.boosterPrediction`, preserving live physical leaves and selected cutoff/handoff decisions.
The dedicated exact planner tests and recursive original finite-state acceptance retain coverage of that excluded future-work tree.
Union keys preserve sparse optional live decisions; strings are serialized and compared as scalar values.
No Ship replay tolerance or digest assertion was removed.

The later replay integration checks exact recording-platform scalar comparison and the existing measured tolerance elsewhere, unexpected live keys, union-undefined optionals, complete file digests with discrimination, exactly the two declared recordings, cadence/sample length and real airborne/fuel/failure/pose acceptance.
I found no additional confirmed defect in that additive integration.
I did not run its full trajectory replays while the owner was running them.

## Evidence and limits

Reviewer-run focused command:
`npx vitest run tests/core/booster-burn-bound.test.ts tests/core/booster-prediction.test.ts tests/core/booster-command.test.ts tests/core/mechanical-advance.test.ts tests/golden/booster-record.test.ts`

Result:39 tests across5 files pass, exit0, macOS arm64/Node25.8.1.
The intervention and max-thrust witnesses used bundled real source in memory and each advanced at most two live frames.
No repository implementation/test files were created by those calculators.

The owner-supplied2120-unit baseline, original4-flight result, focused110 checks, build/lint/truth and successful Linux workflow are broader evidence with the attribution stated above.
They do not substitute for the new RED→GREEN intervention control or the final source's required complete gate.
Coverage, full gate, independent whole-Phase7 release review, Task4/5 integration and merge/deploy remain outside this review's acceptance claim.

**Task3 conclusion:** No outstanding confirmed Task3 defect remains after the targeted correction and reviewer recheck.
Retain the final-source/fixture preservation checks and complete the planned gates before the coherent checkpoint.
No phase completion, clean release review, main merge or deployed booster acceptance is asserted here.

## Additive correction identity

The following working-tree correction bytes were read and rechecked after the immutable recording snapshot:

- `src/core/step.ts` — SHA256 `eb4014c63c7123e91e9d779da0dbb17be92af8d30c80937c68f908b92c59a8d0`
- `src/core/autopilot/booster.ts` — SHA256 `fbdf28803fcc5f64e7154e0a57047ad26550c1c9cdbb16deecdb242d0e256c48`
- `src/core/control/booster-return-plan.ts` — SHA256 `bb72abeefb8334dd9847362a448eaa918616110c6ca53a92ed6d9d4915392990`
- `tests/core/booster-command.test.ts` — SHA256 `9cc773915708708c86f7bcf35943262ce82a8ea90ef3f7b0f01fe47a20d45dee`
