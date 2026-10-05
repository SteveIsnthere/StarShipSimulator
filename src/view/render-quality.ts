/** Explicit presentation policy; no backend/timing inference or resource allocation. */
export type RenderQualityMode = 'full' | 'reduced';
export interface RenderQuality {
  readonly mode: RenderQualityMode;
  readonly particleCapacity: 4000;
  readonly combinedParticleCapacity: 8000;
  readonly hullDetail: boolean;
  readonly gridOpenings: true;
  readonly heatPost: boolean;
}
function policy(mode: RenderQualityMode, detail: boolean): RenderQuality {
  return Object.freeze({ mode, particleCapacity: 4000, combinedParticleCapacity: 8000,
    hullDetail: detail, gridOpenings: true, heatPost: detail });
}
const FULL = policy('full', true), REDUCED = policy('reduced', false);
export function renderQuality(width: number, height: number, dpr: number, reduced = false): RenderQuality {
  if (![width, height, dpr].every(value => Number.isFinite(value) && value > 0) || typeof reduced !== 'boolean')
    throw new RangeError('Render quality requires positive finite target dimensions/DPR and explicit boolean mode');
  return reduced ? REDUCED : FULL;
}
