import { expect, test as base } from '@playwright/test';
import type { SimDebug } from '../../src/app/debug';
import { attachVisualRuntimeReceipt, visualRuntimeReceipt } from './visual-runtime-receipt';
import { byTestId } from '../../src/ui/testids';

/** Dedicated motion runs pin their artifacts; ordinary gate specs pay no extra work. */
export const test = base.extend<{ visualEvidence: void }>({
  visualEvidence: [async ({ browser, page }, use, info) => {
    if (process.env['E2E_VISUAL_RECEIPTS'] !== '1') { await use(); return; }
    const before = await visualRuntimeReceipt(browser, info);
    await attachVisualRuntimeReceipt(info, 'before', before);
    await use();
    const observed = await page.evaluate(selector => {
      const debug = (window as unknown as { __simDebug?: SimDebug }).__simDebug;
      let presentation;
      try { presentation = debug?.presentation() ?? null; } catch { presentation = null; }
      // Query only a confirmed existing WebGL canvas; never negotiate a new renderer.
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      const gl = presentation?.renderer?.backend === 'webgl' && canvas
        ? canvas.getContext('webgl2') ?? canvas.getContext('webgl') : null;
      const extension = gl?.getExtension('WEBGL_debug_renderer_info');
      return { presentation, deviceDpr: devicePixelRatio,
        webglIdentity: gl ? { version: String(gl.getParameter(gl.VERSION)),
          renderer: String(gl.getParameter(extension ? extension.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
          vendor: String(gl.getParameter(extension ? extension.UNMASKED_VENDOR_WEBGL : gl.VENDOR)) } : null };
    }, byTestId('world-canvas'));
    await info.attach('final-presentation.json', {
      body: JSON.stringify({ viewport: page.viewportSize(), ...observed }), contentType: 'application/json',
    });
    const after = await visualRuntimeReceipt(browser, info);
    await attachVisualRuntimeReceipt(info, 'after', after);
    expect(after.source.sha256, 'source must remain pinned throughout visual capture').toBe(before.source.sha256);
    expect(after.build.sha256, 'served build must remain pinned throughout visual capture').toBe(before.build.sha256);
  }, { auto: true }],
});
