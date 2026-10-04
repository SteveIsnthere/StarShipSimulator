# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-budget.spec.ts >> full-frame visual budgets >> catch: CPU + GPU completion and actual cadence @mobile @visual-budget
- Location: tests/e2e/visual-budget.spec.ts:115:5

# Error details

```
Error: page.evaluate: Test ended.
```

# Test source

```ts
  1   | /** Opt-in, serial idle-machine measurements; viewport emulation is not phone hardware. */
  2   | import { expect, test, type Page } from '@playwright/test';
  3   | import type { DebugRendererMetadata, SimDebug } from '../../src/app/debug';
  4   | import { byTestId } from '../../src/ui/testids';
  5   | import { ready, tap, isCompactLayout } from './helpers';
  6   | import { VISUAL_SCENES, visualScene, type VisualScene } from './visual-scene-setup';
  7   | import { installBudgetProbe, statistics, type BudgetProbe, type BudgetFrame } from './visual-budget-probe';
  8   | import { attachVisualRuntimeReceipt, visualRuntimeReceipt } from './visual-runtime-receipt';
  9   | 
  10  | type WindowDebug = { __simDebug: SimDebug; __visualBudget: BudgetProbe };
  11  | const state = (page: Page) => page.evaluate(() =>
  12  |   (window as unknown as WindowDebug).__simDebug.telemetry());
  13  | const probe = (page: Page) => page.evaluate(() =>
  14  |   (window as unknown as WindowDebug).__visualBudget.result());
  15  | 
  16  | /** Boundary-only queries; none of this work enters the measured RAF window. */
  17  | async function rendererMetadata(page: Page): Promise<DebugRendererMetadata> {
  18  |   const metadata = await page.evaluate(() =>
  19  |     (window as unknown as WindowDebug).__simDebug.presentation().renderer);
  20  |   expect(metadata, 'the mounted scene must expose actual renderer/filter metadata').toBeDefined();
  21  |   if (!metadata) throw new Error('Renderer metadata is unavailable');
  22  |   expect(['webgl', 'webgpu']).toContain(metadata.backend);
  23  |   expect(metadata.resolution).toBeGreaterThan(0);
  24  |   expect(metadata.backing.width).toBeGreaterThan(0);
  25  |   expect(metadata.backing.height).toBeGreaterThan(0);
  26  |   expect(metadata.filters.map(filter => filter.id)).toEqual(['bloom', 'heat']);
  27  |   if (metadata.webgl) expect(metadata.webgl.contextLost).toBe(false);
  28  |   return metadata;
  29  | }
  30  | 
  31  | async function foldControls(page: Page): Promise<void> {
  32  |   if (!await isCompactLayout(page)) return;
  33  |   for (const [control, toggle] of [['yoke-pitch', 'yoke-panel-toggle'], ['throttle', 'engine-panel-toggle']]) {
  34  |     if (await page.locator(byTestId(control!)).isVisible()) await page.locator(byTestId(toggle!)).click();
  35  |   }
  36  | }
  37  | 
  38  | async function setupCatch(page: Page): Promise<void> {
  39  |   await page.goto('/?debug=1'); await ready(page);
  40  |   await page.evaluate(() => {
  41  |     const debug = (window as unknown as WindowDebug).__simDebug;
  42  |     debug.pause(); debug.setScenario('rtls'); debug.pause();
  43  |   });
  44  |   await tap(page, 'auto-land'); await foldControls(page);
> 45  |   const approach = await page.evaluate(() => {
      |                               ^ Error: page.evaluate: Test ended.
  46  |     const debug = (window as unknown as WindowDebug).__simDebug;
  47  |     for (let steps = 0; steps < 108000; steps++) {
  48  |       debug.step(1);
  49  |       const s = debug.telemetry();
  50  |       if (s['status.landed'] || s['failures.crashed'] || s['failures.inFlightBreakUp']) return false;
  51  |       if (Number(s['kinematics.altitude']) < 1000 && Number(s['kinematics.speedY']) < 0) return true;
  52  |     }
  53  |     return false;
  54  |   });
  55  |   expect(approach, 'genuine guided descending catch approach before terminal state').toBe(true);
  56  | }
  57  | 
  58  | async function setupFailure(page: Page): Promise<void> {
  59  |   await visualScene(page, 'staging');
  60  |   // Synthetic material-domain load fixture, not a natural-flight physics claim.
  61  |   // Both bodies are changed while paused; their next shared step owns terminal capture.
  62  |   await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.setState({ 'damage.hull.valid': false }));
  63  |   await tap(page, 'select-super-heavy');
  64  |   await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.setState({ 'damage.hull.valid': false }));
  65  |   await tap(page, 'select-ship'); await foldControls(page);
  66  | }
  67  | 
  68  | /** Independent no-draw negative and issued-GPU-command positive controls. */
  69  | async function controlProbe(page: Page): Promise<void> {
  70  |   await page.goto('about:blank');
  71  |   const negative = await page.evaluate(async () => {
  72  |     const budget = (window as unknown as WindowDebug).__visualBudget;
  73  |     budget.start(0, 1);
  74  |     await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  75  |     return budget.result();
  76  |   });
  77  |   expect(negative.done, 'RAF callbacks without drawing cannot satisfy capture').toBe(false);
  78  |   // New document clears the unfinished control capture.
  79  |   await page.goto('about:blank');
  80  |   const positive = await page.evaluate(async () => {
  81  |     const budget = (window as unknown as WindowDebug).__visualBudget;
  82  |     const canvas = document.createElement('canvas'); document.body.append(canvas);
  83  |     const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  84  |     if (!gl) throw new Error('No WebGL backend: GPU completion cannot be measured');
  85  |     budget.start(0, 1);
  86  |     await new Promise<void>(resolve => {
  87  |       requestAnimationFrame(() => {
  88  |         const until = performance.now() + 4;
  89  |         while (performance.now() < until) { /* explicit CPU accounting control */ }
  90  |         gl.clearColor(1, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  91  |         requestAnimationFrame(() => resolve());
  92  |       });
  93  |       requestAnimationFrame(() => {
  94  |         const until = performance.now() + 3;
  95  |         while (performance.now() < until) { /* independently paid sibling callback */ }
  96  |         gl.clear(gl.COLOR_BUFFER_BIT);
  97  |       });
  98  |     });
  99  |     return budget.result();
  100 |   });
  101 |   expect(positive.done).toBe(true);
  102 |   expect(positive.frames[0]!.draws).toBeGreaterThan(0);
  103 |   expect(positive.frames[0]!.gpuFences).toBeGreaterThan(0);
  104 |   expect(positive.frames[0]!.callbacks).toBe(2);
  105 |   expect(positive.frames[0]!.cpuMs).toBeGreaterThanOrEqual(7);
  106 |   expect(positive.errors).toEqual([]);
  107 | }
  108 | 
  109 | test.describe('full-frame visual budgets', () => {
  110 |   test.skip(process.env.RUN_VISUAL_BUDGET !== '1', 'Opt in on an idle machine with RUN_VISUAL_BUDGET=1');
  111 |   // --workers=1 enforces idle-machine serialization without skipping later
  112 |   // scene measurements when an earlier scene legitimately exceeds its budget.
  113 |   test.describe.configure({ mode: 'default', timeout: 600_000 });
  114 |   for (const scene of [...VISUAL_SCENES, 'simultaneous-failure'] as const) {
  115 |     test(`${scene}: CPU + GPU completion and actual cadence @mobile @visual-budget`, async ({ page, browser }, info) => {
  116 |       expect(info.config.workers, 'run this opt-in measurement with --workers=1').toBe(1);
  117 |       const runtimeBefore = await visualRuntimeReceipt(browser, info);
  118 |       await attachVisualRuntimeReceipt(info, 'before', runtimeBefore);
  119 |       await page.addInitScript(installBudgetProbe);
  120 |       await controlProbe(page);
  121 |       const short = scene === 'landing' || scene === 'catch';
  122 |       const count = short ? 30 : 300;
  123 |       const segments: { frames: BudgetFrame[]; before: Record<string, number | boolean>;
  124 |         after: Record<string, number | boolean>;
  125 |         rendererBefore: DebugRendererMetadata; rendererAfter: DebugRendererMetadata }[] = [];
  126 |       const onset: BudgetFrame[] = [];
  127 |       let onsetMetadata: { before: DebugRendererMetadata; after: DebugRendererMetadata } | undefined;
  128 |       for (let segment = 0; segment < (short ? 10 : 1); segment++) {
  129 |         if (scene === 'catch') await setupCatch(page);
  130 |         else if (scene === 'simultaneous-failure') await setupFailure(page);
  131 |         else await visualScene(page, scene as VisualScene);
  132 |         const before = await state(page);
  133 |         const rendererBeforeOnset = await rendererMetadata(page);
  134 |         // Failure onset is separately measured without discarding the transition.
  135 |         if (scene === 'simultaneous-failure') {
  136 |           await page.evaluate(() => {
  137 |             const w = window as unknown as WindowDebug;
  138 |             w.__visualBudget.start(0, 30); w.__simDebug.resume();
  139 |           });
  140 |           await page.waitForFunction(() => (window as unknown as WindowDebug).__visualBudget.result().done,
  141 |             undefined, { polling: 100, timeout: 60_000 });
  142 |           onset.push(...(await probe(page)).frames);
  143 |           onsetMetadata = { before: rendererBeforeOnset, after: await rendererMetadata(page) };
  144 |           expect((await state(page))['damage.terminal.active']).toBe(true);
  145 |           await tap(page, 'select-super-heavy');
```