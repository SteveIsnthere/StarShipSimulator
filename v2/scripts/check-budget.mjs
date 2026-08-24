/**
 * Bundle budget gate. Fails the build when first-load JS exceeds the budget.
 * Budget comes from CLAUDE.md § Performance rules: first-load JS <= 250 kB gzip.
 *
 * "First load" is the synchronously-fetched module graph of dist/index.html:
 * its <script src> entries plus every <link rel="modulepreload">. Chunks that
 * only appear behind a dynamic import are reported and deliberately not counted
 * -- that is the whole point of lazy-loading the black box in M4.5.
 *
 * Usage: node scripts/check-budget.mjs [distDir] [--budget-bytes N]
 */
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

export const DEFAULT_BUDGET_BYTES = 250 * 1024;

/** Paths, relative to dist/, that the browser fetches before first paint. */
export function parseFirstLoad(html) {
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  return [...new Set([...srcs, ...preloads])]
    .filter((p) => !/^(https?:)?\/\//.test(p))
    .map((p) => p.replace(/^\.?\//, ''));
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

export async function checkBudget(distDir, budgetBytes = DEFAULT_BUDGET_BYTES) {
  const dist = resolve(distDir);
  const files = parseFirstLoad(await readFile(join(dist, 'index.html'), 'utf8'));
  if (files.length === 0) throw new Error('no first-load scripts found in dist/index.html');

  const rows = [];
  let total = 0;
  for (const file of files) {
    const gz = gzipSync(await readFile(join(dist, file))).length;
    total += gz;
    rows.push([file, gz]);
  }

  const all = await readdir(join(dist, 'assets')).catch(() => []);
  const lazy = all.filter((f) => f.endsWith('.js') && !files.some((p) => p.endsWith(f)));

  return { rows, total, budgetBytes, lazy, ok: total <= budgetBytes };
}

export function report(result) {
  for (const [file, gz] of result.rows) {
    console.log(`  ${file.padEnd(48)} ${kb(gz).padStart(10)} gzip`);
  }
  console.log(`  ${'TOTAL first-load JS'.padEnd(48)} ${kb(result.total).padStart(10)} gzip`);
  console.log(`  ${'BUDGET'.padEnd(48)} ${kb(result.budgetBytes).padStart(10)} gzip`);
  if (result.lazy.length) {
    console.log(`  (lazy chunks, not counted: ${result.lazy.join(', ')})`);
  }
  if (result.ok) console.log(`\nbudget: OK — ${kb(result.total)} of ${kb(result.budgetBytes)}`);
  else console.error(`\nbudget: FAIL — ${kb(result.total)} exceeds ${kb(result.budgetBytes)}`);
}

// CLI entry. Kept separate from the logic above so tests can call checkBudget directly.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--budget-bytes');
  const budget = flag === -1 ? DEFAULT_BUDGET_BYTES : Number(args[flag + 1]);
  const distDir = args.find((a) => !a.startsWith('--') && a !== String(budget)) ?? 'dist';
  try {
    const result = await checkBudget(distDir, budget);
    report(result);
    if (!result.ok) process.exit(1);
  } catch (err) {
    console.error(`budget: ${err.message}`);
    process.exit(1);
  }
}
