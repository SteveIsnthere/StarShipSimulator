/** Durable visual/motion capture, separate from performance and ordinary gate work. */
import { defineConfig } from '@playwright/test';
import budget from './playwright.visual-budget.config';

process.env['E2E_VISUAL_RECEIPTS'] = '1';

export default defineConfig({
  ...budget,
  testMatch: ['visual-scenes.spec.ts', 'vehicle-damage.spec.ts', 'staging.spec.ts', 'shake.spec.ts'],
  outputDir: 'test-results/visual-motion',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual-motion', open: 'never' }]],
  use: { ...budget.use, video: 'on' },
  projects: budget.projects!.map(project => ({ ...project,
    use: { ...project.use, video: { mode: 'on' as const, size: project.use!.viewport! } } })),
});
