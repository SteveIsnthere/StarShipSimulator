/**
 * The vendored kit imports only its own packages.
 *
 * `src/ui/kit` is flight_sim's kit, copied byte for byte and never edited here
 * (`frontend-conventions`), so ESLint skips it. That leaves one thing a re-sync
 * could slip in unnoticed: a new dependency. This holds the kit to the set the
 * Phase 4 plan names; adding to it is a decision, made here in the same change
 * that adds the package.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const KIT = fileURLToPath(new URL('../../src/ui/kit/', import.meta.url));

/** Bare specifiers the kit may import, exactly or as a subpath (`gsap/DrawSVGPlugin`). */
const ALLOWED = ['react', 'react-dom', 'clsx', 'tailwind-merge', 'lucide-react', 'gsap', '@radix-ui/'];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, out);
    // The kit's own tests may use the test toolchain; shipped code may not.
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const specifiers = (code: string) =>
  [...code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);

const allowed = (spec: string) =>
  spec.startsWith('.') ||
  spec.startsWith('@ui/') ||
  ALLOWED.some((p) => (p.endsWith('/') ? spec.startsWith(p) : spec === p || spec.startsWith(`${p}/`)));

describe('the kit boundary', () => {
  const files = sources(KIT);

  it('finds the kit', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('imports nothing outside its own packages', () => {
    const offenders = files.flatMap((file) =>
      specifiers(readFileSync(file, 'utf8'))
        .filter((spec) => !allowed(spec))
        .map((spec) => `${relative(KIT, file)}: ${spec}`),
    );
    expect(offenders).toEqual([]);
  });

  it('would catch one', () => {
    // The positive control: a specifier outside the set is refused.
    expect(allowed('zustand')).toBe(false);
    expect(allowed('$app/loop')).toBe(false);
    expect(allowed('@radix-ui/react-dialog')).toBe(true);
    expect(allowed('gsap/DrawSVGPlugin')).toBe(true);
  });
});
