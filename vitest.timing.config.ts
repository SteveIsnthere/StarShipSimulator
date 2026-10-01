/**
 * Wall-clock budgets, run on demand with `npm run bench`, never in the gate.
 * A timing on a shared or loaded machine is not evidence; these are for an
 * idle machine and a person reading the numbers.
 */
import { configDefaults, defineConfig } from 'vitest/config';
import base from './vitest.config';

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['tests/**/*.timing.test.ts'],
    exclude: [...configDefaults.exclude],
    coverage: { enabled: false },
  },
});
