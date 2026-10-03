# Phase 7 affected-conclusion follow-up

**Verdict: no actionable finding in the narrow fix. Original P2 closed.**

## Version and scope

Independently assessed runtime/test target `d843b187acd1b982968dc226145f321dc24052be` against the earlier reviewed `85a302db1237c9e71e3294fa3ba969c98edfc589`. Current documentation head `2156c7c` changes only the archived reproduction extension and release evidence. A direct Git comparison confirms `src`, `tests`, `vitest.config.ts` and `package.json` are identical to d843b187. The executable reproduction completed while HEAD was d843b187 and asserted that SHA.

This follow-up covers the original ignition-policy provenance finding and its affected callers. Earlier whole-phase conclusions remain tied to 85a302d; only `src/core/control/commands.ts` changes at runtime between that target and d843b187. No other whole-phase findings were reopened or silently certified.

No repository edits or concurrent test/build/coverage/mutation work performed. The isolated executable source investigation ran from `/tmp` through Node's TypeScript-stripping loader and did not touch dependencies, dist or coverage.

## Root fix

`src/core/control/commands.ts:74–77` flips the preference and calls the existing `invalidateBoosterReturn` helper. The helper deletes only `boosterPrediction` and `boosterReturnPlan`.

Placement is appropriate: source search confirms the command's production callers are the actual session's selected-body and other-body preference propagation, reached from the settings control. Guidance never calls this interaction command. Clearing provenance here covers direct commands and either selected mission body without changing live engine/fuel/RNG arithmetic or forcing callers to duplicate invalidation.

A Ship state without optional booster planner fields retains its shape; no fields are created by deleting absent keys. Unchanged ignition policy retains existing immutable work. The fix does not weaken catch, authority, work, time, fuel, truth or coverage contracts.

## Independent execution

Runnable experiment: `/tmp/starship-phase7-risk-review-followup.mjs`.
Raw output: `/tmp/starship-phase7-risk-review-followup.log`.
Command: `node /tmp/starship-phase7-risk-review-followup.mjs`.
Environment: local macOS, Node 25.8.1. Exit 0.

Assertions independently passed:

- Direct command, false→true and true→false: clears genuine pending job plus accepted-cutoff boundary data; old immutable job origin is not mutated; next mechanical step creates an origin with the new policy.
- Direct boundary invariance includes realized failed engine 32 and pending ignition 31, in addition to full engine arrays, RNG counters/seed, vehicle/fuel/RCS, world clocks, kinematics, forces, status and every realized failure field.
- Actual standalone session, selected-booster mission, and selected-Ship/unselected-booster mission: both directions clear pending job and cutoff; all physical/resource/RNG state stays unchanged at the command boundary; both body preferences match; subsequent canonical advance uses the new booster source policy. Mission setup uses actual paid Stage until physical separation.
- Actual default RTLS, without injected candidate, clock or flight state: obtained the accepted plan from originTime=0.008333333333333333 s and shutdownAt=13.641666666666532 s. A risk toggle immediately removes that real accepted plan and its job, preserves all physical state, and the next job origin carries true.
- Unchanged-policy control retains the identical source object and its matching preference on subsequent canonical advance.
- Original Ship command control preserves physical/resource state and creates no optional planner keys.

The direction matrix injects retained cutoff data only to isolate command-boundary deletion in every route; the separate original RTLS witness proves removal of an actually published accepted plan. These are distinct claims, not a synthetic candidate advertised as flight acceptance.

The committed regression tests were inspected: they cover both direct preference directions and actual standalone/mission selection routes, new source policy and resource invariance. The root command's deletion behavior is confirmed by the independent experiment beyond the parent-reported focused results.

## Verification limits

Parent reports RED 5→GREEN, build/lint/focused preservation, all ten actual golden replays, unchanged truth rows and a zero-difference before/after trajectory audit. I inspected the source/test/evidence contract and confirmed golden/config paths have no follow-up diff, but did not rerun those gates.

The first repeated gate failed on lint because an archived executable reproduction assigned globalThis. The parent's correction changes the archive file to `.mjs.txt` byte-for-byte, rather than introducing a lint waiver. A new ordered gate is running at current documentation head; its completion is not claimed here.

Final full-five-browser, 21-mutation, main merge/main gate, hosted CI/Pages and live acceptance remain unclaimed. This report closes the affected P2 finding; it is not a substitute for the remaining release evidence.
