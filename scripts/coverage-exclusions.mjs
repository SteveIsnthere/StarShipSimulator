/** Audited core-free duplicate work; any changed input restores complete coverage. */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INPUTS = [
  'vitest.config.ts', 'tsconfig.json', 'tsconfig.kit.json',
  'tests/setup-dom.ts', 'tests/memory-storage.ts',
  'package.json', 'package-lock.json', 'eslint.config.js', 'public/serviceworker.js',
  'tests/budget.test.ts', 'tests/offline.test.ts', 'tests/offline-classic.test.ts',
];
const TREES = [
  'src/ui/kit', 'src/ui/shell', 'src/view', 'src/app', 'scripts',
  'tests/ui', 'tests/view', 'tests/proofs', 'tests/lint-walls',
];

export function coverageSeal(root, files) {
  const entries = [];
  const visit = (path) => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Unsealed symlink');
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(resolve(path, name));
    } else if (stat.isFile()) {
      entries.push([relative(root, path).replaceAll('\\', '/'),
        createHash('sha256').update(readFileSync(path)).digest('hex')]);
    } else throw new Error('Unsealed file type');
  };
  try {
    for (const name of TREES) visit(resolve(root, name));
    for (const name of INPUTS) visit(resolve(root, name));
    return createHash('sha256').update(JSON.stringify({ files, entries })).digest('hex');
  } catch { return null; }
}

export function coverageExclusions(root = ROOT) {
  try {
    const { files, seal } = JSON.parse(readFileSync(resolve(root, 'tests/coverage-exclusions.json'), 'utf8'));
    if (typeof seal !== 'string' || !Array.isArray(files) || !files.every(file =>
      typeof file === 'string' && /^(?:src\/ui\/kit|tests)\/[^\0]*\.test\.tsx?$/.test(file) &&
      !file.split('/').includes('..') && lstatSync(resolve(root, file)).isFile())) return [];
    const current = coverageSeal(root, files);
    return current !== null && current === seal ? files : [];
  } catch { return []; }
}
