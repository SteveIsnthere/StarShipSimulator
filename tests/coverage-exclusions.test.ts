import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error -- plain-JS gate helper, intentionally untyped
import { coverageExclusions, coverageSeal } from '../scripts/coverage-exclusions.mjs';

const roots: string[] = [];
const INPUTS = ['vitest.config.ts', 'tsconfig.json', 'tsconfig.kit.json', 'tests/setup-dom.ts',
  'tests/memory-storage.ts', 'package.json', 'package-lock.json', 'eslint.config.js', 'public/serviceworker.js', 'tests/budget.test.ts', 'tests/offline.test.ts', 'tests/offline-classic.test.ts'];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'coverage-kit-'));
  roots.push(root);
  const put = (file: string, content: string) => {
    const path = join(root, file);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
  };
  const files = ['src/ui/kit/Button.test.ts'];
  for (const file of [...INPUTS, ...files]) put(file, 'fixture');
  put('src/ui/kit/Button.ts', 'export const button = true;');
  for (const tree of ['src/ui/shell', 'src/view', 'src/app', 'scripts', 'tests/ui', 'tests/view', 'tests/proofs', 'tests/lint-walls']) mkdirSync(join(root, tree), { recursive: true });
  put('scripts/coverage-exclusions.mjs', 'fixture helper');
  put('tests/coverage-exclusions.json', JSON.stringify({ files, seal: coverageSeal(root, files) }));
  return { root, files, put };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('audited core-free coverage selection', () => {
  it('returns only the exact unchanged roster', () => {
    const { root, files } = fixture();
    expect(coverageExclusions(root)).toEqual(files);
  });
  it.each([...INPUTS, 'scripts/coverage-exclusions.mjs', 'src/app/offline.ts', 'src/view/helper.ts', 'src/ui/kit/Button.ts', 'src/ui/kit/Button.test.ts'])(
    'restores full coverage after %s changes', (file) => {
      const { root, put } = fixture();
      put(file, 'changed');
      expect(coverageExclusions(root)).toEqual([]);
    });
  it('restores full coverage when a new resolution target or test appears', () => {
    const { root, put } = fixture();
    put('src/ui/kit/new.test.ts', 'new root');
    expect(coverageExclusions(root)).toEqual([]);
  });
  it('restores full coverage when an input is missing', () => {
    const { root } = fixture();
    unlinkSync(join(root, 'tests/setup-dom.ts'));
    expect(coverageExclusions(root)).toEqual([]);
  });
  it('refuses symlinked inputs', () => {
    const { root } = fixture();
    const path = join(root, 'src/ui/kit/Button.ts');
    unlinkSync(path);
    symlinkSync(join(root, 'package.json'), path);
    expect(coverageExclusions(root)).toEqual([]);
  });
  it('never accepts a null manifest seal when inputs are missing', () => {
    const { root, files, put } = fixture();
    unlinkSync(join(root, 'tests/setup-dom.ts'));
    put('tests/coverage-exclusions.json', JSON.stringify({ files, seal: null }));
    expect(coverageExclusions(root)).toEqual([]);
  });
  it('expires an edited roster even when its file contents stay unchanged', () => {
    const { root, put } = fixture();
    const manifest = JSON.parse(readFileSync(join(root, 'tests/coverage-exclusions.json'), 'utf8'));
    put('tests/coverage-exclusions.json', JSON.stringify({ ...manifest, files: [] }));
    expect(coverageExclusions(root)).toEqual([]);
  });
});
