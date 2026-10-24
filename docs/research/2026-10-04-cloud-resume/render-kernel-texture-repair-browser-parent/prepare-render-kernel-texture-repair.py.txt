"""Preparation only; require independently pinned CURRENT qualified build input."""
import hashlib,json,os,pathlib,shlex,sys,tempfile

sha=lambda b:hashlib.sha256(b).hexdigest()
repo=pathlib.Path('/workspace/StarShipSimulator')
bundle=pathlib.Path('/tmp/starship-fullchrome-worker.VB1uzYO9')
old_data=(bundle/'setup-receipt.json').read_bytes()
if sha(old_data)!='9a0d1d12414b0c251db98ef5bca3fd996b2a5c327600f2abfcef847be5a37e1f':raise SystemExit('Exact qualified browser receipt drift')
receipt=json.loads(old_data)
if len(sys.argv)!=2:raise SystemExit('Current qualified source/build/maps/physics proof handoff required')
data=pathlib.Path(sys.argv[1]).read_bytes()
if not os.environ.get('PROGRAM_BUILD_QUALIFICATION_SHA256') or sha(data)!=os.environ['PROGRAM_BUILD_QUALIFICATION_SHA256']:raise SystemExit('Independently approved current qualification digest mismatch')
qualification=json.loads(data)
if qualification['mode']!='timer-query' or qualification['methodFallback'] is not False:raise SystemExit('Exactly timer-query or explicit capability stop; no alternative backend/method')
if not qualification['physicsProofs'] or any(p['outcome']!='passed' for p in qualification['physicsProofs']):raise SystemExit('Qualified deliberate core-refactor proof lineage missing')
old=dict(receipt['sourceManifest']);new=dict(qualification['sourceManifest'])
renderer_prefixes=('src/view/','src/ui/','src/app/','public/')
if sorted((p,h) for p,h in old.items() if p.startswith(renderer_prefixes))!=sorted((p,h) for p,h in new.items() if p.startswith(renderer_prefixes)):raise SystemExit('Original qualified renderer/UI/app/assets graph changed')
for name in ['tests/e2e/visual-budget-probe.ts','src/ui/testids.ts']:
    if old.get(name)!=new.get(name):raise SystemExit('Original session-probe/testid source changed')
if sha(json.dumps(qualification['sourceManifest'],separators=(',',':')).encode())!=qualification['sourceManifestSha256']:raise SystemExit('New source tuple pin mismatch')
if not qualification['buildFiles'] or not isinstance(qualification['mapFiles'],list):raise SystemExit('Explicit CURRENT build and map inventory required')
for proof in qualification['physicsProofs']:
    if sha((repo/proof['path']).read_bytes())!=proof['sha256']:raise SystemExit('Actual approved physics proof receipt drift')
setup=pathlib.Path(tempfile.mkdtemp(prefix='starship-render-kernel.',dir='/tmp'));setup.chmod(0o700)
print('Prepared ownership only: '+str(setup),flush=True)
with (setup/'preparation-created.json').open('x') as f:json.dump({'setup':str(setup),'qualifiedBundle':str(bundle),'newBuildQualificationSha256':sha(data)},f)
try:
    for name,content in [('bundle-copy-manifest.json',(bundle/'bundle-copy-manifest.json').read_bytes()),('qualified-browser-receipt.json',old_data),('current-build-qualification.json',data)]:
        with (setup/name).open('xb') as f:f.write(content)
    wrapper=setup/'browser-wrapper.sh'
    owner="import pathlib,sys,json,os\npid=int(sys.argv[1]);s=pathlib.Path(f'/proc/{pid}/stat').read_text();fields=s[s.rfind(')')+2:].split()\nwith pathlib.Path('wrapper-owner.pending.json').open('x') as f:json.dump({'pid':pid,'starttime':fields[19],'ppid':int(fields[1]),'pgrp':int(fields[2])},f)\nos.link('wrapper-owner.pending.json','wrapper-owner.json');os.unlink('wrapper-owner.pending.json')\n"
    text='#!/usr/bin/env bash\nset -euo pipefail\ncd -- '+shlex.quote(str(setup))+"\npython3 - \"$$\" <<'PYOWNER'\n"+owner+"PYOWNER\nfor ((i=0;i<600;i++)); do\n [[ ! -e STOP ]] || exit 70\n if [[ -e GO ]]; then break; fi\n sleep 0.05\ndone\n[[ -e GO && ! -e STOP ]] || exit 70\ncd -- "+shlex.quote(receipt['browserOnlyCwd'])+'\nexec '+shlex.quote(receipt['actualBrowser'])+' "$@"\n'
    with wrapper.open('x') as f:f.write(text)
    wrapper.chmod(0o700)
    receipt.pop('sourceBridgeSha256',None)
    receipt.update({'purpose':'ONE display-witness class repair deterministic render-kernel32/1 fixture attribution or explicit capability stop','qualifiedBundle':str(bundle),'currentBuildQualificationSha256':sha(data),'sourceManifest':qualification['sourceManifest'],'sourceManifestSha256':qualification['sourceManifestSha256'],'buildFiles':qualification['buildFiles'],'mapFiles':qualification['mapFiles'],'physicsProofs':qualification['physicsProofs'],'additionalGithubFiles':qualification['githubFiles'],'method':'timer-query','methodFallback':False,'wrapper':str(wrapper),'wrapperSha256':sha(wrapper.read_bytes())})
    (setup/'compiled').mkdir(mode=0o700)
    with (setup/'setup-receipt.json').open('x') as f:json.dump(receipt,f,indent=2);f.write('\n')
except BaseException as error:
    with (setup/'preparation-failure.json').open('x') as f:json.dump({'error':str(error),'setup':str(setup)},f)
    raise
