#!/usr/bin/env python3
"""
Fix all data consistency issues found by validate_data.py.

Fixes:
  1. Stats mismatches — sync stats to actual array lengths
  2. dateAr — convert to Arabic numerals
  3. dayAr — correct weekday names
  4. Siren points — generate from known geocoded locations
  5. Bayan spillover — move late-night next-day bayans to correct file

Usage:
  python3 src/python/fix_data.py [--dry-run]
"""

import json
import os
import sys
import re
from glob import glob
from datetime import date as dt_date, timedelta
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE, 'data')
DRY_RUN = '--dry-run' in sys.argv

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

def next_date(date_str):
    y, m, d = map(int, date_str.split('-'))
    nd = dt_date(y, m, d) + timedelta(days=1)
    return nd.strftime('%Y-%m-%d')

def prev_date(date_str):
    y, m, d = map(int, date_str.split('-'))
    pd = dt_date(y, m, d) - timedelta(days=1)
    return pd.strftime('%Y-%m-%d')


# ═══════════════ SIREN GEOCODING ═══════════════
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
    """Generate sirenPoints from siren locations."""
    loc_data = defaultdict(lambda: {'count': 0, 'times': [], 'lat': 0, 'lng': 0})
    for s in sirens:
        loc_text = s.get('location', '')
        for name, (lat, lng) in SIREN_COORDS.items():
            if name in loc_text:
                loc_data[name]['lat'] = lat
                loc_data[name]['lng'] = lng
                loc_data[name]['count'] += 1
                loc_data[name]['times'].append(s.get('time', ''))
                break
    points = []
    for loc, info in loc_data.items():
        if info['lat'] != 0:
            points.append({
                'loc': loc, 'lat': info['lat'], 'lng': info['lng'],
                'count': info['count'], 'times': info['times']
            })
    return points


# ═══════════════ FILE I/O ═══════════════

def load_data(date_str):
    path = os.path.join(DATA_DIR, date_str + '.json')
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(date_str, data):
    if DRY_RUN:
        return
    path = os.path.join(DATA_DIR, date_str + '.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


# ═══════════════ FIX: BAYAN SPILLOVER ═══════════════

def fix_bayan_spillover(date_str, data):
    """Detect and move next-day bayans that spilled into current day.

    Detection strategy: find the point near the end of the array where bayan
    numbers abruptly drop (e.g., ...54, 55, 1, 2, 3). The entries after the
    drop are spillover from the next day. We require the drop entries to have
    late postTimes (>= 22:30) and nums much smaller than the preceding sequence.
    """
    bayanat = data.get('bayanat', [])
    if len(bayanat) < 2:
        return 0

    # Find the restart point: walk backwards from the end, looking for where
    # num abruptly drops. Compare against the nearest earlier entry with num>0
    # (skip num=0 Iraqi/unnumbered bayans that would otherwise break detection).
    restart_idx = None
    for i in range(len(bayanat) - 1, 0, -1):
        cur = bayanat[i]
        cur_num = cur.get('num', 0)
        if cur.get('badge') == 'communique' or cur_num <= 0:
            continue
        # Find nearest earlier entry with num>0 that isn't a communique
        prev_num = 0
        for j in range(i - 1, -1, -1):
            p = bayanat[j]
            if p.get('badge') == 'communique':
                continue
            pn = p.get('num', 0)
            if pn > 0:
                prev_num = pn
                break
        if prev_num > 0 and prev_num - cur_num >= 5:
            restart_idx = i
            break

    if restart_idx is None:
        return 0

    spillover = bayanat[restart_idx:]
    main = bayanat[:restart_idx]

    if not main:
        return 0

    # Verify numbered spillover entries have late times (>= 21:00). Lowered from
    # 22:00 to 21:00 after observing 2024-11-09 where restart happened at 21:19.
    # num=0 entries (Iraqi/unnumbered) in the spillover tail get a pass — they
    # belong with whichever day the numbered entries do.
    all_late = all(
        b.get('postTime', '00:00') >= '21:00' or b.get('num', 0) <= 0
        for b in spillover
    )
    if not all_late:
        return 0

    # Move spillover to next day
    nxt = next_date(date_str)
    nxt_data = load_data(nxt)
    if nxt_data is None:
        # Create a minimal next-day file
        print(f'  Creating {nxt}.json for spillover')
        try:
            exp_day = expected_day_ar(nxt)
            exp_date = expected_date_ar(nxt)
        except (ValueError, KeyError):
            exp_day = ''
            exp_date = ''
        nxt_data = {
            'date': nxt,
            'dayAr': exp_day,
            'dateAr': exp_date,
            'hijri': '',
            'stats': {'bayanat': 0, 'sirens': 0, 'enemy': 0, 'iran': 0, 'videos': 0, 'allies': 0},
            'bayanat': [], 'sirens': [], 'enemy': [], 'iran': [], 'videos': [], 'allies': []
        }

    # Prepend spillover bayans to next day (they are the earliest entries)
    existing_bayanat = nxt_data.get('bayanat', [])
    nxt_data['bayanat'] = spillover + existing_bayanat

    # Remove spillover from current day
    data['bayanat'] = main

    # Save both
    save_data(date_str, data)
    save_data(nxt, nxt_data)

    moved = len(spillover)
    print(f'  Moved {moved} spillover bayan(s) from {date_str} → {nxt}')
    return moved


def fix_bayan_spillback(date_str, data):
    """Detect and move prev-day bayans that spilled back into current day.

    The channel often posts the previous day's final communiqué just past
    midnight UTC (e.g. num=39 at 00:00 on the day after the 38 was posted
    at 23:55). Detection: bayanat[0] has postTime < 02:00 AND num > 3 AND
    the previous day's last bayan has num == current.num - 1 (or close).
    """
    bayanat = data.get('bayanat', [])
    if not bayanat:
        return 0

    first = bayanat[0]
    first_time = first.get('postTime', '23:59')
    first_num = first.get('num', 0)

    # Must be an early-morning (<02:00) post with a non-restart num
    if first_time >= '02:00' or first_num <= 3:
        return 0

    prev = prev_date(date_str)
    prev_data = load_data(prev)
    if prev_data is None:
        return 0

    prev_bayanat = prev_data.get('bayanat', [])
    if not prev_bayanat:
        return 0

    prev_last_num = prev_bayanat[-1].get('num', 0)

    # Must continue the previous day's sequence (within 2)
    if first_num - prev_last_num not in (1, 2):
        return 0

    # Move just the first entry back
    spillback = [first]
    data['bayanat'] = bayanat[1:]
    prev_data['bayanat'] = prev_bayanat + spillback

    save_data(date_str, data)
    save_data(prev, prev_data)

    print(f'  Moved 1 spillback bayan from {date_str} → {prev} (num={first_num} @ {first_time})')
    return 1


# ═══════════════ FIX: STATS ═══════════════

def fix_stats(date_str, data):
    """Sync stats to actual array lengths."""
    fixed = 0
    stats = data.get('stats', {})
    categories = ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies']
    short_keys = {'bayanat': 'b', 'sirens': 's', 'enemy': 'e',
                  'iran': 'ir', 'videos': 'v', 'allies': 'al'}

    for key in categories:
        actual = len(data.get(key, []))
        sk = short_keys[key]
        stat_val = stats.get(key, stats.get(sk, None))

        if stat_val != actual:
            if key in stats:
                stats[key] = actual
            if sk in stats:
                stats[sk] = actual
            # Always ensure full key exists
            stats[key] = actual
            fixed += 1

    data['stats'] = stats
    return fixed


# ═══════════════ FIX: DATE/DAY ═══════════════

def fix_dates(date_str, data):
    """Fix dayAr and dateAr."""
    fixed = 0
    try:
        exp_day = expected_day_ar(date_str)
        if data.get('dayAr') != exp_day:
            data['dayAr'] = exp_day
            fixed += 1

        exp_date = expected_date_ar(date_str)
        if data.get('dateAr') != exp_date:
            data['dateAr'] = exp_date
            fixed += 1
    except (ValueError, KeyError):
        pass

    if data.get('date') != date_str:
        data['date'] = date_str
        fixed += 1

    return fixed


# ═══════════════ FIX: SIREN POINTS ═══════════════

def fix_siren_points(date_str, data):
    """Generate sirenPoints where missing and geocodable."""
    sirens = data.get('sirens', [])
    siren_points = data.get('sirenPoints', [])

    if sirens and not siren_points:
        points = geocode_sirens(sirens)
        if points:
            data['sirenPoints'] = points
            return len(points)
    return 0


# ═══════════════ MAIN ═══════════════

def main():
    pattern = os.path.join(DATA_DIR, '????-??-??.json')
    files = sorted(glob(pattern))
    total = len(files)
    print(f'{"[DRY RUN] " if DRY_RUN else ""}Processing {total} files...\n')

    total_fixes = {
        'bayan_spillover': 0,
        'stats': 0,
        'dates': 0,
        'siren_points': 0,
        'files_modified': 0,
    }

    # ── Phase 1: Fix bayan spillover (must run first, changes arrays) ──
    print('Phase 1: Fixing bayan spillover...')
    # Process in chronological order so spillover cascades correctly
    for fpath in files:
        date_str = os.path.basename(fpath).replace('.json', '')
        data = load_data(date_str)
        if data is None:
            continue
        moved = fix_bayan_spillover(date_str, data)
        if moved:
            total_fixes['bayan_spillover'] += moved
            total_fixes['files_modified'] += 1

    # ── Phase 1b: Fix bayan spillback (midnight posts belonging to prev day) ──
    print('\nPhase 1b: Fixing bayan spillback...')
    files = sorted(glob(pattern))  # reload — spillover may have created files
    for fpath in files:
        date_str = os.path.basename(fpath).replace('.json', '')
        data = load_data(date_str)
        if data is None:
            continue
        moved = fix_bayan_spillback(date_str, data)
        if moved:
            total_fixes['bayan_spillover'] += moved
            total_fixes['files_modified'] += 1

    # ── Phase 2: Fix everything else (reload all files since phase 1 changed some) ──
    print('\nPhase 2: Fixing stats, dates, siren points...')
    files = sorted(glob(pattern))  # re-scan in case new files appeared

    for fpath in files:
        date_str = os.path.basename(fpath).replace('.json', '')
        data = load_data(date_str)
        if data is None:
            continue

        modified = False

        # Fix dates
        date_fixes = fix_dates(date_str, data)
        if date_fixes:
            total_fixes['dates'] += date_fixes
            modified = True

        # Fix stats
        stat_fixes = fix_stats(date_str, data)
        if stat_fixes:
            total_fixes['stats'] += stat_fixes
            modified = True

        # Fix siren points
        sp_fixes = fix_siren_points(date_str, data)
        if sp_fixes:
            total_fixes['siren_points'] += sp_fixes
            modified = True

        if modified:
            save_data(date_str, data)
            total_fixes['files_modified'] += 1

    # ── Summary ──
    print(f'\n{"="*50}')
    print(f'  FIX SUMMARY {"(DRY RUN)" if DRY_RUN else ""}')
    print(f'{"="*50}')
    print(f'  Bayan spillover moved: {total_fixes["bayan_spillover"]}')
    print(f'  Stats corrected:       {total_fixes["stats"]}')
    print(f'  Dates corrected:       {total_fixes["dates"]}')
    print(f'  Siren points added:    {total_fixes["siren_points"]}')
    print(f'  Files modified:        {total_fixes["files_modified"]}')
    print(f'{"="*50}')


if __name__ == '__main__':
    main()
