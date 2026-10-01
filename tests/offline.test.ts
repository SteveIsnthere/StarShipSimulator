/**
 * M5.1: the offline build, checked without a browser.
 *
 * Two things a unit test can prove and an e2e cannot prove cheaply: that the
 * precache list is derived from the build rather than maintained by hand, and
 * that nothing anywhere in the shipped output points at a CDN.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildServiceWorker, collectAssets, renderServiceWorker } from '../scripts/build-sw.mjs';
import { createOfflineSupport } from '$app/offline';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

/**
 * The build is this file's fixture, and saying so is worth a hook.
 *
 * Nine of the tests below read `v2/dist/`, so without a build they do not fail
 * on what they assert — they die on ENOENT with a path and no advice. That is
 * exactly what happened in GitHub Actions, on every push from 2026-08-24 to
 * M11.9: the workflow ran `npm run test` before `npm run build`, nine tests
 * threw, and the job stopped there, so the build, the budget and both e2e
 * suites never ran at all. A hundred and twenty red runs said `ENOENT` and
 * nobody read one.
 *
 * The ordering is fixed in `package.json`'s `gate` and in both workflows. This
 * says the same thing at the point of failure, for the contributor who runs
 * `npm run test` on a fresh clone.
 */
beforeAll(async () => {
  try {
    await access(dist);
  } catch {
    throw new Error(
      `no build to check: ${dist} does not exist.\n` +
        'This file asserts things about the SHIPPED OUTPUT, so it needs one.\n' +
        'Run `npm run build` first, or `npm run gate`, which builds before it tests.',
    );
  }
});

async function allFiles(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await allFiles(full, base)));
    else out.push(full);
  }
  return out;
}

describe('the precache list', () => {
  it('is generated from what was actually built', async () => {
    // Hand-maintaining this list would be stale the moment a chunk is renamed,
    // and the failure mode is the worst kind: works online, breaks offline.
    const assets = await collectAssets(dist);
    expect(assets.length).toBeGreaterThan(10);
    expect(assets).toContain('index.html');
    expect(assets).toContain('manifest.webmanifest');

    // Relative, so the same build works at the domain root and in a subdirectory.
    expect(assets.filter((a) => a.startsWith('/'))).toEqual([]);
  });

  it('includes the art, so a flight offline looks like a flight online', async () => {
    const assets = await collectAssets(dist);
    expect(assets.some((a) => a.includes('Starship.webp'))).toBe(true);
    // Non-negotiable.
    expect(assets.some((a) => a.includes('pig.webp'))).toBe(true);
  });

  it('includes the lazy black-box chunk', async () => {
    // Lazy on purpose, precached anyway: a chunk fetched on demand is a chunk
    // fetched at the worst possible moment when there is no network.
    const assets = await collectAssets(dist);
    expect(assets.some((a) => /uplot/i.test(a))).toBe(true);
  });

  it('leaves out source maps', async () => {
    const assets = await collectAssets(dist);
    expect(assets.filter((a) => a.endsWith('.map'))).toEqual([]);
  });

  it('never lists the service worker itself', async () => {
    const assets = await collectAssets(dist);
    expect(assets).not.toContain('sw.js');
  });
});

describe('the cache version', () => {
  it('changes when the build changes, so a stale cache cannot outlive it', async () => {
    const { version } = await buildServiceWorker(dist);
    expect(version).toMatch(/^[0-9a-f]{12}$/);

    const a = renderServiceWorker(['index.html'], 'aaaaaaaaaaaa');
    const b = renderServiceWorker(['index.html'], 'bbbbbbbbbbbb');
    expect(a).not.toBe(b);
    expect(a).toContain("'starship-aaaaaaaaaaaa'");
  });

  it('deletes every cache that is not the current one on activate', () => {
    const sw = renderServiceWorker(['index.html'], 'abc123abc123');
    expect(sw).toContain('caches.delete');
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('clients.claim');
  });
});

describe('no CDN references anywhere in the shipped output', () => {
  it('fetches nothing from a third-party host', async () => {
    // What this can and cannot prove, stated plainly. A bundle contains URLs
    // that are never requested: Svelte's error-message links, PixiJS's license
    // header, the GitHub link in the About screen. Grepping for "https://" and
    // demanding zero is a test that fails for the wrong reason and gets
    // weakened until it means nothing.
    //
    // So this checks for the hosts that actually serve code and assets. The
    // real guarantee is the e2e in blackbox.spec.ts, which records every
    // network request the browser makes and asserts none left our origin.
    const DELIVERY_HOSTS =
      /https?:\/\/(?:[^/"'\s]*\.)?(cdn[^/"'\s]*|unpkg\.com|jsdelivr\.net|plot\.ly|cloudflare\.com|googleapis\.com|gstatic\.com|jquery\.com|bootstrapcdn\.com)/i;

    const offenders: string[] = [];
    for (const file of await allFiles(dist)) {
      if (/\.(webp|png|jpg|svg|ico|woff2?)$/.test(file)) continue;
      // Source maps carry their libraries' own comments and are never fetched
      // at runtime; what ships and runs is the code.
      if (file.endsWith('.map')) continue;

      const text = await readFile(file, 'utf8');
      const match = DELIVERY_HOSTS.exec(text);
      if (match) offenders.push(`${file.slice(dist.length)}: ${match[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('never mentions the two CDNs 2021 depended on', async () => {
    // index.html:420 and :449 — PixiJS 5.1.3 and plotly-latest, both from a
    // CDN, on every page load, while the About screen said the game could be
    // played offline.
    for (const file of await allFiles(dist)) {
      if (!/\.(js|html|css|webmanifest)$/.test(file)) continue;
      const text = await readFile(file, 'utf8');
      expect(text, file).not.toMatch(/cdnjs\.cloudflare\.com/);
      expect(text, file).not.toMatch(/cdn\.plot\.ly/);
    }
  });

  it('holds for index.html specifically, which is where 2021 kept them', async () => {
    const html = await readFile(join(dist, 'index.html'), 'utf8');
    expect(html).not.toMatch(/cdn/i);
    expect(html).not.toMatch(/plotly/i);
    // Every src and href is same-origin.
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const value = match[1]!;
      if (value.startsWith('data:')) continue;
      // Relative, matching vite's `base: './'`.
      expect(value.startsWith('./'), value).toBe(true);
    }
  });
});

describe('registration', () => {
  it('reports unsupported rather than throwing when there is no service worker', async () => {
    const support = createOfflineSupport({} as Navigator);
    expect(support.supported).toBe(false);
    expect(await support.register()).toBe(false);
  });

  it('swallows a refusal, because offline support is an enhancement', async () => {
    // Private browsing, an insecure origin, a user setting. The simulator still
    // runs; it just runs online only. Throwing would trade a working game for a
    // stack trace.
    const navigatorRef = {
      serviceWorker: { register: () => Promise.reject(new Error('refused')) },
    } as unknown as Navigator;

    const support = createOfflineSupport(navigatorRef);
    expect(support.supported).toBe(true);
    await expect(support.register()).resolves.toBe(false);
  });

  it('registers at the root scope', async () => {
    const calls: Array<[string, unknown]> = [];
    const navigatorRef = {
      serviceWorker: {
        register: (url: string, options: unknown) => {
          calls.push([url, options]);
          return Promise.resolve({});
        },
      },
    } as unknown as Navigator;

    expect(await createOfflineSupport(navigatorRef).register()).toBe(true);
    expect(calls).toEqual([['./sw.js', undefined]]);
  });
});
