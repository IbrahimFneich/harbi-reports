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
        if 'بيان صادر عن المقاومة الإسلامية' in text or 'بيـان صادر عن غرفة عمليّـات' in text:
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
            videos.append({
                'time': time,
                'description': desc[:200],
                'fullText': text
            })
            continue

        # ── Iran ──
        if any(kw in text for kw in ['الجمهورية الإسلامية', 'حرس الثورة', 'الجيش الإيراني',
                                       'الجيش الايراني', 'خاتم الأنبياء', '#الجمهورية_الإسلامية']):
            source = 'إيران'
            for src in ['حرس الثورة الإسلامية', 'الجيش الإيراني', 'الجيش الايراني',
                        'خاتم الأنبياء', 'القوة البحرية', 'القوة الجوفضائية']:
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
        if 'المقاومة الإسلامية في العراق' in text or 'كتائب سيد الشهداء' in text:
            allies.append({
                'flag': 'العراق',
                'time': time,
                'summary': re.sub(r'#\S+', '', text).strip()[:200],
                'fullText': text
            })
            continue

        # ── Other (skip) ──
        other.append(msg)

    return bayanat, sirens, enemy, iran, videos, allies

def parse_bayan(msg):
    """Parse a resistance statement into structured data."""
    text = msg['text']
    time = msg['time']

    # Statement number
    num_m = re.search(r'بيان صادر عن المقاومة الإسلامية\s*\((\d+)\)', text)
    num = int(num_m.group(1)) if num_m else 0

    # Operation time
    op_time_m = re.search(r'عند الساعة\s*(\d{2}:\d{2})', text)
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

def extract_target(text):
    """Extract clean target location from bayan text."""
    # Find the main action sentence
    body_m = re.search(r'(?:استهدف|قصف|فجّر|تصدّ).*?(?:في|عند|على|باتّجاه|نحو)\s+(.*?)(?:بصلي|بسرب|بقذائف|بمحلّق|بصاروخ|بالأسلحة|بعبوة|\.\s*$)', text, re.DOTALL)
    if body_m:
        target = body_m.group(1).strip()
        # Strip time + date patterns first
        target = re.sub(r'الساعة\s*\d{2}:\d{2}\s*', '', target)
        target = re.sub(r'\d{2}-\d{2}-\d{4}', '', target)
        target = re.sub(r'(?:الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد|الإثنين)\s*', '', target)
        # Clean object prefixes (keep just location)
        target = re.sub(r'^(?:مستوطنة|مستوطنتي|مستوطنتَي)\s+', '', target)
        target = re.sub(r'^تجمّع(?:ًا|ات)\s+.*?(?:في|عند)\s+', '', target)
        target = re.sub(r'^أجهزة\s+.*?(?:في|عند)\s+', '', target)
        target = re.sub(r'^موكب(?:ًا)?\s+.*?(?:في|عند)\s+', '', target)
        target = re.sub(r'^حاجز(?:ًا)?\s+.*?(?:في|عند)\s+', '', target)
        target = re.sub(r'^منظومة\s+.*?(?:في|عند)\s+', '', target)
        target = re.sub(r'^دبّابة ميركافا\s+عند\s+', '', target)
        target = re.sub(r'^نقطة\s+.*?(?:في|عند)\s+', '', target)
        target = re.sub(r'\s+', ' ', target).strip()
        # Truncate if too long
        if len(target) > 100:
            target = target[:100].rsplit(' ', 1)[0]
        return target

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
        'صاروخ موجّه': 'صاروخ موجّه',
        'صاروخ نوعيّ': 'صاروخ نوعيّ',
        'صاروخ أرض جوّ': 'صاروخ أرض جوّ',
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
        'b': len(bayanat),
        's': len(sirens),
        'e': len(enemy),
        'ir': len(iran),
        'v': len(videos),
        'al': len(allies)
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

    print('Output: {} — b:{} s:{} e:{} ir:{} v:{} al:{} sp:{}'.format(
        output, stats['b'], stats['s'], stats['e'], stats['ir'], stats['v'], stats['al'],
        len(siren_points)))

if __name__ == '__main__':
    main()
