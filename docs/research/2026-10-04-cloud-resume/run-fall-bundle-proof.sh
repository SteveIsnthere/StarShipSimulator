#!/usr/bin/env bash
set -euo pipefail
routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#routes[@]} == 1 && -f ${routes[0]} ]] || exit 69
source "${routes[0]}"
cd /workspace/StarShipSimulator
[[ $(node --version) == v22.23.3 ]] || exit 69
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == fall-bundle-proof ]] || exit 69
[[ ${STARSHIP_BUNDLE_REVIEW_APPROVED:-} == proof-only ]] || exit 69
research=docs/research/2026-10-04-cloud-resume
receipt="$research/fall-bundle-proof-receipt"
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
for name in ('fall-bundle-entry.ts.txt','fall-bundle-builder.mjs','fall-bundle-adapter.ts.txt','fall-bundle-declaration.md','run-fall-bundle-proof.sh','fall-bundle-preparation-proof.test.ts.txt','fall-bundle-continuation-proof.test.ts.txt','fall-bundle-boundary-proof.test.ts.txt'):
 paths.append(r/name)
for name in ('vite/package.json','rolldown/package.json','vitest/package.json','vitest/vitest.mjs'):
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
stage=current-app-build
set +e
timeout --signal=TERM --kill-after=5s 300s npm run build > "$receipt/app-build.txt" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$receipt/app-build-exit-code.txt"
(( result == 0 )) || exit "$result"
stage=materialize-entries
plain=$(mktemp "$research/bundle-proof-XXXXXX.plain.ts")
temporary+=("$plain")
counted=$(mktemp "$research/bundle-proof-XXXXXX.counted.ts")
temporary+=("$counted")
cp "$research/fall-bundle-entry.ts.txt" "$plain"
cp "$research/fall-bundle-entry.ts.txt" "$counted"
printf "export {resetCounts,readCounts} from 'fall-proof-counters';\n" >> "$counted"
stage=production-option-bundles
set +e
timeout --signal=TERM --kill-after=5s 300s node "$research/fall-bundle-builder.mjs" "$receipt" "$plain" "$counted" > "$receipt/bundle-build.txt" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$receipt/bundle-build-exit-code.txt"
(( result == 0 )) || exit "$result"
stage=materialize-proofs
adapter=$(mktemp "$research/bundle-proof-XXXXXX.adapter.ts")
temporary+=("$adapter")
python3 - "$research/fall-bundle-adapter.ts.txt" "$adapter" "$(realpath "$receipt/plain/entry.mjs")" "$(realpath "$receipt/counted/entry.mjs")" <<'PY'
import pathlib,sys
s=pathlib.Path(sys.argv[1]).read_text()
assert s.count('PLAIN_ENTRY_PLACEHOLDER')==1 and s.count('COUNTED_ENTRY_PLACEHOLDER')==1
pathlib.Path(sys.argv[2]).write_text(s.replace('PLAIN_ENTRY_PLACEHOLDER',sys.argv[3]).replace('COUNTED_ENTRY_PLACEHOLDER',sys.argv[4]))
PY
specs=()
for kind in preparation continuation boundary; do
 spec=$(mktemp "$research/bundle-proof-XXXXXX.test.ts")
 temporary+=("$spec")
 python3 - "$research/fall-bundle-$kind-proof.test.ts.txt" "$spec" "$(basename "$adapter")" <<'PY'
import pathlib,sys
s=pathlib.Path(sys.argv[1]).read_text()
assert 'ADAPTER_PLACEHOLDER' in s
pathlib.Path(sys.argv[2]).write_text(s.replace('ADAPTER_PLACEHOLDER',sys.argv[3]))
PY
 specs+=("$spec")
done
specs+=(tests/proofs/unpowered-fall-preparation.test.ts tests/core/fall-continuation.test.ts tests/proofs/acceleration-components.test.ts)
config=$(mktemp "$research/bundle-proof-XXXXXX.config.mts")
temporary+=("$config")
python3 - "$config" "${specs[@]}" <<'PY'
import pathlib,json,sys
pathlib.Path(sys.argv[1]).write_text("import {defineConfig} from 'vitest/config';\nimport base from '../../../vitest.config.ts';\nexport default defineConfig({resolve:base.resolve??{},test:{environment:'node',maxWorkers:1,testTimeout:30000,include:"+json.dumps(sys.argv[2:])+"}});\n")
PY
printf '%s\n' "${temporary[@]}" > "$receipt/materialized-paths.txt"
sha256sum "${temporary[@]}" > "$receipt/materialized-hashes.txt"
python3 - "$receipt" <<'PY'
import pathlib,hashlib,json,sys
r=pathlib.Path(sys.argv[1]);files=[p for d in ('plain','counted') for p in (r/d).rglob('*') if p.is_file()]
(r/'bundle-hashes.json').write_text(json.dumps({str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},indent=2)+'\n')
PY
stage=exact-equivalence-proof
set +e
timeout --signal=TERM --kill-after=5s 300s node node_modules/vitest/vitest.mjs run --config "$config" > "$receipt/output.txt" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$receipt/proof-exit-code.txt"
exit "$result"
