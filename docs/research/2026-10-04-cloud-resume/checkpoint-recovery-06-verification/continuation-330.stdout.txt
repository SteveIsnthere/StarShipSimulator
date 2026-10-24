/** Original V3 geometry, authored after inspecting the official S39 belly,
 * May11 stack, B19 crown and NASA V3 model photographs. Provenance/ranges:
 * docs/research/2026-10-03-vehicle-realism/v3-source-audit.md.
 *
 * Only hull dimensions come from the supplied physical model. Profile points,
 * stations, fin clocking, spans, dome and TPS boundary are visual estimates,
 * not manufacturer geometry or aerodynamic/fracture measurements. Everything
 * uses metres: station rises from the engine-plane end; depth faces the viewer.
 * Pitch remains a 2D physical rotation. This fixed orthographic20° belly view
 * adds authored depth, never a simulated roll/yaw or perspective camera.
 * Construct once per physical definition, reuse for attached/detached/inset.
 */

export const V3_PROJECTION = Object.freeze({
  azimuthRadians: 20 * Math.PI / 180,
  perspective: false,
});

/** Midpoints chosen inside the broad inspected-photo brackets, not metrology.
 * The actual physical actuator catalogue may override these starting stations. */
export const V3_AUTHORED_STATIONS = Object.freeze({
  frontFlap: 0.87,
  aftFlap: 0.15,
  gridFin: 0.90,
  noseBase: 0.74,
  crownBase: 0.95,
});

export type GeometryMaterial = 'steel' | 'tile' | 'grid';
export type GeometryKind = 'hull' | 'nose' | 'flap' | 'grid-fin' | 'hot-stage' | 'engine-support';
export interface GeometryPoint {
  readonly x: number;
  /** Axial station, except grid face/edge reference points: their offset from
   * the hinge encodes tangential chord before radial articulation projection. */
  readonly station: number;
}
export interface ComponentPolygon {
  readonly id: string;
  readonly material: GeometryMaterial;
  /** Metres toward viewer; sort surface patches back to front across components. */
  readonly depth: number;
  readonly normalMode: 'cylinder' | 'nose' | 'nozzle' | 'dome' | 'flat';
  /** Bell surfaces remain part of the one substantial engine-support body. */
  readonly engineIndex?: number;
  readonly engineKind?: 'sea-level' | 'vacuum';
  readonly surfaceRole?: 'bell-shell' | 'bell-mouth' | 'bell-lip' | 'engine-rim' | 'grid-face' | 'grid-edge' | 'grid-collar';
  /** Body-local coordinates, not coordinates relative to the attachment pivot. */
  readonly points: readonly GeometryPoint[];
}
export interface VehicleGeometryComponent {
  /** Stable physical identity; surface patches do not create another component. */
  readonly id: string;
  readonly kind: GeometryKind;
  readonly material: GeometryMaterial;
  /** Attachment pivot in body-local physical units. */
  readonly x: number;
  readonly station: number;
  readonly depth: number;
  readonly retainedAfterStaging: boolean;
  readonly polygons: readonly ComponentPolygon[];
}
export interface VehicleGeometryInput {
  readonly id: 'ship' | 'super-heavy';
  readonly height: number;
  readonly diameter: number;
  /** Optional physical stations, metres above engine plane. */
  readonly frontFinStation?: number;
  readonly aftFinStation?: number;
  readonly gridFinStation?: number;
  /** Physical projected mounts; authored depth may be provided separately. */
  readonly engines?: readonly { readonly kind: 'sea-level' | 'vacuum'; readonly offAxis: number; readonly depth?: number }[];
}
export interface VehicleGeometry {
  readonly id: VehicleGeometryInput['id'];
  readonly height: number;
  readonly diameter: number;
  readonly projection: typeof V3_PROJECTION;
  /** Components sorted by pivot depth. Polygons retain their own surface depth. */
  readonly components: readonly VehicleGeometryComponent[];
}

type Pair = readonly [x: number, station: number];
function polygon(id: string, material: GeometryMaterial, depth: number,
  points: readonly Pair[], normalMode: ComponentPolygon['normalMode'] = 'flat'): ComponentPolygon {
  return Object.freeze({ id, material, depth, normalMode,
    points: Object.freeze(points.map(([x, station]) => Object.freeze({ x, station }))) });
}
function rectangle(id: string, material: GeometryMaterial, depth: number,
  left: number, right: number, bottom: number, top: number,
  normalMode: ComponentPolygon['normalMode'] = 'flat'): ComponentPolygon {
  return polygon(id, material, depth, [[left, bottom], [right, bottom], [right, top], [left, top]], normalMode);
}
function component(id: string, kind: GeometryKind, material: GeometryMaterial,
  x: number, station: number, depth: number, polygons: readonly ComponentPolygon[]): VehicleGeometryComponent {
  return Object.freeze({ id, kind, material, x, station, depth,
    retainedAfterStaging: true, polygons: Object.freeze(polygons) });
}

/** Inherited nozzle depiction assumptions, not newly measured V3 nozzle exits.
 * SL1.3m is the retained render assumption (published engine envelope is not
 * an exit measurement); RVac2.3m is the inherited TierB exit assumption.
 * NASA V3 engine-end photographs support separate exposed tapered bells and
 * concentric clustering, not these exact lengths or ring clocks. */
const BELL_DIAMETER = { 'sea-level': 1.3, vacuum: 2.3 } as const;

function engineSupport(input: VehicleGeometryInput, topFraction: number): VehicleGeometryComponent {
  const { height: h, diameter: d } = input, scale = d / 9, prefix = input.id === 'ship' ? 'ship' : 'booster';
  const count = input.id === 'ship' ? 6 : 33;
  if (input.engines && input.engines.length !== count) throw new RangeError('V3 engine geometry inventory must match its physical model');
  const surfaces: ComponentPolygon[] = [];
  for (let i = 0; i < count; i++) {
    let kind: 'sea-level' | 'vacuum' = 'sea-level';
    let x: number, depth: number;
    if (input.id === 'ship') {
      kind = i < 3 ? 'sea-level' : 'vacuum';
      const radius = (i < 3 ? 1 : 3) * scale;
      // Existing physical projected x positions: -r,+r/2,+r/2. The sine
      // complement adds authored depth, without rotating force/emitter mounts.
      const angle = Math.PI + (i % 3) * 2 * Math.PI / 3;
      x = radius * Math.cos(angle); depth = radius * Math.sin(angle);
    } else if (i < 3) {
      x = [0, -0.65, 0.65][i]! * scale;
      depth = [0, -0.35, 0.35][i]! * scale;
    } else {
      const inner = i < 13, radius = (inner ? 2 : 3.8) * scale;
      const angle = 2 * Math.PI * (i - (inner ? 3 : 13)) / (inner ? 10 : 20);
      x = radius * Math.cos(angle); depth = radius * Math.sin(angle);
    }
    const physical = input.engines?.[i];
    if (physical) { kind = physical.kind; x = physical.offAxis; depth = physical.depth ?? depth; }
    if (!Number.isFinite(x + depth)) throw new RangeError('engine geometry mounts require finite physical coordinates');
    const radius = BELL_DIAMETER[kind] * scale / 2;
    // Exits stay at station0, shared with the actual exhaust origin. Throats
    // fit inside the support envelope, so no bell paints onto the tank barrel.
    const length = Math.min((kind === 'vacuum' ? 2.05 : 1.55) * scale, h * topFraction * 0.97);
    const shell: Pair[] = [
      [x - radius, 0], [x + radius, 0], [x + radius * 0.72, length * 0.35],
      [x + radius * 0.42, length * 0.72], [x + radius * 0.28, length],
      [x - radius * 0.28, length], [x - radius * 0.42, length * 0.72], [x - radius * 0.72, length * 0.35],
    ];
    const id = `${prefix}-engine-${i}`;
    const surface = (role: 'bell-shell' | 'bell-mouth' | 'bell-lip', points: Pair[], z: number) => Object.freeze({
      ...polygon(`${id}-${role}`, 'steel', z, points, role === 'bell-shell' ? 'nozzle' : 'flat'), engineIndex: i, engineKind: kind, surfaceRole: role,
    });
    surfaces.push(surface('bell-shell', shell, depth));
    // Orthographic side view: an edge-on opening, never33 full face-on circles.
    // A small flattened lip/inside shape preserves a recognizable hollow bell.
    for (const mouth of [false, true]) {
      const points: Pair[] = [], lipHeight = radius * 0.16;
      for (let j = 0; j < 12; j++) {
        const a = j * 2 * Math.PI / 12, gain = mouth ? 0.80 : 0.98;
        points.push([x + radius * gain * Math.cos(a), lipHeight + lipHeight * gain * Math.sin(a)]);
      }
      surfaces.push(surface(mouth ? 'bell-mouth' : 'bell-lip', points, depth + (mouth ? 0.002 : 0.001) * scale));
    }
  }
  // Shallow front rim occludes the upper throats of far/near bells equally;
  // exits remain exposed below it. No enclosing engine skirt/base shield.
  const rim = Object.freeze({ ...rectangle(`${prefix}-engine-rim`, 'steel', d / 2,
    -d / 2, d / 2, h * topFraction * 0.70, h * topFraction, 'cylinder'), surfaceRole: 'engine-rim' as const });
  surfaces.push(rim);
  surfaces.sort((a, b) => a.depth - b.depth);
  return component(`${prefix}-engine-support`, 'engine-support', 'steel', 0, h * topFraction / 2, 0, surfaces);
}

/** Original curved taper control points: station/height and radius/hull-radius.
 * It is continuous with the barrel; no cone/cylinder seam or pin-sharp triangle. */
const NOSE_PROFILE: readonly Pair[] = Object.freeze([
  [1, 0.74], [0.99, 0.79], [0.93, 0.84], [0.83, 0.88], [0.69, 0.915],
  [0.53, 0.945], [0.36, 0.968], [0.19, 0.987], [0.07, 0.997], [0, 1],
].map(([x, station]) => Object.freeze([x!, station!] as const)));

function shipGeometry(input: VehicleGeometryInput): VehicleGeometryComponent[] {
  const { height: h, diameter: d } = input, r = d / 2;
  const components: VehicleGeometryComponent[] = [];
  const noseOutline: Pair[] = NOSE_PROFILE.map(([radius, station]) => [-radius * r, station * h]);
  noseOutline.push(...NOSE_PROFILE.slice(0, -1).reverse().map(([radius, station]): Pair => [radius * r, station * h]));
  // The belly covers most of this azimuth; retain a narrow metal boundary.
  // This authored outline is not a hemispheric physical heat/damage law.
  const tileNose: Pair[] = NOSE_PROFILE.map(([radius, station]) => [-radius * r * 0.96, station * h]);
  tileNose.push(...NOSE_PROFILE.slice(0, -1).reverse().map(([radius, station]): Pair => [radius * r * Math.cos(V3_PROJECTION.azimuthRadians), station * h]));
  components.push(component('ship-nose', 'nose', 'steel', 0, h * 0.87, 0, [
    polygon('ship-nose-steel', 'steel', 0, noseOutline, 'nose'),
    polygon('ship-nose-tps', 'tile', 0.01 * d, tileNose, 'nose'),
  ]));
  // Assumed hemispheric wrap viewed20° off belly; S39 supports a narrow steel
  // edge, not the earlier wide straight grey strip. Wrap extent is unmeasured.
  const tileBoundary = (stationFraction: number) => r * (Math.cos(V3_PROJECTION.azimuthRadians)
    - 0.02 * (V3_AUTHORED_STATIONS.noseBase - stationFraction) / (V3_AUTHORED_STATIONS.noseBase - 0.035));
  for (const [id, bottom, top] of [
    ['ship-hull-forward', 0.3, V3_AUTHORED_STATIONS.noseBase],
    ['ship-hull-aft', 0.035, 0.3],
  ] as const) components.push(component(id, 'hull', 'steel', 0, (bottom + top) * h / 2, 0, [
    rectangle(`${id}-steel`, 'steel', 0, -r, r, bottom * h, top * h, 'cylinder'),
    // A small variation through the aft barrel avoids an artificial straight
    // half-cylinder split; material patches stay with their structural section.
    polygon(`${id}-tps`, 'tile', d * 0.01, [
      [-r * 0.96, bottom * h], [tileBoundary(bottom), bottom * h],
      [tileBoundary(top), top * h], [-r * 0.96, top * h],
    ], 'cylinder'),
  ]));
  components.push(engineSupport(input, 0.035));
  for (const front of [true, false]) for (const side of [-1, 1]) {
    const station = front ? input.frontFinStation ?? h * V3_AUTHORED_STATIONS.frontFlap
      : input.aftFinStation ?? h * V3_AUTHORED_STATIONS.aftFlap;
    // Photo-bracket endpoints do not imply that an inherited physical hinge
    // sits at their midpoint. Keep that pivot while authoring asymmetric roots.
    const lower = h * (front ? .80 : .015), upper = h * (front ? .94 : .30);
    const rootLength = upper - lower;
    // One far and one near face per pair. Span estimates are bounded by the
    // inspected0.3–0.6D projection bracket; not physical fin reference areas.
    const depth = side * d * 0.075, span = d * (front ? 0.34 : 0.46) * (side < 0 ? 0.78 : 1);
    const x = side * r * 0.94;
    const id = `ship-${front ? 'front' : 'aft'}-flap-${side < 0 ? 'left' : 'right'}`;
    const points: Pair[] = [[x, upper], [x + side * span, lower + rootLength * 0.67],
      [x + side * span * 0.94, lower + rootLength * 0.07], [x, lower]];
    components.push(component(id, 'flap', 'tile', x, station, depth, [polygon(`${id}-face`, 'tile', depth, points)]));
  }
  return components;
}

function beam(id: string, a: Pair, b: Pair, width: number, depth: number): ComponentPolygon {
  const dx = b[0] - a[0], ds = b[1] - a[1], length = Math.hypot(dx, ds);
  const x = -ds / length * width / 2, s = dx / length * width / 2;
  return polygon(id, 'steel', depth, [[a[0] + x, a[1] + s], [a[0] - x, a[1] - s],
    [b[0] - x, b[1] - s], [b[0] + x, b[1] + s]]);
}

function boosterGeometry(input: VehicleGeometryInput): VehicleGeometryComponent[] {
  const { height: h, diameter: d } = input, r = d / 2, crownBase = h * V3_AUTHORED_STATIONS.crownBase;
  const components: VehicleGeometryComponent[] = [];
  const dome: Pair[] = [[-r, crownBase]];
  // Dome stays inside the open crown and the published booster envelope.
  for (let i = 1; i < 12; i++) {
    const angle = Math.PI - i * Math.PI / 12;
    dome.push([r * Math.cos(angle), crownBase + d * 0.26 * Math.sin(angle)]);
  }
  dome.push([r, crownBase]);
  components.push(component('booster-hull-forward', 'hull', 'steel', 0, h * 0.725, 0, [
    rectangle('booster-forward-wall', 'steel', 0, -r, r, h * 0.5, crownBase, 'cylinder'),
    polygon('booster-dome', 'steel', 0, dome, 'dome'),
    rectangle('booster-raceway-forward', 'steel', d * .48, r * .78, r * .84, h * .5, crownBase),
  ]));
  components.push(component('booster-hull-aft', 'hull', 'steel', 0, h * 0.265, 0, [
    rectangle('booster-aft-wall', 'steel', 0, -r, r, h * 0.03, h * 0.5, 'cylinder'),
    rectangle('booster-raceway-aft', 'steel', d * .48, r * .78, r * .84, h * .08, h * .5),
    // NASA external-model strakes; short silhouette only, not target decals.
    ...[-1, 1].map(side => polygon(`booster-strake-${side}`, 'steel', d * .01,
      [[side * r, h * .05], [side * (r + d * .055), h * .06], [side * r, h * .20]])),
  ]));
  components.push(engineSupport(input, 0.03));
  const crown: ComponentPolygon[] = [];
  const width = d * 0.014, ringWidth = d * .028, top = h - ringWidth, bottom = crownBase + width / 2;
  // Original circumferential projection: wide centre bays and compressed flank
  // bays, rather than an evenly spaced flat fence. Ring depth/section estimates
  // come from B19; no attempt to turn the factory camera into flight geometry.
  crown.push(rectangle('booster-crown-top', 'steel', r, -r, r, top, h, 'cylinder'),
    rectangle('booster-crown-bottom', 'steel', r, -r, r, crownBase, crownBase + width, 'cylinder'));
  for (let i = 0; i < 6; i++) {
    const a0 = -Math.PI / 2 + Math.PI * i / 6, a1 = a0 + Math.PI / 6;
    const x0 = r * Math.sin(a0), x1 = r * Math.sin(a1), mid = r * Math.sin((a0 + a1) / 2);
    const depth = r * Math.cos((a0 + a1) / 2);
    crown.push(beam(`booster-crown-brace-${i}-up`, [x0, bottom], [mid, top], width, depth),
      beam(`booster-crown-brace-${i}-down`, [mid, top], [x1, bottom], width, depth));
  }
  components.push(component('booster-hot-stage', 'hot-stage', 'steel', 0, (h + crownBase) / 2, d * 0.06, crown));
  // Equal120° clock spacing is an authored projection assumption; images
  // establish three fins, not precise clock angles. No fourth hidden fin.
  for (let i = 0; i < 3; i++) {
    const angle = V3_PROJECTION.azimuthRadians + i * 2 * Math.PI / 3;
    const radial = Math.sin(angle), depth = r * Math.cos(angle), x = r * radial;
    const station = input.gridFinStation ?? h * V3_AUTHORED_STATIONS.gridFin;
    const reach = d * 0.46 * radial, halfChord = d * 0.18;
    const id = `booster-grid-${i}`;
    // Scalloped outboard boundary; actual lattice is material detail at
    // resolved LOD, not hundreds of individual geometry components.
    const points: Pair[] = [[x, station + halfChord], [x + reach * 0.86, station + halfChord],
      [x + reach, station + halfChord * 0.7], [x + reach * 0.94, station + halfChord * 0.35],
      [x + reach, station], [x + reach * 0.94, station - halfChord * 0.35],
      [x + reach, station - halfChord * 0.7], [x + reach * 0.86, station - halfChord], [x, station - halfChord]];
    // Face points encode radial span and tangential chord; the renderer projects
    // that plane about the radial hinge. Collar remains fixed at the root.
    const collar: Pair[] = [];
    for (let j = 0; j < 12; j++) {
      const a = j * Math.PI / 6;
      collar.push([x + Math.cos(a) * d * .045, station + Math.sin(a) * d * .06]);
    }
    const face = Object.freeze({ ...polygon(`${id}-face`, 'grid', depth, points), surfaceRole: 'grid-face' as const });
    const edge = Object.freeze({ ...rectangle(`${id}-edge`, 'steel', depth + .001,
      Math.min(x, x + reach), Math.max(x, x + reach), station - halfChord - d * .005, station - halfChord + d * .005), surfaceRole: 'grid-edge' as const });
    const mount = Object.freeze({ ...polygon(`${id}-collar`, 'steel', depth + .002, collar), surfaceRole: 'grid-collar' as const });
    components.push(component(id, 'grid-fin', 'grid', x, station, depth, [face, edge, mount]));
  }
  return components;
}

/** Startup factory. The returned catalogue owns no mutable arrays/resources. */
export function createVehicleGeometry(input: VehicleGeometryInput): VehicleGeometry {
  if (!Number.isFinite(input.height) || !Number.isFinite(input.diameter)
    || input.height <= 0 || input.diameter <= 0) throw new RangeError('vehicle geometry requires finite positive dimensions');
  for (const station of [input.frontFinStation, input.aftFinStation, input.gridFinStation]) {
    if (station !== undefined && (!Number.isFinite(station) || station < 0 || station > input.height))
      throw new RangeError('component station must be inside the physical hull');
  }
  const components = input.id === 'ship' ? shipGeometry(input) : boosterGeometry(input);
  // An overriding physical hinge must leave its authored root within the hull.
  for (const c of components) for (const p of c.polygons) for (const point of p.points) {
    if (point.station < 0 || point.station > input.height) throw new RangeError('authored component extends beyond the physical hull');
  }
  components.sort((a, b) => a.depth - b.depth);
  return Object.freeze({ id: input.id, height: input.height, diameter: input.diameter,
    projection: V3_PROJECTION, components: Object.freeze(components) });
}

/** Shared image-y convention; caller supplies startup-owned output scratch. */
export function geometryPointInBodyFrame(point: GeometryPoint, height: number,
  out: { x: number; y: number }): { x: number; y: number } {
  out.x = point.x;
  out.y = height / 2 - point.station;
  return out;
}
