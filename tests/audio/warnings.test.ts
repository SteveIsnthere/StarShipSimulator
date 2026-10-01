/**
 * M8.5: the warning tone, and the mobile lifecycle.
 *
 * THE THRESHOLD IS THE HUD'S, and that is the only interesting thing about the
 * warning. Two copies of 0.8 would drift the first time either was tuned, and
 * the failure mode is an ear and an eye disagreeing about whether the vehicle
 * is in trouble — worse than either signal alone. So `warningState` calls
 * `limitState` from `hud/metrics.ts` rather than reimplementing it, and this
 * file asserts they cannot come apart.
 */
import { describe, expect, it } from 'vitest';
import {
  createAudioParams,
  readParams,
  warningState,
  WARNING_HZ,
  WARNING_LEVEL,
  WARNING_PULSE_HZ,
} from '$audio/params';
import { CAUTION_FRACTION, limitState } from '$hud/metrics';
import { createAudioEngine } from '$audio/engine';
import * as C from '$core/constants';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import type { SimState } from '$core/state';

const state = () => createScenarioState(getScenario('reentry')!);

describe('ear and eye read the same thresholds', () => {
  it('uses the HUD limit states verbatim', () => {
    const s = state();
    for (const fraction of [0, 0.5, 0.79, CAUTION_FRACTION, 0.9, 1, 1.5]) {
      s.forces.thermalPower = C.heatLimit * fraction;
      s.forces.dynamicPressure = 0;
      expect(warningState(s), `heat at ${fraction}`).toBe(limitState(s.forces.thermalPower, C.heatLimit));
    }
  });

  it('takes the WORSE of heat and Q, because either can end the flight', () => {
    const s = state();
    s.forces.thermalPower = C.heatLimit * 0.9; // caution
    s.forces.dynamicPressure = C.dynamicPressureLimit * 1.2; // alarm
    expect(warningState(s)).toBe(2);
    s.forces.dynamicPressure = 0;
    expect(warningState(s)).toBe(1);
  });

  it('is silent at nominal, by construction rather than by being quiet', () => {
    const s = state();
    s.forces.thermalPower = 0;
    s.forces.dynamicPressure = 0;
    expect(warningState(s)).toBe(0);
    expect(WARNING_LEVEL[0]).toBe(0);
  });

  it('a caution and an alarm are different sounds, not the same one louder', () => {
    // "Getting worse" and "out of time" are different messages.
    expect(WARNING_HZ[2]).toBeGreaterThan(WARNING_HZ[1]!);
    expect(WARNING_LEVEL[2]).toBeGreaterThan(WARNING_LEVEL[1]!);
    // And the alarm pulses roughly twice as fast — the one piece of cockpit
    // convention worth borrowing wholesale, because anyone who has heard one
    // already knows what it means.
    expect(WARNING_PULSE_HZ[2] / WARNING_PULSE_HZ[1]!).toBeGreaterThan(1.8);
  });

  it('stays quiet through all seven, and reports how much margin they had', () => {
    /*
      A warning that fired on a normal landing would be trained out within a
      week, which is the failure mode of every alarm anyone has ever ignored.

      All seven come out nominal, and the MARGINS are why that is a result
      rather than a vacuum: re-entry reaches 0.63 of the heat limit and RTLS
      0.57 of the Q limit, so these flights get genuinely warm and genuinely
      fast and still stay the right side of 0.8. They are well-flown autopilot
      flights; the tone is for the other kind, and the test below is what proves
      there is a tone at all.
    */
    const params = createAudioParams();
    const report: string[] = [];
    for (const spec of GOLDEN_SPECS) {
      let s: SimState = spec.build();
      let worst = 0;
      let heat = 0;
      let q = 0;
      for (let i = 0; i < spec.steps; i++) {
        s = step(s, GOLDEN_DT);
        readParams(s, params);
        worst = Math.max(worst, params.warning);
        heat = Math.max(heat, s.forces.thermalPower / C.heatLimit);
        q = Math.max(q, s.forces.dynamicPressure / C.dynamicPressureLimit);
      }
      report.push(
        `${spec.id}: ${['nominal', 'caution', 'alarm'][worst]} ` +
          `(heat ${heat.toFixed(2)}, Q ${q.toFixed(2)} of limit)`,
      );
      expect(worst, `${spec.id} raised a warning on a well-flown flight`).toBe(0);
    }
    console.log(report.join('\n'));
  });

  it('DOES fire when a flight is actually in trouble', () => {
    /*
      The other half, and M8.3 taught why it is not optional: a signal that is
      always silent passes "stays quiet" trivially. The seven goldens never
      cross 0.8 of either limit — which is the correct behaviour and also means
      they cannot, on their own, prove the tone exists.

      So this drives a real flight past the threshold through the WHOLE
      pipeline — `readParams`, not `warningState` directly — because the thing
      that could break is the wiring, not the arithmetic.
    */
    const params = createAudioParams();
    let s: SimState = createScenarioState(getScenario('reentry')!);
    for (let i = 0; i < 600; i++) s = step(s, GOLDEN_DT);

    readParams(s, params);
    expect(params.warning, 'a normal re-entry should be nominal here').toBe(0);

    s.forces.thermalPower = C.heatLimit * (CAUTION_FRACTION + 0.05);
    readParams(s, params);
    expect(params.warning, 'a hot shield should raise a caution').toBe(1);

    s.forces.thermalPower = C.heatLimit * 1.05;
    readParams(s, params);
    expect(params.warning, 'past the limit should be an alarm').toBe(2);

    // And Q alone gets there too, on its own threshold.
    s.forces.thermalPower = 0;
    s.forces.dynamicPressure = C.dynamicPressureLimit * 0.85;
    readParams(s, params);
    expect(params.warning, 'too fast too low should raise a caution').toBe(1);
  });
});

/* ------------------------------------------------------------------------ */

function fakeContext() {
  const param = () => ({
    value: 0,
    setTargetAtTime(v: number) {
      this.value = v;
    },
    setValueAtTime(v: number) {
      this.value = v;
    },
    linearRampToValueAtTime(v: number) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    },
  });
  const node = () => ({
    gain: param(),
    frequency: param(),
    Q: param(),
    type: '',
    buffer: null as unknown,
    loop: false,
    onended: null as (() => void) | null,
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
  });
  const ctx = {
    sampleRate: 48_000,
    currentTime: 0,
    state: 'suspended',
    destination: node(),
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createOscillator: node,
    createBuffer: (channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      numberOfChannels: channels,
      getChannelData: () => new Float32Array(length),
    }),
    resume: async () => void (ctx.state = 'running'),
    suspend: async () => void (ctx.state = 'suspended'),
    close: async () => void (ctx.state = 'closed'),
  };
  return ctx;
}

const storage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
};

describe('the mobile lifecycle', () => {
  it('a backgrounded tab suspends, and coming back resumes', async () => {
    // A phone that locks or takes a call must not keep a rocket running in
    // someone's pocket.
    const context = fakeContext();
    const engine = createAudioEngine({ host: { create: () => context as never }, storage: storage() });
    await engine.unlock();
    expect(engine.state).toBe('running');

    await engine.setBackgrounded(true);
    expect(engine.state).toBe('suspended');

    await engine.setBackgrounded(false);
    expect(engine.state).toBe('running');
  });

  it('coming back does NOT override a mute', async () => {
    // The two switches are independent, and the remembered preference wins:
    // returning to a tab must not undo something the player chose.
    const context = fakeContext();
    const engine = createAudioEngine({ host: { create: () => context as never }, storage: storage() });
    await engine.unlock();
    await engine.setMuted(true);
    await engine.setBackgrounded(true);
    await engine.setBackgrounded(false);
    expect(engine.muted).toBe(true);
    expect(engine.state).toBe('suspended');
  });

  it('unmuting in a backgrounded tab starts nothing', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({ host: { create: () => context as never }, storage: storage() });
    await engine.unlock();
    await engine.setBackgrounded(true);
    await engine.setMuted(false);
    expect(engine.state).toBe('suspended');
  });

  it('does no frame work while backgrounded', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({ host: { create: () => context as never }, storage: storage() });
    await engine.unlock();
    await engine.setBackgrounded(true);
    let s: SimState = createScenarioState(getScenario('landing-burn')!);
    for (let i = 0; i < 600; i++) {
      s = step(s, GOLDEN_DT);
      engine.update(s);
    }
    expect(engine.lastWriteCount).toBe(0);
    expect(engine.transientCount).toBe(0);
  });

  it('a gesture while backgrounded builds nothing', async () => {
    // The interruption case: a context that was suspended by the browser comes
    // back suspended, and a stray gesture must not fight that.
    let built = 0;
    const engine = createAudioEngine({
      host: {
        create: () => {
          built += 1;
          return fakeContext() as never;
        },
      },
      storage: storage(),
    });
    await engine.setBackgrounded(true);
    await engine.unlock();
    expect(built).toBe(0);
  });
});
