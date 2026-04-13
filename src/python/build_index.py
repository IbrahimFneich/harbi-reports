#!/usr/bin/env python3
"""
Build derived index files from data/*.json reports.

Generates:
  1. data/reports-meta.js  — var reports, reportStats, searchIndex for index.html
  2. data/spotlight-index.json — pre-built flat search array for spotlight.js
  3. src/js/ui/nav.js — regenerated ALL_REPORTS + existing exports
  4. data/harbi.db — SQLite database via build_db.py
  5. data/search-facets.json — vocab + per-item enrichment for search.html

Usage:
  python3 src/python/build_index.py
"""

import json
import os
import re
import sys
from glob import glob

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE, 'data')

# ═══════════════ ARABIC HELPERS ═══════════════
ARABIC_MONTHS = {
    1: 'كانون الثاني', 2: 'شباط', 3: 'آذار', 4: 'نيسان',
    5: 'أيار', 6: 'حزيران', 7: 'تموز', 8: 'آب',
    9: 'أيلول', 10: 'تشرين الأول', 11: 'تشرين الثاني', 12: 'كانون الأول'
}

def fmt_date_ar(date_str):
    """Format YYYY-MM-DD as '10 نيسان 2026'."""
    p = date_str.split('-')
    d = int(p[2])
    m = int(p[1])
    return str(d) + ' ' + (ARABIC_MONTHS.get(m, '') ) + ' ' + p[0]


# ═══════════════ ARABIC NORMALIZATION ═══════════════
# Must match spotlight.js sNorm() exactly
def normalize(s):
    s = re.sub(r'[إأآٱ]', 'ا', s)
    s = s.replace('ة', 'ه')
    s = s.replace('ى', 'ي')
    s = s.replace('ؤ', 'و')
    s = s.replace('ئ', 'ي')
    s = s.replace('ّ', '')
    s = re.sub(r'[\u064B-\u065F\u0670]', '', s)
    return s.lower()


# ═══════════════ KEYWORD EXTRACTION ═══════════════
def extract_keywords(data):
    """Extract deduplicated keywords from a day's data for searchIndex."""
    kw_set = set()

    for b in data.get('bayanat', []):
        if b.get('target'):
            kw_set.add(b['target'])
        if b.get('weapon'):
            kw_set.add(b['weapon'])
        # Extract key terms from tags
        for tag in b.get('tags', []):
            kw_set.add(tag)

    for s in data.get('sirens', []):
        loc = s.get('location', '')
        # Add individual location words (skip very short)
        for w in loc.split():
            if len(w) >= 3:
                kw_set.add(w)

    for e in data.get('enemy', []):
        # Extract source names from enemy media
        summary = e.get('summary', '')
        for src in ['يديعوت', 'هآرتس', 'معاريف', 'القناة 12', 'القناة 14',
                     'كان', 'القناة 13', 'غلوبز', 'كمين', 'ميركافا']:
            if src in summary:
                kw_set.add(src)

    for ir in data.get('iran', []):
        src = ir.get('source', '')
        if src:
            kw_set.add(src)
        summary = ir.get('summary', '')
        for term in ['الوعد الصادق', 'حرس الثورة', 'هرمز']:
            if term in summary:
                kw_set.add(term)

    for a in data.get('allies', []):
        flag = a.get('flag', '')
        if flag:
            kw_set.add(flag)

    # Add common weapon/tactic terms found in fullText of bayanat
    for b in data.get('bayanat', []):
        ft = b.get('fullText', '')
        for term in ['ميركافا', 'دبابة', 'جرافة', 'مروحية', 'طائرة',
                     'FPV', 'كمين', 'نار صديقة', 'مسيّرة', 'صلية صاروخية',
                     'مدفعية', 'صاروخ', 'قذائف', 'عبوة']:
            if term in ft:
                kw_set.add(term)

    # Add key location names from siren points
    for sp in data.get('sirenPoints', []):
        if sp.get('loc'):
            kw_set.add(sp['loc'])

    # Sort for deterministic output
    return ' '.join(sorted(kw_set))


# ═══════════════ COMPACT NORMALIZATION ═══════════════
# Only include structured fields (target, weapon, location, summary, source, flag)
# in the normalized search text — NOT fullText. This keeps the index under 2MB.
# Summary fields in enemy/iran/allies already capture the first 200 chars of fullText,
# so we lose almost nothing in search quality.

def _compact_norm(*parts):
    """Normalize structured fields only — no fullText."""
    return normalize(' '.join(filter(None, parts)))


# ═══════════════ SPOTLIGHT INDEX BUILDER ═══════════════
def build_spotlight_entry(data):
    """Build spotlight search index entries for one day's data."""
    date = data['date']
    dl = fmt_date_ar(date)
    entries = []

    categories = [
        ('bayanat', data.get('bayanat', []), lambda b, i: {
            't': b.get('opTime') or b.get('postTime', ''),
            'tt': b.get('target', ''),
            'st': '\u0628\u064a\u0627\u0646 #' + str(b.get('num', '')),
            'n': _compact_norm(b.get('target', ''), b.get('weapon', ''),
                             ' '.join(b.get('tags', []))),
            'tab': 'bayanat', 'i': i
        }),
        ('sirens', data.get('sirens', []), lambda s, i: {
            't': s.get('time', ''),
            'tt': s.get('location', ''),
            'st': '',
            'n': _compact_norm(s.get('location', '')),
            'tab': 'sirens', 'i': i
        }),
        ('enemy', data.get('enemy', []), lambda e, i: {
            't': e.get('time', ''),
            'tt': (e.get('summary', '') or '')[:80],
            'st': '',
            'n': _compact_norm(e.get('summary', '')),
            'tab': 'enemy', 'i': i
        }),
        ('iran', data.get('iran', []), lambda r, i: {
            't': r.get('time', ''),
            'tt': (r.get('summary', '') or '')[:80],
            'st': r.get('source', ''),
            'n': _compact_norm(r.get('source', ''), r.get('summary', '')),
            'tab': 'iran', 'i': i
        }),
        ('videos', data.get('videos', []), lambda v, i: {
            't': v.get('time', ''),
            'tt': (v.get('description', '') or '')[:80],
            'st': '',
            'n': _compact_norm(v.get('description', '')),
            'tab': 'videos', 'i': i
        }),
        ('allies', data.get('allies', []), lambda a, i: {
            't': a.get('time', ''),
            'tt': (a.get('summary', '') or '')[:80],
            'st': a.get('flag', ''),
            'n': _compact_norm(a.get('flag', ''), a.get('summary', '')),
            'tab': 'allies', 'i': i
        }),
    ]

    for cat_key, items, fn in categories:
        for idx, item in enumerate(items):
            entry = fn(item, idx)
            entry['c'] = cat_key
            entry['d'] = date
            # dl (dateLabel) computed in JS from date; tab == c always
            del entry['tab']
            entries.append(entry)

    return entries


# ═══════════════ MAIN ═══════════════
def main():
    # Find all data JSON files
    pattern = os.path.join(DATA_DIR, '????-??-??.json')
    files = sorted(glob(pattern))

    if not files:
        print('No data files found in ' + DATA_DIR)
        sys.exit(1)

    dates_asc = []  # oldest first
    stats = {}
    search_idx = {}
    spotlight_entries = []

    for fpath in files:
        date = os.path.basename(fpath).replace('.json', '')
        dates_asc.append(date)

        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Stats
        s = data.get('stats', {})
        bayanat = s.get('bayanat', s.get('b', len(data.get('bayanat', []))))
        sirens = s.get('sirens', s.get('s', len(data.get('sirens', []))))
        enemy = s.get('enemy', s.get('e', len(data.get('enemy', []))))
        iran = s.get('iran', s.get('ir', len(data.get('iran', []))))
        videos = s.get('videos', s.get('v', len(data.get('videos', []))))
        total = bayanat + sirens + enemy + iran + videos
        stats[date] = {'bayanat': bayanat, 'sirens': sirens, 'enemy': enemy, 'iran': iran, 'videos': videos, 'total': total}

        # Search keywords
        kw = extract_keywords(data)
        search_idx[date] = {'kw': kw, 'bayanat': bayanat, 'sirens': sirens, 'enemy': enemy, 'iran': iran, 'videos': videos}

        # Spotlight entries
        spotlight_entries.extend(build_spotlight_entry(data))

    dates_desc = list(reversed(dates_asc))  # newest first

    # ── 1. Write data/reports-meta.js ──
    meta_path = os.path.join(DATA_DIR, 'reports-meta.js')
    with open(meta_path, 'w', encoding='utf-8') as f:
        f.write('/* Auto-generated by build_index.py — do not edit */\n')
        # reports array (newest first)
        f.write('var reports = [\n')
        for d in dates_desc:
            f.write("  '{}',\n".format(d))
        f.write('];\n\n')

        # reportStats
        f.write('var reportStats = {\n')
        for d in dates_desc:
            s = stats[d]
            f.write("  '{}': {{bayanat:{}, sirens:{}, enemy:{}, iran:{}, videos:{}, total:{}}},\n".format(
                d, s['bayanat'], s['sirens'], s['enemy'], s['iran'], s['videos'], s['total']))
        f.write('};\n\n')

        # searchIndex
        f.write('var searchIndex = {\n')
        for d in dates_desc:
            si = search_idx[d]
            f.write("  '{}': {{kw:'{}',bayanat:{},sirens:{},enemy:{},iran:{},videos:{}}},\n".format(
                d, si['kw'].replace("'", "\\'"), si['bayanat'], si['sirens'], si['enemy'], si['iran'], si['videos']))
        f.write('};\n')

    print('Written {} ({} reports)'.format(meta_path, len(dates_desc)))

    # ── 2. Write data/spotlight-index.json ──
    spotlight_path = os.path.join(DATA_DIR, 'spotlight-index.json')
    with open(spotlight_path, 'w', encoding='utf-8') as f:
        json.dump(spotlight_entries, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = os.path.getsize(spotlight_path) / 1024
    print('Written {} ({} entries, {:.0f}KB)'.format(
        spotlight_path, len(spotlight_entries), size_kb))

    # ── 3. Regenerate src/js/ui/nav.js ──
    nav_path = os.path.join(BASE, 'src', 'js', 'ui', 'nav.js')
    all_reports_str = ','.join("'{}'".format(d) for d in dates_asc)

    nav_content = """/* === src/js/ui/nav.js — Auto-generated by build_index.py === */

export var ALL_REPORTS = [{all_reports}];

export var arabicMonthNames = {{1:'\\u0643\\u0627\\u0646\\u0648\\u0646 \\u0627\\u0644\\u062B\\u0627\\u0646\\u064A',2:'\\u0634\\u0628\\u0627\\u0637',3:'\\u0622\\u0630\\u0627\\u0631',4:'\\u0646\\u064A\\u0633\\u0627\\u0646',5:'\\u0623\\u064A\\u0627\\u0631',6:'\\u062D\\u0632\\u064A\\u0631\\u0627\\u0646',7:'\\u062A\\u0645\\u0648\\u0632',8:'\\u0622\\u0628',9:'\\u0623\\u064A\\u0644\\u0648\\u0644',10:'\\u062A\\u0634\\u0631\\u064A\\u0646 \\u0627\\u0644\\u0623\\u0648\\u0644',11:'\\u062A\\u0634\\u0631\\u064A\\u0646 \\u0627\\u0644\\u062B\\u0627\\u0646\\u064A',12:'\\u0643\\u0627\\u0646\\u0648\\u0646 \\u0627\\u0644\\u0623\\u0648\\u0644'}};

export var arabicDayNames = {{0:'\\u0627\\u0644\\u0623\\u062D\\u062F',1:'\\u0627\\u0644\\u0625\\u062B\\u0646\\u064A\\u0646',2:'\\u0627\\u0644\\u062B\\u0644\\u0627\\u062B\\u0627\\u0621',3:'\\u0627\\u0644\\u0623\\u0631\\u0628\\u0639\\u0627\\u0621',4:'\\u0627\\u0644\\u062E\\u0645\\u064A\\u0633',5:'\\u0627\\u0644\\u062C\\u0645\\u0639\\u0629',6:'\\u0627\\u0644\\u0633\\u0628\\u062A'}};

export function getCurrentReportDate() {{
  var match = window.location.pathname.match(/report-(\\d{{4}}-\\d{{2}}-\\d{{2}})/);
  if (match) return match[1];
  var params = new URLSearchParams(window.location.search);
  var dateParam = params.get('date');
  if (dateParam && dateParam.match(/^\\d{{4}}-\\d{{2}}-\\d{{2}}$/)) return dateParam;
  return null;
}}

export function reportUrl(date) {{
  if (window.location.pathname.indexOf('report.html') !== -1) {{
    return 'report.html?date=' + date;
  }}
  return 'report-' + date + '.html';
}}

export function formatDateAr(dateStr) {{
  var p = dateStr.split('-');
  var d = parseInt(p[2]);
  var m = parseInt(p[1]);
  return d + ' ' + (arabicMonthNames[m] || '');
}}

export function initNav() {{
  var current = getCurrentReportDate();
  if (!current) return;
  var idx = ALL_REPORTS.indexOf(current);
  if (idx === -1) return;

  var dateRow = document.querySelector('.header .date-row');
  if (!dateRow) return;

  // Next (newer) — first grid child, appears on the right in RTL
  var nextDate = idx < ALL_REPORTS.length - 1 ? ALL_REPORTS[idx + 1] : null;
  var nextBtn = document.createElement('a');
  nextBtn.className = 'day-nav-btn' + (nextDate ? '' : ' disabled');
  nextBtn.textContent = '\\u2192 ' + (nextDate ? formatDateAr(nextDate) : '');
  if (nextDate) nextBtn.href = reportUrl(nextDate);
  dateRow.insertBefore(nextBtn, dateRow.firstChild);

  // Previous (older) — last grid child, appears on the left in RTL
  var prevDate = idx > 0 ? ALL_REPORTS[idx - 1] : null;
  var prevBtn = document.createElement('a');
  prevBtn.className = 'day-nav-btn' + (prevDate ? '' : ' disabled');
  prevBtn.textContent = (prevDate ? formatDateAr(prevDate) : '') + ' \\u2190';
  if (prevDate) prevBtn.href = reportUrl(prevDate);
  dateRow.appendChild(prevBtn);

  // Counter slot (created empty by app.js renderReport)
  var counter = dateRow.querySelector('.day-nav-current');
  if (counter) counter.textContent = (idx + 1) + ' / ' + ALL_REPORTS.length;
}}
""".format(all_reports=all_reports_str)

    with open(nav_path, 'w', encoding='utf-8') as f:
        f.write(nav_content)

    print('Written {} ({} dates)'.format(nav_path, len(dates_asc)))

    # ── 4. Build SQLite database ──
    build_db_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_db.py')
    if os.path.exists(build_db_script):
        import subprocess
        print('\nBuilding SQLite database...')
        subprocess.run([sys.executable, build_db_script], check=True)

    # ── 5. Build search-facets.json for advanced search page ──
    facets_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_search_facets.py')
    if os.path.exists(facets_script):
        import subprocess
        print('\nBuilding search facets...')
        subprocess.run([sys.executable, facets_script], check=True)

    # Summary
    total_items = len(spotlight_entries)
    print('\nDone: {} reports, {} spotlight items'.format(len(dates_desc), total_items))


if __name__ == '__main__':
    main()
