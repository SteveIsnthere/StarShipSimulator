/**
 * An in-memory Storage. Node 25 defines its own experimental global
 * `localStorage` (without a backing file it is a stub with no methods), and it
 * shadows jsdom's; DOM tests install this instead so persisted preferences can
 * be exercised.
 */
import { vi } from 'vitest';

export function installMemoryStorage(): Storage {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}
