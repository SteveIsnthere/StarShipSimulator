// @vitest-environment jsdom
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MissionControls } from '$ui/shell/Controls/MissionControls';
import { createSession } from '$ui/session/session';
import { DT } from '$app/loop';
import { renderWithSession } from './render';

describe('hot-stage player controls', () => {
  it('selects the actual body, stages once and shows separation from the shared clock', () => {
    const session = createSession();
    session.startHotStage(123);
    renderWithSession(<MissionControls blocked={false} />, session);
    fireEvent.click(screen.getByRole('tab', { name: 'Super Heavy' }));
    expect(session.model.id).toBe('super-heavy');
    expect(screen.getByRole('tab', { name: 'Super Heavy' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Stage' }));
    expect(session.store.getState().stageRequested).toBe(true);
    expect(screen.getByRole('button', { name: 'Stage' }).hasAttribute('disabled')).toBe(true);
    act(() => { for (let i = 0; i < 180; i++) session.advance(DT); });
    expect(screen.getByText('Separated')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Stage' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Ship' }));
    expect(session.loop.state).toBe(session.mission!.ship);
  });
});
