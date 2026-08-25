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

/**
 * The font budget, self-imposed by M6 (docs/BROADCAST-UI-PLAN.md § 6).
 *
 * Fonts are not JS and never counted against the first-load number, which is
 * exactly why they need a cap of their own: a webfont family is the easiest
 * thing in a redesign to let grow without anyone noticing, and the whole
 * interface is type. Measured RAW rather than gzipped, because woff2 is already
 * brotli-compressed and gzipping it again measures nothing real.
 */
export const DEFAULT_FONT_BUDGET_BYTES = 80 * 1024;

/**
 * Stylesheets `dist/index.html` links directly.
 *
 * The JS budget alone stopped being sufficient at M6.5, which themed uPlot.
 * That theme belongs to a view most players never open, and CSS in the entry
 * stylesheet ships on every page load whether or not anything uses it — the
 * same wound M4.5 closed for the library itself, reopened one stylesheet at a
 * time. So the build now also reports which stylesheets are first-load, and
 * `tests/budget.test.ts` asserts the chart theme is not among them.
 */
export function parseFirstLoadStyles(html) {
  return [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => !/^(https?:)?\/\//.test(p))
    .map((p) => p.replace(/^\.?\//, ''));
}

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

export async function checkBudget(
  distDir,
  budgetBytes = DEFAULT_BUDGET_BYTES,
  fontBudgetBytes = DEFAULT_FONT_BUDGET_BYTES,
) {
  const dist = resolve(distDir);
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  const files = parseFirstLoad(html);
  if (files.length === 0) throw new Error('no first-load scripts found in dist/index.html');

  const styles = [];
  for (const file of parseFirstLoadStyles(html)) {
    const bytes = await readFile(join(dist, file)).catch(() => null);
    if (bytes) styles.push([file, gzipSync(bytes).length]);
  }

  const rows = [];
  let total = 0;
  for (const file of files) {
    const gz = gzipSync(await readFile(join(dist, file))).length;
    total += gz;
    rows.push([file, gz]);
  }

  const all = await readdir(join(dist, 'assets')).catch(() => []);
  const lazy = all.filter((f) => f.endsWith('.js') && !files.some((p) => p.endsWith(f)));

  const fontFiles = all.filter((f) => /\.(woff2?|ttf|otf)$/.test(f));
  const fonts = [];
  let fontTotal = 0;
  for (const file of fontFiles) {
    const bytes = (await readFile(join(dist, 'assets', file))).length;
    fontTotal += bytes;
    fonts.push([file, bytes]);
  }
  fonts.sort((a, b) => a[0].localeCompare(b[0]));

  return {
    rows,
    total,
    budgetBytes,
    lazy,
    styles,
    fonts,
    fontTotal,
    fontBudgetBytes,
    ok: total <= budgetBytes && fontTotal <= fontBudgetBytes,
  };
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
  for (const [file, gz] of result.styles ?? []) {
    console.log(`  ${file.padEnd(48)} ${kb(gz).padStart(10)} gzip (css)`);
  }
  for (const [file, bytes] of result.fonts ?? []) {
    console.log(`  ${file.padEnd(48)} ${kb(bytes).padStart(10)} raw`);
  }
  console.log(`  ${'TOTAL fonts'.padEnd(48)} ${kb(result.fontTotal ?? 0).padStart(10)} raw`);
  console.log(`  ${'FONT BUDGET'.padEnd(48)} ${kb(result.fontBudgetBytes ?? 0).padStart(10)} raw`);

  const jsOk = result.total <= result.budgetBytes;
  const fontOk = (result.fontTotal ?? 0) <= (result.fontBudgetBytes ?? Infinity);
  if (jsOk) console.log(`\nbudget: OK — ${kb(result.total)} of ${kb(result.budgetBytes)} JS`);
  else console.error(`\nbudget: FAIL — ${kb(result.total)} exceeds ${kb(result.budgetBytes)} JS`);
  if (fontOk) console.log(`budget: OK — ${kb(result.fontTotal ?? 0)} of ${kb(result.fontBudgetBytes ?? 0)} fonts`);
  else
    console.error(
      `budget: FAIL — ${kb(result.fontTotal ?? 0)} exceeds ${kb(result.fontBudgetBytes ?? 0)} fonts`,
    );
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
