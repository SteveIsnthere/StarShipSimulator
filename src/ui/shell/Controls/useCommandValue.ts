/**
 * A slider's position, kept to the command the simulation actually holds.
 *
 * The slider is not the only thing that writes its command: W/S and Z/X step
 * the throttle, tilt and A/D move the yoke, the autopilot sets both, and a new
 * flight resets them. A slider that only knew where the pilot last dragged it
 * would show a lie the moment any of those acted.
 *
 * Following the command every frame would put React on the per-frame path,
 * which this shell does not do. So the position is re-read at the moments
 * something else can have moved it and the pilot could notice: after any key
 * (on `window`, so the session's own document listener has already applied it),
 * on any session store change (a new flight, a layer closing), and when the
 * pilot reaches for the slider itself (`resync`, for pointer-enter and focus) —
 * so a drag never starts from a stale position. Reading is two property loads;
 * an unchanged value is a React no-op.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../session-context';
import type { Session } from '$ui/session/session';

export interface CommandValue {
  value: number;
  /** The pilot moved the slider. */
  set(value: number): void;
  /** Re-read the simulation's command. */
  resync(): void;
}

/** The commanded throttle, percent. */
export const readThrottle = (session: Session): number => session.readThrottle();

/** The yoke's position, -100..100. */
export const readYoke = (session: Session): number => session.loop.state.autopilot.pitchControl;

/** `read` must be stable — one of the readers above. */
export function useCommandValue(read: (session: Session) => number): CommandValue {
  const session = useSession();
  const [value, setValue] = useState(() => Math.round(read(session)));
  const resync = useCallback(() => setValue(Math.round(read(session))), [session, read]);

  useEffect(() => {
    window.addEventListener('keydown', resync);
    window.addEventListener('keyup', resync);
    const unsubscribe = session.store.subscribe(resync);
    return () => {
      window.removeEventListener('keydown', resync);
      window.removeEventListener('keyup', resync);
      unsubscribe();
    };
  }, [session, resync]);

  return { value, set: setValue, resync };
}
