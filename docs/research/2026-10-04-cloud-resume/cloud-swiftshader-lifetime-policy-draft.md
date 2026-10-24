# SwiftShader batch policy: startup and renderer lifetime draft

Preparation only, 2026-10-04. This does not change product code, the reviewed kernel harness, its qualification pins, or any acceptance bound. Adoption awaits the actual deterministic width-32/width-1 kernel result, independent result review, and the lifecycle proofs below. Kernel attribution alone cannot establish session, frame, photograph, or gameplay acceptance.

## Public seam and scope

The proposed production seam is the continuation immediately after `await app.init(...)` in `src/view/app.ts`, before emission blending installation, scene creation, particle-texture helper rendering, or any render. The existing initialization, backend negotiation, AA, device resolution cap, layer order, filter attachments, viewport, particles, textures, and blend operations stay identical. Do not stop/restart the application ticker as part of the product policy. Pixi starts it by scheduling a callback; the synchronous initialization continuation installs the policy before that callback can execute. The reviewed build and first-draw instrumentation must demonstrate this ordering.

For WebGL only, query the real `WEBGL_debug_renderer_info` extension and its `UNMASKED_RENDERER_WEBGL` value. Select width 1 only when the actual string contains `SwiftShader`. Absent extension, empty/unrecognized value, native WebGL, Canvas, and WebGPU retain the ordinary policy. Do not substitute the requested browser flag, user agent, vendor alone, or a fake GL limit. Keep `limits.maxTextures` and actual `MAX_TEXTURE_IMAGE_UNITS` unchanged; change only the public `limits.maxBatchableTextures` batching bound.

On an initially selected SwiftShader renderer, width 1 is a renderer-lifetime contract. Register one owned object with `renderer.runners.contextChange.add(listener)` after initialization and immediately apply its `contextChange()` operation. Locked Pixi's `SystemRunner.add` appends the object; `GlLimitsSystem.contextChange` has already been registered and refreshes the ordinary limit before this appended listener reapplies the bound. The other locked context listeners reset/upload state and do not create a `DefaultBatcher` or draw. This ordering must be source-audited and observed at real restoration, not inferred from a DOM `webglcontextrestored` listener or a later RAF. A canvas-event listener alone leaves an ordering gap.

Existing width-1 batchers survive restoration. Newly lazy-created instruction-set batchers read the re-applied width 1. Thus both must continue using a width-1 linked shader. Keep the lifetime bound even if the debug extension becomes unavailable after restoration: that is the previously selected renderer, not selection of a new unknown renderer. The context listener must not change the underlying capability, backend, shader source, texture data, draw order, or Pixi's global cache. Remove the owned runner listener before `app.destroy`. Disposal is idempotent and does not restore the ordinary limit on a renderer that is about to be destroyed.

## Shared shader cache: explicit fail-closed boundary

Locked `DefaultBatcher.mjs` holds module-global `defaultShader`, constructed once by the first lazy batcher and retained after batcher destruction. Publicly changing a later renderer's limit does not replace that shader. Consequently this proposal supports one live application renderer per module realm and one selected batching class per realm: ordinary, or SwiftShader width 1. Session flight resets reuse the same view/application and do not change class. A later view recreation in the same realm is supported only for the same class, after the old view's ownership has been released. Native/unknown/WebGPU ordinary behavior remains ordinary.

A small factory-local lifetime guard must reserve ownership before the asynchronous `app.init`, reject overlapping `createView` calls, and retain the selected class after successful installation and teardown. If an existing ordinary realm later negotiates SwiftShader width 1, or a width-1 realm later negotiates an ordinary renderer, reject initialization and destroy the new application before scene/helper/first draw. Do not silently return to width 32, assume width 1 is safe with the cached width-32 shader, call `_updateMaxTextures`, mutate `DefaultBatcher.defaultOptions`, change extension registrations, or import/rewrite the singleton. A fresh page reload is the clean supported boundary for a class change; this exceptional guard must surface through the existing initialization failure handling, rather than add a product quality toggle or automatic reload.

The guard covers applications created by this project's `createView`; it cannot certify an unrelated Pixi renderer constructed outside that factory in the same module realm. The current product owns one renderer per page. Embedding multiple unrelated applications is outside this candidate's supported lifecycle and must not be claimed as solved. HMR and tests that reuse a module realm need explicit same-class treatment or isolated realms, not a cache reset through Pixi internals.

## Minimal source template, not an applied patch

Use the existing project types and renderer discrimination when preparing the actual patch. The following shape shows the scope; it is not a compiled implementation or a claim about its final JS cost.

```ts
// Module realm ownership. Retain class after destroy: Pixi retains its shader.
let viewActive = false;
let realmClass: 'ordinary' | 'swiftshader-one' | undefined;

// Reserve before await app.init; its catch releases the reservation.
if (viewActive) throw new Error('An application view is already active');
viewActive = true;
try {
  await app.init(originalOptions);
  let selected: 'ordinary' | 'swiftshader-one' = 'ordinary';
  if (app.renderer.type === RendererType.WEBGL) {
    const gl = (app.renderer as WebGLRenderer).gl;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const identity: unknown = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : undefined;
    if (typeof identity === 'string' && /SwiftShader/i.test(identity)) {
      selected = 'swiftshader-one';
    }
  }
  if (realmClass !== undefined && realmClass !== selected) {
    throw new Error('Renderer batch policy changed; a fresh page is required');
  }
  realmClass = selected;
  if (selected === 'swiftshader-one') {
    const renderer = app.renderer as WebGLRenderer;
    const listener = {
      contextChange() { renderer.limits.maxBatchableTextures = 1; },
    };
    renderer.runners.contextChange.add(listener);
    listener.contextChange();
    // Capture this owned remover for destroy/failure cleanup.
    removeBatchPolicy = () => renderer.runners.contextChange.remove(listener);
  }
  // Continue original emission blending, layers and view construction.
} catch (error) {
  removeBatchPolicy?.();
  // Destroy only the initialized application, with original ownership rules.
  // Track initialization explicitly; do not destroy an uninitialized renderer.
  if (initialized) app.destroy(true, { children: true, texture: true });
  viewActive = false;
  throw error;
}

// Existing view.destroy, with a disposed flag making ownership release once:
removeBatchPolicy?.();
restoreEmissionBlending();
app.destroy(true, { children: true, texture: true });
viewActive = false;
```

The actual implementation must set `initialized` immediately after `app.init`, declare the remover before the try, and make successful view teardown and failure cleanup idempotent. If a reentrant cleanup exception occurs, release the factory reservation in a `finally` without overriding the primary initialization failure. Do not add per-frame store writes, renderer detection, allocations, or filter toggles. Public renderer metadata may report the selected batching bound on demand, separately from the actual hardware limit.

## Meaningful proof and adoption sequence

1. First inspect the actual reviewed deterministic kernel width-32/width-1 outcome: all executed batch generations, actual direct width-1 generator equivalence, full visual-positive screenshots and zero differing pixels above RGB threshold 6, same lossless core/camera/public presentation state, query/disjoint validity, draw counts, worker identities, and before/after qualified source/build/bundle receipts. A failed or unsupported result stops adoption; no width sweep, retry, quality reduction, or extrapolated 32x benefit.
2. After independent approval of an exact minimal product patch, build once and run meaningful pure ownership/selection tests: native/unknown/WebGPU do not mutate limits or install a context listener; real SwiftShader selection changes only the batching bound; limits refresh precedes reapplication; dispose removes the listener; initialization rejection/failure releases active ownership; overlapping startup is rejected; same-class recreation is allowed while both class-switch directions fail before helper draw. These tests prove policy and guard behavior, not actual linked shaders or restoration.
3. In a fresh ordinary production-session browser realm using the qualified fullChrome bundle, fixed viewport/DPR/AA, original complete positive launch presentation, and all cues enabled, capture startup before the first helper/world batch. Observe hardware limit 32, selected bound 1, and every executed batch generation's actual width-1 shader. The real software renderer and three worker topology must remain observed, not guessed from flags.
4. Use the browser's real `WEBGL_lose_context` extension once on that owned world context, with supported bounded loss/restoration waits. Stop physical advancement at an explicitly declared state using the existing source-backed paused semantics; preserve remembered last positive worldDt truth. Record loss/restore events, original probe errors, actual context status, runner ordering, first post-restore draw, new shader generations and source/GL error receipts. Immediately after restoration, create a new public container/render group containing existing production textures so a new instruction set genuinely needs a lazy batcher. Its exact isolated proof can be separate from the ordinary scene screenshot, then remove it. Both the restored existing scene and this new batcher must execute width-1 shaders with bound 1 and unchanged capability; ordinary metadata alone is insufficient. No duplicate renderer, package/private-array writes, fabricated GL contexts, or prototype patches.
5. Compare the restored frozen production frame against the pre-loss frame with the same full visible positive controls. Require unchanged AA/resolution/backing size/viewport, full lossless exposed state, all filter/cue settings, zero pixels differing above threshold 6, no GL/probe errors and actual complete query/draw receipts. If context restoration itself cannot be meaningfully controlled/observed on the supported browser, retain that failure; do not claim restoration ready.
6. Exercise the real session flight-reset path on the same application, then a separately bounded same-class full view teardown/recreation in the same module realm. Prove the old owned listener and application are gone, only one live renderer exists, and the first/new helper/world shader generations remain width 1. Each class-switch guard is tested in an isolated deliberate realm and must fail before first candidate draw; hardware-native default behavior also needs its required actual-machine verification, not a simulated renderer claim.
7. Rebuild/measure the actual product JS artifact under the unchanged size budget. The last reported candidate is 299.7 KiB and leaves little room; no size exemption, lazy-loading reshuffle to hide bytes, or acceptance change is authorized. Then run the original production 60-warm/300-measured checks with unchanged deadlines, p95 and cadence bounds only after the result/lifecycle/size reviews qualify that step. Kernel 20-frame attribution and context proofs do not replace them. Full gate, coverage floors, photographs, phone viewport and gameplay remain separate required acceptance.

Actual lifecycle harness, draw/resource count guards, timeout/cleanup contract and source-pinned current build qualification require fresh review before execution. This text does not authorize a browser run or claim any of these proofs passed.
