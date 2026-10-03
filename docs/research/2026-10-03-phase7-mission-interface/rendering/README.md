# Actual two-body rendering checkpoint

Both real staged bodies render on their shared physical clock. Selection keeps both bodies and their independent exhaust pools, but changes controls, telemetry and camera follow. The functional booster hull is71×9m with four real-actuator grid fins at station66m and33 actual engine mounts. Failed/pending/unpowered mounts draw no thrust. Standalone Ship keeps its original geometry, six mounts and21.8m rendered nozzle arm; staged geometric-centre Ship uses25m and booster35.5m. No core physics/model/preset/fixture source changes.

The scene helper owns startup-created GPU resources and resets/destroys them with the flight. Controller exposes actual previous mission bodies; no synthetic pose or duplicated clock. Camera frames actual hull bounds during close staging, handing off on real spatial separation or explicit selection. Configuration was split into an interaction helper to keep session464lines; scene146lines and vehicle-scene119lines.

## Actual failures and fixes

- First geometry witness found weld strokes extending a9m hull to9.12m. Weld ends moved inside the hull; physical dimension assertion unchanged.
- A new scene-composition Node harness failed at the real WebGL shader constructor (`document` absent). Its raw failure is preserved; composition moved to actual Chromium browser witnesses, without shader stubs. A test-double type failure is also preserved.
- First browser run:3pass/2fail. Pixel landscape map intercepted Stage; iPhone landscape status bar intercepted selection in the overly tall rail. Exact screenshots/error contexts in first-browser. Short map now occupies the central column below HUD; rails scroll within available safe height. No forced clicks or retries.
- Real portrait capture exposed overlapping engine-group text/fuel. Booster groups now occupy a separate wrapping HUD row. Follow-up capture showed that row occluding the stack; new booster/mission canvas reserves the measured HUD zone, while protected standalone Ship canvas remains full-height. Final browser checks assert both body centres clear of HUD and group bounds separate.

## Verification on Steve's Mac

Build0, first-load JS294.3/300kB, lint0 (existing BlackBox selectedVehicle dependency warning retained). Focused125checks/11files pass. Final staging browser5/5, all five projects,0failures/0retries/0skips,38.3s. Production Ship startup smoke4/4,8.8s. Final phone screenshot was visually inspected in this conversation: both bodies clear of HUD, readable groups. Final screenshots were subsequently cleared by the smoke run's output directory cleanup; first-failure images remain and new catch/phase release runs must persist their own final captures before another browser run. No Phase8 visual or frame-budget completion is claimed. jsdom canvas/localstorage warnings remain honestly recorded.

## Remaining

Task5 functional tower/catch status/debrief, real Booster Sep and RTLS autopilot Caught browser witnesses with failed-position negative control, and browser restart/attachment witness. Correct the hot-stage timeline's current generic PRE-FLIGHT/LIFTOFF narration while adding genuinely observed mission/catch events. Detailed artwork/per-engine particle plumes and model-aware scenery/shadows remain Phase8. Task6 coverage deficits/full gate/full browser/mutation/truth/fresh independent high review/main/deploy/live checks remain mandatory. Main/live stay7a757d7;7unchecked,70% by phase count.
