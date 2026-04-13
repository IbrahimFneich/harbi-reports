#!/usr/bin/env python3
"""
Build data/search-facets.json for the advanced search page.

Walks every data/*.json daily report and extracts:
  1. Vocab lists (weapons, targets, badges, tags, siren locations, ally flags)
     that populate the dropdown / datalist controls on search.html.
  2. Per-item enrichment keyed by date + category index so the client can do
     precise field-level filtering instead of substring matching on titles.

The output is loaded once by search.html after spotlight-index.json; the two
files together back the advanced-search form.

Usage:
  python3 src/python/build_search_facets.py
"""

import collections
import json
import os
import re
from glob import glob

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE, 'data')

# Human-readable Arabic labels for the raw bayan badge categories in data/*.json.
BADGE_LABELS = {
    'communique': 'بيان عام',
    'deep':       'ضربة عمق',
    'tank':       'آلية / دبابة',
    'settlement': 'مستوطنة',
    'multi':      'متعدد الأهداف',
}

# Cap large vocab lists so the JSON stays small. The tail is still searchable
# via the free-text input on the form; the dropdown is just for discovery.
TARGETS_MAX = 300
SIREN_LOCS_MAX = 300

# ─── Data cleanup rules ────────────────────────────────────────────────
# The source data in data/*.json is produced by categorize.py and carries
# some noise that leaks into dropdowns if passed through raw. These rules
# normalize or drop the noisy values so the advanced-search facets show
# only meaningful, deduplicated vocabulary.

ARABIC_DIACRITICS = re.compile(r'[\u064B-\u065F\u0670]')


def _strip_ar(s: str) -> str:
    """Strip trailing punctuation and Arabic diacritics; trim whitespace."""
    if not s:
        return ''
    s = s.strip()
    while s and s[-1] in '.،,؟?!':
        s = s[:-1].strip()
    s = ARABIC_DIACRITICS.sub('', s)
    return s.strip()


# Canonical weapon name → substring patterns (on diacritic-stripped lowercase
# form) that should collapse into it. First match wins.
WEAPON_CANONICAL = [
    ('صلية صاروخية', [
        'صلية صاروخ', 'صليات صاروخ', 'بصلية صاروخ',
        'صلية صاروخية كبيرة', 'صلياتٍ صاروخ',
    ]),
    ('صاروخ موجه', [
        'صواريخ موجه', 'صاروخ موجه', 'بصاروخ موجه',
    ]),
    ('قذائف مدفعية', [
        'قذائف مدفع', 'بقذائف المدفع',
    ]),
    ('مسيّرة انقضاضية', [
        'مسيرات انقضاض', 'مسيرة انقضاض',
        'محلقات انقضاض', 'محلقة انقضاض',
        'سرب مسيرات انقضاض', 'سرب من المسيرات الانقضاض',
        'بسرب من المسيرات الانقضاض', 'بمحلقة انقضاض',
    ]),
    ('صواريخ نوعية', [
        'صواريخ نوعي', 'صاروخ نوعي',
        'صلية من الصواريخ النوعي', 'صليات من الصواريخ النوعي',
    ]),
    ('صاروخ أرض-جو', [
        'صاروخ أرض جو', 'صاروخ أرض-جو', 'صواريخ أرض جو',
    ]),
]

# Generic/fallback weapon strings that carry no real information.
WEAPON_DROPLIST = {'الأسلحة المناسبة', 'عملية قنص', 'قنص', 'بصلية من'}

# Target fallback strings the categorizer emits for non-operational bayanat.
TARGET_DROPLIST = {'الساعة'}

# Tags that are actually badge categories mis-stored as tags.
TAG_DROPLIST = {'بيان عام'}


def canonicalize_weapon(raw: str) -> str:
    """Return canonical weapon name, or '' if the raw value should be dropped."""
    if not raw or raw in WEAPON_DROPLIST:
        return ''
    if len(raw) > 50:  # mis-classified long strings (probably a target)
        return ''
    norm = _strip_ar(raw).lower()
    for canonical, patterns in WEAPON_CANONICAL:
        for pat in patterns:
            if pat in norm:
                return canonical
    return _strip_ar(raw)


def clean_target(raw: str, badge: str) -> str:
    """Return usable target, or '' if it's a communique fallback / noise."""
    if badge == 'communique':
        return ''
    raw = (raw or '').strip()
    if not raw or raw in TARGET_DROPLIST:
        return ''
    if raw.startswith('بيان '):  # category label mis-stored as target
        return ''
    if len(raw) < 3:
        return ''
    return raw


def clean_tag(raw: str) -> str:
    raw = (raw or '').strip()
    if not raw or raw in TAG_DROPLIST:
        return ''
    return raw


def clean_siren_location(raw: str) -> str:
    raw = (raw or '').strip()
    if not raw or len(raw) < 5:
        return ''
    return raw


def main():
    files = sorted(glob(os.path.join(DATA_DIR, '20*.json')))
    print(f'Reading {len(files)} daily reports from {DATA_DIR}')

    weapons    = collections.Counter()
    targets    = collections.Counter()
    badges     = collections.Counter()
    tags       = collections.Counter()
    siren_locs = collections.Counter()
    ally_flags = collections.Counter()

    bayan_meta = {}
    siren_meta = {}
    ally_meta  = {}

    for fp in files:
        with open(fp, encoding='utf-8') as f:
            d = json.load(f)
        date = d.get('date') or os.path.basename(fp)[:10]

        b_arr = []
        for i, b in enumerate(d.get('bayanat') or []):
            bg = (b.get('badge') or '').strip()
            w  = canonicalize_weapon(b.get('weapon') or '')
            t  = clean_target(b.get('target') or '', bg)
            gs = [g for g in (clean_tag(g) for g in (b.get('tags') or [])) if g]
            num = b.get('num')
            if w:  weapons[w]  += 1
            if t:  targets[t]  += 1
            if bg: badges[bg]  += 1
            for g in gs: tags[g] += 1
            entry = {'i': i}
            if w:   entry['w'] = w
            if t:   entry['t'] = t
            if bg:  entry['b'] = bg
            if gs:  entry['g'] = gs
            if num is not None: entry['n'] = num
            b_arr.append(entry)
        if b_arr:
            bayan_meta[date] = b_arr

        s_arr = []
        for i, s in enumerate(d.get('sirens') or []):
            loc = clean_siren_location(s.get('location') or '')
            if loc:
                siren_locs[loc] += 1
            entry = {'i': i}
            if loc: entry['l'] = loc
            s_arr.append(entry)
        if s_arr:
            siren_meta[date] = s_arr

        a_arr = []
        for i, a in enumerate(d.get('allies') or []):
            flag = (a.get('flag') or '').strip()
            if flag:
                ally_flags[flag] += 1
            entry = {'i': i}
            if flag: entry['f'] = flag
            a_arr.append(entry)
        if a_arr:
            ally_meta[date] = a_arr

    vocab = {
        'weapons':      [[k, n] for k, n in weapons.most_common()],
        'targets_top':  [[k, n] for k, n in targets.most_common(TARGETS_MAX)],
        'badges':       [[raw, BADGE_LABELS.get(raw, raw), n]
                         for raw, n in badges.most_common()],
        'tags':         [[k, n] for k, n in tags.most_common()],
        'siren_locations_top': [[k, n] for k, n in siren_locs.most_common(SIREN_LOCS_MAX)],
        'ally_flags':   [[k, n] for k, n in ally_flags.most_common()],
    }

    facets = {
        'vocab': vocab,
        'bayan': bayan_meta,
        'siren': siren_meta,
        'allies': ally_meta,
    }

    out = os.path.join(DATA_DIR, 'search-facets.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(facets, f, ensure_ascii=False, separators=(',', ':'))

    size = os.path.getsize(out)
    print(f'Wrote {out}')
    print(f'  size: {size:,} bytes ({size/1024:.1f} KB)')
    print(f'  weapons:    {len(weapons):>5}')
    print(f'  targets:    {len(targets):>5} (capped at {TARGETS_MAX} in vocab)')
    print(f'  badges:     {len(badges):>5} → {list(badges.keys())}')
    print(f'  tags:       {len(tags):>5}')
    print(f'  siren locs: {len(siren_locs):>5} (capped at {SIREN_LOCS_MAX} in vocab)')
    print(f'  ally flags: {len(ally_flags):>5} → {list(ally_flags.keys())}')
    print(f'  bayan days: {len(bayan_meta):>5}')
    print(f'  siren days: {len(siren_meta):>5}')
    print(f'  ally days:  {len(ally_meta):>5}')


if __name__ == '__main__':
    main()
