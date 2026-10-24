import { describe, expect, it } from 'vitest';
import { createVehicleGeometry, geometryPointInBodyFrame, V3_PROJECTION } from '$view/vehicle-geometry';

const shipInput = { id: 'ship' as const, height: 52, diameter: 9 };
const boosterInput = { id: 'super-heavy' as const, height: 72, diameter: 9 };

describe('original V3 component geometry in metres', () => {
  it('keeps source-bracket flap roots around supplied inherited physical pivots and restrained booster hardware on original pieces', () => {
    const ship = createVehicleGeometry({ ...shipInput, frontFinStation: 52 * .902, aftFinStation: 52 * .184 });
    for (const c of ship.components.filter(c => c.kind === 'flap')) {
      const stations = c.polygons[0]!.points.map(p => p.station / 52);
      const front = c.id.includes('front');
      expect(Math.min(...stations)).toBeCloseTo(front ? .8 : .015);
      expect(Math.max(...stations)).toBeCloseTo(front ? .94 : .30);
      expect(c.station).toBe(front ? 52 * .902 : 52 * .184);
    }
    const booster = createVehicleGeometry(boosterInput);
    expect(booster.components).toHaveLength(7);
    expect(booster.components.filter(c => c.kind === 'grid-fin').every(c => c.polygons.some(p => p.id.endsWith('-collar')))).toBe(true);
    const surfaces = booster.components.flatMap(c => c.polygons);
    expect(surfaces.some(p => p.id.includes('raceway'))).toBe(true);
    expect(surfaces.filter(p => p.id.includes('strake'))).toHaveLength(2);
    const crown = booster.components.find(c => c.kind === 'hot-stage')!;
    expect(new Set(crown.polygons.map(p => p.depth)).size).toBeGreaterThan(2);
  });
  it('keeps the published dimensional frame, unequal four-flap topology and curved nose', () => {
    const ship = createVehicleGeometry(shipInput);
    expect(ship.height).toBe(52);
    expect(ship.diameter).toBe(9);
    expect(ship.components.filter(c => c.kind === 'flap')).toHaveLength(4);
    const front = ship.components.find(c => c.id === 'ship-front-flap-left')!;
    const aft = ship.components.find(c => c.id === 'ship-aft-flap-left')!;
    const extent = (c: typeof front) => {
      const s = c.polygons.flatMap(p => p.points.map(v => v.station));
      return Math.max(...s) - Math.min(...s);
    };
    expect(extent(aft)).toBeGreaterThan(extent(front) * 1.5);
    expect(front.station / ship.height).toBeGreaterThanOrEqual(0.8);
    expect(front.station / ship.height).toBeLessThanOrEqual(0.94);
    expect(aft.station / ship.height).toBeGreaterThanOrEqual(0.01);
    expect(aft.station / ship.height).toBeLessThanOrEqual(0.3);
    const nose = ship.components.find(c => c.kind === 'nose')!;
    expect(nose.polygons[0]!.points.length).toBeGreaterThan(6);
    expect(Math.max(...nose.polygons[0]!.points.map(v => v.station))).toBe(52);
    expect(Math.min(...nose.polygons[0]!.points.map(v => v.station))).toBeCloseTo(52 * 0.74);
  });

  it('keeps TPS as surface patches belonging to structure, with a visible steel boundary', () => {
    const ship = createVehicleGeometry(shipInput);
    const barrel = ship.components.find(c => c.id === 'ship-hull-forward')!;
    const steel = barrel.polygons.find(p => p.material === 'steel')!;
    const tile = barrel.polygons.find(p => p.material === 'tile')!;
    expect(steel).toBeDefined(); expect(tile).toBeDefined();
    expect(Math.max(...tile.points.map(p => p.x))).toBeLessThan(Math.max(...steel.points.map(p => p.x)));
    expect(Math.min(...tile.points.map(p => p.x))).toBeGreaterThan(Math.min(...steel.points.map(p => p.x)));
    expect(ship.components.some(c => c.id.includes('tile'))).toBe(false);
    const aftTile = ship.components.find(c => c.id === 'ship-hull-aft')!.polygons.find(p => p.material === 'tile')!;
    const join = 52 * 0.3;
    expect(aftTile.points.filter(p => p.station === join).map(p => p.x).sort((a, b) => a - b))
      .toEqual(tile.points.filter(p => p.station === join).map(p => p.x).sort((a, b) => a - b));
  });

  it('projects exactly three individually identified grids and a retained open crown/dome without a skirt', () => {
    const booster = createVehicleGeometry(boosterInput);
    const grids = booster.components.filter(c => c.kind === 'grid-fin');
    expect(grids.map(c => c.id).sort()).toEqual(['booster-grid-0', 'booster-grid-1', 'booster-grid-2']);
    expect(new Set(grids.map(c => c.depth)).size).toBe(3);
    expect(grids.every(c => c.station >= 0.85 * 72 && c.station <= 0.94 * 72)).toBe(true);
    const crown = booster.components.find(c => c.id === 'booster-hot-stage')!;
    expect(crown.retainedAfterStaging).toBe(true);
    expect(crown.polygons.length).toBeGreaterThan(4);
    expect(crown.polygons.every(p => p.material === 'steel')).toBe(true);
    const dome = booster.components.flatMap(c => c.polygons).find(p => p.id === 'booster-dome')!;
    expect(dome.points.length).toBeGreaterThan(6);
    expect(booster.components.some(c => c.id.includes('skirt'))).toBe(false);
    const crownArea = crown.polygons.reduce((sum, p) => sum + Math.abs(p.points.reduce((a, v, i) => {
      const next = p.points[(i + 1) % p.points.length]!;
      return a + v.x * next.station - next.x * v.station;
    }, 0)) / 2, 0);
    expect(crownArea).toBeLessThan(9 * 72 * 0.05 * 0.5);
  });

  it.each([shipInput, boosterInput])('keeps every engine bell on the single support component for $id', input => {
    const g = createVehicleGeometry(input);
    expect(g.components).toHaveLength(input.id === 'ship' ? 8 : 7);
    const support = g.components.find(c => c.kind === 'engine-support')!;
    const shells = support.polygons.filter(p => p.surfaceRole === 'bell-shell');
    expect(shells).toHaveLength(input.id === 'ship' ? 6 : 33);
    expect(new Set(shells.map(p => p.engineIndex)).size).toBe(shells.length);
    expect(new Set(shells.map(p => p.depth)).size).toBeGreaterThan(2);
    expect(shells.every(p => p.normalMode === 'nozzle')).toBe(true);
    if (input.id === 'ship') {
      const span = (p: typeof shells[number]) => Math.max(...p.points.map(v => v.x)) - Math.min(...p.points.map(v => v.x));
      const sl = shells.filter(p => p.engineKind === 'sea-level'), rv = shells.filter(p => p.engineKind === 'vacuum');
      expect(sl).toHaveLength(3); expect(rv).toHaveLength(3);
      expect(span(sl[0]!)).toBeCloseTo(1.3); expect(span(rv[0]!)).toBeCloseTo(2.3);
    }
    const rim = support.polygons.find(p => p.surfaceRole === 'engine-rim')!;
    expect(rim.depth).toBeGreaterThan(Math.max(...shells.map(p => p.depth)));
    expect(Math.min(...rim.points.map(v => v.station))).toBeGreaterThan(0);
    expect(shells.every(p => Math.min(...p.points.map(v => v.station)) < Math.min(...rim.points.map(v => v.station)))).toBe(true);
  });

  it.each([shipInput, boosterInput])('owns finite immutable startup data with stable IDs for $id', input => {
    const g = createVehicleGeometry(input);
    const next = createVehicleGeometry(input);
    expect(next).toEqual(g);
    expect(new Set(g.components.map(c => c.id)).size).toBe(g.components.length);
    expect(g.components.length).toBeLessThanOrEqual(12);
    expect(Object.isFrozen(g)).toBe(true);
    expect(Object.isFrozen(g.components)).toBe(true);
    const depths = g.components.map(c => c.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    for (const c of g.components) {
      expect(Object.isFrozen(c)).toBe(true); expect(Object.isFrozen(c.polygons)).toBe(true);
      for (const polygon of c.polygons) {
        expect(Object.isFrozen(polygon)).toBe(true); expect(Object.isFrozen(polygon.points)).toBe(true);
        expect(polygon.points.length).toBeGreaterThanOrEqual(3);
        for (const point of polygon.points) {
          expect(Object.isFrozen(point)).toBe(true);
          expect(Number.isFinite(point.x + point.station)).toBe(true);
          expect(point.station).toBeGreaterThanOrEqual(0);
          expect(point.station).toBeLessThanOrEqual(input.height);
        }
      }
    }
  });

  it('uses supplied physical engine mounts without changing the catalogue or input', () => {
    const engines = [-1, 0.5, 0.5, -3, 1.5, 1.5].map((offAxis, i) => Object.freeze({
      kind: i < 3 ? 'sea-level' as const : 'vacuum' as const, offAxis, depth: i * 0.1,
    }));
    const before = engines.map(e => ({ ...e }));
    const g = createVehicleGeometry({ ...shipInput, engines });
    const shells = g.components.find(c => c.kind === 'engine-support')!.polygons.filter(p => p.surfaceRole === 'bell-shell');
    for (const p of shells) {
      const mount = engines[p.engineIndex!]!;
      const xs = p.points.map(v => v.x);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(mount.offAxis);
      expect(p.depth).toBe(mount.depth);
    }
    expect(engines).toEqual(before);
    expect(() => createVehicleGeometry({ ...shipInput, engines: engines.slice(1) })).toThrow(RangeError);
    expect(() => createVehicleGeometry({ ...shipInput, engines: engines.map(e => ({ ...e, offAxis: NaN })) })).toThrow(RangeError);
  });

  it('scales physical units coherently and preserves the centred image-y convention', () => {
    const small = createVehicleGeometry(shipInput);
    const large = createVehicleGeometry({ ...shipInput, height: 104, diameter: 18 });
    for (let i = 0; i < small.components.length; i++) {
      const a = small.components[i]!, b = large.components[i]!;
      expect(b.id).toBe(a.id); expect(b.station).toBeCloseTo(a.station * 2);
      for (let j = 0; j < a.polygons.length; j++) for (let k = 0; k < a.polygons[j]!.points.length; k++) {
        const p = a.polygons[j]!.points[k]!, q = b.polygons[j]!.points[k]!;
        expect(q.x).toBeCloseTo(p.x * 2); expect(q.station).toBeCloseTo(p.station * 2);
      }
    }
    const out = { x: 0, y: 0 };
    expect(geometryPointInBodyFrame({ x: 4.5, station: 52 }, 52, out)).toBe(out);
    expect(out).toEqual({ x: 4.5, y: -26 });
    geometryPointInBodyFrame({ x: 0, station: 0 }, 52, out);
    expect(out.y).toBe(26);
    expect(V3_PROJECTION.azimuthRadians).toBeCloseTo(20 * Math.PI / 180);
    expect(V3_PROJECTION.perspective).toBe(false);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid physical dimensions %s', value => {
    expect(() => createVehicleGeometry({ ...shipInput, height: value })).toThrow(RangeError);
    expect(() => createVehicleGeometry({ ...shipInput, diameter: value })).toThrow(RangeError);
  });
});
