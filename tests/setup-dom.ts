// Vitest setup for DOM tests (the vendored kit and the React shell): the
// jest-dom matchers, and a localStorage reset so persisted state does not leak
// between cases. Mirrors flight_sim's web/src/test/setup.ts.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // jsdom in some configurations throws; nothing to clear then.
  }
});
