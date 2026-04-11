#!/usr/bin/env python3
"""
Comprehensive data consistency validator for Harbi Reports.

Checks all data/*.json files for:
  1. Stats counts match actual array lengths
  2. Bayan numbering — sequential, no gaps, no duplicates
  3. Siren points — present when sirens exist, valid lat/lng
  4. Date field matches filename
  5. Required fields per category
  6. Day name accuracy (dayAr matches actual weekday)
  7. Titles / summaries not empty
  8. reports-meta.js coverage — all data files listed

Usage:
  python3 src/python/validate_data.py [--fix] [--json]
"""

import json
import os
import sys
import re
from glob import glob
from datetime import date as dt_date
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE, 'data')

FIX_MODE = '--fix' in sys.argv
JSON_MODE = '--json' in sys.argv

# ═══════════════ ARABIC HELPERS ═══════════════
ARABIC_DAYS_PY = {
    0: 'الإثنين', 1: 'الثلاثاء', 2: 'الأربعاء', 3: 'الخميس',
    4: 'الجمعة', 5: 'السبت', 6: 'الأحد'
}
ARABIC_MONTHS = {
    1: 'كانون الثاني', 2: 'شباط', 3: 'آذار', 4: 'نيسان',
    5: 'أيار', 6: 'حزيران', 7: 'تموز', 8: 'آب',
    9: 'أيلول', 10: 'تشرين الأول', 11: 'تشرين الثاني', 12: 'كانون الأول'
}
ARABIC_NUMS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

def to_arabic_num(n):
    return str(n).translate(ARABIC_NUMS)

def expected_day_ar(date_str):
    y, m, d = map(int, date_str.split('-'))
    return ARABIC_DAYS_PY[dt_date(y, m, d).weekday()]

def expected_date_ar(date_str):
    y, m, d = map(int, date_str.split('-'))
    return to_arabic_num(d) + ' ' + ARABIC_MONTHS[m] + ' ' + to_arabic_num(y)

# ═══════════════ SIREN COORDINATE LOOKUP ═══════════════
# Same as categorize.py — used to check if siren locations could have been geocoded
SIREN_COORDS = {
    'تل أبيب': (32.0853, 34.7818),
    'حيفا': (32.794, 34.9896),
    'كريات شمونة': (33.2081, 35.5731),
    'كريات شمونه': (33.2081, 35.5731),
    'نهاريا': (33.0042, 35.0968),
    'معالوت ترشيحا': (33.0167, 35.275),
    'صفد': (32.9646, 35.4967),
    'مسكافعام': (33.206, 35.575),
    'مسكاف عام': (33.206, 35.575),
    'أفيفيم': (33.058, 35.42),
    'يرؤون': (33.058, 35.42),
    'الكرمئيل': (32.9137, 35.2918),
    'ميرون': (32.98, 35.44),
    'المطلة': (33.28, 35.57),
    'المالكية': (33.24, 35.55),
    'المالكيّة': (33.24, 35.55),
    'كفار جلعادي': (33.225, 35.57),
    'كفاريوفال': (33.225, 35.57),
    'المنارة': (33.172, 35.582),
    'مرغليوت': (33.172, 35.582),
    'شلومي': (33.08, 35.15),
    'حانيتا': (33.08, 35.15),
    'الجليل الغربي': (33.05, 35.15),
    'الجليل الأعلى': (33.1, 35.45),
    'إصبع الجليل': (33.2, 35.57),
    'عكا': (32.9215, 35.0764),
    'الكريوت': (32.83, 35.07),
    'بئر السبع': (31.2518, 34.7913),
    'ديمونا': (31.0666, 35.0333),
    'الجولان': (32.95, 35.77),
    'القدس': (31.7683, 35.2137),
    'عسقلان': (31.6688, 34.5743),
    'النقب': (31.0, 34.85),
    'نتانيا': (32.3215, 34.8532),
    'نتيفوت': (31.4218, 34.5876),
    'عرب العرامشة': (33.07, 35.15),
    'غوش حلاف': (33.02, 35.53),
    'جيشر هزيف': (33.02, 35.14),
    'كابري': (33.02, 35.15),
    'تبنين': (33.12, 35.42),
    # Gaza envelope and southern locations
    'إيلات': (29.5577, 34.9519),
    'ايلات': (29.5577, 34.9519),
    'غلاف غزة': (31.35, 34.38),
    'نيرعام': (31.37, 34.40),
    'نير عام': (31.37, 34.40),
    'سديروت': (31.525, 34.596),
    'نتيف هعسراه': (31.55, 34.52),
    'نيريم': (31.30, 34.39),
    'كيسوفيم': (31.375, 34.40),
    'أسدود': (31.80, 34.65),
    'أشدود': (31.80, 34.65),
    'الخضيرة': (32.44, 34.92),
    'بئيري': (31.37, 34.47),
    'ناحال عوز': (31.44, 34.48),
    'كرم أبو سالم': (31.22, 34.27),
    'رامون': (29.73, 35.01),
    'بيت شان': (32.50, 35.50),
    'العفولة': (32.60, 35.29),
    'يفنه': (31.88, 34.74),
    'إيرز': (31.55, 34.53),
    'ايرز': (31.55, 34.53),
    'حوليت': (30.90, 34.38),
    'لاخيش': (31.56, 34.85),
    'حتسريم': (31.23, 34.73),
    'شوميرا': (33.08, 35.17),
}

def geocode_sirens(sirens):
    """Generate sirenPoints from siren locations using the coordinate lookup."""
    loc_data = defaultdict(lambda: {'count': 0, 'times': [], 'lat': 0, 'lng': 0})

    for s in sirens:
        loc_text = s.get('location', '')
        matched = False
        for name, (lat, lng) in SIREN_COORDS.items():
            if name in loc_text:
                key = name
                loc_data[key]['lat'] = lat
                loc_data[key]['lng'] = lng
                loc_data[key]['count'] += 1
                loc_data[key]['times'].append(s.get('time', ''))
                matched = True
                break

    points = []
    for loc, info in loc_data.items():
        if info['lat'] != 0:
            points.append({
                'loc': loc,
                'lat': info['lat'],
                'lng': info['lng'],
                'count': info['count'],
                'times': info['times']
            })

    return points

# ═══════════════ VALIDATORS ═══════════════

def validate_file(filepath):
    """Validate a single data JSON file. Returns list of issues."""
    filename = os.path.basename(filepath)
    date_from_file = filename.replace('.json', '')
    issues = []
    fixes_applied = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        return [{'date': date_from_file, 'category': 'parse', 'severity': 'error',
                 'message': f'Cannot parse file: {e}'}], []

    # ── 1. Date field matches filename ──
    if data.get('date') != date_from_file:
        issues.append({'date': date_from_file, 'category': 'date', 'severity': 'error',
                       'message': f"date field '{data.get('date')}' != filename '{date_from_file}'"})
        if FIX_MODE:
            data['date'] = date_from_file
            fixes_applied.append(f'Fixed date field to {date_from_file}')

    # ── 2. Day name accuracy ──
    try:
        exp_day = expected_day_ar(date_from_file)
        if data.get('dayAr') and data['dayAr'] != exp_day:
            issues.append({'date': date_from_file, 'category': 'dayAr', 'severity': 'warn',
                           'message': f"dayAr '{data['dayAr']}' should be '{exp_day}'"})
            if FIX_MODE:
                data['dayAr'] = exp_day
                fixes_applied.append(f'Fixed dayAr to {exp_day}')
    except ValueError:
        issues.append({'date': date_from_file, 'category': 'date', 'severity': 'error',
                       'message': f"Invalid date: {date_from_file}"})

    # ── 3. dateAr accuracy ──
    try:
        exp_date_ar = expected_date_ar(date_from_file)
        if data.get('dateAr') and data['dateAr'] != exp_date_ar:
            issues.append({'date': date_from_file, 'category': 'dateAr', 'severity': 'warn',
                           'message': f"dateAr '{data['dateAr']}' should be '{exp_date_ar}'"})
            if FIX_MODE:
                data['dateAr'] = exp_date_ar
                fixes_applied.append(f'Fixed dateAr to {exp_date_ar}')
    except (ValueError, KeyError):
        pass

    # ── 4. Stats vs actual array lengths ──
    stats = data.get('stats', {})
    arrays = {
        'bayanat': data.get('bayanat', []),
        'sirens': data.get('sirens', []),
        'enemy': data.get('enemy', []),
        'iran': data.get('iran', []),
        'videos': data.get('videos', []),
        'allies': data.get('allies', []),
    }

    for key, arr in arrays.items():
        actual_len = len(arr)
        # stats can use short keys (b, s, e, ir, v, al) or full keys
        short_keys = {'bayanat': 'b', 'sirens': 's', 'enemy': 'e',
                      'iran': 'ir', 'videos': 'v', 'allies': 'al'}
        stat_val = stats.get(key, stats.get(short_keys[key], None))

        if stat_val is None:
            # No stat entry — add one
            issues.append({'date': date_from_file, 'category': 'stats', 'severity': 'warn',
                           'message': f"Missing stats.{key} (actual: {actual_len})"})
            if FIX_MODE:
                stats[key] = actual_len
                fixes_applied.append(f'Added stats.{key} = {actual_len}')
        elif stat_val != actual_len:
            issues.append({'date': date_from_file, 'category': 'stats', 'severity': 'error',
                           'message': f"stats.{key}={stat_val} but actual array length={actual_len}"})
            if FIX_MODE:
                # Fix both full and short key
                if key in stats:
                    stats[key] = actual_len
                sk = short_keys[key]
                if sk in stats:
                    stats[sk] = actual_len
                fixes_applied.append(f'Fixed stats.{key} from {stat_val} to {actual_len}')

    # Ensure stats object exists and uses full keys
    if FIX_MODE:
        if 'stats' not in data:
            data['stats'] = {}
        for key, arr in arrays.items():
            data['stats'][key] = len(arr)

    # ── 5. Bayan numbering ──
    bayanat = data.get('bayanat', [])
    if bayanat:
        nums = [b.get('num') for b in bayanat if b.get('num') is not None]
        # Filter out communiqué-style bayans (num=0 with badge='communique')
        real_nums = [b.get('num') for b in bayanat
                     if b.get('num') is not None and b.get('num') != 0 and b.get('badge') != 'communique']

        if real_nums:
            # Check for duplicates
            seen = set()
            dupes = set()
            for n in real_nums:
                if n in seen:
                    dupes.add(n)
                seen.add(n)
            if dupes:
                issues.append({'date': date_from_file, 'category': 'bayan_num', 'severity': 'error',
                               'message': f"Duplicate bayan numbers: {sorted(dupes)}"})

            # Check sequence: should be 1..N
            expected_max = max(real_nums)
            expected_set = set(range(1, expected_max + 1))
            actual_set = set(real_nums)
            missing = expected_set - actual_set
            extra = actual_set - expected_set
            if missing:
                issues.append({'date': date_from_file, 'category': 'bayan_num', 'severity': 'warn',
                               'message': f"Missing bayan numbers in sequence: {sorted(missing)}"})
            if extra:
                issues.append({'date': date_from_file, 'category': 'bayan_num', 'severity': 'warn',
                               'message': f"Extra bayan numbers outside expected range: {sorted(extra)}"})

        # Check each bayan has required fields
        for idx, b in enumerate(bayanat):
            if not b.get('target') and not b.get('fullText'):
                issues.append({'date': date_from_file, 'category': 'bayan_field', 'severity': 'warn',
                               'message': f"Bayan #{b.get('num', idx)} missing both target and fullText"})
            if b.get('num') is None:
                issues.append({'date': date_from_file, 'category': 'bayan_field', 'severity': 'warn',
                               'message': f"Bayan at index {idx} missing 'num' field"})

    # ── 6. Siren points ──
    sirens = data.get('sirens', [])
    siren_points = data.get('sirenPoints', [])

    if sirens and not siren_points:
        # Check if any locations could be geocoded
        potential = geocode_sirens(sirens)
        if potential:
            issues.append({'date': date_from_file, 'category': 'siren_points', 'severity': 'error',
                           'message': f"Has {len(sirens)} sirens but no sirenPoints ({len(potential)} geocodable)"})
            if FIX_MODE:
                data['sirenPoints'] = potential
                fixes_applied.append(f'Generated {len(potential)} sirenPoints from {len(sirens)} sirens')
        else:
            issues.append({'date': date_from_file, 'category': 'siren_points', 'severity': 'warn',
                           'message': f"Has {len(sirens)} sirens but no sirenPoints (0 geocodable from known locations)"})

    if siren_points:
        for idx, pt in enumerate(siren_points):
            if not pt.get('lat') or not pt.get('lng'):
                issues.append({'date': date_from_file, 'category': 'siren_points', 'severity': 'error',
                               'message': f"sirenPoint[{idx}] missing lat/lng"})
            if not pt.get('loc'):
                issues.append({'date': date_from_file, 'category': 'siren_points', 'severity': 'warn',
                               'message': f"sirenPoint[{idx}] missing 'loc' name"})
            if pt.get('count', 0) < 1:
                issues.append({'date': date_from_file, 'category': 'siren_points', 'severity': 'warn',
                               'message': f"sirenPoint[{idx}] count is {pt.get('count', 0)}"})

    # ── 7. Siren required fields ──
    for idx, s in enumerate(sirens):
        if not s.get('location') and not s.get('fullText'):
            issues.append({'date': date_from_file, 'category': 'siren_field', 'severity': 'warn',
                           'message': f"Siren[{idx}] missing location and fullText"})
        if not s.get('time'):
            issues.append({'date': date_from_file, 'category': 'siren_field', 'severity': 'warn',
                           'message': f"Siren[{idx}] missing time"})

    # ── 8. Enemy required fields ──
    for idx, e in enumerate(data.get('enemy', [])):
        if not e.get('summary') and not e.get('fullText'):
            issues.append({'date': date_from_file, 'category': 'enemy_field', 'severity': 'warn',
                           'message': f"Enemy[{idx}] missing summary and fullText"})

    # ── 9. Iran required fields ──
    for idx, ir in enumerate(data.get('iran', [])):
        if not ir.get('summary') and not ir.get('fullText'):
            issues.append({'date': date_from_file, 'category': 'iran_field', 'severity': 'warn',
                           'message': f"Iran[{idx}] missing summary and fullText"})

    # ── 10. Videos required fields ──
    for idx, v in enumerate(data.get('videos', [])):
        if not v.get('description') and not v.get('fullText'):
            issues.append({'date': date_from_file, 'category': 'video_field', 'severity': 'warn',
                           'message': f"Video[{idx}] missing description and fullText"})

    # ── 11. Allies required fields ──
    for idx, a in enumerate(data.get('allies', [])):
        if not a.get('summary') and not a.get('fullText'):
            issues.append({'date': date_from_file, 'category': 'ally_field', 'severity': 'warn',
                           'message': f"Ally[{idx}] missing summary and fullText"})
        if not a.get('flag'):
            issues.append({'date': date_from_file, 'category': 'ally_field', 'severity': 'warn',
                           'message': f"Ally[{idx}] missing flag (country)"})

    # ── 12. Empty arrays that stats say should have data ──
    for key in ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies']:
        short_keys = {'bayanat': 'b', 'sirens': 's', 'enemy': 'e',
                      'iran': 'ir', 'videos': 'v', 'allies': 'al'}
        stat_val = stats.get(key, stats.get(short_keys[key], 0))
        if stat_val > 0 and key not in data:
            issues.append({'date': date_from_file, 'category': 'missing_array', 'severity': 'error',
                           'message': f"stats.{key}={stat_val} but '{key}' array is missing entirely"})

    # ── Save fixes if in FIX_MODE ──
    if FIX_MODE and fixes_applied:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')

    return issues, fixes_applied


def validate_meta():
    """Validate reports-meta.js covers all data files."""
    issues = []
    meta_path = os.path.join(DATA_DIR, 'reports-meta.js')

    if not os.path.exists(meta_path):
        issues.append({'date': 'global', 'category': 'meta', 'severity': 'error',
                       'message': 'reports-meta.js not found'})
        return issues

    with open(meta_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract dates from reports array
    meta_dates = set(re.findall(r"'(\d{4}-\d{2}-\d{2})'", content))

    # Get data file dates
    data_files = set(
        os.path.basename(f).replace('.json', '')
        for f in glob(os.path.join(DATA_DIR, '????-??-??.json'))
    )

    missing_in_meta = data_files - meta_dates
    extra_in_meta = meta_dates - data_files

    for d in sorted(missing_in_meta):
        issues.append({'date': d, 'category': 'meta', 'severity': 'error',
                       'message': f"Data file exists but NOT in reports-meta.js"})

    for d in sorted(extra_in_meta):
        issues.append({'date': d, 'category': 'meta', 'severity': 'error',
                       'message': f"In reports-meta.js but NO data file exists"})

    return issues


# ═══════════════ MAIN ═══════════════

def main():
    pattern = os.path.join(DATA_DIR, '????-??-??.json')
    files = sorted(glob(pattern))

    if not files:
        print('No data files found in', DATA_DIR)
        sys.exit(1)

    all_issues = []
    all_fixes = []
    file_count = len(files)

    print(f'Validating {file_count} data files...', file=sys.stderr)

    for i, fpath in enumerate(files):
        issues, fixes = validate_file(fpath)
        all_issues.extend(issues)
        all_fixes.extend(fixes)
        if (i + 1) % 100 == 0:
            print(f'  ... {i+1}/{file_count}', file=sys.stderr)

    # Meta validation
    meta_issues = validate_meta()
    all_issues.extend(meta_issues)

    # ── Output ──
    if JSON_MODE:
        print(json.dumps(all_issues, ensure_ascii=False, indent=2))
    else:
        # Summary by category
        by_cat = defaultdict(list)
        for iss in all_issues:
            by_cat[iss['category']].append(iss)

        errors = [i for i in all_issues if i['severity'] == 'error']
        warns = [i for i in all_issues if i['severity'] == 'warn']

        print(f'\n{"="*60}')
        print(f'  VALIDATION REPORT — {file_count} files')
        print(f'{"="*60}')
        print(f'  Errors: {len(errors)}')
        print(f'  Warnings: {len(warns)}')
        print(f'  Total issues: {len(all_issues)}')
        if FIX_MODE:
            print(f'  Fixes applied: {len(all_fixes)}')
        print(f'{"="*60}\n')

        # Group by category
        for cat in sorted(by_cat.keys()):
            items = by_cat[cat]
            errs = len([i for i in items if i['severity'] == 'error'])
            wrns = len([i for i in items if i['severity'] == 'warn'])
            print(f'\n── {cat} ({errs} errors, {wrns} warnings) ──')
            for iss in items[:50]:  # limit output per category
                sev = 'ERR' if iss['severity'] == 'error' else 'WRN'
                print(f"  [{sev}] {iss['date']}: {iss['message']}")
            if len(items) > 50:
                print(f'  ... and {len(items) - 50} more')

        # Dates with issues
        dates_with_issues = set(i['date'] for i in all_issues)
        clean_dates = file_count - len(dates_with_issues)
        print(f'\n{"="*60}')
        print(f'  Clean days: {clean_dates}/{file_count} ({100*clean_dates/file_count:.1f}%)')
        print(f'  Days with issues: {len(dates_with_issues)}')
        print(f'{"="*60}')


if __name__ == '__main__':
    main()
