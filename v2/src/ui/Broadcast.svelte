<!--
  The broadcast layer: the upper strip and the lower third.

  This replaces the top-left readout block that stood in for a HUD from M4.1 to
  M6.1. That block was thirteen label/value/unit rows in a grid — legible,
  honest, and shaped exactly like the 2021 one it was ported from, which is the
  problem M6 exists to fix. The reference overlay puts nothing in the top-left
  corner, because the top-left corner is where the world is.

  What lives here now, following docs/BROADCAST-UI-PLAN.md § 3:

    TOP     the mission clock and the scenario name, over a thin scrim.
    BOTTOM  two dial-and-digit gauges; the vehicle's physical state as engine
            dots, propellant bars and an attitude chevron; and above them a
            collapsible engineering strip carrying the long-tail numbers.

  SVELTE OWNS THE STRUCTURE, THE BINDERS OWN THE VALUES — unchanged since M4.1
  and the reason this is affordable at all. There is exactly one piece of
  reactive state in this component (`expanded`, which a click changes), and the
  scenario name, which changes when a flight is configured. Nothing else here
  re-renders, ever. Every number on screen arrives through the single rAF
  subscriber in App.svelte.

  `pointer-events: none` on the whole layer, restored on the one button: the
  overlay annotates the world, it does not sit in front of it. Dragging the
  camera through the scrim has to work.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { READOUTS } from '$hud/readouts';
  import type { AttributeTarget, TextTarget } from '$hud/binder';
  import Gauge from './Gauge.svelte';
  import { readoutTestId, readoutUnitTestId, readoutValueTestId } from './testids';

  interface Props {
    /** Called once, after mount, with resolvers over the rendered elements. */
    onready: (
      text: (id: string) => { value: TextTarget | null; unit: TextTarget | null },
      metric: (id: string) => AttributeTarget | null,
    ) => void;
    /** The loaded scenario's name. Changes only when a flight is configured. */
    scenario: string;
  }

  const { onready, scenario }: Props = $props();

  /**
   * The long-tail readouts: everything the gauges and the clock do not show.
   *
   * Derived from the readout list rather than written out again, so a readout
   * added to `$hud/readouts` appears here automatically instead of silently
   * having no home. `primary` marks the two the gauges took (dispUpdate.js:193
   * used the same flag to decide what survived a collapse); `PLACED` lists the
   * ones this component puts somewhere specific instead. Both exclusions
   * matter: a readout appearing twice would give one test id two elements, and
   * every locator using it would go ambiguous.
   */
  const PLACED = new Set([
    'clock', // upper strip
    'speedScale', // inside the speed dial
    'altitudeScale', // inside the altitude dial
    'propellant', // beside the CH4/LOX bars
    'pitch', // beside the attitude chevron
  ]);
  const ENGINEERING = READOUTS.filter((r) => !r.primary && !PLACED.has(r.id));

  /**
   * The two readouts that get a colour, and the metric that decides it.
   *
   * Heat and dynamic pressure are the only numbers on screen that can end the
   * flight, so they are the only ones allowed a hue (BROADCAST-UI-PLAN § 1,
   * principle 3). The binder writes `data-state` here; the stylesheet does the
   * rest. Nothing computes a colour in JavaScript.
   */
  const LIMIT_METRIC: Record<string, string> = {
    heat: 'heat-state',
    dynamicPressure: 'q-state',
  };

  /** The propellant pair. See hud/metrics.ts for why one tank draws two bars. */
  const TANKS: ReadonlyArray<readonly [label: string, metric: string]> = [
    ['CH4', 'propellant-ch4'],
    ['LOX', 'propellant-lox'],
  ];

  /**
   * dispUpdate.js:193 — the secondary readouts collapse.
   *
   * Hidden rather than unmounted, for the same reason the control panels are:
   * the binder resolved these text nodes once and holds them. Removing them
   * from the DOM would leave it writing into orphans.
   */
  let expanded = $state(true);

  let root: HTMLElement;

  onMount(() => {
    // Resolved once, here, and never again. A plain record rather than a Map:
    // built once, read by the binder, never written again.
    const values: Record<string, HTMLElement | undefined> = {};
    const units: Record<string, HTMLElement | undefined> = {};
    const metrics: Record<string, HTMLElement | undefined> = {};

    for (const el of root.querySelectorAll<HTMLElement>('[data-readout-value]')) {
      const id = el.dataset['readoutValue'];
      if (id) values[id] = el;
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-readout-unit]')) {
      const id = el.dataset['readoutUnit'];
      if (id) units[id] = el;
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-metric]')) {
      const id = el.dataset['metric'];
      if (id) metrics[id] = el;
    }

    onready(
      (id) => ({ value: values[id] ?? null, unit: units[id] ?? null }),
      (id) => metrics[id] ?? null,
    );
  });
</script>

<div class="broadcast" bind:this={root} role="status" aria-live="off">
  <!-- ── the upper strip ─────────────────────────────────────────────── -->
  <div class="top">
    <div class="clock" data-testid={readoutTestId('clock')}>
      <span class="clock-prefix">T+</span>
      <span
        class="clock-value"
        data-readout-value="clock"
        data-testid={readoutValueTestId('clock')}
      ></span>
      <!--
        The clock has no unit, but the binder writes a unit for every readout
        and the test-id contract promises the node exists. Present and empty is
        the honest answer; hiding it from the accessibility tree keeps a screen
        reader from announcing nothing.
      -->
      <span
        class="clock-unit"
        aria-hidden="true"
        data-readout-unit="clock"
        data-testid={readoutUnitTestId('clock')}
      ></span>
    </div>
    <span class="mission bc-label">{scenario}</span>
  </div>

  <!-- ── the lower third ─────────────────────────────────────────────── -->
  <div class="lower">
    <div class="strip">
      <div class="engineering" class:collapsed={!expanded}>
        {#each ENGINEERING as readout (readout.id)}
          <div class="chip" data-testid={readoutTestId(readout.id)}>
            <span class="chip-label bc-label">{readout.label}</span>
            <span
              class="chip-value bc-value"
              data-readout-value={readout.id}
              data-testid={readoutValueTestId(readout.id)}
              data-metric={LIMIT_METRIC[readout.id]}
              data-state={LIMIT_METRIC[readout.id] ? 'nominal' : undefined}
            ></span>
            <span
              class="chip-unit bc-unit"
              data-readout-unit={readout.id}
              data-testid={readoutUnitTestId(readout.id)}
            ></span>
          </div>
        {/each}
      </div>

      <button
        class="strip-toggle bc-label"
        type="button"
        data-hud-control="expand"
        data-testid="hud-toggle"
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide detailed readouts' : 'Show detailed readouts'}
        onclick={() => (expanded = !expanded)}
      >
        {expanded ? 'HIDE' : 'DATA'}
      </button>
    </div>

    <div class="bar">
      <div class="dials">
        <Gauge readout="speed" metric="gauge-speed" scale="speedScale" label="SPEED" />
        <Gauge readout="altitude" metric="gauge-altitude" scale="altitudeScale" label="ALTITUDE" />
      </div>

      <div class="vehicle">
        <!--
          The engine cluster. Three dots for three Raptors — the element the
          reference broadcasts are loved for, because an engine failing is
          visible the instant it happens without anyone saying so. The state
          each dot shows is written by the metric binder as `data-state`; see
          hud/metrics.ts for why four states and not two.
        -->
        <div class="engines">
          <div class="dots">
            {#each [0, 1, 2] as engine (engine)}
              <span
                class="dot"
                data-metric={`engine-${engine}`}
                data-state="off"
              ></span>
            {/each}
          </div>
          <span class="bc-label">Raptors</span>
        </div>

        <div class="propellant">
          {#each TANKS as [label, metric] (metric)}
            <div class="tank">
              <span class="bc-label">{label}</span>
              <svg class="tank-bar" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
                <rect class="tank-track" x="0" y="0" width="100" height="6" />
                <rect
                  class="tank-fill"
                  x="0"
                  y="0"
                  width="100"
                  height="6"
                  data-metric={metric}
                />
              </svg>
            </div>
          {/each}
          <div class="tank-readout" data-testid={readoutTestId('propellant')}>
            <span
              class="bc-value"
              data-readout-value="propellant"
              data-testid={readoutValueTestId('propellant')}
            ></span>
            <span
              class="bc-unit"
              data-readout-unit="propellant"
              data-testid={readoutUnitTestId('propellant')}
            ></span>
          </div>
        </div>

        <div class="attitude">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <!--
              A chevron on the vehicle's nose axis. Rotated by the metric
              binder about the box centre; 0 is straight up, which is how the
              simulation measures pitch.
            -->
            <g data-metric="attitude" transform="rotate(0 12 12)">
              <path class="chevron" d="M12 3 L19 17 L12 13 L5 17 Z" />
            </g>
            <circle class="attitude-ring" cx="12" cy="12" r="11" />
          </svg>
          <div class="attitude-digits" data-testid={readoutTestId('pitch')}>
            <span
              class="bc-value"
              data-readout-value="pitch"
              data-testid={readoutValueTestId('pitch')}
            ></span>
            <span
              class="bc-unit"
              data-readout-unit="pitch"
              data-testid={readoutUnitTestId('pitch')}
            ></span>
          </div>
          <span class="bc-label">Pitch</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .broadcast {
    position: absolute;
    inset: 0;
    /* The overlay annotates the world; it never intercepts a drag on it. */
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--ink-100);
  }

  /* --- the upper strip --------------------------------------------------- */

  .top {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: calc(var(--safe-top) + 0.6rem) var(--gutter) 1.75rem
      calc(var(--safe-left) + var(--gutter));
    background: var(--scrim-top);
  }
  .clock {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    font-variant-numeric: tabular-nums;
  }
  .clock-prefix {
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label);
    color: var(--ink-70);
  }
  .clock-value {
    font-family: var(--font);
    font-weight: 700;
    font-size: var(--size-clock);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .mission {
    color: var(--ink-70);
  }

  /* --- the lower third --------------------------------------------------- */

  .lower {
    display: grid;
    justify-items: start;
    gap: 0.4rem;
    padding: 4rem calc(var(--safe-right) + var(--gutter))
      calc(var(--safe-bottom) + 1.1rem) calc(var(--safe-left) + var(--gutter));
    background: var(--scrim);
  }

  /*
    The engineering strip. Small, ink-70, above everything else — present for
    the pilot who wants it and quiet for the one who does not. The reference
    overlay has no equivalent because a broadcast viewer cannot fly the vehicle.
  */
  .strip {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    width: 100%;
  }
  .engineering {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 1.1rem;
  }
  .engineering.collapsed {
    visibility: hidden;
    height: 0;
    overflow: hidden;
  }
  .chip {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
  }
  .chip-value {
    font-size: var(--size-body);
    font-weight: 400;
    color: var(--ink-70);
  }
  /*
    Colour as meaning, and only here. `data-state` is written by the metric
    binder off the two limits that can end a flight (hud/metrics.ts).
  */
  .chip-value[data-state='caution'] {
    color: var(--caution);
  }
  .chip-value[data-state='alarm'] {
    color: var(--alarm);
  }

  .strip-toggle {
    pointer-events: auto;
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.15rem 0.45rem;
    background: transparent;
    color: var(--ink-70);
    cursor: pointer;
    touch-action: manipulation;
  }

  .bar {
    display: flex;
    align-items: flex-end;
    gap: 2rem;
    width: 100%;
  }
  .dials {
    display: flex;
    gap: 1.1rem;
  }

  .vehicle {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
  }

  /* --- engines ----------------------------------------------------------- */

  .engines {
    display: grid;
    justify-items: center;
    gap: 0.35rem;
  }
  .dots {
    display: flex;
    gap: 0.4rem;
  }
  .dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    border: 1px solid var(--ink-45);
    background: transparent;
  }
  /*
    :global, and it has to be. Svelte prunes a scoped selector it cannot prove
    any element matches, and it reasons about the markup statically — the dots
    are rendered with `data-state="off"`, so the other three states look
    unreachable to the compiler and their rules get dropped from the bundle.
    They are reached at runtime, by the metric binder. The `.dots` prefix keeps
    the escape hatch as narrow as the cluster itself.
  */
  .dots :global([data-state='lit']) {
    background: var(--ink-100);
    border-color: var(--ink-100);
  }
  .dots :global([data-state='igniting']) {
    background: var(--ink-45);
    border-color: var(--ink-100);
    animation: blink var(--blink-duration) steps(2, jump-none) infinite;
  }
  .dots :global([data-state='failed']) {
    background: var(--alarm);
    border-color: var(--alarm);
  }
  @keyframes blink {
    50% {
      opacity: 0.35;
    }
  }

  /* --- propellant -------------------------------------------------------- */

  .propellant {
    display: grid;
    gap: 0.2rem;
    min-width: 8rem;
  }
  .tank {
    display: grid;
    grid-template-columns: 2.1rem 1fr;
    align-items: center;
    gap: 0.4rem;
  }
  .tank-bar {
    width: 100%;
    height: 0.4rem;
  }
  .tank-track {
    fill: var(--ink-12);
  }
  .tank-fill {
    fill: var(--ink-100);
  }
  .tank-readout {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    font-size: var(--size-body);
  }

  /* --- attitude ---------------------------------------------------------- */

  .attitude {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
  }
  .attitude svg {
    width: 2.5rem;
    height: 2.5rem;
  }
  .chevron {
    fill: var(--ink-100);
  }
  .attitude-ring {
    fill: none;
    stroke: var(--ink-25);
    stroke-width: 1;
  }
  .attitude-digits {
    display: flex;
    align-items: baseline;
    gap: 0.15rem;
    font-size: var(--size-body);
  }
</style>
