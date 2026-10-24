import type { Browser, Page, TestInfo } from '@playwright/test';
import type { SimDebug } from '../../src/app/debug';
import { statistics, type BudgetFrame, type BudgetProbe } from './visual-budget-probe';
import { visualRuntimeReceipt, writeVisualJSON } from './visual-runtime-receipt';

/** Partial statistics are diagnostic data; they never satisfy sample floors. */
export function budgetFrameSummary(frames: readonly BudgetFrame[]) {
  const intervals = frames.slice(1).map((frame, i) => frame.timestamp - frames[i]!.timestamp);
  return { count: frames.length,
    cpuMs: frames.length ? statistics(frames.map(f => f.cpuMs)) : null,
    gpuCompletionWaitMs: frames.length ? statistics(frames.map(f => f.gpuWaitMs)) : null,
    fullRAFWorkMs: frames.length ? statistics(frames.map(f => f.cpuMs + f.gpuWaitMs)) : null,
    intervalsMs: intervals.length ? statistics(intervals) : null,
    cadenceFps: intervals.length ? 1000 / statistics(intervals).mean : null };
}

/** Snapshot without an assertion that could prevent recording the broken state. */
export async function budgetSnapshot(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __simDebug?: SimDebug; __visualBudget?: BudgetProbe };
    const errors: string[] = [];
    let state: ReturnType<SimDebug['telemetry']> | null = null;
    let presentation: ReturnType<SimDebug['presentation']> | null = null;
    let measured: ReturnType<BudgetProbe['result']> | null = null;
    try { state = w.__simDebug?.telemetry() ?? null; } catch (error) { errors.push(String(error)); }
    try { presentation = w.__simDebug?.presentation() ?? null; } catch (error) { errors.push(String(error)); }
    try { measured = w.__visualBudget?.result() ?? null; } catch (error) { errors.push(String(error)); }
    return { state, presentation, measured, snapshotErrors: errors };
  });
}

export async function recordBudgetSnapshot(page: Page, info: TestInfo, name: string, context: unknown) {
  const snapshot = await budgetSnapshot(page);
  await writeVisualJSON(info, name, { context, viewport: page.viewportSize(), ...snapshot,
    measuredSummary: snapshot.measured ? budgetFrameSummary(snapshot.measured.frames) : null,
    warmSummary: snapshot.measured ? budgetFrameSummary(snapshot.measured.warmFrames) : null,
    noDrawSummary: snapshot.measured ? budgetFrameSummary(snapshot.measured.noDrawFrames) : null });
  return snapshot;
}

/** Called on every failing assertion/timeout before Playwright tears down the page. */
export async function recordBudgetFailure(page: Page, browser: Browser, info: TestInfo, cause: unknown) {
  const errors: string[] = [];
  try { await recordBudgetSnapshot(page, info, 'failure-probe.json', { cause: String(cause) }); }
  catch (error) { errors.push(`probe: ${String(error)}`); }
  try { await writeVisualJSON(info, 'failure-runtime.json', await visualRuntimeReceipt(browser, info)); }
  catch (error) { errors.push(`runtime: ${String(error)}`); }
  if (errors.length) await writeVisualJSON(info, 'failure-receipt-errors.json', { cause: String(cause), errors });
}
