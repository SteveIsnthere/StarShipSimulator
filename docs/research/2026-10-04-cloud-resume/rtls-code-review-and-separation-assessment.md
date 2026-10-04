# Independent protected-physics implementation review

Reviewer: fresh `rtls_code_review` subagent, 2026-10-04, read-only runtime review. The reviewer did not implement runtime code or execute tests/flights. Repository AGENTS, all four checked-in skills, GOAL, handover, Phase8 and the prior independent feasibility review were read. Global review skills/external review authentication were unavailable; this is the authorized independent subagent fallback, not an external CLI review claim.

## Exact reviewed RTLS implementation

| File | SHA256 |
| --- | --- |
| `src/core/control/booster-receipts.ts` | `d51af933744125797c5e7f3106af728e64ba00c111fc4e8574c2cdd77289a9bf` |
| `src/core/control/booster-source.ts` | `1e78f56f61c68023e25444d86b13b997b4a7fe196b146b290662d1905184fe93` |
| `src/core/control/booster-forecast.ts` | `5b1d9e6b1bfd549eda94f4ec445b21b23cc28a698b62348b04e81d51875a03be` |
| `src/core/control/booster-prediction.ts` | `d959ed6ff3d7fc2fbb54a3927ecc497ace98148c2c0514a30037e2cde038eb2b` |
| `src/core/autopilot/booster.ts` | `2946bd4a42778bc26dc97d663572de893ecb4719b3a077b9ce84bc9711735697` |
| `tests/core/booster-paid-receipts.test.ts` | `e6264d7bf9b26ccfc97dba2540d83f97766061a89e9d557dbc0301a3b4012079` |
| `tests/core/booster-bracket-priority.test.ts` | `c58395f0c2537087aae31b8a52adffffd0e89496cca1521f06e878eccb140b3e` |

No actionable runtime finding remained at these pins. Full input/model snapshot/function identity/dt/lineage/revision matching and unchanged actual pre-policy verification preserve provenance. Three-field normalization is restricted to the proven automatic no-plan alignment/paid-ignition domain; the production policy does not consume those fields there. Receipts clone and freeze owned snapshots, and persistent queues preserve earlier frames. Strict monotonic admission, exact-time head lookup and bounded chunk/head copies resolved the initial scan/clone/copy concern. Producer eligibility before snapshots resolved unnecessary capture on ineligible work; an exact with/without-capture test protects outputs.

Search and observer work share four mechanical advances; hints share a separate512-iteration counter across carried stages. Candidate16, rollout4000/900s and catch bounds are unchanged. Credit is prepared before search. Four-search changed publication defers, and its next tick rechecks provenance and a strictly future cutoff. Event mismatch cannot purchase a fifth advance.

Initial required-test gaps were raised and resolved before flight approval: actual terminal advance without a policy callback; overflow exact-time miss with paid observer fallback; actual four-step terminal publication with future/expired/rejected next-tick conditions; shared512 hint iterations across two carried stages, with prior-job ownership; full input/function/model/RNG/material/epoch negatives; immutable823-receipt queue lookup and rewind rejection. The implementer reported29 focused passes after these additions, then97 passes across seven targeted cohorts with two full-flight tests deliberately excluded, plus lint/build. These are implementer-reported cloud results, not reviewer-executed or whole-gate evidence.

The reviewer explicitly approved **one previously declared cycle2 attempt3 default RTLS diagnostic before execution**, with unchanged seed/start/limits and no retries. This was not release, whole-gate, Mac frame/GPU or performance approval. The implementer subsequently reported a single source-pinned successful catch, publication tick1590 at13.25s before cutoff13.283333s, queue peak823 and at most four calls. The report is retained separately with the diagnostic's declaration, hashes and raw evidence; it does not enlarge this preflight review's scope.

## Fresh separation assessment: read-only, no fix approved yet

The sole default separation trace and its source-verification receipt were inspected. Durable source pins and raw evidence are in `separation-core-hashes.json`, `separation-evidence-hashes.json`, `separation-receipt.jsonl` and `separation-full-trace.jsonl.gz` in this directory. No additional flight or implementation was executed by this reviewer.

Primary observed failure is **finite RCS exhaustion**, preceding both catch-plane miss and horizon expiry. Terminal entry317.35s has lug x+288.645m and11.977902s remaining RCS. From318–326s, recorded RCS frequently approaches its800kN ceiling. The hull stays approximately upright until RCS reaches zero336.158333s; then residual gimbal torque rotates the hull/lug. First plane crossing337.656663s misses position, lateral/vertical speed and pitch: x−6.899m, vx−11.960m/s, vy−7.360m/s, pitch−0.230141rad. Horizon expiry337.891667s occurs afterward and shuts down three healthy engines. Impact341.65s retains89.683t propellant; terminal release does not establish fuel starvation. No fuelRunOut or pre-terminal component damage occurred.

Source-supported mechanism: `autopilot/booster.ts` terminal control first requests upright attitude, then overrides gimbal for translational thrust. Its powered `align` branch (lines63–65 at the reviewed pin) disables grid fins, and lines79–88 pay the delivered gimbal countertorque with bounded RCS. Thus nominally available grid hardware does not participate in powered terminal torque allocation. This supports an allocation hypothesis, not yet proof that grids have sufficient dynamic authority. The coarse forecast's terminal handoff x+226.123m versus actual+288.645m is an additional precursor: a fix must be evaluated on actual recorded inputs, not just the optimistic coarse handoff.

Proposed next bounded work: an independently reviewed offline authority query on frozen recorded terminal states, using existing surviving-grid endpoint torque queries, current mass/COM/inertia, delivered engine/gimbal/fin positions, atmospheric loads and finite remaining RCS. Compare actual upright torque demand and translational gimbal countertorque against attainable grid plus RCS torque over the observed interval, including slew and depletion. No new flight, candidate override, horizon reset/extension, geometry/physics coefficient change, reserve increase or catch-bound relaxation is justified by the current evidence. If sufficient paid authority is established, propose the smallest terminal control allocation using grid fins alongside translational gimbal and bounded RCS, with failing tests and independent review before its declared physical acceptance. Offline instantaneous authority is not actuator or successful-flight proof.

The implementation agent proposed thirteen raw frames: terminal entry317.35, horizon initialization317.358333,318/320/325/330/335/336, last positive reserve336.15, depletion336.158333,337 and the adjacent plane frames337.65/337.658333. The reviewer approved **only this bounded offline query**, pending its source-pinned declaration, with no mechanical advances. Omitted world fields may be reconstructed only from the unchanged calm preset with explicit zero-wind/turbulence evidence; all retained physical/damage fields stay actual. Report full-grid envelopes separately from one120Hz slew-reachable envelopes and finite-RCS one-interval costs, using incremental replacement of current delivered grid torque to avoid double counting. Sampled authority does not establish whole-terminal endurance or authorize a runtime fix/flight. Any subsequent interval ledger or actuator replay requires its own bounded declaration.

## Narrow recorder review

`tests/golden/booster-record.ts` now omits `boosterSource.receipts` alongside its existing expected/returned future snapshots and prediction-job exclusion. This deletion applies to copied objects and retains live controls, physical leaves, lineage/revision/validity/checked/expectedDt and issued events. The focused `booster-record.test.ts` test uses cyclic future aliases, checks absence of future keys, retention of authority/physical fields and preservation of original aliases. The omission is approved as recorder-shape housekeeping; no fixture regeneration, golden exception or whole-release approval follows.

## Subsequent narrow proof/config reviews

The parent requested these separate reviews after the above preflight. No tests, builds, benches or browser runs were executed by this reviewer.

- `tests/proofs/ship-guidance.test.ts`, SHA256 `989651c0b6e17e8ad6f7cd441586450cec774b19e30aaea53ea81c398cf8f081`: approve only the new scratch assertion correction. Destructuring excludes the newly added reusable `fallWork`; the original five scratch fields (`atmosphere`, `duration`, `capped`, `inputs`, `acc`) remain exact `toEqual` against the independent historical routine. New workspace identity, zero steps and null state are asserted. This does not approve weakening numerical equivalence or alter its historical-model proof domain.
- `tests/core/booster-scheduling-boundaries.test.ts`, SHA256 `5770ba1a09c78a6209f52e7fb03368e5dc001519a78bf64be4a469cb4f0a2d47`: approve the two updated expectations for carried work. Both retain an exact independently owned ready `terminalOrigin`, assert four paid advances and compare the complete resulting state to four independent `advanceMechanics`/`runBoosterPolicy` calls. The oracle bypasses the scheduler and expresses only forecast fall-time bookkeeping. Prior-job JSON immutability and original no-live-authority/engine/fuel/RNG assertions remain. No expectation now treats a newly scheduled job as unadvanced.

Portability/configuration review is clean for unchanged limits and honest backend reporting, subject to the parent's serial build/bundle/browser validation:

| File | SHA256 |
| --- | --- |
| `vite.config.ts` | `9d34f33caed74433e608fc036bf086e96f81836913f690bb596382331113a46e` |
| `vitest.timing.config.ts` | `25eb9dcfdee94a5329b32e11186d262b034af2c0d085d80f470c655207653c6d` |
| `playwright.visual-budget.config.ts` | `06412d9b7ca7e0a2365bdf8ae21235aeab3a5bfec53e3f2283e33aed5c003c02` |
| `playwright.visual-motion.config.ts` | `6b1b1e2318901e39920eb95e89972aae568281a9296001f4f87d5021422a405c` |
| `tests/e2e/chromium.ts` | `b65e613f21fbc9e5d4b95d6e314609dd4a484463db1b99f3cfcc2685723cab14` |

Timing files are serial. Opt-in visual configs override inherited CI retry policy with zero retries and one worker; exact desktop/phone viewport and DPR settings remain explicit. Software WebGL is explicitly selected and labelled; renderer receipts report observed context/backend separately from requested launch policy and distinguish viewport emulation from handset hardware. The existing300 measured-frame, p95/cadence and onset-spike limits are unchanged. Renderer metadata queries existing Pixi root texture/context and actual filter objects on demand, outside measured windows; inherited filter policy is labelled as policy, not device-DPR evidence. Vite's core/loop chunk stays within measured first-load budget with no exclusion. These configuration findings are not whole-frame or Mac performance acceptance.

The thirteen-frame authority output subsequently confirms that near depletion full grids cannot replace RCS: at336.15s required grid torque is12.520MN·m, full positive endpoint only0.356MN·m; the one-step envelope is smaller. Earlier endpoint torque can reduce finite-RCS demand (320s899→199kN), while325s still requires1.039MN above the800kN ceiling. An immediate fin-only rescue is therefore rejected. A separately declared shadow actuator/RCS ledger over actual recorded terminal ticks through the first plane (fewer than4000 rows) is worthwhile to test whether early grid use could conserve enough reserve. It must retain actual physical inputs, finite grid slew/RCS cost and torque-deficit reporting. Its alternate fins can change aero/trajectory, so a positive shadow ledger would motivate further reviewed work, not prove a catch or authorize a runtime change.

## Pre-execution offline ledger and profile-startup repair reviews

`separation-shadow-ledger.ts.txt` SHA256 `8db0bee37c32cb7acd780435c3e40f0a1bd50403df349ddecbf1e0a728f15542` and its declaration SHA256 `567885519d518a42e2e56702f7da4169cfa421c29e013d3eea914ec4a78b2425` were read before execution. Approve one declared offline ledger after the parent grants exclusive CPU ownership. Actual policy-phase inputs combine recorded current endpoint physics with preceding delivered gimbal/fin/reserve. The mandatory positive control reproduces original paid RCS and remaining reserve bit-exactly on each tick or stops. Shadow RCS pays against currently delivered fin torque before actual finite fin slew; fewer4000 recorded pairs end at first plane. Input/source hashes and raw ownership are checked. This approval establishes no alternative trajectory, catch, kernel change or runtime implementation authority.

The first cloud bench and failed profile startup remain preserved; the user has explicitly superseded the former Mac-exclusive execution requirement. `run-fall-cloud-diagnostic.sh` SHA256 `61e91ab0e5bf0f2f426d9688b251f0d5b2ce6c57930b6e7f767509442c956983` and declaration SHA256 `b4c4ae0cddce4b77dd2515fb40ea4242684ed01924b139dec3601fb4bf51c6ce` were reviewed after startup failed before workload at the nonexistent older CLI location. The repair resolves the installed locked package's declared bin and exported CLI to the same existing regular `dist/cli.mjs`, pins package metadata and CLI content, and uses distinct non-overwriting `profile-cli-fix1` receipts. The workload driver SHA256 `eda9c56c2bcbbd20b715d4eeee3c8e8fd20bd18a88dff89cf64ef2007563f41b` retains original inputs, warm/run counts and capped4000-step validation. Approve exactly one repaired profile invocation after exclusive CPU grant. No baseline rerun, threshold weakening, completed profile result or implementation-attempt selection is approved or claimed by this review.

## Shadow result and bounded terminal-allocation design review

The sole reviewed ledger subsequently exited0 with unchanged pins and2437 bit-exact original paid-RCS/reserve positive controls,317.358333–337.658333s. Shadow finite reserve consumption is8.319153014975848s of11.97790223550745s, leaving3.6587492205316017s; original reserve depleted336.158333s. This supports an early allocation hypothesis. Its373.807MN·m maximum unmet torque is evaluated on the already failing fixed observed trajectory, so neither the positive budget nor tail deficit proves a physically executed alternative catch.

Proposed smallest candidate: retain physical/control coefficients and all search/force/trial/catch bounds; extract the existing exact14-bisection unpowered fin-command algorithm into a local helper; let only the active powered terminal control call opt into using physical grid fins for upright torque minus actual delivered gimbal torque. Capture current delivered grid and gimbal torque before proposing new targets; existing bounded RCS pays only that delivered residual. Translation gimbal/throttle and actual fin/RCS slew/payment remain the existing implementations. Outside the explicit terminal call, powered alignment/ignition and existing unpowered alignment must retain exact outputs.

One scope finding was raised during design review: **do not enable this solely from stored `boosterPhase==='terminal'` inside exported `alignBooster`**. Utility/manual/pitch-hold transitions can retain old phase metadata; use an explicit active-terminal callsite option/helper with unchanged defaults. Subject to this correction, the candidate is suitable for a bounded implementation trial after the parent's source/test/config freeze ends. It is not yet an implementation or flight approval.

Proposed failing-test domain uses retained actual320/330s endpoints: nonzero powered fin command/fin-active state; unchanged immediately delivered forces and RCS reserve despite targets; at most1percentage physical fin slew per120Hz step; RCS reduction only from subsequent delivered grid torque; zero-q/missing-fin hardware cannot manufacture authority; actual finite RCS clamp/payment; exact unpowered and boost-alignment output proofs plus RNG/material/source ownership invariants. New tests and the helper must not execute during the first cloud21-case frame baseline. An implemented patch still needs independent source review, focused validation and a separate declared unchanged default physical diagnostic before acceptance.

## Fresh frame receipt/diagnostic review

Recovered partial frame-baseline windows remain failed active-scene measurements: belly-flop ends crashed/terminal; landing ends landed. Small instrumented callback/fence cost with low draw cadence does not identify a shader bottleneck. The probe's original draw-only timestamp retention could not distinguish low browser RAF cadence from intervening no-draw timestamps. Source inspection confirms independent production session RAF updates and Pixi's automatically started private render ticker, with no intentional6–9fps cap. Browser scheduling, canvas submission/presentation, compositor/Viz and SwiftShader worker costs can occur outside accounted callback/GL-fence time. No graphics reduction or acceptance claim follows from those windows.

The repaired receipt/probe and separately declared Chrome diagnostic were freshly reviewed at these exact pins:

| File | SHA256 |
| --- | --- |
| `tests/e2e/visual-browser-trace.ts` | `3bc5d775cea6b0e5844622e2a0810c595abdbb90584f389d2766616ee671d6de` |
| `tests/e2e/visual-budget-probe.ts` | `d450cc4671149cb42bb7e1c6a34259b2d1ac06152f22a2302a7d4c3679c44f99` |
| `tests/e2e/visual-budget-receipts.ts` | `2c1fe0d2aacee3acdd808b8a057f5b8f44d4f4e81a5d64be79776c3d92220c1b` |
| `tests/e2e/visual-budget.spec.ts` | `93c98b70aab1f440f91367c7995dd338c8c166c701b05450d5b60f0c765d29f7` |
| `tests/e2e/visual-runtime-receipt.ts` | `8089f2608677c5113888faad3245676a2829256a2f55293db286ea67fce5fc0e` |
| `playwright.visual-diagnostic.config.ts` | `d45b2e06c316c8092bfe2d294bf00a84c42eec3e21538dfcf15affb65c4e0bda` |
| `cloud-frame-diagnostic-declaration.md` | `86846289a6c7de331f1c498d03fb8dadf715c7a8be843fb5e6d3f51def3bc96b` |

One deadline defect was identified and repaired before approval: the first helper awaited `Tracing.end` outside its claimed10-second race, with `IO.close` likewise unbounded. The reviewed helper now races end/completion/read/close immediately against one shared10-second deadline, bounds detach separately at1second, and preserves primary failure plus partial raw bytes/cleanup receipts. Its Chrome record-until-full buffer is32MiB; expanded exported JSON has a separate64MiB cap,256KiB read slices and explicit partial/truncated labels. Trace overhead does not establish acceptance.

The existing acceptance60-warm/300-measured floor, original p95/cadence/onset bounds and zero retries are preserved. Snapshot/failure artifacts are written before rethrow, including actual root/filter state, measured/warm/no-draw frames, progress and runtime identity. The world canvas is identified separately from feature-probe contexts. Source/build/host/browser/launch receipts remain before/after; no artificial speed, vsync, clock, frame-cap or graphics setting change was introduced.

**Approve one separately declared desktop launch diagnostic only**, after the parent's serial build/type-check passes and exclusive CPU/browser ownership is granted. It uses60 warmed plus30 measured draw frames with all-browser-thread tracing and user-timing markers, retaining ordinary production loops/settings. No broad acceptance rerun, shader change, runtime fix, complete300-frame acceptance or release approval is granted. Reviewer executed no checks/browser runs.

Before any browser execution, lint caught `no-unsafe-finally` in the diagnostic caller. The narrow wrapper repair was re-reviewed at `visual-budget.spec.ts` SHA256 `98504af61fb46edf0f2555e7f1fec419308cfcbd6363fe3f9b5b104fdea4ce79`, superseding the spec pin in the table above. Explicit failure flags retain the original diagnosis error and secondary cleanup error; receipt failures are annotated; throws occur after `finally`, original error first, and cleanup-only failures still fail. Helper `3bc5d775…` and declaration `86846289…` are unchanged. Scoped lint/TypeScript were reported green by the implementing agent; the parent will rebuild before the sole first diagnostic. The existing one-run approval persists with this repaired caller; no additional attempt or browser result is claimed.

## Fresh concrete terminal-grid implementation review

The terminal candidate was independently read after implementation, before any new preset flight. Sole runtime change is `src/core/autopilot/booster.ts`, SHA256 `c5a7a17e93999173ca160dc83d26e6f390010332c1b56cd57999bfde4395597d`, superseding the earlier baseline `2946bd4a…`. Supporting pins:

| File | SHA256 |
| --- | --- |
| `tests/core/booster-terminal-allocation.test.ts` | `c05b67feb826a82faff130cf27de1927ff5c9431c75d8971e97172f787013c6e` |
| `tests/proofs/fixtures/booster-alignment-before-terminal-grid.ts` | `747e2580d623e031f35f9e42766111795c109933208adb898db1ebcfe764be00` |
| `tests/fixtures/booster-terminal-allocation.json` | `d0ecdfc97575eb0cbebdf4288134d3c27fb85f1aa86e2e76955fcfe4db8f331c` |

No actionable finding remained. The explicit powered-grid flag defaults false and is true only at the active, ready, non-missed terminal thrust-allocation call; stale phase metadata cannot opt ordinary alignment utilities in. Ignition waiting, entry, boost alignment and missed/horizon-expired terminal calls preserve their former defaults. The local helper retains the original fourteen-bisection unpowered operation/query order. Delivered grid and delivered gimbal torque are captured before proposing the new fin target, and RCS continues to subtract only those actual delivered contributions. Existing physical fin/RCS actuation, retained-hardware damage queries and finite reserve/clamp arithmetic remain unchanged. No new force law, reserve, horizon, preset, catch gate or scheduler/mechanical/hint/trial/rollout limit is introduced.

The new test source was read: retained actual320/330s inputs; immediately unchanged forces, RNG, damage, kinematics, fin delivery, reserve and original RCS residual; one-percentage physical fin slew; subsequent delivered-torque residual reduction and actual finite proportional payment; zero-q, absent-grid and depleted-reserve negatives;120 full-state exact comparisons to the frozen original alignment across powered/unpowered phases, utility goals/time and missing hardware. Implementer reports RED four expected failures/three passes before the runtime change, then build298.9kB/scoped lint green, seven new tests and nine focused non-golden cohorts108/108 passing. Reviewer executed no tests/builds.

**Approve one separately declared source-pinned default separation physical diagnostic**, after the parent's required checks and exclusive CPU/source grant. Preserve original default seed/start, four shared mechanics, all hint/candidate/rollout/catch/health/fuel/horizon limits and no retries. This is candidate preflight approval, not a prediction that it catches; RTLS regression, whole gate, performance and release acceptance remain separate. No new preset flight had executed when this review was issued.
