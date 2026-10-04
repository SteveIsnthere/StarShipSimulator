"""Research preparation only: fresh ownership episode, reuse qualified immutable copy."""
import hashlib,json,os,pathlib,re,shlex,subprocess,sys
bundle=pathlib.Path('/tmp/starship-fullchrome-worker.VB1uzYO9')
original=bundle/'setup-receipt.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
if sha(original.read_bytes())!='9a0d1d12414b0c251db98ef5bca3fd996b2a5c327600f2abfcef847be5a37e1f':raise SystemExit('Qualified full-Chrome setup receipt drift')
receipt=json.loads(original.read_text())
if receipt['actualBrowser']!=str(bundle/'browser/chrome'):raise SystemExit('Exact qualified copy required')
if receipt['actualBrowserSha256']!='0b20b130e7edd9dd51873be867761295fe0cfad490c2b9a64f95bd3cfc08fa71':raise SystemExit('Full-Chrome pin mismatch')
repo=pathlib.Path('/workspace/StarShipSimulator')
paths=sorted(p for p in subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=repo,text=True).split('\0') if re.match(r'^(src/|tests/|scripts/|public/|\.agents/|\.nvmrc$|package[^/]*\.json$|[^/]*config\.[^/]+$)',p))
current=[[p,sha((repo/p).read_bytes()) if (repo/p).is_file() else None] for p in paths]
bridge=None
if current!=receipt['sourceManifest']:
    if len(sys.argv)!=2:raise SystemExit('Explicit independently reviewed exact source bridge required before ownership preparation')
    data=pathlib.Path(sys.argv[1]).read_bytes()
    if not re.fullmatch('[a-f0-9]{64}',os.environ.get('ABA_SOURCE_BRIDGE_SHA256','')) or sha(data)!=os.environ['ABA_SOURCE_BRIDGE_SHA256']:raise SystemExit('Approved source bridge digest mismatch')
    bridge=json.loads(data)
    old=dict(receipt['sourceManifest']);new=dict(current)
    changes=[{'path':p,'before':old.get(p),'after':new.get(p)} for p in sorted(set(old)|set(new)) if old.get(p)!=new.get(p)]
    if bridge['qualifiedSourceSha256']!=receipt['sourceManifestSha256'] or bridge['currentSourceSha256']!=sha(json.dumps(current,separators=(',',':')).encode()) or bridge['changes']!=changes:raise SystemExit('Exact qualified/current source bridge mismatch')
    if any(p['path'].startswith(('src/','public/')) or (p['path'].startswith('package') and p['path']!='package.json') for p in changes):raise SystemExit('Qualified application/assets/dependency source changed; narrower bridge cannot authorize this diagnostic')
    if any(not (p['path'] in ['eslint.config.js','package.json'] or p['path'].startswith(('scripts/','tests/proofs/')) or p['path'] in ['tests/e2e/chromium.ts','tests/support/chromium-layout.test.ts','tests/support/native-guidance-benchmark.ts']) for p in changes):raise SystemExit('Source bridge exceeds explicitly declared tooling/helper/proof-only scope')
    if any(p['path']=='package.json' for p in changes):
        change=next(p for p in changes if p['path']=='package.json');diff=bridge['packageBenchDiff']
        if sha(diff['beforePackage'].encode())!=change['before'] or sha(diff['afterPackage'].encode())!=change['after']:raise SystemExit('Exact package bench bytes mismatch')
        before_package=json.loads(diff['beforePackage']);after_package=json.loads(diff['afterPackage'])
        if before_package['scripts']['bench']!=diff['beforeBench'] or after_package['scripts']['bench']!=diff['afterBench']:raise SystemExit('Exact package bench commands mismatch')
        before_package['scripts']['bench']=after_package['scripts']['bench']
        if before_package!=after_package:raise SystemExit('Package bridge changes fields beyond approved bench command')
    if bridge.get('githubCommitDiff')!=[]:raise SystemExit('Qualified CI commit graph changed')
    receipt['sourceManifest']=current
    receipt['sourceManifestSha256']=bridge['currentSourceSha256']
import tempfile
setup=pathlib.Path(tempfile.mkdtemp(prefix='starship-fullchrome-aba.',dir='/tmp'));setup.chmod(0o700)
print('Prepared ownership episode only: '+str(setup),flush=True)
with (setup/'preparation-created.json').open('x') as f:json.dump({'setup':str(setup),'qualifiedBundle':str(bundle),'purpose':'ownership only; no browser/copy/build'},f)
try:
    with (setup/'bundle-copy-manifest.json').open('xb') as f:f.write((bundle/'bundle-copy-manifest.json').read_bytes())
    with (setup/'qualified-setup-receipt.json').open('xb') as f:f.write(original.read_bytes())
    if bridge is not None:
        with (setup/'source-bridge.json').open('xb') as f:f.write(data)
    wrapper=setup/'browser-wrapper.sh'
    owner_code="import pathlib,sys,json,os\npid=int(sys.argv[1]);stat=pathlib.Path(f'/proc/{pid}/stat').read_text();fields=stat[stat.rfind(')')+2:].split()\nwith pathlib.Path('wrapper-owner.pending.json').open('x') as f:json.dump({'pid':pid,'starttime':fields[19],'ppid':int(fields[1]),'pgrp':int(fields[2])},f)\nos.link('wrapper-owner.pending.json','wrapper-owner.json');os.unlink('wrapper-owner.pending.json')\n"
    text='#!/usr/bin/env bash\nset -euo pipefail\ncd -- '+shlex.quote(str(setup))+"\npython3 - \"$$\" <<'PYOWNER'\n"+owner_code+"PYOWNER\nfor ((i=0;i<600;i++)); do\n [[ ! -e STOP ]] || exit 70\n if [[ -e GO ]]; then break; fi\n sleep 0.05\ndone\n[[ -e GO && ! -e STOP ]] || exit 70\ncd -- "+shlex.quote(receipt['browserOnlyCwd'])+'\nexec '+shlex.quote(receipt['actualBrowser'])+' "$@"\n'
    with wrapper.open('x') as f:f.write(text)
    wrapper.chmod(0o700)
    receipt.update({'purpose':'ONE frozen-state particle visible/hidden/restored attribution; no acceptance','qualifiedBundle':str(bundle),'qualifiedSetupReceiptSha256':sha(original.read_bytes()),'sourceBridgeSha256':sha(data) if bridge is not None else None,'additionalGithubFiles':bridge['githubFiles'] if bridge is not None else [],'wrapper':str(wrapper),'wrapperSha256':sha(wrapper.read_bytes())})
    with (setup/'setup-receipt.json').open('x') as f:json.dump(receipt,f,indent=2);f.write('\n')
except BaseException as error:
    with (setup/'preparation-failure.json').open('x') as f:json.dump({'error':str(error),'setup':str(setup)},f)
    raise
