#!/usr/bin/env python3
"""Aggregate strike/loss statistics across a date range — replicates the
Hezbollah "الحصاد العام للعمليات العسكرية" infographic schema.

Source: `bayanat[]` only.
  - `bayan_type == "statement"` is excluded.
  - `bayan_type == "list_strikes"`: each entry in `strikes[]` counts as one strike.
  - `bayan_type == "defensive"`: one defensive op; counter-advance / counter-landing
    recognised via keyword on fullText.
  - All other combat bayanat count as one strike.

Equipment losses (tanks, hummers, bulldozers, Hermes, choppers…) and casualty
numbers are extracted from bayan fullText ONLY. `enemy[]` is intentionally not
scanned: the same incident is echoed across multiple channels (Al-Manar,
Al-Mayadeen, IDF statement, wire agencies) and summing regex hits across those
echoes inflates counts 3-5× versus reality. Bayan claims give one authoritative
mention per incident.

Usage:
    python3 src/python/aggregate_stats.py <from> <to> [--out path]

Output: JSON with target-type counts, weapon-family counts, enemy losses,
offensive/defensive split, daily averages, and max-in-one-day.
"""
import argparse, glob, json, os, re, sys
from collections import Counter, defaultdict
from datetime import date, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        '..', 'data')
DATA_DIR = os.path.normpath(DATA_DIR)

# Re-use the Israeli / settlement coordinate lookup from categorize.py as a
# "known Israeli location" set for target classification.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from categorize import SIREN_COORDS
ISRAELI_LOCATIONS = set(SIREN_COORDS.keys())

# Lebanese border towns — resistance strikes targeting enemy troops inside
# these towns are counter-advance operations, not outward strikes.
LEBANESE_BORDER_TOWNS = {
    'الطيبة', 'الخيام', 'البياضة', 'البيّاضة', 'القنطرة', 'عيناتا', 'عيناثا',
    'دير سريان', 'بنت جبيل', 'كفركلا', 'كفر كلا', 'مارون الراس', 'مارون الرأس',
    'دبل', 'بيت ليف', 'مركبا', 'القوزح', 'جديدة ميس الجبل', 'ميس الجبل',
    'شمع', 'رشاف', 'يارون', 'يارين', 'عيترون', 'حولا', 'الضهيرة', 'العديسة',
    'العباد', 'المالكية', 'المالكيّة', 'معتقل الخيام', 'مشروع الطيبة',
    'العيشية', 'حانين', 'طيبة', 'بليدا', 'الناقورة', 'الطيري', 'الخيام الحدوديّة',
    'عيتا الشعب', 'راميه', 'شبعا', 'كفرشوبا', 'حاصبيا', 'تبنين',
    'المنصوري', 'النبطية', 'علما الشعب', 'البقاع', 'البقاع الغربي', 'الجنوب',
    'مشروع الليطاني', 'الليطاني', 'الزاعورة', 'عين إبل', 'عين ابل', 'خربة ماعر',
    'ساحة البلدة', 'بوابة فاطمة',
}

# Small punctuation-normalization for Arabic (so "عكّا" matches "عكا")
def _normalize_ar(s):
    if not s: return ''
    return re.sub(r'[ّ\u064B-\u0652]', '', s)
ISRAELI_LOCATIONS_NORM = {_normalize_ar(l) for l in ISRAELI_LOCATIONS}
LEBANESE_TOWNS_NORM    = {_normalize_ar(l) for l in LEBANESE_BORDER_TOWNS}

# ─────────────────────────────────────────────────────────────────────────
# TARGET-TYPE CLASSIFIER
# Matches the infographic's "الاستهدافات" categories.
# Priority-ordered — first match wins.
# ─────────────────────────────────────────────────────────────────────────
TARGET_TYPE_RULES = [
    ('بارجة_حربية',            re.compile(r'بارجة|سفينة حربيّ?ة|سفينة العدو')),
    ('قواعد_عسكرية',           re.compile(r'قاعدة\s+(?!جوّ|أرض)|قواعد عسكري')),
    ('ثكنات_عسكرية',           re.compile(r'ثكنة|ثكنات|معسكر(?!\s*المستوطن)')),
    ('طائرات_ومسيّرات',        re.compile(r'طائرة\s+(?:حربي|مسي)|مُسيّرة\s+(?:من\s+نوع|تابعة)|مروحيّ?ة|هرمز|هيرمس')),
    ('مدن_ومستوطنات',          re.compile(r'مستوطنة|مستعمرة|مدينة|حيّ\s|حي\s|حارة')),
    ('مواقع_حدودية_ومستحدثة',  re.compile(r'موقع|تلّة|تلة|مرتفع|خلّة|خلة|وادي|ادي|حدود|مستحدث')),
]
TARGET_TYPE_FALLBACK = 'أخرى'

# ─────────────────────────────────────────────────────────────────────────
# WEAPON-FAMILY CLASSIFIER
# Matches infographic's "الأسلحة المستعملة".
# ─────────────────────────────────────────────────────────────────────────
WEAPON_FAMILY_RULES = [
    ('سلاح_البحرية',        re.compile(r'بحريّ?ة|بحر\s')),
    ('الدفاع_الجوي',        re.compile(r'دفاع\s+جوّ?يّ?|أرض[\s\-‑–]*جو')),
    ('سلاح_الهندسة',        re.compile(r'عبوة|عبوات|شواظ|هندس(?:ة|ي)|تشريك(?:ة|ات)|لغم|ألغام')),
    ('مسيّرات_ومحلقات',     re.compile(r'مُ?سيّرة|مسيّرات|مسيرة|مسيرات|محلّق|محلقة|كواد')),
    ('الصواريخ_الموجهة',    re.compile(r'موجّ?ه')),
    ('الصواريخ_النوعية',    re.compile(r'نوعي')),
    ('القذائف_المدفعية',    re.compile(r'مدفعيّ?ة|قذائف|قذيفة')),
    ('الصواريخ_المباشرة',   re.compile(r'مباشر')),
    ('الأسلحة_المناسبة',   re.compile(r'الأسلحة\s+المناسبة|أسلحة\s+مناسبة')),
    ('الخفيفة_والمتوسطة',  re.compile(r'خفيف|متوسط|رشّ?اش')),
    ('الأسلحة_الصاروخية',  re.compile(r'صلي|صلية|صاروخ|صواريخ|كاتيوشا')),
]
WEAPON_FAMILY_FALLBACK = 'أخرى'

# ─────────────────────────────────────────────────────────────────────────
# ENEMY LOSS EXTRACTORS
# Scan bayan fullText + enemy event text for destroyed equipment / casualties.
# Each rule contributes to its counter every time its regex matches (with a
# numeric multiplier where the text gives a count, otherwise 1).
# ─────────────────────────────────────────────────────────────────────────
LOSS_RULES = [
    # key, counting regex (Group 1 = number when present)
    ('مروحيّة',         re.compile(r'مروحيّ?ة')),
    ('دبابات',          re.compile(r'(?:دبّ?ابة|ميركافا)')),
    ('هامر',            re.compile(r'هامر|هامفي|Hummer')),
    ('ناقلة_جند',       re.compile(r'ناقل(?:ة|تي)\s+جنود?')),
    ('جرافة',           re.compile(r'جرّ?افة|جرافات|D9')),
    ('هرمز',            re.compile(r'هرمز|هيرمس|Hermes')),
    ('كواد_كوبتر',      re.compile(r'كواد\s*كوبتر|quadcopter', re.IGNORECASE)),
    ('آلية_لوجستية',    re.compile(r'آليّ?ة\s+لوجستيّ?ة')),
]
# Casualties — rough count with explicit number patterns
CASUALTY_NUM_RE = re.compile(
    r'(\d+)\s*(?:جندي|جنود|قتيل|قتلى|جريح|جرحى|إصاب|عسكري)'
)

# ─────────────────────────────────────────────────────────────────────────
# DEFENSIVE COUNTER-OP KEYWORDS
# ─────────────────────────────────────────────────────────────────────────
DEF_COUNTER_ADVANCE = re.compile(r'تقدّ?م|محاولة التقدّ?م|تسلّل|محاولة التسلّل')
DEF_COUNTER_LANDING = re.compile(r'إنزال|عمليّ?ة إنزال')

# ─────────────────────────────────────────────────────────────────────────
def is_lebanese_town(target):
    """True if target matches a known Lebanese border town — strikes at these
    targets are counter-advance operations (enemy troops inside Lebanon)."""
    if not target:
        return False
    norm = _normalize_ar(target)
    return any(t in norm for t in LEBANESE_TOWNS_NORM)


def classify_target_type(target, badge):
    """Categorize a target into infographic buckets. Bucket priority:

    1. قاعدة/ثكنة keywords (specific military target types) — highest.
    2. Lebanese border town → تصدي_لعملية_تقدم (counter-advance in Lebanon).
    3. Israeli settlement (known list OR مستوطنة keyword OR badge) → مدن_ومستوطنات.
    4. موقع/تلة/مرتفع → مواقع_حدودية_ومستحدثة (border positions).
    5. Fallback أخرى.
    """
    if not target:
        return TARGET_TYPE_FALLBACK
    # 1. Specific military installations first (قاعدة/ثكنة/بارجة/aircraft)
    for name, rx in (
        ('بارجة_حربية',     TARGET_TYPE_RULES[0][1]),
        ('قواعد_عسكرية',    TARGET_TYPE_RULES[1][1]),
        ('ثكنات_عسكرية',    TARGET_TYPE_RULES[2][1]),
        ('طائرات_ومسيّرات', TARGET_TYPE_RULES[3][1]),
    ):
        if rx.search(target):
            return name
    norm = _normalize_ar(target)
    # 2. Lebanese border town — these are counter-advance strikes
    if any(t in norm for t in LEBANESE_TOWNS_NORM):
        return 'تصدي_لعملية_تقدم'
    # 3. Israeli settlement — direct lookup OR badge OR keyword
    if badge == 'settlement':
        return 'مدن_ومستوطنات'
    if any(loc in norm for loc in ISRAELI_LOCATIONS_NORM):
        return 'مدن_ومستوطنات'
    if TARGET_TYPE_RULES[4][1].search(target):  # "مدن_ومستوطنات" rx
        return 'مدن_ومستوطنات'
    # 4. Border positions — موقع/تلة/مرتفع
    if TARGET_TYPE_RULES[5][1].search(target):
        return 'مواقع_حدودية_ومستحدثة'
    return TARGET_TYPE_FALLBACK


def classify_weapon_family(weapon):
    if not weapon:
        return WEAPON_FAMILY_FALLBACK
    for name, rx in WEAPON_FAMILY_RULES:
        if rx.search(weapon):
            return name
    return WEAPON_FAMILY_FALLBACK


def extract_losses(text, losses, include_casualty_numbers=False):
    """Scan text and bump loss counters. `losses` is a Counter mutated in place.

    Only bayan fullText should be passed. enemy[] media echoes are NOT scanned
    because a single destroyed tank / dead soldier appears across Al-Manar,
    Al-Mayadeen, IDF statement and wire-agency entries — counting regex hits
    across those echoes inflates equipment + casualty totals 3-5×. One bayan
    mention = one authoritative claim per incident.

    Set include_casualty_numbers=True to additionally accumulate قتيل/جريح
    counts from explicit number patterns.
    """
    if not text:
        return
    for key, rx in LOSS_RULES:
        count = len(rx.findall(text))
        if count:
            losses[key] += count
    if include_casualty_numbers:
        for m in CASUALTY_NUM_RE.finditer(text):
            try:
                losses['قتيل_وجريح'] += int(m.group(1))
            except ValueError:
                pass


# ─────────────────────────────────────────────────────────────────────────
def iter_files(from_date, to_date):
    d = from_date
    one = timedelta(days=1)
    while d <= to_date:
        fp = os.path.join(DATA_DIR, d.isoformat() + '.json')
        if os.path.exists(fp):
            yield d, fp
        d += one


def aggregate(from_date, to_date):
    target_counts   = Counter()
    weapon_counts   = Counter()
    losses          = Counter()
    day_strike_counts = Counter()
    offensive_strikes = 0
    defensive_ops = 0
    counter_advance = 0
    counter_landing = 0
    statements = 0
    active_days = 0
    days_seen = 0

    for d, fp in iter_files(from_date, to_date):
        days_seen += 1
        try:
            data = json.load(open(fp, encoding='utf-8'))
        except Exception as e:
            print(f"skip {fp}: {e}", file=sys.stderr)
            continue

        day_strikes = 0
        for b in data.get('bayanat', []) or []:
            bt = b.get('bayan_type')
            if bt == 'statement':
                statements += 1
                continue
            ft = b.get('fullText', '')
            # Bayan claims — include casualty numbers here (single source per incident)
            extract_losses(ft, losses, include_casualty_numbers=True)

            if bt == 'defensive':
                defensive_ops += 1
                day_strikes += 1
                if DEF_COUNTER_LANDING.search(ft):
                    counter_landing += 1
                elif DEF_COUNTER_ADVANCE.search(ft):
                    counter_advance += 1
                wfam = classify_weapon_family(b.get('weapon',''))
                if wfam == 'الدفاع_الجوي':
                    target_counts['طائرات_ومسيّرات'] += 1
                else:
                    target_counts[classify_target_type(b.get('target',''), b.get('badge',''))] += 1
                weapon_counts[wfam] += 1
                continue

            # Classify each strike. Counter-advance is tracked via the
            # تصدي_لعملية_تقدم target_type bucket rather than a separate
            # counter_advance counter. Air-defense weapons override the
            # target type — if the weapon is surface-to-air / AA, the
            # target was an aircraft / drone regardless of named location.
            if bt == 'list_strikes' and b.get('strikes'):
                for s in b['strikes']:
                    tgt = s.get('target','')
                    wpn = s.get('weapon','') or b.get('weapon','')
                    wfam = classify_weapon_family(wpn)
                    if wfam == 'الدفاع_الجوي':
                        ttype = 'طائرات_ومسيّرات'
                    else:
                        ttype = classify_target_type(tgt, b.get('badge',''))
                    if ttype == 'تصدي_لعملية_تقدم':
                        counter_advance += 1
                    else:
                        offensive_strikes += 1
                    day_strikes += 1
                    target_counts[ttype] += 1
                    weapon_counts[wfam] += 1
            else:
                tgt = b.get('target','')
                wpn = b.get('weapon','')
                wfam = classify_weapon_family(wpn)
                if wfam == 'الدفاع_الجوي':
                    ttype = 'طائرات_ومسيّرات'
                else:
                    ttype = classify_target_type(tgt, b.get('badge',''))
                if ttype == 'تصدي_لعملية_تقدم':
                    counter_advance += 1
                else:
                    offensive_strikes += 1
                day_strikes += 1
                target_counts[ttype] += 1
                weapon_counts[wfam] += 1

        # NOTE: enemy[] is intentionally not scanned for losses. A single
        # destroyed vehicle is echoed across 3-5 media entries (Al-Manar,
        # Al-Mayadeen, IDF, wires) — summing regex hits across echoes
        # inflates totals 3-5×. Bayan fullText above is the single
        # authoritative source per incident.

        if day_strikes:
            active_days += 1
            day_strike_counts[d.isoformat()] = day_strikes

    # Totals
    total_ops = offensive_strikes + defensive_ops + counter_advance
    max_day = day_strike_counts.most_common(1)
    max_day_iso, max_day_n = max_day[0] if max_day else ('', 0)
    avg = round(total_ops / active_days, 1) if active_days else 0

    return {
        'period': {'from': from_date.isoformat(), 'to': to_date.isoformat(),
                   'days_scanned': days_seen, 'active_days': active_days},
        'totals': {
            'operations': total_ops,
            'offensive_strikes': offensive_strikes,
            'defensive_ops': defensive_ops,
            'counter_advance': counter_advance,
            'counter_landing': counter_landing,
            'statements_excluded': statements,
            'daily_avg': avg,
            'max_single_day': {'date': max_day_iso, 'count': max_day_n},
        },
        'targets': dict(target_counts.most_common()),
        'weapons': dict(weapon_counts.most_common()),
        'losses':  dict(losses.most_common()),
    }


# ─────────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('from_date', help='YYYY-MM-DD (inclusive)')
    ap.add_argument('to_date',   help='YYYY-MM-DD (inclusive)')
    ap.add_argument('--out', default='', help='optional JSON output path')
    args = ap.parse_args()

    fd = date.fromisoformat(args.from_date)
    td = date.fromisoformat(args.to_date)
    if td < fd:
        print('to_date must be >= from_date', file=sys.stderr); sys.exit(2)

    result = aggregate(fd, td)
    out = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(out)
        print(f"Wrote {args.out}")
    else:
        print(out)


if __name__ == '__main__':
    main()
