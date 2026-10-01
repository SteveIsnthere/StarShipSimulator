import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('portable class merging', () => {
	it('lets the last legacy or portable radius override win', () => {
		expect(cn('rounded-ui-panel', 'rounded-ui-control')).toBe('rounded-ui-control');
		expect(cn('rounded-ui-sheet', 'rounded-ui-control')).toBe('rounded-ui-control');
		expect(cn('rounded-ui-tile', 'rounded-none')).toBe('rounded-none');
	});
});
