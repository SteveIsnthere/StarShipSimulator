"""Audit a downloaded Linux recording extension; never generates fixtures.

Usage: python3 golden-window-audit.py INITIAL_DIR FINAL_DIR OUTPUT_JSON SNAPSHOT RUN
The initial artifact is run36985191265, snapshot764d191. Its full physics
before/after audit remains range-cycle2-golden-audit.json; this audit isolates
Steve's approved recording-window extension from that unchanged model.
"""
import hashlib
import json
from pathlib import Path
import sys

initial, final, destination = map(Path, sys.argv[1:4])
snapshot, run = sys.argv[4:6]
expected = sorted(p.name for p in Path('tests/golden/fixtures').glob('*.json'))
assert sorted(p.name for p in initial.glob('*.json')) == expected
assert sorted(p.name for p in final.glob('*.json')) == expected

def samples(data):
    return [dict(data['constant'], **dict(zip(data['keys'], row))) for row in data['rows']]

def rows_digest(raw):
    return hashlib.sha256(raw[raw.index(b'\n "rows": [\n'):]).hexdigest()

report = []
for name in expected:
    old_raw, new_raw = (initial / name).read_bytes(), (final / name).read_bytes()
    old, new = json.loads(old_raw), json.loads(new_raw)
    before, after = samples(old), samples(new)
    item = {'file': name, 'initialRowsDigest': rows_digest(old_raw),
            'finalRowsDigest': rows_digest(new_raw), 'rows': len(after)}
    if name != 'reentry-autoland.json':
        assert old_raw == new_raw, name
        item['byteIdentical'] = True
    else:
        assert old['steps'] == 21600 and new['steps'] == 72000
        # Compression may move fields between constant and per-row keys, but
        # every flattened field and every other recording property is fixed.
        metadata = set(old) - {'steps', 'constant', 'keys', 'rows'}
        assert metadata == set(new) - {'steps', 'constant', 'keys', 'rows'}
        for key in metadata:
            assert old[key] == new[key], key
        assert len(before) == 361 and len(after) == 1201
        assert set(before[0]) == set(after[0])
        assert before == after[:361], 'original180s prefix moved'
        tail = after[361:]
        assert len(tail) == 840
        assert all(s['failures.inFlightBreakUp'] is False for s in after)
        assert all(s['failures.crashed'] is False for s in after)
        end_keys = ['kinematics.altitude', 'kinematics.speedX', 'kinematics.speedY',
                    'vehicle.propellantMass', 'status.landed',
                    'failures.crashed', 'failures.inFlightBreakUp']
        item.update({'originalPrefixExactlyEqual': True, 'prefixSamples': 361,
                     'newTailSamples': 840,
                     'tailFieldRanges': {k: {'min': min(s[k] for s in tail),
                                             'max': max(s[k] for s in tail)}
                                         for k in sorted(tail[0])
                                         if type(tail[0][k]) in (int, float)},
                     'endInitial': {k: before[-1][k] for k in end_keys},
                     'endFinal': {k: after[-1][k] for k in end_keys}})
    report.append(item)
    print(name, 'exact180s prefix +840 new samples' if name == 'reentry-autoland.json' else 'byte-identical')
destination.write_text(json.dumps({'approval': 'Steve, yep approved,2026-10-02; only reentry180->600s',
                                  'platform': 'x86-64 Linux / Node22',
                                  'initialRun': '36985191265',
                                  'initialSnapshot': '764d19145edb06553500d256bb425d6c0f1669f3',
                                  'finalRun': run, 'finalSnapshot': snapshot,
                                  'fixtures': report}, indent=2) + '\n')
