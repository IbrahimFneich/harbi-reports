#!/usr/bin/env python3
"""
Telegram Message Categorizer for Harbi Reports.
Reads raw Telegram dump, categorizes messages, outputs data/YYYY-MM-DD.json.

Usage:
  python3 scripts/categorize.py <raw_telegram_file> <date> [--output data/YYYY-MM-DD.json]

The raw file is the JSON saved by mcp__telegram__list_messages (has a "result" key
containing all messages as a single string).
"""

import json
import re
import sys
import os
from collections import defaultdict

# ═══════════════ LOCATION → COORDINATES LOOKUP ═══════════════
# Pre-computed lat/lng for known siren locations
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
}

# ═══════════════ ARABIC DATE HELPERS ═══════════════
ARABIC_MONTHS = {
    1: 'كانون الثاني', 2: 'شباط', 3: 'آذار', 4: 'نيسان',
    5: 'أيار', 6: 'حزيران', 7: 'تموز', 8: 'آب',
    9: 'أيلول', 10: 'تشرين الأول', 11: 'تشرين الثاني', 12: 'كانون الأول'
}
ARABIC_DAYS = {
    0: 'الإثنين', 1: 'الثلاثاء', 2: 'الأربعاء', 3: 'الخميس',
    4: 'الجمعة', 5: 'السبت', 6: 'الأحد'
}
ARABIC_NUMS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

def to_arabic_num(n):
    return str(n).translate(ARABIC_NUMS)

def get_arabic_date(date_str):
    """Convert YYYY-MM-DD to Arabic date components."""
    from datetime import date
    y, m, d = map(int, date_str.split('-'))
    dt = date(y, m, d)
    day_ar = ARABIC_DAYS[dt.weekday()]
    date_ar = to_arabic_num(d) + ' ' + ARABIC_MONTHS[m] + ' ' + to_arabic_num(y)
    # Approximate Hijri (rough calculation - good enough for display)
    # For exact Hijri, we'd need a library, but the reports already have it in the text
    return day_ar, date_ar

def extract_hijri_from_messages(messages):
    """Try to extract Hijri date from bayan closing text."""
    for msg in messages:
        m = re.search(r'(\d+)\s+(?:شوال|شعبان|رمضان|ذي القعدة|ذي الحجة|محرم|صفر|ربيع الأول|ربيع الثاني|جمادى الأولى|جمادى الثانية|رجب)\s+(\d+)\s+هـ', msg.get('text', ''))
        if m:
            return to_arabic_num(m.group(1)) + ' ' + re.search(r'(\d+)\s+((?:شوال|شعبان|رمضان|ذي القعدة|ذي الحجة|محرم|صفر|ربيع الأول|ربيع الثاني|جمادى الأولى|جمادى الثانية|رجب)\s+\d+\s+هـ)', msg['text']).group(0).replace(m.group(1), to_arabic_num(m.group(1))).replace(m.group(2), to_arabic_num(m.group(2)))
    return ''

def extract_hijri_simple(messages):
    """Extract raw Hijri string from any bayan."""
    for msg in messages:
        text = msg.get('text', '')
        m = re.search(r'\d+\s+(?:شوال|شعبان|رمضان|ذي القعدة|ذي الحجة|محرم|صفر|ربيع الأول|ربيع الثاني|جمادى الأولى|جمادى الثانية|رجب)\s+\d+\s+هـ', text)
        if m:
            raw = m.group(0)
            # Convert digits to Arabic
            return raw.translate(ARABIC_NUMS) + '.'
    return ''

# ═══════════════ MESSAGE PARSER ═══════════════
def parse_raw_telegram(filepath):
    """Parse the raw Telegram dump file into structured messages."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Handle JSON wrapper
    try:
        data = json.loads(content)
        if isinstance(data, dict) and 'result' in data:
            content = data['result']
    except json.JSONDecodeError:
        pass

    # Split into individual messages
    parts = re.split(r'(?:^|\n)ID:\s*', content)
    messages = []

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Parse: ID | channel | Date: ... | ... | Message: ...
        m = re.match(
            r'(\d+)\s*\|[^|]*\|\s*Date:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}):\d{2}\+\d{2}:\d{2}\s*\|.*?\|\s*Message:\s*(.*)',
            part, re.DOTALL
        )
        if not m:
            continue

        msg_id = int(m.group(1))
        date = m.group(2)
        time = m.group(3)
        text = m.group(4).strip()

        # Convert literal \n to actual newlines
        text = text.replace('\\n', '\n')

        if text == '[Media/No text]' or not text.strip():
            continue

        messages.append({
            'id': msg_id,
            'date': date,
            'time': time,
            'text': text
        })

    return messages

# ═══════════════ CATEGORIZER ═══════════════
def categorize(messages):
    """Categorize messages into report sections."""
    bayanat = []
    sirens = []
    enemy = []
    iran = []
    videos = []
    allies = []
    other = []

    for msg in messages:
        text = msg['text']
        time = msg['time']

        # ── Bayanat (resistance statements) ──
        if ('بيان صادر عن المقاومة الإسلامية' in text
                or 'بيـان صادر عن غرفة عمليّـات' in text
                or 'بيان صادر عن حزب الله' in text):
            bayan = parse_bayan(msg)
            bayanat.append(bayan)
            continue

        # ── Sirens ──
        if 'صفارات الإنذار' in text or 'صفارات إنذار' in text:
            loc = text
            # Strip hashtags and common prefixes
            loc = re.sub(r'#\S+', '', loc).strip()
            loc = re.sub(r'^.*?صفارات (?:الإنذار|إنذار)\s*(?:تدوي\s*)?', '', loc).strip()
            loc = re.sub(r'\s+', ' ', loc).strip()
            if loc.startswith('في '):
                pass  # keep "في ..." as location
            sirens.append({
                'time': time,
                'location': loc or text[:80],
                'fullText': text
            })
            continue

        # ── Videos ──
        if 'بالفيديو' in text or '#فيديو' in text:
            desc = text
            desc = re.sub(r'#\S+', '', desc).strip()
            desc = re.sub(r'⭕️?', '', desc).strip()
            # Strip quality suffix for dedup key
            desc_key = re.sub(r'\s*جودة\s+(?:عالية|متوسطة|منخفضة|مرتفعة|عاديّة)\s*', ' ', desc).strip()
            desc_key = re.sub(r'\s+', ' ', desc_key)
            # Dedup: same time + same description (quality stripped) = same operation
            dup = next((v for v in videos if v.get('_key') == (time, desc_key)), None)
            if dup:
                continue
            videos.append({
                'time': time,
                'description': desc_key[:200],
                'fullText': text,
                '_key': (time, desc_key),
            })
            continue

        # ── Iran ──
        if any(kw in text for kw in ['الجمهورية الإسلامية', 'حرس الثورة', 'الحرس الثوري',
                                       'الجيش الإيراني', 'الجيش الايراني', 'خاتم الأنبياء',
                                       '#الجمهورية_الإسلامية', '#إيران', 'الوعد الصادق']):
            source = 'إيران'
            for src in ['حرس الثورة الإسلامية', 'الحرس الثوري', 'الجيش الإيراني',
                        'الجيش الايراني', 'خاتم الأنبياء', 'القوة البحرية', 'القوة الجوفضائية']:
                if src in text:
                    source = src
                    break
            summary = re.sub(r'#\S+', '', text).strip()[:200]
            iran.append({
                'time': time,
                'source': source,
                'summary': summary,
                'fullText': text
            })
            continue

        # ── Enemy media ──
        if '#إعلام_العدو' in text or 'إعلام العدو' in text or 'إعلام إسرائيلي' in text:
            summary = re.sub(r'#\S+', '', text).strip()[:200]
            enemy.append({
                'time': time,
                'summary': summary,
                'fullText': text
            })
            continue

        # ── Yemen ──
        if any(kw in text for kw in ['القوات المسلحة اليمنية', 'أنصار الله']):
            allies.append({
                'flag': 'اليمن',
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Iraq ──
        if ('المقاومة الإسلامية في العراق' in text
                or 'المقاومة الاسلامية في العراق' in text
                or 'كتائب سيد الشهداء' in text
                or 'حركة النجباء' in text
                or 'أكرم الكعبي' in text
                or '#العراق' in text):
            allies.append({
                'flag': 'العراق',
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Other (skip) ──
        other.append(msg)

    # Strip dedup helper keys before returning
    for v in videos:
        v.pop('_key', None)

    return bayanat, sirens, enemy, iran, videos, allies

def parse_bayan(msg):
    """Parse a resistance statement into structured data."""
    text = msg['text']
    time = msg['time']

    # Statement number
    num_m = re.search(r'بيان صادر عن المقاومة الإسلامية\s*\((\d+)\)', text)
    num = int(num_m.group(1)) if num_m else 0

    # Hezbollah general communique (no number) — short-circuit with descriptive title
    if 'بيان صادر عن حزب الله' in text and not num_m:
        if 'مجازر' in text or 'مجزرة' in text or 'المدنيين' in text:
            target_h = 'بيان حول مجازر العدو بحق المدنيين'
        elif 'وقف إطلاق النار' in text or 'القرى والبلدات' in text:
            target_h = 'بيان إلى أهالي الجنوب والبقاع والضاحية'
        else:
            target_h = 'بيان عام لحزب الله'
        return {
            'num': 0,
            'postTime': time,
            'opTime': '',
            'target': target_h,
            'weapon': '',
            'badge': 'communique',
            'tags': ['بيان عام'],
            'fullText': text,
        }

    # Operation time
    op_time_m = re.search(r'عند\s+الس[ّ]?اعة\s*(\d{2}:\d{2})', text)
    op_time = op_time_m.group(1) if op_time_m else ''

    # Target - extract from the statement body
    target = extract_target(text)

    # Weapon
    weapon = extract_weapon(text)

    # Badge classification
    badge = classify_badge(text, target)

    # Tags
    tags = []
    if 'إطار التحذير' in text or 'إطار ‏التحذير' in text:
        tags.append('في إطار التحذير')
    if 'إصابة مباشرة' in text or 'إصابة دقيقة' in text:
        tags.append('إصابة مباشرة')
    if any(kw in text for kw in ['قاعدة', 'ثكنة', 'منظومة']):
        if badge == 'deep':
            tags.append('ضربة عمق')

    return {
        'num': num,
        'postTime': time,
        'opTime': op_time,
        'target': target,
        'weapon': weapon,
        'badge': badge,
        'tags': tags,
        'fullText': text
    }

def _clean_body_for_target(text):
    """Strip Quran verses, dates, times, weekdays, and the common preamble."""
    body = text
    # Strip Arabic tatweel (letter-elongation character) used for emphasis
    body = body.replace('ـ', '')
    # Remove Quran verses in braces
    body = re.sub(r'﴿[^﴾]*﴾', ' ', body)
    body = re.sub(r'صَدَقَ اللهُ[^\n]*', ' ', body)
    body = re.sub(r'بِسْمِ اللَّـهِ[^\n]*', ' ', body)
    # Remove Hijri date line
    body = re.sub(r'\d+\s+(?:شوال|شعبان|رمضان|ذي القعدة|ذي الحجة|محرم|صفر|ربيع الأول|ربيع الثاني|جمادى الأولى|جمادى الثانية|رجب)\s+\d+\s+هـ', ' ', body)
    # Remove numeric dates
    body = re.sub(r'\d{1,2}[-/]\d{1,2}[-/]\d{4}', ' ', body)
    # Remove time references ("عند الساعة 17:30" — strip "عند" with it)
    body = re.sub(r'(?:عند\s+)?الس[ّ]?اعة\s*\d{1,2}:\d{2}', ' ', body)
    # Strip "الواقع فيه" (date-of connective)
    body = re.sub(r'الواقع\s+فيه', ' ', body)
    # Strip the common preamble up to "ضاحية بيروت الجنوبيّة،"
    body = re.sub(
        r'رد[ًّا]*\s+على\s+العدوان\s+الإسرائيل[يّ]{0,3}\s+المجرم[^،]*?ضاحية\s+بيروت\s+الجنوبي[ّة]{0,3}[،,]?',
        ' ', body
    )
    # Strip "دفاعًا عن لبنان وشعبه،"
    body = re.sub(r'دفاع[اً]+\s+عن\s+لبنان\s+وشعبه[،,]?', ' ', body)
    # Strip "من بعد/من فجر/من ظهر/من صباح/..." FIRST (before individual word strip)
    body = re.sub(r'من\s+(?:بعد\s+)?(?:ظهر|فجر|صباح|عصر|ليل|مساء)\s+(?:اليوم|أمس)?\s*', ' ', body)
    body = re.sub(r'من\s+(?:بعد\s+)?(?:ظهر|فجر|صباح|عصر|ليل|مساء)', ' ', body)
    # Strip weekday names
    body = re.sub(
        r'(?:الإثنين|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)\s*',
        ' ', body
    )
    # Strip time-of-day words and "أمس/اليوم/غدًا"
    body = re.sub(
        r'(?:\bأمس\b|\bاليوم\b|\bغد[اًّ]?\b|\bمساء\b|\bصباح\b|\bظهر\b|\bفجر\b|\bليل\b|\bعصر\b)',
        ' ', body
    )
    # Normalize whitespace
    body = re.sub(r'\s+', ' ', body).strip()
    return body


def _clean_location(loc):
    """Clean a captured location string."""
    loc = re.sub(r'^[\s،,و]+', '', loc)
    loc = re.sub(r'[\s،,و]+$', '', loc)
    loc = re.sub(r'\s+', ' ', loc).strip()
    # Strip leading "من " (source marker, not a target)
    loc = re.sub(r'^(?:من|مِن)\s+', '', loc)
    # Drop trailing connective clauses
    loc = re.sub(
        r'\s+(?:المحتلّ?ة|المُحتلّ?ة|والتي|التي|وما|وقد|حيث|بعد|باتجاه)\s*.*$',
        '', loc
    )
    # Balance parentheses — if unbalanced, drop from the unmatched paren onward
    if loc.count('(') > loc.count(')'):
        idx = loc.rfind('(')
        loc = loc[:idx].strip()
    if loc.count(')') > loc.count('('):
        idx = loc.find(')')
        loc = loc[:idx].strip()
    if len(loc) > 80:
        loc = loc[:80].rsplit(' ', 1)[0]
    return loc.strip()


def extract_target(text):
    """Extract clean target location from bayan text.

    Strategy: scan the cleaned body for location markers in priority order.
    Each pattern captures everything up to the next comma/period/weapon phrase.
    """
    body = _clean_body_for_target(text)

    # Special case: broad warning strikes on border settlements
    if re.search(r'المستوطنات\s+التي\s+سبق\s+التحذير', body) or \
       re.search(r'المستوطنات\s+الّ?تي\s+حُذّرت', body):
        return 'المستوطنات الحدودية'

    # Terminator: punctuation, weapon-prefix word, result-clause conjunction, or end
    weapon_term = (
        r'ب[ِ]?صلي|ب[ِ]?سرب|ب[ِ]?قذائف|ب[ِ]?قذيفة|ب[ِ]?محلّق|ب[ِ]?محلّقات|'
        r'ب[ِ]?صاروخ|بالصاروخ|بالصواريخ|ب[ِ]?صواريخ|ب[ِ]?صلية|ب[ِ]?صلياتٍ|ب[ِ]?صليات|'
        r'بالأسلحة|ب[ِ]?أسلحة|ب[ِ]?سلاح|ب[ِ]?عبوة|ب[ِ]?عبوات|'
        r'ب[ِ]?مسيّرة|ب[ِ]?مسيّرات|ب[ِ]?مسيرة|ب[ِ]?مسيرات|ب[ِ]?سربٍ|ب[ِ]?سربِ|'
        r'ب[ِ]?رشقة|ب[ِ]?رشقات|بالرشّاشات|بالرشاشات|ب[ِ]?رشّاش|'
        r'بالمدفعيّة|بالمدفعية|ب[ِ]?مدفعية|'
        r'ب[ِ]?كمية|ب[ِ]?كميات|بالكميات|ب[ِ]?تفجير|بالاشتباك|ب[ِ]?هدف'
    )
    # Result-clause conjunctions: "وحقّقوا/وأجبروا/وتمّ/وشوهدت/..." introduce outcome text
    result_term = (
        r'و(?:حقّق|أجبر|تدمير|شوهد|شُوهد|تمّ|تم|ما\s+زال|أسفر|هدف)'
    )
    TERM = r'(?=[،,.؛\n(]|\s+(?:' + weapon_term + r')|\s+' + result_term + r'|$)'

    # Priority-ordered location patterns. First match wins.
    patterns = [
        # Airspace — "في أجواء [مدينة] X"
        r'في\s+أجواء\s+(?:مدينة|بلدة|قرية|منطقة)?\s*([^،,.؛\n]+?)' + TERM,
        # Above — "فوق [بلدة/مدينة] X" (aircraft shootdowns)
        r'فوق\s+(?:بلدة|مدينة|قرية|منطقة|سماء)\s+([^،,.؛\n]+?)' + TERM,
        # Vicinity — "في محيط/جوار X"
        r'في\s+(?:محيط|جوار)\s+(?:مدينة|بلدة|قرية|مستوطنة)?\s*([^،,.؛\n]+?)' + TERM,
        # Outskirts — "عند أطراف [بلدة] X"
        r'عند\s+أطراف\s+(?:بلدة|مدينة|قرية|مستوطنة)\s+([^،,.؛\n]+?)' + TERM,
        r'عند\s+أطراف\s+([^،,.؛\n]+?)' + TERM,
        # Quarter of town — "في الأطراف (الغربيّة) لبلدة X"
        r'في\s+الأطراف\s+(?:الجنوبيّ?ة|الشماليّ?ة|الشرقيّ?ة|الغربيّ?ة)\s+ل?(?:بلدة|مدينة|قرية|مستوطنة)\s+([^،,.؛\n]+?)' + TERM,
        # Junction — "عند تقاطع X"
        r'عند\s+تقاطع\s+([^،,.؛\n]+?)' + TERM,
        # Triangle junction — "عند مثلّث X"
        r'عند\s+مثلّث\s+([^،,.؛\n]+?)' + TERM,
        # Direction — "باتجاه [الحارة ... ل][مدينة/بلدة] X"
        r'باتّ?جاه\s+(?:الحارة\s+(?:الجنوبيّ?ة|الشماليّ?ة|الشرقيّ?ة|الغربيّ?ة)\s+ل)?(?:مدينة|بلدة|قرية|مستوطنة|موقع|تلّة|تلة)?\s*([^،,.؛\n]+?)' + TERM,
        r'نحو\s+(?:مدينة|بلدة|قرية|مستوطنة)?\s*([^،,.؛\n]+?)' + TERM,
        # Project/road — "في مشروع X" / "على طريق X"
        r'في\s+مشروع\s+([^،,.؛\n]+?)' + TERM,
        r'على\s+طريق\s+([^،,.؛\n]+?)' + TERM,
        # "Southern quarter of city X" — "الحارة الجنوبيّة لمدينة X"
        r'في\s+الحارة\s+(?:الجنوبيّ?ة|الشماليّ?ة|الشرقيّ?ة|الغربيّ?ة)\s+ل?(?:مدينة|بلدة|قرية)?\s*([^،,.؛\n]+?)' + TERM,
        # Attack target — "هجومًا ... على قاعدة/موقع/ثكنة X"
        r'على\s+(قاعدة\s+[^،,.؛\n(]+?)' + TERM,
        r'على\s+(ثكنت?[َي]?ي?\s+[^،,.؛\n(]+?)' + TERM,
        r'على\s+موقع\s+([^،,.؛\n(]+?)' + TERM,
        r'على\s+(?:مواقع|تجمّعات)\s+[^،,.؛\n]{0,60}?في\s+([^،,.؛\n]+?)' + TERM,
        # Near landmark — "قرب حسينيّة/معتقل/موقع/... X"
        r'قرب\s+(?:حسينيّ?ة|معتقل|موقع|قاعدة|ثكنة|مستوطنة|مدينة|بلدة|قرية|مركز|مشفى)\s+(?:بلدة|مدينة)?\s*([^،,.؛\n]+?)' + TERM,
        # Surroundings — "محيط [معتقل/موقع/...] X" (no "في" prefix)
        r'محيط\s+(?:معتقل|موقع|قاعدة|ثكنة|مستوطنة|مدينة|بلدة|قرية|مركز|مشفى)\s+([^،,.؛\n]+?)' + TERM,
        # Village entrance — "عند مدخل بلدة X"
        r'(?:عند\s+)?مدخل\s+(?:بلدة|مدينة|قرية|مستوطنة)?\s*([^،,.؛\n]+?)' + TERM,
        # Between two villages — "بين بلدتي X والY"
        r'بين\s+بلدت[َي]?ي\s+([^.؛\n]+?)' + TERM,
        # Between landmark and village — "بين مرتفع X والY"
        r'بين\s+(?:مرتفع|تلّة|تلة|تلال|موقع|جبل|مزرعة|وادي)\s+([^.؛\n]+?)\s+و',
        # Air defense in airspace — "في سماء X"
        r'في\s+سماء\s+([^،,.؛\n]+?)' + TERM,
        # Compound cardinal — "جنوب شرق X" / "شمال غرب X"
        r'(?:جنوب|شمال)\s+(?:شرق|غرب)\s+([^،,.؛\n]+?)' + TERM,
        # "ل[مستوطنة/مدينة] X" — warning addressed to settlement (single or dual)
        r'ل(?:مستوطنة|مستوطنتي|مستوطنتَي|مستوطنتين|مدينة|بلدة|قرية|موقع|قاعدة|ثكنة)\s+([^.؛\n]+?)' + TERM,
        # Cardinal direction + landmark — "شرق/شمال/غرب/جنوب معتقل/مشروع/... X"
        r'(?:شرق|شمال|غرب|جنوب|شماليّ?|جنوبيّ?|شرقيّ?|غربيّ?)\s+(?:معتقل|مشروع|موقع|مدينة|بلدة|قرية|مستوطنة|قاعدة|ثكنة|معسكر)\s+([^،,.؛\n]+?)' + TERM,
        # Movement destination — "إلى بلدة X"
        r'إلى\s+(?:بلدة|مدينة|قرية|مستوطنة|موقع|قاعدة)\s+([^،,.؛\n]+?)' + TERM,
        # Direct object after verb — "استهدف ... قاعدة X" (buffer may cross commas)
        r'(?:استهدف|دكّ|قصف|قصفت|دكّت)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(قاعدة\s+[^،,.؛\n(]+?)' + TERM,
        r'(?:استهدف|دكّ|قصف)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(ثكنة\s+[^،,.؛\n(]+?)' + TERM,
        # Direct object after verb — "استهدف ... موقع X"
        r'(?:استهدف|دكّ|قصف|قصفت|دكّت)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(موقع\s+[^،,.؛\n(]+?)' + TERM,
        r'(?:استهدف|قصف|قصفت|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مستوطنة\s+[^،,.؛\n(]+?)' + TERM,
        # Direct object — "استهدف ... مقرّ/مصفاة/مجمّع X"
        r'(?:استهدف|دكّ|قصف)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مقرّ\s+[^،,.؛\n(]+?)' + TERM,
        r'(?:استهدف|دكّ|قصف)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مصفاة\s+[^،,.؛\n(]+?)' + TERM,
        r'(?:استهدف|دكّ|قصف)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مجمّع\s+[^،,.؛\n(]+?)' + TERM,
        # Multi-settlement strike — "مستوطنات: A، B، C..." or "مستوطنتي X وY"
        r'مستوطنات\s*:\s*([^.؛\n]+?)' + TERM,
        r'(?:استهدف|قصف|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مستوطنتي?\s+[^.؛\n(]+?)' + TERM,
        r'(?:استهدف|قصف|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مستوطنات\s+[^.؛\n(]+?)' + TERM,
        # Military camp / system / company — "معسكر X" / "منظومة X" / "شركة X"
        r'(?:استهدف|قصف|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(معسكر\s+[^،,.؛\n(]+?)' + TERM,
        r'(?:استهدف|قصف|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(منظومة\s+[^.؛\n(]+?)' + TERM,
        r'(?:استهدف|قصف|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(شركة\s+[^،,.؛\n(]+?)' + TERM,
        r'(?:استهدف|قصف|دكّ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(مصنع\s+[^،,.؛\n(]+?)' + TERM,
        # Dual village — "في بلدتَي X وY"
        r'في\s+بلدت[َي]?ي\s+([^.؛\n]+?)' + TERM,
        # Generic "في [noun] X" — explicit place nouns only
        r'في\s+(?:مستوطنة|مستوطنتي|مستوطنتَي|مستوطنات|مدينة|بلدة|قرية|منطقة|تلّة|تلة|موقع|قاعدة|ثكنة|مزرعة|مزارع|حيّ|حي)\s+([^،,.؛\n]+?)' + TERM,
        # Original verb→prep→target fallback (buffer may cross commas)
        r'(?:استهدف|قصف|فجّر|تصدّ|دكّ|أسقط|رصد|اشتبك|شنّ|نفّذ)[هاهمكنت]*\s+(?:[^.؛\n]{0,120}?\s+)?(?:في|عند|على|باتّجاه|نحو|قرب|قبالة|فوق)\s+([^،,.؛\n]+?)' + TERM,
        # Cardinal side — "جنوب/شمال بلدة X"
        r'(?:جنوب|شمال|شرق|غرب|جنوبيّ?|شماليّ?|شرقيّ?|غربيّ?)\s+(?:مدينة|بلدة|قرية|مستوطنة)\s+([^،,.؛\n]+?)' + TERM,
    ]

    for pat in patterns:
        m = re.search(pat, body)
        if m:
            loc = _clean_location(m.group(1))
            # Strip residual object-prefixes that leaked through
            loc = re.sub(r'^(?:مستوطنة|مستوطنتي|مستوطنتَي|مستوطنات|مدينة|بلدة|قرية)\s+', '', loc)
            loc = loc.strip()
            if len(loc) >= 3:
                return loc

    # Air defense fallback — "تصدّى ... لطائرة حربية"
    if re.search(r'تصدّ[ىا].*?لطائرة\s+حربيّ?ة', body):
        return 'طائرة حربية إسرائيلية'

    return ''

def extract_weapon(text):
    """Extract weapon type from bayan text."""
    weapons = {
        'صلية صاروخيّة': 'صلية صاروخية',
        'صلية صاروخية': 'صلية صاروخية',
        'صليات صاروخيّة': 'صليات صاروخية',
        'صليات صاروخية': 'صليات صاروخية',
        'صلياتٍ صاروخيّة': 'صليات صاروخية',
        'صلياتٍ صاروخية': 'صليات صاروخية',
        'صليةٍ صاروخيّة': 'صلية صاروخية',
        'صليةٍ صاروخية': 'صلية صاروخية',
        'سرب من المسيّرات الانقضاضيّة': 'مسيّرات انقضاضية',
        'سربٍ من المسيّرات الانقضاضيّة': 'مسيّرات انقضاضية',
        'محلّقة انقضاضيّة': 'محلّقة انقضاضية',
        'محلّقات انقضاضيّة': 'محلّقات انقضاضية',
        'محلّقاتٍ انقضاضيّة': 'محلّقات انقضاضية',
        'قذائف المدفعيّة': 'قذائف مدفعية',
        'الصواريخ الموجّهة': 'صواريخ موجّهة',
        'الصواريخ الموجهة': 'صواريخ موجّهة',
        'صاروخ موجّه': 'صاروخ موجّه',
        'صاروخ نوعيّ': 'صاروخ نوعيّ',
        'صاروخ أرض جوّ': 'صاروخ أرض جوّ',
        'الرشّاشات الثقيلة': 'رشّاشات ثقيلة',
        'الرشاشات الثقيلة': 'رشّاشات ثقيلة',
        'الأسلحة الصاروخيّة وقذائف المدفعيّة': 'صواريخ + مدفعية',
        'عبوة شواظ': 'عبوة شواظ',
    }
    for pattern, label in weapons.items():
        if pattern in text:
            return label
    return ''

def classify_badge(text, target):
    """Classify bayan badge type."""
    if any(kw in text for kw in ['ميركافا', 'دبابة', 'دبّابة']):
        return 'tank'
    if any(kw in text for kw in ['مستوطنة', 'مستوطنتي', 'مستوطنتَي', 'إطار التحذير', 'إطار ‏التحذير']):
        return 'settlement'
    if any(kw in text for kw in ['قاعدة', 'ثكنة', 'منظومة الدفاعات']):
        return 'deep'
    return ''

# ═══════════════ SIREN POINTS ═══════════════
def compute_siren_points(sirens):
    """Aggregate sirens by location into map points."""
    loc_groups = defaultdict(list)

    for s in sirens:
        loc = s['location']
        # Find best matching coordinate
        best_key = None
        for key in SIREN_COORDS:
            if key in loc:
                if best_key is None or len(key) > len(best_key):
                    best_key = key
        if best_key:
            loc_groups[best_key].append(s['time'])

    points = []
    for loc, times in loc_groups.items():
        lat, lng = SIREN_COORDS[loc]
        points.append({
            'lat': lat,
            'lng': lng,
            'loc': loc,
            'times': times,
            'count': len(times)
        })

    return sorted(points, key=lambda p: -p['count'])

# ═══════════════ MAIN ═══════════════
def main():
    if len(sys.argv) < 3:
        print('Usage: python3 categorize.py <raw_file> <date> [--output path]')
        sys.exit(1)

    raw_file = sys.argv[1]
    date_str = sys.argv[2]
    output = None
    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output = sys.argv[i + 1]

    if not output:
        output = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              'data', date_str + '.json')

    # Parse messages
    messages = parse_raw_telegram(raw_file)
    print('Parsed {} messages from {}'.format(len(messages), raw_file))

    # Get date info
    day_ar, date_ar = get_arabic_date(date_str)
    hijri = extract_hijri_simple(messages)

    # Categorize
    bayanat, sirens, enemy, iran, videos, allies = categorize(messages)

    # Compute siren map points
    siren_points = compute_siren_points(sirens)

    # Build output
    stats = {
        'bayanat': len(bayanat),
        'sirens': len(sirens),
        'enemy': len(enemy),
        'iran': len(iran),
        'videos': len(videos),
        'allies': len(allies)
    }

    data = {
        'date': date_str,
        'dayAr': day_ar,
        'dateAr': date_ar,
        'hijri': hijri,
        'stats': stats,
        'bayanat': bayanat,
        'sirens': sirens,
        'sirenPoints': siren_points,
        'enemy': enemy,
        'iran': iran,
        'videos': videos,
        'allies': allies
    }

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output), exist_ok=True)

    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('Output: {} — bayanat:{} sirens:{} enemy:{} iran:{} videos:{} allies:{} sirenPoints:{}'.format(
        output, stats['bayanat'], stats['sirens'], stats['enemy'], stats['iran'], stats['videos'], stats['allies'],
        len(siren_points)))

    # Rebuild derived indexes (spotlight-index.json, reports-meta.js, nav.js)
    build_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_index.py')
    if os.path.exists(build_script):
        import subprocess
        print('Rebuilding indexes...')
        subprocess.run([sys.executable, build_script], check=True)

if __name__ == '__main__':
    main()
