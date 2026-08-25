/**
 * The chart layer, loaded on demand.
 *
 * THE WOUND. 2021 shipped Plotly from a CDN on every page load — about 3.5 MB
 * of JavaScript, for nine charts almost nobody opened, blocking the first frame
 * of a game. It also meant the simulator did not work offline, which M5.1 has to
 * fix and cannot while a chart library is fetched from someone else's server.
 *
 * uPlot is about 45 kB, it is a dependency rather than a CDN script, and this
 * module is the only thing that imports it. Because the import below is dynamic,
 * the bundler puts uPlot in its own chunk that is fetched the first time the
 * black box is opened and never before — which is why scripts/check-budget.mjs
 * does not count it against the 250 kB first-load budget.
 */
import type uPlotType from 'uplot';
import type { Recorder, PlotSpec } from '$app/recorder';

/** The constructor, which is all this module needs from the module. */
type UPlotConstructor = typeof uPlotType;

let cached: UPlotConstructor | null = null;

/**
 * Load uPlot, once.
 *
 * The CSS is imported here too, for the same reason: it should not be in the
 * first-load stylesheet when the charts are not on screen.
 */
export async function loadCharts(): Promise<UPlotConstructor> {
  if (cached) return cached;
  const [module] = await Promise.all([import('uplot'), import('uplot/dist/uPlot.min.css')]);
  cached = module.default;
  return cached;
}

/** Series colours, one per line, in draw order. */
const COLOURS = ['#c0392b', '#2471a3', '#1e8449', '#8e44ad', '#b7950b'];

/**
 * Build the uPlot data and options for one plot spec.
 *
 * Separated from the rendering so the shape of what gets drawn is testable
 * without a canvas — the tests assert the axes and series line up with the
 * recording, which is the part that can silently go wrong.
 */
export function buildPlot(
  spec: PlotSpec,
  recorder: Recorder,
  width: number,
  height: number,
): { data: number[][]; options: uPlotType.Options } {
  const x = spec.xChannel ? recorder.series[spec.xChannel] ?? [] : recorder.time;
  const data: number[][] = [[...x]];

  const series: uPlotType.Series[] = [{ label: spec.xLabel ?? 'Time (s)' }];

  spec.channels.forEach((id, index) => {
    data.push([...(recorder.series[id] ?? [])]);
    series.push({
      label: id,
      stroke: COLOURS[index % COLOURS.length]!,
      width: 1.5,
      points: { show: false },
    });
  });

  return {
    data,
    options: {
      title: spec.title,
      width,
      height,
      series,
      axes: [
        { label: spec.xLabel ?? 'Time (s)' },
        ...(spec.yLabel ? [{ label: spec.yLabel }] : []),
      ],
      // A flight is tens of thousands of samples; cursor hit-testing over that
      // on every mousemove is what makes a chart feel stuck.
      cursor: { points: { show: false } },
    },
  };
}
