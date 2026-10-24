# Phase 8 Task 6: full-frame measurement harness

Implementation only; no performance acceptance result has been measured yet.

`tests/e2e/visual-budget.spec.ts` is opt-in through `RUN_VISUAL_BUDGET=1`.
Its init-script helper wraps the browser's original RAF callbacks without
replacing their scheduler, cancel IDs or Pixi's ticker. All callbacks with
one RAF timestamp are aggregated. The next timestamp finalizes the previous
one: a microtask would run between sibling session/Pixi callbacks and could
prematurely finalize an incomplete frame. Timer-based Playwright polling adds
no benchmark RAF callback.

The script intercepts HTML/Offscreen canvas context creation before startup,
counts issued WebGL drawing/clear commands and fences their contexts with
`gl.finish()` after the drawing callback. It records callback CPU time and
GPU-completion wait separately, plus their summed full-RAF work. The wait is
queue-drain wall time, **not isolated GPU execution time**. Fencing changes
CPU/GPU overlap and gives a conservative headless measurement. This includes
the ordinary session advance, simulation, HUD, scene preparation and separate
Pixi render callbacks. Browser compositor/presentation and work outside RAF
are not timed by this CPU sum; rendered RAF cadence is measured independently.
WebGPU, context loss, missing draws/fences or a missing sibling callback cannot
silently pass. A blank-page no-draw negative control and a CPU-work/GPU-clear
positive control verify the hook before scene capture.

Launch, staging, belly flop and entry each retain a contiguous 300-frame
capture following 60 live warmup frames. Landing and descending catch use ten
independently reset 30-frame active segments, each following 60 live warmup
frames. Catch seeks the genuine guided descending approach below 1000 m via
the existing canonical debug step path before resuming ordinary scheduling.
Segment endpoints must advance world time and remain airborne/unsecured,
without crash/breakup. Thrust/heating/descending-approach assertions keep the
named windows relevant. Setup, raw stepping, warmup and gaps are excluded and
explicitly reported; these are not claimed to be one contiguous ten-second
landing/catch flight.

The additional simultaneous-failure fixture marks both staged hull thermal
nodes unavailable while paused. The next genuine shared mechanical step
captures both existing material-domain terminal events. This synthetic load
fixture proves renderer cost, not naturally attained failure or flight
acceptance. The initial 30 frames retain onset timing, including its maximum
frame cost; another 60 live warmup frames precede 300 measured debris frames.

Artifacts retain all per-frame callback/draw/fence counts, CPU/wait/full-work
statistics (mean, median, p95, maximum), within-segment cadence, world-time
endpoints, segment lengths, viewport/DPR, actual WebGL renderer and screenshots.
Thresholds remain desktop p95 16.67 ms/cadence 59 fps and phone p95 33.33 ms/
cadence 29.5 fps. Failure-onset maximum also uses the unchanged device budget.
No CPU throttling is applied. Headless phone viewport emulation does not
establish physical handset performance or a reduced-quality rendering path.
Resource-pool exhaustion/reset memory behavior and a verified reduced-quality
policy remain separate Task 6 work; this harness does not close them.

Run serially on an idle machine after the approved browser/core CPU window:

```sh
npm run build
RUN_VISUAL_BUDGET=1 E2E_SKIP_BUILD=1 E2E_PORT=4192 npx playwright test tests/e2e/visual-budget.spec.ts --project=chromium --project=iphone-portrait --project=iphone-landscape --workers=1 --retries=0
```

The build must precede browser measurement. Unsupported GPU is an explicit
failed measurement, not a skip. Static verification does not replace executing
the controls or the 21 scene/device measurements on the current build.
