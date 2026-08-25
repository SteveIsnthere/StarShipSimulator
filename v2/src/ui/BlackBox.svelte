<!--
  The black box.

  Nine plots of the flight just flown. index.html:128.

  Everything here is behind a dynamic import, so opening this view is the first
  time a chart library touches the page. 2021 loaded 3.5 MB of Plotly from a CDN
  on every page load whether or not anyone opened the plots — which also meant
  the simulator could not run offline.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { PLOTS, type Recorder } from '$app/recorder';
  import { buildPlot, loadCharts } from './charts';

  interface Props {
    open: boolean;
    recorder: Recorder;
    onClose: () => void;
  }

  const { open, recorder, onClose }: Props = $props();

  let host: HTMLElement | undefined = $state();
  let status = $state('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let charts: any[] = [];

  const destroyCharts = () => {
    for (const chart of charts) chart.destroy();
    charts = [];
  };

  onDestroy(destroyCharts);

  /**
   * Draw when the view opens.
   *
   * $effect rather than a click handler because the host element does not exist
   * until the {#if} has rendered it. Drawing is a one-shot per open: the plots
   * are a record of the flight, not a live instrument, so nothing here runs per
   * frame.
   */
  $effect(() => {
    if (!open) {
      destroyCharts();
      return;
    }

    const element = host;
    if (!element) return;

    let cancelled = false;
    status = recorder.length === 0 ? 'Nothing recorded yet — fly something first.' : 'Loading…';

    if (recorder.length === 0) return;

    void loadCharts()
      .then((UPlot) => {
        if (cancelled || !element) return;
        destroyCharts();
        element.replaceChildren();
        status = '';

        /*
          Sized to the CELL, not to the container.

          This measured `element.clientWidth` and capped it at 640, which was
          right while the black box was one narrow sheet and wrong the moment
          M6.5 made it full-screen: the host is now the whole window, so every
          chart was built 640px wide and dropped into a ~410px grid column,
          where it ran off the right-hand edge. The cell has to exist before it
          can be measured, so it is appended first and read second.
        */
        // Every cell first, THEN measure. Appending and measuring in one pass
        // gave the first three charts the width of an almost-empty grid: with
        // one child, `auto-fit` collapses to a single full-width column, so
        // cell 1 measured 1250px, cell 2 measured 620, and only from cell 3 on
        // did it settle at the real 410 — which is exactly what the top row
        // looked like, three oversized charts overlapping each other.
        const cells = PLOTS.map((spec) => {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset['plot'] = spec.id;
          element.appendChild(cell);
          return cell;
        });

        PLOTS.forEach((spec, index) => {
          const cell = cells[index]!;
          // clientWidth excludes the border but includes the padding the theme
          // puts on `.cell`, so take that back off. The fallback covers a cell
          // that has not been laid out at all — a detached container, in
          // practice only reachable from a test.
          const style = getComputedStyle(cell);
          const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
          const width = Math.max(240, (cell.clientWidth || 480) - padding);

          const { data, options } = buildPlot(spec, recorder, width, 220);
          charts.push(new UPlot(options, data as never, cell));
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) status = `Charts unavailable: ${String(error)}`;
      });

    return () => {
      cancelled = true;
    };
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={onClose}></div>

  <div class="blackbox" role="dialog" aria-label="Black box" data-blackbox data-testid="black-box">
    <div class="bar">
      <span>Black Box</span>
      <button type="button" data-blackbox-control="close" data-testid="black-box-close" onclick={onClose}>Close</button>
    </div>

    {#if status}
      <p class="status" data-blackbox-status>{status}</p>
    {/if}

    <div class="plots" bind:this={host}></div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgb(6 8 12 / 55%);
  }
  /*
    M6.5: the same full-frame card as the menu. It was a near-white sheet inset
    5% on every side, which meant the flight showed round the edges of nine dark
    charts — a window onto a document, floating over a game. Reading a flight
    back is its own activity and gets its own screen.
  */
  .blackbox {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: rgb(6 8 12 / 94%);
    backdrop-filter: blur(14px);
    color: var(--ink-100);
    font-family: var(--font);
    font-size: var(--size-body);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: calc(var(--safe-top) + 0.9rem) calc(var(--safe-right) + var(--gutter)) 0.9rem
      calc(var(--safe-left) + var(--gutter));
    border-bottom: var(--hairline);
  }
  .bar span {
    font-family: var(--font-condensed);
    font-size: 1rem;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
  }
  .bar button {
    min-height: var(--touch);
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.4rem 0.7rem;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-70);
    background: rgb(255 255 255 / 4%);
    cursor: pointer;
    touch-action: manipulation;
  }
  .bar button:hover {
    border-color: var(--ink-45);
    color: var(--ink-100);
  }
  .status {
    margin: 0;
    padding: 1rem var(--gutter);
    color: var(--ink-45);
    font-size: var(--size-label);
    letter-spacing: var(--track-label-tight);
  }
  .plots {
    flex: 1 1 auto;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: 0.75rem;
    justify-items: center;
    padding: 1rem calc(var(--safe-right) + var(--gutter)) calc(var(--safe-bottom) + 1.5rem)
      calc(var(--safe-left) + var(--gutter));
  }
</style>
