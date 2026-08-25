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
import { INDICATORS, type Indicator } from './indicators';
import { METRICS, type Metric } from './metrics';

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

/** The minimum an indicator target must look like. */
export interface ClassTarget {
  classList: { toggle(token: string, force: boolean): void };
}

export interface IndicatorBinder {
  update(state: SimState): void;
  /** Class toggles performed by the last update. */
  readonly lastWriteCount: number;
  readonly totalWrites: number;
  destroy(): void;
}

export interface IndicatorBindOptions {
  resolve(id: string): ClassTarget | null;
  /** Class applied while the control is active. Defaults to `is-on`. */
  activeClass?: string;
}

/**
 * The same binder, for the controls rather than the readouts.
 *
 * 2021's `updateButtons()` repainted fourteen buttons unconditionally, at two
 * `getElementById` calls and two inline style writes each. This resolves once
 * and toggles one class, only when the boolean actually flipped — which for a
 * button is almost never.
 *
 * It is a separate binder rather than a mode of the readout one because the two
 * write different things (text nodes versus classes) and a shared abstraction
 * over "write something to a DOM node" would earn nothing but indirection.
 */
export function createIndicatorBinder(options: IndicatorBindOptions): IndicatorBinder {
  const activeClass = options.activeClass ?? 'is-on';

  const bound: Array<{
    indicator: Indicator;
    el: ClassTarget | null;
    /** Deliberately neither true nor false, so the first update always writes. */
    last: boolean | null;
  }> = INDICATORS.map((indicator) => ({
    indicator,
    el: options.resolve(indicator.id),
    last: null,
  }));

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
        const on = entry.indicator.on(state);
        if (on !== entry.last) {
          entry.last = on;
          if (entry.el) {
            entry.el.classList.toggle(activeClass, on);
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

/** The minimum a metric target must look like. */
export interface AttributeTarget {
  setAttribute(name: string, value: string): void;
}

export interface MetricBinder {
  update(state: SimState): void;
  /** Attribute writes performed by the last update. */
  readonly lastWriteCount: number;
  readonly totalWrites: number;
  destroy(): void;
}

export interface MetricBindOptions {
  resolve(id: string): AttributeTarget | null;
}

/**
 * The third binder: the parts of the HUD that are drawn rather than spelled.
 *
 * M6.2 added gauge arcs, propellant bars, engine dots and an attitude chevron —
 * none of which is text, all of which must update per frame. The obvious move
 * was to let the components animate themselves, which would have put reactive
 * framework code back on the frame path and undone M4.1. This keeps the law:
 * still ONE rAF subscriber, still resolve-once, still diff-before-write.
 *
 * What is different from the readout binder, and why it had to be:
 *
 *   THE DIFF IS ON INTEGERS, NOT STRINGS. A gauge fraction is a float that
 *   moves every frame. Diffing formatted strings would mean building a string
 *   every frame to discover it was not needed — an allocation per metric per
 *   frame, which the budget forbids. Each metric reports an integer quantum at
 *   display precision instead; `format` runs only when that integer moved.
 *
 *   THE WRITE IS setAttribute, NOT textContent. `stroke-dashoffset` and
 *   `transform` are attributes; so is the `data-state` an engine dot is styled
 *   from. Writing them through the same code path as text would have needed a
 *   union that helped nobody.
 */
export function createMetricBinder(options: MetricBindOptions): MetricBinder {
  const bound: Array<{
    metric: Metric;
    el: AttributeTarget | null;
    /** Not a number, so the first update always writes. */
    last: number | null;
  }> = METRICS.map((metric) => ({
    metric,
    el: options.resolve(metric.id),
    last: null,
  }));

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
        const quantum = entry.metric.quantum(state);
        if (quantum !== entry.last) {
          entry.last = quantum;
          if (entry.el) {
            entry.el.setAttribute(entry.metric.attribute, entry.metric.format(quantum));
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
