# Independent material and HUD audit — 2026-10-03

Scope: read-only review of the exact material inversion refactor, branch-execution evidence from its original-output proof, and complete rerun of the assigned HUD/UI regression cohort. This is not a full gate or release review.

## Material ruling

The implementation preserves the existing certified 48-cell result path, saves the actual floating midpoint-tree bounds immediately after comparison 40, and performs exactly eight original enthalpy comparisons only when the strict ancestor certificate succeeds. An uncertified ancestor retains the original full 48-step fallback. Domain validation and exact minimum/reference/maximum results are unchanged. Newton stagnation stops only the untrusted hint; it cannot publish an unchecked temperature. There is no new mutable memo cache.

The expanded original-output proof compares exact values and monotonic output across dense domain energies, cold-table boundaries, original-tree depths 39–41 and 47–48, adjacent representable energies, and positive/negative powers near the zero-energy reference. The inversion-only suite passes its two tests, with the opt-in timing benchmark skipped. An additional V8 run selected only the dense bit-comparison test, so every executed inverse input in the counts below was checked against the original 48-step solver. That selected test passes; its other two tests were excluded by the explicit name filter. No production source was changed by this reviewer.

| Executed path in the dense exact-output proof | Count |
| --- | ---: |
| Existing certified 48-cell return | 80,693 |
| Certified depth-40 recovery return | 1,154 |
| Recovery midpoint comparisons | 9,232 (exactly 8 per recovery) |
| Full original fallback | 23 |
| Fallback midpoint comparisons | 1,104 (exactly 48 per fallback) |
| Newton floating-stagnation exit | 7,149 |

Both sides of the final eight comparisons and the original fallback comparisons execute. The strict ancestor certificate takes both its success and failure paths. Evidence is `v3-material-bitproof-native-coverage.json`, extracted directly from Vitest's native V8 coverage report for the unmodified source. `v3-material-bitproof-native-coverage.txt` and `v3-material-native-coverage.txt` retain the raw receipts.

Both coverage commands exit 1 because a single-file diagnostic cannot meet the existing whole-core coverage thresholds. No include scope, exclusion, threshold, or configuration was changed; only the report destination and JSON reporter were selected. This is path-execution evidence, not a green coverage gate. The exact invocation for the narrower proof was:

```bash
npx vitest run --project unit tests/core/damage-material-inversion.test.ts -t 'reproduces the original48 bisection bits' --coverage --coverage.reporter=json --coverage.reportsDirectory=/tmp/v3-material-bitproof-native-coverage
```

No remaining material implementation objection was found in this bounded review.

## HUD findings and fixes

The real display defect was the flight watch skipping every crashed state, including an impact on the first observed step. V3 preserves incoming terminal motion before resetting the parent. The watch now accepts that snapshot, converts physical-COM velocity back to the frozen hull reference point actually judged by the landing gates, retains pre-release fuel, and freezes the witness. A real rotating first-step impact independently proves that COM lateral speed above the drift limit does not falsely label a stationary hull point as drifting. The inverse coordinate shift agrees within 1e-8 m/s; planet-scale coordinate subtraction prevents a promise of bit-identical reversal.

The remaining cohort failures had stale premises: the active Ship contact height is 26 m and tank capacity is 1600 t; the booster tank capacity is 3650 t; terminal parents freeze while their independent debris moves. A cached 20 kg legacy mass no longer changes retained V3 mass. The historical force-only overflow assertion remains explicit, alongside exact active-model prediction invariance under that stale cache. The historical 40 km drop retains its original 15% time and one-quarter-height distance limits under the historical vehicle cohort; an additional active V3 witness requires real breakup and cessation of touchdown prediction with every failure guard enabled.

Initial focused evidence: `v3-hud-cohort-fix.txt` contains 113 passes and two failures. One was a newly added inverse-coordinate test requiring impossible exact cancellation; the other exposed a second old 1200 t Ship assertion after its old contact-height assertion was corrected. `v3-hud-cohort-recheck.txt` records all six selected checks passing after correction. Targeted ESLint and diff checks passed. The complete current seven-file cohort now passes all 120 tests in 22.75 seconds, including the parent's added 50-cycle simultaneous Ship/booster breakup, pause, reset and resource-identity witness in `tests/ui/damage-scene.test.ts`. Receipt: `v3-hud-cohort-complete.txt`. The six HUD/UI files are the debrief, prediction, engine-group, menu, shell debrief and field-preset suites. The existing jsdom canvas-not-implemented warning remains in the log; it caused no failure. CPU execution was serialized after the UI production build and before the browser run.

`v3-material-hud-audit-hashes.json` pins the reviewed material source/proof and seven original HUD implementation/test inputs; every one matched again after both coverage diagnostics and the complete cohort. This reviewer made no additional runtime or test edits during this audit.

No physics limits, original numerical acceptance tolerances, coverage thresholds, golden fixtures, or browser tests were changed by this cohort repair.
