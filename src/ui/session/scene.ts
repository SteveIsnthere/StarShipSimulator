/** Full standalone scene entry; runtime startup is shared, never duplicated. */
import type { RenderQualityMode } from '$view/render-quality';
import type { SimState } from '$core/state';
import type { DebugRendererMetadata } from '$app/debug';
import type { ScenarioPreset } from '$core/scenarios';
import type { ViewApp } from '$view/app';
import type { MissionController } from './mission-controller';
import type { renderQuality } from '$view/render-quality';
import type { createSceneVehicles } from './scene-vehicles';
import { createSceneRuntime } from './scene-runtime';
import { attachSceneWitness } from './scene-witness';
export interface Scene {
  /** Draw one frame of `state`, `worldDt` simulated seconds after the last. */
  draw(state: SimState, previous: SimState, worldDt: number, preset: ScenarioPreset, controller: MissionController): void;
  /** Match the viewport to the window. */
  resize(width: number, height: number): void;
  /** Discard effects and emitter history belonging to the preceding flight. */
  resetFlight(): void;
  /** Debug witnesses use the actual rendered nozzle, never a viewport guess. */
  presentation(): ReturnType<ReturnType<typeof createSceneVehicles>['presentation']> & {
    width: number; height: number; worldDt: number; renderer: DebugRendererMetadata;
    quality: { requested: ReturnType<typeof renderQuality>; actualBodies: ReturnType<ReturnType<typeof createSceneVehicles>['qualityMetadata']> };
  };
  setRenderQuality(mode: RenderQualityMode): void;
  setParticlesVisible(visible: boolean): void;
  setVehiclesVisible(visible: boolean): void;
  setComponentVisible(id: string, visible: boolean): void;
  destroy(): void;
}

export async function createScene(view: ViewApp, isDisposed: () => boolean, initialMode: RenderQualityMode = 'full'): Promise<Scene | undefined> {
  const runtime = await createSceneRuntime(view, isDisposed, initialMode);
  return runtime ? attachSceneWitness(runtime) : undefined;
}
