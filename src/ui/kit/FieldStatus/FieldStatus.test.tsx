import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldStatus } from './FieldStatus';

describe('FieldStatus', () => {
	it('announces pending and explicitly applied states as polite status', () => {
		const { rerender } = render(
			<FieldStatus state={{ kind: 'pending', message: 'Saving altitude…' }} />,
		);

		expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
		expect(screen.getByRole('status')).toHaveAttribute('data-state', 'pending');
		expect(screen.getByRole('status')).toHaveTextContent('Saving altitude…');
		expect(screen.getByRole('status').className).not.toMatch(/animate|transition/);

		rerender(<FieldStatus state={{ kind: 'applied', message: 'Altitude applied' }} />);
		expect(screen.getByRole('status')).toHaveAttribute('data-state', 'applied');
		expect(screen.getByRole('status')).toHaveTextContent('Altitude applied');
	});

	it('announces failure assertively and removes idle state', () => {
		const { rerender } = render(
			<FieldStatus id="field-status" state={{ kind: 'failed', message: 'Could not save altitude' }} />,
		);

		expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
		expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'failed');
		expect(screen.getByRole('alert')).toHaveTextContent('Could not save altitude');

		rerender(<FieldStatus state={{ kind: 'idle' }} />);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});
});
