# Planner diagnosis attempt3: timely publication, live continuation pending

2026-10-03. Runtime Node v25.8.1 (the existing baseline/profile runtime); repository `.nvmrc` requests22. This receipt is retained under its actual runtime, not relabelled as the final release runtime.

The single declared seed123 `booster-sep` run published a future plan at33.675s, with shutdown33.741666666665395s. The observed slack is0.066666666666663s, eight live ticks: a fragile measured margin, not a general deadline margin claim. All pinned core hashes matched after the run.

The authoritative complete fine forecast reached the tower catch after2490 advances,20.75 forecast seconds: remaining propellant89,228.019878kg, secured hull x relative tower0.00372314m, hull altitude90.084507m, pitch0.00001078294rad, zero secured velocity, landed=true and onGround=false. No failure flag or damage terminal was active. This is physical fine-capture evidence; it does not establish subsequent actual live capture.

The actual coarse durations were24.225,24.2,24.075,24.108333333333334s. Their residuals were−553.275782,−465.118715,+128.950773,−47.509137m. The first genuine bracket received one executable interior coarse trial instead of immediately spending fine proof on the newly supporting endpoint. The accepted candidate was then physically fine-validated. Six combined trials included two cutoff hints; the original16-trial and4000-advance/900s mechanical caps remained unchanged. Two shared midpoint hints consumed2104 iterations in six bounded slices, with a512-iteration maximum per slice. No hint constituted a physical bracket or cutoff authority.

Artifacts: `booster-planner-attempt3-declaration.md`, `booster-planner-attempt3-source-hashes.txt`, `booster-planner-attempt3-live.ts.txt/.jsonl`, raw `/tmp/booster-planner-attempt3-live.txt`.

## Remaining evidence

The guidance-only idle timing suite on Node25.8.1 is RED: normal synchronous fall1.570ms/call exceeds1ms; capped fall6.718ms exceeds2ms. The burn predictor bound passes. Sliced booster hints passing does not discharge those synchronous Ship/HUD budgets. Raw `/tmp/booster-attempt3-guidance-idle-timing.txt`.

Lead explicitly authorized actual seed123 continuation through catch and existing booster source/guidance/default-preset/HUD tests. Those outcomes are pending; no acceptance threshold or production edit is authorized by this receipt.

## Actual live continuation

The expressly authorized continuation replayed the exact immutable receipt prefix, then continued ordinary120Hz `step` from the unchanged seed123 preset. It caught at337.97499999985695s: landed=true, onGround=false, zero secured linear/angular velocity, hull x relative tower0.0000687241554m, altitude90.0845070447m, pitch0.0000126792966rad, fuel88,541.477695kg. All failure flags and the damage terminal remained false. Source lineage1 remained valid and checked; exactly one plan was published and retained. No custom controller, state injection, new duration trial, or authority modification was used. Actual fuel/time differ from the coarse-origin fine rollout, so those separate outcomes are preserved without claiming equality.

Artifacts: `booster-planner-attempt3-continuation.ts.txt/.jsonl`, raw `/tmp/booster-attempt3-continuation.txt`. This now establishes the actual seed123 catch, while default-preset/RTLS cohorts and global performance remain separate acceptance obligations.

## Idle synchronous profile

`fall-idle-profile.ts.txt` reproduces the exact existing guidance timing inputs without live flight integration. Node25.8.1 measured1.549ms normal and6.851ms capped. CPU profile `/tmp/booster-fall-idle.cpuprofile` self samples: `writeDamageControls`29.03%, `fallAcceleration`16.94%, `advanceUnpoweredFall`14.47%, `rootUtilization`2.67%, `loadedRootAngle`2.33%. Inlining prevents treating those named self percentages as the complete root/control cost. No production optimization follows from attribution alone. The initial profile CLI path was wrong and exited before execution; its corrected command produced the retained profile, not another trajectory run.

## Existing acceptance cohort: partial outcome, cycle remains open

The unchanged four-file cohort (`booster-source`, `booster-guidance`, `flies-every-scenario`, `booster-presentation`) completed35PASS/5FAIL out of40 tests, exit1, Node25.8.1. Raw `/tmp/booster-attempt3-actual-acceptance.txt`.

- Source-provenance/publication tests pass. Their acceptance scope is narrower than actual full live catch.
- Default `booster-sep` still crashes at341.6s, both the guidance and scenario acceptance cases. Guidance reports hull altitude12.289977m and x relative tower0.827373m at terminal.
- Default RTLS still breaks up at21.3s, both acceptance cases. Guidance terminal hull altitude19364.720027m and x2358.617439m.
- Both terminal reports display fuel0. Terminal material release may account for this endpoint value; this is not evidence that fuel exhaustion caused the first divergence.
- HUD airborne-catch fixture fails its initial landed assertion. Its explicit90.501m body-altitude and3400t capacity assumptions are historical; parent owns the fixture diagnosis/correction, with original physical catch limits retained.

No failure expectation or tolerance was changed. Timely seed123 publication and live catch do not make default/RTLS acceptance green. Lead opened fresh independent default/RTLS review and forbade further physical source changes or diagnosis flights pending that review. Attempt3 is a partial outcome, not final release acceptance.

## Root-call attribution correction

A research-only wrapper delegated every returned angle to the unchanged canonical function and classified its existing branch. The normal timing input makes7280 root calls,3640 consecutive identical argument tuples; the capped input makes32000 calls,16000 identical tuples. ALL calls take the zero-command early return; neither Newton nor40-step fallback executes. Thus a root bisection optimization would not address these timing failures. The result arrays are preserved in `fall-root-counts.json`; wrapper and dedicated config are adjacent. Instrumentation overhead was never used as a timing assertion. Initial reporter output suppressed the diagnostic console text; a second pure-query pass wrote the counts to disk, with no flight or new trajectory candidate.

Parent resumed exclusive core ownership for a separately reviewed exact Refactor of owned zero-command fall preparation. Attempt3 receipt hashes remain the recorded immutable numerical evidence; subsequent Refactor proofs belong to that separate change.
