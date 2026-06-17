#!/usr/bin/env python3
"""
Build data/places.json — the SINGLE canonical place registry for Harbi Reports.

Why this exists
---------------
Historically the site carried SIX independent town -> coordinate tables:
  1. src/python/categorize.py  SIREN_COORDS   (137 keys)
  2. src/js/maps/bayanat-map.js  opCoords      (76 keys)
  3. src/js/dashboards/bayanat-dash.js locNames (32 keys, names only)
  4. data/search-facets.json  .coords          (75 keys)
  5. data/borders.json  (149 keys, OSM polygons — 35 were double-encoded/mojibake)
  6. src/python/validate_data.py SIREN_COORDS  (65 keys)
They disagreed: 28 towns differed by >1km (المرج by 82km), several tables held
diacritic-variant DUPLICATE keys for the same town, and coverage ranged 32..149.
The same town therefore counted/placed differently per view — the data the user
could not trust.

This builder merges all sources into ONE registry keyed by the categorizer's
`norm_place` normalisation, so Python (categorize.py, validate_*.py) and JS
(maps, dashboards, search via place-registry.js) all resolve a name the SAME way.
Mojibake keys are auto-recovered on read (_demojibake).

Coordinate authority (highest first): manual OVERRIDES -> borders.json centroid
(validated OSM polygon, see reference_harbi_reports_maps) -> search-facets ->
opCoords -> SIREN_COORDS. `hasPolygon` records whether borders.json carries a real
polygon (vs a {"geojson": null} marker).

Usage:
  python3 src/python/build_places.py            # write data/places.json + report
  python3 src/python/build_places.py --report   # report only, do not write
"""

import json
import os
import re
import sys
import math

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BASE, 'src', 'python'))
import categorize as C  # safe: categorize.main() only runs under __main__

norm_place = C.norm_place

# ── Manual coordinate overrides for the cross-table conflicts ────────────────
# Keyed by norm_place(name). Fill in after reviewing the divergence report; each
# entry pins the authoritative (lat, lng) and wins over every table.
# (Populated in the conflict-resolution pass — see build_places report output.)
OVERRIDES = {}

# Names that are NOT real places (parser noise) — excluded from the registry so
# they never become phantom map points. Keyed by norm_place(name).
NOT_A_PLACE = set()


def _haversine_km(a, b):
    R = 6371.0
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    dla, dlo = la2 - la1, lo2 - lo1
    h = math.sin(dla / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlo / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _demojibake(s):
    """Recover a double-encoded (UTF-8-as-latin-1) key, e.g. a borders.json key
    that was written mojibake. No-op on already-clean text."""
    if not s or not any(128 <= ord(c) <= 255 for c in s):
        return s
    try:
        return s.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def _as_pair(v):
    if isinstance(v, dict):
        lat = v.get('lat')
        lng = v.get('lng', v.get('lon'))
        if lat is not None and lng is not None:
            return (float(lat), float(lng))
        return None
    if isinstance(v, (list, tuple)) and len(v) >= 2 and all(isinstance(t, (int, float)) for t in v[:2]):
        return (float(v[0]), float(v[1]))
    return None


def _border_centroid(entry):
    """Bbox-centre of a borders.json polygon, or None when geojson is null."""
    if not isinstance(entry, dict):
        return None
    g = entry.get('geojson')
    if not g:
        return None
    pts = []

    def walk(x):
        if isinstance(x, list):
            if len(x) == 2 and all(isinstance(t, (int, float)) for t in x):
                pts.append(x)
            else:
                for y in x:
                    walk(y)

    walk(g.get('coordinates') if isinstance(g, dict) else g)
    if not pts:
        return None
    lats = [p[1] for p in pts]
    lngs = [p[0] for p in pts]  # GeoJSON is [lng, lat]
    return ((min(lats) + max(lats)) / 2.0, (min(lngs) + max(lngs)) / 2.0)


def load_sources():
    """Return dict: source_name -> { surface_name: (lat,lng) | None }."""
    src = {}

    # 1) SIREN_COORDS (python dict of name -> (lat,lng))
    src['siren_coords'] = {k: (float(v[0]), float(v[1])) for k, v in C.SIREN_COORDS.items()}

    # 2) opCoords from bayanat-map.js
    js = open(os.path.join(BASE, 'src/js/maps/bayanat-map.js'), encoding='utf-8').read()
    m = re.search(r'var opCoords = \{(.*?)\};', js, re.S)
    op = {}
    if m:
        for k, la, lo in re.findall(r"'([^']+)':\[([\d.]+),([\d.]+)\]", m.group(1)):
            op[k] = (float(la), float(lo))
    src['op_coords'] = op

    # 3) locNames from bayanat-dash.js (names only — escaped \uXXXX)
    dashjs = open(os.path.join(BASE, 'src/js/dashboards/bayanat-dash.js'), encoding='utf-8').read()
    mm = re.search(r'var locNames = \[(.*?)\];', dashjs, re.S)
    names = []
    if mm:
        for raw in re.findall(r"'((?:\\u[0-9a-fA-F]{4}|[^'])+)'", mm.group(1)):
            names.append(bytes(raw, 'utf-8').decode('unicode_escape') if '\\u' in raw else raw)
    src['dash_locnames'] = {k: None for k in names}

    # 4) search-facets coords
    sf = json.load(open(os.path.join(BASE, 'data/search-facets.json'), encoding='utf-8'))
    src['facet_coords'] = {k: _as_pair(v) for k, v in sf.get('coords', {}).items()}

    # 5) borders.json
    bj = json.load(open(os.path.join(BASE, 'data/borders.json'), encoding='utf-8'))
    src['borders'] = {k: _border_centroid(v) for k, v in bj.items()} if isinstance(bj, dict) else {}
    src['_borders_haspoly'] = {k: bool(isinstance(v, dict) and v.get('geojson')) for k, v in bj.items()}

    # Defensive: recover any double-encoded keys so the registry can never inherit
    # mojibake (borders.json had 35 such keys; repaired, but stay robust to regress).
    for name in list(src.keys()):
        src[name] = {_demojibake(k): v for k, v in src[name].items()}

    return src


# Coordinate authority, highest priority first.
COORD_PRIORITY = ['borders', 'facet_coords', 'op_coords', 'siren_coords']


def build_registry(src):
    haspoly = src.get('_borders_haspoly', {})
    haspoly_norm = {}
    for k, v in haspoly.items():
        haspoly_norm[norm_place(k)] = haspoly_norm.get(norm_place(k), False) or v

    # union of normalized keys (skip the meta source)
    keys = set()
    for name, tbl in src.items():
        if name.startswith('_'):
            continue
        for k in tbl:
            keys.add(norm_place(k))
    keys -= {norm_place(x) for x in NOT_A_PLACE}

    registry = {}
    for nk in sorted(keys):
        aliases, display, coord, coord_src = set(), None, None, None
        # collect aliases + pick a display form (prefer borders surface form, else longest)
        for sname in ['borders', 'op_coords', 'facet_coords', 'siren_coords', 'dash_locnames']:
            tbl = src.get(sname, {})
            for surface in tbl:
                if norm_place(surface) == nk:
                    aliases.add(surface)
                    if display is None and sname == 'borders':
                        display = surface
        if display is None:
            display = max(aliases, key=len) if aliases else nk
        # resolve coordinate by priority
        if nk in OVERRIDES:
            coord, coord_src = OVERRIDES[nk], 'override'
        else:
            for sname in COORD_PRIORITY:
                tbl = src.get(sname, {})
                for surface, c in tbl.items():
                    if c and norm_place(surface) == nk:
                        coord, coord_src = c, sname
                        break
                if coord:
                    break
        # confidence: high if from a validated/agreeing source, low if the only
        # source is the error-prone hand-typed SIREN_COORDS or tables disagree >1.5km.
        all_coords = []
        for sname in COORD_PRIORITY:
            for surface, c in src.get(sname, {}).items():
                if c and norm_place(surface) == nk:
                    all_coords.append(c)
                    break
        spread = max((_haversine_km(all_coords[0], c) for c in all_coords[1:]), default=0.0)
        if coord is None:
            confidence = 'none'
        elif coord_src in ('override', 'borders') or (len(all_coords) >= 2 and spread <= 1.5):
            confidence = 'high'
        elif coord_src == 'siren_coords' or spread > 1.5:
            confidence = 'low'
        else:
            confidence = 'medium'
        registry[nk] = {
            'display': display,
            'lat': round(coord[0], 5) if coord else None,
            'lng': round(coord[1], 5) if coord else None,
            'coordSource': coord_src,
            'confidence': confidence,
            'hasPolygon': haspoly_norm.get(nk, False),
            'aliases': sorted(aliases),
        }
    return registry


def conflict_report(src):
    """Print cross-table coordinate conflicts (>1km) to guide OVERRIDES."""
    by_norm = {}
    for sname, tbl in src.items():
        if sname.startswith('_'):
            continue
        for surface, c in tbl.items():
            if c:
                by_norm.setdefault(norm_place(surface), {})[sname] = c
    rows = []
    for nk, pres in by_norm.items():
        if len(pres) < 2:
            continue
        ts = list(pres)
        worst, pair = 0.0, None
        for i in range(len(ts)):
            for j in range(i + 1, len(ts)):
                d = _haversine_km(pres[ts[i]], pres[ts[j]])
                if d > worst:
                    worst, pair = d, (ts[i], ts[j])
        if worst > 1.0:
            rows.append((worst, nk, pair, pres))
    rows.sort(reverse=True)
    print(f"\n=== {len(rows)} towns with >1km cross-table coordinate disagreement ===")
    for worst, nk, pair, pres in rows:
        coords = ' | '.join(f"{s}={c[0]:.4f},{c[1]:.4f}" for s, c in pres.items())
        print(f"  {worst:6.1f}km  {nk:20s}  {coords}")
    return rows


def main():
    src = load_sources()
    print("=== source table sizes ===")
    for name, tbl in src.items():
        if not name.startswith('_'):
            print(f"  {name:16s}: {len(tbl)} keys")
    conflict_report(src)
    registry = build_registry(src)
    with_coords = sum(1 for v in registry.values() if v['lat'] is not None)
    print(f"\n=== registry: {len(registry)} canonical places, {with_coords} with coordinates, "
          f"{len(registry) - with_coords} missing coords ===")
    if '--report' not in sys.argv:
        out = os.path.join(BASE, 'data', 'places.json')
        with open(out, 'w', encoding='utf-8') as f:
            json.dump({'version': 1, 'normalizer': 'norm_ar', 'places': registry},
                      f, ensure_ascii=False, indent=2)
        print(f"wrote {out}")


if __name__ == '__main__':
    main()
