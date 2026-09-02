/**
 * The sun — M11.4.
 *
 * WHERE IT IS. StarBase is at 26°N. Give each scenario a local solar time at
 * which it starts, let it advance with the simulation clock, and shift it with
 * longitude as the vehicle flies downrange (a lap is a day), and the sun's
 * direction follows from the hour angle by the ordinary spherical astronomy:
 *
 *     E =  -sin(H)                east component
 *     U =   cos(φ) cos(H)         up   (sin of the elevation)
 *     S =   sin(φ) cos(H)         south
 *
 * for declination zero — the equinox, stated rather than modelled, because a
 * date is one more thing the flight editor would have to carry and the
 * difference between March and June is a few degrees of elevation that nothing
 * here can show. `(E, U, S)` is a unit vector: E² + U² + S² = sin²H + cos²H.
 *
 * WHAT IT DRIVES. Everything in `view/` that has a colour: the sky's palette
 * (warm at the horizon as the elevation falls, dark below it), the ground, the
 * clouds and the far earth through one `daylight` scalar, the far earth's
 * terminator, the vehicle's shading and its shadow. Core is not involved —
 * the sun is a fact about the picture, never about the physics, which is why
 * this file lives here and reads SimState without writing it.
 *
 * THE DEFAULT IS TODAY'S LOOK. Every preset starts in full daylight — the sun
 * more than fifteen degrees up — and above that elevation every factor here is
 * exactly one, so the sky, ground and cloud tints are bit-for-bit what they
 * were before the sun existed. A morning sun on the pad, because the vehicle
 * art is shaded from its right and the real launches were in the morning.
 *
 * NO ALLOCATION PER FRAME. `writeSun` fills a preallocated `SunLight`; the
 * camera, the viewport and the loop state follow the same rule.
 */
import { planetCircumference, starBaseXPos } from '$core/constants';

/** rad — StarBase, Boca Chica: 25.997°N. */
export const STARBASE_LATITUDE = (25.997 * Math.PI) / 180;

/** Local solar hour each scenario starts at. Missing ids get the default. */
export const LAUNCH_HOURS: Readonly<Record<string, number>> = {
  intro: 9.5,
  'launch-pad': 9.5,
  'booster-sep': 9.55,
  rtls: 9.6,
  'before-flip': 9.75,
  // An afternoon landing, so one preset has the sun on the OTHER side of the
  // vehicle: the shadow falls the other way and the other flank is lit, which
  // is what makes the lighting provable rather than a coincidence of the art.
  'landing-burn': 16,
  // Mid-afternoon over a re-entry: the sun a third of the way up at the start
  // and still above the full-daylight line when the flight ends forty minutes
  // later. (It starts 1980 km west of the pad, which is an hour and a quarter
  // earlier by the sun; the longitude term takes care of that.)
  reentry: 15.5,
  // The orbital presets start half a planet away, which is twelve hours of
  // local time — the deorbit flight comes home out of the night into morning.
  circularize: 11,
  deorbit: 11,
};
export const DEFAULT_LAUNCH_HOUR = 9.5;

/** rad — at or above this elevation everything is full daylight, exactly. */
export const DAY_ELEVATION = (15 * Math.PI) / 180;
/** rad — civil twilight ends: the ground is dark from here down. */
export const TWILIGHT_END = (-6 * Math.PI) / 180;
/** rad — the sky is night from here down. */
export const NIGHT_ELEVATION = (-10 * Math.PI) / 180;

/** The sky's colour at sunset, as a factor on the daytime palette. */
export const DUSK_SKY = { r: 0.95, g: 0.62, b: 0.42 } as const;
/** And at night: a deep blue a tenth as bright. */
export const NIGHT_SKY = { r: 0.1, g: 0.12, b: 0.2 } as const;
/** How much light the ground keeps at night — the pad has its own lights. */
export const NIGHT_GROUND = 0.12;

export interface SunLight {
  /** h — local solar time at the vehicle, 0..24. */
  hour: number;
  /** rad — hour angle: zero at local noon, positive in the afternoon. */
  hourAngle: number;
  /** Unit vector toward the sun: downrange (east), up, and toward the viewer (south). */
  east: number;
  up: number;
  south: number;
  /** rad — elevation above the horizon. */
  elevation: number;
  /** 0..1 — one in full daylight, zero after civil twilight. */
  daylight: number;
  /** Factor on the daytime sky palette, per channel. (1, 1, 1) by day. */
  skyR: number;
  skyG: number;
  skyB: number;
  /** 0..1 — how visible the stars are on account of the hour alone. */
  stars: number;
}

export function createSunLight(): SunLight {
  const sun: SunLight = {
    hour: 0,
    hourAngle: 0,
    east: 0,
    up: 1,
    south: 0,
    elevation: Math.PI / 2,
    daylight: 1,
    skyR: 1,
    skyG: 1,
    skyB: 1,
    stars: 0,
  };
  writeSun(sun, 'intro', 0, starBaseXPos);
  return sun;
}

/**
 * Local solar time at the vehicle, in hours, wrapped to [0, 24).
 *
 * The scenario's hour, plus the simulation clock, plus the longitude: flying
 * a full circumference east advances the local time by a day. Longitude is
 * measured from STARBASE, whose world x is half a planet from the origin (the
 * pig is at x = 0): the first frame ever drawn with this was the intro at
 * midnight, which is how that was learned.
 *
 * @param downRangeDistance m — the vehicle's absolute world x, as SimState carries it
 */
export function localSolarHour(
  scenarioId: string,
  environmentTime: number,
  downRangeDistance: number,
): number {
  const start = LAUNCH_HOURS[scenarioId] ?? DEFAULT_LAUNCH_HOUR;
  const hour =
    start +
    environmentTime / 3600 +
    ((downRangeDistance - starBaseXPos) / planetCircumference) * 24;
  return ((hour % 24) + 24) % 24;
}

/** rad — hour angle from the local hour: zero at noon, 15° an hour. */
export function hourAngle(hour: number): number {
  return ((hour - 12) / 12) * Math.PI;
}

/** sin(elevation) at an hour angle, for declination zero at StarBase. */
export function sunUp(hourAngleRad: number): number {
  return Math.cos(STARBASE_LATITUDE) * Math.cos(hourAngleRad);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * How much of the day's light there is, 0..1.
 *
 * Exactly one from `DAY_ELEVATION` up — the identity that keeps every preset's
 * default look bit-identical — and a smooth fall to zero at the end of civil
 * twilight, which is when the eye stops seeing the ground by the sky.
 */
export function daylight(elevation: number): number {
  if (elevation >= DAY_ELEVATION) return 1;
  return smoothstep(TWILIGHT_END, DAY_ELEVATION, elevation);
}

/** Per-channel factor on the daytime sky palette at an elevation. */
export function skyFactor(elevation: number, out: { r: number; g: number; b: number }): void {
  if (elevation >= DAY_ELEVATION) {
    out.r = 1;
    out.g = 1;
    out.b = 1;
    return;
  }
  if (elevation >= 0) {
    // Day to dusk: the blue drains and the horizon warms as the path through
    // the air lengthens.
    const t = smoothstep(0, DAY_ELEVATION, elevation);
    out.r = DUSK_SKY.r + (1 - DUSK_SKY.r) * t;
    out.g = DUSK_SKY.g + (1 - DUSK_SKY.g) * t;
    out.b = DUSK_SKY.b + (1 - DUSK_SKY.b) * t;
    return;
  }
  // Dusk to night.
  const t = smoothstep(NIGHT_ELEVATION, 0, elevation);
  out.r = NIGHT_SKY.r + (DUSK_SKY.r - NIGHT_SKY.r) * t;
  out.g = NIGHT_SKY.g + (DUSK_SKY.g - NIGHT_SKY.g) * t;
  out.b = NIGHT_SKY.b + (DUSK_SKY.b - NIGHT_SKY.b) * t;
}

/** Stars by the hour alone: none until the sun is two degrees down, all by ten. */
export function nightStars(elevation: number): number {
  return 1 - smoothstep(NIGHT_ELEVATION, (-2 * Math.PI) / 180, elevation);
}

/** The ground's share of the day's light: `NIGHT_GROUND` at night, one by day. */
export function groundDaylight(sun: { readonly daylight: number }): number {
  return NIGHT_GROUND + (1 - NIGHT_GROUND) * sun.daylight;
}

/**
 * The sun's elevation at another longitude, `offset` radians of hour angle
 * east of the vehicle. The far earth's terminator is drawn from this: each
 * strip across the band is a longitude, and its darkness is the ground's
 * share of daylight at the elevation the sun has THERE.
 */
export function elevationAtOffset(hourAngleRad: number, offset: number): number {
  return Math.asin(Math.max(-1, Math.min(1, sunUp(hourAngleRad + offset))));
}

/** 0..1 — how dark the ground is at an elevation: zero by day, `1 - NIGHT_GROUND` at night. */
export function groundDarkness(elevation: number): number {
  return 1 - (NIGHT_GROUND + (1 - NIGHT_GROUND) * daylight(elevation));
}

const scratchFactor = { r: 1, g: 1, b: 1 };

/** Fill `out` with the sun for this frame. Allocation-free. */
export function writeSun(
  out: SunLight,
  scenarioId: string,
  environmentTime: number,
  downRangeDistance: number,
): void {
  const hour = localSolarHour(scenarioId, environmentTime, downRangeDistance);
  const h = hourAngle(hour);
  const cosH = Math.cos(h);
  out.hour = hour;
  out.hourAngle = h;
  out.east = -Math.sin(h);
  out.up = Math.cos(STARBASE_LATITUDE) * cosH;
  out.south = Math.sin(STARBASE_LATITUDE) * cosH;
  out.elevation = Math.asin(Math.max(-1, Math.min(1, out.up)));
  out.daylight = daylight(out.elevation);
  skyFactor(out.elevation, scratchFactor);
  out.skyR = scratchFactor.r;
  out.skyG = scratchFactor.g;
  out.skyB = scratchFactor.b;
  out.stars = nightStars(out.elevation);
}

/**
 * The sun's direction in the vehicle's own frame: x across the hull (positive
 * to the vehicle's right when upright), y along it toward the nose, z toward
 * the viewer. The vehicle is rotated nose-right by `pitch`, so the world
 * direction is rotated the other way to express it in the hull's axes.
 */
export function lightInVehicleFrame(
  sun: SunLight,
  pitch: number,
  out: { x: number; y: number; z: number },
): void {
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  out.x = c * sun.east - s * sun.up;
  out.y = s * sun.east + c * sun.up;
  out.z = sun.south;
}

/** m — above this the caster is too far from the ground for a shadow to read. */
export const SHADOW_FADE_ALTITUDE = 400;
/** How dark the shadow is at full daylight with the vehicle on the ground. */
export const SHADOW_ALPHA = 0.42;

export interface GroundShadow {
  visible: boolean;
  /** m — downrange offset of the shadow's centre from the vehicle's x. */
  centreX: number;
  /** m — its extent along the ground. */
  length: number;
  /** m — its width across. */
  width: number;
  /** 0..1 */
  alpha: number;
}

/**
 * The vehicle's shadow on the ground.
 *
 * A point at height y casts to x - y·E/U along the ground, so the vehicle's
 * nose and tail — the ends of its axis, tilted by the pitch — cast to two
 * points and the shadow is the stretch between them, one hull wide. It fades
 * as the tail rises: a real penumbra blurs a shadow out long before the caster
 * is four hundred metres up. Hidden when the sun is on or below the horizon,
 * where the projection runs off to infinity and the physics says "dusk".
 */
export function groundShadow(
  altitude: number,
  pitch: number,
  vehicleHeight: number,
  vehicleDiameter: number,
  sun: SunLight,
  out: GroundShadow,
): void {
  const halfH = vehicleHeight / 2;
  const bottom = altitude - halfH * Math.abs(Math.cos(pitch));
  if (sun.up <= 0.05 || bottom >= SHADOW_FADE_ALTITUDE || sun.daylight <= 0) {
    out.visible = false;
    out.alpha = 0;
    return;
  }
  const slope = sun.east / sun.up;
  const noseX = halfH * Math.sin(pitch);
  const noseY = altitude + halfH * Math.cos(pitch);
  const tailX = -noseX;
  const tailY = altitude - halfH * Math.cos(pitch);
  const a = noseX - noseY * slope;
  const b = tailX - tailY * slope;
  out.visible = true;
  out.centreX = (a + b) / 2;
  out.length = Math.abs(a - b) + vehicleDiameter;
  out.width = vehicleDiameter;
  out.alpha = SHADOW_ALPHA * sun.daylight * (1 - Math.max(0, bottom) / SHADOW_FADE_ALTITUDE);
}
