/**
 * The design contract (docs/design/design-system.md §2), as rules a script can
 * check: monochrome, square, flat chrome with one focus owner. Adapted from
 * flight_sim's web/scripts/lib/designContract/rules.mjs without its migration
 * ledger: this shell starts clean, so every issue is a failure.
 */
export const DESIGN_RULES = [
  {
    id: 'concrete-grey',
    pattern: /\b(?:text|bg|border|ring|from|to|via)-(?:zinc|stone|slate|gray|neutral)-[^\s'"`]*/g,
    message: 'use a ui-* or flight-* token, not a concrete grey utility',
  },
  {
    id: 'radius',
    pattern: /\brounded-(?!ui-(?:control|panel|tile|sheet)\b|none\b)[^\s'"`]*/g,
    message: 'chrome is square: rounded-ui-* (zero) or nothing',
  },
  {
    id: 'shadow',
    pattern: /\bshadow-(?!none\b)[^\s'"`]*/g,
    message: 'chrome is flat and shadowless',
  },
  {
    id: 'blur',
    pattern: /\b(?:backdrop-blur|blur)-[^\s'"`]*/g,
    message: 'no glass or blur material',
  },
  {
    id: 'local-focus',
    pattern: /\b(?:focus|focus-visible):(?:ring|outline|shadow|border|bg|text)-?[^\s'"`]*/g,
    message: 'focus styling belongs to the kit\'s styles/focus.css',
  },
  {
    id: 'opacity-grade',
    pattern: /\btext-[^\s'"`/]+\/(?:\d+|\[[^\]]+\])|\b(?:disabled:)?opacity-[^\s'"`]*/g,
    message: 'use an opaque text grade (ui-muted, ui-dim), not opacity',
  },
  {
    id: 'raw-colour',
    pattern: /#[0-9a-f]{3,8}\b|\b(?:oklch|rgba?|hsla?)\(/gi,
    message: 'chrome colours come from tokens; raw colours belong in index.css @theme',
  },
  {
    id: 'gradient',
    pattern: /\b(?:linear|radial)-gradient\(|\bbg-gradient-[^\s'"`]*/g,
    message: 'no decorative gradients',
  },
  {
    id: 'css-shadow',
    pattern: /\bbox-shadow\s*:\s*([^;]+);|\bboxShadow\s*:\s*([^,}\n]+)/g,
    message: 'chrome draws no shadow',
  },
  {
    id: 'css-blur',
    pattern: /\b(?:-webkit-)?backdrop-filter\s*:\s*([^;]+);|\bbackdropFilter\s*:\s*([^,}\n]+)/g,
    message: 'no backdrop filters',
  },
  {
    id: 'css-radius',
    pattern: /\bborder-radius\s*:\s*([^;]+);|\bborderRadius\s*:\s*([^,}\n]+)/g,
    message: 'no nonzero radii',
  },
];

/**
 * Exact allowances, keyed `file:rule` -> the matched text. Only the central
 * token stylesheet may hold raw colours: it is where they are named.
 */
export const ALLOWANCES = new Map([
  ['src/ui/shell/index.css:raw-colour', new Set(['rgb(', '#000', '#ffb15a'])],
  // A slider's fill encodes its measured value: the one functional gradient,
  // as the kit's own SliderRow (design-system.md §10).
  ['src/ui/shell/Controls/CommandSlider.tsx:gradient', new Set(['linear-gradient('])],
]);

function lineFor(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

/** A match inside a // or block comment line is documentation, not chrome. */
function inComment(source, index) {
  const start = source.lastIndexOf('\n', index - 1) + 1;
  const prefix = source.slice(start, index).trimStart();
  return prefix.startsWith('//') || prefix.startsWith('*') || prefix.startsWith('/*');
}

function zeroOrNone(match) {
  const value = match
    .slice(1)
    .find((part) => part !== undefined)
    ?.trim()
    .replace(/^['"]|['"]$/g, '');
  return value === '0' || value === '0px' || value === 'none';
}

export function inspectDesignSource(file, source) {
  const issues = [];
  for (const rule of DESIGN_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      if (inComment(source, match.index)) continue;
      if (rule.id.startsWith('css-') && zeroOrNone(match)) continue;
      if (ALLOWANCES.get(`${file}:${rule.id}`)?.has(match[0].trim())) continue;
      issues.push({ file, line: lineFor(source, match.index), rule: rule.id, match: match[0], message: rule.message });
    }
  }
  return issues;
}
