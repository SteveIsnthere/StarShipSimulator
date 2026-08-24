// Wall 4: time enters core/ only as dt.
export function elapsed(since: number): number {
  const a = Date.now();
  const b = performance.now();
  const c = new Date();
  return a - since + b + c.getTime();
}
