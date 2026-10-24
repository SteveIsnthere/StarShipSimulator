# Independent V22 source review

**Disposition: HOLD — predecessor-delta provenance is not closed.** The current Ship/RTLS mode is source-semantically appropriate, but I cannot verify the requested claim that the only V22 source change was this mode correction against the pinned V21 bytes.

## Scope and pins

This is a read-only source and context review. I did not run tests, build, browser, or flight workloads, and did not edit candidate files. The current candidate is `tests/flies-every-scenario.test.ts`, SHA-256 `ecb37ed056299d07a5edc05b4e9d3fed9345ca8fbb1510849dc3604f731b3959` (13,541 bytes). Its intent note is `docs/research/2026-10-13-phase8-scenario-matrix-v22/README.md`, SHA-256 `8276169c8c82961985fc2e3275b6683b5eaedcc51cfd91d20705920638ebfd13`.

V21's source review pins the predecessor test as SHA-256 `13e5f271b8d7c068792fcf1932a6d5534202e12ded8d17302f5cc2551c981934` (13,375 bytes), but that full source file is not present in the V21 review packet. The source-review pin record and the V21 scenario/vehicle matrix are pinned in `pins.json`.

I checked the documented two-hunk change in memory: removing the `toggleBoostBack` import and the added Ship/RTLS predicate and branch from the current test yields 13,377 bytes and SHA-256 `539ee76daf1f3a79cc75f0f6398cff0e8b5c2a8f89997fa4bebff7030f3f9042`, which does **not** match the V21 pin. This is a concrete two-byte size and digest mismatch. Without the predecessor bytes, I cannot identify or rule out the residual difference and will not infer that it is harmless.

## Source-semantic assessment

The intended Ship/RTLS correction is appropriate:

- The RTLS preset is documented as downrange and climbing and as needing a boostback burn (`src/core/scenarios.ts`); the V21 support-contract matrix identifies the current Ship/RTLS row as incorrectly arming `autoLand` instead of `autoBoostBack`.
- In the current candidate, `shipBoostbackFlight` is true only for the Ship vehicle and `rtls` preset. That branch calls the existing `toggleBoostBack` command. The command sets the existing `autoBoostBackOn` mode.
- Ship's `runAutopilot` calls `autoBoostBack`. Its finish path disables boostback and enables `autoLand` if it is not already enabled. Thus the test uses the existing boostback-to-auto-land handoff. The Super Heavy/RTLS row stays on its existing booster return policy.
- The test still constructs each matrix start through `createScenarioState(preset, undefined, vehicle)`. The non-launch-pad matrix path still calls `fly(..., 900, vehicle, true)`, with `DT` at 1/120 s, so its maximum remains 108,000 steps. Current assertions still require a landed outcome, no failures, the Ship terminal checks, and the Super Heavy catch gates. The separate reentry thermal witness and intro checks remain.

The current candidate source also retains the 30,000 ms test timeout in `vitest.config.ts`. The pinned V21 command selected the same test file with one worker; it does not add a retry or coverage option. V22's README claims these run bounds remain unchanged. This review does not authorize or predict a V22 run.

## Finding and next bounded step

The current controller selection fixes the exact mismatch identified for the RTLS/Ship row, and does not require a physics or product-source change. V21's prior matrix still records separate unresolved scenario/vehicle and horizon issues; this correction does not close them.

The requested change-only verification remains unproven because the V21 source bytes cannot be independently compared and the stated two-hunk reverse reconstruction misses the pinned V21 digest. Preserve this HOLD. The smallest next reviewable step is to provide the exact V21 predecessor file or a patch whose base is the pinned V21 bytes and whose application produces the current candidate hash, then refresh the source pin manifest. Until that provenance is closed, no broader no-other-change claim is warranted.
