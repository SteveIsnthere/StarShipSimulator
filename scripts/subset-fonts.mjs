/**
 * The font pipeline, kept reproducible.
 *
 * NOT part of `npm run build`. The four woff2 files in `src/ui/shell/fonts/`
 * are committed build outputs: they change only when the charset or a source
 * release changes, and requiring Python and fontTools on every CI runner to
 * rebuild byte-identical files would be a fragile way to buy nothing. What this
 * script buys is the ability to redo it: the charset, the sources and the
 * subsetter flags live here rather than in a shell history.
 *
 * Run it when the charset changes:
 *
 *     pip install fonttools brotli
 *     node scripts/subset-fonts.mjs            # rewrites src/ui/shell/fonts/*.woff2
 *     node scripts/subset-fonts.mjs --metrics  # prints the record for fonts/metrics.ts
 *
 * The faces (docs/design/design-system.md §5): Inter 400 and 600 for the
 * interface, Inter Tight 600 for display numerals, JetBrains Mono 500 for
 * measured values; all OFL 1.1, taken from the Fontsource packages' Latin
 * subsets so the source is a pinned npm version rather than a CDN URL.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../src/ui/shell/fonts');

/**
 * Everything the interface can render, and nothing else.
 *
 * Deliberately explicit rather than "latin": the interface is ASCII plus a
 * handful of symbols and typographic punctuation, and the full Latin block is
 * several times the size for glyphs no screen shows. A label that needs a
 * character not here falls back to the system stack and looks wrong, loudly,
 * which is the failure we want: add it here and re-run.
 */
export const CHARSET =
  '0123456789' +
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '!"#$%&\'()*+,-./:;<=>?@[]\\^_`{|}~' +
  '°±×·•—–‹›→↑↓▲▼◐●○§' +
  '−…’“”';

/** Each output face: its Fontsource package and the Latin file inside it. */
export const SOURCES = [
  { file: 'Inter-Regular', pkg: '@fontsource/inter@5.3.0', path: 'files/inter-latin-400-normal.woff2' },
  { file: 'Inter-SemiBold', pkg: '@fontsource/inter@5.3.0', path: 'files/inter-latin-600-normal.woff2' },
  { file: 'InterTight-SemiBold', pkg: '@fontsource/inter-tight@5.3.0', path: 'files/inter-tight-latin-600-normal.woff2' },
  {
    file: 'JetBrainsMono-Medium',
    pkg: '@fontsource/jetbrains-mono@5.3.0',
    path: 'files/jetbrains-mono-latin-500-normal.woff2',
  },
];

/**
 * `tnum` is load-bearing and must survive subsetting.
 *
 * pyftsubset drops every OpenType feature it is not told to keep. Dropping
 * `tnum` would leave the CSS asking for tabular figures from a font that no
 * longer has them, and the digits would jitter, silently. `kern`, `liga`,
 * `calt` and `case` are kept because ordinary words and capitals look subtly
 * broken without them, for no saving worth having.
 */
const LAYOUT_FEATURES = 'tnum,kern,liga,calt,case';

/** Digit advances, default and after `tnum`, as fonts/metrics.ts records them. */
const METRICS_PY = `
import sys
from fontTools.ttLib import TTFont
for path in sys.argv[1:]:
    f = TTFont(path)
    cmap = f.getBestCmap(); hmtx = f['hmtx']
    names = [cmap[ord(str(d))] for d in range(10)]
    sub = {}
    if 'GSUB' in f:
        g = f['GSUB'].table
        for fr in g.FeatureList.FeatureRecord:
            if fr.FeatureTag == 'tnum':
                for li in fr.Feature.LookupListIndex:
                    for st in g.LookupList.Lookup[li].SubTable:
                        sub.update(getattr(st, 'mapping', None) or getattr(getattr(st, 'ExtSubTable', None), 'mapping', None) or {})
    print(path.split('/')[-1][:-6], f['head'].unitsPerEm, [hmtx[n][0] for n in names], [hmtx[sub.get(n, n)][0] for n in names])
`;

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

function subset(srcPath, name) {
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, `${name}.woff2`);
  execFileSync(
    'pyftsubset',
    [
      srcPath,
      `--text=${CHARSET}`,
      `--layout-features=${LAYOUT_FEATURES}`,
      '--flavor=woff2',
      `--output-file=${out}`,
      '--no-hinting',
      '--desubroutinize',
    ],
    { stdio: 'inherit' },
  );
  return statSync(out).size;
}

/** Unpack a pinned package into the scratch directory and return its root. */
function fetchPackage(pkg, into) {
  const tarball = execFileSync('npm', ['pack', pkg, '--silent', '--pack-destination', into], {
    encoding: 'utf8',
  }).trim();
  const dest = join(into, tarball.replace(/\.tgz$/, ''));
  mkdirSync(dest, { recursive: true });
  execFileSync('tar', ['-xzf', join(into, tarball), '-C', dest]);
  return join(dest, 'package');
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (invokedDirectly && process.argv.includes('--metrics')) {
  const files = SOURCES.map((s) => join(OUT, `${s.file}.woff2`));
  execFileSync('python3', ['-c', METRICS_PY, ...files], { stdio: 'inherit' });
} else if (invokedDirectly) {
  const tmp = resolve(HERE, '../.font-src');
  mkdirSync(tmp, { recursive: true });
  const roots = new Map();
  let total = 0;
  for (const source of SOURCES) {
    if (!roots.has(source.pkg)) roots.set(source.pkg, fetchPackage(source.pkg, tmp));
    const bytes = subset(join(roots.get(source.pkg), source.path), source.file);
    total += bytes;
    console.log(`  ${source.file.padEnd(24)} ${kb(bytes).padStart(9)}`);
  }
  console.log(`  ${'TOTAL'.padEnd(24)} ${kb(total).padStart(9)}`);
}
