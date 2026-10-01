// @vitest-environment jsdom
/**
 * The black box's lazy plot module against the real uPlot and charts.ts.
 *
 * jsdom has no canvas, so the 2D context is a recording stub: this cannot see
 * a drawn line, but it runs every option, hook and legend uPlot really builds —
 * which is where the human labels and the resting cursor live.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PLOTS, createRecorder, type Recorder } from '$app/recorder';
import { DT } from '$app/loop';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import { createTimeline } from '$hud/timeline';
import { displayRecording } from '$ui/shell/BlackBox/channels';
import { drawPlots, type Plots } from '$ui/shell/BlackBox/plots';

function flown(seconds: number) {
  const recorder = createRecorder();
  const timeline = createTimeline();
  let s = createScenarioState(getScenario('launch-pad')!);
  cmd.toggleAutoTakeOff(s);
  for (let i = 0; i < seconds / DT; i++) {
    s = step(s, DT);
    recorder.sample(s);
    timeline.observe(s);
  }
  return { recorder, timeline };
}

beforeAll(() => {
  // A context whose every method is a no-op, and text has a width.
  const context = new Proxy(
    {},
    {
      get: (target: Record<string | symbol, unknown>, key) => {
        if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
        if (!(key in target)) target[key] = () => undefined;
        return target[key];
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => context) as never;
  // uPlot builds its line paths as Path2D, which jsdom does not have.
  vi.stubGlobal(
    'Path2D',
    class {
      moveTo() {}
      lineTo() {}
      rect() {}
      arc() {}
      bezierCurveTo() {}
      closePath() {}
      addPath() {}
    },
  );
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as never;
});

let plots: Plots | undefined;
afterEach(() => {
  plots?.destroy();
  plots = undefined;
  document.body.replaceChildren();
});

async function draw(recorder: Recorder, previous?: Recorder) {
  const host = document.createElement('div');
  host.setAttribute('data-blackbox', '');
  document.body.appendChild(host);
  const { timeline } = flown(0);
  plots = await drawPlots(host, {
    recorder: displayRecording(recorder),
    ...(previous ? { previous: displayRecording(previous) } : {}),
    events: timeline.events,
    onCursor: () => undefined,
  });
  // uPlot commits its first draw (and the legend) on a microtask.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return host;
}

describe('the plots', () => {
  const FLIGHT = flown(20).recorder;
  const PREVIOUS = flown(8).recorder;

  it('draws one cell per plot, keyed by the recorder ids', async () => {
    const host = await draw(FLIGHT);
    expect([...host.querySelectorAll<HTMLElement>('.cell')].map((c) => c.dataset['plot'])).toEqual(
      PLOTS.map((p) => p.id),
    );
    expect(host.querySelectorAll('.cell .uplot')).toHaveLength(PLOTS.length);
  });

  it('titles and labels them in a player’s words', async () => {
    const host = await draw(FLIGHT);
    const titles = [...host.querySelectorAll('.u-title')].map((t) => t.textContent);
    expect(titles).toContain('Pitch and flight path (°)');
    expect(titles).toContain('Propellant (t)');
    expect(titles).not.toContain('Propellent in tons');
    const speed = host.querySelector('[data-plot="motionSpeed"] .u-legend')!.textContent!;
    expect(speed).toContain('Vertical speed');
    expect(speed).not.toContain('speedY');
  });

  it('rests every legend on the end of the flight, so none reads --', async () => {
    const host = await draw(FLIGHT);
    const values = [...host.querySelectorAll('.u-legend .u-value')].map((v) => v.textContent);
    expect(values.length).toBeGreaterThan(PLOTS.length);
    expect(values.filter((v) => v === '--' || v === '')).toEqual([]);
    const altitude = host.querySelector('[data-plot="altitude"] .u-legend')!.textContent!;
    expect(altitude).toContain(`T+${FLIGHT.time.at(-1)!.toFixed(1)} s`);
  });

  it('labels the previous flight, and its end, rather than printing --', async () => {
    const host = await draw(FLIGHT, PREVIOUS);
    const speed = host.querySelector('[data-plot="motionSpeed"] .u-legend')!.textContent!;
    expect(speed).toContain('Speed, previous flight');
    // The ghost is shorter than this flight: at the end it has ended.
    expect(speed).toContain('ended');
    expect(() => plots!.setGhost(false)).not.toThrow();
  });
});
