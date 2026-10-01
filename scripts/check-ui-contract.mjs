/**
 * The copy contract (docs/design/design-system.md §3): the interface speaks a
 * player's words. Fails when the developer labels the UX critique found come
 * back as rendered text in the React shell. Runs its self-test first.
 *
 * Usage: node scripts/check-ui-contract.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SCOPE = join(ROOT, 'src/ui/shell');

/** Each pattern matches JSX text or a string literal a user would read. */
export const COPY_RULES = [
  { id: 'toggle-all', pattern: /(?:>|['"`])\s*TOGGLE[- ]ALL\s*(?:<|['"`])/gi, say: 'Engines' },
  { id: 'dumpfuel', pattern: /(?:>|['"`])\s*DUMP ?FUEL\s*(?:<|['"`])/gi, say: 'Dump propellant' },
  { id: 'safe-guard', pattern: /(?:>|['"`])\s*THRUST SAFE ?GUARD\s*(?:<|['"`])/gi, say: 'Throttle guard' },
  { id: 'att-hold', pattern: /(?:>|['"`])\s*ATT-HOLD\s*(?:<|['"`])/gi, say: 'Hold attitude' },
  { id: 'raptor-codes', pattern: />\s*R[123]\s*</g, say: 'Engine 1, 2, 3' },
  { id: 'all-raptors', pattern: /All Raptors/g, say: 'Engines' },
  { id: 'full-scale', pattern: /(?:>|['"`])\s*FS\s/g, say: 'say what the scale is, in words' },
  { id: 'new-in-v2', pattern: /new in v2/gi, say: 'no development history in the interface' },
  { id: 'speed-things', pattern: /Speed Things Up|Slow Things Down/g, say: 'label time warp by its value' },
];

export function inspectCopy(file, source) {
  const issues = [];
  for (const rule of COPY_RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of source.matchAll(rule.pattern)) {
      const line = source.slice(0, m.index).split('\n').length;
      issues.push({ file, line, rule: rule.id, match: m[0].trim(), say: rule.say });
    }
  }
  return issues;
}

function selfTest() {
  const bad = {
    'toggle-all': '<button>TOGGLE-ALL</button>',
    dumpfuel: "label: 'DUMPFUEL',",
    'safe-guard': '<span>Thrust Safe Guard</span>',
    'att-hold': '<b>ATT-HOLD</b>',
    'raptor-codes': '<button>R2</button>',
    'all-raptors': 'press All Raptors',
    'full-scale': '<span>FS 200 M/S</span>',
    'new-in-v2': '<h3>Orbital · new in v2</h3>',
    'speed-things': '<button>Speed Things Up</button>',
  };
  for (const rule of COPY_RULES) {
    if (!inspectCopy('t.tsx', bad[rule.id]).some((i) => i.rule === rule.id)) {
      throw new Error(`self-test: copy rule ${rule.id} did not fire`);
    }
  }
  const good = '<button>Engines</button><span>Throttle guard</span><span>Engine 2</span>';
  if (inspectCopy('t.tsx', good).length) throw new Error('self-test: clean copy flagged');
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return ['.ts', '.tsx'].includes(extname(e.name)) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

selfTest();
const issues = walk(SCOPE).flatMap((f) => inspectCopy(relative(ROOT, f), readFileSync(f, 'utf8')));
if (issues.length) {
  console.error('copy contract: failed');
  for (const i of issues) console.error(`  ${i.file}:${i.line} [${i.rule}] "${i.match}" — ${i.say}`);
  process.exit(1);
}
console.log(`copy contract: ok (${COPY_RULES.length} rules, self-test passed)`);
