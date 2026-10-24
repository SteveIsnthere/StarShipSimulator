/** Pure exact fixture route check; no compiler/provider/source rewriting. */
import assert from 'node:assert/strict';
export function assertExactExternalMapRoute(code) {
  assert.equal(typeof code, 'string', 'Actual runtime code string required');
  let body = code;
  if (body.endsWith('\r\n')) body = body.slice(0, -2);
  else if (body.endsWith('\n')) body = body.slice(0, -1);
  assert.equal(body.slice(body.lastIndexOf('\n') + 1), '//# sourceMappingURL=control.mjs.map', 'Exact terminal external map route missing');
  assert.equal(code.split('sourceMappingURL=').length, 2, 'Multiple/ambiguous source map routes');
}
