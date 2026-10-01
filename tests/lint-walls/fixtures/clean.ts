// The control case: idiomatic core/ code that must pass every wall.
export interface Sample {
  /** metres */
  readonly altitude: number;
  /** metres per second */
  readonly verticalVelocity: number;
}

export function integrate(s: Sample, dt: number, accel: number): Sample {
  const verticalVelocity = s.verticalVelocity + accel * dt;
  return { altitude: s.altitude + verticalVelocity * dt, verticalVelocity };
}
