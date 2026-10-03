/** Authored incandescence, not radiometry or an additional thermal model.
 * Reads equilibrium skin temperature directly; no stored heat history. */
export function tileGlow(temperature: number): number {
  if (!Number.isFinite(temperature)) return 0;
  const t = Math.max(0, Math.min(1, (temperature - 800) / (1533 - 800)));
  return t * t * (3 - 2 * t);
}
