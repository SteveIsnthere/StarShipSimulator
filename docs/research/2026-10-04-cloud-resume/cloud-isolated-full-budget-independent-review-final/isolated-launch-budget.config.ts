/** Research-only one desktop launch; original acceptance counts/bounds unchanged. */
import { defineConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import budget from '../../../playwright.visual-budget.config';
import { chromiumLaunchOptions } from '../../../tests/e2e/chromium';
const setup=process.env['ISOLATED_BUDGET_SETUP'];
const episode=process.env['ISOLATED_BUDGET_EPISODE'];
if(!setup||!/^\/tmp\/starship-isolated-worker\.[A-Za-z0-9]+$/.test(setup)||!episode||!/^\/tmp\/starship-isolated-budget\.[A-Za-z0-9]+$/.test(episode))throw Error('Reviewed original private bundle and NEW unique episode required');
if(process.env['RUN_VISUAL_BUDGET']!=='1'||process.env['E2E_SKIP_BUILD']!=='1')throw Error('Explicit budget opt-in and source-pinned prebuilt dist required');
const receipt=JSON.parse(readFileSync(join(setup,'setup-receipt.json'),'utf8'));
if(receipt.actualBrowser!==join(setup,'browser/chrome-headless-shell')||receipt.actualBrowserSha256!=='e11fc9ce65c96313476f7ee9844b6fb6a9220fb048693cfe9eee00acf4170a9f'||!existsSync(receipt.actualBrowser))throw Error('Exact reviewed copied headless-shell required');
export default defineConfig({
 ...budget,testDir:'.',testMatch:'isolated-launch-budget.spec.ts',workers:1,retries:0,fullyParallel:false,globalTimeout:780000,
 projects:budget.projects!.filter(p=>p.name==='chromium'),
 use:{...budget.use,launchOptions:{...chromiumLaunchOptions(),executablePath:receipt.actualBrowser},trace:'off',video:'off'},
 outputDir:join(episode,'test-results'),reporter:[['list'],['html',{outputFolder:join(episode,'html-report'),open:'never'}]],
 globalTeardown:'./isolated-budget-cleanup.ts',
});
