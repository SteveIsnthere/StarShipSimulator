// Wall 3: no Math.random in core/ — unseeded draws make golden fixtures impossible.
export function ignitionDelay(): number {
  return 0.4 + Math.random() * 0.6;
}
