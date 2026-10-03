# Final fresh Phase 7 review

**Verdict: actionable. One confirmed P2 source-provenance defect prevents a clean review of this target.**

## Scope and version

Independent same-harness fallback review, fresh on committed target `85a302db1237c9e71e3294fa3ba969c98edfc589`, compared with base `7a757d7`, in `/Users/stevewang/dev/StarShipSimulator-realism`.

This is assessment only. No repository edits, commits, merges, publication, concurrent gate, test, coverage, mutation run or build were performed. The executable investigation lives entirely under `/tmp`; it imports the committed source through Node's TypeScript-stripping loader and asserts the target HEAD before execution. It does not alter source, dependencies, dist or coverage.

Read AGENTS.md, the modernization goal contract and Phase 7 plan; applied sim-core, physics-change, frontend and verification conventions. Reviewed changed physics and its callers: actual engine arrays and paid ignition/fuel, mass/vehicle adapter, grid-fin/authority allocation, shared Verlet mechanics, attached aggregate COM and forces/torques, release readiness/failure and separated hull/COM continuation, catch geometry, forecast/prefix/publication authority, selected-body session/controller/manual routes, restart/preferences/history/debrief, both body renderers, nozzle heading/effect routing, camera/tower, and the associated proof, contract, scenario, browser and truth-registry tests. The enormous raw research-log diff was used as evidence, not treated as implementation.

## Finding

### P2 — Invalidate return authority when the ignition-risk preference changes

**Location:** `src/ui/session/session.ts:319–326`, specifically direct `toggleRandomFailure(loop.state)` at line 320 and the other-body command at line 324. Root command: `src/core/control/commands.ts`, `toggleRandomFailure`.

**Trigger:** Start the actual RTLS preset, enable auto-land, advance one canonical fixed tick so a return job exists, then toggle Random failure in the session. The same issue occurs when Ship is selected in a separated mission and the shared preference changes the unselected booster's policy.

**Mechanism:** Ordinary `applyControl` events clear both `boosterPrediction` and `boosterReturnPlan`, because those structures describe a particular future command/mechanical history. This preference command bypasses that route. It changes the policy consumed by `rollIgnitionFailure`, while retaining the old immutable forecast origin and any accepted future cutoff. The planner continues its old-policy cloned mechanics and can publish their validated result as authority for a live vehicle that follows a different ignition policy and has different actual engine outcomes.

**Reproduced evidence:** `/tmp/starship-phase7-provenance-repro.mjs`, raw output `/tmp/starship-phase7-provenance-repro.log`, exit 0, Node 25.8.1, asserts target HEAD.

- Default actual RTLS: first job origin has randomFailure=false. Session toggle makes live=true, retains the identical pending job and false origin; the next real canonical tick still retains the false origin.
- At live time 12.783333333333248 s, that job publishes a return plan with shutdownAt=13.641666666666532 s and originTime=0.008333333333333333 s. Its source preference is false while live preference is true; actual live engine 8 has permanently failed. This is real source/control execution, without fabricated candidate, fixture injection or manipulated clock.
- Toggling the preference again retains the identical accepted plan.
- Positive control: an ordinary pitch event clears both pending work and accepted plan. A same-value throttle event immediately after the risk toggle causes the next origin to carry the new true preference.
- Negative control: without a policy change, the same retained origin correctly matches the live policy.
- Mission control: after actual paid Stage/release, create a booster job, select Ship, toggle the shared preference; the unselected booster changes to true but retains its false-policy source and the identical job.

**Impact:** Forecast proof and cutoff authority cease to describe the flight that will execute them. The actual engine failure gives a concrete changed physical control history, beyond a display mismatch. Catch success is not claimed impossible or guaranteed: either result would not repair invalid provenance. The original default autonomous goldens and a high coverage percentage cannot exercise this interaction.

**Remedy:** Invalidate booster-owned pending work and accepted plan whenever the random-failure command changes the ignition policy. Putting `invalidateBoosterReturn(state.autopilot)` in `core/control/commands.toggleRandomFailure` is a suitable narrow root fix: this command is interaction-only, existing selected/other-body routing then covers both mission bodies, and deletion of absent optional fields preserves Ship's established state shape. Keep actual failed engines, ignition countdowns, fuel, RNG and clock unchanged. Add direct command plus real standalone session and selected-Ship/unselected-booster mission regressions for both preference directions, pending and accepted authority, next-source policy, and resource/RNG invariance. Follow the separate RED/Bug-fix ruling and preservation audit before release.

## Other review conclusions

No second actionable defect was established in the inspected target. This is not blanket certification of all possible mission configurations.

- The separated mission path now converts hull-point states to real COM translation and reconstructs rotating hull pose/velocity. The planner receives the same mission mechanical callback, rather than standalone mechanics with another reference point. The committed continuation tests independently integrate COM gravity/paid forces and cover rotation, fuel loss, ground support and hull-lug contact.
- Stage consumes actual per-body ignition/RNG and summed paid forces, maintains the attached constraint, cancels non-centre booster propulsion on request, and reports permanent required-centre failure without relaxing readiness. Partial Ship-engine capability is decided by actual axial force rather than a synthetic success flag.
- Catch remains a descending airborne lug crossing with frozen position/velocity/attitude bounds, failure/fuel checks, no attraction/snap of a missed trajectory and cancellation of later propulsion. Nominal handoff hints remain separate from fine mechanical contact validation. Work/trial caps and finite terminal expiry remain present.
- Debrief dismissal is retained per body; histories/recorders/timelines are selected projections of separate physical bodies; restart restores attachment and seed. Renderers have independent bodies/nozzle arms/effect pools. Booster world heading is assigned once, while the protected standalone Ship presentation branch remains retained.
- Protected legacy fixtures, workflows and existing eight Ship golden files have no target diff. Only two actual booster fixture files are added. Preset constants are retained; the explicitly approved adapter changes the physical vehicle for booster scenarios. The original Ship numerical preservation proofs compare against preserved arithmetic, rather than merely new implementation snapshots.
- Coverage floors in vitest.config.ts have no target diff. The coverage-contract archive reports 99.03% aggregate branches and physics 100%, and the added tests generally assert consumer/provenance/resource behavior rather than only execute branches. Some scheduling tests inject completed candidates to isolate branch contracts; actual original-source publication, per-scenario flight and browser catch tests provide separate physical witnesses, so those synthetic cases are supplemental, not flight proof.
- Truth rows retain the original bands and make source/cohort limits explicit. The generic ascent max-Q altitude OUT result is honestly preserved, and RVac Isp/dry mass/grid area characterize declared engineering approximations. Those rows do not validate a full-stack launch campaign or claim parked Phase 6b models shipped.

## Verification and remaining gaps

The isolated reproduction above is independently executed and controlled. Existing archived build/lint/coverage/truth/golden results were inspected as evidence, not rerun or presented as independent certification of this target.

The parent's ordered full gate was running during this review; no completed successful exit was obtained by this reviewer. Final full-five-browser and 21-mutation checks remain owed at the review cutoff. Browser specs were inspected and archived witnesses considered, but I did not drive a new browser session. Peer Claude and Pro are unavailable as reported by the parent; this is fresh same-harness fallback review, not a cross-vendor opinion.

**Release disposition:** fix the confirmed provenance defect, obtain focused affected-conclusion review and the required preservation/complete gate/browser/mutation evidence, then follow the normal merge path. This immutable target does not receive a clean merge recommendation.
