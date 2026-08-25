<!--
  One dial-and-digit pair.

  BROADCAST-UI-PLAN § 1, principle 4: "A gauge arc gives rate-of-change at a
  glance; the numeral inside gives the value. Neither alone." This is that
  element, and it is the most repeated thing in the reference overlay.

  There is no reactive state here and nothing is passed in per frame. The
  component renders a fixed skeleton once; the arc, the numeral, the unit and
  the full-scale label are all written by the binders through the `data-metric`
  and `data-readout-*` hooks below. Making the value a prop would put a Svelte
  update on the frame path, which is the one thing CLAUDE.md forbids outright.
-->
<script lang="ts">
  import { GAUGE_CIRCUMFERENCE, GAUGE_RADIUS, GAUGE_SWEEP } from '$hud/metrics';
  import { readoutTestId, readoutUnitTestId, readoutValueTestId } from './testids';

  interface Props {
    /** The readout this dial shows: `speed` or `altitude`. */
    readout: string;
    /** The metric driving the arc. */
    metric: string;
    /** The metric driving the phone layout's straight tick. */
    barMetric: string;
    /** The readout holding the auto-ranged full-scale value. */
    scale: string;
    label: string;
  }

  const { readout, metric, barMetric, scale, label }: Props = $props();

  /*
    The dash pattern that makes a circle into a 270° arc: show three quarters,
    hide the rest. Rotating by 135° puts the gap at the bottom, centred — the
    Falcon-era gauge. Computed once, at module scale in metrics.ts, because the
    arc binder needs the same numbers to work out a dash offset.
  */
  const DASH = `${GAUGE_SWEEP} ${GAUGE_CIRCUMFERENCE}`;
</script>

<div class="gauge" data-testid={readoutTestId(readout)}>
  <span class="label bc-label">{label}</span>

  <div class="dial">
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <!-- The track. Never written to; it is the empty part of the dial. -->
      <circle
        class="track"
        cx="40"
        cy="40"
        r={GAUGE_RADIUS}
        stroke-dasharray={DASH}
        transform="rotate(135 40 40)"
      />
      <circle
        class="fill"
        cx="40"
        cy="40"
        r={GAUGE_RADIUS}
        stroke-dasharray={DASH}
        stroke-dashoffset={GAUGE_SWEEP}
        transform="rotate(135 40 40)"
        data-metric={metric}
      />
    </svg>

    <!--
      The phone layout's tick. Hidden above 600px, where the arc says the same
      thing better; shown below it, where a 92px dial does not fit. See
      hud/metrics.ts for why this is a second metric rather than a cleverer
      binder.
    -->
    <svg class="tick" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden="true">
      <rect class="tick-track" x="0" y="0" width="100" height="3" />
      <rect class="tick-fill" x="0" y="0" width="0" height="3" data-metric={barMetric} />
    </svg>

    <div class="digits">
      <span
        class="value bc-value"
        data-readout-value={readout}
        data-testid={readoutValueTestId(readout)}
      ></span>
      <span
        class="unit bc-unit"
        data-readout-unit={readout}
        data-testid={readoutUnitTestId(readout)}
      ></span>
    </div>
  </div>

  <!--
    The full-scale mark. The dial auto-ranges (hud/metrics.ts), so an arc three
    quarters full means nothing without it — and since it changes during flight
    it is a readout, written by the binder, not a Svelte value.
  -->
  <span class="scale" data-testid={readoutTestId(scale)}>
    <span class="scale-value" data-readout-value={scale} data-testid={readoutValueTestId(scale)}
    ></span>
    <span class="scale-unit" data-readout-unit={scale} data-testid={readoutUnitTestId(scale)}></span>
  </span>
</div>

<style>
  .gauge {
    display: grid;
    justify-items: center;
    gap: 0.15rem;
  }
  .dial {
    position: relative;
    width: var(--gauge-size, 5.75rem);
    height: var(--gauge-size, 5.75rem);
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  circle {
    fill: none;
    stroke-width: 3;
    stroke-linecap: butt;
  }
  .track {
    stroke: var(--ink-25);
  }
  .fill {
    stroke: var(--ink-100);
  }
  .digits {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 0.1rem;
  }
  .value {
    font-size: var(--gauge-numeral, var(--size-numeral));
  }
  .tick {
    display: none;
  }
  .tick-track {
    fill: var(--ink-12);
  }
  .tick-fill {
    fill: var(--ink-100);
  }
  .scale {
    font-family: var(--font-condensed);
    font-size: var(--size-label-sm);
    letter-spacing: var(--track-label);
    color: var(--ink-45);
    font-variant-numeric: tabular-nums;
  }
  .scale::before {
    content: 'FS ';
  }
  .scale-unit {
    padding-left: 0.15rem;
  }

  /*
    Phone portrait: digit and tick. The dial goes, the numeral grows to carry
    the space it leaves, and the arc's job passes to a 3px line underneath.
    BROADCAST-UI-PLAN § 3.
  */
  @media (width < 37.5rem) {
    .gauge {
      justify-items: start;
      gap: 0.1rem;
    }
    .dial {
      width: 100%;
      height: auto;
    }
    .dial svg:not(.tick) {
      display: none;
    }
    .tick {
      display: block;
      width: 100%;
      height: 3px;
      margin-top: 0.2rem;
    }
    .digits {
      position: static;
      display: flex;
      align-items: baseline;
      justify-content: flex-start;
      gap: 0.3rem;
    }
    .value {
      font-size: 1.6rem;
    }
  }
</style>
