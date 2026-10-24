#!/usr/bin/env bash
set -euo pipefail
routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#routes[@]} == 1 && -f ${routes[0]} ]] || exit 69
source "${routes[0]}"
cd /workspace/StarShipSimulator
[[ $(node --version) == v22.23.3 ]] || exit 69
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == burn-bundle-proof ]] || exit 69
[[ ${STARSHIP_BURN_REVIEW_APPROVED:-} == proof-only-cause-repair1 ]] || exit 69
research=docs/research/2026-10-04-cloud-resume
receipt="$research/burn-bundle-proof-cause-repair1-receipt"
mkdir "$receipt"
temporary=()
stage=receipt-created
snapshot() {
 python3 - "$1" <<'PY'
import pathlib,hashlib,json,sys
paths=[]
for root in ('src','tests','scripts'):
 paths.extend(p for p in pathlib.Path(root).rglob('*') if p.is_file())
for pattern in ('package*.json','*config.*','.nvmrc'):
 paths.extend(pathlib.Path('.').glob(pattern))
r=pathlib.Path('docs/research/2026-10-04-cloud-resume')
for name in ('fall-bundle-entry.ts.txt','fall-bundle-builder.mjs','fall-bundle-adapter.ts.txt','fall-bundle-declaration.md','run-fall-bundle-proof.sh','fall-bundle-preparation-proof.test.ts.txt','fall-bundle-continuation-proof.test.ts.txt','fall-bundle-boundary-proof.test.ts.txt','burn-bundle-proof.ts.txt','burn-bundle-declaration.md','run-burn-bundle-proof.sh'):
 paths.append(r/name)
for name in ('vite/package.json','rolldown/package.json','vitest/package.json','vitest/vitest.mjs','vite-node/package.json','vite-node/dist/cli.mjs'):
 paths.append(pathlib.Path('node_modules')/name)
pathlib.Path(sys.argv[1]).write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths))},indent=2)+'\n')
PY
}
finish() {
 task_status=$?
 trap - EXIT
 set +e
 if (( ${#temporary[@]} )); then
  rm -- "${temporary[@]}"
  if (( $? != 0 )); then
   echo 'Temporary source cleanup failed' > "$receipt/cleanup-failure.txt"
   if (( task_status == 0 )); then task_status=70; fi
  fi
 fi
 snapshot "$receipt/source-after.json"
 if [[ -f $receipt/source-before.json && -f $receipt/source-after.json ]]; then
  if cmp -s "$receipt/source-before.json" "$receipt/source-after.json"; then
   echo 'Exact before/after source hashes match' > "$receipt/source-integrity.txt"
  else
   echo 'Source changed; proof invalidated' > "$receipt/source-integrity.txt"
   task_status=70
  fi
 else
  echo 'Verification unavailable: complete before/after source manifests absent' > "$receipt/source-integrity.txt"
  if (( task_status == 0 )); then task_status=70; fi
 fi
 printf '%s\n' "$task_status" > "$receipt/exit-code.txt"
 printf 'Final exit status: %s\nLast attempted stage: %s\n' "$task_status" "$stage" > "$receipt/launch-status.txt"
 exit "$task_status"
}
trap finish EXIT
exec 2> "$receipt/runner-stderr.txt"
stage=preflight
node --version > "$receipt/node.txt"
node -p 'JSON.stringify({platform:process.platform,arch:process.arch,versions:process.versions})' > "$receipt/runtime.json"
git rev-parse HEAD > "$receipt/head.txt"
git status --short > "$receipt/status-before.txt"
[[ -f node_modules/vitest/vitest.mjs ]] || exit 69
snapshot "$receipt/source-before.json"
python3 - "$receipt/source-before.json" <<'PY'
import json,sys
m=json.load(open(sys.argv[1]))
assert m['src/core/control/guidance-physics.ts']=='5698a8f7ad0da8927613a8cdd6efc2cfde88efd79563cc9d8f7bfd5c28f7ab77'
assert m['tests/core/guidance-physics.timing.test.ts']=='8bfddfb28e72aee994f6a7fe0d352b13df76a63706cc4c58bd211c26a4965358'
PY
stage=prior-current-build-and-bundle-pin-verification
python3 - "$receipt/source-before.json" "$research/fall-bundle-proof-receipt" <<'PYVERIFY'
import pathlib,hashlib,json,sys
current=json.load(open(sys.argv[1]));r=pathlib.Path(sys.argv[2]);prior=json.loads((r/'source-before.json').read_text())
assert (r/'exit-code.txt').read_text().strip()=='0'
assert (r/'app-build-exit-code.txt').read_text().strip()=='0'
assert (r/'bundle-build-exit-code.txt').read_text().strip()=='0'
assert prior==json.loads((r/'source-after.json').read_text())
for p,digest in prior.items():
 assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==digest,p
 assert current[p]==digest,p
core=lambda k:k.startswith(('src/','tests/','scripts/')) or '/' not in k
assert {k for k in prior if core(k)}=={k for k in current if core(k)},'Source file inventory changed since qualified build'
for p,digest in json.loads((r/'bundle-hashes.json').read_text()).items():
 assert hashlib.sha256((r/p).read_bytes()).hexdigest()==digest,p
print('Prior ordered app/bundle build remains exact-current; all compiled files verified')
PYVERIFY
stage=cli-resolution
cli=$(node --input-type=module <<'JS'
import {readFileSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const p=fileURLToPath(import.meta.resolve('vite-node/package.json'));
const m=JSON.parse(readFileSync(p,'utf8'));
const bin=typeof m.bin==='string'?m.bin:m.bin['vite-node'];
const path=resolve(dirname(p),bin);
if(path!==fileURLToPath(import.meta.resolve('vite-node/cli'))||!statSync(path).isFile())throw new Error('Declared CLI/export regular-file mismatch');
console.log(path);
JS
)
printf '%s\n' "$cli" > "$receipt/cli-path.txt"
stage=materialize-burn-proof
driver=$(mktemp "$research/burn-proof-XXXXXX.ts")
temporary+=("$driver")
python3 - "$research/burn-bundle-proof.ts.txt" "$driver" "$(realpath "$research/fall-bundle-proof-receipt/plain/entry.mjs")" "$(realpath "$research/fall-bundle-proof-receipt/counted/entry.mjs")" "$(realpath "$receipt")" <<'PYDRIVER'
import pathlib,sys
s=pathlib.Path(sys.argv[1]).read_text()
for token,value in zip(('PLAIN_ENTRY_PLACEHOLDER','COUNTED_ENTRY_PLACEHOLDER','RECEIPT_PLACEHOLDER'),sys.argv[3:]):
 assert s.count(token)==(2 if token=='RECEIPT_PLACEHOLDER' else 1)
 s=s.replace(token,value)
pathlib.Path(sys.argv[2]).write_text(s)
PYDRIVER
printf '%s\n' "$driver" > "$receipt/materialized-paths.txt"
sha256sum "$driver" > "$receipt/materialized-hashes.txt"
stage=exact-burn-equivalence-proof
set +e
timeout --signal=TERM --kill-after=5s 300s node "$cli" --script "$driver" > "$receipt/output.txt" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$receipt/proof-exit-code.txt"
exit "$result"
