/** Audited kit-only duplicate work; any changed input restores complete coverage. */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INPUTS = [
  'vitest.config.ts', 'tsconfig.json', 'tsconfig.kit.json',
  'tests/setup-dom.ts', 'tests/memory-storage.ts',
  'package.json', 'package-lock.json', 'scripts/coverage-kit-exclusions.mjs',
];

export function kitCoverageSeal(root, files) {
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
    visit(resolve(root, 'src/ui/kit'));
    for (const name of INPUTS) visit(resolve(root, name));
    return createHash('sha256').update(JSON.stringify({ files, entries })).digest('hex');
  } catch { return null; }
}

export function kitCoverageExclusions(root = ROOT) {
  try {
    const { files, seal } = JSON.parse(readFileSync(resolve(root, 'tests/coverage-kit.json'), 'utf8'));
    if (!Array.isArray(files) || !files.every(file =>
      typeof file === 'string' && /^src\/ui\/kit\/[^\0]*\.test\.tsx?$/.test(file) &&
      !file.split('/').includes('..') && lstatSync(resolve(root, file)).isFile())) return [];
    return kitCoverageSeal(root, files) === seal ? files : [];
  } catch { return []; }
}
