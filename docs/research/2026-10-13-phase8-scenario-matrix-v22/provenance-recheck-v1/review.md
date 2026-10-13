# Independent V22 provenance recheck

**Disposition: HIGH_SOURCE_INPUT_ONLY for the narrow V22 source delta.** This addendum resolves the provenance blocker in the prior HOLD without changing or replacing that report. It does not establish test success, command readiness, runtime acceptance, or resolution of V21's broader scenario-contract issues.

## Reconstructed predecessor check

The V22 candidate is `tests/flies-every-scenario.test.ts`, 13,541 bytes, SHA-256 `ecb37ed056299d07a5edc05b4e9d3fed9345ca8fbb1510849dc3604f731b3959`. V21's independent source review pins the predecessor as 13,375 bytes, SHA-256 `13e5f271b8d7c068792fcf1932a6d5534202e12ded8d17302f5cc2551c981934`.

I reconstructed the predecessor in memory from the current file by removing the exact three V22-added whole lines: the `toggleBoostBack` import, the `shipBoostbackFlight` predicate declaration, and its `else if` branch. The resulting bytes are 13,375 and hash exactly to V21's pinned digest. No temporary or candidate file was written. A unified diff of the reconstructed bytes against V22 shows exactly two hunks: the import addition and the RTLS mode-selection addition. The earlier HOLD's 2-byte mismatch came from my first reconstruction matching only six leading spaces of the eight-space predicate line, leaving two spaces behind; that reconstruction was invalid. The prior HOLD report remains preserved as historical evidence.

## Source and contract review

The two hunks implement the V21 scenario/vehicle review's specific finding. The RTLS preset is downrange and climbing and calls for boostback. V22 selects the new branch only when `vehicle.id === 'ship' && preset.id === 'rtls'`, then invokes the existing `toggleBoostBack` command. That command arms `autoBoostBackOn`. Ship's autopilot calls its existing boostback controller; its finish path disables boostback and enables auto-land. The Super Heavy/RTLS row remains on its existing booster-return route.

The reconstructed V21 bytes and V22 bytes are otherwise identical. Therefore the candidate does not change preset construction or start state, per-ID/vehicle rows, the outcome and catch assertions, the 900-second / 108,000-step matrix bound, the 30,000 ms Vitest timeout, worker/retry/coverage selection, or product physics/control. Current `vitest.config.ts` and the pinned V21 command/result records are included as context. The V22 README says the one-shot has not run; this review did not run it.

## Limits

This HIGH applies only to source/input provenance and the narrow Ship/RTLS correction. The V21 actual result remains a 20/30 test failure. V21's independent diagnosis and the 18-row scenario/vehicle contract review retain separate HOLDs; V22 changes only the unsupported RTLS/Ship mode selection and does not close those gaps. No flight, test, performance, gate, or Phase 8 acceptance is inferred.

Inputs and their direct SHA-256/byte pins are in `pins.json`.
