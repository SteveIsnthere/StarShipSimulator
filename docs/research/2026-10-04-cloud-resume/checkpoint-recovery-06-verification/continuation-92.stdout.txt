/** Original analytic steel/TPS/grid material. Geometry, lighting and local
 * incandescence are independent; there is no photographed/baked sunlight.
 * Shader detail/roughness/F0 are authored display compression, not measured
 * radiometry. S39's broad TPS highlight and B19's reflective bands motivate
 * the response; no photographed scenery is reproduced. Schlick angular
 * reflectance plus rough lobes approximate the principles described in
 * pbr-book.org/4ed/Reflection_Models/Roughness_Using_Microfacet_Theory.
 * WebGL program only, matching the existing production shader backend. */
import { GlProgram, Shader } from 'pixi.js';
import { tileGlow } from './heat-look';
import type { ComponentPolygon, GeometryMaterial } from './vehicle-geometry';

const VERTEX = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vPoint;
out vec4 vColor;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec4 uColor;
void main(void) {
  gl_Position = vec4((uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPoint = aUV;
  vColor = uColor * uWorldColorAlpha;
}
`;

const FRAGMENT = `
in vec2 vPoint;
in vec4 vColor;
out vec4 finalColor;
uniform vec3 uLight;
uniform vec3 uFlatNormal;
uniform vec3 uEnvironmentUp;
uniform vec3 uSkyTone;
uniform vec4 uBounds;
uniform float uDaylight;
uniform float uGlow;
uniform float uPixelsPerMetre;
uniform float uDetail;
uniform float uRadius;
uniform float uHeight;
uniform float uNormalMode;
uniform float uMaterial;

float line(float coord, float period, float width) {
  float edge = min(fract(coord / period), 1.0 - fract(coord / period)) * period;
  // Derivatives require an optional WebGL1 extension. The renderer already
  // supplies projected metre scale (including articulation compression), so
  // use its reciprocal footprint on every backend. sqrt(2) conservatively
  // covers a line rotated across a square pixel without unresolved shimmer.
  float aa = max(1.41421356 / max(uPixelsPerMetre, 0.001), 0.001);
  // Box-filtered physical coverage: narrow lines lose opacity rather than
  // expanding to a full pixel. Unresolved repetition retains its area mean.
  if (aa >= period) return min(1.0, 2.0 * width / period);
  return clamp((width + aa * 0.5 - edge) / aa, 0.0, 1.0)
    - clamp((-width + aa * 0.5 - edge) / aa, 0.0, 1.0);
}
void main(void) {
  vec3 n = normalize(uFlatNormal);
  if (uNormalMode > 0.5) {
    float radius = uRadius;
    float slope = 0.0;
    float axisX = 0.0;
    if (uNormalMode > 3.5) {
      // The booster dome is the authored half-ellipse, not the Ship nose taper.
      float span = max(0.001, uBounds.w - uBounds.y);
      float t = clamp((vPoint.y - uBounds.y) / span, 0.0, 0.998);
      float section = sqrt(max(0.001, 1.0 - t * t));
      radius *= section;
      slope = -uRadius * t / (span * section);
    } else if (uNormalMode > 2.5) {
      // Each tapered bell has its own centre/radius, never the hull's normal.
      float span = max(0.001, uBounds.w - uBounds.y);
      float t = clamp((vPoint.y - uBounds.y) / span, 0.0, 1.0);
      axisX = (uBounds.x + uBounds.z) * 0.5;
      float exitRadius = (uBounds.z - uBounds.x) * 0.5;
      radius = exitRadius * (1.0 - 0.72 * t);
      slope = -exitRadius * 0.72 / span;
    } else if (uNormalMode > 1.5) {
      // Rounded authored taper approximates the geometry's curved nose.
      // Slope faces toward the nose; image y/light y retain existing convention.
      // Component envelope also handles the booster dome; never apply the
      // Ship's nose station/length to a differently placed curved surface.
      float span = max(0.001, uBounds.w - uBounds.y);
      float t = clamp((vPoint.y - uBounds.y) / span, 0.0, 0.998);
      float base = max(0.001, 1.0 - t * t);
      radius *= pow(base, 0.6);
      slope = -uRadius * 1.2 * t * pow(base, -0.4) / span;
    }
    float sideways = clamp((vPoint.x - axisX) / max(radius, 0.001), -0.999, 0.999);
    n = normalize(vec3(sideways, slope, sqrt(max(0.0, 1.0 - sideways * sideways))));
    if (uNormalMode < 1.5 && uMaterial < 0.5) {
      // Rolled steel around circumferential welds is not an optically perfect
      // cylinder. This small authored normal variation bends the same sky/ground
      // reflection into axial bands; it does not paint light onto the albedo.
      // Its amplitude/spacing are visual approximations, not measured B19 data.
      float period = uHeight / 20.0;
      float weldResolved = smoothstep(2.0, 5.0, period * uPixelsPerMetre) * uDetail;
      n = normalize(n + vec3(0.0, 0.012 * sin(vPoint.y / period * 6.2831853) * weldResolved, 0.0));
    }
  }
  vec3 l = normalize(vec3(uLight.x, -uLight.y, uLight.z));
  vec3 halfLight = normalize(l + vec3(0.0, 0.0, 1.0));
  float diffuse = max(0.0, dot(n, l));
  float night = 0.14 + 0.86 * uDaylight;
  float nh = max(0.0, dot(n, halfLight));
  float grazing = pow(1.0 - max(0.0, n.z), 5.0);
  float lh = max(0.0, halfLight.z);
  // Broad sky/ground illumination exists even when the high sun cannot reflect
  // directly into this orthographic camera. Its world-up direction rotates
  // with the vehicle/piece; the brighter sky opening follows solar azimuth.
  // These neutral finite lobes are authored environment compression, not a
  // factory panorama or measured V3 optical constants.
  vec3 reflectedView = reflect(vec3(0.0, 0.0, -1.0), n);
  vec3 horizonLight = l - uEnvironmentUp * dot(l, uEnvironmentUp);
  horizonLight /= max(length(horizonLight), 0.001);
  float opening = pow(max(0.0, dot(reflectedView, horizonLight)), 4.0);
  float skyShare = smoothstep(-0.25, 0.35, dot(reflectedView, uEnvironmentUp) + 0.16 * max(0.0, n.z));
  vec3 environment = mix(vec3(0.18, 0.17, 0.15), vec3(0.78, 0.84, 0.90) * uSkyTone, skyShare)
    * (0.50 + 1.25 * opening);
  // S39 resolves many tens of cells across the barrel. Original visual pitch
  // estimates (not measured tile dimensions) stay in metres and filter away;
  // grid lattice has its own denser pitch rather than sharing TPS cell size.
  float cell = uRadius * (uMaterial > 1.5 ? 0.035 : 0.04);
  float resolved = smoothstep(2.0, 5.0, cell * uPixelsPerMetre) * uDetail;
  vec3 albedo = vec3(0.52, 0.55, 0.58);
  float f0 = 0.64;
  float diffuseWeight = 0.14;
  float broadLobe = 0.25 * pow(nh, 12.0);
  float narrowLobe = 0.50 * pow(nh, 64.0);
  float environmentWeight = 1.0;
  float surfaceReflection = 1.0;
  float alpha = 1.0;
  if (uMaterial > 0.5 && uMaterial < 1.5) {
    albedo = vec3(0.11, 0.12, 0.13);
    // Coated dark ceramic remains dark between broad achromatic highlights.
    // The coating assumption is visual, not a claim about proprietary TPS IOR.
    f0 = 0.055;
    diffuseWeight = 1.0;
    broadLobe = 2.2 * pow(nh, 14.0);
    narrowLobe = 2.0 * pow(nh, 48.0);
    environmentWeight = 0.45;
    // Original analytic hex-cell field, not one object per tile. Fade before
    // the actual cell pitch becomes unresolved; preserve a dark area mean.
    vec2 pitch = vec2(cell * 1.7320508, cell * 3.0);
    vec2 a = mod(vPoint, pitch) - pitch * 0.5;
    vec2 b = mod(vPoint - pitch * 0.5, pitch) - pitch * 0.5;
    vec2 q = dot(a, a) < dot(b, b) ? a : b;
    float edge = max(abs(q.x), abs(q.x) * 0.5 + abs(q.y) * 0.8660254);
    float aa = max(1.41421356 / max(uPixelsPerMetre, 0.001), 0.001);
    float seam = clamp((edge - cell * 0.84) / aa + 0.5, 0.0, 1.0);
    resolved = smoothstep(2.0, 5.0, cell * 1.7320508 * uPixelsPerMetre) * uDetail;
    albedo *= 1.0 - seam * resolved * 0.38;
    surfaceReflection = 1.0 - seam * resolved * 0.35;
  } else if (uMaterial > 1.5) {
    // Resolve actual openings only when they cover several pixels. At small
    // scales the lattice becomes its area-average dark metal, not enlarged bars.
    vec2 uv = (vPoint - uBounds.xy) / max(uBounds.zw - uBounds.xy, vec2(0.001));
    float frame = 1.0 - smoothstep(0.045, 0.075, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    float bars = max(line(vPoint.x, cell * 2.0, cell * 0.11), line(vPoint.y, cell * 2.0, cell * 0.11));
    resolved = smoothstep(2.0, 5.0, cell * 2.0 * uPixelsPerMetre) * uDetail;
    // Unresolved holes retain authored area coverage instead of becoming an
    // opaque grey plate: ~0.21 lattice coverage plus the perimeter frame.
    alpha = mix(0.36, max(frame, bars), resolved);
    albedo *= mix(0.48, 0.85, resolved);
    f0 = 0.26;
    diffuseWeight = 0.70;
    broadLobe *= 0.50;
    narrowLobe *= 0.30;
    environmentWeight = 0.35;
  } else {
    float weld = line(vPoint.y, uHeight / 20.0, uRadius * 0.007);
    float weldLOD = smoothstep(2.0, 5.0, uHeight / 20.0 * uPixelsPerMetre) * uDetail;
    albedo *= 1.0 - weld * weldLOD * 0.10;
    surfaceReflection = 1.0 - weld * weldLOD * 0.35;
  }
  float directFresnel = f0 + (1.0 - f0) * pow(1.0 - lh, 5.0);
  float viewFresnel = f0 + (1.0 - f0) * grazing;
  vec3 reflection = vec3(directFresnel * (broadLobe + narrowLobe) * diffuse * uDaylight)
    + viewFresnel * environment * environmentWeight * night;
  vec3 rgb = albedo * (0.42 + 0.68 * diffuse) * diffuseWeight * night + reflection * surfaceReflection;
  rgb += vec3(0.85, 0.16, 0.025) * uGlow;
  // Premultiplied colour: lattice holes and parent fading keep coverage.
  finalColor = vec4(clamp(rgb, 0.0, 1.0) * alpha, alpha) * vColor;
}
`;

let program: GlProgram | undefined;
export interface VehicleMaterialUniforms {
  uLight: Float32Array;
  uFlatNormal: Float32Array;
  uEnvironmentUp: Float32Array;
  uSkyTone: Float32Array;
  uBounds: Float32Array;
  uDaylight: number;
  uGlow: number;
  uPixelsPerMetre: number;
  uDetail: number;
  uRadius: number;
  uHeight: number;
  uNormalMode: number;
  uMaterial: number;
}
export interface ComponentMaterial {
  readonly shader: Shader;
  /** Stable uniform storage, exposed for actual graph diagnostics. */
  readonly uniforms: VehicleMaterialUniforms;
  setLight(x: number, y: number, z: number, daylight: number): void;
  setTemperature(kelvin: number): void;
  setEnvironment(pitch: number, skyR: number, skyG: number, skyB: number): void;
  setScale(pixelsPerMetre: number, detail: boolean): void;
  destroy(): void;
}

export function createComponentMaterial(polygon: ComponentPolygon, height: number, diameter: number,
  faceNormal: readonly [number, number, number] = [0, 0, 1]): ComponentMaterial {
  program ??= GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'v3-component-material' });
  let minX = Infinity, minS = Infinity, maxX = -Infinity, maxS = -Infinity;
  for (const p of polygon.points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minS = Math.min(minS, p.station); maxS = Math.max(maxS, p.station);
  }
  const material: Record<GeometryMaterial, number> = { steel: 0, tile: 1, grid: 2 };
  const shader = new Shader({ glProgram: program, resources: { componentUniforms: {
    uLight: { value: new Float32Array([0.6, 0.7, 0.3]), type: 'vec3<f32>' },
    uFlatNormal: { value: new Float32Array(faceNormal), type: 'vec3<f32>' },
    uEnvironmentUp: { value: new Float32Array([0, -1, 0]), type: 'vec3<f32>' },
    uSkyTone: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
    uBounds: { value: new Float32Array([minX, minS, maxX, maxS]), type: 'vec4<f32>' },
    uDaylight: { value: 1, type: 'f32' }, uGlow: { value: 0, type: 'f32' },
    uPixelsPerMetre: { value: 1, type: 'f32' }, uDetail: { value: 1, type: 'f32' },
    uRadius: { value: diameter / 2, type: 'f32' }, uHeight: { value: height, type: 'f32' },
    uNormalMode: { value: polygon.normalMode === 'flat' ? 0 : polygon.normalMode === 'cylinder' ? 1 : polygon.normalMode === 'nose' ? 2 : polygon.normalMode === 'nozzle' ? 3 : 4, type: 'f32' },
    uMaterial: { value: material[polygon.material], type: 'f32' },
  } } });
  const uniforms = (shader.resources['componentUniforms'] as { uniforms: VehicleMaterialUniforms }).uniforms;
  return {
    shader, uniforms,
    setLight(x, y, z, daylight) {
      uniforms.uLight[0] = x; uniforms.uLight[1] = y; uniforms.uLight[2] = z;
      uniforms.uDaylight = Math.max(0, Math.min(1, daylight));
    },
    setTemperature(kelvin) { uniforms.uGlow = tileGlow(kelvin); },
    setEnvironment(pitch, skyR, skyG, skyB) {
      uniforms.uEnvironmentUp[0] = -Math.sin(pitch); uniforms.uEnvironmentUp[1] = -Math.cos(pitch);
      uniforms.uSkyTone[0] = skyR; uniforms.uSkyTone[1] = skyG; uniforms.uSkyTone[2] = skyB;
    },
    setScale(pixelsPerMetre, detail) {
      uniforms.uPixelsPerMetre = Math.max(0, pixelsPerMetre);
      uniforms.uDetail = detail ? 1 : 0;
    },
    destroy() { shader.destroy(); },
  };
}
