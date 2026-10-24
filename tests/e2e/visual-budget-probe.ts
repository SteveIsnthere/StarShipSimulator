/** Test-only full RAF work accounting. No manual render or replacement clock. */
export interface BudgetFrame {
  timestamp: number;
  cpuMs: number;
  gpuWaitMs: number;
  callbacks: number;
  draws: number;
  gpuFences: number;
}
export interface BudgetProbe {
  start(warm: number, count: number, traceMarkers?: boolean): void;
  result(): { done: boolean; frames: BudgetFrame[]; warmFrames: BudgetFrame[]; noDrawFrames: BudgetFrame[]; errors: string[];
    progress: { armed: boolean; warmRequested: number; warmRemaining: number; target: number;
      drawnFrames: number; noDrawFrames: number; elapsedMs: number; inProgressFrame: BudgetFrame | null };
    contexts: { version: string; renderer: string; canvasId: number; canvasTestId: string | null;
      contextType: string; offscreen: boolean; creationWidth: number; creationHeight: number }[]; dpr: number };
}

/** Serialized by addInitScript: everything it uses is defined inside it. */
export function installBudgetProbe(): void {
  type GL = WebGLRenderingContext | WebGL2RenderingContext;
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const contexts = new Set<GL>();
  const metadata: ReturnType<BudgetProbe['result']>['contexts'] = [];
  const canvasIds = new WeakMap<object, number>();
  let nextCanvasId = 1;
  const errors: string[] = [];
  const drawn = new Set<GL>();
  let current: BudgetFrame | undefined;
  let frames: BudgetFrame[] = [];
  let warmFrames: BudgetFrame[] = [];
  let noDrawFrameRecords: BudgetFrame[] = [];
  let warm = 0, target = 0, armed = false, done = false;
  let warmRequested = 0, drawnFrames = 0, noDrawFrames = 0, startedAt = 0, finishedAt = 0;
  let traceMarkers = false;
  const fail = (message: string) => { if (!errors.includes(message)) errors.push(message); };
  const finishFrame = () => {
    if (!current || !armed) return;
    if (current.draws === 0) { noDrawFrames++; noDrawFrameRecords.push(current); return; }
    drawnFrames++;
    if (warm > 0) {
      warm--; warmFrames.push(current);
      if (warm === 0 && traceMarkers) performance.mark('visual-budget-warm-complete');
    }
    else if (frames.length < target) frames.push(current);
    if (frames.length === target) {
      done = true; armed = false; finishedAt = performance.now();
      if (traceMarkers) performance.mark('visual-budget-measured-complete');
    }
  };
  const hook = (value: unknown, name: string, canvas: HTMLCanvasElement | OffscreenCanvas) => {
    if (name === 'webgpu' && value) fail('WebGPU has no supported completion fence in this probe');
    if (name !== 'webgl' && name !== 'webgl2' && name !== 'experimental-webgl') return;
    if (!value) return;
    const gl = value as GL;
    if (contexts.has(gl)) return;
    contexts.add(gl);
    let canvasId = canvasIds.get(canvas);
    if (!canvasId) { canvasId = nextCanvasId++; canvasIds.set(canvas, canvasId); }
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    metadata.push({ version: String(gl.getParameter(gl.VERSION)), renderer: String(gl.getParameter(
      extension ? extension.UNMASKED_RENDERER_WEBGL : gl.RENDERER)), canvasId,
      canvasTestId: canvas instanceof HTMLCanvasElement ? canvas.getAttribute('data-testid') : null,
      contextType: name, offscreen: !(canvas instanceof HTMLCanvasElement),
      creationWidth: canvas.width, creationHeight: canvas.height });
    const object = gl as unknown as Record<string, unknown>;
    for (const method of ['clear', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = object[method];
      if (typeof original !== 'function') continue;
      object[method] = function (...args: unknown[]) {
        if (current) { current.draws++; drawn.add(gl); }
        return Reflect.apply(original, gl, args);
      };
    }
    // Pixi WebGL2 uses native instancing. Account for WebGL1 extensions too.
    const instancing = gl.getExtension('ANGLE_instanced_arrays');
    if (instancing) {
      for (const method of ['drawArraysInstancedANGLE', 'drawElementsInstancedANGLE'] as const) {
        const original = instancing[method];
        (instancing as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
          if (current) { current.draws++; drawn.add(gl); }
          return Reflect.apply(original, instancing, args);
        };
      }
    }
  };
  for (const prototype of [HTMLCanvasElement.prototype,
    ...(typeof OffscreenCanvas === 'undefined' ? [] : [OffscreenCanvas.prototype])]) {
    const object = prototype as unknown as Record<string, unknown>;
    const getContext = object['getContext'] as (...args: unknown[]) => unknown;
    object['getContext'] = function (this: HTMLCanvasElement | OffscreenCanvas, ...args: unknown[]) {
      const context = Reflect.apply(getContext, this, args);
      hook(context, String(args[0]), this);
      return context;
    };
  }
  window.requestAnimationFrame = callback => nativeRAF(timestamp => {
    if (!current || current.timestamp !== timestamp) {
      finishFrame();
      current = { timestamp, cpuMs: 0, gpuWaitMs: 0, callbacks: 0, draws: 0, gpuFences: 0 };
    }
    drawn.clear();
    const before = performance.now();
    try { callback(timestamp); }
    finally {
      current.cpuMs += performance.now() - before;
      current.callbacks++;
      const fenceStart = performance.now();
      for (const gl of drawn) {
        if (gl.isContextLost()) fail('WebGL context lost');
        gl.finish();
        current.gpuFences++;
      }
      current.gpuWaitMs += performance.now() - fenceStart;
    }
  });
  const probe: BudgetProbe = {
    start(warmCount, count, markers = false) {
      if (armed) throw new Error('Budget capture already active');
      frames = []; warm = warmCount; warmRequested = warmCount; target = count; done = false;
      // Keep warmed work available when a capture times out before producing
      // its first measured frame. These are receipts, never acceptance samples.
      warmFrames = []; noDrawFrameRecords = []; drawnFrames = 0; noDrawFrames = 0;
      startedAt = performance.now(); finishedAt = 0; traceMarkers = markers;
      if (traceMarkers) performance.mark('visual-budget-warm-start');
      // Do not count the partially completed timestamp containing this command.
      current = undefined; armed = true;
    },
    result: () => ({ done, frames, warmFrames, noDrawFrames: noDrawFrameRecords,
      errors, contexts: metadata, dpr: devicePixelRatio,
      progress: { armed, warmRequested, warmRemaining: warm, target, drawnFrames, noDrawFrames,
        elapsedMs: startedAt ? (finishedAt || performance.now()) - startedAt : 0,
        inProgressFrame: armed && current ? { ...current } : null } }),
  };
  Object.defineProperty(window, '__visualBudget', { value: probe });
}

export function statistics(values: readonly number[]): { mean: number; median: number; p95: number; max: number } {
  if (!values.length) throw new Error('No measured frames');
  const ordered = [...values].sort((a, b) => a - b);
  return { mean: values.reduce((sum, n) => sum + n, 0) / values.length,
    median: ordered[Math.floor(ordered.length / 2)]!,
    p95: ordered[Math.ceil(ordered.length * .95) - 1]!, max: ordered.at(-1)! };
}
