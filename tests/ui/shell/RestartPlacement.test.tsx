// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { createSession } from '$ui/session/session';
import { Hud } from '$ui/shell/Hud/Hud';
import { Debrief } from '$ui/shell/Debrief/Debrief';
import { PHONE_PORTRAIT, SHORT_LANDSCAPE, type LayoutMode } from '$ui/shell/layout';
import { DT } from '$app/loop';
import { installMemoryStorage } from '../../memory-storage';
import { renderWithSession } from './render';

afterEach(() => vi.unstubAllGlobals());
function media(initial: LayoutMode) {
  let mode = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: mode === 'phone' ? query === PHONE_PORTRAIT : mode === 'short' && query === SHORT_LANDSCAPE,
    media: query,
    addEventListener(_name: string, listener: () => void) { listeners.add(listener); },
    removeEventListener(_name: string, listener: () => void) { listeners.delete(listener); },
  }));
  return (next: LayoutMode) => act(() => { mode = next; for (const listener of listeners) listener(); });
}

describe('one recovery action in its layout zone', () => {
  it.each(['wide', 'phone', 'short'] as const)('%s shows one action after actual report dismissal and restarts the flight', mode => {
    media(mode); installMemoryStorage();
    const session = createSession(); session.loop.state.failures.crashed = true; session.advance(DT);
    renderWithSession(<><Hud /><Debrief /></>, session);
    expect(screen.queryByTestId('restart')).toBeNull();
    fireEvent.click(screen.getByTestId('debrief-close'));
    expect(screen.getAllByTestId('restart')).toHaveLength(1);
    const restart = screen.getByTestId('restart');
    expect(restart.closest('[aria-label="Flight data"]') !== null).toBe(mode === 'short');
    fireEvent.click(restart);
    expect(session.loop.state.failures.crashed).toBe(false);
    expect(session.loop.totalSteps).toBe(0);
    expect(screen.queryByTestId('restart')).toBeNull();
  });

  it('rotation moves the same single action between floating and inline owners', () => {
    const rotate = media('phone'); installMemoryStorage();
    const session = createSession(); session.loop.state.failures.crashed = true; session.advance(DT);
    session.dismissDebrief();
    renderWithSession(<><Hud /><Debrief /></>, session);
    for (const mode of ['short', 'wide', 'phone', 'short'] as const) {
      rotate(mode);
      expect(screen.getAllByTestId('restart')).toHaveLength(1);
      expect(screen.getByTestId('restart').closest('[aria-label="Flight data"]') !== null).toBe(mode === 'short');
    }
    act(() => session.restart());
    expect(screen.queryByTestId('restart')).toBeNull();
  });
});
