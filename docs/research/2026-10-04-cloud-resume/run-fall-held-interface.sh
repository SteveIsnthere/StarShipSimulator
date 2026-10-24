#!/usr/bin/env bash
set -euo pipefail
routes=(/workspace/cloud-bootstrap/starship-v*/activate.sh)
[[ ${#routes[@]} == 1 && -f ${routes[0]} ]] || exit 69
source "${routes[0]}"
cd /workspace/StarShipSimulator
[[ $(node --version) == v22.23.3 ]] || exit 69
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == fall-held-interface ]] || { echo 'Lead must grant exclusive CPU for this candidate phase' >&2; exit 69; }
mode=${1:-}
[[ $mode == proof || $mode == measure ]] || exit 64
research=docs/research/2026-10-04-cloud-resume
receipt="$research/fall-held-interface-$mode-receipt"
if [[ $mode == measure ]]; then
  [[ ${STARSHIP_CANDIDATE_REVIEW_APPROVED:-} == cycle2-attempt3 ]] || { echo 'Fresh proof/design review approval required' >&2; exit 69; }
  [[ $(cat "$research/fall-held-interface-proof-receipt/exit-code.txt") == 0 ]] || exit 69
  [[ $(cat "$research/fall-held-interface-proof-receipt/source-integrity.txt") == 'Exact before/after source hashes match' ]] || exit 69
fi
[[ -f node_modules/vitest/vitest.mjs ]] || exit 69
mkdir "$receipt" # Refuse any existing receipt; one declared execution per phase.
temporary=()
trap 'if (( ${#temporary[@]} )); then rm -- "${temporary[@]}"; fi' EXIT
node --version > "$receipt/node.txt"
node -p 'JSON.stringify({platform:process.platform,arch:process.arch,versions:process.versions})' > "$receipt/runtime.json"
git rev-parse HEAD > "$receipt/head.txt"
git status --short > "$receipt/status-before.txt"
snapshot() {
 python3 - "$1" <<'PY'
import pathlib,hashlib,json,sys
paths=[]
for root in ('src','tests','scripts'):
    paths.extend(p for p in pathlib.Path(root).rglob('*') if p.is_file())
for pattern in ('package*.json','*config.*','.nvmrc'):
    paths.extend(pathlib.Path('.').glob(pattern))
paths.extend(p for p in pathlib.Path('docs/research/2026-10-04-cloud-resume').iterdir()
    if p.is_file() and (p.name.startswith('fall-held-interface-') or p.name=='run-fall-held-interface.sh'))
paths.extend((pathlib.Path('node_modules/vitest/package.json'),pathlib.Path('node_modules/vitest/vitest.mjs')))
pathlib.Path(sys.argv[1]).write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths))},indent=2)+'\n')
PY
}
snapshot "$receipt/source-before.json"
if [[ $mode == proof ]]; then
  set +e
  npm run build > "$receipt/build.txt" 2>&1
  build_result=$?
  set -e
  printf '%s\n' "$build_result" > "$receipt/build-exit-code.txt"
  if (( build_result != 0 )); then
    printf '%s\n' "$build_result" > "$receipt/exit-code.txt"
    snapshot "$receipt/source-after.json"
    if cmp -s "$receipt/source-before.json" "$receipt/source-after.json"; then
      echo 'Exact before/after source hashes match' > "$receipt/source-integrity.txt"
    else
      echo 'Source changed during failed build; result invalidated' > "$receipt/source-integrity.txt"
    fi
    exit "$build_result"
  fi
fi
if [[ $mode == measure ]] && ! cmp -s "$research/fall-held-interface-proof-receipt/source-before.json" "$receipt/source-before.json"; then
  echo 'Proof and candidate measurement source manifests differ; no measurement authorized' > "$receipt/preflight.txt"
  exit 70
fi
prototype=$(mktemp "$research/held-interface-XXXXXX.prototype.ts")
temporary+=("$prototype")
cp "$research/fall-held-interface-prototype.ts.txt" "$prototype"
if [[ $mode == proof ]]; then
  templates=(fall-held-interface-preparation-proof.test.ts.txt fall-held-interface-continuation-proof.test.ts.txt fall-held-interface-boundary-proof.test.ts.txt)
else
  templates=(fall-held-interface-candidate.timing.test.ts.txt)
fi
specs=()
for template in "${templates[@]}"; do
  spec=$(mktemp "$research/held-interface-XXXXXX.test.ts")
  temporary+=("$spec")
  python3 - "$research/$template" "$spec" "$(basename "$prototype")" <<'PY'
import pathlib,sys
data=pathlib.Path(sys.argv[1]).read_text()
assert 'PROTOTYPE_PLACEHOLDER' in data
pathlib.Path(sys.argv[2]).write_text(data.replace('PROTOTYPE_PLACEHOLDER',sys.argv[3]))
PY
  specs+=("$spec")
done
if [[ $mode == proof ]]; then
  specs+=(tests/proofs/unpowered-fall-preparation.test.ts tests/core/fall-continuation.test.ts tests/proofs/acceleration-components.test.ts)
fi
config=$(mktemp "$research/held-interface-XXXXXX.config.mts")
temporary+=("$config")
python3 - "$config" "${specs[@]}" <<'PY'
import pathlib,json,sys
pathlib.Path(sys.argv[1]).write_text("import {defineConfig} from 'vitest/config';\nimport base from '../../../vitest.config.ts';\nexport default defineConfig({resolve:base.resolve??{},test:{environment:'node',maxWorkers:1,include:"+json.dumps(sys.argv[2:])+"}});\n")
PY
printf '%s\n' "$prototype" "$config" "${specs[@]}" > "$receipt/materialized-paths.txt"
sha256sum "$prototype" "$config" "${specs[@]}" > "$receipt/materialized-hashes.txt"
set +e
node node_modules/vitest/vitest.mjs run --config "$config" > "$receipt/output.txt" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$receipt/exit-code.txt"
snapshot "$receipt/source-after.json"
if ! cmp -s "$receipt/source-before.json" "$receipt/source-after.json"; then
  echo 'Source changed during phase; result invalidated' > "$receipt/source-integrity.txt"
  exit 70
fi
echo 'Exact before/after source hashes match' > "$receipt/source-integrity.txt"
exit "$result"
