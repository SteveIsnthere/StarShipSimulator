# Phase 6 close: plume emission timing

Phase 6 remains unmerged until the repaired build passes the full browser suite.

## Attempt 1: full suite and retained screenshot

The full suite on `92ed3d6` failed both plume assertions on iPhone portrait:

- Low-altitude length: median 0.9194 ship lengths; samples 0.92, 0.76, 0.64, 0.94 against the unchanged >1 bound. Every sample read throttle 100%.
- Vacuum width: 1.00 against low-altitude 0.8513 times 1.2 (1.0216).

The screenshot shows disconnected particle cohorts. Logs and screenshots were
retained at `/tmp/starship-phase6-diagnosis-attempt1/`; the full run log is
`/tmp/starship-phase6-e2e-full.log`.

The closed-form drag integrator is correct, but `emit()` gave every birth in a
frame age zero and `update()` advanced all of them by the entire frame. At
0.25 seconds, 75 core particles are emitted as one cohort already well away
from the nozzle before drawing. The first detected plume pixel then anchors
the width measurement downstream of the nozzle.

Two new unit regressions failed before the fix: equal-duration continuous
emission at 120 Hz versus four frames per second disagreed in position; an
emission frame longer than the maximum lifetime incorrectly left zero live
particles despite births near its end. Red evidence:
`/tmp/starship-phase6-particle-red.log`.

## Repair

Birth times are rate crossings, including the carried fractional particle.
Each newborn advances only through the remainder of its first frame. The
existing closed-form integrator and cache now use that duration. Bursts remain
present at frame start; recycled slots reset their birth delay. No simulation
core, golden fixture, emitter tuning value, browser assertion, tolerance or
retry setting changed.

The existing motion and drag-cache tests use bursts so each measured subject
is present at the start of both equal integration intervals. The continuous
emission regressions separately test birth timing.

Focused checks: 55 particle/plume tests passed. A fresh independent in-session
reviewer found no actionable defects and independently passed all 42 particle
tests. Claude Code could not start: its subscription authentication check
failed before inference. This small diff used `cross-agent-review`'s direct
fresh-subagent fallback.

The reviewer noted that the new exact cadence comparison covers a constant
emitter before recycling; it does not claim invariance of shared random-number
ordering between simultaneous emitters.

## Remaining verification

- Attempt 2: staggered births passed 9 of 10 plume checks; desktop vacuum
  width still failed. Trace, screenshot and log retained at
  `/tmp/starship-phase6-diagnosis-attempt2/`.
- Attempt 3: camera reprojection and moving-emitter birth interpolation passed
  all 10 plume checks (2.8 minutes). Log: `/tmp/starship-phase6-plume-attempt3.log`.
  The subsequent review found two real defects, repaired below; the complete
  gate and full browser suite must verify the final repair.
- Complete local gate before merge; verify Pages afterward.

## Camera defect reproduced and repaired

Existing particles are stored in screen coordinates. Camera translation and
zoom affect new emissions but do not reproject old particles or their band
origins. A camera-only test through the real effect driver failed before the
repair (`/tmp/starship-phase6-camera-red.log`). Attempt 2's browser failure
made this relevant to the Phase 6 close rather than a separate Phase 8 deferral.

The effect driver retains the previous rendered projection and nozzle world
position. World effects are reprojected, including their velocity, size,
gravity and shock origins/spacing; intentional screen-space streaks are not.
The previous physics state is not used as the previous rendered pose.

The initial expanded focused checks passed 65 tests. The independent reviewer
then reproduced two defects: world reprojection detached an upright plume at
orbital carrier velocity, and a new flight teleported the retained emitter
history across the map. Both findings were accepted.

Core and bell particles now use the nozzle frame, including the nozzle's
translation between rendered frames. Smoke and wakes remain world anchored;
velocity streaks remain screen anchored. Moving-emitter birth interpolation
was removed because nozzle translation already carries the plume births.
`Scene.resetFlight()` clears the particle pool and resets emitter history when
the session starts a flight. A stationary-versus-orbital-speed regression
failed before the repair and now passes with the same decorative RNG draws.

The final focused particle, plume, pool-performance and session checks passed
73 tests (`/tmp/starship-phase6-review-fixes-green2.log`). The fresh reviewer re-ran both reproductions and reported no findings on
the final repair. The complete local gate passed (`/tmp/starship-phase6-final-gate.log`):
1,940 unit tests, coverage floors, desktop smoke and subpath deployment checks.
The final full browser suite on `4c03814` failed the iPhone portrait vacuum-width
check again. Final result: 427 passed, 1 failed, 11 configured skips, exit 1 (32.5 minutes).
Vacuum width was 0.70 against the unchanged >0.7176042091538909 requirement. This exhausted the three
diagnosis attempts, so Phase 6 stopped under the contract. The subsequent
authorization below permits one further attempt, with no merge until all
checks and review are green.

Final failure evidence is preserved in
[the evidence directory](2026-10-01-phase6-plume-evidence/): screenshot and
Playwright error context. The complete full-run and gate logs are retained there.
Hosted CI `36940931396` passed on the same commit.

## Resume authorization (2026-10-01)

Steve approved the recommended option: one additional diagnosis attempt,
keeping every assertion, bound and retry unchanged. Attempt 4 is in progress; see its hypothesis below.
The live contract in `docs/plans/modernization/modernization-GOAL.md` defines
its repair, verification and stop condition. No fifth attempt is authorized.
The existing failure remains a release blocker until final verification is green.

## Attempt 4: screenshot pixels versus renderer pixels

Hypothesis: `metrePixels()` caps its image scale at 2, matching Pixi's backing
buffer resolution, while `readFrame()` measures a composited Playwright
screenshot at the device scale factor. The retained iPhone failure explicitly
reports a 1170-pixel image for a 390 CSS-pixel canvas (3x), but derives its
vehicle height and cone-band depth with a 2x multiplier. The intended 0.4
ship-length band therefore samples only 0.267 ship lengths on that device.
This is a measurement-unit defect, independent of any effect tuning.

Plan: prove the mismatch with a known-size canvas fixture whose backing buffer
uses the same 2x cap and whose screenshot uses the device pixel ratio. Include
an erased-fixture control so the pixel detector cannot pass on the background.
Correct the screenshot scale, leaving the plume assertions, thresholds, sample
count and retry settings unchanged. Run the focused plume suite with traces,
then the gate and full suite if focused verification succeeds. No fifth attempt
is authorized.

Red proof: the new known-size canvas test passed on desktop and failed on all
four phone viewports. On iPhone, the 100 CSS-pixel subject measures 300 image
pixels against the helper's 200. The initial Pixel failures also included
fixture contamination and are not independent proof of the cap defect. The fixture uses the real renderer's 2x backing-buffer
cap and includes an erased-subject control. Its failed traces, screenshots and
log are retained in `2026-10-01-phase6-plume-evidence/attempt4/red-scale/`.

Repair: `metrePixels()` now converts CSS pixels with the screenshot's device
pixel ratio, without Pixi's backing-buffer cap. No product source, plume
classifier, sampling parameters, existing assertion, bound or retry changed.
Post-repair focused verification finished: 12 passed, 3 failed. All ten plume
checks ran; the five vacuum-width checks passed, including iPhone portrait
(0.80 across against low-altitude 0.39). A separate iPhone portrait low-altitude
length check failed: spans 0.51/0.66/0.73/1.74, median 0.734801695647775
against unchanged >1. Two synthetic Pixel fixture failures came from white
page pixels at the screenshot's fractional bottom edge. The fixture now uses
the production viewport metadata, a black page background and an integer
pixel start (48 CSS pixels vertically); the 100 CSS-pixel subject height and
<=1 pixel bound stay unchanged. The erased control remains required. Final
scale fixture: 5/5 passed. The intermediate failures and final traces are kept
under attempt4; they are fixture corrections, not plume reruns.

The focused result is not release proof. The complete local gate passed on this checkpoint (1,940 unit tests, coverage,
13 smoke checks and 5 subpath checks), but no full browser suite has yet
verified this repair; no merge or deploy is authorized by this result.

## Separate low-altitude length diagnosis: attempt 1

Hypothesis from retained exact PNGs: the instrument excludes the white-hot core
and its fixed BELOW region does not stay below the moving nozzle. The warmOnly
predicate requires red dominance even when minLuma admits a bright pixel,
contradicting the documented brightness-or-warmth selection. In sample 3 the
existing detector starts at y576 beside the nose, while the nozzle is near
y687, so its 1.74 length includes vehicle height.

A fresh high-depth reviewer independently decoded the four measured PNGs and
reproduced every logged box. Simply admitting bright pixels gives spans
162/117/192/287px but includes reticle/hull or nose-side effects. That apparent
pass is rejected: no classifier patch was made. The next repair must anchor
the exhaust measurement below the actual nozzle and prove that stars, reticle,
terrain and nose-side effects cannot pass, retaining all numeric thresholds,
assertions, sample counts and retry settings. Correct isolation may still
reveal a real product failure; do not assume a passing outcome.

This is a different check and retains the normal three-attempt budget. Attempt
1 has evidence and a hypothesis, with its repair pending. Attempt 4 of vacuum
width remains in final verification; any repeat of that check stops Phase 6
again with no fifth attempt. Physics and graphics source are unchanged.

Checkpoint review: a fresh high-depth reviewer confirmed the screenshot units
and final scale fixture, reproduced the low-altitude failure, and rejected a
brightness-only patch because it would admit hull/reticle contamination. The
stale docs-only claim was corrected. No remaining checkpoint findings; this
is not Phase 6 merge clearance. Local gate log: attempt4/gate.log.


Low-altitude attempt 1 repair in progress: read the last rendered nozzle through
an on-demand debug presentation probe. Each of the same four samples pauses
only for its subject/background pair, with the existing 350ms wall-time interval between
samples. Hide the particle container for the background, restoring it in a
finally block; accept only changed pixels below the actual nozzle. This permits
the documented bright-core OR warm-halo predicate at minLuma200/orWarmth100
without admitting unchanged white stars/reticle or brown terrain. Numeric
thresholds, length/width assertions, sample count and retries remain unchanged.
A synthetic positive/negative control checks background, stars, reticle,
nose-side fire, neutral white core and dim warm halo before the real plume run.
The renderer's effects driver publishes its existing nozzle calculation;
no physics or effect parameters change. Focused result pending.


Low-altitude attempt 1 focused result: **9 passed, 1 failed** (4.2 minutes).
All five low-altitude checks passed with the repaired instrument, including
portrait iPhone median 1.01 (>1 unchanged); all four phone vacuum checks passed,
including portrait iPhone width0.55 against low0.41*1.2. Desktop vacuum width
failed: 0.42 against low0.39*1.2. The authorized iPhone stop condition did not
fire. The newly exposed desktop project check enters its normal three-attempt
budget; no full suite or merge is justified by this run.

Reviewer finding accepted: RGB inequality alone could count a faint additive
particle over an already-bright star (220/220/220→221/220/220). The paired mask
now requires a pixel to newly satisfy the unchanged query; pre-existing bright
pixels are excluded. The control fixture now brightens a gray star by one red
level and requires the plume's bottom to remain at the known white-core edge.
Both extent and cone-band passes use the same predicate. No shader, particle
parameter or simulation value changed. Review-fix verification pending.


Review-fixed focused result: **9 passed, 1 failed** (4.0 minutes). All five
low-altitude checks passed; desktop vacuum passed; portrait iPhone vacuum
passed0.65 against low0.39*1.2. Pixel landscape vacuum newly failed0.419047619
against >0.425490496. Retained under low-length-attempt1/review-fixed.

Pixel landscape vacuum diagnosis attempt 1: samples 0/1 and2/3 have identical
bounding boxes AND exact accepted-pixel counts in both low and vacuum frames.
Pausing for paired captures has exposed a sampling defect: under slow software
rendering the existing350ms wall interval can finish before a fresh flight
frame draws, so the purported four-frame median counts the same flight state
twice. The repair keeps exactly four samples, the350ms interval, all numeric
thresholds/bounds and retries. It waits until the simulation has advanced
before pausing the next sample, records each step id and asserts four distinct
states. No additional sample or best-frame selection is introduced. Focused
verification pending. The original iPhone stop condition remains unchanged.


Distinct-frame focused result: **10/10 passed** (4.0 minutes), with four distinct
step ids printed for every measurement. Pixel landscape vacuum0.48 exceeded
its paired low0.36*1.2. Original portrait iPhone vacuum also passed. Exact run
log and all traces are retained in pixel-landscape-attempt1/. This completes
that diagnostic repair; it does not substitute for the final full suite.
Fresh review confirmed the counter advances in the synchronous drawing tick
and the uniqueness assertion neither adds nor selects samples. The minor
wall-time wording correction was accepted. The complete gate and full suite on
this final source remain pending. Physics, goldens and effect parameters are
unchanged throughout the measurement repair.


Final repaired source: complete `npm run gate` passed (1,941 unit tests,
coverage floors,13 smoke checks and5 subpath checks). The gate log is retained
as pixel-landscape-attempt1/gate.log. The independent high-depth reviewer
accepted the bright-star and distinct-frame fixes with no remaining findings.
`E2E_SKIP_BUILD=1 npm run test:e2e:full` is running against that same build;
no result, merge or deploy is claimed yet.


Final full verification on product checkpoint `1644fe1`: **438 passed,
0 failed, 11 configured skips, exit 0** (36.1 minutes), all five projects.
Original iPhone portrait vacuum-width check passed. The gate ran before this
suite on the same source. Complete gate, independent high-depth review and
hosted CI `36953300952` are green. Exact full and hosted CI logs are retained
in pixel-landscape-attempt1/full.log and hosted-ci.log. Phase 6 remains
unmerged; main gate and live deploy verification are still required.
