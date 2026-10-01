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
The final full browser suite is running against this repair.
