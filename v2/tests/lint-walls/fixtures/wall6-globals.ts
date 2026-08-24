// Wall 6: no globalThis assignment anywhere in v2/. The 2021 tree had 355.
export function initState(): void {
  globalThis.altitude = 0;
  globalThis.verticalVelocity = 0;
}
