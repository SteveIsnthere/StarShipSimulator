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

        const width = Math.min(element.clientWidth || 640, 640);
        for (const spec of PLOTS) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset['plot'] = spec.id;
          element.appendChild(cell);

          const { data, options } = buildPlot(spec, recorder, width, 220);
          charts.push(new UPlot(options, data as never, cell));
        }
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
    background: rgb(0 0 0 / 35%);
  }
  .blackbox {
    position: fixed;
    inset: 5% 5% 5% 5%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    overflow-y: auto;
    background: rgb(240 240 240 / 96%);
    backdrop-filter: blur(10px);
    border-radius: 0.75rem;
    font: 500 0.8rem/1.4 var(--font);
    color: #0b1017;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .bar button {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    padding: 0.4rem 0.6rem;
    font: inherit;
    background: rgb(255 255 255 / 70%);
    cursor: pointer;
  }
  .status {
    margin: 0;
    opacity: 0.7;
  }
  .plots {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: 0.5rem;
    justify-items: center;
  }
</style>
