/**
 * Render a shell surface inside a real, headless session (no canvas: the
 * session's commands and store work without one). Use from a test file that
 * starts with `// @vitest-environment jsdom`.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createSession, type Session } from '$ui/session/session';
import { SessionContext } from '$ui/shell/session-context';
import { installMemoryStorage } from '../../memory-storage';

afterEach(() => cleanup());

export function renderWithSession(
  ui: ReactElement,
  session: Session = (installMemoryStorage(), createSession()),
): RenderResult & { session: Session } {
  const result = render(<SessionContext.Provider value={session}>{ui}</SessionContext.Provider>);
  return Object.assign(result, { session });
}
