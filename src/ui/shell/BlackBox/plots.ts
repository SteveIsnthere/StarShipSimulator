/**
 * The black box's nine plots, drawn — the lazily loaded half of the surface.
 *
 * BlackBox.tsx reaches this module only through a dynamic `import('./plots')`
 * when the dialog first opens, so neither this file, src/ui/charts.ts's uPlot
 * nor any chart stylesheet is in the first load (scripts/check-entry-graph.mjs,
 * tests/e2e/blackbox.spec.ts "no chart code is loaded until the black box is
 * opened").
 *
 * src/ui/charts.ts builds each plot's data and options (the ghost, the event
 * markers, the shared cursor); this module dresses them for the player — human
 * labels and units from ./channels, axes in the design system's greys with
 * room for their tick labels, and legends that rest on the end of the flight
 * instead of reading `--` until something is hovered.
 */
import type uPlotType from 'uplot';
import { PLOTS, type PlotSpec, type Recorder } from '$app/recorder';
import type { TimelineEvent } from '$hud/timeline';
import { buildPlot, loadCharts } from '$ui/charts';
import { PLOT_DISPLAY, channelDisplay, formatValue } from './channels';
import './plots.css';

export interface PlotsInput {
  /** The flight in display units (./channels displayRecording). */
  readonly recorder: Recorder;
  /** The flight before it, in the same units; absent when there is none. */
  readonly previous?: Recorder;
  readonly events: readonly TimelineEvent[];
  /** The simulated time under the shared cursor, or null when it leaves. */
  readonly onCursor: (t: number | null) => void;
}

export interface Plots {
  /** Show or hide the previous flight on every plot. */
  setGhost(show: boolean): void;
  destroy(): void;
}

const HEIGHT = 220;

interface Theme {
  readonly text: string;
  readonly line: string;
  readonly grid: string;
  readonly mono: string;
  readonly sans: string;
}

/** Canvas needs concrete colours: the kit's tokens, read once per draw. */
function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  // Every token is defined in index.css; an empty read means no stylesheet (a test), and uPlot's default stands.
  const token = (name: string, fallback = '') => style.getPropertyValue(name).trim() || fallback;
  return {
    text: token('--color-ui-muted'),
    line: token('--color-ui-line-muted'),
    grid: token('--color-flight-grid'),
    mono: token('--font-mono', "'JetBrains Mono', monospace"),
    sans: token('--font-sans', "'Inter', system-ui, sans-serif"),
  };
}

/**
 * A y axis as wide as its longest tick label, so labels never run into the
 * plot or the axis title (uPlot's fixed 50 px clipped "100,000").
 */
const fitTicks: uPlotType.Axis.Size = (u, values, axisIndex, cycle) => {
  const axis = u.axes[axisIndex]!;
  const settled = (axis as { _size?: number })._size;
  if (cycle > 1 && settled !== undefined) return settled;
  let size = (axis.ticks?.size ?? 0) + (axis.gap ?? 0);
  const longest = (values ?? []).reduce((a, v) => (v.length > a.length ? v : a), '');
  if (longest !== '') {
    // After init uPlot keeps `font` as [scaled font, size]; the scaled string
    // measures in device pixels.
    u.ctx.font = (axis.font as unknown as string[])[0] ?? '';
    size += u.ctx.measureText(longest).width / devicePixelRatio;
  }
  return Math.ceil(size) + 2;
};

function axis(theme: Theme, label: string | undefined, y: boolean): uPlotType.Axis {
  return {
    stroke: theme.text,
    font: `11px ${theme.mono}`,
    labelFont: `11px ${theme.sans}`,
    ...(label === undefined ? {} : { label, labelSize: 16, labelGap: 0 }),
    gap: 4,
    size: y ? fitTicks : 30,
    grid: { stroke: theme.grid, width: 1 },
    ticks: { stroke: theme.line, width: 1, size: 4 },
  };
}

/** Labels, units and axes for one plot's options, in place. */
function dress(spec: PlotSpec, options: uPlotType.Options, theme: Theme, last: number): void {
  const display = PLOT_DISPLAY[spec.id];
  const series = options.series;
  const ghosts = series.length - 1 - spec.channels.length;

  const x = series[0]!;
  if (spec.xChannel === undefined) {
    x.label = 'Time';
    x.value = (_u, v) => (v === null ? '' : `T+${v.toFixed(1)} s`);
  } else {
    const id = spec.xChannel;
    x.label = channelDisplay(id).label;
    x.value = (_u, v) => (v === null ? '' : formatValue(id, v));
  }

  spec.channels.forEach((id, index) => {
    const label = channelDisplay(id).label;
    const ghost = series[1 + index];
    if (index < ghosts && ghost) {
      ghost.label = `${label}, previous flight`;
      // Null past the previous flight's own end: say so rather than '--'.
      ghost.value = (_u, v) => (v === null ? 'ended' : formatValue(id, v));
    }
    const line = series[1 + ghosts + index]!;
    line.label = label;
    line.value = (_u, v) => (v === null ? '' : formatValue(id, v));
  });

  options.axes = [axis(theme, display?.xLabel ?? 'Time (s)', false), axis(theme, display?.yLabel, true)];

  /*
    REST ON THE END OF THE FLIGHT. With no pointer over it uPlot clears every
    legend value to `--`; put them back on the last sample instead — at
    creation (uPlot fires setCursor once while initialising) and whenever the
    pointer leaves. Legend only: `cursor.idx` stays null, so charts.ts's
    `onCursor` still reports "nothing under the pointer" to the readout.
  */
  const rest = (u: uPlotType) => {
    if (last >= 0 && (u.cursor.idx === null || u.cursor.idx === undefined)) u.setLegend({ idx: last }, false);
  };
  const hooks = (options.hooks ??= {});
  hooks.setCursor = [...(hooks.setCursor ?? []), rest];
  hooks.ready = [...(hooks.ready ?? []), rest];
}

/** The cell's content width: clientWidth includes the cell's own padding. */
function cellWidth(cell: HTMLElement): number {
  const style = getComputedStyle(cell);
  const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  return Math.max(240, (cell.clientWidth || 480) - padding);
}

export async function drawPlots(host: HTMLElement, input: PlotsInput): Promise<Plots> {
  const UPlot = await loadCharts();
  host.replaceChildren();

  /*
    Every cell first, THEN measure: with one child an auto-fit grid is a single
    full-width column, so measuring as each cell arrives sized the first plots
    for a column that was about to split.
  */
  const cells = PLOTS.map((spec) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset['plot'] = spec.id;
    host.appendChild(cell);
    return cell;
  });

  const theme = readTheme();
  const last = input.recorder.length - 1;
  const ghostIndices: number[][] = [];

  const charts = PLOTS.map((spec, index) => {
    const cell = cells[index]!;
    const titled: PlotSpec = { ...spec, title: PLOT_DISPLAY[spec.id]?.title ?? spec.title };
    const { data, options } = buildPlot(titled, input.recorder, cellWidth(cell), HEIGHT, {
      events: input.events,
      ...(input.previous ? { previous: input.previous } : {}),
      onCursor: input.onCursor,
      // One key per x scale: the fly path is against downrange, not time, and
      // uPlot syncs cursors by value (see charts.ts PlotExtras.syncKey).
      ...(spec.xChannel === undefined ? { syncKey: 'black-box-time' } : {}),
    });
    dress(spec, options, theme, last);
    const ghosts = options.series.length - 1 - spec.channels.length;
    ghostIndices.push(Array.from({ length: ghosts }, (_, i) => i + 1));
    return new UPlot(options, data as never, cell);
  });

  // Follow the dialog's width (a window resize, a rotated phone).
  const widths = cells.map((cell) => cellWidth(cell));
  const observer =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          cells.forEach((cell, index) => {
            const width = cellWidth(cell);
            if (width === widths[index]) return;
            widths[index] = width;
            charts[index]!.setSize({ width, height: HEIGHT });
          });
        });
  observer?.observe(host);

  return {
    setGhost(show) {
      charts.forEach((chart, index) => {
        for (const series of ghostIndices[index]!) chart.setSeries(series, { show }, false);
      });
    },
    destroy() {
      observer?.disconnect();
      for (const chart of charts) chart.destroy();
      host.replaceChildren();
    },
  };
}
