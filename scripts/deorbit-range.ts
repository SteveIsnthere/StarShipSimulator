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
// A single flight measures range health. Any calibration requires recorded
// aim/miss evidence and the full approved scenario envelope.
console.log(`current measured aim: ${DEORBIT_ENTRY_RANGE} m; do not infer a replacement from one miss`);
