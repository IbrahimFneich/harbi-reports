/* === src/js/maps/place-registry.js === */
/*
 * The SINGLE source of truth for town -> coordinate lookups in the browser.
 * Loads data/places.json (built by src/python/build_places.py from all the old
 * divergent tables) and resolves names through normalizePlace, so the map, the
 * dashboards and search all place/count a town identically — and identically to
 * the Python pipeline (categorize.py / validate_consistency.py).
 *
 * Replaces the per-view hardcoded tables: bayanat-map opCoords, bayanat-dash
 * locNames, siren-auto-map cityCoords, sirens-dash regionKw.
 */

import { normalizePlace } from '../util/normalize-ar.js';

var _placesPromise = null;   // raw {norm_key: entry}
var _byNorm = null;          // resolved map once loaded
var _sortedKeys = null;      // norm keys, longest-first (for findInText)

export function loadPlaces() {
  if (_placesPromise) return _placesPromise;
  var candidates = ['data/places.json', '../data/places.json', './data/places.json'];
  _placesPromise = (function tryNext(i) {
    if (i >= candidates.length) return Promise.resolve({});
    return fetch(candidates[i])
      .then(function (r) { return r.ok ? r.json() : tryNext(i + 1); })
      .catch(function () { return tryNext(i + 1); });
  })(0).then(function (doc) {
    _byNorm = (doc && doc.places) ? doc.places : {};
    _sortedKeys = Object.keys(_byNorm).sort(function (a, b) { return b.length - a.length; });
    return _byNorm;
  });
  return _placesPromise;
}

// Exact lookup of a single name (already loaded). Returns the registry entry
// {display, lat, lng, confidence, hasPolygon, aliases} or null.
export function lookupPlace(name) {
  if (!_byNorm || !name) return null;
  return _byNorm[normalizePlace(name)] || null;
}

export function coordOf(name) {
  var e = lookupPlace(name);
  return (e && e.lat != null) ? [e.lat, e.lng] : null;
}

// Arabic single-letter proclitics (و ف ب ك ل) that may attach before a name.
var _PROCLITICS = 'وفبكل';
function _isArLetter(c) { return c >= 'ء' && c <= 'ي'; }

// Whole-word match (mirror of place_registry.py _word_match): `k` bounded by
// non-letters, with an optional single proclitic before it — so short names
// ('دان') don't match inside longer words ('بلدان', 'ميدان').
function _wordMatch(nt, k) {
  var start = 0, n = nt.length;
  for (;;) {
    var i = nt.indexOf(k, start);
    if (i < 0) return false;
    var end = i + k.length;
    var leftOk = (i === 0) || !_isArLetter(nt.charAt(i - 1)) ||
      (_PROCLITICS.indexOf(nt.charAt(i - 1)) !== -1 && (i - 1 === 0 || !_isArLetter(nt.charAt(i - 2))));
    var rightOk = (end >= n) || !_isArLetter(nt.charAt(end));
    if (leftOk && rightOk) return true;
    start = i + 1;
  }
}

// MULTI-TARGET aware: every canonical place whose normalized name occurs in the
// normalized text as a WHOLE WORD (proclitics allowed). Longest-first; a name
// fully contained in a longer matched name is skipped (won't count "جبيل" inside
// "بنت جبيل"). Returns canonical norm keys. Mirror of Python find_places_in_text.
export function findPlacesInText(text) {
  if (!_byNorm || !text) return [];
  var nt = normalizePlace(text);
  var hits = [];
  for (var i = 0; i < _sortedKeys.length; i++) {
    var k = _sortedKeys[i];
    if (!k || nt.indexOf(k) === -1) continue;
    var contained = false;
    for (var j = 0; j < hits.length; j++) {
      if (hits[j].indexOf(k) !== -1) { contained = true; break; }
    }
    if (!contained && _wordMatch(nt, k)) hits.push(k);
  }
  return hits;
}

export function placeEntries() { return _byNorm || {}; }

// Test seam: inject the registry without fetch (used by the cross-language
// agreement check in validate_consistency.py running under node).
export function __setRegistryForTest(places) {
  _byNorm = places || {};
  _sortedKeys = Object.keys(_byNorm).sort(function (a, b) { return b.length - a.length; });
}
