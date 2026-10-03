/** Quantised counts from actual engine states; format only when they change. */
import { BOOSTER_ENGINE_GROUPS } from '$core/vehicles/super-heavy';
import type { SimState } from '$core/state';
import type { TextTarget } from './binder';

export type EngineGroup = keyof typeof BOOSTER_ENGINE_GROUPS;
export const ENGINE_GROUP_LABELS = { centre: 'Centre', inner: 'Inner', outer: 'Outer' } as const;
export const ENGINE_GROUP_NAMES: readonly EngineGroup[] = ['centre', 'inner', 'outer'];

export function createEngineGroupBinder(resolve: (group: EngineGroup) => TextTarget | null) {
  const entries = ENGINE_GROUP_NAMES.map(group => ({ indices: BOOSTER_ENGINE_GROUPS[group], target: resolve(group), last: -1 }));
  let writes = 0;
  return {
    get lastWriteCount() { return writes; },
    update(state: SimState) {
      writes = 0;
      for (const entry of entries) {
        let lit = 0, starting = 0, failed = 0;
        for (const i of entry.indices) {
          if (state.engines.failed[i]) failed++;
          else if (state.engines.running[i]) lit++;
          else if (typeof state.engines.ignitionCountdown[i] === 'number') starting++;
        }
        const quantum = lit + 34 * starting + 34 * 34 * failed;
        if (quantum === entry.last) continue;
        entry.last = quantum;
        if (entry.target) { entry.target.textContent = `${lit} lit · ${starting} start · ${failed} fail`; writes++; }
      }
    },
    destroy() { entries.length = 0; },
  };
}
export type EngineGroupBinder = ReturnType<typeof createEngineGroupBinder>;
