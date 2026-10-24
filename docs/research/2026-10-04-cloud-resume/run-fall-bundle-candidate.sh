#!/usr/bin/env bash
set -euo pipefail
routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#routes[@]} == 1 && -f ${routes[0]} ]] || exit 69
source "${routes[0]}"
cd /workspace/StarShipSimulator
[[ $(node --version) == v22.23.3 ]] || exit 69
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == fall-bundle-candidate ]] || exit 69
[[ ${STARSHIP_CANDIDATE_REVIEW_APPROVED:-} == cycle3-attempt2 ]] || exit 69
research=docs/research/2026-10-04-cloud-resume
receipt="$research/fall-bundle-candidate-cycle3-attempt2-receipt"
mkdir "$receipt"
temporary=()
stage=receipt-created
snapshot() {
 python3 - "$1" <<'PY'
import pathlib,hashlib,json,sys,shutil
paths=[]
for root in ('src','tests','scripts'):
 paths.extend(p for p in pathlib.Path(root).rglob('*') if p.is_file())
for pattern in ('package*.json','*config.*','.nvmrc'):
 paths.extend(pathlib.Path('.').glob(pattern))
r=pathlib.Path('docs/research/2026-10-04-cloud-resume')
for name in ('fall-bundle-entry.ts.txt','fall-bundle-builder.mjs','fall-bundle-adapter.ts.txt','fall-bundle-declaration.md','run-fall-bundle-proof.sh','fall-bundle-preparation-proof.test.ts.txt','fall-bundle-continuation-proof.test.ts.txt','fall-bundle-boundary-proof.test.ts.txt','burn-bundle-proof.ts.txt','burn-bundle-declaration.md','run-burn-bundle-proof.sh','fall-bundle-candidate.mjs.txt','fall-bundle-candidate-declaration.md','run-fall-bundle-candidate.sh'):
 paths.append(r/name)
for name in ('vite/package.json','rolldown/package.json','vitest/package.json','vitest/vitest.mjs','vite-node/package.json','vite-node/dist/cli.mjs'):
 paths.append(pathlib.Path('node_modules')/name)
paths.append(pathlib.Path(shutil.which('node')))
fall=r/'fall-bundle-proof-receipt';burn=r/'burn-bundle-proof-cause-repair1-receipt'
for folder in ('plain','counted'):
 paths.extend(p for p in (fall/folder).rglob('*') if p.is_file())
for receipt,names in ((fall,('source-before.json','source-after.json','bundle-hashes.json','plain-source-map-manifest.json','virtual-source-manifest.json','exit-code.txt','proof-exit-code.txt','app-build-exit-code.txt','bundle-build-exit-code.txt','source-integrity.txt')),(burn,('source-before.json','source-after.json','burn-proof-result.json','exit-code.txt','proof-exit-code.txt','source-integrity.txt'))):
 paths.extend(receipt/name for name in names)
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
 python3 - "$research/fall-bundle-proof-receipt" <<'PYPOST'
import pathlib,hashlib,json,sys
r=pathlib.Path(sys.argv[1])
for p,digest in json.loads((r/'bundle-hashes.json').read_text()).items():
 assert hashlib.sha256((r/p).read_bytes()).hexdigest()==digest,p
PYPOST
 if (( $? != 0 )); then echo 'Compiled artifacts changed; result invalidated' > "$receipt/artifact-integrity.txt"; task_status=70
 else echo 'All qualified compiled artifact hashes match' > "$receipt/artifact-integrity.txt"; fi
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
stage=prior-build-and-completed-proof-pin-verification
python3 - "$receipt/source-before.json" "$research/fall-bundle-proof-receipt" "$research/burn-bundle-proof-cause-repair1-receipt" <<'PYVERIFY'
import pathlib,hashlib,json,sys
current=json.load(open(sys.argv[1]));fall=pathlib.Path(sys.argv[2]);burn=pathlib.Path(sys.argv[3])
for r in (fall,burn):
 assert (r/'exit-code.txt').read_text().strip()=='0'
 assert (r/'proof-exit-code.txt').read_text().strip()=='0'
 assert (r/'source-integrity.txt').read_text().strip()=='Exact before/after source hashes match'
 prior=json.loads((r/'source-before.json').read_text());assert prior==json.loads((r/'source-after.json').read_text())
 for p,digest in prior.items():
  assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==digest,p
  assert current[p]==digest,p
 core=lambda k:k.startswith(('src/','tests/','scripts/')) or '/' not in k
 assert {k for k in prior if core(k)}=={k for k in current if core(k)},'Source inventory changed since qualification'
 assert all(not pathlib.Path(p).exists() for p in (r/'materialized-paths.txt').read_text().splitlines()),'Proof cleanup incomplete'
assert (fall/'app-build-exit-code.txt').read_text().strip()=='0'
assert (fall/'bundle-build-exit-code.txt').read_text().strip()=='0'
assert json.loads((burn/'burn-proof-result.json').read_text())['backendCallsEach']==2300
for p,digest in json.loads((fall/'bundle-hashes.json').read_text()).items():
 assert hashlib.sha256((fall/p).read_bytes()).hexdigest()==digest,p
print('Both proofs/current build pins and all compiled artifacts exact')
PYVERIFY
stage=runtime-accounting-preflight
cat /sys/fs/cgroup/cpu.max > "$receipt/cpu-max.txt"
cat /sys/fs/cgroup/cpu.stat > "$receipt/cpu-stat-before.txt"
getconf CLK_TCK > "$receipt/clock-ticks-per-second.txt"
stage=materialize-candidate
driver=$(mktemp "$research/bundle-candidate-XXXXXX.mjs")
temporary+=("$driver")
python3 - "$research/fall-bundle-candidate.mjs.txt" "$driver" "$(realpath "$research/fall-bundle-proof-receipt/plain/entry.mjs")" <<'PYDRIVER'
import pathlib,sys
s=pathlib.Path(sys.argv[1]).read_text();assert s.count('PLAIN_ENTRY_PLACEHOLDER')==1
pathlib.Path(sys.argv[2]).write_text(s.replace('PLAIN_ENTRY_PLACEHOLDER',sys.argv[3]))
PYDRIVER
printf '%s\n' "$driver" > "$receipt/materialized-paths.txt"
sha256sum "$driver" > "$receipt/materialized-hashes.txt"
export STARSHIP_CANDIDATE_RECEIPT
STARSHIP_CANDIDATE_RECEIPT=$(realpath "$receipt")
stage=one-original-count-native-candidate
set +e
timeout --signal=TERM --kill-after=5s 30s node "$driver" > "$receipt/output.txt" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$receipt/workload-exit-code.txt"
cat /sys/fs/cgroup/cpu.stat > "$receipt/cpu-stat-after.txt"
exit "$result"
