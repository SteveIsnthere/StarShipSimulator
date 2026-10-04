#!/usr/bin/env bash
# PREPARATION ONLY — exact isolated bundle copy: does not launch browsers or alter checkout/global driver config.
set -euo pipefail
repo=/workspace/StarShipSimulator
original_browser=/workspace/cloud-bootstrap/starship-v1/browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
[[ -d "$repo/.git" || -f "$repo/.git" ]] || { echo 'Missing expected checkout' >&2; exit 69; }
[[ -x "$original_browser" ]] || { echo 'Exact original managed headless-shell unavailable' >&2; exit 69; }
[[ $(cat /sys/fs/cgroup/cpu.max) == '400000 100000' ]] || { echo 'Quota changed; declaration must be reviewed again' >&2; exit 69; }
[[ $(cat /sys/fs/cgroup/cpuset.cpus.effective) == '0-4' ]] || { echo 'Cpuset changed; declaration must be reviewed again' >&2; exit 69; }
setup=$(mktemp -d /tmp/starship-isolated-worker.XXXXXXXX)
chmod 700 "$setup"
browser="$setup/browser/chrome-headless-shell"
python3 - "$original_browser" "$setup" <<'PYCOPY'
import pathlib,sys,hashlib,shutil,json,os,stat
original,setup=map(pathlib.Path,sys.argv[1:]);source=original.parent;target=setup/'browser'
if (source/'SwiftShader.ini').exists():raise SystemExit('Managed source has an unexpected INI; fail closed')
paths=sorted(source.rglob('*'))
if any(p.is_symlink() for p in paths):raise SystemExit('Unsupported bundle symlink; no aliasing permitted')
files=[p for p in paths if p.is_file()];size=sum(p.stat().st_size for p in files)
if shutil.disk_usage(setup).free<size+100*1024*1024:raise SystemExit('Insufficient space for isolated copy')
if target.exists():raise SystemExit('Copy target already exists')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
pinned_browser='e11fc9ce65c96313476f7ee9844b6fb6a9220fb048693cfe9eee00acf4170a9f'
if sha(original)!=pinned_browser:raise SystemExit('Original browser differs from preserved pinned binary')
manifest=[{'path':str(p.relative_to(source)),'sha256':sha(p),'bytes':p.stat().st_size,'mode':stat.S_IMODE(p.stat().st_mode)} for p in files]
directories=[{'path':'.','mode':stat.S_IMODE(source.stat().st_mode)}]+[{'path':str(p.relative_to(source)),'mode':stat.S_IMODE(p.stat().st_mode)} for p in paths if p.is_dir()]
shutil.copytree(source,target,copy_function=shutil.copy2,symlinks=False)
for record in manifest:
 a=source/record['path'];b=target/record['path']
 if stat.S_IMODE(a.stat().st_mode)!=record['mode'] or stat.S_IMODE(b.stat().st_mode)!=record['mode'] or sha(a)!=record['sha256'] or sha(b)!=record['sha256'] or (a.stat().st_dev,a.stat().st_ino)==(b.stat().st_dev,b.stat().st_ino):raise SystemExit('Original/copy digest or inode isolation mismatch')
if sha(target/original.name)!=pinned_browser:raise SystemExit('Copied browser differs from preserved pinned binary')
declared_dirs=sorted(r['path'] for r in directories if r['path']!='.');declared_files=sorted(r['path'] for r in manifest)
for current in [source,target]:
 if sorted(str(p.relative_to(current)) for p in current.rglob('*') if p.is_dir())!=declared_dirs or sorted(str(p.relative_to(current)) for p in current.rglob('*') if p.is_file())!=declared_files:raise SystemExit('Bundle file/directory sets differ from initial manifest')
for record in directories:
 if stat.S_IMODE((source/record['path']).stat().st_mode)!=record['mode'] or stat.S_IMODE((target/record['path']).stat().st_mode)!=record['mode']:raise SystemExit('Original/copied directory mode mismatch')
with (setup/'bundle-copy-manifest.json').open('x') as f:json.dump({'originalRoot':str(source),'copiedRoot':str(target),'files':manifest,'directories':directories,'pinnedBrowserSha256':pinned_browser,'bytes':size,'allDigestsEqual':True,'hardlinkAliases':False},f,indent=2);f.write('\n')
PYCOPY
# noclobber protects every created file; never overwrites existing user work.
set -o noclobber
printf '[Processor]\nThreadCount=3\n' > "$setup/browser/SwiftShader.ini"
{
  printf '#!/usr/bin/env bash\nset -euo pipefail\n'
  printf 'cd -- %q\n' "$setup"
  cat <<'WRAPPERSTART'
python3 - "$$" <<'PYOWNER'
WRAPPERSTART
  cat <<'WRAPPERPY'
import pathlib,sys,json,os
pid=int(sys.argv[1]);stat=pathlib.Path(f'/proc/{pid}/stat').read_text();fields=stat[stat.rfind(')')+2:].split()
with pathlib.Path('wrapper-owner.pending.json').open('x') as f:json.dump({'pid':pid,'starttime':fields[19],'ppid':int(fields[1]),'pgrp':int(fields[2])},f)
os.link('wrapper-owner.pending.json','wrapper-owner.json');os.unlink('wrapper-owner.pending.json')
WRAPPERPY
  printf 'PYOWNER\n'
  printf 'for ((i=0;i<600;i++)); do\n [[ ! -e STOP ]] || exit 70\n if [[ -e GO ]]; then break; fi\n sleep 0.05\ndone\n[[ -e GO && ! -e STOP ]] || exit 70\n'
  printf 'cd -- %q\n' "$setup/browser"
  printf 'exec %q "$@"\n' "$browser"
} > "$setup/browser-wrapper.sh"
chmod 700 "$setup/browser-wrapper.sh"
python3 - "$repo" "$browser" "$setup" "$original_browser" "$(node -p process.execPath)" "$(node -p process.version)" <<'PYRECEIPT'
import sys,pathlib,hashlib,json,subprocess,os,re
repo,browser,setup,original,node=map(pathlib.Path,sys.argv[1:6]);node_version=sys.argv[6]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
tracked=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=repo).split(b'\0')
source=[]
for raw in tracked:
 if not raw:continue
 if not re.match(r'^(src/|tests/|scripts/|public/|\.agents/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)',os.fsdecode(raw)):continue
 p=repo/os.fsdecode(raw)
 source.append([os.fsdecode(raw),digest(p) if p.is_file() else None])
source.sort()
manifest=json.dumps(source,separators=(',',':')).encode()
receipt={'purpose':'preparation only; exact isolated original bundle with DIR_EXE INI3, functional topology only','threadCount':3,'affinitySetting':None,'originalBrowser':str(original),'actualBrowser':str(browser),'actualBrowserSha256':digest(browser),'bundleManifestSha256':digest(setup/'bundle-copy-manifest.json'),'nodeExecutable':str(node),'nodeExecutableSha256':digest(node),'nodeVersion':node_version,'originalBrowserSha256':digest(original),'swiftshaderLibrarySha256':digest(browser.parent/'libvk_swiftshader.so'),'wrapper':str(setup/'browser-wrapper.sh'),'wrapperSha256':digest(setup/'browser-wrapper.sh'),'config':str(setup/'browser'/'SwiftShader.ini'),'configSha256':digest(setup/'browser'/'SwiftShader.ini'),'browserOnlyCwd':str(setup/'browser'),'gitHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'sourceManifestSha256':hashlib.sha256(manifest).hexdigest(),'sourceManifest':source,'buildFiles':[[str(p.relative_to(repo/'dist')),digest(p)] for p in sorted((repo/'dist').rglob('*')) if p.is_file() and p.suffix!='.map'],'cpuMax':pathlib.Path('/sys/fs/cgroup/cpu.max').read_text().strip(),'cpuset':pathlib.Path('/sys/fs/cgroup/cpuset.cpus.effective').read_text().strip()}
with (setup/'setup-receipt.json').open('x') as f:json.dump(receipt,f,indent=2);f.write('\n')
PYRECEIPT
printf 'Prepared only: %s\nReview declaration and receipt before a separately authorized launch.\n' "$setup"
# No persistent/global changes require restoration. Keep this private directory
# as evidence; remove only this exact directory after its receipt is archived.
