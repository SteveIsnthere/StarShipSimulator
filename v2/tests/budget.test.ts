/**
 * The bundle budget is a CI gate, and a gate that cannot fail is not a gate.
 * These tests build synthetic dist/ trees and assert the script's verdict and
 * its process exit code -- CI reads the exit code, so that is what must be right.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// prettier-ignore
// @ts-expect-error -- plain-JS build script, intentionally untyped
import { checkBudget, parseFirstLoad, parseFirstLoadStyles, DEFAULT_BUDGET_BYTES } from '../scripts/check-budget.mjs';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('../scripts/check-budget.mjs', import.meta.url));

let root: string;

/** Write a dist/ tree: index.html referencing `entry`, preloading `preload`. */
async function makeDist(
  name: string,
  opts: { entryBytes: number; preloadBytes?: number; lazyBytes?: number },
) {
  const dist = join(root, name);
  await mkdir(join(dist, 'assets'), { recursive: true });
  // Incompressible content, so gzipped size tracks the byte count we asked for.
  // A modular stride would cycle and gzip to nothing; an LCG does not.
  const noise = (n: number) => {
    const bytes = Buffer.allocUnsafe(n);
    let state = 0x2545f491;
    for (let i = 0; i < n; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      bytes[i] = (state >>> 24) & 0xff;
    }
    return bytes;
  };

  await writeFile(join(dist, 'assets', 'entry.js'), noise(opts.entryBytes));
  let head = '';
  if (opts.preloadBytes !== undefined) {
    await writeFile(join(dist, 'assets', 'preload.js'), noise(opts.preloadBytes));
    head = '<link rel="modulepreload" crossorigin href="./assets/preload.js">';
  }
  if (opts.lazyBytes !== undefined) {
    await writeFile(join(dist, 'assets', 'lazy.js'), noise(opts.lazyBytes));
  }
  await writeFile(
    join(dist, 'index.html'),
    `<!doctype html><html><head>${head}</head><body>` +
      `<script type="module" crossorigin src="./assets/entry.js"></script></body></html>`,
  );
  return dist;
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'budget-'));
});
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('parseFirstLoad', () => {
  it('collects script src and modulepreload href, deduped and de-slashed', () => {
    const html =
      '<link rel="modulepreload" href="/assets/a.js">' +
      '<link rel="stylesheet" href="/assets/x.css">' +
      '<script type="module" src="./assets/b.js"></script>' +
      '<link rel="modulepreload" href="/assets/a.js">';
    expect(parseFirstLoad(html)).toEqual(['assets/b.js', 'assets/a.js']);
  });

  it('ignores cross-origin scripts, which are not ours to budget', () => {
    expect(parseFirstLoad('<script src="https://cdn.example.com/pixi.js"></script>')).toEqual([]);
  });
});

describe('checkBudget', () => {
  it('passes a bundle under budget and counts preloads toward first load', async () => {
    const dist = await makeDist('under', { entryBytes: 40_000, preloadBytes: 40_000 });
    const result = await checkBudget(dist, DEFAULT_BUDGET_BYTES);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.total).toBeGreaterThan(60_000);
  });

  it('fails a bundle over budget', async () => {
    const dist = await makeDist('over', { entryBytes: 300_000 });
    const result = await checkBudget(dist, DEFAULT_BUDGET_BYTES);
    expect(result.ok).toBe(false);
    expect(result.total).toBeGreaterThan(DEFAULT_BUDGET_BYTES);
  });

  it('does not count lazy chunks -- that is what lazy-loading buys', async () => {
    const dist = await makeDist('lazy', { entryBytes: 10_000, lazyBytes: 400_000 });
    const result = await checkBudget(dist, DEFAULT_BUDGET_BYTES);
    expect(result.ok).toBe(true);
    expect(result.lazy).toEqual(['lazy.js']);
  });

  it('defaults to the 250 kB budget from CLAUDE.md', () => {
    expect(DEFAULT_BUDGET_BYTES).toBe(250 * 1024);
  });
});

describe('CLI exit codes -- what CI actually reads', () => {
  it('exits 0 under budget', async () => {
    const dist = await makeDist('cli-ok', { entryBytes: 10_000 });
    const { stdout } = await run('node', [SCRIPT, dist]);
    expect(stdout).toMatch(/budget: OK/);
  });

  it('exits 1 over budget', async () => {
    const dist = await makeDist('cli-fail', { entryBytes: 10_000 });
    await expect(run('node', [SCRIPT, dist, '--budget-bytes', '1024'])).rejects.toMatchObject({
      code: 1,
    });
  });

  it('exits 1 when dist/ is missing rather than passing silently', async () => {
    await expect(run('node', [SCRIPT, join(root, 'nope')])).rejects.toMatchObject({ code: 1 });
  });
});

describe('the chart theme rides the lazy chunk, not the first load', () => {
  /*
    M6.5 themed uPlot. The library has been behind a dynamic import since M4.5
    so it does not count against the 250 kB budget — but a stylesheet is not
    JavaScript, and CSS pulled into the entry sheet ships on every page load
    whether or not anything on screen uses it. That is the same wound, reopened
    one stylesheet at a time, and the JS budget alone cannot see it.

    So: `charts.css` is imported from `loadCharts()` rather than from theme.css,
    and this asserts the consequence — that dist/index.html links exactly one
    stylesheet, and that it is not the chart theme.
  */
  const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

  it('index.html links only the entry stylesheet', async () => {
    const html = await readFile(join(DIST, 'index.html'), 'utf8').catch(() => null);
    if (html === null) {
      // `npm run test` may run before `npm run build` on a clean checkout. The
      // gate that matters runs in the build itself; skipping is honest here,
      // and failing would only ever be a false alarm about ordering.
      return;
    }
    const styles: string[] = parseFirstLoadStyles(html);
    expect(styles).toHaveLength(1);
    expect(styles[0]).toMatch(/^assets\/index-[A-Za-z0-9_-]+\.css$/);
  });

  it('neither uPlot nor our theme for it is in the first-load stylesheet', async () => {
    const html = await readFile(join(DIST, 'index.html'), 'utf8').catch(() => null);
    if (html === null) return;
    const styles: string[] = parseFirstLoadStyles(html);
    const entry = await readFile(join(DIST, styles[0]!), 'utf8');

    // `.u-legend` is uPlot's; `.u-title` styling is ours. Either appearing here
    // means a chart stylesheet has been hoisted into the first load.
    expect(entry).not.toContain('u-legend');
    expect(entry).not.toContain('.u-title');
  });
});
