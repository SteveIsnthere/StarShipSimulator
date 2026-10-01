import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Tile } from './Tile';

it('exposes selection independently from activation and preserves native disabled behavior', () => {
	const onClick = vi.fn();
	const { rerender } = render(<Tile selected onClick={onClick}>F/A-18</Tile>);
	const tile = screen.getByRole('button', { name: 'F/A-18' });
	expect(tile).toHaveAttribute('data-selected', 'true');
	expect(tile).toHaveAttribute('data-tone', 'neutral');
	fireEvent.click(tile);
	expect(onClick).toHaveBeenCalledTimes(1);
	rerender(<Tile disabled onClick={onClick}>F/A-18</Tile>);
	expect(screen.getByRole('button', { name: 'F/A-18' })).toBeDisabled();
	fireEvent.click(screen.getByRole('button', { name: 'F/A-18' }));
	expect(onClick).toHaveBeenCalledTimes(1);
	rerender(<Tile tone="danger">End flight</Tile>);
	expect(screen.getByRole('button', { name: 'End flight' })).toHaveAttribute('data-tone', 'danger');
});
