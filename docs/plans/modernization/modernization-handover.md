# Modernization — handover

The unattended run's report. Updated as phases land; the last section is always current.

## Status at a glance

| phase | state | merged |
|---|---|---|
| 1 Green gate and cut-over | done, live | `f14aadb` (2026-10-01) |
| 2 Truth harness | done | `53e3c26` |
| 3 Design pass | done (review page published) | `53e3c26` |
| 4 React shell | done, live | `dfab3c8` |
| 5 Guidance on real physics | done, live | `b84b746`, fixed `3429ea1` |
| 6 Ship realism | done, live; gate and live deployment smoke verified | `080f108` |
| 6b Entry on lift | approved fallback implemented; Task5 retained; release checks pending | — |
| 7 Super Heavy | not started | — |
| 8 Visuals | not started (added 2026-10-01) | — |
| 9 UX to flight_sim level | not started | — |

## Shipped

- **The rebuild is live** at https://steveisnthere.github.io/StarShipSimulator/ in place of the 2021 game. Returning visitors' 2021 service worker is retired by a kill switch; the 2021 game is tag `v0-classic`, and branch `classic` is the one-command rollback (`docs/reference/architecture.md`).
- **A gate that is green on your Mac and in hosted CI.** Before: 48 of 1,585 unit tests red on arm64, CI green 2 of 132 runs. Now: `npm run gate` about 3 minutes locally, CI about 8 minutes, green on every push since.
- **A truth harness.** Cited reference bands with a ratchet (`npm run truth:report`), property invariants over every configurable flight, a mutation matrix the suite must turn red (`npm run mutation`, 13 of 13 caught), a debug surface and a browser witness with a positive control.
- **Two real physics bugs fixed**, both found by the new tests: the tank went negative on the emptying step, and the flight editor accepted negative propellant (a vehicle lighter than its own structure).
- **Phase 6, Ship realism** (merged and live): a real Earth (GM, radius, the 1976 atmosphere to its thermosphere), felt g, six Raptors with three fixed RVacs, a heat shield in kelvin against a 1,533 K tile, wind that grows with height and gusts, and a rotating-frame model ready for Earth's spin. Every scenario still lands under autopilot.
- **The design pass**: `docs/design/ux-critique.md`, `design-system.md`, `ia.md`, and the review page below.

## For you to look at

- **The prototype review page** (private): https://claude.ai/artifact/9rAusShWLCkpoHMhoVy5TR — today's interface against the proposed one, surface by surface. Your verdict feeds Phase 4/8 as a scope change.

## Decided on your behalf

- **Pages cut-over executed** as part of Phase 1 (it was in the plan), after an independent review that drove the migration and rollback in a real browser.
- **Goldens**: a measured tolerance (1e-8) off the recording platform, exact on it.
- **Fonts**: Inter / Inter Tight / JetBrains Mono, subset to 52 kB, replacing Barlow.
- **Kit reuse**: flight_sim's `web/src/ui` vendored byte for byte, type-checked under its own settings; nothing in flight_sim changed.
- **Layers pause the flight**, Escape closes the top layer, P pauses (from the IA).

- **Flight screen layout (Phase 4)**: the primary cluster moved from bottom-centre to top-centre. At the bottom it covered the vehicle on the pad and at touchdown. On a phone the world ends above the controls so the camera reframes instead of being covered, and a phone held sideways gets its own compact layout. `docs/design/ia.md` records the change.
- **Flight backing deepened from 62% to 68% black**: the new contrast test measured the label grey at 4.11:1 over a noon sky, under the 4.5:1 floor.
- **Engine states drawn by shape, not blinking**: the old blink tests were passing on nothing; the new specs check the shapes and that reduced motion adds no transition.
- **Bundle budget 250 → 300 kB** for React DOM (275 kB measured), and one design-scanner exception for the throttle slider's measured fill. Both recorded where the rules live; confirm or overrule.

- **Phase 6 calls, made unattended (you are buying these; the model is in `docs/reference/physics-model.md`):**
  - the tile limit is NASA's Shuttle HRSI 1,260 °C (Starship's is not public), so the deorbit may park rather than move the limit;
  - the six-engine UI is minimal now and the look is Phase 9's (UX);
  - *Engines* (all) lights the three sea-level engines, as in 2021;
  - Earth rotation uses a rotating ground frame at Starbase's 26°N, done last;
  - spool-up is the existing ignition transient, not a second invented one;
  - **the landing reserve is measured, not computed (changed during Task 3).** The plan's formula gave 6.3 t, but the landing programme spends 12.0 t engine-out, so a computed reserve would have crashed every deorbit. It is 18 t after Task 4c (the worst engine-out use plus about a third), health-checked the way the deorbit aim is; engine-out deorbits now land with 3.8 t instead of 0.0–0.2 t;
  - **the RVacs (Task 4b)**: 258 tf and 380 s from Wikipedia; the 2.3 m exit is the commonly reported figure with no primary source found. The autopilot lights no RVac in Phase 6 (a vacuum deorbit burn on RVacs is later work); *Engines* (all) lights the sea-level three and shuts everything down. The controls and HUD show six marks in two labelled sets, keys 4–6 for the RVacs: a minimal UI, the look is Phase 9's;
  - **the flip trigger plans on the slowest engine start** (1.2 s, Task 4c), not 2021's 0.6 s constant.

## Parked — yours to decide


- **No LICENSE** in a public repo. Choose one before this grows further.
- **Two dead remote branches**, `origin/exp` and `origin/feat/modernize-app`: nothing in either is worth keeping. Delete when you agree.
- **Codex can't run as a peer reviewer**: `~/.codex/config.toml` names `gpt-6.1-sol`, which a ChatGPT login does not support (still so on 2026-10-01, Phase 6's close). ChatGPT Pro and fresh subagents reviewed instead. Changing that lever is yours.

- **Guidance (Phase 5)**: the autopilot's throttle laws, landing-burn sizing and the HUD impact predictor run on the simulation's own gravity, thrust and drag. The flip trigger keeps its one-engine pessimism with no added margin, because a one-engine-out deorbit lands with almost no propellant (the 12 t dump limit is the real constraint; backlog).

## Follow-ups recorded for Phase 9 (UX)

- The throttle and yoke sliders follow the simulation only on keys, store changes and when touched, not while the autopilot moves them (the Svelte slider never followed at all).
- The debrief has no grade or comparison with the previous flight yet (ia.md asks for both).

## Incidents

- **2026-10-01, main red for one merge.** Phase 5's goldens were re-blessed on the Mac; they replay bit-exactly only on x86-64 Linux / Node 22, so CI failed in the 16th digit and the deploy did not publish (the live site kept the previous build). Fixed in `3429ea1`: fixtures now come from `.github/workflows/golden-regenerate.yml` (push a branch as `golden/<name>`), `golden:regenerate` refuses anywhere else, and the policy says so.

## Current checkpoint

Phase 6 is merged and live at `080f108`: complete main gate green, hosted CI
`36956332929` and Pages deploy `36956332944` succeeded. Live deployment smoke
5/5 passed using `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`; the served service
worker matches the verified build byte for byte (`b72a7b0bad39`). The first
live attempts exposed a Node CA-store mismatch, not a manifest defect; both
failed logs and the final green log are retained. Certificate verification
was never disabled. Two hosted menu checks needed their existing retry;
recorded for Phase 9 with exact evidence.

Six of ten phases are done (60%). Phase 6b is unfinished on `claude/entry-on-lift`, created from `080f108`. Task 1 diagnosis is stopped after three failed 300 km attempts; independent Task 5 is partial. The goal contract names the next task and owner decisions. The final checkpoint below supersedes the retained historical measurements.

[Phase 6 close evidence](../../research/2026-10-01-phase6-close.md).

## Retained verification history (2026-10-01)

- Latest graphics change: `4c03814`, the plume timing/projection and flight-reset repair. Physics and goldens are unchanged from the independently reviewed implementation. Checkpoint `6e3f514` changes the screenshot-scale helper and adds its regression fixture; its complete local gate passed. That checkpoint was pushed; its low-altitude length failure then prevented a merge. Both measurement and final verification are now complete at `1644fe1`, as recorded below.
- Historical verification before the requested rerun, on `f81908b`: `npm run gate` green (1,935 tests, coverage floors, e2e smoke, subpath deploy); `npm run mutation` 18 of 18 caught; `npm run truth:report` 8 of 8; `/code-review high`; independent physics review (ChatGPT Pro, three rounds, every finding fixed: fixed RVacs, the turbulence sweep, the radial coast, the throttle law, break-up on the tile temperature).
- Historical `npm run test:e2e:full` before this goal's requested rerun: **428 passed, 0 failed** (33 min, all five projects). This is superseded by the failing reruns below. Earlier full-run failures (the debrief's stale heat bound, a pixels flake) are fixed or re-ran green.
- Current source verification on `4c03814`: complete local gate green (1,940 tests, coverage floors, smoke and subpath deployment), hosted CI `36940931396` green, independent graphics review clean; **full e2e red: 427 passed, 1 failed, 11 configured skips**.
- Requested rerun on `92ed3d6`: 426 passed, 2 failed, 11 configured skips. The repair changed no browser bounds or retries. Final gate and hosted CI passed, but the final full-suite rerun still fails the iPhone portrait vacuum-width check. The three-attempt contract stopped the phase; Steve has now approved exactly one further attempt, now in progress.
- Left at that historical checkpoint: merge/deploy Phase 6 and start6b. This is completed at `080f108`; do not redo it.

## Phase 6 progress (2026-10-01)

- Tasks 1–4 on `claude/ship-realism`, each pushed with its Linux-regenerated goldens and an audit row (P6.1–P6.5): felt g, the 1976 thermosphere, the starting Mach, the emptying-step thrust; Earth's GM and radius; the measured landing reserve; six Raptors; the start transient.
- **Independent review of Tasks 1–3** (a fresh subagent; Codex cannot run here): no correctness bugs in the physics. It found one real edge (an ignition finishing on the emptying step thrust for free, fixed in `cff0046`), stale docs and four tests my planet rewrite had made tautological (re-anchored to fixed figures). Both fixed.
- Task 8 (the heat shield) done: Sutton-Graves in W/m², skin temperature in K, the 1,533 K limit; the deorbit peaks at 1,459 K. Task 5 parked (see Parked), and 6, 7, 11 with it.
- Task 10 done (`172fcb1`): a scenario's wind is the surface wind, carried up NASA's power-law profile, with MIL-F-8785C Dryden turbulence from its own seeded stream. Calm air is untouched: seven goldens kept their rows bit for bit; the headwind fixture moved and still lands.
- Task 9a done (`3facf39`), and the rest of the rotation plumbing (`8515c18`): Coriolis and centrifugal terms, the ground-relative deorbit conic, the converted orbital presets, the weight the burn predictor uses, every inertial truth test transformed and proved with Earth's rate on.
- **Earth's rate is NOT switched on — decided on your behalf.** With it on, the circularize-then-deorbit flight missed by 11.1 km against its 10 km acceptance; the broadside descent has no range control, and the turning ground widens the heavy/light spread from 5 to 14 km. No constant holds both that bound and the 1 km health test. Range control is what Phase 6b's entry on lift builds, so the switch is 6b Task 1b, with the measured numbers in the plan.
- The close: independent physics review by ChatGPT Pro in three rounds (Codex still cannot run). It found the RVacs steering with the gimbal (in the integrator, the torque, and the throttle law), a turbulence sweep-speed floor, and two latent rotating-frame edges; all fixed with tests. The full e2e run found the tile reading 0 K on the pad (equilibrium against absolute zero, and the debrief e2e bound still in the old units); fixed with a radiative sink, the air below 86 km.

## Roadmap update (2026-10-01, Steve)

- **Phase 6b, Entry on lift**, approved: the autopilot gets an entry angle-of-attack schedule, and the parked aero tasks land on it, with a stop rule if no angle keeps the tile under 1,533 K.
- **Phase 8, Visuals**, added before UX (now Phase 9): engines and plumes, re-entry and heat, the environment, the vehicle and camera. It publishes its visual direction and proceeds without waiting.
- The finished Phase 1–5 plans are closed out; the roadmap's Status names each merge commit.

## Retained bounded-feedback checkpoint (before Task 5)

Both owner corrections remain implemented. Task 1 now includes scheduled-entry range prediction through the same fallAcceleration/body forces as step(), including planned dumping to22 t, current fin area, mean wind and rotating-frame gravity. It forecasts to1 km with midpoint0.5 s steps and a2500 s cap; convergence at0.25 s and real-step witnesses in both directions hold the unchanged new2 km prediction bound. That is an entry-range approximation, not the existing metre-accuracy burn/fall witnesses, which remain intact. The first range witness failure came from a fixture whose locked fins retracted; its setup was corrected without changing the2 km bound. Genuine tracking-bias cases then watched red and passed after prediction carried the observed near-track pitch error. No attitude command is enlarged by that bias.

Operational guidance solves an entry-angle trim within the existing±3° authority, refreshed once per simulated second. Countdown and trim are in SimState; synchronous scratch buffers carry no flight history. Explicit offline entryAngleOfAttack overrides keep the prescribed sweep open-loop. Determinism, reset and override witnesses pass. Measured update cost1.825 ms once per simulated second; actual entry steps including updates average0.02185 ms in the on-demand probe. This is not the complete phase benchmark.

Secant calibration from recorded aim/miss pairs gives currentDEORBIT_ENTRY_RANGE3,812,057 m. Final fixed-angle sweep at that aim selects60°: deorbit1463.710 K at70.051 km, miss-14.8 m, landed2959.675 s; reentry1346.043 K, landed815.958 s. This satisfies the preset sweep's thermal/10 km feasibility rule. With bounded feedback and measured tracking bias, preset one-km health, demo ten-km acceptance, all three reserve checks, longitude/light/engine-out/120 km range envelopes and all intended auto-land scenarios pass. The last full54-check landing run was51 pass/3 fail; its residual flux characterization was subsequently remeasured under Task 1's explicit±5% permission:161759.227 W/m², band centred161800, absolute thermal limit retained. The updated scenario/entry-prediction focused run passes24/24. Build and lint pass; final truth report8/8 IN. No complete unit suite, mutation, Linux goldens/audit or phase gate yet.

**Outstanding acceptance:** coast starts1433.05 s against the unchanged>1500 s assertion;300 km entry still breaks at1533.03 K/68.441 km. Neither assertion is changed. Range diagnosis1 rejected fin-area variation as the principal shortfall (neutral/current forecasts differ<1 km), found actual tracking offset~2.5° causing late inward lift; measured-bias prediction fixed preset/demo range. The300 km case has used only diagnosis1: trace shows thermal breakup atalpha60.60°, trim-0.113°, not pressure. Next bounded task: forecast the thermal envelope of the existing±3° range authority for that300 km entry, using the shared aero and thermal functions, before choosing a constrained guidance change. Record diagnosis2, then its result; no extra attempts are authorized. Do not change the tile limit, burn bounds, eta bridge or range limits. The coast assertion still needs its own principled diagnosis; do not delete or relax it. Earth's rate remains zero until Task 1b. Task 5 regression tests remain watched-red, with runtime fixes not begun.

[Exact evidence](../../research/2026-10-01-phase6b-task1-progress.md).

## Historical thermal diagnosis and Task 5 checkpoint (2026-10-01)

Task 1's 300 km diagnosis is stopped after attempt 3. Diagnosis 2 added peak skin temperature to the existing entry predictor using the shared Sutton-Graves/radiative-sink functions; four flown fixed-fin/tracking-bias witnesses and step convergence retain the new 1 K bound. Watched red and green are retained. At the actual 300 km flight's 80 km crossing, forecasts at 57/60/63° gave 1549.25/1544.99/1542.88 K using observed -0.212° bias. Even the -3° tracking-bias forecasts exceed 1533 K. No fixed choice within existing authority was thermally feasible.

Diagnosis 3 retained safe range solutions and otherwise chose the coolest reached forecast among the range candidate and the same ±3° endpoints, once per simulated second. Selector red/green and 51 focused passes are retained. The real 300 km check still returned `brokeUp`; its landing assertion remains unchanged. No fourth run, including a full suite containing that check, is authorized while Steve's exception is pending. Thermal build/lint passed and truth remained 8/8 IN before the subsequent throttle change.

Coast diagnosis 1 independently records ignition at 1433.05 s: pad gap 8,811,094.695 m versus predicted burn + coast + entry range 8,811,117.731 m. Keeping ignition after 1500 s would require changing the measured aim by approximately 523 km. Its old assertion remains unchanged pending the owner's choice of a firing-geometry witness.

Independent Task 5 is partial. Its previously watched-red 60%-actual-throttle regression now passes: requested acceleration divides by full-throttle `getTotalMaxThrust`, retaining NaN/Infinity clamps. All 38 control-contract tests pass. Failure-freshness runtime changes and current-thrust/felt-g witnesses are not implemented; two pressure regressions remain red. No build/lint after the throttle edit, golden audit, complete gate, independent review or source commit is claimed. Earlier landing acceptance predates this throttle change and must be verified under the final model.

Owner decisions pending: replacing only the obsolete coast floor; bringing Earth rotation forward into coherent Tasks 1+1b with exactly one additional 300 km verification. Until recorded, rate stays zero and the diagnosis stop remains binding. The preset fixed-angle sweep's stop rule has not fired. Preserve physical limits, source bridge, guidance authority and every other assertion.

Evidence: `thermal-predictor-red.log`, `thermal-predictor-green.log`, `thermal-envelope2.log`, `thermal-envelope.ts`, `thermal-trim-red.log`, `thermal-focused.log`, `thermal-build.log`, `thermal-lint.log`, `thermal-truth.log`, `300km-attempt3.log`, `task5-throttle-green.log`. Logs are raw, including failures. The refreshed `in-progress-source.patch` includes current thermal/throttle code and passes forward/index and reverse/worktree checks with `--unidiff-zero`; it is recovery evidence, not shipped physics.

## Historical refreshed checkpoint and owner approvals (2026-10-01)

This section supersedes earlier checkpoint status. Phase 6 remains merged/live at `080f108`; six of ten phases are done (60%). Phase 6b is unfinished on existing claude/entry-on-lift. No unfinished runtime source has been committed or merged.

Steve's latest “sounds good” approves both previously presented recommendations:
1. Replace only the obsolete >1500 s coast characterization with a calculated firing-geometry witness. Keep burn sequence, duration bounds, total-flight checks and genuine predictor cap/null cases.
2. Bring Task 1b Earth rotation forward and finish Tasks 1+1b as one coherent Fidelity change. Permit exactly one further named 300 km verification after that change and its other focused acceptance. The three authorized diagnoses are exhausted. An accidental fourth run occurred when Vitest ignored the global CLI exclude; it still broke up and grants no authority. The new exception is one further verification after that accidental run. If it fails, stop that diagnosis again and report; do not change physical limits or rerun for luck. A successful result permits the ordinary required release gate containing the case, not a new diagnosis campaign.

Current source still has rotation zero and the old coast assertion; the approvals authorize their next implementation. Preserve1533 K, one-km health, ten-km landing, burn bounds, ±3° authority, the fixed source bridge and general three-attempt rule. The preset sweep stop rule has not fired.

Task 5's current-force fixes are implemented: fresh pressure/felt-g breakup checks, ground support from current vertical specific force, collision before fuel use, fresh TWR, and breakup shutdown with dry mass/inertia and cancelled ignition. Full-throttle demand correction is retained. Real physical fixtures replace fabricated stale values without weakening their properties. The dependent final-descent v²=2ah braking envelope/feed-forward belongs to Task 1 Fidelity; intro keeps its original descent law. Before-flip/two-out now lands. Do not redo these fixes.

Build, lint and truth report passed on the reviewed source. Explicit safe collection passed 805 core/proof tests; the focused landing acceptance passed 36. Independent review found one P2 wet inertia after breakup: watched red, fixed, reviewer independently passed 10 regression tests. No substantive finding rejected. This partial review does not replace the phase's final high-depth code review/independent physics review.

Mac preview trajectory audit separates entry context, Task 5 and the dependent profile. Task 5 changes RTLS kinematics (max86.7589 m altitude/2.5201 m/s vertical speed); other seven kinematics are identical, though fresh force/time readings move. Profile changes landing-burn and headwind trajectories (max12.3379 m/4.11582 m/s); intro is byte-identical across that adaptation. No golden fixture was changed. Linux regeneration, complete phase audit/coherent source commits, mutation and complete gate remain required.

The remaining-layer run is red: 1099 passed/4 failed in 94 files. Three failures are in tests/hud/debrief.test.ts (breakup reason, measured vertical speed and peak-Q exceedance). One is tests/view/dynamic-pressure.test.ts (shake witness attitude speed6.38 deg/s against unchanged<6). First task: understand and fix these real regression/fixture causes while preserving each assertion's property and bounds. Read affected code and applicable frontend conventions before changing it; count each diagnosis. Then finish the approved coast/rotation changes and their bounded verification. Do not start Phase 7 yet.

Recovery patch includes all unfinished tracked/untracked source and tests. Check forward against the index and reverse against current source with --unidiff-zero; never apply over existing edits. Vitest --exclude did not prevent orbit-demo execution. Use explicit filenames and verify collection before any run while a named check is stopped. Vitest list --json takes an optional output filename: an earlier invocation overwrote analytic-laws.test.ts; it was restored byte-for-byte from HEAD and has no diff. Always supply a separate JSON output path. Exact failures/restoration/review/audit are retained in the progress evidence. Earlier green acceptance is historical where the model has subsequently changed.

## Rotating-entry checkpoint and range stop (2026-10-01)

This section supersedes the previous checkpoint. Phase 6 remains merged/live at `080f108`; six of ten phases are complete (60%). Phase 6b remains unmerged on claude/entry-on-lift. All unfinished source/tests stay uncommitted, with the refreshed recovery patch checked forward/index and reverse/worktree. No golden fixture has changed.

The four HUD/view regressions are fixed: the watch captures the first current-force breakup state and freezes it before debris motion; first-step/freeze/reset witness watched red. The shake rendering subject is dry, with CoM21.8 m beyond the area-weighted neutral fin station21.61 m; the former20 t load is on its unstable side. No pressure, motion, screenshot or timing bound changed; the old unstable positive control remains. Focused72 and desktop browser 2/2 passed before switching rotation on. The final safe unit run after rotation also includes those HUD/view checks; the browser result is pre-rotation evidence, not final phase release proof.

Approved coast replacement is implemented: the sequence check retains coast-before-burn, burn/hand-over order, burn duration and total flight bounds, and brackets the first fixed step crossing the mechanical burn+coast+entry firing point. The obsolete1500 s assertion alone is removed. The geometry checks pass.

Approved Task 1b rate is now EARTH_FRAME_ROTATION_RATE (0.0000655427691429454 rad/s). The new default-rate test watched red at0 and passed after the switch; all 43 orbital analytic/frame/law checks passed. The rotating16-row sweep showed the60° operational reentry taking 985.450 s against the unchanged 900 s harness. The next prescribed 65° candidate lands it in 855.217 s at 1315.063 K, peak flux144021.289 W/m². M_t20/M_b2, eta, authority and tile limit are unchanged. The plan-authorized dated reentry±5% band is centred 144000 W/m²; deorbit's unchanged±5 K characterization is remeasured 1424 K (actual sink-inclusive peak1424.636 K at the first calibrated aim). This is candidate-model acceptance, not a deployed build.

Range calibration remains red. The fixed65° sweep miss-896527.1 m gave aim2,915,530 m; operational miss-1097.610 m. Constant-plus-miss estimate2,914,432 m instead missed-1239.458 m. Secant estimate2,924,026 m misses -1333.183 m. Both focused acceptance runs were66 passed/1 failed/1 intentional300 km exclusion; the sole failure is tests/core/deorbit-range.test.ts's unchanged one-km health check. Its three calibration diagnoses are stopped. Steve has been asked for one further trace-based range diagnosis and one verification, with all limits unchanged; no answer yet. Do not rerun that health flight, including indirectly through a full suite, without that specific answer. Do not continue numerical aim guesses. The approved extra 300 km verification is still UNUSED and must wait for the other focused acceptance to pass. No 300 km run occurred this turn.

The broad unit run initially found three inertial-fixture assumptions after switching the default rate. Diagnosis1 converts the achievable orbital controller fixture to ground-relative circular speed, makes the zero-angular-momentum degeneracy proof explicitly omega0, exercises the same finite-arc bounds at both0/Earth rates, and converts the real caller's post-burn radial input. All assertion properties/bounds stay intact;81 focused checks pass. Final explicit safe collection:147 files/1905 tests pass, with stopped orbit-demo/deorbit-range files and golden replay files absent. This is not the complete unit suite or phase gate. Final build, lint and truth8/8 pass. No mutation, Linux fixture generation, complete gate, final phase reviews or runtime source commit is claimed.

Next dependent action is the owner's narrow range-diagnosis decision. While pending, preserve all source and investigate only independent authorized checks/review preparation that cannot rerun the stopped health/300 km cases. Tasks2–4 have not started; do not silently skip Task 1 acceptance or start Phase 7. Keep the full remaining6b/7/8/9 scope. This turn made concrete source and verification progress; the goal stays active.


## Independent review and browser checkpoint (2026-10-02)

This adds evidence to the rotating-entry checkpoint; it does not complete Phase 6b or authorize stopped range work. The final rotating build passed the shake rendering witness across all five Playwright projects (10/10, exit 0). A fresh independent in-harness reviewer found no actionable findings in the bounded implemented physics/HUD scope, passed 111 narrow tests and four filtered observer cases, and confirmed all 32 source hashes. Claude CLI authentication failed and Chrome was unavailable, so neither cross-vendor fallback ran. No stopped health/300 km flight, full gate, coverage, mutation or golden regeneration ran. Final phase acceptance/reviews remain required.

Full remaining scope is still Phases 6b, 7, 8 and 9. Steve requested goalgen to refresh the handover command; the specific extra range-diagnosis authorization is presented separately with options. Existing approvals and unused extra 300 km verification remain intact.

[Review provenance and browser evidence](../../research/2026-10-01-phase6b-task1-progress/rotation-independent-review.md).


## Standing autonomy checkpoint (2026-10-02, Steve)

This is the current authority and supersedes all earlier pending questions and automatic diagnosis stops in this file. Steve explicitly approved reviewed diagnosis cycles for the entire roadmap: after three failed attempts, get a fresh independent review, record a new evidence-backed approach, then continue another bounded cycle. This reopens the current one-km range failure and later 300 km/plume failures. Limits, bounds, authority, coverage and release gates remain unchanged. No reruns for luck.

Steve also explicitly approved the existing Phase 6b broadside fallback when independent review establishes physical infeasibility within existing authority. Preserve evidence/unfinished work, restore affected aero deliberately with an audit, retain Task 5 fixes, record parked tasks, complete phase verification/merge, and continue 7–9. A red calibration alone does not prove infeasibility; an easier passing model is not a reason to park the approved physical one.

Next task: fresh independent review of the three range aim/miss attempts and predictor/guidance, then record a causal approach before the next diagnosis cycle. The previous bounded physics reviewer excluded range diagnosis and does not satisfy this requirement. No new health/300 km flight has run during this plan refresh. All 32 reviewed source pins still match. Source remains unfinished/uncommitted; Phase 6 remains live at080f108, Phase 6b remains open, and full6b/7/8/9 scope stays intact. No owner decision is pending.

## Successful range cycle and common calibration checkpoint (2026-10-02)

This supersedes previous current-status/stop statements. Phase6 remains merged/live080f108;6b unfinished,6/10 phases complete. Standing autonomy approvals are binding; no owner question pending.

The fresh fallback range review led to exact-input traces: endpoint interpolation left17.8km candidate residual at79km with safe unsaturated authority. Watched-red Bug-fix regression and safeguarded nonlinear solve preserve +/-3deg authority/thermal guard;12 solver tests pass. Real health6/6 and focused95/95 pass at aim2924026, then the named extra300km verification passes and is CONSUMED. Complete units at that aim1987pass/8 stale golden schemas only; no other unit failure. No fixtures written.

Fixed sweep at2924026 had no qualifying row. Independent calibration follow-up retained the open-loop measurement contract, rather than silently enabling feedback. Attempt1 measured secant2750421:fixed65+7459m at1424.567K, but operational120km+41616m exceeded40km. Attempt2 trace shows signed overshoot established during saturated+3deg entry; powered stage recovers only110m, burn cuts on guidance below240m/s ceiling. Attempt3 updated measured fixed-root2758826 passes fixed65+0.3m and120km+37321.649m. Final prescribed16-row sweep confirms65 is the only deorbit angle below1533K and within10km:1424.614K at68.328km. The cooler60 row misses+682km. M_t20/M_b2,eta,reserve22t,bounds and authority unchanged. Fixed reentry misses remain diagnostic; operational900s is mandatory.

Final build passed; complete units/truth under2758826 are next. Recording-platform fixtures/audit/margins/coherent source commit remain owed; Task1/1b checkboxes stay open until that checkpoint. Tasks2–4 not started, no partial phase merge or phase7 start. No full phase gate/mutation/final reviews claimed.

Evidence: range-cycle2-review.md records approaches before execution and fallback review dispositions; range-cycle2 baseline/solver-inputs/red/green/health/acceptance logs, rotation-300km-approved-verification.log, fixed-calibration1/3 logs, fixed-calibration2/3-120km traces, rotation-accepted-sweep.log. Raw failures retained. Earlier32 source pins are historical; new pins/recovery patch will be refreshed before checkpoint.

## Linux audit and narrowly pending window decision (2026-10-02)

Final common aim2758826 complete units1987pass/8 stalegolden-only failures; build/lint/truth8/8pass. Actual deorbit measurement lands+6.851m,1425.663K,3079.233s,6.276t left; reentry855.217s,1315.063K,144021.289W/m²,miss+1756315.6m (not pad accuracy). Beforeflip1km70.030m/s/peakflip151.475deg/miss-0.307m versus old70.076/144.922/+0.3165; full old/newbelly tables retained. Intro9.858s/allenginesoff, every existing margin outcome unchanged including known impossible landingburn/two-out crash.

Linux recording run36985191265 succeeded from immutable764d191 snapshot;46 sourcepins match. All8 artifacts expectedly move with2 entry-history keys; full field/digest audit and updated margins retained. CopiedLinuxartifacts and audit rows are unfinished source: numerical replays/unification26pass, but one fixture characterization fails (180s reentry endpoint h<50km/vy<-100). Fresh independent fallbackreview/trace establishes intended lifted entry: crosses50km569.75s,600s h43238m/vy-251m/s,landswithin900.

Owner question is pending for only reentry recording-window180->600s, keeping every literal numeric assertion and existing heat/900s/range/authority/source constraints. No duration/assertion changed; do not treat pending choice as approval. Current gate is not green. Keep Task1acceptance open; Tasks2–4/nextphases cannot start yet. Independent Task5Bugfixes are implemented/tested/audited; its two backlogrows can close in this branch. No runtimecommit/phasegate/mutation/finalreview/merge claimed.

If approved: record all8 again onLinux with only that durationextension; prove identical existing361sample reentryprefix and separately audit840added samples, then coherent source/fixtures/audit commit and Task2. Preserve initialrun/failedcheckpoint. Initialrecordingbranch remains until finalartifact checkpoint.

## Reentry recording exception approved (2026-10-02)

Steve explicitly answered “yep approved” to extending only the reentry golden recording180->600s. This supersedes the pending window decision above. Keep all literal numerical assertions, uninterrupted survival,1533K,900s, range/authority/eta contracts intact. Regenerate onLinux/Node22; preserve the361-sample180s prefix exactly against initial run36985191265, audit840newtail samples, and require all seven other fixtures byte-identical. No owner question is pending. Task1 remains open until this artifact audit/checkpoint is complete; then continue Tasks2–4 and full6b/7/8/9 scope.

## Tasks1+1b coherent checkpoint (2026-10-02)

Body-axis lifting entry andEarthrotation are accepted at common2758826m/65°/22t with all range,thermal,900s and authority limits retained. Approved reentry600s artifact audit passes:original361samples exact,840tail audited,sevenother files identical. Fullunits1995/1995,lint/build/truth8/8pass. Window/camerahelper independentreview clean. Task1/1b andTask5 complete onbranch;phase6b stillopen,main/livePhase6. NextTask2CoP/moment,then3fins/4RCS and fullphaseclose;full6b/7/8/9goal unchanged,no owner question pending.

## Task2 unaccepted model and CI consumer repair (2026-10-02)

Task1/1b/5 coherentc24235f iscommitted/pushed,recordingbranchesdeleted. HostedCI37017954727 red onlyreentrycameraidentitycallback30stimeout;local1995unitspass remainsMacproof. Splitconsumerproof into8×3individualcomparisons withliteralbounds/timeout/retries unchanged;isolatedc242build/focused83pass,independentreviewclean. Hostedverification pendingrepairpush.

Task2 bodymoment implemented butunaccepted/uncommitted;64focusedpass/build/lint/truth8/8. Freshreviewconfirmedsource/sign/tailgeometry,foundmixedgustsnapshot;watchedred,fixed,quadrantvectorproofadded/reviewed. Correctedrealdescents:beforefliplands29.275s;reentry337.175s/deorbit2441.558s thermalbreakup withRCSempty,62.40/78.55%RCSangularimpulse. Oldstaticfinscannotcountermoment atsampledstates;thisdoesnotproveplannedTask3 infeasible or thermalcause. No findingrejected,no limits/authority tuned. Nextrepresentativestate/timeline capture andsource-backedTask3surfacegeometry/law/torqueenvelopewithfinsremovedfrombodyarea,thenfaithfulsharedforceimplementation ifbounddoesnotreject. Readnewbody-momentresearchruling/review;recoverunfinishedsource onlyfromnewpatch/pins ifabsent. Task2–4/fullphaseclose remainopen. Main/livePhase6,full6b/7/8/9scope remains,noownerquestionpending.

## Coupled surface diagnosis prepared (2026-10-02)

Phase6 remains main/live080f108;60% by phase count. Task1/1b/5 checkpointc24235f and camera grouping repair556617d are pushed. Hosted37020750232 passes2011unit and2011coverage-instrumented tests; gate red on unchanged coverage floors (global branches98.55/99%, physics lines99.52/100%, functions98.96/100%). The timeout grouping repair succeeded. Coverage work remains mandatory at the phase close; no green gate claimed.

Three read-only fin measurements and fresh independent review are retained in docs/research/2026-10-02-phase6b-body-moment/. Actual/intended snapshot and stage findings fixed without changing runtime. RCS exhaustion precedes >10-degree loss and breakup. The longitudinal pressure candidate is statically insufficient; the generous observed-path impulse bound remains below favorable fullRCS budgets, so combined feasibility/fallback is not established. Zhang2021 explicitly describes a skewed front hinge; longitudinal pairs remain a named simplification, with no CFD coefficient/CoM transplant or fitted correction.

Fresh reviewed next cycle: couple one shared hypersonic pressure force to translation/moment and actual paired-command authority (including neutral torque, unchanged slew/limits); remove fin inflation from body, keep RCS/gimbal. One reentry/deorbit diagnosis, stop atMach5 if reached; that pass is not landing acceptance. The unconnected primitive and independent vector/hand-pressure proofs are implemented; build/lint/truth8/8 and focused30pass. No runtime coupling, low-Mach model, accepted source/fixture commit, phaseclose or fallback claimed. Tasks2–4 remain open; main/live unchanged. No owner question. Full6b/7/8/9 scope remains.

## Coupled surface cycle exhausted (2026-10-02)

Task3 is now coupled in the unaccepted working tree: one shared hypersonic pressure law drives translation, moment, paired-command authority and forecast; hull-only area removes fin inflation. Current-wind/returned-attack mapping shared by controller/actuator; forecast low-Mach area cache defect fixed with watched-red witnesses. No low-Mach surface law invented. Task2 bodymoment remains unaccepted; goldens still accepted Task1 checkpoint.

Cycle attempt1 operational reentry/deorbit both exhausted RCS and broke up. Independent review identified total torque being requested from RCS despite fin contribution. Attempt2 corrected residual allocation after actual unchanged slew and final0.99 mapping; thrust/reserve/deadzone preserved. Reviewer found a superseding-alignment stale raw request, watched-red/fixed; ordinary proportional command carryover retained. Build/lint/truth8/8 and10files/100focusedtests pass. Attempt2 reentry empty288.0417s/1329.658K, breakup334.15s/1533.1955K; deorbit empty2437.2917s/1452.5297K, breakup2442.4917s/1533.2216K. RCS usage70.2565/83.0759% is measured usage, not minimum budget. Integrated snapshot/new commands labeled; breakup-reset mass excluded from totals.

Attempt3 prescribed fixed45/50/55/60/65/70/75/90deg, both entries, all16break beforeMach5. Reentry breaktimes560.983/509.200/466.642/422.875/374.050/316.308/263.283/186.875s; deorbit2443.392/2443.233/2443.950/2443.750/2442.983/2442.217/2441.283/2413.925s. Thermal1533K retained. All-red alone does not establish physical infeasibility: deadzone offset/trajectory still possible. Current three-attempt cycle exhausted; fresh independent reviewer entry_cycle3_review is assessing fallback versus a separately justified next control-policy diagnosis. No further flight until its ruling/new approach recorded. No owner question or blocked goal.

Recovery: coupled-task2-3-source.patch plus coupled-task2-3-sha256.json preserves15dirty source/testfiles, basef51c293,49617bytes, forward/index and reverse/worktree checks pass. Prior patches historical; never apply over current work. Runtime not committed with stale fixtures. Exact red/green/build/lint/truth/flight logs under body-moment research. Main/livePhase6 at080f108,60%;6b/7/8/9 remain. Coverage/fullgate/mutation/fullbrowser/finalreviews/phase merge/deploy still required; no shippedTask2/3 or fallback claimed.

## Known-disturbance cycle and ideal holding budget (2026-10-02)

Fresh entry_cycle3_review confirmed priorcycle deadzone suppressed knownbody compensation; approved recordedFidelity policy correction: hypersonic D-onlyinside0.1rad feedbackdeadzone, D+existingPDoutside. Both fin solve and afterslew RCS use same demand. Thrust/reserve/slew/blend/lowMach/gimbal/physical assertions unchanged. The unaccepted zero-TOTAL-RCS-withbody characterization explicitly superseded by stronger exactcompensation/absentfeedback/offaxis witnesses. Build/lint/truth8/8 and104focusedtests pass, independentpreflight clean.

Cycle3 attempt1 actualoperationalpair stillRCSemptythenloss/breakup. Reentryempty313.4167s/M22.325/1289.750K,break381.2167s1533.1565;deorbitempty2434.025s/M22.780/1447.274K,break2439.5833s1533.261. Beforeempty body+fin+RCS nearlybalance (85.59/−67.01Nm residual),feedback0;realcompensationworks. Attempt2prescribed16rows allthermalbreakbeforeMach5. Correct90deorbitretains5.027sreserve; earliercycle2 zeroreserve-at-breakup was resetartifact, notexhaustion. Stage/integratedforces/issuedcommands/initialtracking distinctions retained.

Afterroot challenged a globaloptimalcontrolproof asbeyondthe prescribedfamily contract, reviewer agreed. Attempt3qualifiedidealpathwitness: exactprescribedpitch imposedexternally, instantunblendedpairedfins, sharedrealsteptranslation/mass/thermal, separateholdingcostincludingI*targetacceleration;freeinitialalignment andoperationaltrimjumps. Grantfull25s×800kN×36.8mgeometricarmbound=736MNms, noothergasexpense. Fixed8angles plus62/68brackets selected65±3 andexistingoperationaltrim policy, bothentries at1/120 and1/240. Allnonthermalrows demand>25s (minimum47.66sat900sreentrytimeout;65±3/op85–97s;deorbit45..75~73.7–146.7s).90deorbitidealthermalbreakbeforeMach5with6.5–6.8sused. Thisisvirtualmeasurement, notrealflight/acceptance/globaloptimal lowerbound. Max-counterfintranslationnotguaranteed globallymostfavorable.

Threeattemptcycleexhausted. Fresh ideal_family_review readingnumerical/physicalevidence beforefallback/newapproach. Firstdtpass includesseparatenormalpre-entryautopilot atdifferentdt, so8s/8Kdeorbithandoff variationconfounds puremodelconvergence; proposedcontrolledidenticalhandoff replay onlyafterreview. Noadditionalflight/changedruntimependingthatdisposition. Currentruntime remainsunaccepted/dirty;prior15filepatchpinsbasef51 historicalafterpolicy change;refreshnewrecoverypatchbeforecheckpoint. Main/livePhase6,60%;full6b/7/8/9remain,noownerquestion. Coverage/fullphasegates/reviews/merge/deploy remain.

## Independently confirmed broadside fallback (2026-10-02)

Fresh ideal_family_review confirms approvedprescribedfamily infeasible withinexistingmodeledauthority aftercommonhandoffnumericalrepair.22completehandoffs/44rows;alloriginal1/120physicsfields exact. Deorbitdt differences≤.00834s/.00805K/.0415equivalentgas seconds;reentry≤.0125s/.0327K/.0958s. RemovingALLinertial allowance stillselected65±3/operationalrequire84.985–97.305svs25s;lowestnonthermal47.660s@900stimeout;deorbit45–75alloverreserve,90thermalfailsbeforeMach5with~6.504sused. Full736MNmsgeometricbudget,freealignment/instantfins/free trimjumps. Noledger/model/numericaldefectexplainsmargin;notglobaloptimalcontrolprooforscenarioacceptance. Exactruling inbody-momentresearch/coupled-fin-fallback-ruling.md.

Next executeSteve'sauthorizedparking: restoreaffectedTasks1–4aero/schedule/Earthrate/model-dependentreserve/aimtoshippedPhase6broadside baseline through deliberateauditedsourcechange;retainTask5currentforcebreakup/support/fullthrottleTWRfixes andnecessaryindependentbraking/debrief fixes. Preserve source,scientifictests,logs and reviews;do notclaimparkedphysics shipped. acceptedc242source/fixtures remainsinGithistory;latest15unacceptedsource/testfiles preservedbyparked-coupled-source.patch+SHA256 againstdaffd60,51787bytes,forward/reversechecksPASS. Oldpatches historical. Noreset/rebase/discard.

Then requiredfull6b gate/coverage/mutation/fullbrowser/highreview/independentphysicsreview/Linuxfixtures/audit/merge/deploy;continue7–9. No partialphase merge. Main/live080f108,60%,fourphasesremain. Noownerquestionorblockedgoal.

## Deliberate fallback implementation checkpoint (2026-10-02)

Affected Tasks1–4 source now deliberately restored to shippedPhase6 broadside baseline: constants/state/commands/actuation/guidance/aero byte-identical to080f108; sourcepins in body-momentresearch/fallback-restoration-pins.json. Task5 current-force/support/throttle/shutdown fixes, independent braking and first-loss debrief remain. Scientific source/tests/sweep preserved verbatim in parked-files/*.txt +SHA256 and earlier pushedcheckpoint/patches. Tasks1–4 are parked, notshipped. Backlog names every deferral; physical/reference/assertion bounds unchanged.

Build/lint/truth8/8 and focused91pass. New600s broadside record exposes camera shake bypassing rendered groundfloor; fresh independent fallback_camera_review confirms minimaldecorative-offsetclearancefix. Original four framingfailures nowpass; newfivecheapclearancechecks pass aftercorrecting invalidnovelfixture/input andgroundprojection inequality. Allredlogs retained. Explicitnon-fixture collection1915pass/onefixednoveltest; live timeline and comparechecks separate. Expectednewreentryevents include touchdown within600s; fixturesstillparkedmodel untilLinuxregen. No completegate/coverage/mutation/fullbrowser/finalphasereviews/merge/deploy claimed.

Next: Linuxrecording/audit coherentfallbackstate, then fullPhase6bclosure and7–9. Main/live080f108,60%;noownerquestion.

## Gate-green fallback checkpoint (2026-10-02)

Complete localgate exits0:1977units and1977coverage-instrumentedtests; unchangedcoveragefloors, smoke and5subpath checks pass. All8Linuxfixtures/audits coherent with source; intro motionexact, reentryoriginal180s motionexact,600slanded. Full5-browser suite nowrunning; mutation/finalreleaseacceptance/merge/main-gate/deploy stillrequired. High-depth branchreview found onlystale authoritative-roadmap checkpoint; accepted/corrected, followup requested. No partialphase merge; main/live080f108,60%,fourphasesremain. Next finishfullbrowser, runmutationALONE, finalreviewfollowups, phaseclose/merge/deploy then7–9.

## Browser diagnosis checkpoint (2026-10-02)

Phase6b fallback checkpoint eb703cb is committed/pushed; localgate and hostedCI37037625477 are green. Fullbrowser finished436pass/2fail/11configuredskips with zero local retries. Failures are Pixel landscape vacuum width and iPhone portrait ground structure. Rawlog/screenshots/context preserved in body-momentresearch/fallback-browser-cycle1. Fresh independent review supports cycle1attempt1: separate emitter random streams/reset histories after watched-red combined cadence/restart regressions, and photograph terrain at original configured altitudes while paused.61focused units/build/lint pass; all10focusedbrowser checks pass; fullgate after renderer changes and all21mutations pass. Assertions/effectparameters/retries unchanged. Finalfullbrowser/mutation/fullphasegate/reviews/merge/main-gate/deploy remain required. Main/live080f108,60%,four phases remain; no owner input needed.

## Reviewed browser repair release checkpoint (2026-10-02)

The repaired source passes the complete localgate (1980units/1980instrumented,13smoke,5subpath), unchanged floors, docs-layoutcheck and all21mutation faults after848greencontrol tests. Focused five-project original plume/terrain assertions10/10pass; fresh independent and high-depth source review clean. No seed tuning or effectparameter/assertion/retry changes. Preserve/push the coherent checkpoint, then run finalfullbrowser against its unchanged runtime and obtain finalreviewacceptance before merging. Main/live080f108,60%; Phase6b–9 remain.

## Candidate verification in flight (2026-10-02)

Reviewed repair76c60e3 committed/pushed; complete1980-test localgate and all21mutationfaults green. Finalfullbrowser running (session2684; /tmp/starship-browser-cycle1-full-final.log), hostedCI37044401235 succeeded at sameSHA. Independent physics revalidation:21Linuxcorepins/all8fixtures unchanged; no actionable boundaryconcern, conditional on finalbrowser/CI results. Main/live080f108,60%; no phase tick/merge/deploy claim. Finish existingverification, then close6b and execute7–9.

## Hosted candidate gate verified (2026-10-02)

HostedCI37044401235 succeeds at76c60e3; Linuxgate/hygiene green. Configured hostedfullbrowser/bench skipped, not claimed. Local fullbrowser session2684 still running and the previously failing Android landscape vacuum assertion now passes. iPhone outcomes/finalfullsuite result remain required; no merge/deploy/phase tick. Main/live080f108,60%,four phases remain.

## Final browser failure and next bounded diagnosis (2026-10-02)

At committed candidate `76c60e3db222118fe342560efe8d1fff2c6464bc`, the final full browser run completed with exit 1: 435 passed, three failed, 11 configured skips, 30.8 minutes, zero local retries. Session 2684 is complete; never resume or restart it. Full raw log, all three failure screenshots/context and the last-run manifest are preserved in `fallback-browser-cycle1-final/`, with SHA256 manifest. Hosted CI 37044401235 succeeded at the same candidate; local gate and all 21 mutation faults remain green. These checks do not override the failed browser acceptance.

Cycle 1 attempt 1 is unsuccessful as release acceptance. Both original failures passed: Pixel landscape vacuum width and iPhone portrait exact-altitude terrain. Remaining failures are iPhone portrait low-altitude plume length 0.9156261427575323 and landscape length 0.8853575099391015 against original >1, plus landscape vacuum width 0.43333333333333335 against original >0.4994324415041085 (low width times 1.2). No bounds, retries, effect parameters or seed were changed. No merge, phase tick or deployment is authorized yet.

Fresh independent `fallback_camera_review` confirms the cadence/restart repair remains valid, but does not prove pixel acceptance. Low landscape qualifying pixel counts 3286/3324/3326/3166 are nearly constant while measured lengths vary 0.89/0.70/0.89/2.29. This argues against wholesale starvation; it does not establish the cause. The detector collects an unrestricted bounding box, with no connectedness filter. Screenshots taken after the measurement show dotted distal tails but cannot establish RGB at the actual failed sample.

Cycle 1 attempt 2 starts with diagnostic evidence, not parameter tuning: preserve each original paused subject/background pair, record unchanged threshold decisions and exact step/viewport/nozzle, repeat a capture of the same frozen sample to distinguish compositor variation from state-dependent threshold crossing. If needed, expose read-only per-emitter live count/age/alpha/geometric extent and replay prescribed startup/render cadence through the real frame path. Do not use debug.step alone: it advances physics/camera without particle time. Retain original four samples, intervals, assertions, bounds, seed and retries. Record the hypothesis and evidence before any causal repair; no unchanged-code rerun for luck. Main/live remain 080f108, six of ten phases complete (60%). Full scope remains 6b, 7, 8 and 9; no owner question is pending.

## Attempt 2 capture transport result and attempt 3 (2026-10-02)

Diagnostic attempt 2 at e707f3c completed exit 1: three passed, one failed (iPhone portrait vacuum width), 1.7 minutes, zero retries. Every logged frozen pair has matching extents; this does not prove matching pixels. The list-only reporter leaves body attachments in memory, so the exact PNG/JSON inputs were not preserved. This is a diagnostic harness transport defect; do not treat this run as release acceptance or infer pixel stability. Complete log and available failure artifacts are in fallback-browser-cycle1-attempt2/ with hashes. Earlier full run remains the authoritative release failure.

Fresh fallback_camera_review checked installed Playwright source and confirmed HTML reporter persists binary body attachments under data/. Reviewed cycle 1 attempt 3 changes only capture transport: run the same diagnostic harness with list+HTML reporters and isolated /tmp/starship-browser-cycle1-attempt3-html output. No runtime, seed, emitter parameters, sample count/interval, detector bounds, assertions or retries change. Confirm files/hashes before pixel analysis. Direct writeFile(outputPath) plus path attachments is the more robust future option, but unnecessary source changes are avoided for this capture. This rerun obtains missing diagnostic evidence; it is not a rerun for luck. After this third attempt, any further diagnosis requires fresh independent review and a newly recorded evidence-backed cycle under standing approval. No phase merge/tick; main/live080f108,60%,four remaining phases.

## Completed attempt 3 and fresh cycle review (2026-10-02)

Cycle1attempt3 completed exit1: three diagnostic checks passed, iPhone landscape vacuum width failed, 1.9 minutes, zero retries. The instrumented run is not release acceptance. Its HTML reporter preserved all exact measurement inputs:24 subject/background/frozen-repeat pairs,49deduplicated PNGs including automaticfailure screenshot. Every24subject/frozen-repeat PNG pair is byte-identical, confirming no observed compositor variation within frozen states. Variation between different sampled flight states remains; its cause is not established. Full log/testresults/HTMLreport/extracted report JSON/capture-summary/hash manifest are preserved in fallback-browser-cycle1-attempt3/. The existing full435pass/3fail result remains authoritative release evidence.

Three cycle1attempts are recorded. Fresh independent plume_cycle2_review is active, read-only, inspecting actual saved pixel inputs and source before a new bounded cycle approach is recorded. Do not run another browser diagnostic, tune parameters/seed/thresholds, or claim success from the three focused passes. Next compare distal threshold and reference-exclusion decisions with actual images; emitter-internal read-only diagnostics remain an option if necessary. No further core/aero feasibility work. Main/live080f108,60%,6b/7/8/9 remain unfinished; no owner question.
