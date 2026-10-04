#!/usr/bin/env bash
# PREPARATION ONLY — startup file-open diagnosis: does not launch browsers or alter checkout/global driver config.
set -euo pipefail
repo=/workspace/StarShipSimulator
browser=/workspace/cloud-bootstrap/starship-v1/browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
[[ -d "$repo/.git" || -f "$repo/.git" ]] || { echo 'Missing expected checkout' >&2; exit 69; }
[[ -x /usr/bin/strace ]] || { echo 'Required installed strace unavailable' >&2; exit 69; }
[[ -x "$browser" ]] || { echo 'Exact original managed headless-shell unavailable' >&2; exit 69; }
[[ $(cat /sys/fs/cgroup/cpu.max) == '400000 100000' ]] || { echo 'Quota changed; declaration must be reviewed again' >&2; exit 69; }
[[ $(cat /sys/fs/cgroup/cpuset.cpus.effective) == '0-4' ]] || { echo 'Cpuset changed; declaration must be reviewed again' >&2; exit 69; }
setup=$(mktemp -d /tmp/starship-open-diagnostic.XXXXXXXX)
chmod 700 "$setup"
# noclobber protects every created file; never overwrites existing user work.
set -o noclobber
printf '[Processor]\nThreadCount=3\n' > "$setup/SwiftShader.ini"
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
  printf 'exec /usr/bin/strace -f -ttt -s 256 -o %q -e trace=openat,openat2,chdir,fchdir %q "$@"\n' "$setup/startup-open.log" "$browser"
} > "$setup/browser-wrapper.sh"
chmod 700 "$setup/browser-wrapper.sh"
python3 - "$repo" "$browser" "$setup" <<'PYRECEIPT'
import sys,pathlib,hashlib,json,subprocess,os,re
repo,browser,setup=map(pathlib.Path,sys.argv[1:])
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
receipt={'purpose':'preparation only; separately reviewed startup file-open diagnosis, never performance acceptance','threadCount':3,'ownerExecutable':'/usr/bin/strace','ownerExecutableSha256':digest(pathlib.Path('/usr/bin/strace')),'traceSyscalls':['openat','openat2','chdir','fchdir'],'traceExportByteCap':1048576,'traceFilterByteCap':65536,'affinitySetting':None,'originalBrowser':str(browser),'originalBrowserSha256':digest(browser),'swiftshaderLibrarySha256':digest(browser.parent/'libvk_swiftshader.so'),'wrapper':str(setup/'browser-wrapper.sh'),'wrapperSha256':digest(setup/'browser-wrapper.sh'),'config':str(setup/'SwiftShader.ini'),'configSha256':digest(setup/'SwiftShader.ini'),'browserOnlyCwd':str(setup),'gitHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'sourceManifestSha256':hashlib.sha256(manifest).hexdigest(),'sourceManifest':source,'buildFiles':[[str(p.relative_to(repo/'dist')),digest(p)] for p in sorted((repo/'dist').rglob('*')) if p.is_file() and p.suffix!='.map'],'cpuMax':pathlib.Path('/sys/fs/cgroup/cpu.max').read_text().strip(),'cpuset':pathlib.Path('/sys/fs/cgroup/cpuset.cpus.effective').read_text().strip()}
with (setup/'setup-receipt.json').open('x') as f:json.dump(receipt,f,indent=2);f.write('\n')
PYRECEIPT
printf 'Prepared only: %s\nReview declaration and receipt before a separately authorized launch.\n' "$setup"
# No persistent/global changes require restoration. Keep this private directory
# as evidence; remove only this exact directory after its receipt is archived.
