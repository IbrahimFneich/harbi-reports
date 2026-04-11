/* ============================================================
   date-parser.js — Natural language date parsing for Spotlight Search
   Supports Arabic and English relative/absolute date expressions.
   Returns a normalised result with YYYY-MM-DD boundaries and an
   Arabic display label so the caller can filter and annotate UI.

   Export:
     parseDate(query) → { type, start, end, remaining, label }
   ============================================================ */

// ── Helpers ────────────────────────────────────────────────

/** Format a Date object as YYYY-MM-DD (local time). */
function fmt(date) {
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
}

/** Return YYYY-MM-DD for n days before today (local time). */
function daysAgo(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
}

/** Convert Arabic-Indic numerals ٠-٩ to Western digits 0-9. */
function arToWestern(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    // Arabic-Indic: ٠ = U+0660 … ٩ = U+0669
    if (code >= 0x0660 && code <= 0x0669) {
      out += String.fromCharCode(code - 0x0660 + 48);
    } else {
      out += s[i];
    }
  }
  return out;
}

/** Return the last day of a given month as a Date. */
function lastDayOfMonth(year, month0) {
  return new Date(year, month0 + 1, 0);
}

/** Return the first day of this ISO week (Monday-based). */
function startOfWeek() {
  var d = new Date();
  var day = d.getDay(); // 0=Sun
  var diff = (day === 0) ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return fmt(d);
}

// ── Month lookup maps ──────────────────────────────────────

var EN_MONTHS = {
  'jan': 0, 'january': 0,
  'feb': 1, 'february': 1,
  'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'may': 4,
  'jun': 5, 'june': 5,
  'jul': 6, 'july': 6,
  'aug': 7, 'august': 7,
  'sep': 8, 'september': 8,
  'oct': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11
};

// Each entry maps the canonical Arabic name to month index 0–11.
// Multiple spellings/transliterations are listed.
var AR_MONTHS = {
  'كانون الثاني': 0, 'يناير': 0,
  'شباط': 1, 'فبراير': 1,
  'آذار': 2, 'مارس': 2,
  'نيسان': 3, 'أبريل': 3, 'ابريل': 3,
  'أيار': 4, 'مايو': 4,
  'حزيران': 5, 'يونيو': 5,
  'تموز': 6, 'يوليو': 6,
  'آب': 7, 'أغسطس': 7, 'اغسطس': 7,
  'أيلول': 8, 'سبتمبر': 8,
  'تشرين الأول': 9, 'أكتوبر': 9, 'اكتوبر': 9,
  'تشرين الثاني': 10, 'نوفمبر': 10,
  'كانون الأول': 11, 'ديسمبر': 11
};

// Build sorted array of Arabic month keys (longest first to avoid prefix collisions).
var AR_MONTH_KEYS = Object.keys(AR_MONTHS).sort(function(a, b) { return b.length - a.length; });

// ── Main export ────────────────────────────────────────────

/**
 * parseDate(query)
 *
 * Scans `query` for a date expression (relative or absolute) and returns:
 *   { type: 'single'|'range'|null, start, end, remaining, label }
 *
 * Checks are performed in priority order; the first match wins.
 * `remaining` contains the query text with the matched date token removed
 * and normalised whitespace, ready for keyword search.
 */
export function parseDate(query) {
  if (!query || !query.trim()) {
    return { type: null, start: null, end: null, remaining: query || '', label: null };
  }

  var q = arToWestern(query.trim());
  var ql = q.toLowerCase();
  var result;

  // ── 1. Relative keywords: today / yesterday ──────────────

  // today
  result = _matchRelativeKeyword(q, ql);
  if (result) return result;

  // ── 2. Relative duration: N days/weeks/months ago ────────
  result = _matchRelativeDuration(q, ql);
  if (result) return result;

  // ── 3. Named periods: last week / last month / this week ─
  result = _matchNamedPeriod(q, ql);
  if (result) return result;

  // ── 4. ISO: YYYY-MM-DD ───────────────────────────────────
  result = _matchISO(q);
  if (result) return result;

  // ── 5. Slash/dot: DD/MM/YYYY or DD.MM.YYYY ───────────────
  result = _matchSlashDot(q);
  if (result) return result;

  // ── 6. English named: Oct 7 2024 / October 7, 2024 / 7 Oct 2024 ─
  result = _matchEnglishNamed(q, ql);
  if (result) return result;

  // ── 7. English month+year: Oct 2024 / October 2024 ───────
  result = _matchEnglishMonthYear(q, ql);
  if (result) return result;

  // ── 8. Arabic named: ٧ تشرين الأول ٢٠٢٤ ────────────────
  result = _matchArabicNamed(q);
  if (result) return result;

  // No date found
  return { type: null, start: null, end: null, remaining: query, label: null };
}

// ── Private matchers ───────────────────────────────────────

function _strip(q, token) {
  // Remove the matched token and collapse whitespace
  return q.replace(token, ' ').replace(/\s{2,}/g, ' ').trim();
}

function _single(dateStr, remaining, label) {
  return { type: 'single', start: dateStr, end: dateStr, remaining: remaining, label: label };
}

function _range(startStr, endStr, remaining, label) {
  return { type: 'range', start: startStr, end: endStr, remaining: remaining, label: label };
}

// 1. today / اليوم   |   yesterday / أمس / البارحة
function _matchRelativeKeyword(q, ql) {
  var todayRe = /\b(today|اليوم)\b/i;
  var yestRe = /\b(yesterday|أمس|البارحة)\b/i;

  var m;

  m = ql.match(todayRe) || q.match(/(اليوم)/);
  if (m) {
    var tok = m[0];
    return _single(fmt(new Date()), _strip(q, tok), 'اليوم');
  }

  m = ql.match(yestRe) || q.match(/(أمس|البارحة)/);
  if (m) {
    var tok2 = m[0];
    return _single(daysAgo(1), _strip(q, tok2), 'أمس');
  }

  return null;
}

// 2. N days ago / N weeks ago / N months ago
//    Arabic: منذ N يوم / منذ N أسبوع / منذ N شهر / قبل N يوم …
function _matchRelativeDuration(q, ql) {
  // English
  var enRe = /(\d+)\s*(day|days|week|weeks|month|months)\s+ago/i;
  var m = ql.match(enRe);
  if (m) {
    var n = parseInt(m[1], 10);
    var unit = m[2].toLowerCase();
    var tok = m[0];
    return _buildDurationResult(q, tok, n, unit);
  }

  // Arabic: (قبل|منذ) N (يوم|أيام|أسبوع|أسابيع|شهر|شهور|أشهر)
  var arRe = /(قبل|منذ)\s+(\d+)\s+(يوم|أيام|أسبوع|أسابيع|شهر|شهور|أشهر)/;
  m = q.match(arRe);
  if (m) {
    var n2 = parseInt(m[2], 10);
    var unitAr = m[3];
    var tok2 = m[0];
    var unit2 = /أسبوع|أسابيع/.test(unitAr) ? 'week' : /شهر|شهور|أشهر/.test(unitAr) ? 'month' : 'day';
    return _buildDurationResult(q, tok2, n2, unit2);
  }

  return null;
}

function _buildDurationResult(q, tok, n, unit) {
  var remaining = _strip(q, tok);
  if (unit === 'day' || unit === 'days') {
    var d = daysAgo(n);
    return _single(d, remaining, 'قبل ' + n + ' يوم');
  }
  if (unit === 'week' || unit === 'weeks') {
    var start = daysAgo(n * 7);
    var end = daysAgo((n - 1) * 7 - 1);
    // Clamp end to today
    var today = fmt(new Date());
    if (end > today) end = today;
    return _range(start, end, remaining, 'قبل ' + n + ' أسبوع');
  }
  if (unit === 'month' || unit === 'months') {
    var start2 = daysAgo(n * 30);
    var end2 = daysAgo((n - 1) * 30 - 1);
    var today2 = fmt(new Date());
    if (end2 > today2) end2 = today2;
    return _range(start2, end2, remaining, 'قبل ' + n + ' شهر');
  }
  return null;
}

// 3. Named periods
function _matchNamedPeriod(q, ql) {
  // last week / الأسبوع الماضي
  if (/\blast\s+week\b/i.test(ql) || /الأسبوع\s+الماضي/.test(q)) {
    var tok = ql.match(/last\s+week/i) ? ql.match(/last\s+week/i)[0] : 'الأسبوع الماضي';
    var start = daysAgo(7);
    var end = fmt(new Date());
    return _range(start, end, _strip(q, tok), 'الأسبوع الماضي');
  }

  // last month / الشهر الماضي
  if (/\blast\s+month\b/i.test(ql) || /الشهر\s+الماضي/.test(q)) {
    var tok2 = ql.match(/last\s+month/i) ? ql.match(/last\s+month/i)[0] : 'الشهر الماضي';
    var start2 = daysAgo(30);
    var end2 = fmt(new Date());
    return _range(start2, end2, _strip(q, tok2), 'الشهر الماضي');
  }

  // this week / هذا الأسبوع
  if (/\bthis\s+week\b/i.test(ql) || /هذا\s+الأسبوع/.test(q)) {
    var tok3 = ql.match(/this\s+week/i) ? ql.match(/this\s+week/i)[0] : 'هذا الأسبوع';
    var start3 = startOfWeek();
    var end3 = fmt(new Date());
    return _range(start3, end3, _strip(q, tok3), 'هذا الأسبوع');
  }

  return null;
}

// 4. ISO: YYYY-MM-DD
function _matchISO(q) {
  var isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  var m = q.match(isoRe);
  if (m) {
    var dateStr = m[0];
    var remaining = _strip(q, dateStr);
    return _single(dateStr, remaining, _isoToArabicLabel(dateStr));
  }
  return null;
}

// 5. DD/MM/YYYY or DD.MM.YYYY
function _matchSlashDot(q) {
  var re = /\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/;
  var m = q.match(re);
  if (m) {
    var day = parseInt(m[1], 10);
    var mon = parseInt(m[2], 10) - 1;
    var year = parseInt(m[3], 10);
    var d = new Date(year, mon, day);
    var dateStr = fmt(d);
    var remaining = _strip(q, m[0]);
    return _single(dateStr, remaining, _isoToArabicLabel(dateStr));
  }
  return null;
}

// 6. English named: "Oct 7 2024", "October 7, 2024", "7 Oct 2024"
function _matchEnglishNamed(q, ql) {
  // Build pattern from month names (longest first)
  var monthNames = Object.keys(EN_MONTHS).sort(function(a, b) { return b.length - a.length; });
  var monthPat = '(' + monthNames.join('|') + ')';

  // Pattern A: MonthName Day, Year  or  MonthName Day Year
  var reA = new RegExp('\\b' + monthPat + '\\s+(\\d{1,2}),?\\s+(\\d{4})\\b', 'i');
  var m = ql.match(reA);
  if (m) {
    var mon = EN_MONTHS[m[1].toLowerCase()];
    var day = parseInt(m[2], 10);
    var year = parseInt(m[3], 10);
    var d = new Date(year, mon, day);
    var dateStr = fmt(d);
    return _single(dateStr, _strip(q, m[0]), _isoToArabicLabel(dateStr));
  }

  // Pattern B: Day MonthName Year
  var reB = new RegExp('\\b(\\d{1,2})\\s+' + monthPat + '\\s+(\\d{4})\\b', 'i');
  m = ql.match(reB);
  if (m) {
    var day2 = parseInt(m[1], 10);
    var mon2 = EN_MONTHS[m[2].toLowerCase()];
    var year2 = parseInt(m[3], 10);
    var d2 = new Date(year2, mon2, day2);
    var dateStr2 = fmt(d2);
    return _single(dateStr2, _strip(q, m[0]), _isoToArabicLabel(dateStr2));
  }

  return null;
}

// 7. English month+year: "Oct 2024" / "October 2024"
function _matchEnglishMonthYear(q, ql) {
  var monthNames = Object.keys(EN_MONTHS).sort(function(a, b) { return b.length - a.length; });
  var monthPat = '(' + monthNames.join('|') + ')';
  var re = new RegExp('\\b' + monthPat + '\\s+(\\d{4})\\b', 'i');
  var m = ql.match(re);
  if (m) {
    var mon = EN_MONTHS[m[1].toLowerCase()];
    var year = parseInt(m[2], 10);
    var first = new Date(year, mon, 1);
    var last = lastDayOfMonth(year, mon);
    var start = fmt(first);
    var end = fmt(last);
    return _range(start, end, _strip(q, m[0]), _isoToArabicLabel(start) + ' – ' + _isoToArabicLabel(end));
  }
  return null;
}

// 8. Arabic named: "٧ تشرين الأول ٢٠٢٤" or "7 تشرين الأول 2024"
function _matchArabicNamed(q) {
  // Normalise Arabic-Indic digits first (already done on entry, but q here is
  // already normalised).  Month names can be multi-word so try longest first.
  for (var i = 0; i < AR_MONTH_KEYS.length; i++) {
    var monthName = AR_MONTH_KEYS[i];
    // Allow up to two spaces inside the month name (e.g. "تشرين الأول")
    var escapedMonth = monthName.replace(/\s+/g, '\\s+');
    var re = new RegExp('(\\d{1,2})\\s+' + escapedMonth + '\\s+(\\d{4})');
    var m = q.match(re);
    if (m) {
      var day = parseInt(m[1], 10);
      var mon = AR_MONTHS[monthName];
      var year = parseInt(m[2], 10);
      var d = new Date(year, mon, day);
      var dateStr = fmt(d);
      return _single(dateStr, _strip(q, m[0]), _isoToArabicLabel(dateStr));
    }
  }
  return null;
}

// ── Label helper ───────────────────────────────────────────

var AR_MONTH_LABELS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/** Build a readable Arabic label from a YYYY-MM-DD string. */
function _isoToArabicLabel(iso) {
  var parts = iso.split('-');
  var day = parseInt(parts[2], 10);
  var mon = parseInt(parts[1], 10) - 1;
  var year = parts[0];
  return day + ' ' + (AR_MONTH_LABELS[mon] || '') + ' ' + year;
}
