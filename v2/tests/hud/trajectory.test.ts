/**
 * M7.1: the trajectory map's maths and its drawing.
 *
 * Two claims, and the second is the one worth the machinery.
 *
 *   THE PROJECTION IS TOTAL. A map that auto-ranges over four orders of
 *   magnitude — a 200 m hop and a 2000 km re-entry on the same instrument —
 *   has a division in it, and a vehicle sitting on the pad makes both spans
 *   zero. `MIN_SPAN_*` is the answer, and this is what checks it is the answer
 *   everywhere rather than only where it was first noticed.
 *
 *   IT SURVIVES EVERY REAL FLIGHT. The seven goldens are replayed through the
 *   actual draw, against a recording stub, and every coordinate it emits is
 *   asserted finite and on the canvas. That is possible only because
 *   `trajectory-draw.ts` takes a MINIMAL CONTEXT INTERFACE rather than a real
 *   `CanvasRenderingContext2D` — the same trick the HUD binders use with
 *   `TextTarget`, and the reason drawing code in this project is testable at
 *   all.
 *
 * Neither test touches `core/`. The map reads SimState; it never writes one.
 */
import { describe, expect, it } from 'vitest';
import {
  computeExtent,
  createExtent,
  decimateTrail,
  formatSpan,
  MARGIN,
  MIN_SPAN_X,
  MIN_SPAN_Y,
  niceSpan,
  projectX,
  projectY,
  TRAIL_MAX_POINTS,
  type MapExtent,
} from '$hud/trajectory';
import {
  createMapRenderer,
  fitLength,
  MAP_REDRAW_HZ,
  type MapContext,
} from '$hud/trajectory-draw';
import { step } from '$core/step';
import * as C from '$core/constants';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import { createScenarioState, getScenario } from '$core/scenarios';
import type { SimState } from '$core/state';

/** An extent built from a bare vehicle position, which is the common case. */
function extentFor(x: number, y: number, trail: ReadonlyArray<readonly [number, number]> = []) {
  const tx = new Float32Array(TRAIL_MAX_POINTS);
  const ty = new Float32Array(TRAIL_MAX_POINTS);
  trail.forEach(([px, py], i) => {
    tx[i] = px;
    ty[i] = py;
  });
  const out = createExtent();
  computeExtent(x, y, tx, ty, trail.length, out);
  return out;
}

describe('niceSpan', () => {
  it('snaps up to 1, 2 or 5 times a power of ten', () => {
    expect(niceSpan(1)).toBe(1);
    expect(niceSpan(1.5)).toBe(2);
    expect(niceSpan(3)).toBe(5);
    expect(niceSpan(7)).toBe(10);
    expect(niceSpan(1_234)).toBe(2_000);
    expect(niceSpan(640_000)).toBe(1_000_000);
  });

  it('never returns less than what it was given', () => {
    // The whole point: an extent that came back smaller than its content would
    // put the vehicle off its own map.
    for (let v = 1; v < 1e7; v *= 1.37) expect(niceSpan(v)).toBeGreaterThanOrEqual(v);
  });

  it('answers something usable for the values that are not numbers', () => {
    expect(niceSpan(0)).toBe(1);
    expect(niceSpan(-5)).toBe(1);
    expect(niceSpan(NaN)).toBe(1);
    expect(niceSpan(Infinity)).toBe(1);
  });
});

describe('computeExtent', () => {
  it('holds a floor open for a vehicle standing still on the pad', () => {
    // THE DEGENERATE CASE. Vehicle at the site, on the ground, nothing flown:
    // the content has zero extent in both axes and a projection that divided by
    // it would produce NaN for every point on the map.
    const extent = extentFor(0, 0);
    expect(extent.maxX - extent.minX).toBe(MIN_SPAN_X);
    expect(extent.maxY - extent.minY).toBe(MIN_SPAN_Y);
    expect(projectX(extent, 0, 280)).toBe(140);
    expect(projectY(extent, 0, 100)).toBe(100);
  });

  it('pins the ground to the bottom edge, never above it', () => {
    // A profile with sky under it would be nonsense, and it means altitude is
    // always read from the same baseline whatever the map is showing.
    for (const altitude of [0, 500, 80_000, 200_000]) {
      const extent = extentFor(0, altitude);
      expect(extent.minY).toBe(0);
      expect(projectY(extent, 0, 120)).toBe(120);
    }
  });

  it('always includes the landing site, however far downrange the vehicle is', () => {
    const extent = extentFor(1_980_000, 80_000);
    expect(extent.minX).toBeLessThanOrEqual(0);
    expect(extent.maxX).toBeGreaterThanOrEqual(1_980_000);
  });

  it('leaves the content margin it promises', () => {
    // Content occupies at most 1/(1+MARGIN) of the span, and niceSpan only ever
    // rounds that up — so the vehicle can never touch the edge of its own map.
    const extent = extentFor(1_000_000, 100_000);
    const spanX = extent.maxX - extent.minX;
    expect((1_000_000 - 0) / spanX).toBeLessThanOrEqual(1 / (1 + MARGIN));
    expect(100_000 / extent.maxY).toBeLessThanOrEqual(1 / (1 + MARGIN));
  });

  it('grows to cover the trail, not just the vehicle', () => {
    // A boostback flies out and comes home: the vehicle is near the site again
    // but the map has to still show where it has been.
    const extent = extentFor(1_000, 500, [
      [0, 0],
      [60_000, 40_000],
      [30_000, 20_000],
    ]);
    expect(extent.maxX).toBeGreaterThanOrEqual(60_000);
    expect(extent.maxY).toBeGreaterThanOrEqual(40_000);
  });

  it('takes a NaN vehicle position without producing a NaN map', () => {
    const extent = extentFor(NaN, NaN);
    for (const v of [extent.minX, extent.maxX, extent.minY, extent.maxY]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('handles a vehicle downrange in the negative direction', () => {
    // RTLS overshoots past the site; downrange is signed and the map has to be.
    const extent = extentFor(-40_000, 10_000);
    expect(extent.minX).toBeLessThanOrEqual(-40_000);
    expect(extent.maxX).toBeGreaterThanOrEqual(0);
  });
});

describe('the two extreme ranges land on the same instrument', () => {
  /** A 200 m hop and a 2000 km re-entry, projected into the same 280x100 box. */
  const WIDTH = 280;
  const HEIGHT = 100;

  const inBox = (extent: MapExtent, x: number, y: number) => {
    const px = projectX(extent, x, WIDTH);
    const py = projectY(extent, y, HEIGHT);
    expect(Number.isFinite(px) && Number.isFinite(py), `${x},${y}`).toBe(true);
    expect(px).toBeGreaterThanOrEqual(0);
    expect(px).toBeLessThanOrEqual(WIDTH);
    expect(py).toBeGreaterThanOrEqual(0);
    expect(py).toBeLessThanOrEqual(HEIGHT);
  };

  it('draws a 200 m hop', () => {
    const extent = extentFor(30, 200, [
      [0, 0],
      [10, 120],
      [25, 200],
    ]);
    inBox(extent, 0, 0);
    inBox(extent, 30, 200);
    // A hop is smaller than the floor, so the floor is what it gets.
    expect(extent.maxY).toBe(MIN_SPAN_Y);
  });

  it('draws a 2000 km re-entry', () => {
    const extent = extentFor(1_980_000, 80_000, [
      [1_980_000, 80_000],
      [900_000, 60_000],
    ]);
    inBox(extent, 0, 0);
    inBox(extent, 1_980_000, 80_000);
    inBox(extent, C.ENTRY_INTERFACE_ALTITUDE * 0, C.ENTRY_INTERFACE_ALTITUDE);
  });
});

describe('decimateTrail', () => {
  const outX = new Float32Array(TRAIL_MAX_POINTS);
  const outY = new Float32Array(TRAIL_MAX_POINTS);

  it('copies a short trail through unchanged', () => {
    const n = decimateTrail([1, 2, 3], [4, 5, 6], outX, outY);
    expect(n).toBe(3);
    expect([outX[0], outX[1], outX[2]]).toEqual([1, 2, 3]);
    expect([outY[0], outY[1], outY[2]]).toEqual([4, 5, 6]);
  });

  it('caps a long one and ENDS WHERE THE FLIGHT IS', () => {
    // The last point is computed exactly rather than by stride, because a trail
    // that stopped one stride short would visibly lag the marker it ends at —
    // and at 300 points over a 20 000-sample flight, one stride is 66 samples.
    const source = Array.from({ length: 20_000 }, (_, i) => i);
    const n = decimateTrail(source, source, outX, outY);
    expect(n).toBe(TRAIL_MAX_POINTS);
    expect(outX[0]).toBe(0);
    expect(outX[n - 1]).toBe(19_999);
    expect(outY[n - 1]).toBe(19_999);
  });

  it('is monotonic in the index it samples', () => {
    const source = Array.from({ length: 5_000 }, (_, i) => i);
    const n = decimateTrail(source, source, outX, outY);
    for (let i = 1; i < n; i++) expect(outX[i]!).toBeGreaterThan(outX[i - 1]!);
  });

  it('returns nothing for an empty recorder', () => {
    expect(decimateTrail([], [], outX, outY)).toBe(0);
  });

  it('reads no further than the shorter of the two channels', () => {
    // The recorder pushes both per sample, so they cannot disagree — but the
    // map takes them as two arrays and a reader of this code should not have to
    // prove that invariant to know the loop is safe.
    expect(decimateTrail([1, 2, 3], [1], outX, outY)).toBe(1);
  });
});

describe('formatSpan', () => {
  it('switches unit where the digits stop being comparable', () => {
    expect(formatSpan(0)).toBe('0 M');
    expect(formatSpan(940)).toBe('940 M');
    expect(formatSpan(1_000)).toBe('1.0 KM');
    expect(formatSpan(9_940)).toBe('9.9 KM');
    expect(formatSpan(20_000)).toBe('20 KM');
    expect(formatSpan(1_980_000)).toBe('1980 KM');
  });
});

describe('fitLength', () => {
  it('leaves a vector that already fits alone', () => {
    expect(fitLength(50, 50, 1, 0, 14, 280, 100)).toBe(14);
  });

  it('shortens one that would leave the canvas', () => {
    expect(fitLength(275, 50, 1, 0, 14, 280, 100)).toBe(5);
    expect(fitLength(50, 100, 0, 1, 14, 280, 100)).toBe(0);
  });

  it('keeps the direction exact while it does so', () => {
    // Clamping the LENGTH rather than the endpoint is the point: the arrow is
    // claiming a direction and nothing else.
    const length = fitLength(279, 50, 1, 0, 14, 280, 100);
    expect(length).toBeCloseTo(1, 10);
  });
});

/* ------------------------------------------------------------------------ */

/**
 * A recording 2D context.
 *
 * Every coordinate that reaches it is kept, which is what turns "no NaN and
 * nothing off-canvas" from a hope into an assertion.
 */
interface Recording extends MapContext {
  points: number[];
  texts: string[];
  clears: number;
  reset(): void;
}

function recordingContext(width: number, height: number): Recording {
  const points: number[] = [];
  const texts: string[] = [];
  return {
    canvas: { width, height },
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    globalAlpha: 1,
    points,
    texts,
    clears: 0,
    reset() {
      points.length = 0;
      texts.length = 0;
      this.clears = 0;
    },
    clearRect() {
      this.clears += 1;
    },
    beginPath() {},
    moveTo(x, y) {
      points.push(x, y);
    },
    lineTo(x, y) {
      points.push(x, y);
    },
    arc(x, y) {
      points.push(x, y);
    },
    stroke() {},
    fill() {},
    fillText(text, x, y) {
      texts.push(text);
      points.push(x, y);
    },
    setLineDash() {},
  };
}

describe('the renderer', () => {
  const trail = { downRange: [] as number[], altitude: [] as number[] };
  const padded = () => createScenarioState(getScenario('launch-pad')!);

  it('redraws at MAP_REDRAW_HZ, not at frame rate', () => {
    const context = recordingContext(280, 100);
    const renderer = createMapRenderer({ context, trail });
    const state = padded();

    // 120 frames of 1/120 s is one second of 120 fps. The first update draws
    // immediately (the elapsed counter starts at Infinity, so a map is never
    // blank while it waits for its first tenth of a second), and every twelfth
    // frame after that: 1, 13, 25 … 109. Ten draws for one second at 10 Hz.
    let drew = 0;
    for (let i = 0; i < 120; i++) if (renderer.update(state, 1 / 120)) drew += 1;
    expect(drew).toBe(MAP_REDRAW_HZ);
    expect(renderer.drawCount).toBe(drew);
  });

  it('draws a pad-bound vehicle without a NaN in sight', () => {
    const context = recordingContext(280, 100);
    const renderer = createMapRenderer({ context, trail });
    renderer.redraw(padded());
    expect(context.points.length).toBeGreaterThan(0);
    expect(context.points.every(Number.isFinite)).toBe(true);
  });

  it('draws nothing into a canvas with no pixels', () => {
    // A collapsed panel measures zero, and a resize can be observed before the
    // element has been laid out at all.
    const context = recordingContext(0, 0);
    const renderer = createMapRenderer({ context, trail });
    renderer.redraw(padded());
    expect(context.points).toEqual([]);
    expect(renderer.drawCount).toBe(0);
  });

  it('scales its furniture by the device pixel ratio', () => {
    const context = recordingContext(560, 200);
    const renderer = createMapRenderer({ context, trail, scale: 2 });
    renderer.redraw(padded());
    expect(context.font).toBe('18px "Barlow Condensed", sans-serif');
    // The last thing stroked sets lineWidth; what matters is that nothing is
    // left at a hairline sub-pixel on a 2x display.
    expect(context.lineWidth).toBeGreaterThanOrEqual(2);
  });

  it('shows the entry interface only when it is on the map', () => {
    // On a landing hop, 80 km is off the top and a line pinned to the edge
    // would say nothing. On a re-entry it is the most important line drawn.
    const hop = recordingContext(280, 100);
    const hopRenderer = createMapRenderer({ context: hop, trail });
    hopRenderer.redraw(padded());
    const hopExtent = hopRenderer.extent;
    expect(hopExtent.maxY).toBeLessThan(C.ENTRY_INTERFACE_ALTITUDE);

    const high = recordingContext(280, 100);
    const highTrail = { downRange: [0, 500_000], altitude: [0, 120_000] };
    const highRenderer = createMapRenderer({ context: high, trail: highTrail });
    const state = createScenarioState(getScenario('reentry')!);
    highRenderer.redraw(state);
    expect(highRenderer.extent.maxY).toBeGreaterThan(C.ENTRY_INTERFACE_ALTITUDE);
  });

  it('allocates nothing per redraw', () => {
    /*
      The M3.7 argument, applied here: there is no portable way to ask "did this
      allocate", but a draw that allocated per call would grow the heap without
      bound over ten thousand of them. The point arrays, the extent and the
      decimation buffers are all created once in `createMapRenderer`.
    */
    const context = recordingContext(280, 100);
    const long = {
      downRange: Array.from({ length: 20_000 }, (_, i) => i * 100),
      altitude: Array.from({ length: 20_000 }, (_, i) => Math.min(i * 10, 80_000)),
    };
    const renderer = createMapRenderer({ context, trail: long });
    const state = padded();

    for (let i = 0; i < 50; i++) renderer.redraw(state);
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 2_000; i++) {
      context.reset();
      renderer.redraw(state);
    }
    const grew = process.memoryUsage().heapUsed - before;
    // A generous bound: this is looking for unbounded growth, not for zero.
    expect(grew, `heap grew ${(grew / 1024).toFixed(0)} kB over 2000 redraws`).toBeLessThan(
      8 * 1024 * 1024,
    );
  });
});

/* ------------------------------------------------------------------------ */

/**
 * The seven goldens, flown through the map.
 *
 * The acceptance line asks for exactly this: replayed over all seven without
 * producing a NaN or an off-canvas coordinate. It runs the real simulation
 * rather than reading the fixture files, because the map takes a whole SimState
 * — and it feeds the trail the way the application does, from the recorder's
 * sampling rule, so what is drawn here is what is drawn on screen.
 */
describe('replayed over the seven goldens', () => {
  const WIDTH = 280;
  const HEIGHT = 104;

  it.each(GOLDEN_SPECS.map((s) => [s.id, s] as const))('%s', (id, spec) => {
    const context = recordingContext(WIDTH, HEIGHT);
    const downRange: number[] = [];
    const altitude: number[] = [];
    const renderer = createMapRenderer({ context, trail: { downRange, altitude } });

    let state: SimState = spec.build();
    const worst = { x: 0, y: 0 };
    let draws = 0;

    const check = (s: SimState) => {
      context.reset();
      renderer.redraw(s);
      draws += 1;
      const p = context.points;
      for (let i = 0; i < p.length; i += 2) {
        const x = p[i]!;
        const y = p[i + 1]!;
        expect(Number.isFinite(x) && Number.isFinite(y), `${id}: non-finite coordinate`).toBe(true);
        if (x < -worst.x) worst.x = -x;
        if (x - WIDTH > worst.x) worst.x = x - WIDTH;
        if (y < -worst.y) worst.y = -y;
        if (y - HEIGHT > worst.y) worst.y = y - HEIGHT;
      }
    };

    check(state);
    for (let i = 1; i <= spec.steps; i++) {
      state = step(state, GOLDEN_DT);
      // The application's own sampling rule, from app/recorder.ts — the same
      // trail the player sees rather than a denser one invented for the test.
      if (
        state.world.updatedFrameCount % C.recordTimeInterval === 0 &&
        !state.failures.crashed &&
        !state.failures.inFlightBreakUp &&
        !state.status.onTheGround &&
        !state.status.landed
      ) {
        downRange.push(state.kinematics.downRangeDistance - C.starBaseXPos);
        altitude.push(state.kinematics.altitude);
      }
      // Once a second of simulated time, which is far more often than the map
      // itself redraws and cheap enough to run over all seven flights.
      if (i % 120 === 0) check(state);
    }

    // One draw per simulated second, plus the initial state. Asserted so that a
    // replay which silently stopped drawing would fail here rather than pass
    // vacuously with a clean bounds record.
    expect(draws).toBe(1 + Math.floor(spec.steps / 120));
    expect(worst.x, `${id}: worst horizontal overshoot ${worst.x.toFixed(3)} px`).toBe(0);
    expect(worst.y, `${id}: worst vertical overshoot ${worst.y.toFixed(3)} px`).toBe(0);
  });
});
