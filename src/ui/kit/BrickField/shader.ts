import { MAX_BRICK_STEPS } from './brickMotion';

/**
 * The brick build on the GPU: one instanced draw, one quad per brick, each brick's look
 * computed in the vertex shader from its grid position. Mirrors brickMotion.ts line for
 * line — the same integer hash, order, step tables and pixel snapping — so the 2D still
 * frame and the live frame put the same bricks on the same pixels.
 */
export const VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp int;

in vec2 a_corner;

uniform vec2 u_area;       // CSS px
uniform float u_dpr;
uniform vec2 u_origin;     // CSS px
uniform float u_size;
uniform float u_gap;
uniform int u_cols;
uniform int u_rows;
uniform float u_time;
uniform float u_build;
uniform float u_hold;
uniform float u_clear;
uniform float u_rest;
uniform float u_ragged;
uniform float u_idle;
uniform float u_built;
uniform vec3 u_land[${MAX_BRICK_STEPS}];  // seconds, alpha, scale
uniform int u_land_count;
uniform vec3 u_lift[${MAX_BRICK_STEPS}];
uniform int u_lift_count;

out float v_alpha;

float hash(int col, int row) {
  uint h = uint(col) * 374761393u + uint(row) * 668265263u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  return float(h ^ (h >> 16u)) / 4294967296.0;
}

// alpha, scale
vec2 brickLook(int col, int row) {
  float period = u_build + u_hold + u_clear + u_rest;
  float local = mod(u_time, period);
  float maxD = max(float(u_cols + u_rows - 2), 1.0);
  float order = (float(col + row) / maxD) * (1.0 - u_ragged) + hash(col, row) * u_ragged;
  float landsAt = order * u_build;
  float liftsAt = u_build + u_hold + order * u_clear;
  if (local < landsAt) return vec2(u_idle, 1.0);
  if (local < liftsAt) {
    float at = landsAt;
    for (int i = 0; i < ${MAX_BRICK_STEPS}; i++) {
      if (i >= u_land_count) break;
      at += u_land[i].x;
      if (local < at) return u_land[i].yz;
    }
    return vec2(u_built, 1.0);
  }
  float at = liftsAt;
  for (int i = 0; i < ${MAX_BRICK_STEPS}; i++) {
    if (i >= u_lift_count) break;
    at += u_lift[i].x;
    if (local < at) return u_lift[i].yz;
  }
  return vec2(u_idle, 1.0);
}

void main() {
  int col = gl_InstanceID % u_cols;
  int row = gl_InstanceID / u_cols;
  vec2 look = brickLook(col, row);
  vec2 centre = u_origin + (vec2(float(col), float(row)) + 0.5) * u_size;
  float side = (u_size - u_gap) * look.y;
  // Whole device pixels keep every brick hard-edged: snap the near edge, round the size.
  vec2 nearEdge = floor((centre - side * 0.5) * u_dpr + 0.5);
  float sidePx = max(1.0, floor(side * u_dpr + 0.5));
  vec2 clip = (nearEdge + a_corner * sidePx) / (u_area * u_dpr) * 2.0 - 1.0;
  gl_Position = look.x > 0.0 ? vec4(clip.x, -clip.y, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
  v_alpha = look.x;
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform vec3 u_color;
in float v_alpha;
out vec4 out_color;
void main() { out_color = vec4(u_color * v_alpha, v_alpha); }
`;
