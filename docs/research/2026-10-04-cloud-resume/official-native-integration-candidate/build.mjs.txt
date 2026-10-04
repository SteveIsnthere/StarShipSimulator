import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { admitComposite, strictFiles } from './admission.mjs';
import { digest, parse, utilities } from './integrity.mjs';
const [compositePath, compositeSha, directory] = process.argv.slice(2);
const q = await admitComposite(compositePath, compositeSha);
const u = await utilities(q.root, q.utilityDigest), before = u.sourceSnapshot(q.root);
let failure; const afterErrors = [];
try {
const { build, resolveConfig } = await import(pathToFileURL(resolve(q.root, 'node_modules/vite/dist/node/index.js')).href);
const configFile = resolve(q.root, 'vite.config.ts');
const config = await resolveConfig({ configFile }, 'build', 'production');
assert.deepEqual({ target: config.build.target, minify: config.build.minify,
  sourcemap: config.build.sourcemap, cssMinify: config.build.cssMinify,
  mode: config.mode, base: config.base, adaptation: q.options.adaptation }, q.options);
  await build({ configFile, build: { target: q.options.target, minify: q.options.minify,
    sourcemap: true, cssMinify: q.options.cssMinify, copyPublicDir: false,
    outDir: directory, emptyOutDir: true,
    lib: { entry: resolve(q.root, 'scripts/test/entry.ts'), formats: ['es'], fileName: () => 'entry.mjs' } } });
  const files = strictFiles(directory);
  assert.deepEqual(Object.keys(files).sort(), [...q.closure, q.mappedCode + '.map'].sort());
  for (const name of q.closure) assert.equal(files[name], q.retainedFiles[name], 'Executing bytes changed');
  const fresh = parse(resolve(directory, q.mappedCode + '.map'));
  const old = parse(q.baselineMapPath);
  // Only relative source routes may translate with the new private directory.
  function canonical(map, base, original = false) {
    assert.equal(map.sourceRoot ?? '', '');
    assert.equal(map.sources.length, 55); assert.equal(map.sourcesContent.length, 55);
    return { ...map, sources: map.sources.map((name, index) => {
      const file = original ? resolve(q.root, q.baselineMapSources[index]) : resolve(base, name);
      const relative = file.slice(q.root.length + 1);
      assert.equal(digest(file), q.graph[relative]);
      assert.equal(readFileSync(file, 'utf8'), map.sourcesContent[index]);
      return relative;
    }) };
  }
  assert.deepEqual(canonical(fresh, directory), canonical(old, q.root, true));
  const code = readFileSync(resolve(directory, q.mappedCode), 'utf8');
  const route = '//# sourceMappingURL=' + q.mappedCode + '.map';
  assert.equal(code.split(/\r?\n/).filter(line => line.includes('sourceMappingURL=')).length, 1);
  assert(code.replace(/\r?\n$/, '').endsWith(route));
  copyFileSync(resolve(q.root, 'scripts/test/constants.mjs'), resolve(directory, 'constants.mjs'));
  const m = { kind: 'official-native-flight-run-v1', root: q.root, directory,
    compositePath, compositeSha, files: strictFiles(directory), source: before,
    freshBuildCompleted: true, mapTranslation: 'relative-original-source-routes-only' };
  writeFileSync(directory + '.json', JSON.stringify(m) + '\n', { flag: 'wx' });
} catch (error) { failure = error; }
try { assert.deepEqual(u.sourceSnapshot(q.root), before); } catch (error) { afterErrors.push(String(error.stack ?? error)); }
try { await admitComposite(compositePath, compositeSha); } catch (error) { afterErrors.push(String(error.stack ?? error)); }
writeFileSync(directory + '.boundary.json', JSON.stringify({ completed: !failure && !afterErrors.length,
  error: failure ? String(failure.stack ?? failure) : null, afterErrors }) + '\n', { flag: 'wx' });
if (failure) throw failure;
assert.deepEqual(afterErrors, []);
