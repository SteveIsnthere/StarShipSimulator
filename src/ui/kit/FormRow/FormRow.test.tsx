import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormRow } from './FormRow';

describe('FormRow', () => {
	it('associates an explicit label with a single control', () => {
		render(
			<FormRow label="Altitude" labelFor="altitude">
				<input id="altitude" />
			</FormRow>,
		);

		expect(screen.getByLabelText('Altitude')).toHaveAttribute('id', 'altitude');
	});

	it('keeps composite rows as visible text without inventing one control association', () => {
		render(
			<FormRow label="Trim">
				<button type="button">Decrease</button>
				<button type="button">Increase</button>
			</FormRow>,
		);

		expect(screen.getByText('Trim').tagName).toBe('SPAN');
		expect(screen.getByRole('button', { name: 'Decrease' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Increase' })).toBeInTheDocument();
	});
});
