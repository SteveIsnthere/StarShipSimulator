# V3 integration regression disposition — 2026-10-03

The original broad core sweep is70fail/1136pass; focused greens below are not a replacement full sweep or release gate. Do not delete negative evidence or silently call original failures resolved before each cohort is exercised.

## Production defects corrected by parent

- First-tick terminal failure could freeze an uninitialized infinite pitch rate. Use actual angular velocity when history is the initial sentinel. Four terminal witnesses pass.
- Terminal parent could continue reporting the preceding paid engine force forever. Capture retains that paid force only on the failure interval; later intervals and incoming impacts clear propulsion without mutating the stored terminal event. New witness observedRED thenGREEN.
- RCS spent a full interval with less reserve than required. The final interval now delivers only the paid fraction and ends at zero; every fully funded interval retains the exact old drain expression. Six signed120/240/480Hz impulse witnesses observedRED; full focusedRCS cohort37passes. The natural proof trace before this fix remains historical evidence; refinement must use current paid behavior.
- Fin fraction took an unnecessary area multiply/divide round trip, disagreeing1ULP with unloaded initialization. Accumulate each physical flap's half-pair fraction directly while retaining force area; original exact-equality assertion retained.20focusedpass.

## Test reference corrections

- Energy belongs to physicalCOM. V3 publishes the geometric hull point; the invariant now independently transforms radius/velocity and reads the preservedCOM event after terminal release. Same200seededcases,120steps and1e-12GM/r slack;4pass. This is not a new energy allowance.
- Intro's old26m assertion represented1m clearance over the former25m half-height. It now asserts the same1m clearance over V3's26m half-height. Core intro policy/preset unchanged;22terminal/intro/invariant tests pass. Pad-rest assertions likewise use exact selected half-height.
- Felt weight on the pad uses the physical mass station's gravity, preserving12decimal-place agreement. The discriminating13g witness commands V3 at the analytically equivalent Raptor2 thrust: full V3 thrust exceeded both felt and net bounds, making the old premise false. All13g/50kPa/1533K bounds stay fixed.
- Breakup leaves no ghost120t parent: assert zero parent mass/inertia plus preserved dry-mass terminal ledger and detached inventory. Paid failure impulse/next-frame shutdown assertions remain.
- Wind drag ratio divides out the current projected area because wind changes incidence; original9digit v² check retained. Returned Mach comparison uses returned gust components, since endpoint turbulence is part of air velocity.25step/wind checks pass.
- Hover thrust-to-weight law does not compensate aerodynamic drag. V3 startup reaches enough upward speed that drag exceeds the old.02m/s² allowance. Preserve the.02 band and account for measured vertical drag separately; no control-law change. Four hover checks pass. Initial physicalCOM-only correction remainedRED and is recorded.
- Two upright40km fall characterizations used old mechanics that continued translating after breakup. Preserve those explicitly under the historical profile/null damage and keep the original3%/5% timing and distance bounds. Add actual V3 witnesses proving those same uncontrolled trajectories terminate under original guards. Otherthree fall cases remain activeV3.
- Burn agreement reference now observes physicalCOMstart/stop, but one3km/150m/s/one-engine70tfuel case remainsRED4.483m vs2.28749m bound. Do not widen it; source diagnosis assigned. Other27guidance-reference tests pass.
- Coast diagnostic target uses actual authored catch plane converted to hull centre, preserving exact slope/neutral/countdown assertions.12pass.
- Recorded pre-V3 terminal admission fixture uses explicit Raptor2profile/null damage; all cone/deadline assertions intact.9pass.

Other agents retain separate cohort evidence for105control/propulsion,40grid/booster/staging/catch and52landing/control checks. These migrations require independent review before release, especially transformed test premises.

## Still unresolved

- Existing1459K±5K deorbit characterization versus newV3~1452.31K: distinguish approved-generation regression from immutable physical/reference truth before any edit. No bound or expected peak changed.
- Source-provenance guard and scheduling liveness; retained-hardware guidance boundaries; complete current suite/truth/goldens.
- Current shared grid-hinge correction declared separately, not yet applied.

## Current integration follow-up

- Historical orbital heating characterization remains1459±5K and passes through shared mechanics with explicit historicalShip/Raptor2 and null-damage cohort. ActiveV3 retains all flight acceptance and absoluteheat limit, plus a separately identified1452.314±5K measured characterization. Focused2pass/30filtered; fullsuite not rerun. Independent reviewer body_moment_review recommended cohort separation, then verified historical result.
- PhysicalCOM-preserving external attitude constraint repairs the forward burn reference without changing predictor or its agreement bound; guidance reference28/28pass.
- Shared grid hinge now64.8m=.90H, matching the source declaration made before flight checks; RCS and catchlug retain distinct inherited stations.47focusedgeometry/torque/partition tests pass.
- Current repository lint exits0 with one pre-existing BlackBox useMemo warning.
- Retained-hardware guidance100focusedpass. Source-provenance observer23relatedpass/1RED: actual evolvingbooster-sep has no acceptedfutureplan before13gterminal; oldfour-search baseline shares failure. Bounded root/candidate diagnosis remains open.
- Terminalcamera14focusedpass and fresh desktop/phone captures passphysicalpiece visibility; no fullvisual/performanceacceptance. Phonefailuredebrief obscuresearlybreakup, carried intoPhase9.

## Natural progression and paid-force verification

The 120/240/480 Hz natural-flight refinement retains in-domain proof loss below all global guards. Event times are 645.833333 / 645.816667 / 645.812500 s; common-time applied weakening has apparent order 0.997. Near-loss maxima are slightly nonmonotonic, so the result is not blanket convergence of every observable. See hold-refinement-outcome.md.

A durable cold-origin integrated regression now passes in tests/core/damage-natural-flight.test.ts. Its counterfactual changes only root thermal state in a separate clone at the same physical state and command; a real-step velocity difference proves thermal weakening affects paid motion. The clone never rejoins the flown trajectory. Natural detachment and irreversible loss remain below the unchanged guards.

The independently reproduced paid-force epoch defect is fixed with explicit paid world-vector acceleration fields. Guidance subtracts those original observations while endpoint retained mass and engine support determine future authority. The historical null-damage equations remain unchanged. Forty-six focused tests, including historical full-state proofs, pass; field additions still require the complete Linux golden audit.

Current truth report exits 0: all 17 Tier A rows IN, 25/26 total rows IN. The historical generic Tier B max-Q altitude limitation remains OUT at 9,528 m versus 10,000–15,000 m. No band or source coefficient was changed.

Golden recording has not run. Its sampler now retains observer lineage, validity and issued policy events but omits the two owned future-state snapshots, matching the existing search-job exclusion. All live damage/force leaves remain sampled. Three sampler contract tests pass.

## Complete unit sweep 2 — current V3 integration

The current Mac run exits 1: **39 failures, 2,556 passes, one configured benchmark skip in 242 files; 346.45 s**. The command attempted to exclude the two golden replay files using CLI flags, but the project configuration still included them. This is a complete unit run including those known-red fixtures, not a successful non-golden selection. No fixture changed. Raw output and exact failure names are saved in v3-full-unit-sweep-2.txt and v3-full-unit-sweep-2-failures.json.

The 39 failures divide into ten expected old-fixture/schema mismatches, eleven execution timeouts, seven actual booster flight/publication failures, and eleven HUD/editor/debrief regressions. All other current unit files pass. Long orbital tests exceed their unchanged 30-second execution allowance under the normal six-worker batch; extending the timeout is not the remedy. A standalone 200,000-step circular-orbit profile takes 3,457.98 ms, about 17.3 microseconds per step; steel enthalpy inversion accounts for roughly 47% of sampled simulation time. Its certified fast path frequently falls back to the original full bisection.

RTLS now fails as well as booster separation; the supported-candidate priority and source receipt must be restored generically, without preset or seed tuning. Seed123 booster separation fails at the previously recorded acceleration terminal; the default-seed complete flight instead reaches a fuel-exhausted ground crash near341.6s. Both acceptance paths remain binding.

The HUD cohort includes a real first-impact witness bug: terminal mechanics clear current velocity, and the watcher skips crashed frames, producing a generic landing-envelope explanation. Preserve and correctly interpret the original terminal snapshot rather than weakening the crash-reason assertions. Other editor assertions still name pre-V3 tank capacity/contact height; their model premises need explicit migration while all capability and numeric bounds remain intact.
