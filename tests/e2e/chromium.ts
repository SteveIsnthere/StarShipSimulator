/**
 * A Chromium already on disk, for environments that ship one and forbid
 * downloading (PLAYWRIGHT_BROWSERS_PATH points at it). Shared by both
 * Playwright configs. Returns undefined when there is none, so Playwright uses
 * its own install (`npx playwright install chromium`).
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUTS = [
  ['chrome-linux', 'chrome'],
  [
    'chrome-mac-arm64',
    'Google Chrome for Testing.app',
    'Contents',
    'MacOS',
    'Google Chrome for Testing',
  ],
  ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
];

export function preinstalledChromium(): string | undefined {
  const root = process.env['PLAYWRIGHT_BROWSERS_PATH'];
  if (!root || !existsSync(root)) return undefined;
  const revisions = readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
  const newest = revisions.pop();
  if (!newest) return undefined;
  for (const parts of LAYOUTS) {
    const bin = join(root, newest, ...parts);
    if (existsSync(bin)) return bin;
  }
  return undefined;
}
