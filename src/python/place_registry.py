#!/usr/bin/env python3
"""
Python access to the canonical place registry (data/places.json).

The mirror of src/js/maps/place-registry.js — same normalisation (norm_place)
and the SAME find_places_in_text algorithm (longest-first, skip names contained
in an already-matched longer name), so the categorizer, the validator and the
browser all resolve a town to the same canonical place.
"""
import json
import os

from categorize import norm_place

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PLACES_PATH = os.path.join(_BASE, 'data', 'places.json')

_by_norm = None
_sorted_keys = None


def load_places(path=None):
    """Load and cache {norm_key: entry}. entry = {display,lat,lng,confidence,...}."""
    global _by_norm, _sorted_keys
    if _by_norm is not None and path is None:
        return _by_norm
    p = path or _PLACES_PATH
    with open(p, encoding='utf-8') as f:
        doc = json.load(f)
    by_norm = doc.get('places', {})
    if path is None:
        _by_norm = by_norm
        _sorted_keys = sorted(by_norm.keys(), key=len, reverse=True)
    return by_norm


def _keys_longest_first():
    global _sorted_keys
    if _sorted_keys is None:
        load_places()
    return _sorted_keys


def lookup(name):
    """Exact registry entry for a name (via norm_place), or None."""
    if not name:
        return None
    return load_places().get(norm_place(name))


def coord_of(name):
    e = lookup(name)
    if e and e.get('lat') is not None:
        return (e['lat'], e['lng'])
    return None


# Arabic single-letter proclitics that may attach before a town name
# (و=and, ف=so/then, ب=in/with, ك=like, ل=for). A name may be preceded by ONE of
# these at a word boundary (e.g. "والعديسة"); anything else must be a boundary.
_PROCLITICS = set('وفبكل')


def _is_ar_letter(c):
    return 'ء' <= c <= 'ي'


def _word_match(nt, k):
    """True if `k` occurs in `nt` as a whole word — bounded by non-letters, with
    an optional single proclitic before it. Prevents short names ('دان') from
    matching inside longer words ('بلدان', 'ميدان')."""
    start = 0
    n = len(nt)
    while True:
        i = nt.find(k, start)
        if i < 0:
            return False
        end = i + len(k)
        left_ok = (i == 0) or (not _is_ar_letter(nt[i - 1])) or (
            nt[i - 1] in _PROCLITICS and (i - 1 == 0 or not _is_ar_letter(nt[i - 2])))
        right_ok = (end >= n) or (not _is_ar_letter(nt[end]))
        if left_ok and right_ok:
            return True
        start = i + 1


def find_places_in_text(text):
    """Every canonical place whose normalised name occurs in `text` as a WHOLE
    WORD (proclitics allowed). Longest-first; a name fully contained in an
    already-matched longer name is skipped (so 'جبيل' inside 'بنت جبيل' is not
    double-counted). Returns canonical norm keys, in match order. MULTI-TARGET aware.
    """
    if not text:
        return []
    nt = norm_place(text)
    hits = []
    for k in _keys_longest_first():
        if not k or k not in nt:
            continue
        if any(k in h for h in hits):
            continue
        if _word_match(nt, k):
            hits.append(k)
    return hits
