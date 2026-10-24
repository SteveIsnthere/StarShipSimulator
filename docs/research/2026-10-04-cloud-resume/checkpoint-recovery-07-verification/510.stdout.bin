/** Tiny first-load policy; the diagnostic implementation loads only on request. */
export function wantsSimDebug(dev: boolean, search: string): boolean {
  return dev || new URLSearchParams(search).get('debug') === '1';
}
