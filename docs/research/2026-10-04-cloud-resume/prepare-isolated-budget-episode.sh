#!/usr/bin/env bash
# Preparation-only unique receipt directory; no copy/hash workload/browser/build.
set -euo pipefail
setup=${1:?Pass exact retained approved private bundle directory}
[[ $setup =~ ^/tmp/starship-isolated-worker\.[A-Za-z0-9]+$ && -f $setup/setup-receipt.json && -f $setup/bundle-copy-manifest.json ]] || { echo 'Reviewed isolated bundle required' >&2; exit 69; }
episode=$(mktemp -d /tmp/starship-isolated-budget.XXXXXXXX)
chmod 700 "$episode"
python3 - "$setup" "$episode" <<'PYRECEIPT'
import pathlib,sys,json,hashlib,os,time
setup,episode=map(pathlib.Path,sys.argv[1:]);receipt=json.loads((setup/'setup-receipt.json').read_text())
if receipt['actualBrowser']!=str(setup/'browser/chrome-headless-shell') or receipt['actualBrowserSha256']!='e11fc9ce65c96313476f7ee9844b6fb6a9220fb048693cfe9eee00acf4170a9f':raise SystemExit('Unexpected candidate identity')
research=pathlib.Path('/workspace/StarShipSimulator/docs/research/2026-10-04-cloud-resume');names=['isolated-launch-budget.spec.ts','isolated-launch-budget.config.ts','isolated-budget-boundary.ts','isolated-budget-cleanup.ts','prepare-isolated-budget-episode.sh','cloud-isolated-full-budget-declaration.md'];harness=[{'path':str(research/name),'sha256':hashlib.sha256((research/name).read_bytes()).hexdigest()} for name in names]
with (episode/'episode-declaration.json').open('x') as f:json.dump({'purpose':'ONE original full desktop launch budget,60warm300measured,no30trace/noqualitychanges','setup':str(setup),'episode':str(episode),'setupReceiptSha256':hashlib.sha256((setup/'setup-receipt.json').read_bytes()).hexdigest(),'harness':harness,'requestedWorkers':3,'retryCount':0,'cadenceFloorFps':59,'p95CeilingMs':16.67,'clockTicksPerSecond':os.sysconf('SC_CLK_TCK'),'createdBootSeconds':float(pathlib.Path('/proc/uptime').read_text().split()[0]),'createdUTCUnixSeconds':time.time()},f,indent=2);f.write('\n')
PYRECEIPT
printf 'Prepared only: %s\nOriginal candidate: %s\n' "$episode" "$setup"
