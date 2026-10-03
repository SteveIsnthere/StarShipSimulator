// @vitest-environment jsdom
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession } from '$ui/session/session';
import { Controls } from '$ui/shell/Controls/Controls';
import { renderWithSession } from './render';

describe('selected vehicle engine controls', () => {
  it('replaces booster rings with Ship individual controls on selection and commands only the chosen body', () => {
    const session = createSession();
    session.startHotStage(123);
    renderWithSession(<Controls />, session);
    expect(screen.getByTestId('raptor-5')).toBeTruthy();
    fireEvent.click(screen.getByTestId('select-super-heavy'));
    expect(screen.queryByTestId('raptor-0')).toBeNull();
    const shipBefore = structuredClone(session.mission!.ship);
    fireEvent.click(screen.getByTestId('engine-group-outer'));
    expect(session.mission!.booster.engines.ignitionCountdown.filter(value => value !== null)).toHaveLength(20);
    expect(session.mission!.ship).toEqual(shipBefore);
    expect(screen.getByTestId('auto-land').hasAttribute('disabled')).toBe(true);
    act(() => session.selectVehicle('ship'));
    expect(screen.queryByTestId('engine-group-outer')).toBeNull();
    expect(screen.getByTestId('raptor-5')).toBeTruthy();
  });
});
