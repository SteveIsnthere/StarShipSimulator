/**
 * The indicator binder's targets, over the controls this surface rendered.
 *
 * The binder (src/hud/binder.ts) resolves each id in `$hud/indicators` once and
 * then toggles `is-on` on it, only when the simulation's boolean flipped. A
 * plain element would do for the class, but a toggle button also owes its
 * state to assistive technology, so each target here is a small adapter that
 * writes the class and `aria-pressed` together. The adapters are built once,
 * at bind time: the per-frame path calls `toggle` on an object that already
 * exists and allocates nothing.
 *
 * The autopilot's Manual segment has no indicator of its own — it is current
 * when none of the modes is — so the adapters for the modes also keep it in
 * step, and remember which modes are lit so Manual can switch them off.
 */
import type { ClassTarget } from '$hud/binder';
import { AUTOPILOT_MODES, type AutopilotMode } from '$ui/guide';

/** The binder's default active class, which this surface's styles key on. */
export const ACTIVE_CLASS = 'is-on';

/** Marks the Manual segment, which the adapters light when no mode is on. */
const MANUAL_ATTRIBUTE = 'data-autopilot-manual';
export const MANUAL_PROPS = { [MANUAL_ATTRIBUTE]: '' } as const;

export interface ControlIndicators {
  /** For `session.bindIndicators`. Null for an id this surface does not render. */
  resolve(id: string): ClassTarget | null;
  /** The autopilot modes lit at the binder's last write, in panel order. */
  activeModes(): AutopilotMode[];
}

function paint(el: Element, on: boolean, token = ACTIVE_CLASS): void {
  el.classList.toggle(token, on);
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
}

/** Resolve every `[data-indicator]` under `root`, once. */
export function createControlIndicators(root: ParentNode): ControlIndicators {
  const manual = root.querySelector(`[${MANUAL_ATTRIBUTE}]`);
  const lit: boolean[] = AUTOPILOT_MODES.map(() => false);

  const syncManual = () => {
    if (manual) paint(manual, !lit.includes(true));
  };

  const targets: Record<string, ClassTarget> = {};
  for (const el of root.querySelectorAll<HTMLElement>('[data-indicator]')) {
    const id = el.dataset['indicator'];
    if (!id) continue;
    const mode = AUTOPILOT_MODES.findIndex((m) => m.indicator === id);
    targets[id] = {
      classList: {
        toggle(token: string, on: boolean) {
          paint(el, on, token);
          if (mode >= 0) {
            lit[mode] = on;
            syncManual();
          }
        },
      },
    };
  }
  syncManual();

  return {
    resolve: (id) => targets[id] ?? null,
    activeModes: () => AUTOPILOT_MODES.filter((_, i) => lit[i]),
  };
}
