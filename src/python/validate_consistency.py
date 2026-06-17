#!/usr/bin/env python3
"""
Cross-VIEW consistency harness for Harbi Reports.

validate_data.py checks each day file against ITSELF (stats == len(array), date
matches filename, etc.) — it passes on all 983 days yet the site still showed
contradictory numbers, because the contradictions live BETWEEN views (data file
vs reports-meta.js vs harbi.db vs the JS dashboards), not inside one file.

This harness encodes the cross-view invariants. Every invariant returns a list of
(date, detail) violations; `main` prints a per-invariant tally and exits non-zero
if any HARD invariant fails — so it can gate a release.

Run:
  python3 src/python/validate_consistency.py            # full report
  python3 src/python/validate_consistency.py --quiet    # tally only, exit code
"""
import json, os, re, sys, glob, sqlite3

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(BASE, 'data')

# The 6 EVENT categories that make up a day's grand total. 'summaries' is the
# day's editorial summary count, NOT an event category, and is excluded.
EVENT_CATS = ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies']


def load_day_files():
    out = {}
    for f in sorted(glob.glob(os.path.join(DATA, '2[0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json'))):
        date = os.path.basename(f)[:-5]
        out[date] = json.load(open(f, encoding='utf-8'))
    return out


def day_event_total(d):
    return sum(len(d.get(c, [])) for c in EVENT_CATS)


def load_report_stats():
    """Parse `var reportStats = { 'YYYY-MM-DD': {k:v, ...}, ... }` from reports-meta.js."""
    path = os.path.join(DATA, 'reports-meta.js')
    if not os.path.exists(path):
        return None
    txt = open(path, encoding='utf-8').read()
    m = re.search(r'var reportStats\s*=\s*\{(.*?)\n\};', txt, re.S)
    if not m:
        return {}
    stats = {}
    for date, body in re.findall(r"'(\d{4}-\d{2}-\d{2})':\s*\{([^}]*)\}", m.group(1)):
        kv = {}
        for k, v in re.findall(r'(\w+)\s*:\s*(-?\d+)', body):
            kv[k] = int(v)
        stats[date] = kv
    return stats


def load_db_reports():
    path = os.path.join(DATA, 'harbi.db')
    if not os.path.exists(path):
        return None
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    try:
        rows = {r['date']: dict(r) for r in con.execute(
            'SELECT date, bayanat, sirens, enemy, iran, videos, allies, total FROM reports')}
    except sqlite3.OperationalError:
        rows = None
    con.close()
    return rows


# ── Invariants ───────────────────────────────────────────────────────────────

def inv_reportstats_total(days, rstats, dbrep):
    """reports-meta.js total must equal the 6-event-category sum of the day file."""
    bad = []
    if rstats is None:
        return [('-', 'reports-meta.js missing')]
    for date, d in days.items():
        want = day_event_total(d)
        rs = rstats.get(date)
        if rs is None:
            bad.append((date, 'absent from reportStats')); continue
        if rs.get('total') != want:
            bad.append((date, f"reportStats.total={rs.get('total')} but data sum(6 cats)={want}"))
    return bad


def inv_reportstats_has_allies(days, rstats, dbrep):
    """reportStats entries must carry an allies key (else archive math drops allies)."""
    bad = []
    if rstats is None:
        return [('-', 'reports-meta.js missing')]
    for date, rs in rstats.items():
        if 'allies' not in rs:
            bad.append((date, "reportStats entry has no 'allies' key"))
    return bad


def inv_db_total(days, rstats, dbrep):
    """harbi.db reports.total must equal the same 6-event-category sum."""
    bad = []
    if dbrep is None:
        return [('-', 'harbi.db missing or no reports table')]
    for date, d in days.items():
        want = day_event_total(d)
        row = dbrep.get(date)
        if row is None:
            bad.append((date, 'absent from harbi.db reports')); continue
        if row.get('total') != want:
            bad.append((date, f"db.total={row.get('total')} but data sum(6 cats)={want}"))
    return bad


def inv_db_index_agree(days, rstats, dbrep):
    """harbi.db total and reports-meta.js total must agree per day."""
    bad = []
    if dbrep is None or rstats is None:
        return []
    for date in days:
        rt = (rstats.get(date) or {}).get('total')
        dt = (dbrep.get(date) or {}).get('total')
        if rt is not None and dt is not None and rt != dt:
            bad.append((date, f"reportStats.total={rt} != db.total={dt}"))
    return bad


def _is_mojibake(s):
    return any(128 <= ord(c) <= 255 for c in (s or ''))


def inv_places_no_mojibake(days, rstats, dbrep):
    """The canonical registry must contain no double-encoded (mojibake) names."""
    path = os.path.join(DATA, 'places.json')
    if not os.path.exists(path):
        return [('-', 'data/places.json missing')]
    reg = json.load(open(path, encoding='utf-8')).get('places', {})
    bad = []
    for k, v in reg.items():
        blob = k + (v.get('display') or '') + ''.join(v.get('aliases', []))
        if _is_mojibake(blob):
            bad.append((k, 'mojibake in registry entry'))
    return bad


def inv_normalizer_cross_language(days, rstats, dbrep):
    """JS normalizePlace (src/js/util/normalize-ar.js) must equal Python norm_place
    on every registry name + corpus target/siren location — so browser and pipeline
    can never resolve a town differently. Skipped (soft note) if node is absent."""
    import shutil, subprocess, tempfile
    if not shutil.which('node'):
        return []  # cannot check without node; treated as non-failing
    import categorize as C
    reg = json.load(open(os.path.join(DATA, 'places.json'), encoding='utf-8')).get('places', {})
    inputs = set()
    for v in reg.values():
        inputs.add(v['display']); inputs.update(v.get('aliases', []))
    for d in days.values():
        for b in d.get('bayanat', []):
            if b.get('target'):
                inputs.add(b['target'])
        for s in d.get('sirens', []):
            if s.get('location'):
                inputs.add(s['location'])
    inputs = sorted(x for x in inputs if x)
    recs = [{'in': [ord(c) for c in x], 'py': [ord(c) for c in C.norm_place(x)]} for x in inputs]
    with tempfile.TemporaryDirectory() as td:
        json.dump(recs, open(os.path.join(td, 'cp.json'), 'w'))
        shutil.copy(os.path.join(BASE, 'src/js/util/normalize-ar.js'), os.path.join(td, 'norm.mjs'))
        runner = (
            "import { normalizePlace } from './norm.mjs';\n"
            "import { readFileSync } from 'fs';\n"
            "const recs = JSON.parse(readFileSync('cp.json','utf8'));\n"
            "let m = 0;\n"
            "for (const r of recs) {\n"
            "  const s = String.fromCodePoint(...r.in);\n"
            "  const js = [...normalizePlace(s)].map(c => c.codePointAt(0));\n"
            "  if (JSON.stringify(js) !== JSON.stringify(r.py)) m++;\n"
            "}\n"
            "console.log(m);\n"
        )
        open(os.path.join(td, 'run.mjs'), 'w').write(runner)
        out = subprocess.run(['node', 'run.mjs'], cwd=td, capture_output=True, text=True)
        try:
            mism = int((out.stdout or '0').strip().splitlines()[-1])
        except (ValueError, IndexError):
            return [('-', 'node check failed: ' + (out.stderr or '')[:120])]
    return [('-', f'{mism} of {len(inputs)} names normalize differently in JS vs Python')] if mism else []


def inv_find_cross_language(days, rstats, dbrep):
    """JS findPlacesInText must equal Python find_places_in_text on corpus targets
    + a sample of fullTexts — so the map (JS) and the regenerated data (Python)
    count the same towns. Skipped (non-failing) if node is absent."""
    import shutil, subprocess, tempfile
    if not shutil.which('node'):
        return []
    import place_registry as PR
    PR.load_places()
    texts = set()
    for i, d in enumerate(days.values()):
        for b in d.get('bayanat', []):
            if b.get('target'):
                texts.add(b['target'])
            if i % 10 == 0 and b.get('fullText'):
                texts.add(b['fullText'])
    texts = sorted(texts)
    recs = [{'in': [ord(c) for c in t], 'py': PR.find_places_in_text(t)} for t in texts]
    with tempfile.TemporaryDirectory() as td:
        os.makedirs(os.path.join(td, 'maps')); os.makedirs(os.path.join(td, 'util'))
        shutil.copy(os.path.join(BASE, 'src/js/util/normalize-ar.js'),
                    os.path.join(td, 'util', 'normalize-ar.mjs'))
        pr = open(os.path.join(BASE, 'src/js/maps/place-registry.js'), encoding='utf-8').read()
        pr = pr.replace('../util/normalize-ar.js', '../util/normalize-ar.mjs')
        open(os.path.join(td, 'maps', 'place-registry.mjs'), 'w', encoding='utf-8').write(pr)
        json.dump(recs, open(os.path.join(td, 'find.json'), 'w'))
        runner = (
            "import { findPlacesInText, __setRegistryForTest } from './place-registry.mjs';\n"
            "import { readFileSync } from 'fs';\n"
            f"const places = JSON.parse(readFileSync({json.dumps(os.path.join(DATA,'places.json'))},'utf8')).places;\n"
            "__setRegistryForTest(places);\n"
            "const recs = JSON.parse(readFileSync('../find.json','utf8'));\n"
            "let m = 0;\n"
            "for (const r of recs) {\n"
            "  const js = findPlacesInText(String.fromCodePoint(...r.in));\n"
            "  if (JSON.stringify(js) !== JSON.stringify(r.py)) m++;\n"
            "}\n"
            "console.log(m);\n"
        )
        open(os.path.join(td, 'maps', 'run.mjs'), 'w').write(runner)
        out = subprocess.run(['node', 'run.mjs'], cwd=os.path.join(td, 'maps'),
                             capture_output=True, text=True)
        try:
            mism = int((out.stdout or '0').strip().splitlines()[-1])
        except (ValueError, IndexError):
            return [('-', 'node find-check failed: ' + (out.stderr or '')[:120])]
    return [('-', f'{mism} of {len(texts)} texts resolve to different towns in JS vs Python')] if mism else []


def inv_stored_targets(days, rstats, dbrep):
    """Every STORED bayan must carry targets:list + is_recap:bool matching what the
    categorizer produces for it END-TO-END (re-running parse_bayan — so communiqués
    that deliberately store [] are respected, not just the _extract_targets path).
    RED before regen (fields absent) — proves the regen populated the model right."""
    import categorize as C
    bad = []
    for date, d in days.items():
        for b in d.get('bayanat', []):
            if not isinstance(b.get('targets'), list) or not isinstance(b.get('is_recap'), bool):
                bad.append((date, f"num={b.get('num')} missing targets[]/is_recap"))
                continue
            rec = C.parse_bayan({'text': b.get('fullText', ''), 'time': b.get('postTime', '')})
            if b['targets'] != rec.get('targets'):
                bad.append((date, f"num={b.get('num')} targets {b['targets']} != {rec.get('targets')}"))
            elif b['is_recap'] != rec.get('is_recap'):
                bad.append((date, f"num={b.get('num')} is_recap {b['is_recap']} != {rec.get('is_recap')}"))
    return bad


def inv_stored_sirenpoints(days, rstats, dbrep):
    """Every sirenPoints[].loc must resolve in the registry to the same coord, and
    every siren must carry locations:list. RED before regen (old coords/no field)."""
    import place_registry as PR
    from categorize import norm_place
    reg = PR.load_places()
    bad = []
    for date, d in days.items():
        for s in d.get('sirens', []):
            if not isinstance(s.get('locations'), list):
                bad.append((date, 'siren missing locations[]')); break
        for p in d.get('sirenPoints', []):
            e = reg.get(norm_place(p.get('loc', '')))
            if not e or e.get('lat') is None:
                bad.append((date, f"sirenPoint loc {p.get('loc')!r} not in registry"))
            elif abs(e['lat'] - p.get('lat', 0)) > 0.01 or abs(e['lng'] - p.get('lng', 0)) > 0.01:
                bad.append((date, f"sirenPoint {p.get('loc')!r} coord != registry"))
    return bad


def inv_stats_match_arrays(days, rstats, dbrep):
    """stats.<cat> must equal len(<cat>) for every event category, every day."""
    bad = []
    for date, d in days.items():
        st = d.get('stats', {})
        for c in EVENT_CATS:
            if c in st and st[c] != len(d.get(c, [])):
                bad.append((date, f"stats.{c}={st[c]} != len={len(d.get(c, []))}"))
    return bad


def inv_bayan_targets_integrity(days, rstats, dbrep):
    """harbi.db bayan_targets row count per day == sum of len(targets[]) over that
    day's bayanat — guards the table that powers analytics 'Top locations'."""
    import sqlite3
    path = os.path.join(DATA, 'harbi.db')
    if not os.path.exists(path):
        return [('-', 'harbi.db missing')]
    con = sqlite3.connect(path)
    try:
        bt = {r[0]: r[1] for r in con.execute('SELECT date, COUNT(*) FROM bayan_targets GROUP BY date')}
    except sqlite3.OperationalError:
        con.close()
        return [('-', 'bayan_targets table missing')]
    con.close()
    bad = []
    for date, d in days.items():
        want = sum(len(b.get('targets', [])) for b in d.get('bayanat', []))
        if bt.get(date, 0) != want:
            bad.append((date, f"bayan_targets rows={bt.get(date, 0)} != sum len(targets[])={want}"))
    return bad


def inv_target_coverage(days, rstats, dbrep):
    """SOFT: how many bayanat targets / siren locations resolve to a registry place.
    Informational baseline — coverage gaps are a registry-expansion task, not a gate."""
    import place_registry as PR
    PR.load_places()
    bt = bres = st = sres = 0
    for d in days.values():
        for b in d.get('bayanat', []):
            if b.get('target'):
                bt += 1; bres += 1 if PR.find_places_in_text(b['target']) else 0
        for s in d.get('sirens', []):
            if s.get('location'):
                st += 1; sres += 1 if PR.find_places_in_text(s['location']) else 0
    note = (f'bayanat targets resolved {bres}/{bt} ({100*bres//max(bt,1)}%); '
            f'siren locations resolved {sres}/{st} ({100*sres//max(st,1)}%)')
    return [('-', note)]  # always "reports" so the tally line shows the numbers


# HARD invariants gate the release; SOFT are informational.
INVARIANTS = [
    ('TOTAL-1 reportStats.total == data 6-cat sum', inv_reportstats_total, 'HARD'),
    ('TOTAL-2 reportStats has allies key', inv_reportstats_has_allies, 'HARD'),
    ('TOTAL-3 db.total == data 6-cat sum', inv_db_total, 'HARD'),
    ('TOTAL-4 db.total == reportStats.total', inv_db_index_agree, 'HARD'),
    ('PLACES-1 registry has no mojibake names', inv_places_no_mojibake, 'HARD'),
    ('NORM-1 JS normalizePlace == Python norm_place', inv_normalizer_cross_language, 'HARD'),
    ('FIND-1 JS findPlacesInText == Python find_places_in_text', inv_find_cross_language, 'HARD'),
    ('STORED-1 bayan targets[]/is_recap present & match categorizer', inv_stored_targets, 'HARD'),
    ('STORED-2 sirenPoints resolve in registry & sirens have locations[]', inv_stored_sirenpoints, 'HARD'),
    ('STORED-3 stats.<cat> == len(<cat>)', inv_stats_match_arrays, 'HARD'),
    ('STORED-4 bayan_targets rows == sum len(targets[])', inv_bayan_targets_integrity, 'HARD'),
    ('COVERAGE target/siren registry resolution', inv_target_coverage, 'SOFT'),
]


def main():
    quiet = '--quiet' in sys.argv
    days = load_day_files()
    rstats = load_report_stats()
    dbrep = load_db_reports()
    print(f"loaded {len(days)} day files; reportStats={'yes' if rstats else 'NO'} "
          f"({len(rstats) if rstats else 0}); harbi.db={'yes' if dbrep else 'NO'}")
    import shutil
    if not shutil.which('node'):
        print("!! WARNING: `node` not found — NORM-1 / FIND-1 (JS == Python normalizer + town\n"
              "!! matching) are SKIPPED, NOT verified. Install node before trusting a release gate.")
    print()
    hard_fail = 0
    for name, fn, kind in INVARIANTS:
        viol = fn(days, rstats, dbrep)
        tag = 'OK ' if not viol else ('FAIL' if kind == 'HARD' else 'warn')
        print(f"[{tag}] {name}: {len(viol)} violation(s)")
        if viol and not quiet:
            for date, detail in viol[:6]:
                print(f"        {date}: {detail}")
            if len(viol) > 6:
                print(f"        … +{len(viol) - 6} more")
        if viol and kind == 'HARD':
            hard_fail += 1
    print(f"\n{'PASS' if hard_fail == 0 else 'FAIL'} — {hard_fail} hard invariant(s) failing")
    sys.exit(1 if hard_fail else 0)


if __name__ == '__main__':
    main()
