/**
 * The two text nodes a readout's binder writes into: the value and its unit.
 *
 * Rendered empty, once. The HUD binder fills them every frame that the
 * formatted string changes; React never re-renders them. The surrounding row
 * (`readout-<id>`) belongs to whoever places the readout, because a readout's
 * label and layout differ by where it sits.
 */
import type { ReadoutId } from '$ui/testids';
import { readoutUnitTestId, readoutValueTestId } from '$ui/testids';

export interface ReadoutTextProps {
  id: ReadoutId;
  /**
   * A limit-state metric that shares the value's element (heat, Q). The metric
   * binder writes `data-state` on it; the stylesheet reads that.
   */
  metric?: string;
  valueClassName?: string;
  unitClassName?: string;
  /** For a readout with no unit (the clock): present for the binder, silent for a screen reader. */
  unitHidden?: boolean;
}

export function ReadoutText({ id, metric, valueClassName, unitClassName, unitHidden }: ReadoutTextProps) {
  return (
    <>
      <span
        data-testid={readoutValueTestId(id)}
        data-metric={metric}
        data-state={metric ? 'nominal' : undefined}
        className={valueClassName}
      />
      <span
        data-testid={readoutUnitTestId(id)}
        aria-hidden={unitHidden ? true : undefined}
        className={unitClassName}
      />
    </>
  );
}
