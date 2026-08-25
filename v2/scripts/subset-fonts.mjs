/**
 * The font pipeline, kept reproducible.
 *
 * This is NOT part of `npm run build`. The four woff2 files in
 * `src/ui/fonts/` are committed build outputs, because they change only when
 * the charset or the source release changes — perhaps once — and requiring
 * Python + fontTools on every CI runner to rebuild a byte-identical artefact
 * would be a fragile way to buy nothing. What this script buys is the ability
 * to *redo* it: the charset, the source URLs, and the subsetter flags are here
 * rather than in a shell history.
 *
 * Run it when the charset changes:
 *
 *     pip install fonttools brotli
 *     node scripts/subset-fonts.mjs            # rewrites src/ui/fonts/*.woff2
 *     node scripts/subset-fonts.mjs --metrics  # prints the record for fonts.ts
 *
 * WHY BARLOW AND NOT D-DIN. docs/BROADCAST-UI-PLAN.md nominated D-DIN — the
 * OFL member of the DIN family the SpaceX overlay uses — and made the
 * tabular-digits test the decider rather than taste. D-DIN failed it, and not
 * marginally: its ten digits have nine distinct advance widths (329..512 per
 * 1000 em; `1` is 36% narrower than `0`), and it ships no `tnum` feature to
 * switch to lining figures. A speed readout set in it would jitter horizontally
 * on every digit change, which for a telemetry overlay is disqualifying.
 *
 * Barlow is the plan's own named fallback: a DIN-grotesque under OFL 1.1, with
 * a real `tnum` feature whose figures are exactly uniform (see fonts.ts for the
 * measured numbers). Semi Condensed carries the UI; Condensed carries the dense
 * uppercase micro-labels.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../src/ui/fonts');

/**
 * Everything the UI can render, and nothing else.
 *
 * Deliberately explicit rather than "latin": the whole interface is ASCII plus
 * a handful of symbols, and the difference between this set and the full latin
 * block is roughly 4x the file size for glyphs no screen will ever show. If a
 * label needs a character that is not here, add it here and re-run — a missing
 * glyph falls back to the system stack and looks wrong, loudly, which is the
 * failure mode we want.
 */
export const CHARSET =
  '0123456789' +
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '!"#$%&\'()*+,-./:;<=>?@[]\\^_`{|}~' +
  '°±×·•—–‹›→↑↓▲▼◐●○§';

/**
 * The sources, as released by the Barlow project via Google Fonts.
 *
 * Static instances rather than the variable font: four fixed weights subset to
 * ~8 kB each beat one variable face at ~45 kB when only two weights are used,
 * and the variable axis buys nothing an overlay needs.
 */
export const SOURCES = [
  {
    file: 'BarlowSemiCondensed-Regular',
    url: 'https://fonts.gstatic.com/s/barlowsemicondensed/v16/wlpvgxjLBV1hqnzfr-F8sEYMB0Yybp0mudRXeIqv.ttf',
  },
  {
    file: 'BarlowSemiCondensed-Bold',
    url: 'https://fonts.gstatic.com/s/barlowsemicondensed/v16/wlpigxjLBV1hqnzfr-F8sEYMB0Yybp0mudRfw6-_B2sg.ttf',
  },
  {
    file: 'BarlowCondensed-Regular',
    url: 'https://fonts.gstatic.com/s/barlowcondensed/v13/HTx3L3I-JCGChYJ8VI-L6OO_au7B6xHT3w.ttf',
  },
  {
    file: 'BarlowCondensed-Bold',
    url: 'https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B46r2z3bWvA.ttf',
  },
];

/**
 * `tnum` is load-bearing and must survive subsetting.
 *
 * pyftsubset drops every OpenType feature it is not told to keep. Dropping
 * `tnum` here would leave the CSS asking for tabular figures from a font that
 * no longer has them, and the digits would go back to jittering — silently,
 * because the text would still render. `kern` and `liga` are kept because
 * removing them makes ordinary words look subtly broken for no saving worth
 * having.
 */
const LAYOUT_FEATURES = 'tnum,kern,liga';

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
  return { out, bytes: statSync(out).size };
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (invokedDirectly) {
  const tmp = resolve(HERE, '../.font-src');
  mkdirSync(tmp, { recursive: true });
  let total = 0;
  for (const source of SOURCES) {
    const ttf = join(tmp, `${source.file}.ttf`);
    await download(source.url, ttf);
    const { bytes } = subset(ttf, source.file);
    total += bytes;
    console.log(`  ${source.file.padEnd(32)} ${kb(bytes).padStart(9)}`);
  }
  console.log(`  ${'TOTAL'.padEnd(32)} ${kb(total).padStart(9)}`);
}
