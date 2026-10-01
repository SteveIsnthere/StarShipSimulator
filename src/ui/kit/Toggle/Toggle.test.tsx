import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

it('reports switch state and does not toggle while disabled', () => {
	const onToggle = vi.fn();
	const { rerender } = render(<Toggle active={false} onToggle={onToggle} aria-label="Autopilot" />);
	const toggle = screen.getByRole('switch', { name: 'Autopilot' });
	expect(toggle).toHaveAttribute('aria-checked', 'false');
	fireEvent.click(toggle);
	expect(onToggle).toHaveBeenCalledTimes(1);
	rerender(<Toggle active onToggle={onToggle} aria-label="Autopilot" disabled />);
	expect(screen.getByRole('switch', { name: 'Autopilot' })).toHaveAttribute('aria-checked', 'true');
	fireEvent.click(screen.getByRole('switch', { name: 'Autopilot' }));
	expect(onToggle).toHaveBeenCalledTimes(1);
});
