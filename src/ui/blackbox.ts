/**
 * M12.3 — the black box as an instrument, in the parts a test can hold.
 *
 * WHAT WAS WRONG WITH IT. Nine plots of the flight you just flew, drawn
 * correctly, and no way to ask them anything. Where was MAX-Q on this curve?
 * What was the angle of attack at the moment the heating peaked? Was this
 * landing gentler than the last one? Every one of those is a question about a
 * NUMBER at a MOMENT, and a picture of a line cannot answer it — so the reader
 * squints at nine rectangles and guesses.
 *
 * Four things follow, and three of them are pure functions in this file: where
 * the mission events fall on each plot, what every channel reads at the cursor,
 * and the flight as a CSV somebody can take away. The fourth — drawing them —
 * is `charts.ts`, which is where uPlot lives.
 *
 * `tests/ui/blackbox.test.ts` drives all three against a real recording.
 */
import type { Recorder, PlotSpec } from '$app/recorder';
import { CHANNELS } from '$app/recorder';
import { recordTimeInterval } from '$core/constants';
import { DT } from '$app/loop';
import type { TimelineEvent } from '$hud/timeline';

/**
 * Where an event sits on ONE plot's x axis.
 *
 * `x` is in the plot's own units, which is the whole reason this is a function
 * rather than a constant per event. Eight of the nine plots are against elapsed
 * time and the answer is the event's own timestamp; `flyPath` is altitude
 * against DOWNRANGE, so MAX-Q at T+52 s is a line at whatever kilometre mark
 * the vehicle had reached by then. Drawing it at 52 there would put max-Q
 * fifty-two metres from the pad.
 */
export interface Marker {
  readonly id: string;
  /** s — when it happened, for the label. */
  readonly at: number;
  /** The plot's own x units. */
  readonly x: number;
}

/**
 * The recorder's sample index at or just before a time.
 *
 * Binary search: a long flight is tens of thousands of samples and this runs
 * once per event per plot, and again on every cursor move.
 *
 * Returns -1 when the recording is empty or starts after `t`, which callers
 * treat as "this event is not on this plot" rather than clamping to sample
 * zero — an event that happened before the recording began did not happen at
 * its first sample.
 */
export function sampleAt(time: readonly number[], t: number): number {
  if (time.length === 0 || t < time[0]!) return -1;
  let low = 0;
  let high = time.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (time[mid]! <= t) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** s between recorder samples — the width of the gap at each end. */
export const SAMPLE_SECONDS = recordTimeInterval * DT;

/**
 * The events that fall on this plot, in this plot's x units.
 *
 * TWO RULES ABOUT THE ENDS, and review found the first version getting both of
 * them wrong in different directions.
 *
 * AFTER the recording, an event is DROPPED rather than clamped. The recorder
 * stops at the end of the flight (`shouldSample`), so TOUCHDOWN and LOSS are
 * always a moment past the last sample; a clamped marker draws them exactly on
 * the final point of every curve, which reads as "this is where it landed" and
 * is wrong by a whole sampling interval on the plot where the last interval is
 * the interesting one. The first version enforced that only on the time plots,
 * and let `sampleAt`'s clamp put LOSS on the last downrange metre of the fly
 * path.
 *
 * BEFORE it, an event within ONE SAMPLING INTERVAL is snapped to the first
 * sample rather than dropped — and that is not a fudge either. The recorder
 * does not sample a vehicle standing on the pad, so its first sample lands a
 * fraction of a second AFTER the wheels leave, and LIFTOFF fires in that gap
 * on every launch there has ever been. The first version dropped it from all
 * nine plots: the anchor event of the whole timeline, missing, on the one
 * flight anybody marks up.
 */
export function markersFor(
  spec: PlotSpec,
  recorder: Recorder,
  events: readonly TimelineEvent[],
): Marker[] {
  const time = recorder.time;
  if (time.length === 0) return [];
  const first = time[0]!;
  const last = time[time.length - 1]!;

  const out: Marker[] = [];
  for (const event of events) {
    if (event.at > last) continue;
    if (event.at < first - SAMPLE_SECONDS) continue;
    const index = Math.max(0, sampleAt(time, event.at));

    if (spec.xChannel === undefined) {
      // Time axis: the event's own timestamp, except inside the opening gap,
      // where the axis does not go back that far.
      out.push({ id: event.id, at: event.at, x: Math.max(event.at, first) });
      continue;
    }
    const series = recorder.series[spec.xChannel];
    if (!series || index >= series.length) continue;
    out.push({ id: event.id, at: event.at, x: series[index]! });
  }
  return out;
}

/**
 * The previous flight's channels, resampled onto this one's time axis.
 *
 * uPlot wants every series to share one x array, and two flights do not: they
 * have different lengths and different clocks. So the ghost is looked up at
 * each of THIS flight's sample times, and reads `null` — a gap, not a zero —
 * wherever the previous flight had not started or had already ended. A ghost
 * that flat-lined at zero past its own touchdown would draw a landing that
 * never happened.
 *
 * NULL FOR THE FLY-PATH PLOT, and the reason is worth stating rather than
 * hiding behind an empty array. That plot's x axis is DOWNRANGE, and downrange
 * is not monotonic: a boostback flies out, turns round and comes back over its
 * own track, so "the previous flight's altitude at this downrange" has two
 * answers for half the flight and no principled way to choose. A ghost there
 * would be a plausible-looking line through points that were never adjacent.
 */
export function ghostSeries(
  spec: PlotSpec,
  current: Recorder,
  previous: Recorder,
): (number | null)[][] | null {
  if (spec.xChannel !== undefined) return null;
  if (previous.time.length === 0) return null;
  const last = previous.time[previous.time.length - 1]!;

  return spec.channels.map((id) => {
    const series = previous.series[id];
    if (!series) return current.time.map(() => null);
    return current.time.map((t) => {
      if (t > last) return null;
      const index = sampleAt(previous.time, t);
      return index < 0 || index >= series.length ? null : series[index]!;
    });
  });
}

/** One channel's value under the cursor, ready to print. */
export interface Reading {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

/**
 * Every channel at one moment — the readout the shared cursor writes.
 *
 * ALL of them, not just the ones on the plot under the pointer. That is the
 * point of a shared cursor: the question "what was the angle of attack when the
 * heating peaked" is asked by putting the cursor on the heating peak, and the
 * angle of attack is on a different plot.
 */
export function readingsAt(recorder: Recorder, t: number): Reading[] {
  const index = sampleAt(recorder.time, t);
  if (index < 0) return [];
  const out: Reading[] = [];
  for (const channel of CHANNELS) {
    const series = recorder.series[channel.id];
    if (!series || index >= series.length) continue;
    out.push({ id: channel.id, label: channel.label, value: series[index]! });
  }
  return out;
}

/** The recorder's columns, in the order the CSV writes them. */
export const CSV_COLUMNS: readonly string[] = ['time', ...CHANNELS.map((c) => c.id)];

/**
 * The flight as a CSV.
 *
 * SEVENTEEN SIGNIFICANT DIGITS, which looks like overkill in a file a human
 * opens in a spreadsheet and is not. `Number.prototype.toString()` already
 * emits the shortest decimal that round-trips exactly, so this costs nothing
 * over `toFixed(6)` in the common case and keeps the file a faithful copy of
 * the recording rather than a rounded picture of it. The test round-trips every
 * sample of a real flight through `parseCsv` and asserts bit equality; a
 * formatted export could not pass that, and a black box whose export is not the
 * data is a black box with a second, quieter version of the truth.
 */
export function toCsv(recorder: Recorder): string {
  const lines: string[] = [CSV_COLUMNS.join(',')];
  for (let i = 0; i < recorder.time.length; i++) {
    const row: string[] = [String(recorder.time[i])];
    for (const channel of CHANNELS) row.push(String(recorder.series[channel.id]?.[i] ?? ''));
    lines.push(row.join(','));
  }
  // A trailing newline: POSIX text, and what every tool expects at the end.
  return `${lines.join('\n')}\n`;
}

/** Read one back. The inverse of `toCsv`, and only a test has a use for it. */
export function parseCsv(text: string): { columns: string[]; rows: number[][] } {
  const lines = text.split('\n').filter((line) => line !== '');
  const columns = (lines.shift() ?? '').split(',');
  return { columns, rows: lines.map((line) => line.split(',').map(Number)) };
}

/**
 * A file name a person can find again.
 *
 * The scenario and the flight's own length, not a wall clock: two exports of
 * the same scenario differ by how far it got, which is the thing worth telling
 * them apart by, and a timestamp would make the name depend on when they
 * pressed the button rather than on what they are exporting.
 */
export function csvFileName(scenarioId: string, seconds: number): string {
  const safe = scenarioId.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  return `starship-${safe}-${seconds.toFixed(1)}s.csv`;
}
