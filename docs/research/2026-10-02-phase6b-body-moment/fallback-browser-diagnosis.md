# Fallback browser release diagnosis

At checkpoint eb703cb the full five-project suite exits 1: 436 passed, two failed, 11 configured skips, no local retries, 33.5 minutes. Raw log and failure screenshots/context are preserved in fallback-browser-cycle1/. No unchanged-code rerun is authorized as proof. Main/live remain 080f108; Phase 6b is unmerged.

## Cycle 1, attempt 1 — independent ruling and proposed causal witnesses

Fresh fallback_camera_review inspected the complete source and failed captures without editing or running tests. Effects and particle source match shipped Phase 6. The camera shake clamp has hundreds of metres of clearance at 120 km against at most six metres of decorative shake, so it cannot explain the vacuum failure.

Pixel landscape plume: low median width 0.3805199554 ship lengths, vacuum 0.4380952381; unchanged required width >0.4566239465. All four samples are distinct, throttle100. Vacuum mask has fewer qualifying pixels; this does not prove fewer emitted particles. Shared emitter RNG assigns different random draws to core and bell when render batches interleave them differently; clear() also retains random history. Existing single-core cadence regression does not test either defect. Reviewer approves a watched-red combined-emitter cadence witness and fresh-vs-cleared restart witness, followed only if confirmed by independent per-emitter streams and resetting those histories. Rates, lifetime, spread, size, alpha and original seed stay fixed; never tune a seed to pass the browser. Original pixel assertions remain separate acceptance.

iPhone portrait ground: 200 m setup is followed by a three-second wall wait while the vehicle falls. Failure screenshot shows92 m (later context72); exact measurement altitude not recorded. Distant earth visibility is altitude/height>0.5, so below100m at the200m physical viewport it is absent; near ground remains beyond the camera floor. Top85.2966% can therefore be sky. Reviewer approves atomic pause+setScenario through the real app path at the original named altitudes, await paint, then preserve both numeric terrain assertions. startFlight already initializes camera and viewport at the configured position. Record capture telemetry to confirm actual measured altitude before claiming this resolves the failure.

This is a bounded reviewed diagnosis under Steve's standing approval. No assertion bounds, retries, physics, control authority or coverage changes. No Phase 6 work is reopened. Mutation, final full-browser acceptance, final review, merge, main gate and deployment remain required before Phase 6b closure and Phases7–9.

## Watched-red implementation evidence

All three new regressions fail by named assertions on original eb703cb particle source. Per-emitter streams use stable FNV-1a effect-name keys with the unchanged seed; clear resets each stream. No effect parameters are edited. Initial new camera fixture was incorrectly left at x0 while its landing-burn state has a distant world x, so Float32 coordinates generated spurious four-pixel differences after the stream repair. Correcting camera x/y to the app's actual startFlight initialization retains the original0.001 bounds. The corrected witness was re-exercised against an isolated byte-identical original-source copy: all three still fail. Temporary copy/import removed immediately; actual runtime source never overwritten. Final real-source focused tests61/61 pass. Both intermediate failures/snapshot and final red/green logs are retained.

Terrain setup now atomically pauses and starts the original booster-sep scenario at200/6000/40000m with original60m/s horizontal/0m/s vertical overrides, awaits painting, and additionally asserts exact photographed altitude. Both original numeric terrain assertions remain unchanged. All other browser setup/acceptance remains unchanged. Build and lint pass. Focused five-project browser checks are running; no browser repair acceptance or release claim yet.

## Focused acceptance and fresh review

Reviewer caught pressure-unit error in the new fixture:80_000 was incorrectly in Pa while airPressure is kPa. Fixed to updateAtmosphere(2000).airPressure=79.50141980166975kPa, with vacuum0. Corrected fixture again fails all three named assertions on isolated byte-identical original source and passes61/61 with the repair. Earlier incorrect-fixture logs are historical, not final acceptance.

All10 focused browser checks pass across all five projects: unchanged vacuum width bounds and both original terrain bounds, with exact photographed200/6000/40000m asserted. No retries. Fresh fallback_camera_review final followup reports no remaining finding and confirms source/effect/seed/assertion boundaries. These focused checks are not release proof; the historical attempt3 lesson remains binding. Fullgate after renderer change is running; then mutation alone, finalfullbrowser, finalhighreview/independentreleaseacceptance/commit/merge/deploy are required.

## Release-check checkpoint

Complete local gate exits0 after the repair:1980unit tests,1980coverage-instrumented tests, unchanged coverage floors,13browser smoke and5subpath checks pass. Docs-layout checker exits0, zero failures/warnings. Mutation ran alone:848unmodified control tests pass and all21declared faults are CAUGHT by named assertions; exit0, no survivors/load errors. Raw logs and complete original failure artifacts have SHA256 manifest.

Source review is clean at high depth and independently; final fullfive-browser acceptance remains required. Next preserve/push this coherent source/test/docs/evidence checkpoint, run the full suite against its unchanged runtime, then final review acceptance/main merge/main gate/deploy. No Phase6b tick or live claim. Main/live080f108,60%,four phases remain.
