# Extraction Audit — `categorize.py`

Scope: every silent-drop / silent-misclassification / silent-distortion risk in `/Users/ibrahimfneich/Desktop/telegram-reports/src/python/categorize.py`. Each finding tagged **[Confirmed]** (evidence present in current `raw/`+`data/`), **[Likely]** (mechanism plausible, no in-corpus example yet), or **[Theoretical]** (defensive flag).

Grounding sample: last 30 days of `raw/`, 6,668 raw `ID:` records, 19.1 % of parseable messages drop into `other` and disappear.

---

## A. Parser drops (`parse_raw_telegram`)

### A1. **[Confirmed]** Empty/media filter is exact-equality only
- **Location:** line 174
- **Rule:** `if text == '[Media/No text]' or not text.strip(): continue`
- **Failure:** any variant string (`'[Media / No text]'`, `' [Media/No text]'`, `'[Media/No Text]'`, trailing punctuation) bypasses the filter and creates a near-empty bayan/siren downstream. Conversely, a message whose entire body is invisible (RTL marks, ZWJ, non-breaking spaces) passes `text.strip()` and lands in `other`.
- **Example:** `'\u200F[Media/No text]\u200F'` keeps both LRM/RLM marks → `text != '[Media/No text]'` → forwarded.
- **Fix:** normalise (`text.strip().replace('\u200E','').replace('\u200F','')`) before the comparison; treat the marker as a substring, not equality.

### A2. **[Likely]** Parser regex assumes fixed pipe layout
- **Location:** line 159–162
- **Rule:** `(\d+)\s*\|[^|]*\|\s*Date:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}):\d{2}\+\d{2}:\d{2}\s*\|.*?\|\s*Message:\s*(.*)`
- **Failure modes:** (a) any future channel rename containing a `|` breaks the `[^|]*` channel slot; (b) timezone other than `+HH:MM` (e.g. `Z`, `-04:00`) produces silent skip — `\+` is hard-coded; (c) seconds field mandatory (`:\d{2}`); a tool returning `HH:MM+TZ` only is dropped; (d) `re.match` requires line-start, but split on line 150 is `(?:^|\n)ID:\s*` which keeps everything after `ID:` — fine, but a stray `\nID:` inside a quoted message body will mid-split a real message.
- **Example:** message body `…نقلاً عن \nID: 1234 …` would prematurely split into two parts; the second part would not parse and be dropped.
- **Fix:** split only on lines that *also* match the `Date:` shape, or use a lookahead `(?=\d+\s*\|.*?Date:)`.

### A3. **[Confirmed]** `\\n` → `\n` substitution is one-shot
- **Location:** line 172 — `text.replace('\\n', '\n')`
- **Failure:** a message that genuinely contains the two-character literal `\n` in its content (rare but possible inside hashtag commentary) is mutated; conversely, raw-already-newlined messages are unaffected — fine.
- **Tag:** [Theoretical].

---

## B. Dispatcher silent drops & misclassification

### B1. **[Confirmed]** Entire content domain has NO classifier — Palestinian factions
- **Location:** lines 197–300 (the cascade has no Hamas/Jihad/PFLP/Qassam/Saraya bucket).
- **Rule:** none. Falls through to `other.append(msg)` on line 300 and is silently dropped from every output array.
- **Evidence (last 30 days):** 18 messages mention `حماس`, 5 mention `القسام/كتائب القسام`, 713 mention `فلسطين/جهاد`, plus daily `#فلسطين_المحتلة` headers — none reach JSON.
- **Fix:** add `flag: 'فلسطين'` allies branch keyed on `حماس | كتائب القسام | سرايا القدس | الجهاد الإسلامي | الجبهة الشعبية | #فلسطين_المحتلة`.

### B2. **[Confirmed]** `بيان مهم للقوات المسلحة اليمنية` is dropped
- **Location:** line 275 — `if any(kw in text for kw in ['القوات المسلحة اليمنية', 'أنصار الله']):`
- **Failure:** preview/teaser posts such as `بيان مهم للقوات المسلحة اليمنية في تمام الساعة …` actually match (substring `القوات المسلحة اليمنية`) — *good* — but the variant `قوات صنعاء` / `الجيش اليمني` / `يحيى سريع` / `العميد سريع` does not.
- **Example seen 2026-03-28:** `بيان مهم للقوات المسلحة اليمنية في تمام الساعة 10:15صباحاً، بعد قليل.` actually classified, but spokesman-by-name posts (`العميد يحيى سريع: …`) miss.
- **Fix:** add `يحيى سريع | العميد سريع | حركة أنصار الله`.

### B3. **[Confirmed]** Iran branch keyword set misses `سقوط صاروخ إيراني`
- **Location:** line 246–248
- **Rule:** keyword list omits `صاروخ إيراني`, `استهداف إيراني`, `الردّ الإيراني`, `طهران`, `قاسم سليماني`, `راجعي`, `قاآني`, `بيزشكيان`.
- **Example:** `سقوط صاروخ إيراني في المنطقة الصناعية في بئر السبع` — passed straight through to `other`.
- **Fix:** add `صاروخ إيراني | إيراني | إيرانيّ | طهران | قاآني | بزشكيان`.

### B4. **[Confirmed]** Daily-summary headers dropped
- **Location:** dispatcher has no handler.
- **Rule:** none.
- **Examples:** `الحصاد اليومي لعمليات المقاومة الإسلامية بتاريخ 27-03-2026`, `وضعية عمليات المقاومة الإسلامية بتاريخ 28-3-2026`, `التاسعة والربع بتوقيت بيروت.` (broadcast time-call). All three confirmed dropped.
- **Fix:** add a `summaries[]` bucket or route to `narrative_recap` bayan.

### B5. **[Likely]** Iran-source picker uses break — first match wins, but order is fragile
- **Location:** lines 250–254
- **Rule:** ordered list with `'حرس الثورة الإسلامية'` first and `'الحرس الثوري'` second. Both substrings can co-occur; first wins.
- **Failure:** an article quoting `"الجيش الإيراني والحرس الثوري"` returns `الجيش الإيراني` because it appears earlier in the list. Cosmetic, not a drop.

### B6. **[Confirmed]** Order of operations — Videos branch swallows allied/Iranian/enemy posts
- **Location:** line 226 (videos check executes BEFORE iran/enemy/yemen/iraq).
- **Rule:** any text containing `بالفيديو` is logged as `videos[]`.
- **Failure:** A typical post `**⭕بالفيديو | مشاهد من عملية … #إعلام_العدو …` containing both markers is forced into videos and never indexed as enemy/iran/iraq. Real example seen 2026-04-15.
- **Fix:** move videos check below the four content-domain checks, or treat `بالفيديو` as a *tag* not a class.

### B7. **[Likely]** Dispatcher's bayan trigger is exact substring with shadda/tatweel sensitivity
- **Location:** line 202–204
- **Rule:** three exact substrings: `بيان صادر عن المقاومة الإسلامية`, `بيـان صادر عن غرفة عمليّـات` (note tatweel `ـ` in two positions), `بيان صادر عن حزب الله`.
- **Failure:** (a) any tatweel insertion in the resistance variant (`بيـان صادر عن المقاومة الإسلامية` or `بيان صـادر عن المقاومة الإسلامية`) misses the first rule and falls through; (b) shadda on `الإسلامية` (`الإسلاميّة`) misses; (c) ghurfat variant *requires* tatweel in two positions, so the un-tatweel'd `بيان صادر عن غرفة عمليات` misses; (d) ZWJ between letters (`بيان صادر عن المقاومة الإس‍لامية`) misses; (e) curly-quote / apostrophe variants (`عمليّات` vs `عمليات`) inconsistent across the three rules.
- **Tag:** [Theoretical] in current 30-day window (zero tatweel hits) but [Likely] across the full corpus.
- **Fix:** preprocess `text` with a normaliser (strip `ـ`, normalise alef variants `ا|أ|إ|آ`, remove `ّ`), then match.

### B8. **[Confirmed]** Sirens trigger ignores `صفّارات` (with shadda)
- **Location:** line 210
- **Rule:** `'صفارات الإنذار' in text or 'صفارات إنذار' in text`
- **Failure:** the shadda'd canonical form `صفّارات الإنذار` does not contain the substring `صفارات` — Python `in` is byte-exact, and the literal U+0651 SHADDA between `ف` and `ا` blocks the match.
- **Fix:** match against a shadda-stripped copy.

### B9. **[Likely]** Yemen branch is incomplete
- **Location:** line 275 — keys: `القوات المسلحة اليمنية | أنصار الله`
- **Failure:** misses `صنعاء | الحوثي | الحوثيين | يحيى سريع` — Yemeni operations messaged via spokesman are dropped.

### B10. **[Likely]** Iraq branch order — `'#العراق'` after personal names
- **Location:** lines 285–290
- **Failure:** message `حركة النجباء — كتائب سيد الشهداء` matches first key `حركة النجباء` (fine), but a message `أكرم الكعبي ورد على …` could be a quote from media-of-enemy and gets misclassified as Iraq.

---

## C. `parse_bayan` distortions

### C1. **[Confirmed]** Statement number regex is ASCII-only
- **Location:** line 314 — `r'بيان صادر عن المقاومة الإسلامية\s*\((\d+)\)'`
- **Failure:** `\d` in Python `re` matches only `[0-9]` by default (no `re.UNICODE` digit class for Arabic-Indic numerals). A bayan numbered `(٥٢)` would yield `num = 0`, then cascade through `classify_bayan_type` → line 642 `(num == 0 and 'بيان صادر عن المقاومة الإسلامية' not in text)` — the second clause saves it from `statement` mislabel, so it falls through to `narrative_recap`/`offensive`. Field corruption only — but also breaks dedup in build_index downstream.
- **Evidence:** zero Arabic-numeral bayan in current 30-day sample, but the original publishing channel uses Arabic numerals occasionally in media headers. [Likely → Confirmed risk].
- **Fix:** `(?P<n>[\d٠-٩]+)` and translate captured group through `ARABIC_NUMS`.

### C2. **[Confirmed]** `op_time` requires the exact phrase `عند الساعة`
- **Location:** line 338 — `r'عند\s+الس[ّ]?اعة\s*(\d{2}:\d{2})'`
- **Failure:** misses `في الس(ا)عة` (5 occurrences in 30-day sample), `عند الس(ا)عة` with shadda on `سـ` instead of `ـا`, `الساعة` standalone, `في تمام الساعة`, and any time written `\d{1,2}:\d{2}` (single-digit hour). Exact-`{2}` digits also drops `9:30` (no leading zero).
- **Fix:** broaden preposition list and use `\d{1,2}` hour pattern; convert Arabic digits.

### C3. **[Likely]** Hezbollah-communique branch yields fixed titles, no operation data extracted
- **Location:** lines 318–335
- **Failure:** branch returns hard-coded `target_h` strings with `weapon=''`, `badge='communique'`. If the communique mentions a strike (`بيان صادر عن حزب الله حول العملية في X`), real geographic content is discarded.

### C4. **[Likely]** `tags` block over/under-fires on `إطار التحذير` variants
- **Location:** line 352 — handles `إطار التحذير` and the ZWNBSP variant `إطار ‏التحذير`. Misses `في سياق التحذير`, `ضمن سلسلة تحذيرات`.

### C5. **[Theoretical]** `classify_badge` keyword list is singular-only
- **Location:** line 622 — `['ميركافا','دبابة','دبّابة']`
- **Failure:** `ميركافات`, `دبابات`, `الدبّابات`, broken-plural `دبابتين`, dual-form `دبابتي` not matched. Result: tank engagement misses `tank` badge.

### C6. **[Confirmed]** `classify_badge` uses substring match — `قاعدة` triggers on `قواعد` substring? No — substring is byte-equal. So `قواعد` (plural) does NOT match `قاعدة`. Plural forms (`ثكنات`, `قواعد`, `منظومات الدفاع`) miss `deep`.

### C7. **[Confirmed]** `classify_bayan_type` priority misorders `list_strikes` and `defensive`
- **Location:** line 632, lines 652–655
- **Failure:** A defensive engagement that *also* contains `على النحو الآتي` (multi-target counter-attack) is labelled `list_strikes`, not `defensive` — the latter check never runs. Loses defensive count.

### C8. **[Likely]** `classify_bayan_type` `narrative_recap` keyword `غرفة العمليات` overlaps `غرفة عمليّات المقاومة`. Fine.

---

## D. Target-extraction silent distortions (`extract_target`)

### D1. **[Confirmed]** Special case for warning settlements is too narrow
- **Location:** line 474–476
- **Rule:** matches only `المستوطنات\s+التي\s+سبق\s+التحذير` and `المستوطنات\s+الّ?تي\s+حُذّرت`.
- **Failure:** misses `المستوطنات التي حذّرت منها المقاومة سابقًا`, `المستوطنات المحذّرة`, plural feminine variants. Falls through and may yield empty target.

### D2. **[Confirmed]** `TERM` regex misses Arabic punctuation
- **Location:** line 492
- **Rule:** terminator class `[،,.؛\n(]`
- **Failure:** misses Arabic full stop `۔` (U+06D4 — used in Persian/Urdu citations), Arabic question mark `؟` (U+061F), Arabic exclamation `!` if the text has half-width, em dash `—` (U+2014), and the most common Arabic colon `:`. Targets bleed into the next clause.

### D3. **[Confirmed]** ~50 priority-ordered patterns — each missing `أبراج/مزرعة/حقل/معبر/ميناء/مطار/طريق` variants
- **Location:** lines 495–571.
- **Failure:** every pattern enumerates a fixed noun set (`بلدة|مدينة|قرية|مستوطنة|موقع|قاعدة|ثكنة` etc.). Phrases like `ميناء حيفا`, `مطار رامون`, `معبر كرم أبو سالم`, `محطّة كهرباء X`, `حقل كاريش`, `جسر بنوت سهيل`, `مفرق ج…`, `مدخل النفق`, `تلة الرادار` get matched only if `موقع` happens to appear, otherwise the verb-fallback at line 568 catches them imperfectly.
- **Example phrasing that misses:** `استهدف المجاهدون مرفأ حيفا بصلية صاروخية` — `مرفأ` not in any noun list; pattern at 568 catches verb→prep but the prep here is empty.

### D4. **[Confirmed]** Verb list is inflection-incomplete
- **Location:** lines 545–568
- **Rule:** verbs `استهدف|دكّ|قصف|قصفت|دكّت` (and similar) — feminine `استهدفت`, dual `استهدفا`, plural `استهدفوا/قصفوا/دكّوا`, passive `استُهدف/قُصف/دُكّ` not present.
- **Failure:** `استهدفت كتائب المقاومة موقع …` does not match the masc-singular verb; falls to the broader fallback which is `استهدف|قصف|فجّر|تصدّ|دكّ|أسقط|رصد|اشتبك|شنّ|نفّذ` — masc-singular only.
- **Fix:** allow optional feminine `[تة]?` and plural `[وا]?` suffix.

### D5. **[Likely]** `_clean_body_for_target` strips Hijri but not Gregorian Arabic months
- **Location:** lines 397–402
- **Failure:** `… في ٢ نيسان ٢٠٢٦…` survives and target extraction may anchor on `نيسان`.

### D6. **[Likely]** Tatweel removal at line 385 happens BEFORE pattern matching, but `_LIST_MARKER_RE` and `extract_weapon` operate on the un-cleaned `text` — so a tatweel'd `على النـحو الآتي` survives in `classify_bayan_type` but is invisible to `extract_target`.

### D7. **[Confirmed]** `_clean_location` strips trailing `المحتلّ?ة` etc. but a location *named* `الخليل المحتلة` legitimately keeps the qualifier — wrong.
- **Location:** lines 449–452
- **Fix:** keep occupied/المحتلة when it's the only descriptor.

---

## E. Weapon vocab gaps (`extract_weapon`)

### E1. **[Confirmed]** Fixed lookup, no inflection
- **Location:** lines 591–615
- **Failure:** dictionary keyed on exact substrings; no entry for `صاروخ كاتيوشا`, `راجمة`, `راجمات`, `قذيفة الهاون`, `هاون`, `صاروخ بركان`, `صاروخ كنعان`, `صاروخ فلق`, `بدر-1`, `صواريخ بحرية`, `طائرة كاميكاز`, `طائرة شاهد`, `صاروخ كروز`. Returns `''` and field is empty in JSON.
- **Fix:** broaden to include named-system regex (`صاروخ\s+\S+`, `صواريخ\s+\S+`, `قذائف\s+\S+`).

### E2. **[Likely]** Order of dict iteration matters once Python 3.7+ preserves insertion order, but Python `for k in dict` iterates insertion order. The longest match wins only because it appears first. If a refactor reorders, results silently change.

---

## F. `parse_list_strikes` format misses

### F1. **[Confirmed]** Bullet pattern *requires* a trailing period
- **Location:** line 715 — `\s*\.` is mandatory.
- **Failure:** Arabic bayanat frequently end bullet with `\n` only or with `،` continuing on next line. Sample bayan #52 from 2026-04-17 ends bullets with newline + Quran verse. Bullets become invisible — `strikes[]` empty, full bayan still kept but daily strike count under-reported.
- **Fix:** make terminator `(?=\.|$|\n)`.

### F2. **[Confirmed]** Hashtag terminator excludes diacritics & Arabic digits
- **Location:** line 694 — `#[\u0621-\u064A_]+`
- **Failure:** char class ends at U+064A (yaa) — excludes `ـ` (tatweel U+0640), U+0670 alef khanjariya, U+064B-065F harakat, U+06xx extended forms (Persian `پ ژ گ`). A hashtag `#مقاومة_إسلاميّة` (with shadda U+0651) terminates *early* on the shadda; remainder bleeds into bullet body.

### F3. **[Likely]** Inline pattern requires `الس[ّ]?اعة` AND a leading preposition (`عند|في|وعند|...`). Misses bare `الساعة` start, `بدءًا من الساعة`, or `منذ الساعة`.

### F4. **[Theoretical]** Shared-bullet fallback at line 757–766 is greedy: any `- X.` line in the body becomes a strike, including non-strike footers (`- روابط الصور`).

---

## G. Sirens & SIREN_COORDS coverage

### G1. **[Confirmed]** 106 ungeocoded sirens in last 30 days (raw count)
- **Location:** SIREN_COORDS dict at lines 21–88.
- **Missing entries (frequency):** `كرمئيل` 6× (only `الكرمئيل` with `ال` is in dict — exact-substring match misses), `كريات جات` 3×, `الغجر` 3×, `سهل الحولة` 5×, `إييليت هشاخر` 2×, `راموت نفتالي` 2×, `كريات يام`, `رمات هشارون`, `كريات أتا`. Plus broader markers like `النقب الغربي` (only `النقب` listed — substring works → confirmed match).
- **Fix:** add bare `كرمئيل`, plus a normaliser that strips leading `ال`/`و`.

### G2. **[Likely]** Substring-based dedup in `compute_siren_points`
- **Location:** lines 778–783
- **Failure:** for a siren in `قرب الجليل الأعلى ومحيطه`, both `الجليل الأعلى` AND `الجليل` (if added) would match — code picks the longer one (good). But location `كفر يوفال` (typo for `كفاريوفال`) would fail; `حانيتا وشلومي` matches both, dedup picks longer → but the *other* point loses the time count.

### G3. **[Confirmed]** `SIREN_COORDS` has no shadda/tatweel-normalised lookup
- **Location:** line 779 — `if key in loc`
- **Failure:** `المالكية` (no shadda) is in dict; the shadda variant `المالكيّة` is also in dict — only because someone hand-added it. Not done for any other key (`نهاريا` vs `نهاريّا`, etc.).

---

## Summary

Total decision-point bugs catalogued: **38**.

**(a) Confirmed silent drops (message → no array): 7**
A1, B1 (Palestinian factions), B2 (Yemeni spokesman), B3 (Iranian-missile news), B4 (daily summaries), B6 (video swallow), B7 (some marker variants).

**(b) Likely misclassifications (wrong array/field): 12**
A2, B6 (videos→videos instead of iran/enemy), B8 (shadda sirens), B9, B10, C3, C4, C7, D6, E2, G2, G3.

**(c) Accuracy limits (right array, wrong/empty field): 19**
A3, C1, C2, C5, C6, D1, D2, D3, D4, D5, D7, E1, F1, F2, F3, F4, G1, plus residual target-noise from D-class patterns and weapon-empty cases (E1).

Most impactful single fix: add Arabic-text normaliser (strip tatweel + shadda + alef variants) and apply uniformly before every `in` check and regex.
