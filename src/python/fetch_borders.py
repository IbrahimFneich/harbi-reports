#!/usr/bin/env python3
"""
fetch_borders.py — pre-bake admin boundary polygons for every named location
that appears on the siren and bayanat maps.

Harvests place names from:
  - SIREN_COORDS in src/python/categorize.py
  - opCoords in   src/js/maps/bayanat-map.js
  - sirenPoints[] in every data/*.json

For each unique (name, lat, lng) it queries Nominatim (1 req/sec) and keeps
any result whose polygon centroid is within DISTANCE_TOLERANCE_KM of the
expected coordinates. Missing polygons are left out — the runtime renderer
falls back to a deterministic synthetic polygon in that case.

Output: data/borders.json  →  { "<arabic_name>": { "geojson": {...} } }

Usage:
    python3 src/python/fetch_borders.py          # fetch only missing entries
    python3 src/python/fetch_borders.py --force  # re-fetch everything
    python3 src/python/fetch_borders.py --limit 5  # sanity check a few
"""
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, 'data')
OUT_FILE = os.path.join(DATA_DIR, 'borders.json')
CATEGORIZE = os.path.join(ROOT, 'src', 'python', 'categorize.py')
BAYANAT_JS = os.path.join(ROOT, 'src', 'js', 'maps', 'bayanat-map.js')

NOMINATIM = 'https://nominatim.openstreetmap.org/search'
USER_AGENT = 'harbi-reports-borders-prebake/1.0 (contact: ibrahim@areeba.com)'
DISTANCE_TOLERANCE_KM = 20.0  # drop hits that are clearly wrong places


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def polygon_centroid(geojson):
    """Bounds centroid — cheap and good enough for distance validation."""
    coords = []
    t = geojson.get('type')
    if t == 'Polygon':
        for ring in geojson.get('coordinates', []):
            coords.extend(ring)
    elif t == 'MultiPolygon':
        for poly in geojson.get('coordinates', []):
            for ring in poly:
                coords.extend(ring)
    if not coords:
        return None
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return (sum(lats) / len(lats), sum(lons) / len(lons))


def parse_siren_coords():
    """Parse SIREN_COORDS dict literal from categorize.py."""
    with open(CATEGORIZE, 'r', encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'SIREN_COORDS\s*=\s*\{(.*?)\n\}', src, re.DOTALL)
    if not m:
        return {}
    body = m.group(1)
    out = {}
    for line in body.split('\n'):
        m2 = re.match(r"\s*'([^']+)'\s*:\s*\(([\d.\-]+)\s*,\s*([\d.\-]+)\)", line)
        if m2:
            out[m2.group(1)] = (float(m2.group(2)), float(m2.group(3)))
    return out


def parse_op_coords():
    """Parse the opCoords object literal from bayanat-map.js.

    The dict uses a mix of raw Arabic strings and \\uXXXX escape sequences. We
    rebuild the literal section and let json.loads do the unescaping after
    converting the JS object into valid JSON.
    """
    with open(BAYANAT_JS, 'r', encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'var opCoords\s*=\s*\{(.*?)\n\s*\};', src, re.DOTALL)
    if not m:
        return {}
    body = m.group(1)
    out = {}
    # Match 'name':[lat,lng] with possible Unicode escapes in the name.
    pattern = re.compile(r"'((?:[^'\\]|\\.)*)'\s*:\s*\[\s*([\d.\-]+)\s*,\s*([\d.\-]+)\s*\]")
    for match in pattern.finditer(body):
        raw_name = match.group(1)
        # Let Python decode \uXXXX escapes.
        try:
            name = raw_name.encode('utf-8').decode('unicode_escape')
        except Exception:
            name = raw_name
        out[name] = (float(match.group(2)), float(match.group(3)))
    return out


def harvest_from_data_files():
    """Scan all data/*.json for sirenPoints so we pick up anything dynamically
    geocoded at categorize time (not just the hand-coded dict)."""
    out = {}
    for fname in sorted(os.listdir(DATA_DIR)):
        if not fname.endswith('.json') or fname == 'borders.json':
            continue
        path = os.path.join(DATA_DIR, fname)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                doc = json.load(f)
        except Exception:
            continue
        if not isinstance(doc, dict):
            continue
        for pt in doc.get('sirenPoints', []) or []:
            loc = pt.get('loc')
            lat = pt.get('lat')
            lng = pt.get('lng')
            if loc and lat is not None and lng is not None:
                out.setdefault(loc, (lat, lng))
    return out


def unified_places():
    """Union of all three sources, first-seen coord wins."""
    places = {}
    for src_dict in (parse_siren_coords(), parse_op_coords(), harvest_from_data_files()):
        for name, (lat, lng) in src_dict.items():
            if name not in places:
                places[name] = (lat, lng)
    return places


def fetch_polygon(name, expected_lat, expected_lng):
    """Query Nominatim and return a Polygon/MultiPolygon GeoJSON if any
    candidate has real polygon geometry AND its centroid is within tolerance
    of the expected coords. None otherwise."""
    params = {
        'format': 'json',
        'polygon_geojson': '1',
        'limit': '5',
        'accept-language': 'ar,en',
        'countrycodes': 'il,lb,sy,ps',
        'q': name,
    }
    url = NOMINATIM + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            arr = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  ! network error: {e}')
        return None
    if not arr:
        return None
    best = None
    best_dist = math.inf
    for hit in arr:
        gj = hit.get('geojson') or {}
        if gj.get('type') not in ('Polygon', 'MultiPolygon'):
            continue
        centroid = polygon_centroid(gj)
        if not centroid:
            continue
        d = haversine_km(expected_lat, expected_lng, centroid[0], centroid[1])
        if d < best_dist and d <= DISTANCE_TOLERANCE_KM:
            best = gj
            best_dist = d
    if best:
        print(f'  ✓ polygon ({best_dist:.1f} km from expected)')
    return best


def main():
    force = '--force' in sys.argv
    limit = None
    if '--limit' in sys.argv:
        try:
            limit = int(sys.argv[sys.argv.index('--limit') + 1])
        except (ValueError, IndexError):
            pass

    places = unified_places()
    print(f'[borders] {len(places)} unique place names harvested')

    existing = {}
    if os.path.exists(OUT_FILE) and not force:
        with open(OUT_FILE, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        print(f'[borders] {len(existing)} already cached in borders.json')

    to_fetch = [(n, c) for n, c in places.items() if n not in existing]
    if limit:
        to_fetch = to_fetch[:limit]
    print(f'[borders] fetching {len(to_fetch)} new entries...')

    out = dict(existing)
    fetched = 0
    hit_count = 0
    miss_count = 0
    for name, (lat, lng) in to_fetch:
        fetched += 1
        print(f'[{fetched}/{len(to_fetch)}] {name} ({lat:.3f}, {lng:.3f})')
        gj = fetch_polygon(name, lat, lng)
        if gj:
            out[name] = {'geojson': gj}
            hit_count += 1
        else:
            out[name] = {'geojson': None}  # mark as tried-and-failed so we don't retry
            miss_count += 1
        # Write after every hit so a crash doesn't lose progress.
        with open(OUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        time.sleep(1.1)  # respect Nominatim rate limit

    print(f'\n[borders] done. polygons: {hit_count}, misses: {miss_count}')
    print(f'[borders] file: {OUT_FILE}')


if __name__ == '__main__':
    main()
