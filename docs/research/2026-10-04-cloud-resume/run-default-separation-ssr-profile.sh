#!/usr/bin/env bash
# ONE research SSR profile. No tests, acceptance or automatic retry.
set -euo pipefail
source /workspace/cloud-bootstrap/starship-v*/activate.sh
cd /workspace/StarShipSimulator
[[ ${STARSHIP_CPU_SLOT_GRANTED:-} == separation-ssr-profile ]] || exit 69
[[ $(node --version) == v22.23.3 ]] || exit 69
research=docs/research/2026-10-04-cloud-resume
receipt="$research/default-separation-ssr-profile-receipt"
cli=$(node --input-type=module <<'JS'
import {readFileSync,statSync} from 'node:fs';import {dirname,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const p=fileURLToPath(import.meta.resolve('vite-node/package.json')),m=JSON.parse(readFileSync(p,'utf8'));
const bin=resolve(dirname(p),typeof m.bin==='string'?m.bin:m.bin['vite-node']);
if(bin!==fileURLToPath(import.meta.resolve('vite-node/cli'))||!statSync(bin).isFile())throw Error('Locked SSR CLI unavailable');console.log(bin);
JS
)
mkdir "$receipt"
driver=$(mktemp "$research/default-separation-ssr-profile.XXXXXXXX.ts")
trap 'rm -f -- "$driver"' EXIT
cp "$research/default-separation-ssr-profile.ts.txt" "$driver"
snapshot(){ node --input-type=module - "$1" "$cli" "$driver" <<'JS'
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const files=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(p=>/^(src\/|tests\/|scripts\/|public\/|\.agents\/|package[^/]*\.json$|[^/]*config\.[^/]+$|\.nvmrc$)/.test(p));
files.push(process.argv[3],process.argv[4],'node_modules/vite-node/package.json','node_modules/vitest/package.json','docs/research/2026-10-04-cloud-resume/default-separation-ssr-profile.ts.txt','docs/research/2026-10-04-cloud-resume/run-default-separation-ssr-profile.sh','docs/research/2026-10-04-cloud-resume/default-separation-grid-cost-profile-declaration.md','docs/research/2026-10-04-cloud-resume/terminal-grid-separation-core-hashes.json','docs/research/2026-10-04-cloud-resume/terminal-grid-separation-receipt.jsonl');
const hashes=Object.fromEntries([...new Set(files)].sort().map(p=>[p,fs.existsSync(p)?createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null]));
if(!hashes[process.argv[4]]||hashes[process.argv[4]]!==hashes['docs/research/2026-10-04-cloud-resume/default-separation-ssr-profile.ts.txt'])throw Error('Actual executed driver differs from pinned template');
fs.writeFileSync(process.argv[2],JSON.stringify({node:process.version,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),hashes},null,2)+'\n',{flag:'wx'});
JS
}
snapshot "$receipt/before-pins.json"
export SEP_PROFILE_RECEIPT="$PWD/$receipt"
set +e
timeout --signal=TERM --kill-after=5s 125s node "$cli" "$driver" > "$receipt/output.txt" 2>&1
status=$?
set -e
printf '%s\n' "$status" > "$receipt/exit-status.txt"
snapshot "$receipt/after-pins.json"
node --input-type=module - "$receipt" <<'JS'
import fs from 'node:fs';import assert from 'node:assert/strict';const p=process.argv[2];
assert.deepEqual(JSON.parse(fs.readFileSync(`${p}/before-pins.json`)),JSON.parse(fs.readFileSync(`${p}/after-pins.json`)));
fs.writeFileSync(`${p}/source-unchanged.json`,JSON.stringify({unchanged:true})+'\n',{flag:'wx'});
JS
exit "$status"
