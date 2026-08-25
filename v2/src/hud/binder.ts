/**
 * The HUD binder.
 *
 * THE WOUND THIS CLOSES, stated precisely. displayComponents/dispUpdate.js
 * contains 45 `document.getElementById` calls; 18 of them are in
 * `updateFlightParamDisp()`, the only one of its functions on the per-frame
 * path, and roughly 10 of those execute on a typical update. Every one of those
 * assigns `textContent` unconditionally — the value is written whether or not
 * it changed, and each assignment invalidates layout.
 *
 * 2021 could only afford that by not doing it often: the whole body is gated on
 * `updatedFrameCount % 5 == 0`, so the HUD refreshed at 12 Hz on a 60 fps
 * machine. The lag was the price of the lookups.
 *
 * The binder inverts that trade. It updates every frame — 120 Hz — and still
 * does less work, because it does not look anything up and does not write what
 * has not changed.
 *
 * Three things fix that, and all three matter:
 *
 *   ELEMENTS ARE RESOLVED ONCE, at bind time, into a fixed array. There is no
 *   getElementById on the per-frame path at all — none, not fewer.
 *
 *   VALUES ARE DIFFED. A readout is written only when its formatted string
 *   actually changed. In steady flight most do not change on most frames -
 *   throttle sits at 100, TWR barely moves - so the common case is zero DOM
 *   writes.
 *
 *   ONE SUBSCRIBER. This is the only thing outside the renderer running per
 *   frame. Svelte renders on interaction; the HUD is not reactive state.
 *
 * The budget is 2 ms per update (CLAUDE.md).
 */
import type { SimState } from '$core/state';
import { READOUTS, type Readout } from './readouts';

export interface HudBinder {
  /** Write any readouts whose value changed. */
  update(state: SimState): void;
  /** DOM writes performed by the last update. */
  readonly lastWriteCount: number;
  /** Total writes since binding. */
  readonly totalWrites: number;
  destroy(): void;
}

/** The minimum a target must look like. Keeps this testable without a DOM. */
export interface TextTarget {
  textContent: string | null;
}

export interface BindOptions {
  /**
   * Resolve a readout's value and unit elements.
   *
   * Injected rather than assumed, so the binder can be tested against plain
   * objects and so ui/ owns the markup.
   */
  resolve(id: string): { value: TextTarget | null; unit: TextTarget | null };
}

export function createHudBinder(options: BindOptions): HudBinder {
  /** Resolved once. Nothing below touches the document again. */
  const bound: Array<{
    readout: Readout;
    valueEl: TextTarget | null;
    unitEl: TextTarget | null;
    lastValue: string;
    lastUnit: string;
  }> = READOUTS.map((readout) => {
    const { value, unit } = options.resolve(readout.id);
    return {
      readout,
      valueEl: value,
      unitEl: unit,
      // Deliberately a space, not '': an empty initial value would match a
      // readout that legitimately formats to empty and suppress its first write.
      lastValue: ' ',
      lastUnit: ' ',
    };
  });

  let lastWriteCount = 0;
  let totalWrites = 0;

  return {
    get lastWriteCount() {
      return lastWriteCount;
    },
    get totalWrites() {
      return totalWrites;
    },

    update(state: SimState): void {
      let writes = 0;

      for (let i = 0; i < bound.length; i++) {
        const entry = bound[i]!;

        const value = entry.readout.value(state);
        if (value !== entry.lastValue) {
          entry.lastValue = value;
          if (entry.valueEl) {
            entry.valueEl.textContent = value;
            writes += 1;
          }
        }

        const unit = entry.readout.unit(state);
        if (unit !== entry.lastUnit) {
          entry.lastUnit = unit;
          if (entry.unitEl) {
            entry.unitEl.textContent = unit;
            writes += 1;
          }
        }
      }

      lastWriteCount = writes;
      totalWrites += writes;
    },

    destroy(): void {
      bound.length = 0;
    },
  };
}
