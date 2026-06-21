#!/usr/bin/env python3
"""In-place re-resolution of registry-derived fields ONLY (targets[], is_recap,
siren locations[], sirenPoints) across every data/*.json, using the categorizer's
own functions — so STORED-1/STORED-2 pass and NOTHING else (counts, text, types,
spillover state) changes. This is the safe backfill: it does not re-parse raw."""
import sys, glob, json, os
sys.path.insert(0, '/Users/ibrahimfneich/Desktop/telegram-reports/src/python')
import place_registry as PR
import categorize as C
PR._by_norm = None
PR.load_places()

DATA = '/Users/ibrahimfneich/Desktop/telegram-reports/data'
changed_files = 0
changed_bayan = 0
for f in sorted(glob.glob(os.path.join(DATA, '2[0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json'))):
    d = json.load(open(f, encoding='utf-8'))
    dirty = False
    for b in d.get('bayanat', []):
        rec = C.parse_bayan({'text': b.get('fullText', ''), 'time': b.get('postTime', '')})
        if b.get('targets') != rec.get('targets') or b.get('is_recap') != rec.get('is_recap'):
            b['targets'] = rec.get('targets')
            b['is_recap'] = rec.get('is_recap')
            dirty = True
            changed_bayan += 1
    for s in d.get('sirens', []):
        loc = C._resolve_town_names(s.get('location', ''))
        if s.get('locations') != loc:
            s['locations'] = loc
            dirty = True
    newpts = C.compute_siren_points(d.get('sirens', []))
    if d.get('sirenPoints') != newpts:
        d['sirenPoints'] = newpts
        dirty = True
    if dirty:
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed_files += 1

print(f"re-resolved: {changed_files} files touched, {changed_bayan} bayan targets updated")
