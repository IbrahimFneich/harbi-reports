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

# ═══════════════ ARABIC TEXT NORMALISER ═══════════════
# Apply before every substring check / classification regex so that tatweel,
# shadda/other harakat, alef/yaa variants, and Arabic-Indic digits don't cause
# silent matching failures. The ORIGINAL text is preserved in fullText fields;
# only matching/classification uses the normalised form.
_AR_DIACRITICS_RE = re.compile(r'[\u064B-\u0652\u0670\u0640]')  # harakat + tatweel
_AR_ALEF_MAP  = str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا'})
_AR_YAA_MAP   = str.maketrans({'ى': 'ي'})
_AR_DIGIT_MAP = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
# Zero-width marks that sneak in from Telegram rendering (LRM/RLM/ZWJ/ZWNJ/NBSP).
_AR_INVISIBLES_RE = re.compile(r'[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00A0]')


def norm_ar(s):
    """Normalise Arabic text for matching. Preserves original in fullText;
    use the return value only for `in` checks and classification regex."""
    if not s:
        return ''
    s = _AR_INVISIBLES_RE.sub('', s)
    s = _AR_DIACRITICS_RE.sub('', s)
    s = s.translate(_AR_ALEF_MAP)
    s = s.translate(_AR_YAA_MAP)
    s = s.translate(_AR_DIGIT_MAP)
    return s


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
    # v2.5.45 extensions — locations flagged in EXTRACTION_AUDIT §G1
    'كرمئيل': (32.9137, 35.2918),          # bare form without الـ
    'الكرميئيل': (32.9137, 35.2918),
    'كريات جات': (31.6096, 34.7717),
    'كريات يام': (32.84, 35.07),
    'كريات أتا': (32.80, 35.10),
    'كريات آتا': (32.80, 35.10),
    'كريات ملاخي': (31.73, 34.75),
    'كريات مالاخي': (31.73, 34.75),
    'كريات موتسكين': (32.83, 35.07),
    'كريات بياليك': (32.83, 35.08),
    'كريات إيلعيزر': (32.80, 34.97),
    'كريات إيلعازر': (32.80, 34.97),
    'الغجر': (33.27, 35.62),
    'سهل الحولة': (33.12, 35.60),
    'الحولة': (33.12, 35.60),
    'إييليت هشاخر': (33.04, 35.55),
    'ايليت هشاخر': (33.04, 35.55),
    'راموت نفتالي': (33.10, 35.56),
    'رمات هشارون': (32.14, 34.84),
    'برعام': (33.04, 35.41),
    'برعم': (33.04, 35.41),
    'بيت هيلل': (33.24, 35.58),
    'بيت هلل': (33.24, 35.58),
    'بيت شمش': (31.75, 34.99),
    'كفار غلعادي': (33.22, 35.57),
    'كفار يوفال': (33.225, 35.57),
    'طبريا': (32.79, 35.53),
    'طبرية': (32.79, 35.53),
    'ديشون': (33.04, 35.48),
    'نوؤت مردخاي': (33.24, 35.62),
    'نؤوت مردخاي': (33.24, 35.62),
    'روش بينا': (32.97, 35.54),
    'هغوشريم': (33.21, 35.61),
    'شآر يشوف': (33.20, 35.62),
    'شاعار يشوف': (33.20, 35.62),
    'بني براك': (32.08, 34.83),
    'كفار مساريك': (32.84, 35.08),
    'مرغليوت': (33.172, 35.582),
    'مرجليوت': (33.172, 35.582),
    'دافنه': (33.24, 35.65),
    'دافنا': (33.24, 35.65),
    'العفولا': (32.60, 35.29),
    'أفيفيم': (33.058, 35.42),
    'إفيفيم': (33.058, 35.42),
    'إيفين مناحم': (33.06, 35.20),
    'إيفن مناحم': (33.06, 35.20),
    'ايفن مناحم': (33.06, 35.20),
    'نوف هجليل': (32.72, 35.33),
    'نوف هاجليل': (32.72, 35.33),
    'الناصرة': (32.70, 35.30),
    'الناصرة العليا': (32.72, 35.33),
    'هوشعيا': (32.82, 35.33),
    'يسعور': (32.83, 35.12),
    'كبري': (33.02, 35.15),
    'كابري': (33.02, 35.15),
    'مسعاده': (33.25, 35.77),
    'مجدل شمس': (33.27, 35.77),
    'بقعاتا': (33.19, 35.77),
    'بقعاثا': (33.19, 35.77),
    'عين قنية': (33.18, 35.77),
    'عين قنيا': (33.18, 35.77),
    'يوكنعام': (32.66, 35.10),
    'زرعيت': (33.07, 35.35),
    'شتولا': (33.07, 35.27),
    'ناحاريا': (33.00, 35.10),          # spelling variant of نهاريا
    'نهاريّا': (33.0042, 35.0968),
    'المتوله': (33.28, 35.57),          # colloquial for المطلّة
    'كفر جلعاد': (33.225, 35.57),
    'الجولان المحتل': (32.95, 35.77),
    'المرج': (32.58, 35.32),
    'كرمييل': (32.9137, 35.2918),        # variant spelling
    'الخضيره': (32.44, 34.92),
    'زيكيم': (31.59, 34.51),
    'أشكلون': (31.67, 34.57),
    'اشكلون': (31.67, 34.57),
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

    summaries = []

    # Keyword sets — match against norm_ar(text). Drop leading ال from markers
    # so prefixed forms (لل / بال / فال / وال / كال) also match on substring check.
    # `قوات المسلحة اليمنية` matches BOTH `القوات...` and `للقوات...`.
    BAYAN_MARKERS = (
        'بيان صادر عن المقاومة الاسلامية',        # resistance statement
        'بيان صادر عن غرفة عمليات المقاومة',      # ops-room
        'بيان صادر عن غرفة العمليات',
        'بيان صادر عن حزب الله',                  # Hezbollah political
        'بيان صادر عن الاعلام الحربي',           # war-media statements
        'صادر عن الاعلام الحربي في المقاومة',
    )
    IRAN_MARKERS = (
        'جمهورية الاسلامية', 'حرس الثورة', 'حرس الثوري',
        'جيش الايراني', 'خاتم الانبياء', '#الجمهورية_الاسلامية',
        '#ايران', 'وعد الصادق', 'صاروخ ايراني', 'صواريخ ايرانية',
        'طهران', 'قاآني', 'قاانی', 'بزشكيان', 'پزشكيان',
        'قوة الجوفضاية', 'قوة البحرية الايرانية',
    )
    IRAN_SOURCES = (
        'حرس الثورة الاسلامية', 'حرس الثوري', 'جيش الايراني',
        'خاتم الانبياء', 'قوة البحرية', 'قوة الجوفضاية',
    )
    ENEMY_MARKERS = (
        '#اعلام_العدو', 'اعلام العدو', 'اعلام اسراييلي', 'اعلام اسرائيلي',
        'وسايل اعلام اسراييلية', 'وسايل اعلام اسرائيلية',
        'وسائل اعلام اسرائيلية', 'وسائل الاعلام الاسرائيلية',
        'متحدث باسم جيش العدو', 'اذاعة جيش العدو',
        'القناة 12', 'القناة 14', 'القناة 13', 'القناة 15',
        'مراسل القناة', 'هآرتس', 'يديعوت احرونوت', 'يسرائيل هيوم',
        'الهيئة البحرية البريطانية', 'UKMTO',
    )
    YEMEN_MARKERS = (
        'قوات المسلحة اليمنية', 'انصار الله', 'حركة انصار الله',
        'يحيي سريع', 'عميد سريع', 'عميد يحيي سريع',
        'صنعاء', 'حوثي', 'حوثيين', 'جيش اليمني',
    )
    IRAQ_MARKERS = (
        'مقاومة الاسلامية في العراق', 'كتاييب سيد الشهداء',
        'حركة النجباء', 'اكرم الكعبي', '#العراق',
        'كتاييب حزب الله العراقي', 'عصايب اهل الحق',
    )
    PALESTINE_MARKERS = (
        'حركة حماس', 'كتاييب القسام', 'سرايا القدس',
        'جهاد الاسلامي في فلسطين', 'جبهة الشعبية',
        '#فلسطين_المحتلة', 'مقاومة الفلسطينية',
        'صادر عن حركة حماس', 'مكتب الاعلامي لحركة حماس',
        'مكتب الاعلامي لحركة المجاهدين الفلسطينية',
        'حركة المجاهدين الفلسطينية', 'الناطق العسكري باسم كتاييب القسام',
        'ابو عبيدة',
    )
    SUMMARY_MARKERS = (
        'حصاد اليومي لعمليات المقاومة',
        'حصاد الاسبوعي لعمليات المقاومة',
        'حصاد العام للعمليات',
        'وضعية عمليات المقاومة',
        # Daily-summary phrasing — "أصدرت المقاومة الإسلامية بتاريخ X N بياناً"
        'اصدرت المقاومة الاسلامية بتاريخ',
        'اصدرت المقاومة الاسلامية خلال',
    )
    MEDIA_PLACEHOLDER = ('[media/no text]', '[media / no text]')

    for msg in messages:
        text = msg['text']
        time = msg['time']
        # Normalised copy for matching. Never mutates msg or text.
        ntext = norm_ar(text).lower().replace('يّ', 'يي')
        # Treat empty / media-placeholder messages as noise
        stripped = _AR_INVISIBLES_RE.sub('', text or '').strip()
        if not stripped or any(p in stripped.lower() for p in MEDIA_PLACEHOLDER):
            continue

        # ── Bayanat (resistance statements) — highest priority ──
        if any(m in ntext for m in BAYAN_MARKERS):
            bayan = parse_bayan(msg)
            bayanat.append(bayan)
            continue

        # ── Sirens ──
        # Normalised match handles shadda'd صفّارات and tatweel variants.
        if 'صفارات الانذار' in ntext or 'صفارات انذار' in ntext or 'صفاره انذار' in ntext:
            loc = text
            # Strip hashtags and common prefixes
            loc = re.sub(r'#\S+', '', loc).strip()
            loc = re.sub(r'^.*?صفّ?ارات\s*(?:الإنذار|إنذار)?\s*(?:تدوي\s*)?', '', loc).strip()
            loc = re.sub(r'\s+', ' ', loc).strip()
            sirens.append({
                'time': time,
                'location': loc or text[:80],
                'fullText': text
            })
            continue

        # ── Palestinian factions (NEW — previously silently dropped) ──
        if any(m in ntext for m in PALESTINE_MARKERS):
            allies.append({
                'flag': 'فلسطين',
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Yemen (Ansar Allah / Yemeni Armed Forces) ──
        if any(m in ntext for m in YEMEN_MARKERS):
            allies.append({
                'flag': 'اليمن',
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Iraq (Islamic Resistance in Iraq + named factions) ──
        if any(m in ntext for m in IRAQ_MARKERS):
            allies.append({
                'flag': 'العراق',
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Iran ──
        if any(m in ntext for m in IRAN_MARKERS):
            source = 'إيران'
            for src in IRAN_SOURCES:
                if src in ntext:
                    source = src
                    break
            iran.append({
                'time': time,
                'source': source,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Daily / weekly / cumulative summaries ──
        if any(m in ntext for m in SUMMARY_MARKERS):
            summaries.append({
                'time': time,
                'kind': ('weekly' if 'اسبوعي' in ntext
                         else 'general' if 'عام' in ntext
                         else 'daily'),
                'summary': re.sub(r'#\S+', '', text).strip()[:300],
                'fullText': text
            })
            continue

        # ── Enemy media (Israeli news echoed by the channel) ──
        if any(m in ntext for m in ENEMY_MARKERS):
            enemy.append({
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Videos — LAST, treated as a tag over content domains above ──
        if 'بالفيديو' in ntext or '#فيديو' in ntext:
            desc = text
            desc = re.sub(r'#\S+', '', desc).strip()
            desc = re.sub(r'⭕️?', '', desc).strip()
            desc_key = re.sub(r'\s*جودة\s+(?:عالية|متوسطة|منخفضة|مرتفعة|عاديّة)\s*', ' ', desc).strip()
            desc_key = re.sub(r'\s+', ' ', desc_key)
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

        # ── Other (skip) ──
        other.append(msg)

    # Strip dedup helper keys before returning
    for v in videos:
        v.pop('_key', None)

    return bayanat, sirens, enemy, iran, videos, allies, summaries

def parse_bayan(msg):
    """Parse a resistance statement into structured data."""
    text = msg['text']
    time = msg['time']
    ntext = norm_ar(text)  # diacritic/tatweel/alef/digit-normalised

    # Statement number — accepts Arabic-Indic digits via norm_ar translation
    num_m = re.search(r'بيان صادر عن المقاومة الاسلامية\s*\((\d+)\)', ntext)
    num = int(num_m.group(1)) if num_m else 0

    # Hezbollah general communique (no number) — short-circuit with descriptive title
    if 'بيان صادر عن حزب الله' in ntext and not num_m:
        if 'مجازر' in ntext or 'مجزرة' in ntext or 'المدنيين' in ntext:
            target_h = 'بيان حول مجازر العدو بحق المدنيين'
        elif 'وقف اطلاق النار' in ntext or 'القري والبلدات' in ntext:
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
            'bayan_type': 'statement',
            'fullText': text,
        }

    # Operation time — match against normalised text so shadda/tatweel and
    # Arabic-Indic digits don't fail the match. Accept single-digit hours.
    op_time_m = re.search(
        r'(?:عند|في|وعند|وفي|في\s+تمام)\s+الساعة\s*(\d{1,2}:\d{2})',
        ntext
    )
    op_time = op_time_m.group(1) if op_time_m else ''
    if op_time and len(op_time) < 5:  # zero-pad '9:30' -> '09:30'
        h, m = op_time.split(':')
        op_time = f"{int(h):02d}:{m}"

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

    bayan_type = classify_bayan_type(text, num)

    result = {
        'num': num,
        'postTime': time,
        'opTime': op_time,
        'target': target,
        'weapon': weapon,
        'badge': badge,
        'tags': tags,
        'bayan_type': bayan_type,
        'fullText': text
    }

    # Expand any enumerated strikes into a strikes[] sub-array — fires for
    # both list_strikes AND defensive bayanat that happen to enumerate
    # multiple counter-strikes. The existence of a list marker in the text is
    # the trigger; bayan_type doesn't gate it.
    if _LIST_MARKER_RE.search(text):
        strikes = parse_list_strikes(text, target)
        if strikes:
            result['strikes'] = strikes

    return result

def _clean_body_for_target(text):
    """Strip Quran verses, dates, times, weekdays, and the common preamble.

    Also strips diacritics (tatweel + shadda + other harakat) and removes
    zero-width / RTL marks, so downstream patterns don't need `ّ?` alternations
    everywhere. Alef / yaa / hamza variants are intentionally left as-is here
    (they appear in location names and must survive extraction).
    """
    body = text or ''
    # Strip zero-width / invisible marks
    body = _AR_INVISIBLES_RE.sub('', body)
    # Strip tatweel + shadda + harakat (U+0640 + U+064B..0652 + U+0670)
    body = _AR_DIACRITICS_RE.sub('', body)
    # Truncate at list-format markers — bayanat using "على النحو الآتي:" enumerate
    # multiple strikes; the true primary target is in the text *before* the marker.
    body = re.split(
        r'على\s+النحو\s+الآتي|على\s+الشكل\s+الآتي|على\s+النحو\s+التالي|كالآتي\s*:|كالتالي\s*:|وفق\s+الآتي',
        body, maxsplit=1
    )[0]
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
    # Strip leading whitespace/commas, and a leading "و" only when it's a
    # standalone connective (followed by space). Don't chop the first letter
    # of place names like "وادي" / "وبلدة" that legitimately start with و.
    loc = re.sub(r'^(?:[\s،,]+|و\s+)+', '', loc)
    loc = re.sub(r'(?:[\s،,]+|\sو)+$', '', loc)
    loc = re.sub(r'\s+', ' ', loc).strip()
    # Strip leading "من " (source marker, not a target)
    loc = re.sub(r'^(?:من|مِن)\s+', '', loc)
    # Drop trailing clash/engagement verb clauses — defensive bayanat describe
    # Israeli advances by naming the location first, then "اشتبك معها مجاهدو…" —
    # the verb phrase is not part of the location.
    loc = re.sub(
        r'\s+(?:و?اشتبك|و?اشتبكوا|و?استهدفوا|و?تصدّ[ىوا]|و?تصدى|محاول)\s*.*$',
        '', loc
    )
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

    # Terminator: punctuation, weapon-prefix word, result-clause conjunction, or end.
    # body has already had shadda/tatweel/harakat stripped, so no `ّ?` noise here.
    weapon_term = (
        r'بصلي|بسرب|بقذائف|بقذيفة|بالقذائف|بمحلق|بمحلقات|بالمحلقات|'
        r'بصاروخ|بالصاروخ|بالصواريخ|بصواريخ|بصلية|بصلياتٍ|بصليات|بالصليات|'
        r'بالأسلحة|بأسلحة|بسلاح|بعبوة|بعبوات|بالعبوة|'
        r'بمسيرة|بمسيرات|بالمسيرات|بسربٍ|بسربِ|بالسرب|'
        r'برشقة|برشقات|بالرشاشات|برشاش|بالرشقات|'
        r'بالمدفعية|بمدفعية|بقصف|بالقصف|'
        r'بكمية|بكميات|بالكميات|بتفجير|بالاشتباك|بهدف|بالكاتيوشا|'
        r'ببركان|بصاروخي|بكنعان|بفلق|بشاهد|بكروز|بحزمة|بالحزمة'
    )
    # Result-clause conjunctions — outcome text we don't want in the target
    result_term = (
        r'و(?:حقق|أجبر|تدمير|شوهد|تم|ما\s+زال|أسفر|هدف|توقف|تمكن|'
        r'أوقع|أوقعوا|ألحقوا|ألحق|أدى|اندلع|اشتعل)'
    )
    # Broader punctuation class — includes Arabic full stop ۔, question mark ؟,
    # exclamation !, em dash —, colon :, semicolon ؛, and list markers -/•.
    TERM = (
        r'(?=[،,.؛۔؟!:\n(]|\s+(?:' + weapon_term + r')|\s+' + result_term +
        r'|\s+[-•]\s|$)'
    )

    # Verb root set — includes feminine/plural/passive inflections so
    # "استهدفت", "قصفت", "دكّت", "استهدفوا", "قصفوا", "دكّوا", "هاجم",
    # "استُهدف" all match. Shadda already stripped from body.
    VERBS = (
        r'(?:استهدف|استهدفت|استهدفوا|استهدفا|هاجم|هاجمت|هاجموا|'
        r'قصف|قصفت|قصفوا|دك|دكت|دكوا|فجر|فجرت|فجروا|'
        r'تصد|تصدت|تصدوا|أسقط|أسقطت|أسقطوا|رصد|رصدت|رصدوا|'
        r'اشتبك|اشتبكت|اشتبكوا|شن|شنت|شنوا|نفذ|نفذت|نفذوا)'
        r'[هاهمكنتما]*'
    )

    # Extended noun list — also matches: ports, airports, stations, crossings,
    # fields (oil/gas), bridges, tunnels, junctions, gates.
    PLACE_NOUNS = (
        r'مستوطنة|مستوطنتي|مستوطنتَي|مستوطنات|مستعمرة|مستعمرات|'
        r'مدينة|بلدة|بلدات|قرية|قرى|منطقة|حي|حيّ|حارة|'
        r'تلة|تلّة|تلال|مرتفع|خلة|خلّة|وادي|ادي|جبل|مزرعة|مزارع|'
        r'موقع|مواقع|قاعدة|قواعد|ثكنة|ثكنات|معسكر|معسكرات|'
        r'معتقل|مركز|مشفى|مقر|مجمع|مجمّع|مصفاة|مصنع|مصانع|'
        r'مرفأ|ميناء|مطار|مطارات|محطة|محطّة|معبر|معابر|'
        r'حقل|حقول|جسر|جسور|نفق|أنفاق|مفرق|مفارق|'
        r'مدخل|مداخل|بوابة|منظومة|منظومات|شركة|شركات'
    )
    # Priority-ordered location patterns. First match wins.
    patterns = [
        # Colon-list — "في: A، B، وC" or "على: A، B، C"
        r'(?:في|على)\s*:\s*([^.؛\n]+?)' + TERM,
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
        # Generic "في [noun] X" — full extended noun list
        r'في\s+(?:' + PLACE_NOUNS + r')\s+([^،,.؛\n]+?)' + TERM,
        # Verb→prep→target fallback (buffer may cross commas). Now with
        # feminine/plural/passive verb forms.
        VERBS + r'\s+(?:[^.؛\n]{0,120}?\s+)?(?:في|عند|على|باتجاه|نحو|قرب|قبالة|فوق|داخل)\s+([^،,.؛\n]+?)' + TERM,
        # Reverse-order syntax — "LOC + verb + subject":
        # "مرفأ حيفا استهدفها المجاهدون" or "بلدة X هاجمها ..."
        r'((?:' + PLACE_NOUNS + r')\s+[^.؛\n]{2,80}?)\s+(?:استهدفها|هاجمها|قصفها|دكها|استهدفه|هاجمه|قصفه|دكه|اشتبك\s+معها|تصدى\s+لها)',
        # Verb→direct-object with extended noun list — "استهدفوا مرفأ/ميناء/مطار X"
        VERBS + r'\s+(?:[^.؛\n]{0,120}?\s+)?((?:مرفأ|ميناء|مطار|محطة|معبر|حقل|جسر|نفق|مفرق|مدخل|بوابة)\s+[^،,.؛\n(]+?)' + TERM,
        # Cardinal side — "جنوب/شمال بلدة X"
        r'(?:جنوب|شمال|شرق|غرب|جنوبي|شمالي|شرقي|غربي)\s+(?:مدينة|بلدة|قرية|مستوطنة)\s+([^،,.؛\n]+?)' + TERM,
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
    """Extract weapon type from bayan text.

    Matches against norm_ar(text) so shadda/tatweel variants resolve to the
    same entry. Extended to cover named systems (كاتيوشا, بركان, شاهد, كنعان,
    فلق) and common bال prefixes.
    """
    n = norm_ar(text)
    # Dict keys are in normalised form (shadda stripped, alef normalised).
    # Iteration order is insertion order (Python 3.7+); put specific phrases first.
    weapons = {
        'سرب من المسيرات الانقضاضية': 'مسيّرات انقضاضية',
        'سربا من المسيرات الانقضاضية': 'مسيّرات انقضاضية',
        'اسراب من المسيرات الانقضاضية': 'مسيّرات انقضاضية',
        'اسراب من المحلقات الانقضاضية': 'محلّقات انقضاضية',
        'محلقات انقضاضية': 'محلّقات انقضاضية',
        'محلقة انقضاضية': 'محلّقة انقضاضية',
        'مسيرة انقضاضية': 'مسيّرة انقضاضية',
        'مسيرات انقضاضية': 'مسيّرات انقضاضية',
        'قذائف المدفعية': 'قذائف مدفعية',
        'قذائف مدفعية': 'قذائف مدفعية',
        'قذائف الهاون': 'قذائف هاون',
        'قذيفة هاون': 'قذائف هاون',
        'هاون': 'قذائف هاون',
        'صلية صاروخية كبيرة': 'صليات صاروخية',
        'صليات صاروخية كبيرة': 'صليات صاروخية',
        'صليات صاروخية': 'صليات صاروخية',
        'صلية صاروخية': 'صلية صاروخية',
        'الصواريخ الموجهة': 'صواريخ موجّهة',
        'صواريخ موجهة': 'صواريخ موجّهة',
        'صاروخ موجه': 'صاروخ موجّه',
        'صاروخ نوعي': 'صاروخ نوعيّ',
        'صواريخ نوعية': 'صواريخ نوعية',
        'الصواريخ النوعية': 'صواريخ نوعية',
        'صاروخ ارض جو': 'صاروخ أرض جوّ',
        'صواريخ ارض جو': 'صواريخ أرض جوّ',
        'الرشاشات الثقيلة': 'رشّاشات ثقيلة',
        'رشاشات ثقيلة': 'رشّاشات ثقيلة',
        'الاسلحة الصاروخية وقذائف المدفعية': 'صواريخ + مدفعية',
        'الاسلحة الصاروخية': 'أسلحة صاروخية',
        'اسلحة صاروخية': 'أسلحة صاروخية',
        'الاسلحة المناسبة': 'الأسلحة المناسبة',
        'اسلحة مناسبة': 'الأسلحة المناسبة',
        'كمية من الصواريخ': 'كمية من الصواريخ',
        'عبوة شواظ': 'عبوة شواظ',
        'عبوات ناسفة': 'عبوات ناسفة',
        'عبوة ناسفة': 'عبوة ناسفة',
        'تشريكة ميكانيكية': 'تشريكة ميكانيكية',
        'كاتيوشا': 'صواريخ كاتيوشا',
        'صاروخ بركان': 'صاروخ بركان',
        'صواريخ بركان': 'صواريخ بركان',
        'صاروخ فلق': 'صاروخ فلق',
        'صاروخ كنعان': 'صاروخ كنعان',
        'صاروخ شاهد': 'صاروخ شاهد',
        'صاروخ كروز': 'صاروخ كروز',
        'سلاح الهندسة': 'سلاح الهندسة',
        'بدر': 'صاروخ بدر',
    }
    for pattern, label in weapons.items():
        if pattern in n:
            return label
    # Fallback — named-system regex so unusual names are at least bucketable.
    # Captures phrases like "بصاروخ زلزال" / "بصواريخ رعد" / "بقذائف هان".
    m = re.search(r'ب(?:ال)?(?:صاروخ|صواريخ|قذائف|قذيفة|سلاح|اسلحة)\s+(\S{2,20})', n)
    if m:
        word = m.group(1).rstrip('.،')
        # Avoid capturing the generic closer like "وحققوا"
        if not word.startswith(('و','ف','ال')):
            return word
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


def classify_bayan_type(text, num):
    """Classify a bayan by kind of content. Values:

    - statement       : political/condolence/address (Hezbollah communiqué, no strike)
    - narrative_recap : ops-room multi-event narrative summarizing prior operations
    - list_strikes    : single announcement enumerating multiple strikes
                        via 'على النحو الآتي:' (or variants)
    - defensive       : engagement/counter-advance/counter-infiltration
    - offensive       : default — outward strike(s) described in a single bayan

    All comparisons done on norm_ar(text) so tatweel / shadda / alef-variant /
    Arabic-Indic-digit differences don't cause silent misclassification.
    Priority: defensive > list_strikes — a defensive bayan that happens to
    enumerate multiple counter-strikes stays classified as defensive.
    """
    n = norm_ar(text)
    if (num == 0 and 'بيان صادر عن المقاومة الاسلامية' not in n) or \
       'بيان صادر عن حزب الله' in n or \
       'بيان عام لحزب الله' in n or \
       'بيان الي اهالي' in n or \
       'حول انتخاب' in n or \
       'حول استشهاد' in n:
        return 'statement'
    if 'غرفة عمليات المقاومة' in n or 'غرفة العمليات' in n:
        return 'narrative_recap'
    # Defensive takes priority over list_strikes so counter-advance bayanat that
    # enumerate multiple targets stay in the defensive bucket.
    if re.search(r'اشتبك|تصدي|تصدت|تصدوا|كمين|تسلل|محاولة التقدم|محاولة التسلل', n):
        return 'defensive'
    if re.search(r'علي النحو الاتي|علي الشكل الاتي|علي النحو التالي|كالاتي\s*:|كالتالي\s*:', n):
        return 'list_strikes'
    return 'offensive'


_LIST_MARKER_RE = re.compile(
    r'على\s+النحو\s+الآتي|على\s+الشكل\s+الآتي|على\s+النحو\s+التالي|كالآتي\s*:|كالتّالي\s*:|وفق\s+الآتي'
)
# Weapon-preposition prefix — "ب" + weapon noun. When this starts the post-time
# segment, the line has no per-strike sub-location (shared parent target used).
_WEAPON_PREFIX_RE = re.compile(
    r'ب[ِ]?(?:صلي|سرب|قذائف|قذيفة|محلّق|صاروخ|صاروخاً|الصواريخ|صواريخ|'
    r'الأسلحة|أسلحة|سلاح|عبوة|عبوات|مسيّرة|مسيّرات|مسيرة|مسيرات|'
    r'رشقة|رشقات|الرشّاشات|الرشاشات|رشّاش|المدفعيّة|المدفعية|مدفعية|'
    r'كمية|كميات|الكميات|تفجير|هدف)'
    r'|بالأسلحة|بالصاروخ|بالصواريخ|بالرشّاشات|بالرشاشات|بالمدفعيّة|بالمدفعية|بالاشتباك'
)


def parse_list_strikes(text, primary_target):
    """Parse a list_strikes bayan into a list of individual strike dicts.

    Recognizes two formats after the list marker ("على النحو الآتي:"):
      1. Bullet — "- HH:MM LOCATION WEAPON_PHRASE."
      2. Inline — "عند الساعة HH:MM [LOCATION] WEAPON_PHRASE."
         (location may be absent → strike inherits primary_target).

    Returns [{opTime, target, weapon}, ...]. Empty list when no enumeration
    is parseable.
    """
    m = _LIST_MARKER_RE.search(text)
    if not m:
        return []

    # Part of text BEFORE the marker — lets us fall back to the parent's
    # weapon when a bullet lists only time + location.
    parent_weapon = extract_weapon(text[:m.start()]) or extract_weapon(text) or ''

    body = text[m.end():]
    # Stop at the closing Quran verse or first hashtag / Hijri date
    body = re.split(r'﴿وَمَا النَّصْرُ|#[\u0621-\u064A_]+|\d+\s+(?:شوال|رمضان|شعبان)', body)[0]
    body = body.strip(" :\n\u200F")

    strikes = []

    def _split_loc_weapon(segment):
        """Split 'LOCATION WEAPON_PHRASE' on the first weapon preposition."""
        segment = segment.strip(" .،\n\u200F")
        # Strip leading "في " (preposition before location in some formats)
        segment = re.sub(r'^في\s+', '', segment)
        wm = _WEAPON_PREFIX_RE.search(segment)
        if wm:
            loc = segment[:wm.start()].strip(" ،-\n\u200F")
            weapon_phrase = segment[wm.start():].strip(" .،\n\u200F")
        else:
            loc = segment
            weapon_phrase = ''
        return loc, weapon_phrase

    # Bullet form (preferred): "[dash] [optional الساعة] HH:MM REST."
    # Bullet terminator: period OR newline OR end — some bayanat use newline only.
    bullet_pat = re.compile(
        r'[-•‐–—]\s*(?:الس[ّ]?اعة\s*)?(\d{1,2})[:.](\d{2})\s+([^\n]+?)(?:\s*\.|$)',
        re.MULTILINE
    )
    for hh, mm, rest in bullet_pat.findall(body):
        loc, weapon_phrase = _split_loc_weapon(rest)
        if not loc:
            loc = primary_target
        strikes.append({
            'opTime': f"{int(hh):02d}:{mm}",
            'target': _clean_location(loc) if loc else '',
            'weapon': extract_weapon(weapon_phrase) or parent_weapon or weapon_phrase,
        })
    if strikes:
        return strikes

    # Inline form: "عند الساعة HH:MM [LOC] [WEAPON_PHRASE]." (or newline end).
    inline_pat = re.compile(
        r'(?:عند|في|وعند|وفي|ثمّ\s+عند|ثم\s+عند|في\s+تمام)\s+(?:الس[ّ]?اعة)\s*'
        r'(\d{1,2})[:.](\d{2})\s+([^\n]+?)(?:\s*\.|$)',
        re.MULTILINE
    )
    for hh, mm, rest in inline_pat.findall(body):
        loc, weapon_phrase = _split_loc_weapon(rest)
        if not loc:
            loc = primary_target
        strikes.append({
            'opTime': f"{int(hh):02d}:{mm}",
            'target': _clean_location(loc) if loc else '',
            'weapon': extract_weapon(weapon_phrase) or parent_weapon or weapon_phrase,
        })
    if strikes:
        return strikes

    # Shared-time bullets: parent states "عند الساعة HH:MM … على النحو الآتي:"
    # and each bullet is just "- LOCATION." inheriting that time + weapon.
    parent_time_m = re.search(
        r'(?:عند|في)\s+(?:الس[ّ]?اعة)\s*(\d{1,2})[:.](\d{2})', text[:m.start()]
    )
    parent_time = (
        f"{int(parent_time_m.group(1)):02d}:{parent_time_m.group(2)}"
        if parent_time_m else ''
    )
    shared_bullet_pat = re.compile(r'[-•‐–—]\s*([^\n]+?)\s*\.', re.MULTILINE)
    for seg in shared_bullet_pat.findall(body):
        loc, weapon_phrase = _split_loc_weapon(seg)
        if not loc:
            continue
        strikes.append({
            'opTime': parent_time,
            'target': _clean_location(loc),
            'weapon': extract_weapon(weapon_phrase) or parent_weapon or weapon_phrase,
        })
    return strikes

# ═══════════════ SIREN POINTS ═══════════════
def compute_siren_points(sirens):
    """Aggregate sirens by location into map points.

    Matching is done on normalised strings (tatweel/shadda/alef stripped) so
    'المالكيّة' and 'المالكية' both map to the same coord, and 'كرمئيل'
    matches when the dict has 'الكرمئيل'.
    """
    # Pre-normalise the dict keys once.
    norm_coords = {norm_ar(k): (k, v) for k, v in SIREN_COORDS.items()}
    loc_groups = defaultdict(list)

    for s in sirens:
        loc = s['location']
        nloc = norm_ar(loc)
        best_key = None
        for nkey in norm_coords:
            if nkey in nloc or nloc.startswith(nkey):
                if best_key is None or len(nkey) > len(best_key):
                    best_key = nkey
        if best_key:
            orig_key = norm_coords[best_key][0]
            loc_groups[orig_key].append(s['time'])

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
    bayanat, sirens, enemy, iran, videos, allies, summaries = categorize(messages)

    # Compute siren map points
    siren_points = compute_siren_points(sirens)

    # Build output
    stats = {
        'bayanat': len(bayanat),
        'sirens': len(sirens),
        'enemy': len(enemy),
        'iran': len(iran),
        'videos': len(videos),
        'allies': len(allies),
        'summaries': len(summaries),
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
        'allies': allies,
        'summaries': summaries,
    }

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output), exist_ok=True)

    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('Output: {} — bayanat:{} sirens:{} enemy:{} iran:{} videos:{} allies:{} summaries:{} sirenPoints:{}'.format(
        output, stats['bayanat'], stats['sirens'], stats['enemy'], stats['iran'],
        stats['videos'], stats['allies'], stats['summaries'], len(siren_points)))

    # Rebuild derived indexes (spotlight-index.json, reports-meta.js, nav.js)
    if '--skip-build' not in sys.argv:
        build_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_index.py')
        if os.path.exists(build_script):
            import subprocess
            print('Rebuilding indexes...')
            subprocess.run([sys.executable, build_script], check=True)

if __name__ == '__main__':
    main()
