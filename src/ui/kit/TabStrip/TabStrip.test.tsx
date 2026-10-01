import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TabStrip } from './TabStrip';

it('preserves tab roles, selection and activation callbacks', () => {
	const select = vi.fn();
	render(
		<TabStrip aria-label="Builder panels">
			<TabStrip.Tab active initial>Parts</TabStrip.Tab>
			<TabStrip.Tab onClick={select}>Properties</TabStrip.Tab>
		</TabStrip>,
	);
	expect(screen.getByRole('tablist', { name: 'Builder panels' })).toBeInTheDocument();
	expect(screen.getByRole('tab', { name: 'Parts' })).toHaveAttribute('aria-selected', 'true');
	expect(screen.getByRole('tab', { name: 'Parts' })).toHaveAttribute('data-gp-initial', 'true');
	fireEvent.click(screen.getByRole('tab', { name: 'Properties' }));
	expect(select).toHaveBeenCalledTimes(1);
});
