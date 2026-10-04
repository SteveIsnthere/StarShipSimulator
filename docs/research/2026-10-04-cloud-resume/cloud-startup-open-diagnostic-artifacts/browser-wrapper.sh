#!/usr/bin/env bash
set -euo pipefail
cd -- /tmp/starship-open-diagnostic.kfwD0HQf
python3 - "$$" <<'PYOWNER'
import pathlib,sys,json,os
pid=int(sys.argv[1]);stat=pathlib.Path(f'/proc/{pid}/stat').read_text();fields=stat[stat.rfind(')')+2:].split()
with pathlib.Path('wrapper-owner.pending.json').open('x') as f:json.dump({'pid':pid,'starttime':fields[19],'ppid':int(fields[1]),'pgrp':int(fields[2])},f)
os.link('wrapper-owner.pending.json','wrapper-owner.json');os.unlink('wrapper-owner.pending.json')
PYOWNER
for ((i=0;i<600;i++)); do
 [[ ! -e STOP ]] || exit 70
 if [[ -e GO ]]; then break; fi
 sleep 0.05
done
[[ -e GO && ! -e STOP ]] || exit 70
exec /usr/bin/strace -f -ttt -s 256 -o /tmp/starship-open-diagnostic.kfwD0HQf/startup-open.log -e trace=openat,openat2,chdir,fchdir /workspace/cloud-bootstrap/starship-v1/browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell "$@"
