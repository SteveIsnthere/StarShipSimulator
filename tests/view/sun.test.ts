/**
 * M11.4 — the sun, as geometry.
 *
 * Everything here is spherical astronomy at StarBase's latitude with the
 * declination at zero, and the assertions are against that closed form. The
 * one that matters most is the identity: every preset starts in full
 * daylight, and in full daylight every factor is exactly one, so the sky and
 * ground the goldens' screenshots were taken under are bit-for-bit unchanged.
 */
import { describe, expect, it } from 'vitest';
import { planetCircumference, starBaseXPos, vehicleDiameter, vehicleHeight } from '$core/constants';
import { createScenarioState } from '$core/scenarios';
import { ALL_SCENARIOS } from '$core/scenarios';
import {
  DAY_ELEVATION,
  DEFAULT_LAUNCH_HOUR,
  LAUNCH_HOURS,
  NIGHT_GROUND,
  STARBASE_LATITUDE,
  createSunLight,
  daylight,
  elevationAtOffset,
  groundDarkness,
  groundDaylight,
  groundShadow,
  hourAngle,
  lightInVehicleFrame,
  localSolarHour,
  nightStars,
  skyFactor,
  sunUp,
  writeSun,
  type GroundShadow,
  type SunLight,
} from '$view/sun';

const DEG = Math.PI / 180;

/** The sun at a local hour, for a vehicle at StarBase. */
function sunAt(hour: number): SunLight {
  const sun = createSunLight();
  writeSun(sun, 'custom', (hour - DEFAULT_LAUNCH_HOUR) * 3600, starBaseXPos);
  return sun;
}

describe('the direction to the sun', () => {
  it('is a unit vector at every hour', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const s = sunAt(h);
      expect(s.east ** 2 + s.up ** 2 + s.south ** 2).toBeCloseTo(1, 12);
    }
  });

  it('is due south and highest at local noon, at 90° minus the latitude', () => {
    const noon = sunAt(12);
    expect(noon.east).toBeCloseTo(0, 12);
    expect(noon.elevation).toBeCloseTo(Math.PI / 2 - STARBASE_LATITUDE, 12);
    expect(noon.elevation / DEG).toBeCloseTo(64.0, 1);
  });

  it('is in the east in the morning and the west in the afternoon', () => {
    expect(sunAt(9).east).toBeGreaterThan(0);
    expect(sunAt(15).east).toBeLessThan(0);
    // Symmetric about noon.
    expect(sunAt(9).east).toBeCloseTo(-sunAt(15).east, 12);
    expect(sunAt(9).up).toBeCloseTo(sunAt(15).up, 12);
  });

  it('rises and sets at six, at the equinox', () => {
    expect(sunAt(6).elevation).toBeCloseTo(0, 9);
    expect(sunAt(18).elevation).toBeCloseTo(0, 9);
    expect(sunAt(0).elevation).toBeLessThan(0);
    expect(sunAt(3).elevation).toBeLessThan(0);
  });

  it('sin(elevation) is cos(latitude)·cos(hour angle), the closed form', () => {
    for (const h of [7, 9.5, 12, 14, 17.5]) {
      const H = hourAngle(h);
      expect(sunUp(H)).toBeCloseTo(Math.cos(STARBASE_LATITUDE) * Math.cos(H), 12);
      expect(Math.sin(sunAt(h).elevation)).toBeCloseTo(sunUp(H), 12);
    }
  });
});

describe('local solar time', () => {
  const AT_BASE = starBaseXPos;

  it('starts at the scenario hour, at StarBase, and advances with the clock', () => {
    expect(localSolarHour('launch-pad', 0, AT_BASE)).toBeCloseTo(LAUNCH_HOURS['launch-pad']!, 12);
    expect(localSolarHour('launch-pad', 3600, AT_BASE)).toBeCloseTo(
      LAUNCH_HOURS['launch-pad']! + 1,
      12,
    );
    expect(localSolarHour('no-such-scenario', 0, AT_BASE)).toBeCloseTo(DEFAULT_LAUNCH_HOUR, 12);
  });

  it('measures longitude from StarBase, not from the pig at x = 0', () => {
    // StarBase is half a planet from the world origin. The first frame ever
    // drawn with the sun was the intro at midnight, because it was not.
    expect(localSolarHour('intro', 0, 0)).toBeCloseTo((LAUNCH_HOURS['intro']! + 12) % 24, 9);
    const intro = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'intro')!);
    expect(localSolarHour('intro', 0, intro.kinematics.downRangeDistance)).toBeCloseTo(
      LAUNCH_HOURS['intro']!,
      9,
    );
  });

  it('a lap east is a day later — and wraps', () => {
    const start = localSolarHour('launch-pad', 0, AT_BASE);
    expect(localSolarHour('launch-pad', 0, AT_BASE + planetCircumference / 4)).toBeCloseTo(
      start + 6,
      9,
    );
    expect(localSolarHour('launch-pad', 0, AT_BASE + planetCircumference)).toBeCloseTo(start, 9);
    expect(localSolarHour('launch-pad', 0, AT_BASE - planetCircumference / 2)).toBeCloseTo(
      (start + 12) % 24,
      9,
    );
  });

  it('the deorbit preset starts in the night, half a planet from home', () => {
    const state = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'deorbit')!);
    const hour = localSolarHour('deorbit', 0, state.kinematics.downRangeDistance);
    expect(hour).toBeCloseTo((LAUNCH_HOURS['deorbit']! + 12) % 24, 3);
    const sun = createSunLight();
    writeSun(sun, 'deorbit', 0, state.kinematics.downRangeDistance);
    expect(sun.elevation).toBeLessThan(0);
    expect(sun.daylight).toBe(0);
  });
});

describe("the identity: every preset's default is today's look, exactly", () => {
  it('every scenario starts in full daylight (the deorbit one at its landing site)', () => {
    for (const preset of ALL_SCENARIOS) {
      const sun = createSunLight();
      const state = createScenarioState(preset);
      const x = preset.id === 'deorbit' ? starBaseXPos : state.kinematics.downRangeDistance;
      writeSun(sun, preset.id, 0, x);
      expect(sun.elevation, preset.id).toBeGreaterThanOrEqual(DAY_ELEVATION);
      expect(sun.daylight, preset.id).toBe(1);
      expect([sun.skyR, sun.skyG, sun.skyB], preset.id).toEqual([1, 1, 1]);
      expect(sun.stars, preset.id).toBe(0);
      expect(groundDaylight(sun), preset.id).toBe(1);
    }
    // Including the intro, whose look is the soul's.
    const intro = createSunLight();
    writeSun(intro, 'intro', 0, starBaseXPos);
    expect(intro.daylight).toBe(1);
    expect([intro.skyR, intro.skyG, intro.skyB]).toEqual([1, 1, 1]);
  });

  it('and stays there for the length of a flight', () => {
    // Forty minutes on the pad-side presets, which is longer than any of them.
    for (const id of ['intro', 'launch-pad', 'landing-burn', 'reentry']) {
      const sun = createSunLight();
      writeSun(sun, id, 40 * 60, starBaseXPos);
      expect(sun.daylight, id).toBe(1);
    }
  });

  it('the morning presets light the vehicle from its right, where the art was shaded from', () => {
    for (const id of ['intro', 'launch-pad', 'booster-sep', 'rtls', 'before-flip']) {
      const sun = createSunLight();
      writeSun(sun, id, 0, starBaseXPos);
      expect(sun.east, id).toBeGreaterThan(0.4);
    }
    // And the afternoon landing from its left — the discriminating case.
    const landing = createSunLight();
    writeSun(landing, 'landing-burn', 0, starBaseXPos);
    expect(landing.east).toBeLessThan(-0.4);
  });
});

describe('the curves', () => {
  it('daylight is one from fifteen degrees up, zero at civil twilight, monotone between', () => {
    expect(daylight(DAY_ELEVATION)).toBe(1);
    expect(daylight(80 * DEG)).toBe(1);
    expect(daylight(-6 * DEG)).toBe(0);
    expect(daylight(-30 * DEG)).toBe(0);
    let last = 0;
    for (let e = -6; e <= 15; e += 0.25) {
      const d = daylight(e * DEG);
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
    expect(daylight(4.5 * DEG)).toBeCloseTo(0.5, 6);
  });

  it('the sky warms toward the horizon and darkens below it', () => {
    const f = { r: 1, g: 1, b: 1 };
    skyFactor(20 * DEG, f);
    expect(f).toEqual({ r: 1, g: 1, b: 1 });
    skyFactor(0, f);
    expect(f.r).toBeGreaterThan(f.g);
    expect(f.g).toBeGreaterThan(f.b);
    expect(f.r).toBeLessThan(1);
    skyFactor(-10 * DEG, f);
    expect(f.b).toBeGreaterThan(f.r);
    expect(f.r).toBeLessThan(0.15);
    // Continuous at the joins.
    const a = { r: 0, g: 0, b: 0 };
    const b = { r: 0, g: 0, b: 0 };
    skyFactor(1e-9, a);
    skyFactor(-1e-9, b);
    expect(a.r).toBeCloseTo(b.r, 6);
    expect(a.b).toBeCloseTo(b.b, 6);
  });

  it('stars come out only once the sun is below the horizon', () => {
    expect(nightStars(10 * DEG)).toBe(0);
    expect(nightStars(0)).toBe(0);
    expect(nightStars(-2 * DEG)).toBe(0);
    expect(nightStars(-6 * DEG)).toBeGreaterThan(0.3);
    expect(nightStars(-10 * DEG)).toBe(1);
    expect(nightStars(-40 * DEG)).toBe(1);
  });

  it('the ground keeps a little light at night, for the pad', () => {
    const night = createSunLight();
    writeSun(night, 'launch-pad', 14 * 3600, starBaseXPos);
    expect(night.daylight).toBe(0);
    expect(groundDaylight(night)).toBe(NIGHT_GROUND);
  });
});

describe('the light in the vehicle frame', () => {
  const out = { x: 0, y: 0, z: 0 };

  it('is the world direction when the vehicle is upright', () => {
    const sun = sunAt(9.5);
    lightInVehicleFrame(sun, 0, out);
    expect(out.x).toBeCloseTo(sun.east, 12);
    expect(out.y).toBeCloseTo(sun.up, 12);
    expect(out.z).toBeCloseTo(sun.south, 12);
  });

  it('nose-right, a sun overhead lights the flank that now faces up', () => {
    // Pitched 90° nose-right, the vehicle's left flank faces the sky. An
    // overhead sun must land on local -x, along the hull not at all.
    const sun = createSunLight();
    sun.east = 0;
    sun.up = 1;
    sun.south = 0;
    lightInVehicleFrame(sun, Math.PI / 2, out);
    expect(out.x).toBeCloseTo(-1, 12);
    expect(out.y).toBeCloseTo(0, 12);
  });

  it('is still a unit vector', () => {
    const sun = sunAt(14);
    for (const pitch of [0, 0.4, -1.2, Math.PI / 2, 3]) {
      lightInVehicleFrame(sun, pitch, out);
      expect(out.x ** 2 + out.y ** 2 + out.z ** 2).toBeCloseTo(1, 12);
    }
  });
});

describe('the ground shadow', () => {
  const shadow: GroundShadow = { visible: false, centreX: 0, length: 0, width: 0, alpha: 0 };
  const onPad = (hour: number) => {
    groundShadow(vehicleHeight / 2, 0, vehicleHeight, vehicleDiameter, sunAt(hour), shadow);
    return { ...shadow };
  };

  it('falls away from the sun: west in the morning, east in the afternoon', () => {
    expect(onPad(9.5).centreX).toBeLessThan(0);
    expect(onPad(16).centreX).toBeGreaterThan(0);
    expect(onPad(12).centreX).toBeCloseTo(0, 9);
  });

  it('moves with the sun, monotonically through the day', () => {
    let last = -Infinity;
    for (let h = 7; h <= 17; h += 0.5) {
      const s = onPad(h);
      expect(s.visible, `${h}h`).toBe(true);
      expect(s.centreX, `${h}h`).toBeGreaterThan(last);
      last = s.centreX;
    }
  });

  it('is the length the tangent says: a vertical hull casts H·E/U along the ground', () => {
    const sun = sunAt(9.5);
    const s = onPad(9.5);
    expect(s.length).toBeCloseTo(vehicleHeight * Math.abs(sun.east / sun.up) + vehicleDiameter, 9);
    expect(s.width).toBe(vehicleDiameter);
    // Longer as the sun gets lower.
    expect(onPad(8).length).toBeGreaterThan(onPad(9.5).length);
    expect(onPad(11).length).toBeLessThan(onPad(9.5).length);
  });

  it('fades as the vehicle climbs and is gone by four hundred metres', () => {
    const sun = sunAt(9.5);
    const at = (alt: number) => {
      groundShadow(alt, 0, vehicleHeight, vehicleDiameter, sun, shadow);
      return { ...shadow };
    };
    expect(at(25).alpha).toBeGreaterThan(at(100).alpha);
    expect(at(100).alpha).toBeGreaterThan(at(300).alpha);
    expect(at(425).visible).toBe(false);
    expect(at(1000).visible).toBe(false);
  });

  it('is hidden once the sun is on the horizon, where the tangent runs away', () => {
    groundShadow(25, 0, vehicleHeight, vehicleDiameter, sunAt(18.1), shadow);
    expect(shadow.visible).toBe(false);
    groundShadow(25, 0, vehicleHeight, vehicleDiameter, sunAt(2), shadow);
    expect(shadow.visible).toBe(false);
  });

  it('a pitched-over vehicle throws its nose further than its tail', () => {
    const sun = sunAt(9.5);
    groundShadow(25, 0, vehicleHeight, vehicleDiameter, sun, shadow);
    const upright = shadow.length;
    // Nose toward the sun (east): the shadow shortens; nose away: it lengthens
    // about the same amount, because the projection is linear in the ends.
    groundShadow(25, 0.5, vehicleHeight, vehicleDiameter, sun, shadow);
    const toward = shadow.length;
    groundShadow(25, -0.5, vehicleHeight, vehicleDiameter, sun, shadow);
    const away = shadow.length;
    expect(toward).toBeLessThan(upright);
    expect(away).toBeGreaterThan(upright);
  });
});

describe('the terminator, as longitude', () => {
  it('east of the vehicle is later: the elevation falls in the afternoon and rises in the morning', () => {
    const afternoon = hourAngle(15);
    expect(elevationAtOffset(afternoon, 10 * DEG)).toBeLessThan(elevationAtOffset(afternoon, 0));
    const morning = hourAngle(9);
    expect(elevationAtOffset(morning, 10 * DEG)).toBeGreaterThan(elevationAtOffset(morning, 0));
    // Zero offset is the vehicle's own elevation.
    expect(elevationAtOffset(afternoon, 0)).toBeCloseTo(sunAt(15).elevation, 12);
  });

  it('crosses the horizon ninety degrees of hour angle from noon, at the equinox', () => {
    expect(elevationAtOffset(hourAngle(12), Math.PI / 2)).toBeCloseTo(0, 9);
    expect(elevationAtOffset(hourAngle(12), -Math.PI / 2)).toBeCloseTo(0, 9);
  });

  it('the ground is not darkened by day, and darkened to the night floor by night', () => {
    expect(groundDarkness(30 * DEG)).toBe(0);
    expect(groundDarkness(DAY_ELEVATION)).toBe(0);
    expect(groundDarkness(-20 * DEG)).toBeCloseTo(1 - NIGHT_GROUND, 12);
    // Monotone through twilight.
    let last = 1;
    for (let e = -10; e <= 15; e += 0.5) {
      const d = groundDarkness(e * DEG);
      expect(d).toBeLessThanOrEqual(last + 1e-12);
      last = d;
    }
  });

  it('so at half past nine on the pad the whole band is lit, to three screen widths', () => {
    // The strip loop in distant-earth.ts: at the pad the horizon is 18 km
    // away, a hundredth of a degree — every strip is day.
    const h = hourAngle(9.5);
    for (let offset = -0.001; offset <= 0.001; offset += 0.0001) {
      expect(groundDarkness(elevationAtOffset(h, offset))).toBe(0);
    }
    // And from 100 km an hour before sunset, the east edge of the frame is
    // into the twilight and the west edge is not.
    const spanRad = (1_133_000 / planetCircumference) * 2 * Math.PI;
    const dusk = hourAngle(17);
    expect(groundDarkness(elevationAtOffset(dusk, 3 * spanRad))).toBeGreaterThan(0);
    expect(groundDarkness(elevationAtOffset(dusk, -3 * spanRad))).toBe(0);
  });
});

/**
 * M12.2 — the hour a player asks for.
 *
 * `LAUNCH_HOURS` gives each scenario the hour it is written for, and until now
 * that was the only hour it could have. The editor can override it, and the
 * override arrives here as an argument rather than as a mutation of the table:
 * the table is what a SCENARIO means, and one flight's typed hour must not
 * change what the next flight inherits.
 */
describe('the launch hour can be overridden per flight', () => {
  it('an override replaces the scenario default, and nothing else', () => {
    // Same scenario, same clock, same place — only the starting hour differs.
    const dawn = localSolarHour('landing-burn', 0, starBaseXPos, 6);
    const dusk = localSolarHour('landing-burn', 0, starBaseXPos, 20);
    expect(dawn).toBeCloseTo(6, 10);
    expect(dusk).toBeCloseTo(20, 10);

    // And the sun really is on opposite sides of the sky at those two hours.
    expect(hourAngle(dawn)).toBeLessThan(0);
    expect(hourAngle(dusk)).toBeGreaterThan(0);
  });

  it('the clock and the longitude still apply on top of it', () => {
    // Ten minutes of flight is a sixth of an hour, wherever the hour started.
    expect(localSolarHour('landing-burn', 600, starBaseXPos, 6)).toBeCloseTo(6 + 1 / 6, 10);
  });

  it('and omitting it leaves the table in charge', () => {
    for (const [id, hour] of Object.entries(LAUNCH_HOURS)) {
      expect(localSolarHour(id, 0, starBaseXPos), id).toBeCloseTo(hour, 10);
      expect(localSolarHour(id, 0, starBaseXPos, undefined), id).toBeCloseTo(hour, 10);
    }
  });

  it('and a number that is not one is ignored rather than believed', () => {
    // `Number('')` is 0, which is a legitimate hour — midnight — so the editor
    // never sends an empty box here at all. NaN is what a half-typed "-" or an
    // "e" produces, and midnight is not what the player asked for either.
    expect(localSolarHour('landing-burn', 0, starBaseXPos, Number.NaN)).toBeCloseTo(
      LAUNCH_HOURS['landing-burn']!,
      10,
    );
  });
});
