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
 * first-load stylesheet when the charts are not on screen. `./charts.css` is
 * our theme over the top of uPlot's, and it rides the same lazy chunk — putting
 * it in theme.css would have shipped a stylesheet for a view most players never
 * open, on every page load, which is half of what M4.5 removed.
 */
export async function loadCharts(): Promise<UPlotConstructor> {
  if (cached) return cached;
  const [module] = await Promise.all([
    import('uplot'),
    import('uplot/dist/uPlot.min.css'),
    import('./charts.css'),
  ]);
  cached = module.default;
  return cached;
}

/**
 * Series colours, one per line, in draw order.
 *
 * The one place in this design where a hue is load-bearing rather than
 * decorative: distinguishing five lines on one axis is exactly what colour is
 * for, and BROADCAST-UI-PLAN's "white plus opacity" rule is about hierarchy,
 * not about charts. What DID have to change is the palette — the five were
 * picked for a near-white sheet, and on the dark card the black box now uses
 * (M6.5) the darkest of them was barely a line at all. These are the same five
 * hues at a luminance that reads on `rgb(6 8 12)`, with white leading so the
 * primary series is the brightest thing on the plot.
 */
const COLOURS = ['#ffffff', '#ffb000', '#57c7ff', '#c58fff', '#5fd98a'];

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
      /*
        The x axis is elapsed seconds, not a date.

        uPlot treats the x scale as UNIX time by default, so every plot was
        labelling its axis `1/1/70 12:00am` and its ticks `:00.050`, `:00.100`
        — the recorder's `time` channel starts at zero, and zero epoch is 1970.
        It has been that way since M4.5 and nobody looked, because the charts
        were nine small dark rectangles on a white sheet. Theming them dark in
        M6.5 made the axes legible, and legible was enough to see this.

        Display-only: the plotted data is unchanged, and so is everything in
        core.
      */
      scales: { x: { time: false } },
      // A flight is tens of thousands of samples; cursor hit-testing over that
      // on every mousemove is what makes a chart feel stuck.
      cursor: { points: { show: false } },
    },
  };
}
