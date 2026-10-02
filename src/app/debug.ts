/**
 * `window.__simDebug` — deterministic setup and numeric telemetry for browser
 * witnesses (tests/e2e/witness-*.spec.ts) and for a person in the console.
 *
 * Attached only in a dev build or when the page URL carries `?debug=1`, so a
 * normal production load has no such global. It is the one sanctioned global
 * in the repo (`sim-core-conventions`); it is defined, not assigned, and it
 * reaches the simulation only through the loop the app already owns.
 */
import type { SimState } from '$core/state';
import type { ScenarioPreset } from '$core/scenarios';
import { step as stepCore } from '$core/step';
import { DT, type LoopState } from './loop';

/** Where a flight starts, as the flight editor sets it. */
export type FlightOverrides = Partial<
  Pick<
    ScenarioPreset,
    'altitude' | 'xPosition' | 'speedX' | 'speedY' | 'pitch' | 'propellant' | 'wind'
  >
>;

export interface DebugPresentation {
  /** Canvas CSS pixels from the last rendered frame. */
  nozzleX: number;
  nozzleY: number;
  width: number;
  height: number;
  /** Last positive render interval, in simulated seconds; zero after restart. */
  worldDt?: number;
  /** On-demand count of actual visible continuous-engine meshes. */
  bell?: { visibleMounts: number };
  /** On-demand particle statistics, produced by the presentation layer. */
  particles?: readonly Readonly<Record<string, number | string>>[];
}

export interface SimDebug {
  /**
   * Start a flight from a scenario id, optionally moved, as the flight editor
   * does — through the app, so the camera starts where the flight does.
   */
  setScenario(id: string, overrides?: FlightOverrides): void;
  /**
   * Overwrite state fields by their flattened path, e.g. 'engines.running[0]'.
   * For engines, throttle and switches; to move the vehicle use setScenario's
   * overrides, or the camera is left behind.
   */
  setState(patch: Readonly<Record<string, number | boolean>>): void;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  /**
   * Advance exactly `n` raw fixed-DT steps (use while paused): no player
   * input, no time warp. `n` steps are always n/120 s of flight.
   */
  step(n: number): void;
  /** Every number and boolean in the live state, by flattened path. */
  telemetry(): Readonly<Record<string, number | boolean>>;
  presentation(): DebugPresentation;
  /** Hide particles for an otherwise identical background control render. */
  setParticlesVisible(visible: boolean): void;
}

export interface SimDebugDeps {
  /** The live loop, once the app has created it. */
  loop(): LoopState | undefined;
  /** Start a flight from a scenario id; the app's own path, camera and all. */
  startScenario(id: string, overrides?: FlightOverrides): void;
  /** Ask the app to stop or resume advancing the loop each frame. */
  setPaused(paused: boolean): void;
  /** Run per step, as the app's frame loop would (camera, recorder). */
  onStep?(state: SimState): void;
  presentation?(): DebugPresentation;
  setParticlesVisible?(visible: boolean): void;
}

/** Whether this page should expose the debug surface. */
export function wantsSimDebug(dev: boolean, search: string): boolean {
  return dev || new URLSearchParams(search).get('debug') === '1';
}

export function flatten(
  value: unknown,
  prefix = '',
  out: Record<string, number | boolean> = {},
): Record<string, number | boolean> {
  if (typeof value === 'number' || typeof value === 'boolean') {
    out[prefix] = value;
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

function assignPath(target: Record<string, unknown>, path: string, value: number | boolean): void {
  const keys = path.split(/\.|\[(\d+)\]/).filter((k) => k !== undefined && k !== '');
  let node: Record<string, unknown> = target;
  for (const key of keys.slice(0, -1)) {
    const next = node[key];
    if (next === null || typeof next !== 'object') throw new Error(`no such state path: ${path}`);
    node = next as Record<string, unknown>;
  }
  const last = keys.at(-1)!;
  if (!(last in node)) throw new Error(`no such state path: ${path}`);
  node[last] = value;
}

export function createSimDebug(deps: SimDebugDeps): SimDebug {
  let paused = false;
  const live = (): LoopState => {
    const loop = deps.loop();
    if (!loop) throw new Error('the simulation has not started yet');
    return loop;
  };
  return {
    setScenario: (id, overrides) => deps.startScenario(id, overrides),
    setState(patch) {
      const loop = live();
      for (const [path, value] of Object.entries(patch)) {
        assignPath(loop.state as unknown as Record<string, unknown>, path, value);
      }
      loop.previous = loop.state;
    },
    pause() {
      paused = true;
      deps.setPaused(true);
    },
    resume() {
      paused = false;
      deps.setPaused(false);
    },
    get paused() {
      return paused;
    },
    step(n) {
      const loop = live();
      for (let i = 0; i < n; i++) {
        loop.previous = loop.state;
        loop.state = stepCore(loop.state, DT);
        loop.totalSteps += 1;
        loop.simulatedTime += DT;
        deps.onStep?.(loop.state);
      }
    },
    telemetry: () => flatten(live().state),
    presentation() {
      if (!deps.presentation) throw new Error("presentation is not mounted");
      return deps.presentation();
    },
    setParticlesVisible(visible) {
      if (!deps.setParticlesVisible) throw new Error("presentation is not mounted");
      deps.setParticlesVisible(visible);
    },
  };
}

/** Define `window.__simDebug` when the page asks for it; returns whether it did. */
export function installSimDebug(target: Window, dev: boolean, deps: SimDebugDeps): boolean {
  if (!wantsSimDebug(dev, target.location.search)) return false;
  Object.defineProperty(target, '__simDebug', {
    value: createSimDebug(deps),
    configurable: true,
    enumerable: false,
  });
  return true;
}
