import { lstatSync, readFileSync, readlinkSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, isAbsolute, sep } from 'node:path';

const byteCompare = (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right));

function typeOf(stat) {
  if (stat.isDirectory()) return 'directory';
  if (stat.isFile()) return 'file';
  if (stat.isSymbolicLink()) return 'symlink';
  return 'other';
}

export function buildRuntimeTreeManifest(roots, { excludeCacheDirs = [] } = {}) {
  const normalizedRoots = roots.map((root) => resolve(root));
  const cacheRoot = normalizedRoots.find((root) => root.endsWith('/node_modules'));
  const excluded = new Set(excludeCacheDirs.map((name) => resolve(cacheRoot, name)));
  const entries = [];

  function walk(absolutePath) {
    if (excluded.has(absolutePath)) return;
    const stat = lstatSync(absolutePath, { bigint: true });
    const kind = typeOf(stat);
    if (kind === 'other') throw new Error(`Unsupported runtime filesystem entry: ${absolutePath}`);
    const row = {
      path: absolutePath,
      type: kind,
      mode: Number(stat.mode & 0o7777n),
      uid: Number(stat.uid),
      gid: Number(stat.gid),
      links: Number(stat.nlink),
      size: Number(stat.size),
    };
    if (kind === 'symlink') row.target = readlinkSync(absolutePath);
    entries.push(row);

    if (kind === 'directory') {
      const names = readdirSync(absolutePath).sort(byteCompare);
      for (const name of names) {
        if (name === '.' || name === '..' || isAbsolute(name) || name.includes(sep)) {
          throw new Error(`Unexpected runtime directory entry name: ${JSON.stringify(name)}`);
        }
        walk(resolve(absolutePath, name));
      }
    }
  }

  for (const root of normalizedRoots) walk(root);
  entries.sort((left, right) => byteCompare(left.path, right.path));
  return `${entries.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

export function runtimeRoots({ nodeModules, npmRoot, nodeLauncher, nodeBinary, cpBinary }) {
  const roots = [nodeModules, npmRoot, nodeLauncher, nodeBinary, cpBinary]
    .filter(Boolean)
    .map((path) => resolve(path));
  return [...new Set(roots)];
}

export function buildCacheTreeManifest(rootPath) {
  const root = resolve(rootPath);
  const entries = [];
  function walk(absolutePath, relativePath) {
    const stat = lstatSync(absolutePath, { bigint: true });
    const type = typeOf(stat);
    if (type === 'other') throw new Error(`Unsupported cache filesystem entry: ${absolutePath}`);
    const row = {
      path: relativePath || '.',
      type,
      mode: Number(stat.mode & 0o7777n),
      uid: Number(stat.uid),
      gid: Number(stat.gid),
      links: Number(stat.nlink),
      size: Number(stat.size),
      mtimeNs: stat.mtimeNs.toString(),
    };
    if (type === 'symlink') row.target = readlinkSync(absolutePath);
    if (type === 'file') row.sha256 = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
    entries.push(row);
    if (type === 'directory') {
      for (const name of readdirSync(absolutePath).sort(byteCompare)) {
        walk(resolve(absolutePath, name), relativePath ? `${relativePath}/${name}` : name);
      }
    }
  }
  walk(root, '');
  entries.sort((left, right) => byteCompare(left.path, right.path));
  return `${entries.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

export function assertRuntimeLinksStayPinned(manifestText, roots) {
  const normalizedRoots = roots.map((root) => resolve(root));
  const rootPaths = normalizedRoots.map((root) => `${root}${sep}`);
  const rows = manifestText.trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  for (const row of rows) {
    if (row.type !== 'symlink') continue;
    const realPath = realpathSync(row.path);
    const isPinned = rootPaths.some((root) => realPath.startsWith(root)) || normalizedRoots.includes(realPath);
    const nodeModules = normalizedRoots.find((root) => root.endsWith('/node_modules'));
    const isGeneratedCache = Boolean(nodeModules)
      && ['.vite', '.vite-temp'].some((name) => {
        const cachePath = resolve(nodeModules, name);
        return realPath === cachePath || realPath.startsWith(`${cachePath}${sep}`);
      });
    if (!isPinned || isGeneratedCache) {
      throw new Error(`Runtime symlink resolves outside pinned roots: ${row.path} -> ${row.target}`);
    }
  }
}
