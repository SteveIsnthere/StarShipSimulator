/**
 * Measure every golden flight's landing margins and write them beside the
 * goldens (tests/golden/landing-margins.ts says what each number means).
 *
 * Usage: npm run margins            # print and write tests/golden/landing-margins.json
 *        npm run margins -- --print # print only
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { measureAll } from '../tests/golden/landing-margins';

const report = measureAll();
const r = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? '—' : n.toFixed(d));

for (const f of [...report.flights, ...report.engineOut]) {
  const t = f.trigger;
  console.log(
    `${f.id.padEnd(32)} ${f.outcome.padEnd(8)} t=${r(f.seconds)}s vY=${r(f.speedY, 2)} vX=${r(f.speedX, 2)} prop=${r(f.propellant, 2)}t miss=${r(f.miss)}m` +
      (t ? `  | trigger at ${r(t.altitude)}m vY=${r(t.speedY)} est burn ${r(t.estimatedBurnAltitude)}m needed ${r(t.neededBurnAltitude)}m slack ${r(t.slack)}m` : ''),
  );
}
const i = report.intro;
console.log(`intro: touchdown ${r(i.touchdown, 3)}s lit ${i.litAtTouchdown.map(Number).join('')} shutdowns ${i.shutdowns.map((x) => `e${x.engine}@${x.seconds.toFixed(3)}`).join(' ')}`);

if (!process.argv.includes('--print')) {
  const out = fileURLToPath(new URL('../tests/golden/landing-margins.json', import.meta.url));
  writeFileSync(out, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`\nwrote ${out}`);
}
