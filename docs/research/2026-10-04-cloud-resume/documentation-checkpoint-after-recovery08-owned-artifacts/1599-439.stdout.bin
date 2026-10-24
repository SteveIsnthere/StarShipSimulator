/** Opt-in, serial idle-machine measurements; viewport emulation is not phone hardware. */
import { expect, test, type Page } from '@playwright/test';
import type { DebugRendererMetadata, SimDebug } from '../../src/app/debug';
import { byTestId } from '../../src/ui/testids';
import { ready, tap, isCompactLayout } from './helpers';
import { VISUAL_SCENES, visualScene, type VisualScene } from './visual-scene-setup';
import { installBudgetProbe, statistics, type BudgetProbe, type BudgetFrame } from './visual-budget-probe';
import { attachVisualRuntimeReceipt, visualRuntimeReceipt, writeVisualJSON } from './visual-runtime-receipt';
import { recordBudgetFailure, recordBudgetSnapshot } from './visual-budget-receipts';
import { startVisualBrowserTrace } from './visual-browser-trace';

type WindowDebug = { __simDebug: SimDebug; __visualBudget: BudgetProbe };
const state = (page: Page) => page.evaluate(() =>
  (window as unknown as WindowDebug).__simDebug.telemetry());
const probe = (page: Page) => page.evaluate(() =>
  (window as unknown as WindowDebug).__visualBudget.result());

/** Boundary-only queries; none of this work enters the measured RAF window. */
async function rendererMetadata(page: Page): Promise<DebugRendererMetadata> {
  const metadata = await page.evaluate(() =>
    (window as unknown as WindowDebug).__simDebug.presentation().renderer);
  expect(metadata, 'the mounted scene must expose actual renderer/filter metadata').toBeDefined();
  if (!metadata) throw new Error('Renderer metadata is unavailable');
  expect(['webgl', 'webgpu']).toContain(metadata.backend);
  expect(metadata.resolution).toBeGreaterThan(0);
  expect(metadata.backing.width).toBeGreaterThan(0);
  expect(metadata.backing.height).toBeGreaterThan(0);
  expect(metadata.filters.map(filter => filter.id)).toEqual(['bloom', 'heat']);
  if (metadata.webgl) expect(metadata.webgl.contextLost).toBe(false);
  return metadata;
}

async function foldControls(page: Page): Promise<void> {
  if (!await isCompactLayout(page)) return;
  for (const [control, toggle] of [['yoke-pitch', 'yoke-panel-toggle'], ['throttle', 'engine-panel-toggle']]) {
    if (await page.locator(byTestId(control!)).isVisible()) await page.locator(byTestId(toggle!)).click();
  }
}

async function setupCatch(page: Page): Promise<void> {
  await page.goto('/?debug=1'); await ready(page);
  await page.evaluate(() => {
    const debug = (window as unknown as WindowDebug).__simDebug;
    debug.pause(); debug.setScenario('rtls'); debug.pause();
  });
  await tap(page, 'auto-land'); await foldControls(page);
  const approach = await page.evaluate(() => {
    const debug = (window as unknown as WindowDebug).__simDebug;
    for (let steps = 0; steps < 108000; steps++) {
      debug.step(1);
      const s = debug.telemetry();
      if (s['status.landed'] || s['failures.crashed'] || s['failures.inFlightBreakUp']) return false;
      if (Number(s['kinematics.altitude']) < 1000 && Number(s['kinematics.speedY']) < 0) return true;
    }
    return false;
  });
  expect(approach, 'genuine guided descending catch approach before terminal state').toBe(true);
}

async function setupFailure(page: Page): Promise<void> {
  await visualScene(page, 'staging');
  // Synthetic material-domain load fixture, not a natural-flight physics claim.
  // Both bodies are changed while paused; their next shared step owns terminal capture.
  await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.setState({ 'damage.hull.valid': false }));
  await tap(page, 'select-super-heavy');
  await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.setState({ 'damage.hull.valid': false }));
  await tap(page, 'select-ship'); await foldControls(page);
}

/** Independent no-draw negative and issued-GPU-command positive controls. */
async function controlProbe(page: Page): Promise<void> {
  await page.goto('about:blank');
  const negative = await page.evaluate(async () => {
    const budget = (window as unknown as WindowDebug).__visualBudget;
    budget.start(0, 1);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return budget.result();
  });
  expect(negative.done, 'RAF callbacks without drawing cannot satisfy capture').toBe(false);
  // New document clears the unfinished control capture.
  await page.goto('about:blank');
  const positive = await page.evaluate(async () => {
    const budget = (window as unknown as WindowDebug).__visualBudget;
    const canvas = document.createElement('canvas'); document.body.append(canvas);
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) throw new Error('No WebGL backend: GPU completion cannot be measured');
    budget.start(0, 1);
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        const until = performance.now() + 4;
        while (performance.now() < until) { /* explicit CPU accounting control */ }
        gl.clearColor(1, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        requestAnimationFrame(() => resolve());
      });
      requestAnimationFrame(() => {
        const until = performance.now() + 3;
        while (performance.now() < until) { /* independently paid sibling callback */ }
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
    });
    return budget.result();
  });
  expect(positive.done).toBe(true);
  expect(positive.frames[0]!.draws).toBeGreaterThan(0);
  expect(positive.frames[0]!.gpuFences).toBeGreaterThan(0);
  expect(positive.frames[0]!.callbacks).toBe(2);
  expect(positive.frames[0]!.cpuMs).toBeGreaterThanOrEqual(7);
  expect(positive.errors).toEqual([]);
}

test.describe('full-frame visual budgets', () => {
  test.skip(process.env.RUN_VISUAL_BUDGET !== '1', 'Opt in on an idle machine with RUN_VISUAL_BUDGET=1');
  // --workers=1 enforces idle-machine serialization without skipping later
  // scene measurements when an earlier scene legitimately exceeds its budget.
  test.describe.configure({ mode: 'default', timeout: 600_000 });
  for (const scene of [...VISUAL_SCENES, 'simultaneous-failure'] as const) {
    test(`${scene}: CPU + GPU completion and actual cadence @mobile @visual-budget`, async ({ page, browser }, info) => {
      try {
      expect(info.config.workers, 'run this opt-in measurement with --workers=1').toBe(1);
      const runtimeBefore = await visualRuntimeReceipt(browser, info);
      await attachVisualRuntimeReceipt(info, 'before', runtimeBefore);
      await page.addInitScript(installBudgetProbe);
      await controlProbe(page);
      const short = scene === 'landing' || scene === 'catch';
      const count = short ? 30 : 300;
      const segments: { frames: BudgetFrame[]; before: Record<string, number | boolean>;
        after: Record<string, number | boolean>;
        rendererBefore: DebugRendererMetadata; rendererAfter: DebugRendererMetadata }[] = [];
      const onset: BudgetFrame[] = [];
      let onsetMetadata: { before: DebugRendererMetadata; after: DebugRendererMetadata } | undefined;
      for (let segment = 0; segment < (short ? 10 : 1); segment++) {
        if (scene === 'catch') await setupCatch(page);
        else if (scene === 'simultaneous-failure') await setupFailure(page);
        else await visualScene(page, scene as VisualScene);
        await recordBudgetSnapshot(page, info, `segment-${segment}-before.json`, {
          scene, segment, sourceSha256: runtimeBefore.source.sha256, buildSha256: runtimeBefore.build.sha256,
          warmFrames: 60, requestedFrames: count,
        });
        const before = await state(page);
        const rendererBeforeOnset = await rendererMetadata(page);
        // Failure onset is separately measured without discarding the transition.
        if (scene === 'simultaneous-failure') {
          await page.evaluate(() => {
            const w = window as unknown as WindowDebug;
            w.__visualBudget.start(0, 30); w.__simDebug.resume();
          });
          await page.waitForFunction(() => {
            const result = (window as unknown as WindowDebug).__visualBudget.result();
            return result.done || result.errors.length > 0;
          },
            undefined, { polling: 100, timeout: 60_000 });
          const onsetResult = await probe(page);
          await recordBudgetSnapshot(page, info, `segment-${segment}-onset.json`, { scene, segment, phase: 'failure-onset' });
          expect(onsetResult.errors, 'unsupported backend/context loss cannot produce an onset measurement').toEqual([]);
          onset.push(...onsetResult.frames);
          onsetMetadata = { before: rendererBeforeOnset, after: await rendererMetadata(page) };
          expect((await state(page))['damage.terminal.active']).toBe(true);
          await tap(page, 'select-super-heavy');
          expect((await state(page))['damage.terminal.active']).toBe(true);
          await tap(page, 'select-ship'); await foldControls(page);
        }
        const rendererBefore = await rendererMetadata(page);
        await page.evaluate(count => {
          const w = window as unknown as WindowDebug;
          w.__visualBudget.start(60, count); w.__simDebug.resume();
        }, count);
        // Timer polling avoids adding benchmark-owned RAF callbacks to the CPU sum.
        await page.waitForFunction(() => {
          const result = (window as unknown as WindowDebug).__visualBudget.result();
          return result.done || result.errors.length > 0;
        },
          undefined, { polling: 100, timeout: 60_000 });
        const measured = await probe(page);
        const after = await state(page);
        const rendererAfter = await rendererMetadata(page);
        await writeVisualJSON(info, `segment-${segment}.json`, { scene, before, after, rendererBefore, rendererAfter, measured });
        expect(measured.errors, 'unsupported GPU or context loss is a failed measurement').toEqual([]);
        expect(measured.contexts.length, 'must capture an actual GPU context').toBeGreaterThan(0);
        expect(measured.frames).toHaveLength(count);
        expect(measured.frames.every(frame => frame.gpuFences > 0 && frame.callbacks >= 2),
          'each measured aggregate must include drawing, completion fence and both production RAF loops').toBe(true);
        expect(Number(after['world.environmentTime'])).toBeGreaterThan(Number(before['world.environmentTime']));
        if (scene !== 'simultaneous-failure') {
          expect(after['status.landed'], 'active window must end before touchdown/catch').toBe(false);
          expect(after['failures.crashed']).toBe(false);
          expect(after['failures.inFlightBreakUp']).toBe(false);
          if (scene === 'launch' || scene === 'staging' || scene === 'landing')
            expect(Number(after['forces.thrust'])).toBeGreaterThan(0);
          if (scene === 'entry') expect(Number(after['forces.thermalPower'])).toBeGreaterThan(0);
          if (scene === 'catch') {
            expect(Number(after['kinematics.altitude'])).toBeLessThan(1000);
            expect(Number(after['kinematics.speedY'])).toBeLessThan(0);
          }
        }
        segments.push({ frames: measured.frames, before: { ...before }, after: { ...after }, rendererBefore, rendererAfter });
        await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.pause());
      }
      const frames = segments.flatMap(segment => segment.frames);
      const intervals = segments.flatMap(segment => segment.frames.slice(1).map((frame, i) =>
        frame.timestamp - segment.frames[i]!.timestamp));
      const total = statistics(frames.map(frame => frame.cpuMs + frame.gpuWaitMs));
      const cadence = 1000 / statistics(intervals).mean;
      const phone = info.project.name !== 'chromium';
      const metadata = await probe(page);
      const report = { label: 'conservative GPU-fenced Chromium viewport emulation',
        identity: { sourceHead: runtimeBefore.source.head, sourceSha256: runtimeBefore.source.sha256,
          buildSha256: runtimeBefore.build.sha256, serviceWorkerVersion: runtimeBefore.build.serviceWorkerVersion },
        browser: runtimeBefore.browser, host: runtimeBefore.host,
        scene, project: info.project.name, viewport: page.viewportSize(), deviceDpr: metadata.dpr,
        contexts: metadata.contexts, cpuThrottling: 'none', warmFramesPerSegment: 60,
        measuredFrames: frames.length, segmentCount: segments.length, segmentLengths: segments.map(s => s.frames.length),
        excluded: 'setup/raw stepping, warmup and gaps between independently reset segments',
        cpu: statistics(frames.map(frame => frame.cpuMs)), gpuCompletionWait: statistics(frames.map(frame => frame.gpuWaitMs)),
        fullRAFWork: total, cadenceFps: cadence, frameIntervals: statistics(intervals),
        onset: onset.length ? { frames: onset, renderer: onsetMetadata,
          work: statistics(onset.map(f => f.cpuMs + f.gpuWaitMs)) } : null,
        segments, limitations: 'GPU wait includes queue drain, not isolated GPU execution; excludes compositor/presentation and non-RAF tasks. Phone viewport is not physical phone GPU.' };
      await writeVisualJSON(info, 'full-frame-budget.json', report);
      await page.screenshot({ path: info.outputPath(`${scene}-budget.png`) });
      const runtimeAfter = await visualRuntimeReceipt(browser, info);
      await attachVisualRuntimeReceipt(info, 'after', runtimeAfter);
      expect(runtimeAfter.source.sha256, 'source cannot change during frame acceptance').toBe(runtimeBefore.source.sha256);
      expect(runtimeAfter.build.sha256, 'served build cannot change during frame acceptance').toBe(runtimeBefore.build.sha256);
      expect(frames.length).toBeGreaterThanOrEqual(300);
      expect(total.p95).toBeLessThanOrEqual(phone ? 33.33 : 16.67);
      expect(cadence).toBeGreaterThanOrEqual(phone ? 29.5 : 59);
      if (onset.length) expect(statistics(onset.map(f => f.cpuMs + f.gpuWaitMs)).max,
        'the single failure-onset spike cannot hide inside a percentile').toBeLessThanOrEqual(phone ? 33.33 : 16.67);
      } catch (error) {
        await recordBudgetFailure(page, browser, info, error);
        throw error;
      }
    });
  }
});

/** One separately opted-in diagnostic; never alters acceptance scene/sample counts. */
test('diagnostic launch: 60 warm + 30 measured with all-browser-thread trace @visual-diagnostic', async ({ page, browser }, info) => {
  test.skip(process.env['RUN_VISUAL_DIAGNOSTIC'] !== '1', 'separately declared diagnosis only');
  test.setTimeout(180_000);
  expect(info.config.workers).toBe(1);
  expect(info.project.name, 'one desktop launch diagnostic only').toBe('chromium');
  let stopTrace: (() => Promise<void>) | undefined;
  let diagnosticFailed = false;
  let diagnosticError: unknown;
  let cleanupFailed = false;
  let traceCleanupError: unknown;
  try {
    const runtimeBefore = await visualRuntimeReceipt(browser, info);
    await attachVisualRuntimeReceipt(info, 'before', runtimeBefore);
    await page.addInitScript(installBudgetProbe);
    await controlProbe(page);
    await visualScene(page, 'launch');
    await recordBudgetSnapshot(page, info, 'diagnostic-before.json', {
      purpose: 'diagnose cadence outside measured RAF/fence work; not acceptance',
      warmFrames: 60, measuredFrames: 30,
      sourceSha256: runtimeBefore.source.sha256, buildSha256: runtimeBefore.build.sha256,
    });
    const renderer = await rendererMetadata(page);
    expect(renderer.backend, 'the declared diagnostic uses the existing WebGL route').toBe('webgl');
    stopTrace = await startVisualBrowserTrace(browser, info);
    await page.evaluate(() => {
      const w = window as unknown as WindowDebug;
      w.__visualBudget.start(60, 30, true); w.__simDebug.resume();
    });
    await page.waitForFunction(() => {
      const result = (window as unknown as WindowDebug).__visualBudget.result();
      return result.done || result.errors.length > 0;
    }, undefined, { polling: 100, timeout: 60_000 });
    const result = await recordBudgetSnapshot(page, info, 'diagnostic-complete.json', {
      purpose: '30-frame diagnostic samples are not 300-frame acceptance',
    });
    await page.evaluate(() => (window as unknown as WindowDebug).__simDebug.pause());
    await stopTrace();
    expect(result.measured?.errors).toEqual([]);
    expect(result.measured?.frames).toHaveLength(30);
    const runtimeAfter = await visualRuntimeReceipt(browser, info);
    await attachVisualRuntimeReceipt(info, 'after', runtimeAfter);
    expect(runtimeAfter.source.sha256).toBe(runtimeBefore.source.sha256);
    expect(runtimeAfter.build.sha256).toBe(runtimeBefore.build.sha256);
  } catch (error) {
    diagnosticFailed = true;
    diagnosticError = error;
    try { await recordBudgetFailure(page, browser, info, error); }
    catch (receiptError) {
      info.annotations.push({ type: 'diagnostic-receipt-error', description: String(receiptError) });
    }
  } finally {
    try { await stopTrace?.(); }
    catch (error) {
      cleanupFailed = true;
      traceCleanupError = error;
      try {
        await writeVisualJSON(info, 'trace-cleanup-error.json', {
          error: String(error), originalDiagnosticFailurePreserved: diagnosticFailed,
        });
      } catch (receiptError) {
        info.annotations.push({ type: 'trace-receipt-error', description: String(receiptError) });
      }
    }
  }
  // Rethrow outside finally so cleanup cannot replace an earlier diagnosis
  // failure. A cleanup-only failure still makes the diagnostic fail.
  if (diagnosticFailed) throw diagnosticError;
  if (cleanupFailed) throw traceCleanupError;
});
