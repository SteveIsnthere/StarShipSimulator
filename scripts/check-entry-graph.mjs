/**
 * The first load never carries what only a later interaction needs: GSAP (the
 * kit's motion timelines) and uPlot (the black box's charts) load on demand.
 * Reads the built dist/index.html, takes every script and modulepreload it
 * fetches before first paint (the same list the budget counts), and fails if
 * any of them is, or contains, one of those libraries. Self-tests first.
 *
 * Usage: node scripts/check-entry-graph.mjs [distDir]
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseFirstLoad } from './check-budget.mjs';

/** A library is recognised by its chunk name or by a string its code always carries. */
export const LAZY_ONLY = [
  { name: 'uPlot', file: /uPlot/i, marker: 'u-legend' },
  { name: 'GSAP', file: /gsap/i, marker: '_gsap' },
];

export async function checkEntryGraph(distDir) {
  const dist = resolve(distDir);
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  const files = parseFirstLoad(html);
  if (files.length === 0) throw new Error('no first-load scripts in dist/index.html');
  const failures = [];
  for (const file of files) {
    const code = await readFile(join(dist, file), 'utf8');
    for (const lib of LAZY_ONLY) {
      if (lib.file.test(file) || code.includes(lib.marker)) failures.push(`${lib.name} is in the first load (${file})`);
    }
  }
  return { files, failures };
}

async function selfTest() {
  const dir = await mkdtemp(join(tmpdir(), 'entry-graph-'));
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'assets/index.js'), 'console.log(1)');
    await writeFile(join(dir, 'assets/charts.js'), 'x.className="u-legend"');
    await writeFile(join(dir, 'index.html'), '<script type="module" src="./assets/index.js"></script>');
    if ((await checkEntryGraph(dir)).failures.length) throw new Error('self-test: a clean entry was flagged');
    await writeFile(
      join(dir, 'index.html'),
      '<script type="module" src="./assets/index.js"></script><link rel="modulepreload" href="./assets/charts.js">',
    );
    if (!(await checkEntryGraph(dir)).failures.some((f) => f.startsWith('uPlot'))) {
      throw new Error('self-test: uPlot preloaded on the first load was not caught');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  await selfTest();
  const { files, failures } = await checkEntryGraph(process.argv[2] ?? 'dist');
  if (failures.length) {
    console.error('entry graph: failed');
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`entry graph: ok (${files.length} first-load files, no ${LAZY_ONLY.map((l) => l.name).join(' or ')})`);
}
