#!/usr/bin/env python3
"""Rate-limited Nominatim geocoder for registry expansion.

Reads town names (one per line, from a file or stdin), queries OSM Nominatim,
and picks the best result: prefer place-type nodes (village/town/hamlet/...) over
roads/boundaries, require the hit to fall inside a plausible bbox, and emit a
review table (name | lat | lng | osm_type | addresstype | confidence | display).

Confidence:
  high   — addresstype is a settlement type AND inside bbox
  medium — inside bbox but addresstype is road/boundary/other
  low    — outside bbox (kept for manual review; DO NOT auto-add)
  none   — no result

Usage: python3 geocode_towns.py names.txt [--bbox latmin latmax lngmin lngmax] > candidates.tsv
Default bbox is the Levant (Lebanon/Israel/Syria/Iraq border belt).
"""
import sys, json, time, urllib.parse, urllib.request

SETTLEMENT = {'village', 'town', 'hamlet', 'city', 'suburb', 'locality',
              'neighbourhood', 'municipality', 'isolated_dwelling', 'quarter',
              'administrative'}  # administrative kept as medium fallback

UA = "harbi-reports-geocoder/1.0 (personal research; contact fneichibrahim@gmail.com)"


def query(name, retries=2):
    for attempt in range(retries + 1):
        try:
            qs = urllib.parse.urlencode({'q': f'{name}, لبنان', 'format': 'json',
                                         'limit': 5, 'addressdetails': 1})
            req = urllib.request.Request(
                f'https://nominatim.openstreetmap.org/search?{qs}',
                headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.load(r)
        except Exception as e:
            if attempt < retries:
                time.sleep(2)
            else:
                return []
    return []


def pick(results, bbox):
    latmin, latmax, lngmin, lngmax = bbox

    def inb(la, lo):
        return latmin <= la <= latmax and lngmin <= lo <= lngmax
    # 1) settlement-type inside bbox
    for r in results:
        la, lo = float(r['lat']), float(r['lon'])
        if r.get('addresstype') in SETTLEMENT and r.get('addresstype') != 'administrative' and inb(la, lo):
            return r, 'high'
    # 2) any inside bbox
    for r in results:
        la, lo = float(r['lat']), float(r['lon'])
        if inb(la, lo):
            conf = 'high' if r.get('addresstype') in SETTLEMENT else 'medium'
            return r, conf
    # 3) first result, outside bbox
    if results:
        return results[0], 'low'
    return None, 'none'


def main():
    args = sys.argv[1:]
    bbox = (29.0, 37.5, 34.0, 49.0)  # Levant default
    if '--bbox' in args:
        i = args.index('--bbox')
        bbox = tuple(float(x) for x in args[i + 1:i + 5])
        args = args[:i] + args[i + 5:]
    src = open(args[0]) if args else sys.stdin
    names = [ln.strip() for ln in src if ln.strip() and not ln.startswith('#')]
    print("name\tlat\tlng\tosm_type\taddresstype\tconfidence\tdisplay")
    for nm in names:
        res = query(nm)
        r, conf = pick(res, bbox)
        if r:
            print(f"{nm}\t{float(r['lat']):.5f}\t{float(r['lon']):.5f}\t{r.get('osm_type','')}\t{r.get('addresstype','')}\t{conf}\t{r.get('display_name','')[:70]}")
        else:
            print(f"{nm}\t\t\t\t\tnone\t(no result)")
        sys.stderr.write(f"  {conf:6} {nm}\n")
        time.sleep(1.1)  # Nominatim usage policy: ≤1 req/s


if __name__ == '__main__':
    main()
