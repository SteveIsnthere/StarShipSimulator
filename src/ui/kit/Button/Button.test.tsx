import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Button } from './Button';

it('forwards native button behavior, attributes and refs', () => {
	const onClick = vi.fn();
	const ref = createRef<HTMLButtonElement>();
	const { rerender } = render(
		<Button ref={ref} type="submit" name="launch" onClick={onClick}>Launch</Button>,
	);
	const button = screen.getByRole('button', { name: 'Launch' });
	expect(ref.current).toBe(button);
	expect(button).toHaveAttribute('type', 'submit');
	expect(button).toHaveAttribute('name', 'launch');
	expect(button).toHaveAttribute('data-variant', 'secondary');
	fireEvent.click(button);
	expect(onClick).toHaveBeenCalledTimes(1);
	rerender(<Button onClick={onClick} disabled>Launch</Button>);
	fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
	expect(onClick).toHaveBeenCalledTimes(1);
});
