/**
 * The session, reachable from any component. One per page, created by App.
 */
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { Session } from '$ui/session/session';
import type { SessionState } from '$ui/session/store';

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession outside <SessionContext.Provider>');
  return session;
}

/** Subscribe to one slice of the session's store; re-renders only when it changes. */
export function useSessionState<T>(select: (s: SessionState) => T): T {
  return useStore(useSession().store, select);
}
