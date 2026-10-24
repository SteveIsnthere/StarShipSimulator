/** One reviewed desktop launch diagnosis, isolated from all acceptance scenes. */
import { defineConfig } from '@playwright/test';
import budget from './playwright.visual-budget.config';

export default defineConfig({
  ...budget,
  grep: /@visual-diagnostic/,
  projects: budget.projects!.filter(project => project.name === 'chromium'),
  outputDir: 'test-results/visual-diagnostic',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual-diagnostic', open: 'never' }]],
});
