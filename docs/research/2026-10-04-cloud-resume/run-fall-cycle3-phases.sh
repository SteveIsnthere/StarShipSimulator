#!/usr/bin/env bash
set -euo pipefail
routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#routes[@]} == 1 && -f ${routes[0]} ]] || exit 69
source "${routes[0]}"
cd /workspace/StarShipSimulator
[[ $(node --version) == v22.23.3 ]] || exit 69
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == fall-cycle3-phases ]] || { echo 'Fresh review and parent exclusive CPU grant required' >&2; exit 69; }
research=docs/research/2026-10-04-cloud-resume
receipt="$research/fall-cycle3-phases-receipt"
mkdir "$receipt" # Preserve every failed launch; refuse an unchanged repetition.
driver=''
stage=receipt-created
finish() {
 task_status=$?
 trap - EXIT
 set +e
 if [[ -n $driver ]]; then
  rm -- "$driver"
  cleanup_status=$?
  if (( cleanup_status != 0 )); then
   printf '%s\n' 'Temporary driver cleanup failed' > "$receipt/cleanup-failure.txt"
   if (( task_status == 0 )); then task_status=70; fi
  fi
 fi
 printf '%s\n' "$task_status" > "$receipt/exit-code.txt"
 printf 'Final exit status: %s\nLast attempted stage: %s\n' "$task_status" "$stage" > "$receipt/launch-status.txt"
 if [[ ! -f $receipt/source-integrity.txt ]]; then
  echo 'Verification unavailable: complete before/after source manifests were not produced' > "$receipt/source-integrity.txt"
 fi
 exit "$task_status"
}
trap finish EXIT
exec 2> "$receipt/runner-stderr.txt"
stage=runtime-and-cgroup-preflight
node --version > "$receipt/node.txt"
node -p 'JSON.stringify({platform:process.platform,arch:process.arch,versions:process.versions})' > "$receipt/runtime.json"
node --v8-options > "$receipt/v8-options.txt"
getconf CLK_TCK > "$receipt/clock-ticks-per-second.txt"
cat /sys/fs/cgroup/cpu.max > "$receipt/cpu-max.txt"
cat /sys/fs/cgroup/cpu.stat > "$receipt/cpu-stat-preflight.txt"
cat /proc/self/cgroup > "$receipt/cgroup.txt"
git rev-parse HEAD > "$receipt/head.txt"
git status --short > "$receipt/status-before.txt"
stage=v8-flag-preflight
for flag in --print-opt-code --print-opt-code-filter; do
 if ! rg -q -- "^  $flag \\(" "$receipt/v8-options.txt"; then
  echo "Required generated-code option absent: $flag" > "$receipt/preflight.txt"
  exit 69
 fi
done
stage=cli-resolution
cli=$(node --input-type=module <<'JS'
import {readFileSync,statSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const packagePath=fileURLToPath(import.meta.resolve('vite-node/package.json'));
const metadata=JSON.parse(readFileSync(packagePath,'utf8'));
const bin=typeof metadata.bin==='string'?metadata.bin:metadata.bin['vite-node'];
if(typeof bin!=='string')throw new Error('No declared CLI bin');
const binPath=resolve(dirname(packagePath),bin),exportPath=fileURLToPath(import.meta.resolve('vite-node/cli'));
if(binPath!==exportPath||!statSync(binPath).isFile())throw new Error('CLI bin/export missing or inconsistent');
console.log(binPath);
JS
)
printf '%s\n' "$cli" > "$receipt/cli-path.txt"
flags=(--print-opt-code --print-opt-code-filter=fallAcceleration)
printf '%s\n' "${flags[@]}" > "$receipt/node-flags.txt"
snapshot() {
 python3 - "$1" <<'PY'
import pathlib,hashlib,json,sys
paths=[]
for root in ('src','tests','scripts'):
    paths.extend(p for p in pathlib.Path(root).rglob('*') if p.is_file())
for pattern in ('package*.json','*config.*','.nvmrc'):
    paths.extend(pathlib.Path('.').glob(pattern))
paths.extend(pathlib.Path('docs/research/2026-10-04-cloud-resume') / name for name in (
    'fall-cycle3-phases.ts.txt','fall-cycle3-phases-declaration.md','run-fall-cycle3-phases.sh',
    'fall-cloud-cycle3-independent-review.md','fall-cloud-cycle3-independent-review-sources.json'))
paths.extend((pathlib.Path('node_modules/vite-node/package.json'),pathlib.Path('node_modules/vite-node/dist/cli.mjs')))
out={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths))}
expected={'src/core/control/guidance-physics.ts':'5698a8f7ad0da8927613a8cdd6efc2cfde88efd79563cc9d8f7bfd5c28f7ab77',
    'tests/core/guidance-physics.timing.test.ts':'8bfddfb28e72aee994f6a7fe0d352b13df76a63706cc4c58bd211c26a4965358'}
for name,value in expected.items():
    if out[name]!=value:raise RuntimeError('Declared original kernel/workload pin changed: '+name)
pathlib.Path(sys.argv[1]).write_text(json.dumps(out,indent=2)+'\n')
PY
}
stage=source-snapshot-before
snapshot "$receipt/source-before.json"
echo 'Exact runtime options and declared CLI verified; original kernel/workload pins match; six original-count phases only' > "$receipt/preflight.txt"
stage=driver-materialization
driver=$(mktemp "$research/cycle3-phases-XXXXXX.ts")
cp "$research/fall-cycle3-phases.ts.txt" "$driver"
sha256sum "$driver" > "$receipt/materialized-driver-hash.txt"
set +e
stage=kernel-diagnostic
STARSHIP_PHASE_RECEIPT="$PWD/$receipt" timeout 30s python3 - "$cli" "$driver" "${flags[@]}" > "$receipt/output.txt" 2>&1 <<'PY'
import os,resource,shutil,sys
resource.setrlimit(resource.RLIMIT_FSIZE,(32*1024*1024,32*1024*1024))
node=shutil.which('node')
if not node:raise RuntimeError('Declared Node executable missing')
os.execv(node,[node,*sys.argv[3:],sys.argv[1],sys.argv[2]])
PY
result=$?
set -e
printf '%s\n' "$result" > "$receipt/workload-exit-code.txt"
stage=source-snapshot-after
snapshot "$receipt/source-after.json"
stage=source-integrity-check
if ! cmp -s "$receipt/source-before.json" "$receipt/source-after.json"; then
 echo 'Source changed during diagnostic; evidence invalidated' > "$receipt/source-integrity.txt"
 exit 70
fi
echo 'Exact before/after source hashes match' > "$receipt/source-integrity.txt"
stage=complete
exit "$result"
