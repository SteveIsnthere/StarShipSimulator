/**
 * What the interface renders, and nothing else.
 *
 * A Zustand vanilla store so the session (framework-free) writes it and the
 * React shell reads it with `useStore`. It changes on interaction and on flight
 * transitions (a landing, a crash), never per frame: per-frame numbers go to
 * the HUD binders, which write the DOM directly.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { CameraMode } from '$view/camera';
import type { Debrief } from '$hud/debrief';
import { INTRO, type ScenarioPreset } from '$core/scenarios';
import { REAL_TIME, type TimeSetting } from '$app/menu';

/** Which full-screen layer is open over the flight, if any. Only one at a time. */
export type Layer = 'menu' | 'blackBox' | 'guide' | 'about' | null;

export interface SessionState {
  /** The preset the current flight was built from. */
  preset: ScenarioPreset;
  layer: Layer;
  /** Paused by the player (P). A layer also pauses the flight; see `isPaused`. */
  playerPaused: boolean;
  /** Paused by `window.__simDebug`, for deterministic setup. */
  debugPaused: boolean;
  cinematic: boolean;
  cameraMode: CameraMode;
  muted: boolean;
  /** 0..1 */
  volume: number;
  time: TimeSetting;
  randomFailure: boolean;
  tiltControl: boolean;
  /** The first-flight hint has been seen (or dismissed). */
  hintSeen: boolean;
  /** This layout has room for the hint. */
  hintFits: boolean;
  /** Landed, crashed, broken up or out of propellant: the restart is offered. */
  flightOver: boolean;
  /** The end-of-flight card, built once on landing, crash or break-up. */
  debrief: Debrief | null;
}

export type SessionStore = StoreApi<SessionState>;

export interface InitialPreferences {
  cinematic: boolean;
  cameraMode: CameraMode;
  muted: boolean;
  volume: number;
  hintSeen: boolean;
  hintFits: boolean;
}

export function createSessionStore(initial: InitialPreferences): SessionStore {
  return createStore<SessionState>(() => ({
    preset: INTRO,
    layer: null,
    playerPaused: false,
    debugPaused: false,
    time: REAL_TIME,
    randomFailure: false,
    tiltControl: true,
    flightOver: false,
    debrief: null,
    ...initial,
  }));
}

/** The flight does not advance while a layer is open or someone paused it. */
export function isPaused(s: SessionState): boolean {
  return s.playerPaused || s.debugPaused || s.layer !== null;
}

/** The hint shows only with nothing over it, room for it, and not yet seen. */
export function isHintOpen(s: SessionState): boolean {
  return !s.hintSeen && s.hintFits && s.layer === null;
}
