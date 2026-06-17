/* === src/js/util/normalize-ar.js === */
/*
 * Arabic normalisation for MATCHING — an exact mirror of categorize.py's
 * norm_ar / norm_place. The original surface text is never mutated; these are
 * used only to compare names against the canonical registry (data/places.json)
 * so a town resolves identically in Python and in the browser.
 *
 * src/python/validate_consistency.py runs this file under node and asserts it
 * agrees with Python norm_place on every registry name + corpus target, so the
 * two implementations can never silently drift. Keep these \u ranges identical
 * to categorize.py (_AR_INVISIBLES_RE, _AR_DIACRITICS_RE, _AR_*_MAP).
 */

// LRM/RLM/ZWJ/ZWNJ/embedding marks (U+200B..U+200F, U+202A..U+202E),
// word-joiner U+2060, BOM U+FEFF, NBSP U+00A0
var _INVISIBLES = new RegExp('[​-‏‪-‮⁠﻿ ]', 'g');
// harakat U+064B..U+0652 + superscript alef U+0670 + tatweel U+0640
var _DIACRITICS = new RegExp('[ً-ْٰـ]', 'g');
// alef variants U+0623/U+0625/U+0622 -> U+0627 ; alef-maqsura U+0649 -> yaa U+064A
var _ALEF = new RegExp('[أإآ]', 'g');
var _MAQSURA = new RegExp('ى', 'g');
var _AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
var _AR_DIGITS_RE = new RegExp('[٠-٩]', 'g');
// taa-marbuta U+0629 -> haa U+0647 ; hamza-seat folds
var _TAA = new RegExp('ة', 'g');
var _HAMZA = new RegExp('ء', 'g');          // bare hamza -> drop
var _HAMZA_YA = new RegExp('ئ', 'g');       // U+0626 -> yaa U+064A
var _HAMZA_WA = new RegExp('ؤ', 'g');       // U+0624 -> waw U+0648

export function normalizeAr(s) {
  if (!s) return '';
  s = s.replace(_INVISIBLES, '');
  s = s.replace(_DIACRITICS, '');
  s = s.replace(_ALEF, 'ا');
  s = s.replace(_MAQSURA, 'ي');
  s = s.replace(_AR_DIGITS_RE, function (d) { return String(_AR_DIGITS.indexOf(d)); });
  return s;
}

export function normalizePlace(s) {
  s = normalizeAr(s);
  s = s.replace(_TAA, 'ه');
  s = s.replace(_HAMZA, '');
  s = s.replace(_HAMZA_YA, 'ي');
  s = s.replace(_HAMZA_WA, 'و');
  return s.replace(/\s+/g, ' ').trim();
}
