/**
 * The mutation matrix: each entry in tests/mutations.json is a deliberate
 * fault the unit suite must catch. Proves the detectors fire.
 *
 * Works on a copy under the OS temp dir; never edits the working tree. Each
 * mutation's `find` must occur exactly once. The unmodified copy runs first and
 * must pass. A mutation is CAUGHT only when Vitest reports a named assertion
 * failure; an import error, a suite that fails to load or zero tests is ERROR.
 * Exits non-zero if any mutation SURVIVED or ERRORED.
 *
 * Usage: npm run mutation
 */
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SELECTION = ['tests/core', 'tests/golden', 'tests/reference', 'tests/proofs'];
const SKIP = new Set([
  'node_modules',
  'dist',
  '.git',
  'coverage',
  'test-results',
  'playwright-report',
  '.subpath',
]);

async function makeCopy() {
  const dir = await mkdtemp(join(tmpdir(), 'starship-mutation-'));
  await cp(ROOT, dir, {
    recursive: true,
    filter: (src) => !SKIP.has(src.slice(ROOT.length + 1).split('/')[0]),
  });
  await symlink(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}

/** Ten minutes: a mutation that makes the suite loop forever is ERROR, not a hung job. */
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

async function runSuite(dir) {
  const out = join(dir, 'vitest-result.json');
  // A run that dies before writing must not read the previous run's result.
  await rm(out, { force: true });
  spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`, ...SELECTION], {
    cwd: dir,
    stdio: 'ignore',
    timeout: RUN_TIMEOUT_MS,
  });
  return readFile(out, 'utf8')
    .then((text) => {
      const r = JSON.parse(text);
      const loadErrors = r.testResults.filter(
        (f) => f.status === 'failed' && f.assertionResults.length === 0,
      );
      const failed = r.testResults.flatMap((f) =>
        f.assertionResults.filter((a) => a.status === 'failed').map((a) => a.fullName),
      );
      return { total: r.numTotalTests, failed, loadErrors: loadErrors.map((f) => f.name) };
    })
    .catch(() => ({ total: 0, failed: [], loadErrors: ['no result file'] }));
}

const mutations = JSON.parse(await readFile(join(ROOT, 'tests/mutations.json'), 'utf8'));
const dir = await makeCopy();
let bad = 0;
try {
  const control = await runSuite(dir);
  if (control.total === 0 || control.failed.length || control.loadErrors.length) {
    console.error('control run did not pass unmodified:', control);
    process.exit(2);
  }
  console.log(`control: ${control.total} tests pass unmodified`);

  for (const m of mutations) {
    const path = join(dir, m.file);
    const original = await readFile(path, 'utf8');
    const count = original.split(m.find).length - 1;
    if (count !== 1) {
      console.log(`ERROR     ${m.id}: 'find' occurs ${count} times in ${m.file}`);
      bad += 1;
      continue;
    }
    // split/join, not replace(): a '$' in the replacement is literal.
    await writeFile(path, original.split(m.find).join(m.replace));
    const r = await runSuite(dir);
    await writeFile(path, original);
    if (r.loadErrors.length) {
      console.log(`ERROR     ${m.id}: suites failed to load (${r.loadErrors.length})`);
      bad += 1;
    } else if (r.failed.length > 0) {
      console.log(`CAUGHT    ${m.id}: ${r.failed.length} assertions, e.g. ${r.failed[0]}`);
    } else {
      console.log(`SURVIVED  ${m.id}: ${r.total} tests passed with the fault in place`);
      bad += 1;
    }
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
process.exit(bad ? 1 : 0);
