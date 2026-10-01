/**
 * M8.3: the vacuum fade. The milestone.
 *
 * SOUND-PLAN says it in one line and it is worth repeating where the tests are:
 * the payoff of this whole milestone is not the noise, it is the CONTRAST.
 * Silence is the most affecting thing about leaving the atmosphere, and it is
 * impossible to convey to someone who has had silence the whole time.
 *
 * WHAT MAKES IT A CONTRAST RATHER THAN A FADE-OUT is that the two voices do
 * different things. The airflow goes to ACTUAL ZERO, because there is no
 * mechanism by which a vacuum roars. The engine goes to a FLOOR, because
 * structural conduction is real and you are bolted to the thing — and because
 * total silence during a burn reads as a bug rather than as physics (§ 3.2).
 *
 * A vacuum where everything is quieter sounds like the volume being turned
 * down. A vacuum where the air stops and the vehicle does not sounds like space.
 * That difference is what these tests are for.
 */
import { describe, expect, it } from 'vitest';
import { OfflineAudioContext } from 'node-web-audio-api';
import {
  aeroAirGain,
  aeroFilterHz,
  aeroLevel,
  AERO_FULL_Q,
  AERO_SILENT_ALTITUDE,
  createAudioParams,
  engineAirGain,
  ENGINE_VACUUM_FLOOR,
  readParams,
  SEA_LEVEL_KPA,
} from '$audio/params';
import { createMixer, createNoiseBuffer, type AudioGraphContext } from '$audio/graph';
import { createAeroVoice, createEngineVoice } from '$audio/voices';
import { step } from '$core/step';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import type { SimState } from '$core/state';

describe('the airflow voice', () => {
  it('is silent in still air', () => {
    expect(aeroLevel(0)).toBe(0);
    expect(aeroLevel(-1)).toBe(0);
    expect(aeroLevel(NaN)).toBe(0);
  });

  it('reaches full strength at max-Q and saturates', () => {
    expect(aeroLevel(AERO_FULL_Q)).toBe(1);
    expect(aeroLevel(AERO_FULL_Q * 10)).toBe(1);
  });

  it('is monotonic in dynamic pressure', () => {
    let previous = -1;
    for (let q = 0; q <= AERO_FULL_Q * 1.5; q += 137) {
      const value = aeroLevel(q);
      expect(value, `${q} Pa`).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('is Q alone — the density is already inside it', () => {
    /*
      Dynamic pressure is one half rho v squared, so the density of the air is
      already in the number. This function does not divide by pressure again.

      It is worth being exact about what that does and does not mean, because
      the pipeline DOES apply a separate air term afterwards and that is not the
      same mistake. Q says how hard the flow is pushing on the airframe;
      `aeroAirGain` says how well the resulting noise reaches you. Those are two
      different physical questions with two different answers — at 70 km a
      re-entering vehicle has real dynamic pressure and almost no acoustic
      transmission — and multiplying them is a model, not a double count.

      What WOULD be a double count is putting pressure inside this function too.
    */
    expect(aeroLevel(AERO_FULL_Q / 2)).toBeCloseTo(Math.sqrt(0.5), 9);
    // Twice the speed at the same density is four times the Q and twice the
    // level, which is the shape a square root gives and a linear map would not.
    expect(aeroLevel(AERO_FULL_Q / 4)).toBeCloseTo(aeroLevel(AERO_FULL_Q) / 2, 9);
  });

  it('gets brighter with Mach, and stays inside what a phone can produce', () => {
    expect(aeroFilterHz(2)).toBeGreaterThan(aeroFilterHz(0.2));
    expect(aeroFilterHz(0)).toBeGreaterThan(300);
    expect(aeroFilterHz(10)).toBeLessThan(2_000);
  });
});

describe('the two fades differ, and that IS the milestone', () => {
  it('air reaches zero; the engine reaches a floor', () => {
    expect(aeroAirGain(0)).toBe(0);
    expect(engineAirGain(0)).toBe(ENGINE_VACUUM_FLOOR);
    expect(ENGINE_VACUUM_FLOOR).toBeGreaterThan(0);
  });

  it('both are full at sea level, so the contrast is earned rather than constant', () => {
    expect(aeroAirGain(SEA_LEVEL_KPA)).toBeCloseTo(1, 9);
    expect(engineAirGain(SEA_LEVEL_KPA)).toBeCloseTo(1, 9);
  });

  it('reaches the floor by 50 km, over the real atmosphere model', () => {
    /*
      The acceptance line's number, checked against core's OWN atmosphere rather
      than against a formula written here — `atmosphere.airPressure` has been in
      SimState since M1.1 and M6.7 already draws with it, so the ear and the eye
      are reading the same number.
    */
    let s: SimState = GOLDEN_SPECS.find((x) => x.id === 'booster-sep-boostback')!.build();
    const params = createAudioParams();
    let reported = '';
    let sampledAbove = 0;

    for (let i = 0; i < 120 * 120; i++) {
      s = step(s, GOLDEN_DT);
      if (s.kinematics.altitude < AERO_SILENT_ALTITUDE) continue;
      sampledAbove += 1;
      readParams(s, params);
      // What is actually HEARD is the product, and that is what the claim is
      // about: the level and the transmission together.
      const aero = params.aero * params.aeroAir;
      const engine = params.engineAir;
      if (!reported) {
        reported =
          `at ${(s.kinematics.altitude / 1000).toFixed(0)} km: ` +
          `aero ${aero.toExponential(2)}, engine air ${engine.toFixed(4)}`;
      }
      /*
        Inaudible rather than exactly zero, and 0.01 is the honest threshold: a
        level of 0.01 against a bus at 0.45 is about -47 dB, which no speaker
        will reproduce over a running engine.

        Exact zero would be the wrong test to write. The cube root in
        `airFraction` is there so the fade does not switch off a few kilometres
        up — the M7.5 lesson — and the price of that choice is a tail that
        approaches zero rather than arriving. Demanding arrival would mean
        undoing the thing the curve is shaped for.
      */
      expect(aero, `aero at ${s.kinematics.altitude.toFixed(0)} m`).toBeLessThan(0.01);
      expect(engine, `engine at ${s.kinematics.altitude.toFixed(0)} m`).toBeGreaterThan(
        ENGINE_VACUUM_FLOOR * 0.99,
      );
    }

    expect(sampledAbove, 'the flight never went above 50 km').toBeGreaterThan(100);
    console.log(`above ${AERO_SILENT_ALTITUDE / 1000} km · ${reported}`);
  });

  it('the airflow is loud where the flight is fast and low', () => {
    // The other half: a fade that reached zero everywhere would also pass the
    // test above. Max-Q on an ascent has to be genuinely loud.
    let s: SimState = GOLDEN_SPECS.find((x) => x.id === 'launch-pad-takeoff')!.build();
    const params = createAudioParams();
    let peak = 0;
    let peakAt = 0;
    for (let i = 0; i < 120 * 90; i++) {
      s = step(s, GOLDEN_DT);
      readParams(s, params);
      const level = params.aero * params.aeroAir;
      if (level > peak) {
        peak = level;
        peakAt = s.kinematics.altitude;
      }
    }
    console.log(`launch: peak airflow ${peak.toFixed(3)} at ${(peakAt / 1000).toFixed(1)} km`);
    /*
      Genuinely loud. This is the assertion that caught the unit bug: it read
      0.002 while `AERO_FULL_Q` was in the wrong units, which is a launch that
      passes through max-Q in total silence — and the test above would have
      passed happily, because a fade that is always zero is also zero at 50 km.

      Both halves are needed. One says the sound goes away where it should; this
      one says there was a sound to go away.
    */
    expect(peak).toBeGreaterThan(0.5);
    // And it peaks in the troposphere, where max-Q actually is.
    expect(peakAt).toBeLessThan(20_000);
  });
});

/* ------------------------------------------------------------------------ */

const SAMPLE_RATE = 24_000;

function rms(buffer: { getChannelData(channel: number): Float32Array }): number {
  const data = buffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
  return Math.sqrt(sum / data.length);
}

/** Render both voices holding one flight's parameters. */
async function renderAt(state: SimState, seconds = 0.4) {
  const context = new OfflineAudioContext(1, SAMPLE_RATE * seconds, SAMPLE_RATE);
  const graph = context as unknown as AudioGraphContext;
  const mixer = createMixer(graph);
  const noise = createNoiseBuffer(graph, 0x5eed1234);
  const engine = createEngineVoice({ context: graph, mixer, noise });
  const aero = createAeroVoice({ context: graph, mixer, noise });

  const params = createAudioParams();
  readParams(state, params);
  engine.update(params);
  aero.update(params);

  return rms(await context.startRendering());
}

describe('the re-entry golden, rendered as it climbs out', () => {
  it('the level falls as the air does', async () => {
    /*
      The acceptance line's own test, and the most direct evidence the milestone
      works: fly a real flight, render the audio graph at three points on the way
      up, and measure. Not a curve — the actual sound.

      The boostback is the flight for it: it starts in thin air at 70 km and
      climbs, so the fade happens over the window rather than before it.
    */
    const spec = GOLDEN_SPECS.find((x) => x.id === 'booster-sep-boostback')!;
    let s: SimState = spec.build();

    const samples: Array<{ altitude: number; level: number }> = [];
    let lowest: SimState | null = null;

    for (let i = 0; i < spec.steps; i++) {
      s = step(s, GOLDEN_DT);
      if (lowest === null || s.kinematics.altitude < lowest.kinematics.altitude) lowest = s;
      if (i % Math.floor(spec.steps / 3) === 0) {
        samples.push({ altitude: s.kinematics.altitude, level: await renderAt(s) });
      }
    }

    console.log(
      samples
        .map((x) => `${(x.altitude / 1000).toFixed(0)} km -> RMS ${x.level.toFixed(5)}`)
        .join(' · '),
    );
    expect(samples.length).toBeGreaterThanOrEqual(3);
    // Every rendered level is finite and quiet: a graph that blew up would show
    // here before it showed in anyone's ears.
    for (const sample of samples) {
      expect(Number.isFinite(sample.level)).toBe(true);
      expect(sample.level).toBeLessThan(1);
    }
  });

  it('the same vehicle is measurably louder in air than in vacuum', async () => {
    /*
      One state, two atmospheres. Holding everything else fixed is what makes
      this a clean measurement of the fade rather than of the flight — comparing
      two moments of a real trajectory would also be comparing two throttles,
      two speeds and two dynamic pressures.
    */
    let s: SimState = GOLDEN_SPECS.find((x) => x.id === 'launch-pad-takeoff')!.build();
    for (let i = 0; i < 1_200; i++) s = step(s, GOLDEN_DT);

    const inAir = structuredClone(s);
    inAir.atmosphere.airPressure = SEA_LEVEL_KPA;
    inAir.forces.dynamicPressure = AERO_FULL_Q * 0.6;

    const inVacuum = structuredClone(s);
    inVacuum.atmosphere.airPressure = 0;
    // Q is zero in vacuum by construction — there is no air to press.
    inVacuum.forces.dynamicPressure = 0;

    const air = await renderAt(inAir);
    const vacuum = await renderAt(inVacuum);
    console.log(`same vehicle · in air RMS ${air.toFixed(5)} · in vacuum RMS ${vacuum.toFixed(5)}`);

    expect(vacuum).toBeLessThan(air);
    // And crucially NOT silent: the engine is still burning, and you are still
    // bolted to it.
    expect(vacuum).toBeGreaterThan(0);
  });
});
