/** Research-only deterministic render kernel. Production modules are imported unchanged. */
import { RendererType, type Container, type WebGLRenderer } from 'pixi.js';
import { classifyPublicDisplay } from './kernel-display-witness';
import { createView } from '../../../src/view/app';
import { createScene } from '../../../src/ui/session/scene';
import { createMissionController } from '../../../src/ui/session/mission-controller';
import { createCameraFollow } from '../../../src/ui/session/camera-follow';
import { getScenario } from '../../../src/core/scenarios';
import { vehicleHeight } from '../../../src/core/constants';
import { DT } from '../../../src/app/loop';
import { flatten } from '../../../src/app/debug';
export { createView, createScene, createMissionController, createCameraFollow, DT };

export async function createKernel(width: 32 | 2) {
  if (width !== 32 && width !== 2) throw Error('Exactly declared baseline32 or candidate2');
  const canvas = document.querySelector('[data-testid="world-canvas"]');
  if (!(canvas instanceof HTMLCanvasElement)) throw Error('Owned actual world canvas required');
  const controller = createMissionController(), preset = getScenario('launch-pad');
  controller.startFlight(preset);
  const initial = controller.loop.state;
  const view = await createView({ canvas, vehicleHeight, downRangeDistance: initial.kinematics.downRangeDistance,
    speedY: initial.kinematics.speedY, width: 1280, height: 720, preference: 'webgl' });
  // This continuation and stop precede the init plugin's scheduled first RAF.
  // Neither scene construction nor helper texture generation has happened.
  view.app.stop();
  try {
    const hook = (window as unknown as { __programAttribution: { result(): { totalDrawCalls: number; programs: { links: { linkedShaders: { source: string | null }[] }[] }[] } } }).__programAttribution;
    const startup = hook.result();
    if (startup.totalDrawCalls !== 0 || startup.programs.some(program => program.links.some(link => link.linkedShaders.some(shader => shader.source?.includes('uniform sampler2D uTextures['))))) throw Error('Draw/batch shader existed before policy selection');
    if (view.app.renderer.type !== RendererType.WEBGL) throw Error('Actual WebGL required; no backend fallback');
    const renderer = view.app.renderer as WebGLRenderer, gl = renderer.gl;
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    if (!extension) throw Error('Actual unmasked renderer unavailable; no diagnostic guess');
    const observed: unknown = gl.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    const hardwareMaximum: unknown = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    if (typeof observed !== 'string' || !/\bSwiftShader\b/i.test(observed) || hardwareMaximum !== 32
      || renderer.limits.maxBatchableTextures !== 32) throw Error('Exact actual SwiftShader/hardware32/baseline batch32 required');
    if (gl.getContextAttributes()?.antialias !== true || renderer.resolution !== 1 || devicePixelRatio !== 1
      || canvas.width !== 1280 || canvas.height !== 720 || gl.drawingBufferWidth !== 1280 || gl.drawingBufferHeight !== 720
      || view.viewport.width !== 1280 || view.viewport.height !== 720) throw Error('Declared AA/DPR/resolution/backing/viewport changed');
    renderer.limits.maxBatchableTextures = width;
    const cameraFollow = createCameraFollow();
    cameraFollow.reset(view, initial, controller.mission, controller.model);
    const scene = await createScene(view, () => false);
    if (!scene) throw Error('Owned scene unexpectedly disposed');
    let destroyed = false, ready = false, renderCount = 0;
    const onStep = (state: typeof initial) => cameraFollow.step(view, state, controller.mission, controller.model);
    const options = { onStep };
    function displayWitness() {
      let count = 0;
      function visit(node: Container): unknown {
        if (++count > 12000) throw Error('Public display witness cap exceeded');
        const classified = classifyPublicDisplay(node);
        const children = node.label === 'particles' ? node.children.filter(child => child.visible) : node.children;
        return { label: node.label, visible: node.visible, renderable: node.renderable,
          position: { x: node.position.x, y: node.position.y }, scale: { x: node.scale.x, y: node.scale.y },
          pivot: { x: node.pivot.x, y: node.pivot.y }, skew: { x: node.skew.x, y: node.skew.y },
          ...classified,
          rotation: node.rotation, alpha: node.alpha, tint: node.tint,
          blendMode: node.blendMode,
          omittedInvisibleChildren: node.children.length - children.length, children: children.map(visit) };
      }
      return { graph: visit(view.app.stage), inspectedNodes: count,
        omittedPrivateParticleState: ['vx/vy', 'raw ages/lifetimes', 'birth counters', 'PRNG cursors', 'free/live slot arrays'],
        coverage: 'All public display nodes, all visible particle sprite transforms/colors/textures plus pool hidden-count and original public aggregate inspection; private emitter arrays are not exposed or reconstructed' };
    }
    const snapshot = () => ({ state: structuredClone(controller.loop.state), previous: structuredClone(controller.loop.previous),
      telemetry: flatten(controller.loop.state), accumulator: controller.loop.accumulator,
      totalSteps: controller.loop.totalSteps, simulatedTime: controller.loop.simulatedTime,
      modelId: controller.model.id, mission: controller.mission ?? null,
      camera: structuredClone(view.camera), viewport: { ...view.viewport }, presentation: scene.presentation(), display: displayWitness(),
      rendererPolicy: { hardwareMaximum, originalBatchBound: 32, selectedBatchBound: renderer.limits.maxBatchableTextures,
        observedRenderer: observed, antialias: gl.getContextAttributes()?.antialias, resolution: renderer.resolution,
        dpr: devicePixelRatio, backingWidth: canvas.width, backingHeight: canvas.height,
        drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight },
      startupWitness: { noDrawsBeforePolicy: startup.totalDrawCalls === 0, noLinkedBatchShaderBeforePolicy: true }, renderCount, physicsFrozen: ready });
    return {
      async condition() {
        if (ready || destroyed) throw Error('Exactly one deterministic conditioning recipe');
        controller.emit({ type: 'autoTakeOff' });
        for (let i = 0; i < 360; i++) controller.advance(DT, options);
        const steps = [];
        for (let i = 0; i < 3; i++) {
          const result = controller.advance(0.25, options);
          // Fixed, explicit simulated visual time, independent of wall pacing.
          if (result.simulatedDt !== 0.25 || result.steps !== 30) throw Error('Declared deterministic0.25/30-step input changed');
          scene.draw(controller.loop.state, controller.loop.previous, 0.25, preset, controller);
          view.app.render(); gl.finish(); renderCount++;
          steps.push({ advance: result, snapshot: snapshot() });
        }
        ready = true;
        return { recipe: { rawFixedSteps: 360, fixedDt: DT, positiveConditioningDraws: 3, conditioningSimulatedDt: 0.25,
          actualController: true, actualCameraPerStep: true, actualSceneEmitUpdate: true, wallClockReplacement: false }, steps, frozen: snapshot() };
      },
      draw() {
        if (!ready || destroyed) throw Error('Kernel must be positively conditioned and live');
        scene.draw(controller.loop.state, controller.loop.previous, 0, preset, controller);
        view.app.render(); renderCount++;
      },
      snapshot,
      destroy() { if (!destroyed) { destroyed = true; scene.destroy(); view.destroy(); } },
    };
  } catch (error) { view.destroy(); throw error; }
}
