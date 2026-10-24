import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { preinstalledChromium } from '../e2e/chromium';
let root: string | undefined;
afterEach(() => { vi.unstubAllEnvs(); if (root) rmSync(root, { recursive: true }); root = undefined; });
function cache() { root = mkdtempSync(join(tmpdir(), 'chromium-layout-')); vi.stubEnv('PLAYWRIGHT_BROWSERS_PATH', root); return root; }
function binary(root: string, ...parts: string[]) { const file = join(root, ...parts); mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, 'fixture only'); return file; }
describe('managed Chromium executable layouts', () => {
  it('selects the supported full Chrome Linux64 layout', () => { const r = cache(); const full = binary(r, 'chromium-1234', 'chrome-linux64', 'chrome'); expect(preinstalledChromium()).toBe(full); });
  it('preserves the older Linux full Chrome layout', () => { const r = cache(); const full = binary(r, 'chromium-1234', 'chrome-linux', 'chrome'); expect(preinstalledChromium()).toBe(full); });
  it('prefers Linux64 deterministically when both layouts exist', () => { const r = cache(); binary(r, 'chromium-1234', 'chrome-linux', 'chrome'); const full = binary(r, 'chromium-1234', 'chrome-linux64', 'chrome'); expect(preinstalledChromium()).toBe(full); });
  it('does not mislabel a headless-shell-only cache as full Chrome', () => { const r = cache(); binary(r, 'chromium_headless_shell-1234', 'chrome-headless-shell-linux64', 'chrome-headless-shell'); expect(preinstalledChromium()).toBeUndefined(); });
});
