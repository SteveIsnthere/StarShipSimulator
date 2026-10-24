/**
 * Wall-clock budgets, run on demand with `npm run bench`, never in the gate.
 * A timing on a shared or loaded machine is not evidence; these are for an
 * idle machine and a person reading the numbers.
 */
import { defineConfig } from 'vitest/config';
import base from './vitest.config';

export default defineConfig({
  resolve: base.resolve ?? {},
  test: {
    environment: 'node',
    include: ['tests/**/*.timing.test.ts'],
    testTimeout: 30_000,
    // Timing files must not compete with each other on any host.
    maxWorkers: 1,
    fileParallelism: false,
  },
});
