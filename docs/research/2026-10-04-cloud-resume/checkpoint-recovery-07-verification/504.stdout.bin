import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
export const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
export const parse = file => JSON.parse(readFileSync(file, 'utf8'));
export async function utilities(root, utilityDigest) {
  const file = resolve(root, 'scripts/bench/native-loader.mjs');
  assert.equal(digest(file), utilityDigest);
  return import(pathToFileURL(file).href);
}
export function inputsEqual(inputs) {
  for (const [file, sha] of Object.entries(inputs)) {
    assert(isAbsolute(file)); assert.match(sha, /^[a-f0-9]{64}$/);
    assert.equal(digest(file), sha, file);
  }
}
export function mapsMatch(root, directory, files, filesUnder) {
  const graph = {};
  const maps = filesUnder(directory).filter(file => file.endsWith('.map'));
  assert(maps.length > 0);
  for (const file of maps) {
    const map = parse(file);
    assert.equal(map.version, 3); assert(Array.isArray(map.sources));
    assert(Array.isArray(map.sourcesContent)); assert.equal(map.sources.length, map.sourcesContent.length);
    assert.equal(typeof map.file, 'string');
    const code = resolve(dirname(file), map.file);
    assert(Object.hasOwn(files, relative(directory, code)));
    assert.equal(digest(code), files[relative(directory, code)]);
    const route = readFileSync(code, 'utf8').split(/\r?\n/).filter(line => line.includes('sourceMappingURL='));
    assert.equal(route.length, 1); assert.equal(route[0], '//# sourceMappingURL=' + relative(dirname(code), file));
    assert(readFileSync(code, 'utf8').replace(/\r?\n$/, '').endsWith(route[0]));
    for (let i = 0; i < map.sources.length; i++) {
      assert.equal(typeof map.sources[i], 'string'); assert(!map.sources[i].includes('://'));
      assert.equal(typeof map.sourcesContent[i], 'string');
      const original = realpathSync(resolve(dirname(file), map.sourceRoot ?? '', map.sources[i]));
      assert.equal(map.sourcesContent[i], readFileSync(original, 'utf8'));
      const name = relative(root, original);
      if (name.startsWith('src/')) {
        const sha = digest(original);
        if (Object.hasOwn(graph, name)) assert.equal(graph[name], sha);
        graph[name] = sha;
      }
    }
  }
  for (const file of filesUnder(directory).filter(file => /\.(?:mjs|js)$/.test(file))) {
    assert(maps.some(map => resolve(dirname(map), parse(map).file) === file), 'Executing code lacks external map');
  }
  assert(Object.hasOwn(graph, 'src/app/loop.ts'));
  assert(Object.hasOwn(graph, 'src/core/autopilot/booster.ts'));
  assert(Object.hasOwn(graph, 'src/core/constants.ts'));
  return graph;
}
