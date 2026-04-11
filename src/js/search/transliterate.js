/**
 * transliterate.js
 * English → Arabic transliteration engine for Spotlight Search.
 *
 * Two strategies:
 *  1. keyboardTransliterate  — QWERTY physical-key → Arabic (layout-switch forgetting)
 *  2. phoneticTransliterate  — English pronunciation → Arabic approximation
 *
 * Helper:
 *  3. hasLatin               — returns true if string contains any a-zA-Z character
 */

// ---------------------------------------------------------------------------
// Keyboard map — lowercase QWERTY position → Arabic character
// ---------------------------------------------------------------------------
var KEYBOARD_MAP_LOWER = {
  'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف',
  'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح',
  'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل',
  'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م',
  'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا',
  'n': 'ى', 'm': 'ة'
};

// Shift / uppercase QWERTY position → Arabic character
var KEYBOARD_MAP_UPPER = {
  'Q': 'َ',  'W': 'ً',  'E': 'ُ',  'R': 'ٌ',  'T': 'لإ',
  'Y': 'إ',  'U': '\u2018', 'I': '÷', 'O': '×', 'P': '؛',
  'A': 'ِ',  'S': 'ٍ',  'D': ']',  'F': '[',  'G': 'لأ',
  'H': 'أ',  'J': 'ـ',  'K': '،', 'L': '/',
  'Z': '~',  'X': 'ْ',  'C': '}',  'V': '{',  'B': 'لآ',
  'N': 'آ',  'M': '\u2019'
};

/**
 * keyboardTransliterate(input)
 * Maps each QWERTY character to the Arabic character at the same physical key.
 * Spaces and digits are preserved unchanged. Unmapped characters pass through.
 *
 * @param  {string} input
 * @returns {string}
 */
export function keyboardTransliterate(input) {
  var result = '';
  for (var i = 0; i < input.length; i++) {
    var ch = input[i];
    if (ch === ' ' || (ch >= '0' && ch <= '9')) {
      result += ch;
    } else if (KEYBOARD_MAP_LOWER[ch] !== undefined) {
      result += KEYBOARD_MAP_LOWER[ch];
    } else if (KEYBOARD_MAP_UPPER[ch] !== undefined) {
      result += KEYBOARD_MAP_UPPER[ch];
    } else {
      result += ch;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Phonetic map — digraphs checked first (order matters)
// ---------------------------------------------------------------------------
var PHONETIC_DIGRAPHS = [
  ['sh', 'ش'], ['ch', 'ش'], ['th', 'ث'], ['dh', 'ذ'],
  ['kh', 'خ'], ['gh', 'غ'], ['zh', 'ج'],
  ['aa', 'ا'], ['ee', 'ي'], ['oo', 'و'], ['ou', 'و'],
  ['ei', 'ي'], ['ai', 'ي'], ['au', 'و'],
  ['ph', 'ف'], ['qu', 'ق']
];

var PHONETIC_SINGLE = {
  'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي',
  'f': 'ف', 'g': 'ج', 'h': 'ه', 'i': 'ي', 'j': 'ج',
  'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'o': 'و',
  'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت',
  'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي',
  'z': 'ز'
};

/**
 * phoneticTransliterate(input)
 * Converts English pronunciation to Arabic approximation.
 * Input is lowercased first. Spaces and digits are preserved.
 * Digraphs are tried before single characters.
 *
 * @param  {string} input
 * @returns {string}
 */
export function phoneticTransliterate(input) {
  var lower = input.toLowerCase();
  var result = '';
  var i = 0;
  while (i < lower.length) {
    var ch = lower[i];

    // Preserve spaces and digits
    if (ch === ' ' || (ch >= '0' && ch <= '9')) {
      result += ch;
      i++;
      continue;
    }

    // Try digraph first
    var matched = false;
    if (i + 1 < lower.length) {
      var pair = lower[i] + lower[i + 1];
      for (var d = 0; d < PHONETIC_DIGRAPHS.length; d++) {
        if (PHONETIC_DIGRAPHS[d][0] === pair) {
          result += PHONETIC_DIGRAPHS[d][1];
          i += 2;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fall back to single char
      if (PHONETIC_SINGLE[ch] !== undefined) {
        result += PHONETIC_SINGLE[ch];
      } else {
        result += ch;
      }
      i++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// hasLatin
// ---------------------------------------------------------------------------

/**
 * hasLatin(s)
 * Returns true if the string contains at least one Latin a-z / A-Z character.
 *
 * @param  {string} s
 * @returns {boolean}
 */
export function hasLatin(s) {
  return /[a-zA-Z]/.test(s);
}
