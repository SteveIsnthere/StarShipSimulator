/**
 * Measure the downrange distance autoLand covers from the entry interface, and
 * compare it with DEORBIT_ENTRY_RANGE (tests/golden/deorbit-range.ts).
 *
 * Usage: npm run deorbit:range
 */
import { DEORBIT_ENTRY_RANGE } from '../src/core/constants';
import { measureDeorbitRange } from '../tests/golden/deorbit-range';

const m = measureDeorbitRange();
const km = (n: number) => `${(n / 1000).toFixed(2)} km`;
console.log(`outcome ${m.outcome}`);
console.log(`entry interface at ${km(m.entryDownRange)}, touchdown at ${km(m.touchdownDownRange)}`);
console.log(`range ${km(m.range)} against DEORBIT_ENTRY_RANGE ${km(DEORBIT_ENTRY_RANGE)} (${(((m.range - DEORBIT_ENTRY_RANGE) / DEORBIT_ENTRY_RANGE) * 100).toFixed(2)}%)`);
console.log(`miss ${km(m.miss)}`);
// The constant is the deorbit burn's aim, not the measured crossing-to-touchdown
// distance (they differ by a few per cent: the burn aims the vacuum conic's
// crossing, the air bends the real one). An overshoot of `miss` means the aim
// should be that much longer, so the re-derived value is the constant plus the miss.
console.log(`re-derived DEORBIT_ENTRY_RANGE: ${Math.round(DEORBIT_ENTRY_RANGE + m.miss)} m`);
