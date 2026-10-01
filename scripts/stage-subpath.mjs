/**
 * Stage dist/ under a subdirectory, the way GitHub Pages serves a project site.
 *
 * The deploy target is a path like `/StarShipSimulator/`, not a domain root.
 * Everything about the build is meant to survive that — vite's `base: './'`,
 * the service worker's scope-relative precache list — but "meant to" is not
 * evidence, and the failure mode is a site that works perfectly on localhost
 * and 404s everywhere in production.
 *
 * So: copy the build into a subdirectory, serve it from there, and let the e2e
 * prove it.
 *
 * Usage: node scripts/stage-subpath.mjs <distDir> <stageDir> <subpath>
 */
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export async function stageSubpath(distDir, stageDir, subpath) {
  const stage = resolve(stageDir);
  const target = join(stage, subpath);

  await rm(stage, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(resolve(distDir), target, { recursive: true });

  return target;
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const [dist = 'dist', stage = '.subpath', subpath = 'StarShipSimulator'] = process.argv.slice(2);
  const target = await stageSubpath(dist, stage, subpath);
  console.log(`staged at ${target}`);
}
