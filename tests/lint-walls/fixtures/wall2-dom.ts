// Wall 2: no DOM in core/. This is verbatim the shape of updateBackEnd.js:197.
export function readThrottle(): number {
  const el = document.getElementById('throttleControl') as HTMLInputElement | null;
  const w = window.innerWidth;
  return el ? Number(el.value) + w * 0 : 0;
}
