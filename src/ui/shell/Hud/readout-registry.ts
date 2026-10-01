/**
 * How the HUD binders find the elements React rendered.
 *
 * By test id and `data-metric`, in the whole document rather than inside one
 * surface: the readouts live in more than one surface (the mission clock is in
 * the status bar, everything else in the primary cluster), and the binders are
 * bound once, by the Hud, after every surface has committed its markup. The
 * test-id contract (src/ui/testids.ts) is the one name each element answers
 * to, so there is no second set of hooks to drift from it.
 *
 * Called at bind time only. The binders resolve every element once into a
 * fixed array; nothing here runs on the per-frame path.
 */
import type { AttributeTarget, TextTarget } from '$hud/binder';
import { byTestId, metricSelector, readoutUnitTestId, readoutValueTestId } from '$ui/testids';

export type ReadoutResolver = (id: string) => { value: TextTarget | null; unit: TextTarget | null };
export type MetricResolver = (id: string) => AttributeTarget | null;

/** A readout's value and unit text nodes, by `readout-<id>-value` / `-unit`. */
export function readoutResolver(root: ParentNode = document): ReadoutResolver {
  return (id) => ({
    value: root.querySelector(byTestId(readoutValueTestId(id))),
    unit: root.querySelector(byTestId(readoutUnitTestId(id))),
  });
}

/** A drawn metric's element, by `data-metric`. */
export function metricResolver(root: ParentNode = document): MetricResolver {
  return (id) => root.querySelector(metricSelector(id));
}

/** Resolves nothing: binding these points the binders away from a page that is going. */
export const detachedReadout: ReadoutResolver = () => ({ value: null, unit: null });
export const detachedMetric: MetricResolver = () => null;
