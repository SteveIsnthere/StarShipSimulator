/**
 * M12.3 — the black box's three answerable questions, in node.
 *
 * Every test here runs a REAL flight through the real recorder and the real
 * timeline, because all three functions are about the relationship between two
 * recordings of the same thing and a fixture made by hand cannot be wrong in
 * the way they can be wrong.
 */
import { describe, expect, it } from 'vitest';
import { CHANNELS, PLOTS, createRecorder } from '$app/recorder';
import { createTimeline } from '$hud/timeline';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import * as cmd from '$core/control/commands';
import {
  CSV_COLUMNS,
  csvFileName,
  ghostSeries,
  markersFor,
  parseCsv,
  SAMPLE_SECONDS,
  readingsAt,
  sampleAt,
  toCsv,
} from '$ui/blackbox';

/** A launch: the one flight that fires most of the timeline. */
function flown() {
  const recorder = createRecorder();
  const timeline = createTimeline();
  let s = createScenarioState(getScenario('launch-pad')!);
  cmd.toggleAutoTakeOff(s);
  for (let i = 0; i < 90 * 120; i++) {
    s = step(s, DT);
    recorder.sample(s);
    timeline.observe(s);
  }
  return { recorder, timeline, state: s };
}

const FLIGHT = flown();

describe('finding a moment in the recording', () => {
  it('lands on the sample at or before the time asked for', () => {
    const { time } = FLIGHT.recorder;
    expect(time.length).toBeGreaterThan(1_000);

    for (const i of [0, 1, 17, 500, time.length - 1]) {
      // Exactly on a sample: that sample.
      expect(sampleAt(time, time[i]!)).toBe(i);
    }
    // Between two: the earlier one.
    const between = (time[10]! + time[11]!) / 2;
    expect(sampleAt(time, between)).toBe(10);
    // After the end: the last.
    expect(sampleAt(time, time[time.length - 1]! + 100)).toBe(time.length - 1);
  });

  it('and says "nowhere" rather than "the first sample" before the recording', () => {
    // The distinction matters: an event before the first sample did not happen
    // at the first sample, and a caller that clamps draws it there.
    expect(sampleAt(FLIGHT.recorder.time, -1)).toBe(-1);
    expect(sampleAt([], 5)).toBe(-1);
  });

  it('agrees with a linear scan, on every sample and between every pair', () => {
    const { time } = FLIGHT.recorder;
    const scan = (t: number) => {
      let best = -1;
      for (let i = 0; i < time.length; i++) if (time[i]! <= t) best = i;
      return best;
    };
    for (let i = 0; i < time.length; i += 37) {
      expect(sampleAt(time, time[i]!)).toBe(scan(time[i]!));
      expect(sampleAt(time, time[i]! - 1e-9)).toBe(scan(time[i]! - 1e-9));
    }
  });
});

describe('event markers land where the event happened', () => {
  it('the launch fires events worth marking', () => {
    expect(FLIGHT.timeline.events.length).toBeGreaterThan(1);
    expect(FLIGHT.timeline.has('LIFTOFF')).toBe(true);
  });

  it('on a time plot, at the event’s own timestamp', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const first = FLIGHT.recorder.time[0]!;
    const markers = markersFor(speed, FLIGHT.recorder, FLIGHT.timeline.events);
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      // Its own timestamp, except inside the opening gap — where the axis does
      // not go back that far and the marker sits at its start. See the
      // liftoff case below.
      expect(marker.x, marker.id).toBe(Math.max(marker.at, first));
    }
    expect(markers.some((m) => m.x === m.at), 'most are exact').toBe(true);
  });

  /*
    THE ONE THAT WOULD HAVE BEEN WRONG. `flyPath` is altitude against DOWNRANGE,
    so an event at T+52 s belongs at whatever distance the vehicle had covered
    by then — not at x = 52, which on that plot is fifty-two metres from the
    pad and, on a launch, is a line drawn through the first second of a
    ninety-second flight.
  */
  it('on the fly-path plot, at the downrange distance it had reached', () => {
    const path = PLOTS.find((p) => p.id === 'flyPath')!;
    const markers = markersFor(path, FLIGHT.recorder, FLIGHT.timeline.events);
    expect(markers.length).toBeGreaterThan(0);

    for (const marker of markers) {
      // `max(0, …)` for the same reason: an event in the opening gap belongs
      // to the first sample rather than to nowhere.
      const index = Math.max(0, sampleAt(FLIGHT.recorder.time, marker.at));
      expect(marker.x, marker.id).toBe(FLIGHT.recorder.series['downRange']![index]!);
      // And it is NOT the timestamp, which is the mistake being guarded.
      if (marker.at > 1) expect(marker.x).not.toBe(marker.at);
    }
  });

  it('and an event outside the recording is dropped, not clamped', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const last = FLIGHT.recorder.time[FLIGHT.recorder.time.length - 1]!;
    const invented = [
      { id: 'TOUCHDOWN' as const, at: last + 5 },
      { id: 'LIFTOFF' as const, at: -1 },
    ];
    expect(markersFor(speed, FLIGHT.recorder, invented)).toEqual([]);
  });

  /*
    ON EVERY PLOT, not only the time ones. The first version enforced the
    after-the-end rule inside the time branch and let `sampleAt`'s clamp put a
    post-recording event on the final downrange metre of the fly path — which
    is exactly the "this is where it landed" lie the rule exists to prevent,
    drawn on the one plot where it looks most convincing.
  */
  it('including on the fly-path plot, where the clamp used to hide it', () => {
    const path = PLOTS.find((p) => p.id === 'flyPath')!;
    const last = FLIGHT.recorder.time[FLIGHT.recorder.time.length - 1]!;
    expect(
      markersFor(path, FLIGHT.recorder, [{ id: 'TOUCHDOWN' as const, at: last + 0.5 }]),
    ).toEqual([]);
  });

  /*
    AND LIFTOFF IS NOT DROPPED, which the first version did on every launch
    there has ever been. `shouldSample` does not record a vehicle standing on
    the pad, so the recording's first sample lands a fraction of a second after
    the wheels leave and LIFTOFF fires in that gap — the anchor event of the
    whole timeline, missing from all nine plots.
  */
  it('and an event inside the opening gap is snapped to the first sample', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const first = FLIGHT.recorder.time[0]!;
    const liftoff = FLIGHT.timeline.events.find((e) => e.id === 'LIFTOFF')!;
    expect(liftoff.at, 'liftoff really is before the first sample').toBeLessThan(first);

    const markers = markersFor(speed, FLIGHT.recorder, FLIGHT.timeline.events);
    const marked = markers.find((m) => m.id === 'LIFTOFF');
    expect(marked, 'LIFTOFF is on the plot').toBeDefined();
    // At the axis's own start, because the axis does not go back to 0.008 s.
    expect(marked!.x).toBe(first);
    expect(marked!.at).toBe(liftoff.at);
  });

  it('but an event a whole interval before the recording is still dropped', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const first = FLIGHT.recorder.time[0]!;
    expect(
      markersFor(speed, FLIGHT.recorder, [
        { id: 'LIFTOFF' as const, at: first - SAMPLE_SECONDS * 2 },
      ]),
    ).toEqual([]);
  });
});

describe('the cursor reads every channel, not only the plot under it', () => {
  it('gives one reading per recorded channel', () => {
    const t = FLIGHT.recorder.time[400]!;
    const readings = readingsAt(FLIGHT.recorder, t);
    expect(readings.map((r) => r.id)).toEqual(CHANNELS.map((c) => c.id));
  });

  it('and each is that channel’s own sample at that moment', () => {
    const index = 400;
    const t = FLIGHT.recorder.time[index]!;
    for (const reading of readingsAt(FLIGHT.recorder, t)) {
      expect(reading.value, reading.id).toBe(FLIGHT.recorder.series[reading.id]![index]!);
    }
  });

  it('and nothing at all before the recording starts', () => {
    expect(readingsAt(FLIGHT.recorder, -1)).toEqual([]);
  });
});

describe('the CSV is the recording, not a picture of it', () => {
  it('round-trips every sample of a real flight, bit for bit', () => {
    const { columns, rows } = parseCsv(toCsv(FLIGHT.recorder));
    expect(columns).toEqual([...CSV_COLUMNS]);
    expect(rows.length).toBe(FLIGHT.recorder.time.length);

    for (let i = 0; i < rows.length; i++) {
      expect(rows[i]![0], `row ${i} time`).toBe(FLIGHT.recorder.time[i]!);
      CHANNELS.forEach((channel, c) => {
        expect(rows[i]![c + 1], `row ${i} ${channel.id}`).toBe(
          FLIGHT.recorder.series[channel.id]![i]!,
        );
      });
    }
  });

  it('has a header for every column and a column for every channel', () => {
    expect(CSV_COLUMNS.length).toBe(CHANNELS.length + 1);
    expect(new Set(CSV_COLUMNS).size).toBe(CSV_COLUMNS.length);
  });

  it('ends with a newline, and an empty recording is a header alone', () => {
    expect(toCsv(FLIGHT.recorder).endsWith('\n')).toBe(true);
    expect(toCsv(createRecorder())).toBe(`${CSV_COLUMNS.join(',')}\n`);
  });

  it('names the file after the flight rather than the wall clock', () => {
    expect(csvFileName('launch-pad', 90)).toBe('starship-launch-pad-90.0s.csv');
    // Anything a scenario id could carry that a file system would rather not.
    expect(csvFileName('Custom Flight!', 12.34)).toBe('starship-custom-flight--12.3s.csv');
  });
});

describe('the previous flight, as a ghost', () => {
  /** A shorter flight, to make the "ends before this one" case real. */
  function shortFlight() {
    const recorder = createRecorder();
    let s = createScenarioState(getScenario('launch-pad')!);
    cmd.toggleAutoTakeOff(s);
    for (let i = 0; i < 30 * 120; i++) {
      s = step(s, DT);
      recorder.sample(s);
    }
    return recorder;
  }

  const PREVIOUS = shortFlight();

  it('is one array per channel, aligned to THIS flight’s x axis', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const ghost = ghostSeries(speed, FLIGHT.recorder, PREVIOUS)!;
    expect(ghost).not.toBeNull();
    expect(ghost.length).toBe(speed.channels.length);
    for (const series of ghost) expect(series.length).toBe(FLIGHT.recorder.time.length);
  });

  it('and reads the previous flight’s own sample at each of those times', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const ghost = ghostSeries(speed, FLIGHT.recorder, PREVIOUS)!;
    const last = PREVIOUS.time[PREVIOUS.time.length - 1]!;
    // Inside the ghost's own span only: past it the answer is a gap, which the
    // next test is about. Index 900 is 37.5 s and the ghost ends at 30 — the
    // first version of this test compared against a clamped lookup there and
    // asserted the ghost should keep flying after it had landed.
    // Derived from the ghost's own span rather than guessed: the previous
    // flight's recording ends at 28.8 s, not 30, because `shouldSample` does
    // not record a vehicle sitting on the pad.
    const inside = FLIGHT.recorder.time.filter((t) => t <= last).length;
    expect(inside).toBeGreaterThan(100);
    let checked = 0;
    for (const i of [0, 5, 100, inside - 1]) {
      const t = FLIGHT.recorder.time[i]!;
      expect(t, 'the sampled indices are inside the ghost').toBeLessThanOrEqual(last);
      const index = sampleAt(PREVIOUS.time, t);
      speed.channels.forEach((id, c) => {
        expect(ghost[c]![i], `${id} at ${t}`).toBe(PREVIOUS.series[id]![index]!);
      });
      checked += 1;
    }
    expect(checked).toBe(4);
  });

  /*
    A GAP, NOT A ZERO, past the end of the previous flight. The ghost is a
    thirty-second launch under a ninety-second one; flat-lining it at zero for
    the last minute would draw a vehicle that stopped, which is a different
    flight from the one being compared against.
  */
  it('and stops where the previous flight stopped', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    const ghost = ghostSeries(speed, FLIGHT.recorder, PREVIOUS)!;
    const last = PREVIOUS.time[PREVIOUS.time.length - 1]!;

    const past = FLIGHT.recorder.time.findIndex((t) => t > last);
    expect(past, 'this flight outlasts the ghost').toBeGreaterThan(0);
    for (const series of ghost) {
      expect(series[past - 1]).not.toBeNull();
      expect(series[past]).toBeNull();
      expect(series[series.length - 1]).toBeNull();
    }
  });

  it('is refused on the fly-path plot, where downrange is not monotonic', () => {
    const path = PLOTS.find((p) => p.id === 'flyPath')!;
    expect(ghostSeries(path, FLIGHT.recorder, PREVIOUS)).toBeNull();
  });

  it('and there is no ghost before there is a previous flight', () => {
    const speed = PLOTS.find((p) => p.id === 'motionSpeed')!;
    expect(ghostSeries(speed, FLIGHT.recorder, createRecorder())).toBeNull();
  });
});
