/**
 * Returning visitors of the 2021 game have its service worker installed at
 * `serviceworker.js`, scoped to the Pages subpath. Its update check fetches that
 * same URL, so the file shipped there decides what happens to them: it must
 * delete the 2021 cache, unregister itself and reload the page onto the new app.
 *
 * Run against the shipped file in dist/ (build first), in a fake worker scope.
 */
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

type Listener = (event: { waitUntil: (p: Promise<unknown>) => void }) => void;

async function runActivate() {
  const source = await readFile(`${dist}serviceworker.js`, 'utf8');
  const listeners = new Map<string, Listener>();
  const deleted: string[] = [];
  const navigated: string[] = [];
  let unregistered = false;
  let skipped = false;
  const self = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    skipWaiting: () => {
      skipped = true;
      return Promise.resolve();
    },
    registration: {
      unregister: async () => {
        unregistered = true;
        return true;
      },
    },
    clients: {
      matchAll: async () => [
        { url: 'https://example.test/StarShipSimulator/', navigate: async (u: string) => navigated.push(u) },
      ],
    },
  };
  const caches = {
    keys: async () => ['v2', 'starship-abc123', 'another-site-on-this-origin'],
    delete: async (k: string) => {
      deleted.push(k);
      return true;
    },
  };
  runInNewContext(source, { self, caches });

  listeners.get('install')!({ waitUntil: () => {} });
  let pending: Promise<unknown> = Promise.resolve();
  listeners.get('activate')!({ waitUntil: (p) => (pending = p) });
  await pending;
  return { deleted, navigated, unregistered, skipped, listeners };
}

describe('the 2021 service worker is retired', () => {
  it('activates at once, deletes only the 2021 cache, unregisters and reloads each page', async () => {
    const r = await runActivate();
    expect(r.skipped).toBe(true);
    // The origin is shared with other Pages sites; their caches, and the new
    // app's, are not this worker's to delete.
    expect(r.deleted).toEqual(['v2']);
    expect(r.unregistered).toBe(true);
    expect(r.navigated).toEqual(['https://example.test/StarShipSimulator/']);
  });

  it('never answers fetches, so it cannot serve the old game', async () => {
    const r = await runActivate();
    expect(r.listeners.has('fetch')).toBe(false);
  });

  it('is not in the new worker precache list', async () => {
    const sw = await readFile(`${dist}sw.js`, 'utf8');
    expect(sw).not.toContain('serviceworker.js');
  });
});
