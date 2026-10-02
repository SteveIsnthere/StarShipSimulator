"""Audit immutable Linux artifacts against parked and shipped histories; never generate."""
import hashlib
import json
from pathlib import Path
import subprocess

artifact=Path('/tmp/starship-fallback-linux-37035784562')
out=Path(__file__).with_suffix('.json')
def samples(d):return [dict(d['constant'],**dict(zip(d['keys'],r))) for r in d['rows']]
def digest(raw):return hashlib.sha256(raw[raw.index(b'\n "rows": [\n'):]).hexdigest()
report=[]
for p in sorted(artifact.glob('*.json')):
 raw=p.read_bytes();new=json.loads(raw);after=samples(new);comparisons={}
 for rev in ['080f1088ec07863751ffd8b2fa8bf8106d4b22af','c24235f158b17fec15c38a9804d411bb3309d76f']:
  oldraw=subprocess.check_output(['git','show',rev+':tests/golden/fixtures/'+p.name]);old=json.loads(oldraw);before=samples(old)
  for k in ['scenario','dt','sampleEvery','seed','setup']:assert old[k]==new[k],(p.name,k)
  assert old['steps']==new['steps'] or (new['scenario']=='reentry-autoland' and old['steps']==21600 and new['steps']==72000)
  added=sorted(set(after[0])-set(before[0]));removed=sorted(set(before[0])-set(after[0]));assert not added
  assert removed==([] if rev.startswith('080') else ['autopilot.entryRangeCountdown','autopilot.entryRangeTrim'])
  changes={}
  for i,(a,b) in enumerate(zip(after,before)):
   for key in set(a)&set(b):
    if a[key]==b[key]:continue
    c=changes.setdefault(key,{'firstSample':i,'changedSamples':0,'maxAbsDelta':0});c['changedSamples']+=1
    if type(a[key]) in (float,int) and type(b[key]) in (float,int):c['maxAbsDelta']=max(c['maxAbsDelta'],abs(a[key]-b[key]))
  comparisons[rev]={'beforeDigest':digest(oldraw),'beforeRows':len(before),'addedKeys':added,'removedKeys':removed,'changedFields':changes}
 endkeys=['kinematics.altitude','kinematics.speedX','kinematics.speedY','vehicle.propellantMass','status.landed','failures.crashed','failures.inFlightBreakUp','world.timeSpent']
 landing=next((s['world.timeSpent'] for s in after if s['status.landed']),None)
 report.append({'id':new['scenario'],'rows':len(after),'afterDigest':digest(raw),'comparisons':comparisons,'end':{k:after[-1][k] for k in endkeys},'landingTimeReading':landing})
 print(new['scenario'],len(comparisons[next(iter(comparisons))]['changedFields']),'fields versus shipped; end',report[-1]['end'])
assert len(report)==8
out.write_text(json.dumps({'platform':'Linux x64 / Node22','run':37035784562,'snapshot':'845c41d9d36d04fae5db4131e0cce230646eb0a0','fixtures':report},indent=2)+'\n')
