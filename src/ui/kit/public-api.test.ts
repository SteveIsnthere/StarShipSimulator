import { expect, it } from 'vitest';
import * as portable from '@ui';

it('exports the complete portable primitive surface from @ui', () => {
	const expected = [
		'Badge', 'Button', 'CardGroup', 'EmptyState', 'Eyebrow', 'FormRow', 'KeyCap',
		'LabeledValue', 'MetaList', 'MetricStrip', 'NumberField', 'PageBackground',
		'PageHeader', 'Rail', 'SliderRow', 'Surface', 'TabStrip', 'Tile', 'Toggle',
	];
	for (const name of expected) expect(portable[name as keyof typeof portable]).toBeDefined();
});
