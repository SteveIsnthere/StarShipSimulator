import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

// jsdom does not evaluate media queries against computed styles, so this pins
// the stylesheet contract; the browser row in the phase 12 evidence measures
// the computed transition and animation under emulated reduced motion.
it('makes every CSS transition instant and stops looping spinners under reduced motion (FB-134)', () => {
	const css = readFileSync(resolve(__dirname, 'motion.css'), 'utf8');
	const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map(match => match[1]);
	const transitions = blocks.find(block => /transition-duration:\s*0s\s*!important/.test(block));
	expect(transitions).toBeDefined();
	expect(transitions).toMatch(/^\s*\*,\s*::before,\s*::after\s*\{/m);
	expect(transitions).toMatch(/transition-delay:\s*0s\s*!important/);
	expect(transitions).toMatch(/\.animate-spin,\s*\.animate-pulse\s*\{\s*animation:\s*none\s*!important/);
});
