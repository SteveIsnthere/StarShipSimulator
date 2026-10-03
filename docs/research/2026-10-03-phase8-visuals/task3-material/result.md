# Phase8 Task3 belly material — diagnosis checkpoint

The material remains unfinished and unmerged. HEADbd7b19a supplies the separately verified temperature glow; current uncommitted source is pinned in attempt3-source-sha256.json. Startup-only albedo copies preserve coverage and input ownership; the shader consumes the original physical shared sun and normal map. This authored projection depicts a viewer-facing belly with stainless silhouette rims, not roll dynamics or measured tile photometry.

## Recorded cycle1

1. Fixed +x dark flank: all five original sunlight ratio checks failed. The original-albedo identical-light GPU control confirmed asymmetric material bias. Rejected fixed +x projection.
2. Fixed viewer-facing normal.z projection with matte response, seam/cell .28/.34:29 passed, one original iPhone landscape morning ratio failed45.9/36.9=1.244 against unchanged1.25. Pure/GPU material, temperature, windward, restart, selected-booster and shadows passed.
3. Only authored display range raised to .38/.44:29 passed, one original Pixel landscape morning ratio failed45.4/40.1=1.132. This rules out assuming a single display-range adjustment robustly fixes the contract.357 view tests pass; build297.2kB; original sunlight detector, ratio1.25 and shadow margin8 untouched. No retries or physical changes.

Cycle1 is exhausted. A fresh independent assessment is required before cycle2. The peer subscription preflight (`invoke.py claude --check`) exited2: `CLI authentication check failed; inspect native login status. No model was started and no credentials were changed by this helper.` This is a one-question diagnosis of a small material change, so cross-agent-review allows skipping Pro for a fresh in-harness reviewer. Packet: /tmp/starship-tile-review.md; reviewer tile_cycle2_fresh_review. Source is frozen during assessment. No review result or new attempt is yet claimed.

## Evidence limits

Raw failures, controls, build/view logs and actual PNGs are preserved per attempt. projection-cycle1-attempt3-captures contains current generated material/windward/equal-flux PNGs and the failure screenshot; the failure screenshot includes the report overlay and is context, not an isolated hull measurement. The log's readFrame statistics use its unchanged overlay-hidden capture method. Phone projects emulate Chromium viewports/touch, not real handsets or Safari.

Task3 still owes a corrected material retaining original sunlight tests and actual six-scene captures. Tasks4–6, phase-wide gate, full browser suite, frame budgets, review, main merge and live verification remain open. Core, presets, goldens and legacy are unchanged; no physics result is claimed.

## Cycle2 attempt1 — corrected material verified

The fresh reviewer completed, with no demonstrated contract conflict. Accepted retained-photo-bias diagnosis; authored neutral tile base plus same normal.z mask for unitgain now replaces photographed belly brightness while keeping steel gain/rims, alpha, geometry, matte and physicalsun. Pure independent-photo-brightness RED79vs13 observed and GREEN fixed. The new controlled realassetGPU test passed before correction, so it is an additional witness, not a claimed RED. Core/presets/goldens/legacy remain unchanged.

Build93473 COMPLETE0/297.2kB; fullview99359 COMPLETE0/359tests29files; browser55958 COMPLETE0/35passes allfive original sunlight/shadow and material/realasset/temperature/windward/restart/booster/genuine-reentry tests, zero retries; lint1904 COMPLETE0/existing BlackBox warning only. Actual productionasset dayPNG and actual phone-landscape isolated hot-equal-flux scene inspected. Viewer-facing matte tiles and lit stainless silhouette read distinctly; onset is temperature-owned. Sourcepin JSON/captures/logs retained perattempt without overwriting failed history.

Task3 remains open only for actual six-scene captures/final integration. These focused checks do not claim whole-phase performance, gate, release review/main/live. No owner question or active heavy check.
