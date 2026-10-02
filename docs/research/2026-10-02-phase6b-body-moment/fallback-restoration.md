# Deliberate broadside restoration — Phase 6b

Steve’s conditional fallback was independently confirmed by ideal_family_review. The exact decision and feasibility limits are in coupled-fin-fallback-ruling.md. This change restores the shipped Phase 6 force/control model, rather than tuning the physical model or claiming that parked work ships.

## Restored and retained

Constants, state, commands, actuation, guidance physics and aerodynamic source match main 080f108 byte for byte (fallback-restoration-pins.json). Earth rate returns to zero, reserve to 18 t, deorbit aim to 841800 m. Entry schedule/range controller and unaccepted body/fin torque allocation are parked. The step restores only Task1 force wiring; Task5 current specific force, pressure/thermal failures, current pad support, collision before fuel use, full-throttle demand, dry mass/inertia and cancelled ignition remain. The independent final descent braking envelope and first-breakup debrief capture remain. Intro uses its original descent law.

Scientific coefficient/vector/source tests and the sweep are preserved verbatim in parked-files/*.txt, with SHA256 manifest. Accepted c24235f source and Linux artifacts remain in Git history. The latest 15-file unaccepted runtime patch/pins remain committed at 5ae777f. Nothing is reset, rebased or silently discarded. No truth registry row or physical assertion width is removed.

## Characterizations and checks

The fallback restores the original 4 km/s force-only null cap premise; the physical-axial opposite-time integration witness is preserved verbatim. The generic lifting-fall agreement witness remains. Rotation keeps its original default-zero contract and all nonzero-frame analytic properties. The approved firing-geometry coast witness remains. Peak characterization centers return to shipped Phase6 1459 K (±5 K) and 170900 W/m² (±5%), with absolute tile/range/time/authority bounds unchanged.

The two original Task5 aerodynamic felt-g input fixtures no longer reach13g under the restored model. Watched red retained. Replacement physical six-engine/1000 kg fuel/tail-first850m/s at20km produces13.38095g felt,12.38582g net,32.11869kPa,748.633K; all original literal limits and failure assertions remain. No stale force injection or limit relaxation.

Build and lint pass; truth8/8IN; focused91pass. Broad run1959pass/13fail: eight expected stale golden shapes, four camera vertical edge failures, and one timeline characterization from the retained600s window now including touchdown. CLI exclude did not remove project golden tests, so this is not a clean non-golden run. Timeline now explicitly asserts ENTRY/MAX-Q/FLIP/LANDING BURN/TOUCHDOWN. Camera framing diagnosis resolved by fresh independent review and unchanged-bound regressions; no golden regeneration, complete gate, coverage, mutation, fullbrowser, merge or deploy claimed.

## Linux audit and review

Linux37035784562 succeeds from immutable845c41d9 snapshot;21runtimepins match. Dual-baseline field audit matches predicted reach. Intro physical motion/engine sequence are exact against080f108; reentry first180s kinematics exact. Retained600s endpoint lands457.158s. Independent fallback_physics_review approves keeping the original first>79000/180s<50000/vy<-100 literal descent bounds at its exact21600-step sample, with additional600s landed/no-crash/vy0/alt<26 assertions. All-sample survival and900s scenario cap retained. Historical lifted-model endpoint characterization is superseded under the approved fallback, not relaxed to admit a failure. Original models/tests remain preserved.

Camera decorative shake is bounded by rendered ground and already-framed-vehicle clearance; physical follow law and oscillator clock unchanged. Fresh fallback_camera_review independently confirms interval signs, floor, crashed give-up and reduced-motion behavior. The original four live framing failures now pass. Novel regression initially had reversed ground screen inequality and an already-unframed sticky target; corrected without changing source constraints.

Fixture integration initially added duplicateSAMPLE_EVERY import, then referenced world.frame instead of existingworld.updatedFrameCount. Both are corrected; red logs retained. First fullgate reaches1976pass/onefield-name failure, stops before coverage/e2e. Corrected golden replay17pass; coverage is now running. No fullgategreen, mutation, fullbrowser, merge or deploy claimed.

Coverage completes successfully:149files/1977instrumentedtests pass; aggregate99.1%branches/99.63%lines/99%functions, allunchangedglobal/per-layerfloors pass. Fullgate rerun is now warranted after correcting its solefield-namefailure. No additionalcoveragecampaign needed.

Complete localgate now exits0 aftertheknownreplaytypo correction;1977units/1977instrumentedunits, unchangedfloors, smoke and5subpathchecks pass. Fullfive-browser suite running; mutation andfinalacceptancepending. Checkpoint maypreserve/pushcoherentsource+Linuxfixtures+audit, but phasecannotmergeyet.
