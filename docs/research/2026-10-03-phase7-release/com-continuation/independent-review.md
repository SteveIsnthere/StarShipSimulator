# Phase 7 mass-centre continuation: affected-conclusion review

**Conclusion: close the original P1 COM/hull continuation finding at `3047632c73eac9a0c57dcb0ba5591a88f82a06af`.** I found no actionable defect in this correction. This is an independent in-harness fallback review continuing my earlier round, **not a cross-vendor review**. The peer CLI authentication and Chrome/Pro availability failures recorded in the original review still apply.

This conclusion covers the mission reference-point correction and its affected callers. It is not approval of the whole Phase 7 release. The original randomFailure-preference planner rejection and permanent required-centre-engine staging-status findings need their own fixes and review; the previously red coverage floors and remaining full release checks also remain outstanding.

## Source pin

Reviewed the dirty source atop `9a290f6b78b6cf6dc16f38c2abe64c812d1600e9`, then verified the same runtime and final tests in commit `3047632c73eac9a0c57dcb0ba5591a88f82a06af`. SHA-256:

| File | SHA-256 |
|---|---|
| src/core/mission.ts | d23c6b6970696232ce378b9954d3ed4611b438a5c8359fc4a733ce8c0ae12865 |
| src/core/mission-free-flight.ts | fd1a408a70ca9879f32291a43f30f6b86295c68716bb0112de5f406b37e700e0 |
| tests/core/hot-staging.test.ts | 20ec8bc067edbf111e77b0bf9f7a9941b53a2018151570a8d00752ed74bf17c1 |
| tests/core/mission-continuation.test.ts | 687733f2d2d9d3e4baed2e3ef37bc9cf849919cf2535fe9f18c8582795298e83 |
| docs/plans/modernization/modernization-phase-7.md | 26012d067c94cae6f4b95c0df9276f613df740dfab79e23882214ffbaa368b3b |

The last plan hash supersedes the earlier scratch manifest: its added checkpoint records final verification, without changing the ruling or runtime. The golden unification addition is an audit comment. Any later runtime changes require review of the affected conclusions.

## Why the correction closes P1

The old separated mission mixed hull positions with mass-centre velocities, so continuing through ordinary standalone `step()` translated the hull as though its velocity belonged to that point. Rotation then introduced unpaid mass-centre drift.

The new mission path consistently publishes hull-point position, velocity and acceleration. `bodyMassPose` reconstructs the corresponding physical COM velocity with the omega-cross-offset term; attached body derivation now publishes matching hull kinematics. Separated translation reconstructs the post-fuel COM point, advances that point through the shared force and Verlet kernels, and reconstructs the hull after predicted and corrected rotation (`mission-free-flight.ts:53–75`). The equations in `hullFromMass` include both tangential and centripetal acceleration, with the correct signs for the existing pitch convention (`:25–39`). No separation kick is introduced.

Moving the remaining fuel-dependent mass station at drain follows the plan's existing attached-body convention: the rigid hull state remains canonical and the new station gets its corresponding rigid-body point velocity. This review accepts that approved convention; it does not claim a new exhaust or fluid-motion model.

Contact is still evaluated against the physical hull. Translating the contact height by `2*d*sign(cos(pitch))` makes the COM translation kernel's contact condition algebraically identical to the original hull condition, including an inverted body. On support, angular velocity is held and the reconstructed hull support altitude is correct. Tower capture sees hull pose and matching hull velocity, so lug velocity includes the proper rotational offset. Secured boosters take the existing early return, preventing subsequent fuel burn even when engines are requested again.

I checked the live/control and forecast paths, including booster policy, prediction, job/replay callbacks and callback identity in the prefix cache. Both mission callbacks select the same mission mechanical path; standalone callbacks retain standalone mechanics. The shared mutable dynamics/contact workspace is not re-entered during an active integration on these production call paths: expensive booster post-step forecasting occurs after integration completes, while the supplied mechanical replay policy does not recursively schedule forecasting. There is no added RNG sample or clock source. Every production use of `bodyMassPose` is within mission mechanics; tests are its other callers.

## Independent evidence

Retained runnable experiment: `/tmp/starship-phase7-com-followup-repro.ts`; output: `/tmp/starship-phase7-com-followup-repro.log`. Run from the repository with:

```sh
./node_modules/.bin/vite-node --config vite.config.ts /tmp/starship-phase7-com-followup-repro.ts
```

The experiment obtains an actual paid release, then advances both rotating bodies for 120 steps with engines off at high altitude. Independently reconstructed COM positions and scalar gravitational Verlet expectations differ by at most `1.1920928955078125e-7 m`; COM velocity error is exactly zero. This directly addresses the original reproducible drift rather than comparing the new implementation to itself.

It also compares a live mission booster autopilot tick with the supplied mechanical replay policy. Physical world, kinematics, engines, vehicle, RNG, forces, failures and status fields are deeply identical. An intervening Ship advance does not change a repeated booster replay. Near the physical lug plane, rotating bodies at both +1 and -1 degree catch at exactly 120 m with no ground contact. Resting hull support remains 25 m for Ship and 35.5 m for Super Heavy.

I read the new regression tests and their independent equations, including actual paid release, 120 rotating ticks, paid fuel-changing/gimballed thrust, actual catch, secured fuel preservation, missed lug and ground crash. Existing momentum and load tests now compare actual COM quantities; their physical targets and tolerances remain intact. The position roundoff bound scales with position magnitude, while the COM velocity comparison remains strict; the original drift is substantially larger than the roundoff allowance.

Lead-run logs inspected: `/tmp/starship-phase7-com-focused2.log` (47 tests / 6 files pass), `/tmp/starship-phase7-com-contact-final.log` (22 / 3 pass), and `/tmp/starship-phase7-com-preservation.log` (32 / 4 pass, including all ten actual golden replays and independent 1200-case standalone extraction proof). Build/lint and truth logs are archived under `docs/research/2026-10-03-phase7-release/com-continuation/`; their recorded successful results are build/lint zero and 14 truth checks IN before/after. These checks were run by the lead, not independently rerun as a full suite by this reviewer.

The first contact test run's one failure was an incorrect expectation that an already crashed hull at 35.4 m would snap upward to 35.5 m. Existing crash behavior freezes the penetrated pose. The corrected test asserts the incoming 35.4 m altitude; no production contact rule or bound changed. The failed log is retained.

## Limits and disposition

Standalone step arithmetic, its shared runtime dependency closure, model constants and ten golden fixture files remain unchanged by this correction. The source audit and preservation checks support that claim; they do not replace the complete release gate. I did not run concurrent coverage, browser checks or a full gate, and did not edit repository source.

**P1 is closed for the pinned commit. No additional actionable finding arose in this affected-conclusion review.** Continue the separately recorded P2 fixes and release verification before claiming Phase 7 clean or merge-ready.
