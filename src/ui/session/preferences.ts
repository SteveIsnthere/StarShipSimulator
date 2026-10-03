/** Interaction-only preferences, separated from the flight's fixed-step path. */
import { CAMERA_KEY, CINEMATIC_KEY, HINT_KEY, clearPreferences,
  readFlag, readItem, writeItem } from '$app/preferences';
import { DEFAULT_VOLUME, readMuted, readVolume, type AudioEngine } from '$audio/engine';
import { CAMERA_MODES, type CameraMode } from '$view/camera';
import { isHintOpen, type SessionStore } from './store';

/** Below this height the first-flight hint does not fit. */
export const HINT_FITS = '(height >= 26rem)';

export function readSessionPreferences() {
  const stored = readItem(CAMERA_KEY) ?? '';
  const cameraMode = (CAMERA_MODES as readonly string[]).includes(stored) ? stored as CameraMode : 'follow';
  let hintFits = true;
  try { hintFits = window.matchMedia(HINT_FITS).matches; } catch { /* Headless or unsupported browser. */ }
  return {
    cinematic: readFlag(CINEMATIC_KEY), cameraMode,
    muted: readMuted(), volume: readVolume(), hintSeen: readFlag(HINT_KEY), hintFits,
  };
}

export function createPreferenceCommands(store: SessionStore, audio: AudioEngine,
  applyCameraMode: () => void, unlockAudio: () => void) {
  const get = store.getState, set = store.setState;
  function setVolume(level: number, remember = true) {
    audio.setVolume(level, { remember });
    set({ volume: audio.volume });
    if (remember && !get().muted) unlockAudio();
  }
  return {
    setVolume,
    dismissHint() {
      if (!isHintOpen(get())) return;
      writeItem(HINT_KEY, '1');
      set({ hintSeen: true });
    },
    toggleCinematic() {
      const cinematic = !get().cinematic;
      writeItem(CINEMATIC_KEY, cinematic ? '1' : '0');
      set({ cinematic });
      applyCameraMode();
    },
    selectCameraMode(mode: CameraMode) {
      writeItem(CAMERA_KEY, mode);
      set({ cameraMode: mode });
      applyCameraMode();
    },
    toggleMuted() {
      const muted = !get().muted;
      void audio.setMuted(muted);
      if (!muted) unlockAudio();
      set({ muted });
    },
    restoreDefaults() {
      void audio.setMuted(false);
      setVolume(DEFAULT_VOLUME);
      set({ muted: false, hintSeen: false, layer: null, cinematic: false, cameraMode: 'follow' });
      applyCameraMode();
      clearPreferences();
    },
  };
}
