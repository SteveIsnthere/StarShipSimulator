import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TransitionView } from './TransitionView';
import { useEffect, useState } from 'react';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function motionAllowed() {
	vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
}

it('keeps A through exit and commits only the latest C request', () => {
	motionAllowed();
	vi.useFakeTimers();
	const settled = vi.fn();
	const { rerender } = render(<TransitionView transitionKey="a" onSettled={settled}>A</TransitionView>);
	rerender(<TransitionView transitionKey="b" onSettled={settled}>B</TransitionView>);
	expect(screen.getByText('A')).toBeInTheDocument();
	expect(screen.queryByText('B')).not.toBeInTheDocument();
	rerender(<TransitionView transitionKey="c" onSettled={settled}>C</TransitionView>);
	act(() => vi.advanceTimersByTime(100));
	expect(screen.getByText('C')).toBeInTheDocument();
	expect(screen.queryByText('B')).not.toBeInTheDocument();
	act(() => vi.advanceTimersByTime(160));
	expect(settled).toHaveBeenCalledExactlyOnceWith('c');
});

it('commits immediately when reduced motion becomes active', () => {
	let reduced = false;
	const listeners = new Set<() => void>();
	vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb) }));
	vi.useFakeTimers();
	const { rerender } = render(<TransitionView transitionKey="a">A</TransitionView>);
	rerender(<TransitionView transitionKey="b">B</TransitionView>);
	expect(screen.getByText('A')).toBeInTheDocument();
	reduced = true;
	act(() => listeners.forEach(listener => listener()));
	expect(screen.getByText('B')).toBeInTheDocument();
});

it('interrupts enter from the displayed view and never settles the interrupted key', () => {
	motionAllowed(); vi.useFakeTimers();
	const settled = vi.fn();
	const { rerender, container, unmount } = render(<TransitionView transitionKey="a" onSettled={settled}>A</TransitionView>);
	rerender(<TransitionView transitionKey="b" onSettled={settled}>B</TransitionView>);
	act(() => vi.advanceTimersByTime(100));
	expect(screen.getByText('B')).toBeInTheDocument();
	rerender(<TransitionView transitionKey="c" onSettled={settled}>C</TransitionView>);
	expect(container.firstChild).toHaveAttribute('data-transition-key', 'b');
	expect(screen.getByText('B')).toHaveAttribute('inert');
	act(() => vi.advanceTimersByTime(100));
	expect(screen.getByText('C')).toBeInTheDocument();
	act(() => vi.advanceTimersByTime(160));
	expect(settled).toHaveBeenCalledExactlyOnceWith('c');
	rerender(<TransitionView transitionKey="d" onSettled={settled}>D</TransitionView>);
	unmount();
	act(() => vi.runAllTimers());
	expect(settled).toHaveBeenCalledTimes(1);
});

it('owns state and effects by displayed identity and never mounts superseded content', () => {
	motionAllowed(); vi.useFakeTimers();
	const events: string[] = [];
	function Pane({ id }: { id: string }) {
		const [initial] = useState(id);
		useEffect(() => { events.push(`mount:${id}`); return () => { events.push(`unmount:${id}`); }; }, [id]);
		return <span>State from {initial}</span>;
	}
	const { rerender, unmount } = render(<TransitionView transitionKey="a"><Pane id="a" /></TransitionView>);
	rerender(<TransitionView transitionKey="b"><Pane id="b" /></TransitionView>);
	rerender(<TransitionView transitionKey="c"><Pane id="c" /></TransitionView>);
	act(() => vi.advanceTimersByTime(100));
	expect(screen.getByText('State from c')).toBeInTheDocument();
	expect(events).toEqual(['mount:a', 'unmount:a', 'mount:c']);
	unmount();
	expect(events).toEqual(['mount:a', 'unmount:a', 'mount:c', 'unmount:c']);
});
