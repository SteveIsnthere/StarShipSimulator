#!/usr/bin/env bash
set -euo pipefail
routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#routes[@]} == 1 && -f ${routes[0]} ]] || exit 69
source "${routes[0]}"
cd /workspace/StarShipSimulator
[[ $(node --version) == v22.23.3 ]] || { echo 'Exact Node 22.23.3 required' >&2; exit 69; }
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == fall-diagnostic ]] || { echo 'Lead must grant exclusive idle CPU slot' >&2; exit 69; }
mode=${1:-}
[[ $mode == baseline || $mode == profile || $mode == profile-cli-fix1 || $mode == compiler ]] || { echo 'Expected baseline, profile, profile-cli-fix1 or compiler' >&2; exit 64; }
research=docs/research/2026-10-04-cloud-resume
cli=''
if [[ $mode != baseline ]]; then
  cli=$(node --input-type=module <<'JS'
import {readFileSync, statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const packagePath=fileURLToPath(import.meta.resolve('vite-node/package.json'));
const metadata=JSON.parse(readFileSync(packagePath,'utf8'));
const declaredBin=typeof metadata.bin==='string'?metadata.bin:metadata.bin['vite-node'];
if(typeof declaredBin!=='string')throw new Error('vite-node has no declared CLI bin');
const binPath=resolve(dirname(packagePath),declaredBin);
const exportPath=fileURLToPath(import.meta.resolve('vite-node/cli'));
if(binPath!==exportPath||!statSync(binPath).isFile())throw new Error('vite-node CLI bin/export mismatch or missing file');
console.log(binPath);
JS
  )
fi
receipt="$research/fall-cloud-$mode-receipt"
mkdir "$receipt" # Atomic refusal if any earlier receipt exists; never rerun for luck.
driver=''
trap 'if [[ -n $driver ]]; then rm -- "$driver"; fi' EXIT
node --version > "$receipt/node.txt"
node -p 'JSON.stringify({platform:process.platform,arch:process.arch,versions:process.versions})' > "$receipt/runtime.json"
git rev-parse HEAD > "$receipt/head.txt"
git status --short > "$receipt/status-before.txt"
if [[ -n $cli ]]; then printf '%s\n' "$cli" > "$receipt/cli-path.txt"; fi
compiler_flags=(--trace-opt --trace-deopt --trace-turbo-inlining --trace-file-names)
if [[ $mode == compiler ]]; then
  node --v8-options > "$receipt/v8-options.txt"
  for flag in "${compiler_flags[@]}"; do
    if ! rg -q -- "^  $flag \\(" "$receipt/v8-options.txt"; then
      printf 'Missing required V8 flag: %s\n' "$flag" > "$receipt/preflight.txt"
      exit 69
    fi
  done
  printf '%s\n' "${compiler_flags[@]}" > "$receipt/compiler-flags.txt"
  echo 'All four declared flags present in exact Node V8 inventory; no kernel workload executed by preflight' > "$receipt/preflight.txt"
fi
snapshot() {
  python3 - "$1" <<'PY'
import hashlib,json,pathlib,sys
paths=[]
for root in ('src','tests','scripts'):
    paths.extend(p for p in pathlib.Path(root).rglob('*') if p.is_file())
for pattern in ('package*.json','*config.*','.nvmrc'):
    paths.extend(pathlib.Path('.').glob(pattern))
paths.extend(pathlib.Path('docs/research/2026-10-04-cloud-resume') / name for name in (
    'run-fall-cloud-diagnostic.sh','fall-cloud-profile.ts.txt','fall-cloud-diagnostic-declaration.md',
    'fall-cloud-compiler-declaration.md'))
paths.extend((pathlib.Path('node_modules/vite-node/package.json'),pathlib.Path('node_modules/vite-node/dist/cli.mjs')))
out={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths))}
pathlib.Path(sys.argv[1]).write_text(json.dumps(out,indent=2)+'\n')
PY
}
snapshot "$receipt/source-before.json"
if [[ $mode == baseline ]]; then
  set +e
  npm run bench > "$receipt/output.txt" 2>&1
  result=$?
  set -e
else
  driver=$(mktemp "$research/fall-cloud-profile.XXXXXX.ts")
  cp "$research/fall-cloud-profile.ts.txt" "$driver"
  set +e
  if [[ $mode == compiler ]]; then
    node "${compiler_flags[@]}" "$cli" "$driver" > "$receipt/output.txt" 2>&1
  else
    node --cpu-prof --cpu-prof-dir="$PWD/$receipt" --cpu-prof-name=fall.cpuprofile "$cli" "$driver" > "$receipt/output.txt" 2>&1
  fi
  result=$?
  set -e
fi
printf '%s\n' "$result" > "$receipt/exit-code.txt"
snapshot "$receipt/source-after.json"
if ! cmp -s "$receipt/source-before.json" "$receipt/source-after.json"; then
  echo 'Source changed during diagnostic; result cannot establish pinned acceptance' > "$receipt/source-integrity.txt"
  exit 70
fi
echo 'Exact before/after source hashes match' > "$receipt/source-integrity.txt"
exit "$result"
