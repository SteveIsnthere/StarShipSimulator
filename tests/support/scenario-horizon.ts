/** Test-only mission deadlines under Steve's 2026-10-18 duration ruling.
 * These are failure deadlines, not proof that a controller can meet them.
 * One ground revisit admits a firing opportunity; one Kepler period allocates
 * preparation/burn/vacuum transit; the original 900 s admits terminal return.
 * Every support and preparation tick must count against the same total.
 */
import * as C from '$core/constants';
import type { ScenarioPreset } from '$core/scenarios';
import { DT } from '$app/loop';

export interface MissionHorizon {
  readonly seconds: number;
  readonly steps: number;
}

export function orbitalMissionHorizon(altitude: number, rotation: number = C.frameRotationRate):
  MissionHorizon & { readonly keplerPeriod: number; readonly groundPeriod: number } {
  const radius = C.planetRadius + altitude;
  if (!Number.isFinite(radius) || !(radius > 0) || !Number.isFinite(rotation)) {
    throw new RangeError('Orbital mission geometry must be finite and outside the centre');
  }
  const angularRate = Math.sqrt(C.planetGravitationalParameter / radius ** 3);
  if (!(angularRate - rotation > 0)) throw new RangeError('A prograde ground revisit is required');
  const keplerPeriod = 2 * Math.PI / angularRate;
  const groundPeriod = 2 * Math.PI / (angularRate - rotation);
  const seconds = groundPeriod + keplerPeriod + 900;
  const steps = Math.ceil(seconds / DT);
  if (!Number.isFinite(keplerPeriod) || !(keplerPeriod > 0)
    || !Number.isFinite(groundPeriod) || !(groundPeriod > 0)
    || !Number.isFinite(seconds) || !Number.isSafeInteger(steps) || !(steps > 0)) {
    throw new RangeError('Orbital deadline must have finite periods and safely countable ticks');
  }
  return { seconds, steps, keplerPeriod, groundPeriod };
}

export function scenarioMissionHorizon(preset: ScenarioPreset): MissionHorizon {
  if (preset.id === 'circularize' || preset.id === 'deorbit') {
    return orbitalMissionHorizon(preset.altitude);
  }
  return { seconds: 900, steps: 108_000 };
}
