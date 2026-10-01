/**
 * M11.7 — the stars are the stars.
 *
 * The catalogue is the Bright Star Catalogue's 320 brightest; the placement
 * is spherical astronomy at StarBase. The assertions are against closed-form
 * facts about the sky — Polaris stands at the latitude, a star on the
 * observer's declination transits the zenith, the Plough's pointers point at
 * Polaris, Orion's belt is a straight line — none of which the code could
 * satisfy by accident.
 */
import { describe, expect, it } from 'vitest';
import { STARBASE_LATITUDE } from '$view/sun';
import { NAMED_STARS, STARS, type StarRow } from '$view/stars-data';
import {
  MAX_AZIMUTH_DEG,
  STAR_HORIZON,
  TOP_ALTITUDE_DEG,
  halfFieldDeg,
  horizontal,
  localSiderealTime,
  placeStars,
  projectStar,
  type HorizontalPosition,
  type ScreenStar,
} from '$view/stars';

const DEG = Math.PI / 180;
const byName = new Map<string, StarRow>();
for (const row of STARS) {
  const name = NAMED_STARS[row[0]];
  if (name) byName.set(name, row);
}
const star = (name: string): StarRow => {
  const row = byName.get(name);
  if (!row) throw new Error(`no ${name} in the catalogue`);
  return row;
};

/** deg — angular separation on the sphere from RA/Dec. */
function separation(a: StarRow, b: StarRow): number {
  const [, ra1, dec1] = a;
  const [, ra2, dec2] = b;
  const cos =
    Math.sin(dec1 * DEG) * Math.sin(dec2 * DEG) +
    Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.cos((ra1 - ra2) * DEG);
  return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG;
}

describe('the catalogue', () => {
  it('is the 320 brightest, sorted, and every named star is in it', () => {
    expect(STARS).toHaveLength(320);
    for (let i = 1; i < STARS.length; i++) expect(STARS[i]![3]).toBeGreaterThanOrEqual(STARS[i - 1]![3]);
    expect(STARS[0]![0]).toBe(2491); // Sirius
    expect(STARS[0]![3]).toBeCloseTo(-1.46, 2);
    for (const hr of Object.keys(NAMED_STARS)) {
      expect(STARS.some((r) => r[0] === Number(hr)), NAMED_STARS[Number(hr)]).toBe(true);
    }
  });

  it('has the sky in it: Polaris on the pole, the belt on the equator', () => {
    expect(star('Polaris')[2]).toBeGreaterThan(89);
    for (const name of ['Alnitak', 'Alnilam', 'Mintaka']) {
      expect(Math.abs(star(name)[2])).toBeLessThan(2.5);
    }
  });
});

describe('the asterisms are where they should be', () => {
  it("Orion's belt is three stars in a line, a degree and a half apart", () => {
    const [a, b, c] = [star('Mintaka'), star('Alnilam'), star('Alnitak')];
    expect(separation(a, b)).toBeGreaterThan(1.2);
    expect(separation(a, b)).toBeLessThan(1.6);
    expect(separation(b, c)).toBeGreaterThan(1.2);
    expect(separation(b, c)).toBeLessThan(1.6);
    // Collinear to within a tenth of a degree: the ends' separation is the sum.
    expect(separation(a, c)).toBeCloseTo(separation(a, b) + separation(b, c), 1);
  });

  it("the Plough's pointers point at Polaris, five pointer-lengths away", () => {
    const [merak, dubhe, polaris] = [star('Merak'), star('Dubhe'), star('Polaris')];
    const pointer = separation(merak, dubhe);
    expect(pointer).toBeGreaterThan(5);
    expect(pointer).toBeLessThan(5.7);
    const toPolaris = separation(dubhe, polaris);
    expect(toPolaris / pointer).toBeGreaterThan(4.8);
    expect(toPolaris / pointer).toBeLessThan(5.6);
    // And Merak–Dubhe–Polaris is nearly straight: the long way round is
    // nearly the sum of the two legs.
    expect(separation(merak, polaris)).toBeGreaterThan(toPolaris + pointer - 1.5);
  });

  it('the Southern Cross is a cross six degrees tall', () => {
    expect(separation(star('Acrux'), star('Gacrux'))).toBeGreaterThan(5.5);
    expect(separation(star('Acrux'), star('Gacrux'))).toBeLessThan(6.5);
    expect(separation(star('Mimosa'), star('Gacrux'))).toBeLessThan(5);
  });

  it('Mizar and Alioth and Alkaid make the handle', () => {
    expect(separation(star('Alioth'), star('Mizar'))).toBeLessThan(5);
    expect(separation(star('Mizar'), star('Alkaid'))).toBeLessThan(7.5);
  });
});

describe('placing them for StarBase', () => {
  const out: HorizontalPosition = { altitude: 0, azimuth: 0 };

  it('sidereal time IS the solar hour: the sun’s hour angle plus its right ascension', () => {
    // LST = (solarHour - 12) + 12 at the September equinox. The first version
    // ADDED the twelve, which is half a day, and this test pinned that — so
    // the check below is against the sky rather than against the formula.
    expect(localSiderealTime(0)).toBe(0);
    expect(localSiderealTime(9.5)).toBe(9.5);
    expect(localSiderealTime(21)).toBe(21);
    expect(localSiderealTime(24)).toBe(0);
  });

  it('and the proof is the Summer Triangle, high on a September evening', () => {
    // What anyone stepping outside at nine in late September sees: Vega and
    // Deneb near the zenith, Altair with them, and the spring sky gone. With
    // the twelve added, Vega and Deneb were BELOW the horizon and Regulus —
    // a March star — stood at 69 degrees. No formula test caught that.
    const alt = (name: string, hour: number) => {
      const [, ra, dec] = star(name);
      horizontal(ra, dec, localSiderealTime(hour), STARBASE_LATITUDE, out);
      return out.altitude / DEG;
    };
    expect(alt('Vega', 21)).toBeGreaterThan(50);
    expect(alt('Deneb', 21)).toBeGreaterThan(65);
    expect(alt('Altair', 21)).toBeGreaterThan(50);
    expect(alt('Regulus', 21)).toBeLessThan(0);
    // And in the small hours the winter sky has come round: Sirius is up.
    expect(alt('Sirius', 4)).toBeGreaterThan(20);
  });

  it('Polaris stands at the latitude, due north, at every hour', () => {
    const [, ra, dec] = star('Polaris');
    for (let h = 0; h < 24; h += 1.5) {
      horizontal(ra, dec, localSiderealTime(h), STARBASE_LATITUDE, out);
      expect(Math.abs(out.altitude - STARBASE_LATITUDE) / DEG, `${h}h`).toBeLessThan(0.8);
      expect(Math.abs(out.azimuth) / DEG, `${h}h`).toBeLessThan(2.5);
    }
  });

  it('a star on the observer’s declination passes through the zenith when it transits', () => {
    // Transit is hour angle zero: LST = RA.
    const lat = STARBASE_LATITUDE;
    horizontal(120, lat / DEG, 120 / 15, lat, out);
    expect(out.altitude / DEG).toBeCloseTo(90, 6);
  });

  it('a star rises in the east and sets in the west', () => {
    // Six hours before transit a star on the equator is on the horizon in the
    // east; six after, in the west.
    horizontal(180, 0, 180 / 15 - 6, STARBASE_LATITUDE, out);
    expect(out.altitude / DEG).toBeCloseTo(0, 6);
    expect(out.azimuth / DEG).toBeCloseTo(90, 6);
    horizontal(180, 0, 180 / 15 + 6, STARBASE_LATITUDE, out);
    expect(out.azimuth / DEG).toBeCloseTo(-90, 6);
  });

  it('the sun’s own declination-zero transit is due south at the latitude’s co-altitude', () => {
    horizontal(0, 0, 0, STARBASE_LATITUDE, out);
    expect(out.altitude / DEG).toBeCloseTo(90 - STARBASE_LATITUDE / DEG, 9);
    expect(Math.abs(out.azimuth) / DEG).toBeCloseTo(180, 9);
  });
});

describe('the projection', () => {
  const screen: ScreenStar = { x: 0, y: 0, radius: 0, alpha: 0, visible: false };

  it('puts north in the middle, east to the right, the horizon at its share', () => {
    projectStar({ altitude: 0, azimuth: 0 }, 1, 1280, 720, screen);
    expect(screen.visible).toBe(true);
    expect(screen.x).toBe(640);
    expect(screen.y).toBe(720 * STAR_HORIZON);
    projectStar({ altitude: 0.5, azimuth: 30 * DEG }, 1, 1280, 720, screen);
    expect(screen.x).toBeGreaterThan(640);
    expect(screen.y).toBeLessThan(720 * STAR_HORIZON);
    projectStar({ altitude: TOP_ALTITUDE_DEG * DEG, azimuth: 0 }, 1, 1280, 720, screen);
    expect(screen.y).toBeCloseTo(0, 9);
  });

  it('hides what is behind the viewer, below the horizon, or overhead', () => {
    const beyond = (halfFieldDeg(1280, 720) + 1) * DEG;
    projectStar({ altitude: 0.5, azimuth: beyond }, 1, 1280, 720, screen);
    expect(screen.visible).toBe(false);
    projectStar({ altitude: -0.01, azimuth: 0 }, 1, 1280, 720, screen);
    expect(screen.visible).toBe(false);
    projectStar({ altitude: (TOP_ALTITUDE_DEG + 1) * DEG, azimuth: 0 }, 1, 1280, 720, screen);
    expect(screen.visible).toBe(false);
  });

  it('brighter stars are bigger and more opaque', () => {
    projectStar({ altitude: 0.5, azimuth: 0 }, -1.4, 1280, 720, screen);
    const bright = { r: screen.radius, a: screen.alpha };
    projectStar({ altitude: 0.5, azimuth: 0 }, 3.5, 1280, 720, screen);
    expect(bright.r).toBeGreaterThan(screen.radius);
    expect(bright.a).toBeGreaterThan(screen.alpha);
    expect(screen.alpha).toBeGreaterThan(0);
  });

  it('at half past nine on the pad the northern sky holds Polaris and a hundred others, and turns', () => {
    // Measured across the whole day at half-hour steps on a 1280x720 frame:
    // 59 at fewest, 68 typical, 76 at most. That is the right order — the
    // frame shows about a fifth of the sphere (180 degrees of azimuth by 70
    // of altitude) — and it is what makes the northern field a SKY rather
    // than a scattering: seventy naked-eye stars is what one looks like.
    const morning = placeStars(9.5, 1280, 720);
    expect(morning.length).toBeGreaterThan(50);
    expect(morning.length).toBeLessThan(90);
    // Polaris is in every frame, at the same place.
    const [, ra, dec] = star('Polaris');
    const p: HorizontalPosition = { altitude: 0, azimuth: 0 };
    horizontal(ra, dec, localSiderealTime(9.5), STARBASE_LATITUDE, p);
    projectStar(p, 2, 1280, 720, screen);
    expect(screen.visible).toBe(true);
    expect(Math.abs(screen.x - 640)).toBeLessThan(25);
    // An hour later the field has turned: a different set, not the same picture.
    const later = placeStars(10.5, 1280, 720);
    const moved = morning.filter((a, i) => !later[i] || Math.abs(later[i]!.x - a.x) > 1).length;
    expect(moved).toBeGreaterThan(morning.length * 0.5);
  });
});

describe('an asterism is in the right place ON SCREEN, not only in the catalogue', () => {
  /**
   * The acceptance line asks that named asterisms be where they should be, and
   * the separations above are a fact about the catalogue rather than about the
   * picture. This is the picture: the Plough projected onto a frame, at an
   * hour when it is up, checked for the thing anyone who has found Polaris
   * once knows — the two pointers at the bowl's end aim at it, and it is five
   * of their lengths away, up and to the north.
   */
  const project = (name: string, hour: number, width = 1280, height = 720) => {
    const [, ra, dec, mag] = star(name);
    const p: HorizontalPosition = { altitude: 0, azimuth: 0 };
    horizontal(ra, dec, localSiderealTime(hour), STARBASE_LATITUDE, p);
    const s: ScreenStar = { x: 0, y: 0, radius: 0, alpha: 0, visible: false };
    projectStar(p, mag, width, height, s);
    return s;
  };

  it('the whole Plough is in frame together, through the whole working day', () => {
    // Circumpolar at this latitude, so it is up at every hour; all seven are
    // inside the field from 06:00 to 20:00, which is measured rather than
    // assumed (a probe over every hour).
    for (const hour of [6, 9, 12, 15, 18, 20]) {
      for (const name of ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid']) {
        expect(project(name, hour).visible, `${name} at ${hour}h`).toBe(true);
      }
    }
  });

  it('and its pointers aim at Polaris across the frame, five lengths away', () => {
    const merak = project('Merak', 9);
    const dubhe = project('Dubhe', 9);
    const polaris = project('Polaris', 9);
    // The pointer, on screen, from the bowl's far star to its near one.
    const px = dubhe.x - merak.x;
    const py = dubhe.y - merak.y;
    const tx = polaris.x - dubhe.x;
    const ty = polaris.y - dubhe.y;
    const pointer = Math.hypot(px, py);
    const toPolaris = Math.hypot(tx, ty);
    // Same direction: the angle between the pointer and the line on to
    // Polaris is small. The projection is azimuth-linear rather than
    // gnomonic, so it is not zero — thirty degrees is the bound, and a
    // wrong-way asterism would be a hundred and eighty.
    const cos = (px * tx + py * ty) / (pointer * toPolaris);
    expect(cos, `pointer ${pointer.toFixed(0)} px, to Polaris ${toPolaris.toFixed(0)} px`).toBeGreaterThan(
      Math.cos(30 * DEG),
    );
    // And the distance is about five pointers, as it is in the sky.
    expect(toPolaris / pointer).toBeGreaterThan(3.5);
    expect(toPolaris / pointer).toBeLessThan(7);
  });

  it('Polaris holds one height in the frame all night, while the Plough swings around it', () => {
    // The thing that makes Polaris Polaris, as a screen fact. An earlier
    // version of this asserted Polaris sat ABOVE the bowl, which is false at
    // 21:00 — the Plough is over the pole then, at 51 degrees against
    // Polaris's 26 — and the test said so before the picture had to.
    const hours = [6, 9, 12, 15, 18, 20];
    const polarisY = hours.map((h) => project('Polaris', h).y);
    const dubheY = hours.map((h) => project('Dubhe', h).y);
    for (const y of polarisY) expect(Math.abs(y - polarisY[0]!)).toBeLessThan(10);
    expect(Math.max(...dubheY) - Math.min(...dubheY)).toBeGreaterThan(100);
  });

  it('Orion is NOT in frame — it is behind the viewer, which is the honest half of this', () => {
    // The side view faces north, so the winter sky the eye most wants is at
    // the observer's back. Saying so in a test stops a later session
    // "fixing" the absence by rotating the field.
    for (const hour of [9, 12, 15, 18]) {
      for (const name of ['Alnitak', 'Alnilam', 'Mintaka']) {
        expect(project(name, hour).visible, `${name} at ${hour}h`).toBe(false);
      }
    }
  });
});

describe('the projection keeps shapes, whatever the frame — M11.7 review', () => {
  it('is isotropic: the same pixels per degree across and up', () => {
    const at = (az: number, alt: number, w: number, h: number) => {
      const s: ScreenStar = { x: 0, y: 0, radius: 0, alpha: 0, visible: false };
      projectStar({ altitude: alt * DEG, azimuth: az * DEG }, 1, w, h, s);
      return s;
    };
    for (const [w, h] of [
      [1280, 720],
      [390, 844],
      [844, 390],
    ] as const) {
      const origin = at(0, 10, w, h);
      const across = at(10, 10, w, h);
      const up = at(0, 20, w, h);
      const perDegX = (across.x - origin.x) / 10;
      const perDegY = (origin.y - up.y) / 10;
      expect(perDegX, `${w}x${h}`).toBeCloseTo(perDegY, 9);
    }
  });

  it('so a wide window sees more sky either side of north, and a narrow one less', () => {
    expect(halfFieldDeg(1280, 720)).toBeGreaterThan(halfFieldDeg(390, 844));
    // And never round the back of the observer.
    expect(halfFieldDeg(4000, 400)).toBeLessThanOrEqual(MAX_AZIMUTH_DEG);
  });

  it('and the Plough keeps its proportions on every frame wide enough to hold it', () => {
    // The shear the isotropic projection removes: the bowl's diagonal over
    // the pointer's length is a property of the sky, so it must be the same
    // number on every screen that shows the whole thing. A portrait phone
    // shows a 26-degree slice and does NOT — the asterism runs off the side,
    // which is what a narrow window looking north does, and is asserted
    // below rather than papered over.
    const shape = (w: number, h: number) => {
      const place = (name: string) => {
        const [, ra, dec, mag] = star(name);
        const p: HorizontalPosition = { altitude: 0, azimuth: 0 };
        horizontal(ra, dec, localSiderealTime(9), STARBASE_LATITUDE, p);
        const s: ScreenStar = { x: 0, y: 0, radius: 0, alpha: 0, visible: false };
        projectStar(p, mag, w, h, s);
        return s;
      };
      const merak = place('Merak');
      const dubhe = place('Dubhe');
      const alkaid = place('Alkaid');
      return Math.hypot(alkaid.x - merak.x, alkaid.y - merak.y) /
        Math.hypot(dubhe.x - merak.x, dubhe.y - merak.y);
    };
    expect(shape(1280, 720)).toBeCloseTo(shape(844, 390), 9);
    expect(shape(1280, 720)).toBeCloseTo(shape(2560, 1440), 9);
  });

  it('a portrait phone shows a narrow slice, and says so by hiding what runs off it', () => {
    const visible = (name: string, w: number, h: number) => {
      const [, ra, dec, mag] = star(name);
      const p: HorizontalPosition = { altitude: 0, azimuth: 0 };
      horizontal(ra, dec, localSiderealTime(9), STARBASE_LATITUDE, p);
      const s: ScreenStar = { x: 0, y: 0, radius: 0, alpha: 0, visible: false };
      projectStar(p, mag, w, h, s);
      return s.visible;
    };
    expect(halfFieldDeg(390, 844)).toBeLessThan(30);
    // Polaris is due north, so it survives any slice; the handle's far end
    // does not.
    expect(visible('Polaris', 390, 844)).toBe(true);
    expect(visible('Alkaid', 390, 844)).toBe(false);
    expect(visible('Alkaid', 1280, 720)).toBe(true);
  });
});
