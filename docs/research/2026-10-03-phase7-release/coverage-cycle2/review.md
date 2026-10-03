# Coverage duplicate-execution review

Fresh same-harness fallback reviewer `coverage_guard_review`, high-depth affected scope: wrapper, dependency certificates, guard regressions, package command and both Vitest projects. Peer Claude unavailable (subscription authentication exit2); Pro browser unavailable as recorded in the Phase7 release review. This is not cross-vendor review or a literal unavailable `/code-review high` invocation.

Two actionable findings accepted:

1. CLI excludes do not propagate to either inline Vitest project. Corrected with coverage-only project-local exclusions, ordinary unit configuration untouched. Actual discovery establishes exactly42 excluded roots, 194→152; new guard retained, no unexpected additions.
2. TS substitutes `build-sw.d.mts` for executable `build-sw.mjs`. Corrected to seal local executable counterparts alongside declarations; unresolved counterparts retain roots. Regression changes only executable implementation to import core and verifies inclusion.

Fresh affected conclusion: both findings closed, no further actionable code finding. Final acceptance requires exact35 core files, all statement/function/branch maps and every s/f/b counter matching preserved full193 baseline, plus a complete successful gate≤300s. No percentage-only equivalence claim. Baseline SHA256 d17410ab937619ba9cb009c6de49901a50d92e7a3d51a7f27ea943748e62ff16. Measured result still pending when this assessment was recorded.


## Measured rejection and next bounded attempt

Attempt1 allchecks exit0 but321.59s>300. Coverage-only exclusions saved~7s; reviewer recommends rejecting their63KBcertificates/importresolver/config coupling and retaining completeunitANDcoverage. Lead agrees; originalprototype retained as text, its own newfiles/imports/exclusions deliberatelyremoved, nohistoryrewrite. Exact35maps/allstatement/functioncounters identical; gravity109/161 branch arms shift1/2 withconservedtotals. Both chooseomega===0 and tests/core/rotating-frame.test.ts:31,58,72,95 usesunseeded fc.double containingzero. This is causallysupported variability, notrecordedseed replay proof; keep randomness/noseedtuning. Tiny20batches/100samples demonstratedzerooccurrences0..3, no test/sourcechanges.

InstalledVitest cli-api defaultsavailableParallelism−1. OwnerMac exposes6cores/current5workers, zero swaps/maxRSS863MB, retainedsuites sum~899s (elapsed-sum notdirectCPUutilization). Fresh affectedread-onlyreview approves one bounded6workertrial BOTHfullunit/fullcoverage, Darwinmin(6,availableParallelism), Linuxdefaults, defaultforks/perfileisolation/nativeaudiounshared, alltests/assertions/floors/timeouts. Preservewatchdefaults (batchrun only). Performance remainsunproven untilorderedgate result; onlyexplained randomizedomega branchcounterexception maybedocumented, no othercoveragegap accepted.


Final actualharness/ref assessment: no blockers. Conditionalspread cap applies onlyDarwin `vitest run`, watch/Linuxdefaults andoriginalboth-projectselection preserved. Defaultforks/isolation/floors unchanged; coveragereportingonly. Referenceupdates match selectedmodels/missionrouting/restart/debrief/browserGPU andleave release status to roadmap; no fullascent/orbitcertification claimed. Optional staleNode-only testtable corrected toNode+kitjsdom. Approvalconditional actualcompletegate≤300/allfloors/fullcorecomparison withonly explainedzeroomega randomizedarmvariance.
