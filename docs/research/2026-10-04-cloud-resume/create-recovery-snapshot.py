"""Preserve dirty implementation without touching the live index/worktree.

Create a complete replacement recovery patch against the original runtime base.
Verify its application once in a separate temporary Git index, not a checkout.
Do not apply this patch to the existing dirty implementation.
"""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import re
import tempfile

ROOT = Path('/workspace/StarShipSimulator')
BASE = '32e5bb386cadee9098d703c67ebdfc9444eb46a6'
DEST = ROOT / 'docs/research/2026-10-04-cloud-resume'
name = sys.argv[1] if len(sys.argv) == 2 else 'checkpoint-recovery'
if len(sys.argv) > 2 or not re.fullmatch(r'checkpoint-recovery(?:-[0-9]{2})?', name):
    raise SystemExit('Expected immutable checkpoint-recovery or numbered snapshot name')
PATCH = DEST / (name + '.patch')
MANIFEST = DEST / (name + '.json')


def git(*args, env=None):
    return subprocess.check_output(['git', *args], cwd=ROOT, env=env)


def sha(data):
    return hashlib.sha256(data).hexdigest()


if PATCH.exists() or MANIFEST.exists():
    raise SystemExit('Snapshot already exists; preserve it rather than overwrite')
untracked = git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
for path in filter(None, untracked):
    if path.startswith(('docs/', 'src/', 'tests/', 'scripts/', 'public/', '.github/', '.agents/')):
        continue
    if '/' not in path and ('config.' in path or path in {'.nvmrc', '.gitignore', 'package.json', 'package-lock.json'}):
        continue
    raise SystemExit(f'Unreviewed untracked path outside implementation scope: {path}')

with tempfile.TemporaryDirectory(prefix='starship-recovery-index-') as directory:
    first = dict(os.environ, GIT_INDEX_FILE=str(Path(directory) / 'snapshot.index'))
    git('read-tree', BASE, env=first)
    git('add', '-A', '--', '.', ':(exclude)docs', env=first)
    tree = git('write-tree', env=first).decode().strip()
    patch = git('diff', '--binary', '--full-index', '--no-renames', BASE, tree, '--', '.', ':(exclude)docs')
    names = git('diff', '--name-only', '-z', '--no-renames', BASE, tree).decode().split('\0')
    files = []
    for path in filter(None, names):
        if path.startswith('docs/'):
            raise SystemExit('Documentation leaked into runtime snapshot')
        disk = ROOT / path
        if disk.exists():
            blob = git('show', f'{tree}:{path}')
            if disk.read_bytes() != blob:
                raise SystemExit(f'Source changed while snapshotting: {path}')
            files.append({'path': path, 'sha256': sha(blob)})
        else:
            files.append({'path': path, 'sha256': None})
    PATCH.write_bytes(patch)
    second = dict(os.environ, GIT_INDEX_FILE=str(Path(directory) / 'verification.index'))
    git('read-tree', BASE, env=second)
    git('apply', '--cached', '--check', str(PATCH), env=second)
    git('apply', '--cached', str(PATCH), env=second)
    if git('write-tree', env=second).decode().strip() != tree:
        raise SystemExit('Applied virtual index differs from the captured tree')
    for entry in files:
        disk = ROOT / entry['path']
        actual = sha(disk.read_bytes()) if disk.exists() else None
        if actual != entry['sha256']:
            raise SystemExit(f'Source changed after verification: {entry["path"]}')
    MANIFEST.write_text(json.dumps({
        'base': BASE, 'branch': git('branch', '--show-current').decode().strip(),
        'documentationHead': git('rev-parse', 'HEAD').decode().strip(),
        'node': '22.23.3', 'patch': PATCH.name, 'patchSha256': sha(patch), 'bytes': len(patch),
        'scope': 'Complete dirty non-doc implementation; replacement snapshot, never an incremental patch',
        'verified': {'cleanBaseTemporaryIndex': True, 'forwardCheck': True,
                     'appliedOnceInTemporaryIndex': True, 'appliedTreeMatches': True,
                     'everyDiskPathHashMatches': True},
        'files': files,
    }, indent=2) + '\n')
    print(json.dumps({'paths': len(files), 'bytes': len(patch), 'sha256': sha(patch)}))
