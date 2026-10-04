# Natural damage browser witness — 2026-10-03

Current status: final generic inspection natural browser matrix **3 PASS / 2 RED**. Both landscape profiles cannot reach the approved3CSSpx grid resolution target while keeping all actual hull/piece bounds inside the stage. Earlier4/1 independent pixel result remains preserved below. Delayed partial-piece framing is a rejected acceptance assumption, with negative evidence preserved.

The new `tests/e2e/vehicle-damage.spec.ts` flies the actual paused session via canonical fixed steps from the declared full-capacity 80km circular retrograde booster editor inputs and default seed 0x57414c4b. Only neutral initialization flags are patched (manual control, enabled fins, translation mode). No temperature, damage, propellant, running-engine, inertia, pose or reserve injection occurs during flight. All ignition, hold, grid commands and shutdown use existing keyboard/UI command paths. Coast cap is 718.8414509444451s; burn cap derives from full capacity/33-engine source mass flow plus maximum ignition delay; entry cap derives from one circular period. Trigger 1073.15K and cutoff 4000m/s are unchanged. Calm-air telemetry speed is actual relative airspeed because both mean wind and turbulence are zero.

Hold T plus D release adopts the current attitude. Hold utility disables fins; at cutoff D grab occurs while hold is still active, then T disables hold, F restores fins, and real centre/inner/outer buttons shut down all 33 engines. This reproduces the core witness's manual entry state without patched physical controls. Existing player zoom is used only during paused captures. Probe schema reports actual part parent, container visibility, child mesh count and transformed bounds on demand; it does not echo physical attached flags. Unit tests verify hide/reset changes the actual probe results.

## Evidence and diagnosed test errors

- Initial fresh build exposed unrelated concurrent schema errors in golden/proof fixtures; parent repaired them. Fresh build then passed: 294.8/300.0kB gzip, entry graph clean.
- Probe unit suite 4/4 passed, focused lint empty.
- First desktop/portrait run reached exactly 495.3166666663805s warm trigger and 599.3916666662859s cutoff, but my command setup omitted fin re-enable and manual-yoke acquisition. Corrected actual command order, no physics changes.
- Second run naturally lost all three grids, but my pre-loss capture used Pa against the telemetry's kPa. Corrected to the original unit witness's healthy `q > 1`kPa condition.
- Third run reached real loss, pause, hide/restore checks, but used nonexistent restart ID `flip`; corrected to existing `before-flip`.
- Fourth desktop/portrait run passed all initial assertions, including physical ProofExceeded on all three roots, actual part transfer, hull visibility, pause, restart and vehicle isolation. Its whole-image absence control was subsequently judged too weak: a changed hull image cannot prove offscreen debris is rendered.
- Strengthened same-state canvas paired control measures changed pixels inside EACH actual piece bounds. It fails 0/0/0 at the selected one-second post-loss observation. This RED is preserved.

Immediate loss frame: three original grid parts remain actual visible stage-owned meshes, three mesh children each, with desktop bounds approximately x352–369/y77–106 inside viewport1280×347. Directly inspected `natural-immediate-loss.png`: intact hull and newly transferred grids share their original attachment region. Physical loss occurs near645.833s, roots1126.58K, below the material availability boundary, no terminal disposition at this endpoint.

One second later: all three parts still have valid independent debris owners and visible meshes but their actual desktop bounds are outside the viewport, approximately x−1051..−1006/y−285..−271. The same-state paired control therefore finds zero piece pixels. Hull remains visible. Read-only inspection shows the partial-loss follow camera tracks the hull; enclosing debris bounds are implemented for terminal breakup only. Real small debris decelerates rapidly under drag while the hull continues near3.8km/s. This supports a framing/separation limitation, rather than a first-transfer mesh bug. No camera or physics change was made to cure it.

Logs and representative captures are preserved in `natural-browser/`. These are Chromium desktop/phone viewport tests, not Safari/device evidence. Core `damage-natural-flight.test.ts` independently proves the actual paid warm-vs-cold motion difference. No direct thermal injection or proxy shader acceptance is substituted here.

## Approved observation contract correction

Lead decision: preserve surviving-vehicle Follow for partial loss. Widening to include permanently separating light grids at ~3.8km/s would shrink the controlled hull, contrary to the selected-body camera contract. The arbitrary +1s all-piece-onscreen requirement is rejected and its negative evidence remains above/in the archived logs. Terminal debris framing requirements are unchanged. This is a product observation decision, not a simulation/camera fix or a loosened physical guard.

The strict paired pixel check moves to the natural first-loss frame without synthetic settling or physical changes. A new renderer-only individual component control toggles `renderable` on each original part, so each grid's pixels are tested independently against the same retained hull/background. Unknown IDs are harmless; restart restores renderability. Actual immutable mesh UIDs must match before loss, after transfer and after120ticks, with no duplicate ownership. After those ticks the witness requires independent physical/render movement, permanent loss, and the surviving hull inside its selected-body viewport, but makes no all-partial-debris framing claim. Debug output is on demand only; no per-frame allocations or core fields.

First revised pair: desktop passed independent per-grid hide controls (31/44/17 changed pixels), UID preservation and later permanent independent motion. Portrait failed because the test's absolute150px projected-height zoom target overshot during rotation, cropping the controlled hull/grid end. Direct image inspection confirmed the crop. Replaced only this presentation target with diagonal extent40% of the smaller actual viewport dimension through existing player zoom keys; physical trajectory, immediate-loss moment and per-grid pixel requirements unchanged. Extreme manual zoom at this supersonic editor flight is not claimed as a camera acceptance result.

## Actual five-project result

Fresh dedicated port4385, serial workers1, no retries: four passed, Pixel landscape failed (1.2 minutes total). Desktop, Pixel portrait, iPhone portrait and iPhone landscape passed all independent component hide controls, UID ownership, pause, same-state absence, restart and selected-vehicle isolation. First physical loss is645.8333333329103s. At+120ticks physical grid distances from retained hull COM are762.685,759.599,776.327m; original meshes remain independent/permanently detached without duplicates. The selected hull remains in view.

| Project | Individually hidden grid1 changed pixels | Grid2 | Grid0 |
|---|---:|---:|---:|
| Desktop |31|44|17|
| Pixel portrait |88|141|65|
| Pixel landscape |16|15|**0 — RED**|
| iPhone portrait |177|233|75|
| iPhone landscape |12|30|9|

Per-component control holds the hull and other pieces visible. Counts require channel difference>8 inside actual transformed mesh bounds; this strict requirement was not relaxed. Pixel landscape whole-vehicle absence yields30/20/25 pixels in the three piece bounds but the independent grid0 control yields0. This demonstrates why whole-vehicle absence alone was insufficient. Grid0 actual bounding footprint1.39×1.61CSSpx, viewport863×82CSSpx. This is no evidence of missing physics or mesh ownership; exact quantization/occlusion versus weak subthreshold pixel contribution remains unresolved without its individual paired buffers.

Directly inspected final desktop and portrait first-loss captures. Hardware is small but actual material/geometric graph contributes measured pixels. Fresh normal build295.7/300.0kB gzip; focused units14/14 and lint exit0. These checks do not represent full scene visual acceptance or release gate.

Read-only layout investigation: Pixel landscape Details is already folded (source compact default, downward arrow, no secondary Q/G readouts in accessibility snapshot). `hud-toggle` only hides SecondaryReadouts; mandatory primary metrics, fuel and physical engine-group rows remain. `FlightWorld` reserves their measured `--hud-bottom`, so the usable world stage is82px. Controls are folded. Cinematic hides controls, not the HUD reservation. Source lattice material deliberately retains fractional coverage at unresolved scales rather than enlarging geometry. Do not change physical silhouettes/shader coverage to make this tiny-stage test pass. This is a Phase9 layout obligation and a usable-player-zoom witness question, not permission to waive the independent pixel assertion.

## Approved usable-view test and final result

Lead confirms already-folded82px stage is a Phase9 layout limitation. No Phase8 HUD/camera/shader/geometry change is authorized to cure it. Generic existing player inspection zoom is authorized at the frozen first-loss state: target each actual grid's short bounding dimension≥3CSSpx, and keep all actual visible retained hull and debris bounds inside the stage. One real `=` zoom command at a time; if a command crosses an edge, restore one `-` and stop. No device/preset conditional, no physics steps or injected settling while zooming, no repeated target calibration. If the stage cannot fit this resolution, keep the test RED. The earlier arbitrary pre-loss pixel/diagonal zoom loop is removed; original strict per-component changed-pixel detector stays unchanged. Waiting for parent numerical sweep before this final bounded matrix run.

Final generic inspection run: dedicated port4386, all five projects, workers1, zero retries,53.8s. **3 passed / 2 failed**: desktop, Pixel portrait and iPhone portrait passed; both landscapes failed exactly the predeclared≥3CSSpx resolution check. Their hull/piece containment assertion passed after restoring the last admissible real zoom level. No repeated target calibration, physical/shader/camera edit or detector threshold relaxation followed. Directly inspected both final landscape captures: mandatory already-folded HUD occupies most height, and the actual surviving body and transferred hardware remain small in the retained short flight strip. Keep this unresolved Phase9 usable-stage/view limitation visible; do not label the complete mobile natural-damage acceptance green.

All heavy browser processes finished and CPU was explicitly handed back to the lead for isolated planner timing. Logs and final PNGs are under `natural-browser/inspection-*` and `inspection-all5.txt`. The earlier zero-pixel Pixel landscape evidence and +1s physical separation evidence remain archived. Terminal-piece framing requirements and source physics were untouched.

## Narrow layout bring-forward ruling (supersedes earlier defer-only scope)

After the final two landscape resolution failures, the lead approved bringing the already-approved Phase9 short-landscape viewport/instrument slice into Phase8. This supersedes the earlier instruction to defer all HUD layout changes. The surviving vehicle Follow contract, physical grids, shader and strict individual pixel detector remain unchanged. Structured booster/mission flights use the safe-width instrument strip; standalone Ship intro and wide/portrait layouts retain their original placement. The whole canvas remains below the HUD. Expanded short rails retain their original scrolling and controls below the measured HUD edge with16px clearance.

Declared folded instrument geometry is152CSSpx (44header+56instrumentrow+20engine status+16row gaps+16padding), recorded before the browser run. The new independent browser guard checks that budget, remaining world height, actual no-overlap, all named engine statuses and reachable original touch controls. Existing HUD/Controls/BoosterEngineGroups focused units:27passed; owned lint exit0. Source is stable but build/browser verification is pending the lead's serial material-core window. No acceptance claim yet.

## Narrow layout and natural witness verification

First actual strip test was RED on both landscapes:159.5CSSpx exceeded the original152px budget. DOM evidence showed the preserved primary numeral/unit line boxes make the instrument row65px rather than the initial56px estimate. The budget stayed152; only the two between-row gaps changed8→4px. No fonts, values, gauges, labels, touch targets or thresholds changed. Subsequent native folded height151.5px meets the original cap, with canvas below it and both actual expanded rails at least16px below its edge.

Fresh normal build:exit0,296.5/300kB JS, entry graph clean. Focused HUD/Controls/engine-group units27passed; the independent complete HUD/damage-scene cohort120passed. Focused landscape browser2passed5.9s. Final fresh port4390, workers1, zero retries:7passed/3skipped1.1min. All five natural-damage witnesses pass; the layout guard passes both short landscapes and deliberately skips the other three layouts. Logs/captures/endpoint data are under `natural-browser/layout-natural-all5/` and `layout-natural-all5.txt`.

| Profile | Individually hidden grid1 changed pixels | Grid2 | Grid0 |
|---|---:|---:|---:|
| Desktop |5|9|2|
| Pixel portrait |97|141|39|
| Pixel landscape |51|85|25|
| iPhone portrait |93|110|40|
| iPhone landscape |79|99|30|

Each control retains the same survivor and other meshes; strict channel delta>8 and positive changed pixels inside actual piece bounds are unchanged. Real inspection zoom reaches the original≥3CSSpx per-grid short footprint with all survivor/piece bounds contained at first loss. Pixel landscape world is156CSSpx high (previous folded82px); iPhone landscape136px. Physical first loss remains645.8333333329103s, with original mesh ownership, freeze-on-pause, permanent independent120tick movement, restart and selected-body isolation. No injected warming, physical change, synthetic settling or all-partial-debris visibility claim.

Directly inspected desktop and both landscape natural after-loss captures plus both folded-strip captures. Lead inspected iPhone strip as readable. Existing iPhone status-bar elapsed clock is partly clipped by Pause; the folded trajectory card also occupies the middle of the small world. Record both as separate Phase9 overall layout debts; neither is repaired by this narrow slice. Natural GPU proof is now green on the Chromium desktop/four phone viewport profiles, not Safari/WebKit evidence, full visual acceptance or a release gate. All heavy browser processes ended and CPU was handed back to the lead.
