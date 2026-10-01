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
import type { TimelineEvent } from '$hud/timeline';
import { ghostSeries, markersFor, type Marker } from './blackbox';

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
 * The previous flight, drawn behind this one (M12.3).
 *
 * One colour for all of its channels rather than a dimmed copy of the five:
 * the ghost is answering "was this one better", which is a question about the
 * SHAPE of the last flight, not about which of its lines is which. Five dim
 * hues under five bright ones is ten lines and no comparison.
 */
const GHOST = 'rgb(255 255 255 / 22%)';

/** The mission events, drawn as verticals. Amber, the palette's one accent. */
const MARKER = 'rgb(255 176 0 / 45%)';
const MARKER_LABEL = 'rgb(255 176 0 / 90%)';

/**
 * Draw the mission events as labelled verticals.
 *
 * A uPlot `draw` hook rather than extra series: an event is not data on the y
 * axis, and giving it one would put it in the legend, in the cursor readout and
 * in the auto-ranging, none of which is what a marker is for.
 *
 * The label is drawn ABOVE the plot area, rotated where there is no room —
 * nine plots on a phone are 320 px wide and "LANDING BURN" written across one
 * is a caption over the flight rather than a mark on it.
 */
function drawMarkers(u: uPlotType, markers: readonly Marker[]): void {
  const { ctx } = u;
  const { left, top, width, height } = u.bbox;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.strokeStyle = MARKER;
  ctx.setLineDash([3, 3]);
  for (const marker of markers) {
    const x = Math.round(u.valToPos(marker.x, 'x', true)) + 0.5;
    if (x < left || x > left + width) continue;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + height);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = MARKER_LABEL;
  ctx.font = `${10 * devicePixelRatio}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  for (const marker of markers) {
    const x = u.valToPos(marker.x, 'x', true);
    if (x < left || x > left + width) continue;
    ctx.save();
    ctx.translate(x + 3 * devicePixelRatio, top + 2 * devicePixelRatio);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(marker.id, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Build the uPlot data and options for one plot spec.
 *
 * Separated from the rendering so the shape of what gets drawn is testable
 * without a canvas — the tests assert the axes and series line up with the
 * recording, which is the part that can silently go wrong.
 */
export interface PlotExtras {
  /** The mission timeline, drawn as verticals. Empty for none. */
  readonly events?: readonly TimelineEvent[];
  /** The flight before this one, drawn behind it. */
  readonly previous?: Recorder;
  /**
   * Called on every cursor move with the SIMULATED TIME under it, or null when
   * the pointer leaves the plot.
   *
   * Time, not the plot's own x. Review found the first version handing over
   * whatever was on the x axis, which on the fly-path plot is downrange METRES
   * — so hovering it looked up t = 1565 s in a 198-second recording and every
   * channel in the readout froze on the last sample of the flight under a
   * header reading `T+1565.58`. The readout's whole claim is that one cursor
   * reads one moment; the moment has to be a time.
   */
  readonly onCursor?: (t: number | null) => void;
  /**
   * uPlot's cursor-sync key. Only plots on the SAME x scale may share one.
   *
   * uPlot syncs by VALUE, so a key shared across incompatible axes moves the
   * cursor to a number that means something else: 1.5 km downrange pins the
   * eight time plots past their right-hand edge, and T+60 s lands sixty metres
   * from the pad on the fly path. The caller passes a key per scale; the fly
   * path gets none, and hovering it still drives the readout through
   * `onCursor`, which is the part that carries the meaning.
   */
  readonly syncKey?: string;
}

export function buildPlot(
  spec: PlotSpec,
  recorder: Recorder,
  width: number,
  height: number,
  extras: PlotExtras = {},
): { data: (number | null)[][]; options: uPlotType.Options } {
  const x = spec.xChannel ? recorder.series[spec.xChannel] ?? [] : recorder.time;
  const data: (number | null)[][] = [[...x]];

  const series: uPlotType.Series[] = [{ label: spec.xLabel ?? 'Time (s)' }];

  /*
    THE GHOST GOES FIRST, so this flight's lines are drawn over it rather than
    under it. uPlot draws in series order, and a comparison in which the old
    flight covers the new one is the wrong way round.
  */
  const ghost = extras.previous ? ghostSeries(spec, recorder, extras.previous) : null;
  if (ghost) {
    ghost.forEach((values, index) => {
      data.push(values);
      series.push({
        label: `${spec.channels[index]} (last)`,
        stroke: GHOST,
        width: 1,
        points: { show: false },
      });
    });
  }

  spec.channels.forEach((id, index) => {
    data.push([...(recorder.series[id] ?? [])]);
    series.push({
      label: id,
      stroke: COLOURS[index % COLOURS.length]!,
      width: 1.5,
      points: { show: false },
    });
  });

  const markers = extras.events ? markersFor(spec, recorder, extras.events) : [];

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
      /*
        A flight is tens of thousands of samples; cursor hit-testing over that
        on every mousemove is what makes a chart feel stuck. `sync` is what
        makes the nine plots ONE instrument: a cursor on the heating peak is a
        cursor on the same instant of the angle-of-attack plot, which is the
        question the black box existed to not answer.
      */
      cursor: {
        points: { show: false },
        ...(extras.syncKey
          ? {
              sync: {
                key: extras.syncKey,
                /*
                  X ONLY. uPlot's default syncs both scales, and these nine
                  plots share nothing on the y axis — tonnes of propellant,
                  radians, kilopascals — so a y-sync transplants a value from
                  one plot's range into another's and drags the cursor to a
                  height that means nothing.
                */
                scales: ['x', null],
              },
            }
          : {}),
      },
      hooks: {
        draw: markers.length > 0 ? [(u: uPlotType) => drawMarkers(u, markers)] : [],
        setCursor: extras.onCursor
          ? [
              (u: uPlotType) => {
                const index = u.cursor.idx;
                // `idx` is null when the pointer leaves the plot, and the
                // readout goes with it rather than freezing on a stale sample.
                // The value handed over is the recorder's TIME at that sample,
                // whatever this plot draws along its own x axis.
                extras.onCursor!(
                  index === null || index === undefined ? null : recorder.time[index] ?? null,
                );
              },
            ]
          : [],
      },
    },
  };
}
