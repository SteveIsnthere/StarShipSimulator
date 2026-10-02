# Range cycle 2 — fresh independent review and approach (2026-10-02)

Target: `claude/entry-on-lift` at documentation commit5a13587 plus dirty source pinned by rotation-source-sha256.json. All32 pins independently matched. Claude CLI authentication failed; Pro Chrome unavailable. Fresh in-harness reviewer range_cycle_review was assessment-only and ran no flight/test/edit. This is fallback review, not cross-vendor review.

Confirmed contract differences: the predictor stops unpowered descent at1km while health measures touchdown; below |vx|20m/s actual guidance uses legacy pad-position trim while prediction retains velocity-based attitude; observed pitch bias is held constant and abruptly becomes zero beyond3deg; powered landing has bounded opportunity to recover position. Range/bias signs are consistent. Existing forced-pitch predictor witnesses do not prove operational landing accuracy. Outcome-only logs cannot distinguish causes. The three aim/miss points reverse their local response; another unit-slope/secant aim guess is unsupported. No current root cause or aero infeasibility is established. No substantive finding was rejected.

## Recorded new approach before execution — attempt 1

Keep current source and aim2924026m unchanged. Run one baseline default deorbit trace, excluding300km. Capture every range-update epoch, altitude/Mach samples, |vx|20 transition and flip/horizontal/final transitions. Retain raw/acceptedbias, goals, low/high/candidateforecasts, requested/selectedtrim, mass/dump/fins, padgap, heat and actualvelocity. Compare forecast with the actual descending1km crossing retrospectively; measure remaining drift and powered-stage contributions separately. Choose a demonstrated correction from that decomposition, not another numerical aim guess. Limits/bounds/authority/eta unchanged. This is attempt1 of the standing-approved second range cycle.

The reviewer recommends investigating evolving bias/authority if error forms before the regime change, or the forecast/landing contract if drift forms at handoff. These remain conditional hypotheses. Final phase review/acceptance and300kmcase are outside this review.

## Attempt 1 result and reviewed follow-up

Baseline landed -1333.183m; descending1km crossing -1619.335m; post1km drift +286.152m. The powered stage is not principal cause. Predictor nearMach2 underestimates actual1km displacement by~2.4km; correcting lowerpolicy alone may request less range and worsen miss, so do not treat it as a demonstrated landingfix. Reviewer identified a stronger hypothesis: endpoint linear interpolation is not checked for candidate-to-target residual. At60km observationalcandidate remained~1259m short with unsaturatedtrim; latertrim saturates. However baseline recomputedbias against newtrim rather than actualoldgoal.

## Recorded attempt 2 approach before execution

Keep runtime/aim unchanged. Refine trace to use previous trim when reproducing solver bias at every update. Returned kinematics/mass/area are unchanged by subsequent actuation; forecast uses those values, not fin positions after actuation. Record previous/current/requestedtrim, exactoldgoalbias, endpoint andcandidateforecasts. Determine whether safe unsaturated solutions retain material target residual. Only then implement a bounded nonlinear range solve; no landingoffset or aimguess. Reviewer follow-up remains read-only and made no source/test changes.

## Attempt 2 result; correction chosen before implementation

Exact previous-goal bias reconstruction confirms safe unsaturated range residual: at2331.692s, h79028.758m, bias+0.442191deg, selected/requestedtrim+0.050181deg, endpoints20384115.897m/19658200.206m bracket pad20015086.796m, candidate19997253.163m is17833.633m short while peak1423.250K. Endpoint interpolation demonstrably does not solve nonlinear predicted range. Add a regression from this measured state; preserve all existing predictor force/thermal/continuity assertions. Chosen correction: safeguarded bounded nonlinear solve within the same±3deg interval, using the same forecast and thermal guard, no aim/limit/authority change. Its numerical target100m is one tenth of the unchanged1km health bound;16 evaluations cap work. Verify real health once as attempt3 of this cycle; if still red, next independent review precedes another cycle. Lower-policy contract mismatch remains distinct and unproven as a landingfix.

## Attempt 3 result and numerical review

Watched-red operational solver witness failed at17833.633m forecast residual; bounded safeguarded solve passes. Fresh reviewer found no concrete numerical defect and requested bidirectional/outside-bracket/unreachable witnesses; all12 entry-range tests pass after adding those. Health6/6 and focused acceptance95/95 pass (one explicitly excluded300km case). The separately approved300km verification then passes; its extra verification is now consumed. Full unit run1987 pass/8 fail: all8 stale golden replay schemas; no other unit failure. Build/lint/truth8/8 pass. No fixtures written. Range cycle2 is successful, not exhausted. Existing limits/authority/aim remain unchanged at this checkpoint.

## Fixed-sweep co-calibration — approach recorded before execution

The final fixed sweep at aim2924026m records65-degree deorbit1422.774K, miss-146605.2m, landed; no fixed row meets10km. Operational acceptance does, so this is not established aero infeasibility. Follow-up independent reviewer retains the explicit open-loop fixed-sweep contract: do not silently enable feedback to obtain passing rows. The fixed65 pairs (aim3812057,miss-896527.1) and (aim2924026,miss-146605.2) establish slope-0.844477164; measured secant aim2750421m is the next co-calibration candidate. These are fixed-schedule observations, not the rejected operational unit-slope guesses.

Co-calibration attempt1: change only the plan-authorized aim to2750421m, measure named fixed65 deorbit and reentry, then operational health/scenario/demo/reserve acceptance under the same aim. Preserve65 degrees, M_t20/M_b2, fixed eta, reserve22t, +/-3-degree authority,1533K,1km/10km/900s and all other bounds. A non-passing fixed result supplies an actual new calibration measurement, not acceptance. Final prescribed16-row sweep and golden audit still required. This measured choice is part of approved Tasks1+1b Fidelity; the solver correction is the separately witnessed Bug fix.

### Co-calibration attempt1 result and attempt2 trace approach

Fixed65 now lands +7459.1m at1424.567K, satisfying fixed10km/1533K. Full focused99tests:98pass/1fail,120km orbit lands but misses abs41616.386m against unchanged40000m. All health/preset/demo/reserve/300km checks pass. This is a new common-calibration incompatibility candidate, not physical infeasibility. Record one120km trace at the same aim with actual signed miss, ignition/cutoff, range authority and forecast-to-actual1km differences before another change. Do not assume the tighter fixedroot estimate repairs120km; do not alter bounds or silently enable fixed-sweep feedback.

### Co-calibration attempt2 result and reviewed attempt3 approach

120km signed miss+41616.386m,1km+41726.142m,powered drift-109.756m. At80km the pad is outside the endpoint bracket even at+3deg (shortest forecast overshoots94664m); trim stays at+3 through Mach2. Forecast-to-actual1km error shrinks from+52938m at80km to+1007m atMach2. Ignition1854.925s,vx7411.0217;cutoff1863.383s,vx7277.0366 (~134m/s spent, below240 ceiling). The entry is placed too long for this case's authority; landing does not create the overshoot.

Independent follow-up agrees increasing the common aim is the causal direction for both signed overshoots, without proving120km sensitivity. The two latest fixed65 pairs yield slope-0.887441606 and updated fixed-root estimate2758826m. Attempt3: only move aim to that measured fixed root, measure fixed65 and exact120km at the same aim, preserve geometry/signed miss. If both pass, final16-row sweep and operational acceptance; if not, close this cycle and get a fresh independent review/new approach. No physical limit/authority/model/acceptance bound changes.
