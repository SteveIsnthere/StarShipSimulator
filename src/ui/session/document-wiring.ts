/**
 * The session's listeners on the document and window: what a gesture unlocks,
 * which keys the session owns (Escape, P), when the debrief steps aside, a
 * backgrounded tab, and the keyboard and tilt input bindings.
 *
 * Split out of session.ts so the session reads as the loop and its commands;
 * everything here is wiring, attached at mount and removed by the returned
 * teardown. Two behaviours come from docs/design/ia.md: an open layer pauses
 * the flight, and Escape closes the top layer first.
 */
import type { ControlEvent } from '$app/controls';
import { bindInput, bindTilt } from '$app/input';
import type { SessionStore } from './store';

export interface DocumentWiringDeps {
  readonly store: SessionStore;
  /** Every interaction may unlock audio and haptics, and the first puts the hint away. */
  onGesture(): void;
  /** A hidden tab must not keep a rocket roaring in a pocket. */
  onBackgrounded(hidden: boolean): void;
  emit(event: ControlEvent): void;
  zoom(direction: 1 | -1): void;
  readThrottle(): number;
  /** The pilot has the yoke (or tilt is off): tilt yields. */
  isManual(): boolean;
}

/** Attach every listener; returns the teardown. */
export function wireDocument(deps: DocumentWiringDeps): () => void {
  const { store } = deps;
  const get = store.getState;
  const set = store.setState;

  // Capture phase, nothing prevented: the tap that dismisses the hint also
  // lights the engine.
  const onGesture = () => deps.onGesture();
  document.addEventListener('pointerdown', onGesture, { capture: true });
  document.addEventListener('keydown', onGesture, { capture: true });

  // The debrief is a summary, not a dialog: the first touch elsewhere puts it
  // away, and the control under that touch still gets the touch. Not while a
  // layer is open over it (going to the black box and back keeps the card).
  const onPointerAway = (event: Event) => {
    const s = get();
    if (s.debrief === null || s.layer !== null) return;
    const target = event.target as Element | null;
    if (target?.closest?.('[data-debrief]')) return;
    set({ debrief: null });
  };
  document.addEventListener('pointerdown', onPointerAway, { capture: true });

  // Escape closes the top layer first, then the debrief, then opens the menu.
  // P pauses. Neither fires while typing into a field.
  const onKey = (event: KeyboardEvent) => {
    const typing =
      event.target instanceof HTMLElement &&
      (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
    const s = get();
    if (event.key === 'Escape') {
      if (s.layer !== null) set({ layer: null });
      else if (s.debrief !== null) set({ debrief: null });
      else set({ layer: 'menu' });
      event.preventDefault();
    } else if ((event.key === 'p' || event.key === 'P') && !typing && s.layer === null) {
      set({ playerPaused: !s.playerPaused });
    }
  };
  document.addEventListener('keydown', onKey);

  const onVisibility = () => deps.onBackgrounded(document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  const keyboard = bindInput(document, {
    control: deps.emit,
    view: (action) => deps.zoom(action.direction),
    readThrottle: deps.readThrottle,
    isBlocked: () => get().layer !== null,
  });
  const tilt = bindTilt(window, {
    control: deps.emit,
    isManual: deps.isManual,
    orientationAngle: () => screen.orientation?.angle ?? 0,
  });

  return () => {
    document.removeEventListener('pointerdown', onGesture, { capture: true });
    document.removeEventListener('keydown', onGesture, { capture: true });
    document.removeEventListener('pointerdown', onPointerAway, { capture: true });
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    keyboard.destroy();
    tilt.destroy();
  };
}
