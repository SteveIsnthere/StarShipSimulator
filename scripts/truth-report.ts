/**
 * Print every reference row against the simulation: IN or OUT, by how much.
 * A report, not a gate; tests/reference/ratchet.test.ts is the gate.
 *
 * Usage: npm run truth:report
 */
import { BANDS } from '../tests/reference/anchors';
import { judge } from '../tests/reference/bands';

const fmt = (n: number) =>
  Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : Number(n.toPrecision(5)).toString();

let inBand = 0;
for (const band of BANDS) {
  const v = judge(band);
  if (v.status === 'IN') inBand += 1;
  const factor = v.status === 'OUT' ? `x${v.factor.toPrecision(4)}` : '';
  console.log(
    [
      v.status.padEnd(4),
      band.tier,
      band.id.padEnd(26),
      `${fmt(v.value)} ${band.unit}`.padEnd(18),
      `[${fmt(band.min)}, ${fmt(band.max)}]`.padEnd(26),
      factor,
    ].join(' '),
  );
}
console.log(`\n${inBand} of ${BANDS.length} rows in band`);
