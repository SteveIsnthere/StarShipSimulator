/**
 * M8.2: the engine voice, rendered and measured.
 *
 * THIS IS THE TEST THE MILESTONE NEEDED. SOUND-PLAN § 6 sets the problem out:
 * headless browsers make no noise and no CI checks a mix, so "the engine is
 * louder at 100% than at 40%" has to become an assertion about a buffer's RMS
 * rather than an opinion. `OfflineAudioContext` renders deterministically and
 * off the clock, which makes it possible.
 *
 * It is a REAL Web Audio implementation, not a stub — the same biquad, the same
 * `setTargetAtTime` ramp. A stub would only prove that the numbers I wrote are
 * the numbers I wrote; this proves the graph built from them makes the sound
 * those numbers describe.
 *
 * Which is also the limit, and worth stating: it proves the level and the
 * spectrum move the right way. It says nothing about whether it sounds good.
 * That is a listening decision and § 6 says so rather than pretending otherwise.
 */
import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import { createMixer, createNoiseBuffer, type AudioGraphContext } from '$audio/graph';
import { createEngineVoice } from '$audio/voices';
import {
  createAudioParams,
  engineAirGain,
  engineFilterHz,
  engineLevel,
  ENGINE_VACUUM_FLOOR,
  SEA_LEVEL_PA,
} from '$audio/params';

const SAMPLE_RATE = 24_000;
const SECONDS = 0.5;

/** Root mean square of a rendered buffer — the standard measure of "how loud". */
function rms(buffer: { getChannelData(channel: number): Float32Array }): number {
  const data = buffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
  return Math.sqrt(sum / data.length);
}

/**
 * Render the engine voice holding one set of parameters.
 *
 * The parameters are pushed once and held, so what is measured is the steady
 * state rather than the smoothing ramp — the ramp is 40 ms and the render is
 * 500, but starting the measurement after the ramp would be measuring a
 * different thing at each level.
 */
async function renderEngine(lit: number, throttle: number, airPressure = SEA_LEVEL_PA) {
  const context = new OfflineAudioContext(1, SAMPLE_RATE * SECONDS, SAMPLE_RATE);
  const graph = context as unknown as AudioGraphContext;
  const mixer = createMixer(graph);
  const noise = createNoiseBuffer(graph, 0x5eed1234);
  const voice = createEngineVoice({ context: graph, mixer, noise });

  const params = createAudioParams();
  params.engine = engineLevel(lit, throttle);
  params.engineHz = engineFilterHz(throttle);
  params.engineAir = engineAirGain(airPressure);
  voice.update(params);

  return rms(await context.startRendering());
}

describe('the engine is louder at 100% than at 40% — measured, not asserted', () => {
  it('rises with throttle', async () => {
    const low = await renderEngine(3, 40);
    const high = await renderEngine(3, 100);
    // Reported, because the size of the difference is the thing a mix pass
    // will want to argue with.
    console.log(`three engines: 40% RMS ${low.toFixed(5)} · 100% RMS ${high.toFixed(5)}`);
    expect(high).toBeGreaterThan(low);
    // And by an audible margin rather than a rounding error.
    expect(high / low).toBeGreaterThan(1.15);
  });

  it('rises with engine count', async () => {
    const one = await renderEngine(1, 100);
    const three = await renderEngine(3, 100);
    console.log(`at 100%: one engine RMS ${one.toFixed(5)} · three RMS ${three.toFixed(5)}`);
    expect(three).toBeGreaterThan(one);
    expect(three / one).toBeGreaterThan(1.4);
  });

  it('is silent with nothing lit', async () => {
    // Not "quiet". A rendered buffer with no engines must be zero, or a
    // shutdown would leave a hum behind it.
    const none = await renderEngine(0, 100);
    expect(none).toBeLessThan(1e-6);
  });

  it('distinguishes three engines at 40% from two at 100%', async () => {
    /*
      SOUND-PLAN § 1's own example, rendered. These two produce nearly the same
      thrust number, and the whole argument for sound as an instrument is that
      they must not produce the same noise.
    */
    const threeLow = await renderEngine(3, 40);
    const twoHigh = await renderEngine(2, 100);
    console.log(`three at 40% RMS ${threeLow.toFixed(5)} · two at 100% RMS ${twoHigh.toFixed(5)}`);
    const ratio = Math.max(threeLow, twoHigh) / Math.min(threeLow, twoHigh);
    expect(ratio, 'the two are indistinguishable by level').toBeGreaterThan(1.05);
  });
});

describe('the air fade, rendered', () => {
  it('falls toward its floor in vacuum without reaching silence', async () => {
    // The milestone's own claim, measured. M8.3 pins the curve across altitude;
    // this checks the graph actually carries it.
    const sea = await renderEngine(3, 100, SEA_LEVEL_PA);
    const vacuum = await renderEngine(3, 100, 0);
    console.log(
      `sea level RMS ${sea.toFixed(5)} · vacuum RMS ${vacuum.toFixed(5)} · ` +
        `ratio ${(vacuum / sea).toFixed(4)} against a floor of ${ENGINE_VACUUM_FLOOR}`,
    );
    expect(vacuum).toBeGreaterThan(0);

    /*
      The ratio IS the floor, to three places — and it is worth asserting that
      tightly rather than loosely, because a loose bound is what let a real bug
      through the first time.

      The first version of the voice set the sub-oscillator's gain to
      `level * 0.33` and then fed it into a gain that applies `level` again, so
      the sub scaled as the SQUARE of the level. The noise path faded linearly
      underneath it and this ratio came out at 0.106 instead of 0.22. Nobody
      would have heard that as a bug — a throttle-down would simply have lost
      its bottom end faster than intended, which sounds like a choice. The
      arithmetic is what gave it away.
    */
    expect(vacuum / sea).toBeCloseTo(ENGINE_VACUUM_FLOOR, 3);
  });
});

describe('the voice writes only what moved', () => {
  it('writes on the first update and nothing on a repeat', () => {
    /*
      The same diff-before-write law as every binder in `hud/`, with a sharper
      reason here: an AudioParam set to the value it already holds is a wasted
      call, and a setTargetAtTime per parameter per frame at 120 Hz is how a Web
      Audio graph starts stuttering (§ 6).
    */
    const context = new OfflineAudioContext(1, 128, SAMPLE_RATE) as unknown as AudioGraphContext;
    const mixer = createMixer(context);
    const voice = createEngineVoice({
      context,
      mixer,
      noise: createNoiseBuffer(context),
    });

    const params = createAudioParams();
    params.engine = engineLevel(3, 60);
    params.engineHz = engineFilterHz(60);

    voice.update(params);
    expect(voice.lastWriteCount).toBeGreaterThan(0);

    voice.update(params);
    expect(voice.lastWriteCount).toBe(0);

    // And it writes again the moment something actually changes.
    params.engine = engineLevel(3, 61);
    voice.update(params);
    expect(voice.lastWriteCount).toBeGreaterThan(0);
  });

  it('adds no nodes however many frames run', () => {
    // The audio version of the M3.7 leak test, at the voice level.
    const context = new OfflineAudioContext(1, 128, SAMPLE_RATE) as unknown as AudioGraphContext;
    const mixer = createMixer(context);
    const voice = createEngineVoice({ context, mixer, noise: createNoiseBuffer(context) });
    const params = createAudioParams();

    const before = voice.nodeCount;
    for (let i = 0; i < 5_000; i++) {
      params.engine = engineLevel(3, i % 101);
      params.engineHz = engineFilterHz(i % 101);
      voice.update(params);
    }
    expect(voice.nodeCount).toBe(before);
    // It really was writing, or the leak claim is vacuous.
    expect(voice.totalWrites).toBeGreaterThan(1_000);
  });
});
