#!/usr/bin/env python3
"""
Build monthly chronicle HTML pages from daily data files.

Generates one file per month in monthly/YYYY-MM.html.
Each page is a "War Chronicle" narrative page with:
  - Cover with month name and headline
  - Sticky stats ribbon
  - Lede paragraph
  - 3-5 "breaking moment" turning-point cards
  - Closing summary with stats grid

Usage:
  python3 src/python/build_monthly.py
"""

import json
import os
from glob import glob
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE, 'data')
OUT_DIR = os.path.join(BASE, 'monthly')

ARABIC_MONTHS = {
    1: 'كانون الثاني', 2: 'شباط', 3: 'آذار', 4: 'نيسان',
    5: 'أيار', 6: 'حزيران', 7: 'تموز', 8: 'آب',
    9: 'أيلول', 10: 'تشرين الأول', 11: 'تشرين الثاني', 12: 'كانون الأول'
}

ENGLISH_MONTHS = {
    1: 'JANUARY', 2: 'FEBRUARY', 3: 'MARCH', 4: 'APRIL',
    5: 'MAY', 6: 'JUNE', 7: 'JULY', 8: 'AUGUST',
    9: 'SEPTEMBER', 10: 'OCTOBER', 11: 'NOVEMBER', 12: 'DECEMBER'
}

CAT_COLORS = {
    'bayanat': ('var(--accent)', 'بيان عسكري', 'بيانات'),
    'sirens':  ('var(--red)',    'صفارة إنذار', 'صفارات'),
    'enemy':   ('var(--orange)', 'إعلام العدو', 'أخبار عدو'),
    'iran':    ('var(--purple)', 'إيران', 'إيران'),
    'videos':  ('var(--blue)',   'فيديو', 'فيديو'),
    'allies':  ('var(--green)',  'حلفاء', 'حلفاء'),
}


def load_month_data(year, month):
    prefix = f'{year}-{month:02d}'
    files = sorted(glob(os.path.join(DATA_DIR, f'{prefix}-*.json')))
    days = []
    for f in files:
        fname = os.path.basename(f)
        if fname.endswith('.json') and fname[:7] == prefix:
            date_str = fname.replace('.json', '')
            with open(f, 'r', encoding='utf-8') as fh:
                data = json.load(fh)
            days.append((date_str, data))
    return days


def aggregate_stats(days):
    totals = defaultdict(int)
    for _, data in days:
        stats = data.get('stats', {})
        for k, v in stats.items():
            totals[k] += v
    return dict(totals)


def day_total(data):
    stats = data.get('stats', {})
    return sum(stats.values())


def detect_turning_points(days, max_points=4):
    scored = [(date_str, data, day_total(data)) for date_str, data in days]
    scored.sort(key=lambda x: -x[2])
    top = scored[:max_points]
    top.sort(key=lambda x: x[0])
    return top


def dominant_category(data):
    stats = data.get('stats', {})
    if not stats:
        return 'bayanat'
    return max(stats, key=lambda k: stats.get(k, 0))


def generate_headline(data):
    stats = data.get('stats', {})
    total = sum(stats.values())
    bayanat = data.get('bayanat', [])
    targets = list(dict.fromkeys(b.get('target', '') for b in bayanat if b.get('target')))

    b = stats.get('bayanat', 0)
    s = stats.get('sirens', 0)

    if targets and len(targets) >= 3:
        return f'استهداف {targets[0]} و{targets[1]} و{targets[2]}'
    elif targets and len(targets) == 2:
        return f'استهداف {targets[0]} و{targets[1]}'
    elif targets:
        if s >= 10:
            return f'استهداف {targets[0]} — {s} صفارة إنذار'
        return f'استهداف {targets[0]} — {b} بيان عسكري'
    elif s >= 15:
        return f'{s} صفارة إنذار — {b} بيان عسكري'
    else:
        return f'{b} بيان عسكري — {s} صفارة إنذار'


def generate_prose(data, date_str):
    stats = data.get('stats', {})
    parts = []

    if stats.get('bayanat', 0) > 0:
        bayanat = data.get('bayanat', [])
        targets = list(dict.fromkeys(b.get('target', '') for b in bayanat if b.get('target')))
        if targets:
            target_text = ' و'.join(targets[:3])
            parts.append(f'المقاومة تستهدف {target_text} بالأسلحة الصاروخية والمدفعية.')
        parts.append(f'<strong>{stats["bayanat"]} بيان عسكري</strong> صدر في هذا اليوم.')

    if stats.get('sirens', 0) > 0:
        parts.append(f'<strong>{stats["sirens"]} صفارة إنذار</strong> دوّت في مستوطنات الشمال.')

    if stats.get('enemy', 0) > 0:
        parts.append(f'إعلام العدو تناول {stats["enemy"]} خبراً عن تداعيات العمليات.')

    return ' '.join(parts)


def generate_brief(days, totals, num_days, month_ar, year, prev_totals):
    """Generate a natural narrative brief about the month, like someone telling you what happened."""
    b = totals.get('bayanat', 0)
    s = totals.get('sirens', 0)
    e = totals.get('enemy', 0)

    # Top targets
    target_counts = {}
    for _, data in days:
        for item in data.get('bayanat', []):
            t = item.get('target', '').strip()
            if t:
                target_counts[t] = target_counts.get(t, 0) + 1
    top_targets = sorted(target_counts.items(), key=lambda x: -x[1])

    # Top weapons
    weapon_counts = {}
    for _, data in days:
        for item in data.get('bayanat', []):
            w = item.get('weapon', '').strip()
            if w:
                weapon_counts[w] = weapon_counts.get(w, 0) + 1
    top_weapons = sorted(weapon_counts.items(), key=lambda x: -x[1])

    # Trend vs previous month
    trend = ''
    if prev_totals:
        prev_total = sum(prev_totals.values())
        curr_total = sum(totals.values())
        if prev_total > 0:
            change = round((curr_total - prev_total) / prev_total * 100)
            if change >= 30:
                trend = 'شهد هذا الشهر تصعيداً ملحوظاً مقارنة بسابقه. '
            elif change <= -30:
                trend = 'شهد هذا الشهر تراجعاً في وتيرة العمليات مقارنة بسابقه. '

    parts = []

    # Opening with trend if any
    if trend:
        parts.append(trend)

    # Where operations focused
    if len(top_targets) >= 3:
        parts.append(f'ركّزت المقاومة عملياتها على <strong>{top_targets[0][0]}</strong> و<strong>{top_targets[1][0]}</strong> و<strong>{top_targets[2][0]}</strong>،')
    elif len(top_targets) >= 2:
        parts.append(f'ركّزت المقاومة عملياتها على <strong>{top_targets[0][0]}</strong> و<strong>{top_targets[1][0]}</strong>،')
    elif len(top_targets) >= 1:
        parts.append(f'ركّزت المقاومة عملياتها على <strong>{top_targets[0][0]}</strong>،')
    else:
        parts.append(f'واصلت المقاومة عملياتها على طول الجبهة،')

    # What weapons
    if top_weapons:
        parts.append(f'باستخدام <strong>{top_weapons[0][0]}</strong> بشكل رئيسي.')
    else:
        parts.append('بالأسلحة الصاروخية والمدفعية.')

    # Sirens
    if s > 0:
        peak_siren_day = max(days, key=lambda d: d[1].get('stats', {}).get('sirens', 0))
        peak_val = peak_siren_day[1].get('stats', {}).get('sirens', 0)
        if peak_val >= 15:
            parts.append(f'صفارات الإنذار لم تتوقف في مستوطنات الشمال، وبلغت ذروتها بـ{peak_val} صفارة في يوم واحد.')
        else:
            parts.append(f'صفارات الإنذار دوّت في مستوطنات الشمال بشكل متواصل.')

    # Enemy coverage
    if e > 0:
        parts.append(f'إعلام العدو رصد تداعيات العمليات على مدى الشهر.')

    # Allies / Iran
    if totals.get('allies', 0) > 0 and totals.get('iran', 0) > 0:
        parts.append(f'جبهات الإسناد والمحور الإيراني كانا حاضرين في المشهد.')
    elif totals.get('allies', 0) > 0:
        parts.append(f'جبهات الإسناد شاركت في العمليات خلال الشهر.')

    return ' '.join(parts)


def month_number(year, month):
    return (year - 2023) * 12 + month - 9


def get_adjacent_months(year, month, all_months):
    key = f'{year}-{month:02d}'
    idx = all_months.index(key) if key in all_months else -1
    prev_key = all_months[idx - 1] if idx > 0 else None
    next_key = all_months[idx + 1] if idx < len(all_months) - 1 else None
    return prev_key, next_key


def color_for_day(data):
    dom = dominant_category(data)
    return CAT_COLORS.get(dom, CAT_COLORS['bayanat'])[0]


def tp_label_ar(index):
    labels = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة']
    return labels[index] if index < len(labels) else f'رقم {index + 1}'


def generate_month_picker(all_months, current_ym, month_stats=None):
    """Generate a month picker grid grouped by year with hover tooltips."""
    from collections import OrderedDict
    if month_stats is None:
        month_stats = {}
    years = OrderedDict()
    for ym in all_months:
        y = ym[:4]
        if y not in years:
            years[y] = []
        years[y].append(ym)

    html = ''
    for y, yms in years.items():
        html += f'<div class="mc-picker-year">{y}</div>\n<div class="mc-picker-months">\n'
        for m_num in range(1, 13):
            ym_key = f'{y}-{m_num:02d}'
            m_ar = ARABIC_MONTHS[m_num]
            if ym_key in yms:
                cls = 'mc-picker-btn current' if ym_key == current_ym else 'mc-picker-btn'
                st = month_stats.get(ym_key, {})
                days_count = st.get('days', 0)
                b = st.get('bayanat', 0)
                s = st.get('sirens', 0)
                tooltip = f'{b} بيان · {s} صفارة'
                html += f'<a class="{cls}" href="{ym_key}.html" data-tip="{tooltip}">{m_ar}<span class="mc-picker-sub">{ym_key}</span></a>\n'
            else:
                html += f'<span class="mc-picker-btn disabled">{m_ar}</span>\n'
        html += '</div>\n'
    return html


def render_page(year, month, days, totals, turning_points, prev_month, next_month, prev_totals=None, prev_num_days=0, all_months=None, month_stats=None):
    month_ar = ARABIC_MONTHS[month]
    month_en = ENGLISH_MONTHS[month]
    war_month = month_number(year, month)
    num_days = len(days)

    # Narrative brief
    brief = generate_brief(days, totals, num_days, month_ar, year, prev_totals)

    # Month picker
    current_ym = f'{year}-{month:02d}'
    picker_html = generate_month_picker(all_months or [], current_ym, month_stats)

    # Build turning point HTML blocks
    tp_blocks = []
    for i, (date_str, data, score) in enumerate(turning_points):
        day_num = int(date_str.split('-')[2])
        color = color_for_day(data)
        headline = generate_headline(data)
        prose = generate_prose(data, date_str)
        stats = data.get('stats', {})

        stat_items = []
        for cat in ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies']:
            val = stats.get(cat, 0)
            if val > 0:
                cat_color, cat_label, _ = CAT_COLORS[cat]
                stat_items.append(
                    f'<div class="mc-bf-stat">'
                    f'<div class="mc-bf-dot" style="background:{cat_color};"></div>'
                    f'<div class="mc-bf-text">{val} {cat_label}</div>'
                    f'</div>'
                )

        tp_blocks.append(f'''
<div class="mc-breaking mc-rv">
  <div class="mc-brk-bar">
    <div class="mc-brk-dot" style="color:{color};background:{color};"></div>
    <div class="mc-brk-label" style="color:{color};">المحطة {tp_label_ar(i)}</div>
    <div class="mc-brk-line" style="background:{color};"></div>
  </div>
  <div class="mc-brk-card">
    <div class="mc-brk-accent" style="background:{color};"></div>
    <div class="mc-brk-body">
      <div class="mc-brk-date" style="color:{color};">{day_num} {month_en} {year} <span style="opacity:.4;font-size:10px;margin-right:6px;">{day_num:02d}/{month:02d}/{year}</span></div>
      <div class="mc-brk-title">{headline}</div>
      <div class="mc-brk-prose">{prose}</div>
    </div>
    <div class="mc-brk-footer">
      {''.join(stat_items)}
    </div>
  </div>
</div>
''')

    tp_html = ''
    for i, block in enumerate(tp_blocks):
        tp_html += block

    # Ribbon items
    rib_items = ''
    for cat in ['bayanat', 'sirens', 'enemy', 'videos']:
        val = totals.get(cat, 0)
        if val > 0:
            cat_color, _, cat_label_short = CAT_COLORS[cat]
            rib_items += f'''
    <div class="mc-rib-item">
      <div class="mc-rib-val" data-count="{val}" style="color:{cat_color};">0</div>
      <div class="mc-rib-lbl">{cat_label_short}</div>
    </div>'''
    rib_items += f'''
    <div class="mc-rib-item">
      <div class="mc-rib-val" data-count="{num_days}">0</div>
      <div class="mc-rib-lbl">يوم</div>
    </div>'''

    # Closing grid
    closing_cards = ''
    for cat in ['bayanat', 'sirens', 'enemy', 'videos', 'iran', 'allies']:
        val = totals.get(cat, 0)
        if val > 0:
            cat_color, cat_label, _ = CAT_COLORS[cat]
            closing_cards += f'''
      <div class="mc-cg-card">
        <div class="mc-cg-val" style="color:{cat_color};">{val}</div>
        <div class="mc-cg-lbl">{cat_label}</div>
      </div>'''

    # Nav buttons
    nav_html = '<div class="mc-nav mc-rv">'
    if next_month:
        ny, nm = int(next_month[:4]), int(next_month[5:])
        nav_html += f'<a class="mc-nav-btn" href="{next_month}.html" style="border-color:var(--accent);color:var(--accent);">\u2192 {ARABIC_MONTHS[nm]} {ny}<br><span style="opacity:.4;font-size:10px;direction:ltr;display:inline-block;">{nm:02d}/{ny}</span></a>'
    if prev_month:
        py, pm = int(prev_month[:4]), int(prev_month[5:])
        nav_html += f'<a class="mc-nav-btn" href="{prev_month}.html">{ARABIC_MONTHS[pm]} {py} \u2190<br><span style="opacity:.4;font-size:10px;direction:ltr;display:inline-block;">{pm:02d}/{py}</span></a>'
    nav_html += '</div>'

    closing_end = ''

    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{month_ar} {year} \u2014 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062d\u0631\u0628\u064a</title>
<link rel="stylesheet" href="../src/css/index.css"/>
<link rel="stylesheet" href="../src/css/enhancements.css"/>
<link rel="stylesheet" href="../src/css/monthly.css"/>
<link rel="stylesheet" href="../src/css/navbar.css"/>
<link rel="stylesheet" href="../src/css/spotlight.css"/>
<script>
  if (localStorage.getItem('harbi-theme') !== 'dark') document.body.classList.add('light');
</script>
</head>
<body>

<div class="mc-progress"></div>

<section class="mc-cover">
  <div class="mc-rule"></div>
  <div class="mc-issue">\u0627\u0644\u0639\u062f\u062f {war_month} \u2014 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062d\u0631\u0628\u064a</div>
  <div class="mc-month">{month_ar} {year}</div>
  <div class="mc-en">{month_en} {year} <span style="opacity:.4;font-size:12px;margin-left:8px;">{month:02d}/{year}</span></div>
  <div class="mc-headline">\u0627\u0644\u0634\u0647\u0631 {war_month} \u0645\u0646 \u0627\u0644\u062d\u0631\u0628 \u00b7 {num_days} \u064a\u0648\u0645 \u062a\u063a\u0637\u064a\u0629</div>
  <div class="mc-scroll-hint"><span>\u0645\u0631\u0651\u0631 \u0644\u0644\u0623\u0633\u0641\u0644</span><div class="mc-arr"></div></div>
</section>

<div class="mc-ribbon">
  {rib_items}
</div>

<div class="mc-article">
  <div class="mc-lede mc-rv">{brief}</div>
</div>

{tp_html}

<div class="mc-closing mc-rv">
  <div class="mc-closing-title">\u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0641\u0635\u0644 {war_month}</div>
  <div class="mc-closing-text">
    <strong>{totals.get("bayanat", 0)} \u0628\u064a\u0627\u0646. {totals.get("sirens", 0)} \u0635\u0641\u0627\u0631\u0629. {totals.get("enemy", 0)} \u062e\u0628\u0631 \u0639\u062f\u0648.</strong>
  </div>
  <div class="mc-closing-grid">{closing_cards}</div>
  <div class="mc-closing-end">{closing_end}</div>
</div>

{nav_html}

<div class="mc-picker mc-rv">
  <button class="mc-picker-toggle" onclick="var g=document.getElementById('mcPickerGrid');g.classList.toggle('open');this.textContent=g.classList.contains('open')?'\u0625\u062e\u0641\u0627\u0621':'\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0634\u0647\u0631 \u0622\u062e\u0631';">\u0625\u062e\u0641\u0627\u0621</button>
  <div class="mc-picker-grid open" id="mcPickerGrid">
    {picker_html}
  </div>
</div>

<div class="mc-footer">
  <div>\u0645\u0635\u062f\u0631: <a href="https://t.me/C_Military1" target="_blank" rel="noopener">\u0642\u0646\u0627\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062d\u0631\u0628\u064a \u2014 \u0627\u0644\u062a\u063a\u0637\u064a\u0629 \u0627\u0644\u0625\u062e\u0628\u0627\u0631\u064a\u0629</a></div>
  <div style="margin-top:8px;font-size:0.68rem;opacity:0.8;line-height:1.6;">
    \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 <strong>\u063a\u064a\u0631 \u0631\u0633\u0645\u064a</strong> \u0648\u0644\u0627 \u064a\u062a\u0628\u0639 \u0642\u0646\u0627\u0629 \u00ab\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062d\u0631\u0628\u064a\u00bb \u0648\u0644\u0627 \u0623\u064a \u062c\u0647\u0629 \u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0647\u0627.
    \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0623\u062e\u0648\u0630\u0629 \u0645\u0646 \u062a\u0644\u064a\u063a\u0631\u0627\u0645 \u0648\u0645\u064f\u0639\u0627\u0644\u064e\u062c\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u2014 \u0642\u062f \u062a\u062d\u062a\u0648\u064a \u0639\u0644\u0649 \u0623\u062e\u0637\u0627\u0621.
  </div>
  <div data-disclaimer-slot style="margin-top:10px;font-size:0.68rem;">
    <span style="display:inline-block;font-size:0.6rem;opacity:0.55;direction:ltr;cursor:pointer;"
      onclick="window.location='../index.html'">Harbi Reports v2.2.5</span>
  </div>
</div>

<script type="module">
  import {{ initNavbar }} from '../src/js/ui/navbar.js';
  initNavbar();
</script>
<script src="../src/js/ui/disclaimer.js?v=2.2.5"></script>
<script src="../src/js/monthly.js"></script>
</body>
</html>
'''


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    files = sorted(glob(os.path.join(DATA_DIR, '????-??-??.json')))
    months = defaultdict(list)
    for f in files:
        fname = os.path.basename(f).replace('.json', '')
        if len(fname) == 10:
            ym = fname[:7]
            months[ym].append(f)

    all_months = sorted(months.keys())
    print(f'Found {len(all_months)} months to process')

    # First pass: collect stats for picker tooltips
    month_data_cache = {}
    month_stats = {}
    for ym in all_months:
        year, month = int(ym[:4]), int(ym[5:])
        days = load_month_data(year, month)
        if not days:
            continue
        totals = aggregate_stats(days)
        month_data_cache[ym] = (days, totals)
        month_stats[ym] = {'days': len(days), **totals}

    # Second pass: generate pages
    prev_totals = None
    prev_num_days = 0

    for ym in all_months:
        if ym not in month_data_cache:
            continue
        year, month = int(ym[:4]), int(ym[5:])
        days, totals = month_data_cache[ym]
        turning_points = detect_turning_points(days, max_points=4)
        prev_month, next_month = get_adjacent_months(year, month, all_months)

        html = render_page(year, month, days, totals, turning_points, prev_month, next_month, prev_totals, prev_num_days, all_months, month_stats)

        prev_totals = totals
        prev_num_days = len(days)

        out_path = os.path.join(OUT_DIR, f'{ym}.html')
        with open(out_path, 'w', encoding='utf-8') as fh:
            fh.write(html)
        print(f'  \u2713 {ym} \u2014 {len(days)} days, {sum(totals.values())} total events')

    print(f'Done. Generated {len(all_months)} monthly chronicle pages in monthly/')


if __name__ == '__main__':
    main()
