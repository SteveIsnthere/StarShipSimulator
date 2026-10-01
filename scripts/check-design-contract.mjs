/**
 * Fails the build when the React shell breaks the design contract. Runs its
 * self-test first: a rule that stopped firing would otherwise pass everything.
 *
 * Scope: src/ui/shell (our chrome). The vendored kit is checked in flight_sim.
 * Usage: node scripts/check-design-contract.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { DESIGN_RULES, inspectDesignSource } from './lib/design-contract.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SCOPE = join(ROOT, 'src/ui/shell');

function selfTest() {
  const samples = {
    'concrete-grey': '<div className="bg-zinc-900" />',
    radius: '<div className="rounded-lg" />',
    shadow: '<div className="shadow-md" />',
    blur: '<div className="backdrop-blur-sm" />',
    'local-focus': '<button className="focus:ring-2" />',
    'opacity-grade': '<p className="text-white/60" />',
    'raw-colour': 'const c = "#ff0000";',
    gradient: 'background: linear-gradient(red, blue);',
    'css-shadow': '.a { box-shadow: 0 1px 2px black; }',
    'css-blur': '.a { backdrop-filter: blur(4px); }',
    'css-radius': '.a { border-radius: 4px; }',
  };
  for (const rule of DESIGN_RULES) {
    const sample = samples[rule.id];
    if (!sample) throw new Error(`self-test: no sample for rule ${rule.id}`);
    const hits = inspectDesignSource('self-test.tsx', sample).filter((i) => i.rule === rule.id);
    if (hits.length === 0) throw new Error(`self-test: rule ${rule.id} did not fire on its sample`);
  }
  const clean = '<div className="bg-ui-bg text-ui-muted rounded-ui-control border-ui-line" />\n.a { border-radius: 0; box-shadow: none; }';
  const falsePositives = inspectDesignSource('self-test.tsx', clean);
  if (falsePositives.length) throw new Error(`self-test: clean sample flagged: ${JSON.stringify(falsePositives)}`);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return ['.ts', '.tsx', '.css'].includes(extname(e.name)) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

selfTest();
const issues = walk(SCOPE).flatMap((file) =>
  inspectDesignSource(relative(ROOT, file).split('\\').join('/'), readFileSync(file, 'utf8')),
);
if (issues.length) {
  console.error('design contract: failed');
  for (const i of issues) console.error(`  ${i.file}:${i.line} [${i.rule}] ${i.message}: ${i.match}`);
  process.exit(1);
}
console.log(`design contract: ok (${DESIGN_RULES.length} rules, self-test passed)`);
