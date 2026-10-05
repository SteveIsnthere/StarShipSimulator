import { writeFile } from 'node:fs/promises';
import type { Browser, TestInfo } from '@playwright/test';
import { writeVisualJSON } from './visual-runtime-receipt';

/** Diagnostic tracing adds overhead; never use these samples for acceptance. */
export const VISUAL_TRACE_CATEGORIES = [
  'toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline',
  'blink', 'blink.user_timing', 'cc', 'gpu', 'viz', 'renderer.scheduler', 'v8',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-v8.cpu_profiler', 'disabled-by-default-v8.cpu_profiler.hires',
].join(',');

export async function startVisualBrowserTrace(browser: Browser, info: TestInfo) {
  const cdp = await browser.newBrowserCDPSession();
  const completion = new Promise<string>(resolve => cdp.once('Tracing.tracingComplete', event => resolve(event.stream!)));
  const bufferUsage: unknown[] = [];
  cdp.on('Tracing.bufferUsage', event => bufferUsage.push(event));
  await writeVisualJSON(info, 'trace-declaration.json', {
    categories: VISUAL_TRACE_CATEGORIES, transferMode: 'ReturnAsStream',
    bufferKiB: 32768, exportedStreamByteCap: 64 * 1024 * 1024,
    stopTimeoutMs: 10000, detachTimeoutMs: 1000,
    scope: 'browser CDP tracing across browser/renderer/compositor/GPU threads',
    limitations: 'CPU profiling and tracing add overhead; this is diagnosis, never a frame-budget acceptance result',
  });
  await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', bufferUsageReportingInterval: 1000,
    traceConfig: { recordMode: 'recordUntilFull', traceBufferSizeInKb: 32768,
      includedCategories: VISUAL_TRACE_CATEGORIES.split(',') } });
  let stopped = false;
  return async () => {
    if (stopped) return;
    stopped = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let detachTimer: ReturnType<typeof setTimeout> | undefined;
    const chunks: Buffer[] = [];
    let bytes = 0, streamComplete = false, exceededByteCap = false;
    let primaryError: unknown;
    let failed = false;
    const cleanupErrors: string[] = [];
    try {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Tracing stop exceeded declared 10s deadline')), 10000);
      });
      // Every CDP stop/read/close operation races the same deadline from the
      // first await, so a rejected timer is always observed while CDP hangs.
      await Promise.race([cdp.send('Tracing.end'), deadline]);
      const handle = await Promise.race([completion, deadline]);
      for (;;) {
        const result = await Promise.race([cdp.send('IO.read', { handle, size: 256 * 1024 }), deadline]);
        const chunk = Buffer.from(result.data, result.base64Encoded ? 'base64' : 'utf8');
        if (bytes + chunk.length > 64 * 1024 * 1024) {
          exceededByteCap = true;
          throw new Error('Exported trace exceeded declared 64 MiB byte cap; partial evidence only');
        }
        chunks.push(chunk); bytes += chunk.length;
        if (result.eof) { streamComplete = true; break; }
      }
      await Promise.race([cdp.send('IO.close', { handle }), deadline]);
    } catch (error) { failed = true; primaryError = error; }
    finally {
      clearTimeout(timer);
      try {
        await Promise.race([cdp.detach(), new Promise<never>((_, reject) => {
          detachTimer = setTimeout(() => reject(new Error('CDP detach exceeded declared 1s deadline')), 1000);
        })]);
      } catch (error) { cleanupErrors.push(String(error)); }
      finally { clearTimeout(detachTimer); }
    }
    // Preserve received raw bytes on failure. Partial JSON may be incomplete
    // and is explicitly named as such rather than called a complete trace.
    try {
      if (chunks.length) {
        const name = streamComplete ? 'browser-all-threads-trace.json' : 'browser-all-threads-trace.partial.json';
        const path = info.outputPath(name);
        await writeFile(path, Buffer.concat(chunks));
        await info.attach(name, { path, contentType: 'application/json' });
      }
      await writeVisualJSON(info, 'trace-buffer-usage.json', { bufferUsage,
        bufferKiB: 32768, exportedStreamByteCap: 64 * 1024 * 1024, receivedBytes: bytes,
        streamComplete, exceededByteCap, error: failed ? String(primaryError) : null, cleanupErrors,
        limitation: 'a full buffer or partial stream is truncated diagnostic evidence, never a complete trace claim' });
    } catch (error) { if (!failed) { failed = true; primaryError = error; } }
    if (failed) throw primaryError;
    if (cleanupErrors.length) throw new Error(cleanupErrors.join('; '));
  };
}
