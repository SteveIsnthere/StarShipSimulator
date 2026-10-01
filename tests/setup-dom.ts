// Vitest setup for DOM tests (the vendored kit and the React shell): the
// jest-dom matchers, and a localStorage reset so persisted state does not leak
// between cases. Mirrors flight_sim's web/src/test/setup.ts.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { installMemoryStorage } from './memory-storage';

// Node 25's own global localStorage shadows jsdom's and has no methods.
beforeEach(() => {
  if (typeof globalThis.localStorage?.clear !== 'function') installMemoryStorage();
});

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // jsdom in some configurations throws; nothing to clear then.
  }
});
