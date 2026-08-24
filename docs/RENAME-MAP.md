# Rename map — M1.10

The 2021 tree was ported verbatim, misspellings included, so that porting diffs
stayed line-by-line comparable against the original. That job is done: M1.8
locked behaviour with golden fixtures, so names can now change without anyone
having to trust that they did so safely.

This pass is **mechanical**. It renames identifiers and nothing else. Its
acceptance is that the golden fixtures are byte-identical afterwards — if a
rename changed behaviour, it was not a rename.

Only `v2/` is touched. The 2021 tree keeps its spellings until M5.4 retires it,
so this table is also the dictionary for reading the old code against the new.

## Misspellings

| 2021 | v2 | Note |
|---|---|---|
| `gimbol…` | `gimbal…` | `gimbolPosition`, `gimbolSpeed`, `gimbolAngleLimit`, `gimbolPointingDirection` |
| `presisionAlignment` | `precisionAlignment` | |
| `throttleLowwerLimmit` | `throttleLowerLimit` | two misspellings in one name |
| `throttleUpperLimmit` | `throttleUpperLimit` | |
| `…SurfaceAera` | `…SurfaceArea` | `frontFinSurfaceAera`, `aftFinSurfaceAera`, `totalFinSurfaceAera` |
| `finAcuation…` | `finActuation…` | `finAcuationMaxAngle`, `finAcuationSpeed` |
| `…Extention` | `…Extension` | `frontFinExtention`, `aftFinExtention` |
| `raptorIgnitionFaliureRate` | `raptorIgnitionFailureRate` | |
| `randomFaliure` | `randomFailure` | |
| `aeroDesent…` | `aeroDescent…` | `aeroDesentCompleted`, `aeroDesentMaxCorrectionAngle` |
| `finalDesentStage…` | `finalDescentStage…` | three fields and the controller |
| `planetCirconference` | `planetCircumference` | |
| `planetLineaVelocity` | `planetLinearVelocity` | |
| `intergalOfRCubedTimesDx` | `integralOfRCubedTimesDx` | |
| `inFightBreakUp` | `inFlightBreakUp` | "fight" for "flight" |
| `overGload` | `overGLoad` | g-load, not "gload" |
| `overGloadWarning` | `overGLoadWarning` | |
| `flipEnducedXposChange` | `flipInducedXPosChange` | "enduced" for "induced" |
| `vehicleVerticalPropotion` | `vehicleVerticalProportion` | referenced in a comment only |
| `boostBackinitCompleted` | `boostBackInitCompleted` | casing |
| `boostBackDecelerationStageinitCompleted` | `boostBackDecelerationStageInitCompleted` | casing |
| `…Initted` | `…Initialised` | `flipStageInitted`, `finalDesentStageInitted`, `horizontalAdjustmentStageInitted`, `autoTakeOffInited` |

## Consistency, not spelling

These were spelled correctly but inconsistently. Renamed so that one concept has
one name.

| 2021 | v2 | Note |
|---|---|---|
| `starBaseXpos` | `starBaseXPos` | `Xpos` → `XPos` throughout |
| `landingSiteXpos` | `landingSiteXPos` | |
| `finalXposPrediction` | `finalXPosPrediction` | |
| `initAutoLandXposDiffThreshold` | `initAutoLandXPosDiffThreshold` | |
| `boostbackDirection` | `boostBackDirection` | `boostback` → `boostBack`, matching every other use |
| `twr` | `twr` | kept: TWR is the standard term, and `getTWR`/`controlEnginebyTWR` read fine |

## Deliberately NOT renamed

- `controlEnginebyTWR`, `controlEnginebyEffectiveVerticalTWR` — the lowercase
  `by` is odd, but these are the names in every autopilot mode and the 2021
  cross-reference is more valuable than the casing.
- `raptorAutoShutDown_KeepMinTWRBelow1` — the underscore is unusual and the name
  is long, but it says exactly what the function does.
- `pitchRecord`, `pitchRateOfChange` — correct already.
- Anything in the 2021 tree. It stays as-is until M5.4.
