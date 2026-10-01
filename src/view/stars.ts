/**
 * Real stars — M11.7.
 *
 * The sky's stars were 220 seeded randoms. They are now the 320 brightest
 * stars of the Yale Bright Star Catalogue (`stars-data.ts`), placed for
 * StarBase by ordinary spherical astronomy and turning with the hour:
 *
 *     H       = LST − RA                       hour angle
 *     sin a   = sin φ sin δ + cos φ cos δ cos H     altitude
 *     tan A   = −cos δ sin H / (sin δ cos φ − cos δ sin φ cos H)   azimuth from north, east positive
 *
 * LOCAL SIDEREAL TIME is the sun's hour angle plus the sun's right ascension.
 * The sun module measures its hour angle as `solarHour − 12`, and at the
 * September equinox the sun's right ascension is twelve hours, so the two
 * twelves cancel and LST is simply the local solar hour. A star's place moves
 * with the same clock the sun does, a degree every four minutes of flight, and
 * the two never disagree about what time it is.
 *
 * The first version added the twelve instead of cancelling it, which is half a
 * day — it hid Vega and Deneb below the horizon on a September evening and put
 * the spring sky overhead in their place. Review caught it; the test below now
 * pins the convention against named stars at a known hour rather than against
 * the formula, so an arithmetic slip cannot be blessed by its own test again.
 *
 * THE VIEW FACES NORTH. The side view has east to the right (world +x), which
 * is what an observer south of the track looking north sees, and it is the
 * orientation M11.4's lighting assumed. So the visible sky is the northern
 * half of the dome: the Plough, Polaris, Cassiopeia, Vega and Deneb passing
 * near the zenith; Orion and Sirius are behind the camera. Azimuth is mapped
 * across the frame (±`HALF_FIELD_DEG` about north) and altitude up it, from a
 * horizon line at a fixed share of the height — the far earth's line at the
 * altitudes stars are seen from, and a glow band below it at night on the pad.
 *
 * Everything here is pure; the sky draws what `projectStar` returns.
 */
import { STARBASE_LATITUDE } from './sun';
import { STARS, type StarRow } from './stars-data';

const DEG = Math.PI / 180;

/** h — the sun's right ascension at the September equinox, the date the sun module states. */
export const SUN_RA_HOURS = 12;

/**
 * h — local sidereal time from the local solar hour, 0..24.
 *
 * `(solarHour − 12) + SUN_RA_HOURS`, and those cancel at the equinox.
 */
export function localSiderealTime(solarHour: number): number {
  return (((solarHour - 12 + SUN_RA_HOURS) % 24) + 24) % 24;
}

export interface HorizontalPosition {
  /** rad — above the horizon; negative below. */
  altitude: number;
  /** rad — from north, positive toward east, in (−π, π]. */
  azimuth: number;
}

/**
 * Where a star is in the sky at a sidereal time, for a latitude.
 * @param raDeg right ascension, degrees
 * @param decDeg declination, degrees
 * @param lstHours local sidereal time, hours
 */
export function horizontal(
  raDeg: number,
  decDeg: number,
  lstHours: number,
  latitude: number,
  out: HorizontalPosition,
): void {
  const hourAngle = lstHours * 15 * DEG - raDeg * DEG;
  const dec = decDeg * DEG;
  const sinAlt =
    Math.sin(latitude) * Math.sin(dec) + Math.cos(latitude) * Math.cos(dec) * Math.cos(hourAngle);
  out.altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const y = -Math.cos(dec) * Math.sin(hourAngle);
  const x = Math.sin(dec) * Math.cos(latitude) - Math.cos(dec) * Math.sin(latitude) * Math.cos(hourAngle);
  out.azimuth = Math.atan2(y, x);
}

/**
 * deg — the altitude at the top of the sky's band, which sets the scale.
 *
 * THE PROJECTION IS ISOTROPIC: one number of pixels per degree in both axes,
 * derived from this and the horizon's place, so a constellation keeps its
 * shape. It did not at first — azimuth was mapped across the width and
 * altitude up the height independently, which sheared the Plough by a factor
 * of 3.8 between the desktop and phone viewports (review). The altitude band
 * is fixed and the AZIMUTH field follows the frame's aspect instead, which is
 * what a window of a given shape actually shows: a wide one sees more sky
 * either side of north, a narrow one less.
 */
export const TOP_ALTITUDE_DEG = 70;
/** deg — nothing further round than this is drawn: it is behind the viewer. */
export const MAX_AZIMUTH_DEG = 90;
/** Share of the frame height at which the stars' horizon sits. */
export const STAR_HORIZON = 0.62;

/** px per degree, the same in both axes. */
export function skyScale(height: number): number {
  return (height * STAR_HORIZON) / TOP_ALTITUDE_DEG;
}

/** deg — half the azimuth field a frame of this size shows. */
export function halfFieldDeg(width: number, height: number): number {
  return Math.min(MAX_AZIMUTH_DEG, width / 2 / skyScale(height));
}

export interface ScreenStar {
  x: number;
  y: number;
  /** px */
  radius: number;
  alpha: number;
  visible: boolean;
}

/**
 * A star's place and look on a frame of `width` × `height`.
 *
 * Off the frame (behind the viewer, below the horizon, above the top) it is
 * simply not visible. Brightness follows magnitude: the eye's scale is
 * logarithmic, and a linear ramp over the five magnitudes this catalogue
 * spans reads right on a screen that cannot show it any other way.
 */
export function projectStar(
  position: HorizontalPosition,
  magnitude: number,
  width: number,
  height: number,
  out: ScreenStar,
): void {
  const azDeg = position.azimuth / DEG;
  const altDeg = position.altitude / DEG;
  if (
    Math.abs(azDeg) > halfFieldDeg(width, height) ||
    altDeg < 0 ||
    altDeg > TOP_ALTITUDE_DEG
  ) {
    out.visible = false;
    return;
  }
  out.visible = true;
  const scale = skyScale(height);
  out.x = width / 2 + azDeg * scale;
  out.y = height * STAR_HORIZON - altDeg * scale;
  const t = Math.min(1, Math.max(0, (magnitude + 1.5) / 5.5));
  out.radius = 0.7 + 1.6 * (1 - t);
  out.alpha = 0.2 + 0.8 * (1 - t);
}

/** Every star in the catalogue, placed for StarBase at a solar hour. Allocates; call on redraw only. */
export function placeStars(
  solarHour: number,
  width: number,
  height: number,
  latitude = STARBASE_LATITUDE,
  catalogue: readonly StarRow[] = STARS,
): ScreenStar[] {
  const lst = localSiderealTime(solarHour);
  const position: HorizontalPosition = { altitude: 0, azimuth: 0 };
  const placed: ScreenStar[] = [];
  for (const [, ra, dec, mag] of catalogue) {
    horizontal(ra, dec, lst, latitude, position);
    const star: ScreenStar = { x: 0, y: 0, radius: 0, alpha: 0, visible: false };
    projectStar(position, mag, width, height, star);
    if (star.visible) placed.push(star);
  }
  return placed;
}

/** deg — the sky is redrawn when sidereal time has moved this far: a minute of flight. */
export const REDRAW_EVERY_DEG = 0.25;
