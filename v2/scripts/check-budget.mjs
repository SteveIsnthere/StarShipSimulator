/**
 * Bundle budget gate. Fails the build when first-load JS exceeds the budget.
 * Budget comes from CLAUDE.md § Performance rules: first-load JS <= 250 kB gzip.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_BYTES = 250 * 1024;
const DIST = new URL('../dist/', import.meta.url).pathname;

/** Entry HTML files whose synchronously-loaded module graph counts as first load. */
async function firstLoadScripts() {
  const html = await readFile(join(DIST, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  return [...new Set([...srcs, ...preloads])].map((p) => p.replace(/^\.?\//, ''));
}

const files = await firstLoadScripts();
if (files.length === 0) {
  console.error('budget: no first-load scripts found in dist/index.html');
  process.exit(1);
}

let total = 0;
const rows = [];
for (const file of files) {
  const path = join(DIST, file);
  await stat(path);
  const gz = gzipSync(await readFile(path)).length;
  total += gz;
  rows.push([file, gz]);
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
for (const [file, gz] of rows) console.log(`  ${file.padEnd(48)} ${kb(gz).padStart(10)} gzip`);
console.log(`  ${'TOTAL first-load JS'.padEnd(48)} ${kb(total).padStart(10)} gzip`);
console.log(`  ${'BUDGET'.padEnd(48)} ${kb(BUDGET_BYTES).padStart(10)} gzip`);

if (total > BUDGET_BYTES) {
  console.error(`\nbudget: FAIL — first-load JS ${kb(total)} exceeds ${kb(BUDGET_BYTES)}`);
  process.exit(1);
}
console.log(`\nbudget: OK — ${kb(total)} of ${kb(BUDGET_BYTES)}`);

/** Lazy chunks are reported but not budgeted; they must not be in first load. */
const all = await readdir(join(DIST, 'assets')).catch(() => []);
const lazy = all.filter((f) => f.endsWith('.js') && !files.some((p) => p.endsWith(f)));
if (lazy.length) console.log(`  (lazy chunks, not counted: ${lazy.join(', ')})`);
