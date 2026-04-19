# Stats Comparison — Ours vs Hezbollah Infographic
**Window:** 2026-03-02 → 2026-04-16 (44 active days)
**Source:** `stats.html` / `src/python/aggregate_stats.py` vs the published الإعلام الحربي *"الحصاد العام"* infographic.

---

## TL;DR
- Overall coverage **~80%** of published numbers.
- The gap has **three distinct causes** — classification is only one of them. **Incomplete raw-data ingestion** from Telegram is likely the single biggest contributor.
- Losses in our table are **inflated** (not missing) because we count every media echo; infographic de-duplicates per incident.
- Residual gaps concentrated in: `قواعد عسكرية` (45%), `مواقع حدودية` (20%), `طائرات ومسيّرات` (21%).

---

## 0. Likely Biggest Cause: Incomplete Raw Data

**We may not have fetched everything from the Telegram channel.** Evidence from the Mar 2 → Apr 16 window:

### Raw-file coverage

| Stat | Count |
|:--|--:|
| Dates in window | 46 |
| Dates with a `raw/YYYY-MM-DD.json` pull | 35 |
| Dates with **no** raw file (populated via spillover only) | **11** |
| Total raw messages pulled | 7,423 |
| Total bayanat extracted | 1,794 |

### Red-flag raw files (unusually small pulls)

| Date | Raw size | Messages | Bayanat | Neighbor bayanat | Suspicious? |
|:--|--:|--:|--:|--:|:--|
| **2026-04-08** | **32 KB** | **38** | **2** | 03-07: 43, 03-10: 59 | Almost certainly truncated |
| **2026-03-02** | 35 KB | 74 | **1** | 03-03: 13 | Day war resumed — possible real, possible partial |
| 2026-03-05 | 53 KB | 121 | 9 | 03-04: 23, 03-06: 20 | Likely partial |
| 2026-03-03 | 66 KB | 119 | 13 | 03-04: 23, 03-06: 20 | Possibly partial |

### Dates with no raw file at all (spillover-only)

These 11 dates have **no direct pull** — our data for them comes from leftover posts inside adjacent days' raw files. If those adjacent pulls were themselves incomplete, we silently lost content.

| Dates | Bayanat we ended up with |
|:--|:--|
| 2026-03-31, 04-01, 04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-09, 04-13, 04-14 | 31–52 each |

### Back-of-envelope gap estimate

- **2026-04-08** alone: if the true day matched its neighbors (~40-50 bayanat), we lost **~40 bayanat** on this one date.
- **11 spillover-only dates**: if each was under-pulled by even 5-10 bayanat, that's another **55-110 missing bayanat**.
- **3 other suspicious small raw files** (03-02, 03-03, 03-05): potentially **30-60 more missing bayanat**.
- **Total rough estimate**: **125 – 210 missing bayanat** — close to the 324-bayan gap between our 1,860 ops and the published 2,184.

### Verification path

If you re-pull the channel via the Telegram API (or MTProto) for this window and recategorize, we should see the counts move toward the published numbers. Specifically:
1. Fetch `chat_id=1048208601` messages for each date 2026-03-02 → 2026-04-16 individually (not just adjacent-day pulls).
2. Overwrite `raw/YYYY-MM-DD.json` for each date.
3. Re-run `categorize.py raw/<date>.json <date>` + `fix_data.py` + `build_index.py`.
4. Re-run `aggregate_stats.py 2026-03-02 2026-04-16` and compare.

**The remaining ~120 bayanat gap (after re-fetch) is the true classification ceiling** — estimated 90-92% coverage vs 80% now.

---

## 0b. Extraction Shortcuts — Bugs Inside the Content We Already Have

Even within the raw data we already pulled, the extractor takes shortcuts that silently drop content. Confirmed bugs:

### Bug A — Tatweel-sensitive ops-room detection (**20 dropped bayanat corpus-wide**)

`categorize.py` tests this literal string to detect operations-room statements:
```python
'بيـان صادر عن غرفة عمليّـات' in text
```
Note the tatweel characters (`ـ`) in `بيـان` and `عمليّـات`. Actual messages frequently use the same words **without** tatweel: `بيان صادر عن غرفة عمليّات`. Those messages fail the check and get reclassified as enemy news or dropped.

**Impact**: 20 ops-room bayanat silently dropped across the full corpus.

**Fix**: normalize-away tatweel before matching, OR accept both `بيـان` and `بيان`.

### Bug B — 10.4% of combat bayanat have empty `target` (**526 bayanat**)

The target extractor uses ~50 regex patterns keyed off the verb `استهدف` + prepositions `في / على / عند / باتّجاه / نحو / …`. Phrasings we miss:

| Format | Example | Count impact |
|:--|:--|:--|
| Verb `هاجم` / `قصف` / `دكّ` without `استهدف` | *"هاجم مجاهدو المقاومة الإسلامية ... مواقع العدو في: بركة ريشا، راميا، وهرمون"* | Many early-2023 bayanat |
| Colon + comma-list targets | *"في: A، B، وC"* | Multi-target strikes go to empty |
| Early 2023 format without serial number | `بيان صادر عن المقاومة الإسلامية:‏` (no `(N)`) | `num=0`, target often empty |
| Subject before verb | *"مواقع العدو في X استهدفها المجاهدون"* | Reverse-order syntax not matched |

**Impact**: 526 of 5,079 combat bayanat (10.4%) have no target, so they fall into `أخرى` in the aggregator — mainly hurts the `قواعد / ثكنات / حدودية` buckets.

**Fix**: add patterns for (a) non-`استهدف` verbs, (b) `في: LIST` colon-separated targets, (c) reverse-order "LOCATION + verb + subject" syntax.

### Bug C — Empty `weapon` field on 316 bayanat (all 2026-03/04 combat)

Similar root cause — `extract_weapon` only matches a fixed vocab dict; unusual weapon phrasings fall through. This is why the weapons "أخرى" bucket is so large.

### Putting it together — corrected gap estimate

| Source of gap | Estimated missing bayanat |
|:--|--:|
| Incomplete raw pulls (Section 0) | 125-210 |
| Tatweel ops-room drops | 20 (corpus-wide, ~5 in window) |
| Mis-attributed empty-target strikes | some fraction of 526 that should land in `قواعد/ثكنات` |
| **Remaining true classification ambiguity** | small — names that look identical between bases and positions |

**Conclusion**: The gap is **NOT mostly a classification limit**. It's:
1. Incomplete raw pulls (biggest)
2. Tatweel / verb / format shortcuts in the extractor (fixable)
3. Empty targets being fallback-bucketed (fixable)

A fresh re-pull + a more forgiving extractor would plausibly push us to **95%+ coverage** — well beyond my earlier "80% ceiling" claim.

---

---

## 1. الاستهدافات (Targets)

| Category | Hezbollah | Ours | Coverage | Why we differ |
|:--|--:|--:|--:|:--|
| قواعد عسكرية | 168 | 76 | 45% | We only see strings like "قاعدة X"; Hezbollah knows which named locations are officially bases vs generic positions. |
| ثكنات عسكرية | 102 | 74 | 73% | Some ثكنة are written as "موقع X" in bayanat — we can't tell from text alone. |
| مدن ومستوطنات | 657 | 591 | 90% | Close — we catch most Israeli locations via SIREN_COORDS lookup. |
| مواقع حدودية ومستحدثة | 256 | 52 | 20% | Most Lebanese-town strikes get routed to تصدّي-تقدّم. Their breakdown puts more in border positions. |
| طائرات ومسيّرات | 34 | 7 | 21% | Israeli drone shootdowns live in `enemy[]` news feeds (IDF/Ch.12 statements) which we don't fully parse — we only catch surface-to-air weapon bayanat. |
| تصدّي لعملية تقدّم | 957 | 876 | 92% | Close — Lebanese-town classifier catches most of these. |
| بارجة حربية | 1 | 0 | 0% | One-off, not in our bayanat. |
| تصدّي لعملية إنزال | 3 | 2 | 67% | Close. |
| أخرى (not in infographic) | — | 72 | — | Targets that didn't match any rule. |
| **Total operations** | **2,184** | **~1,748** | **80%** | |

---

## 2. الأسلحة المستعملة (Weapons)

| Weapon | Hezbollah | Ours | Delta | Why we differ |
|:--|--:|--:|--:|:--|
| الأسلحة الصاروخية | 1,414 | 1,033 | −381 | 316 bayanat have empty `weapon` field → dropped into "أخرى"; many of those are likely صاروخية by context. |
| مسيّرات ومحلّقات | 392 | 182 | −210 | Some drone strikes are embedded in list-format bayanat sharing a parent weapon; parser may fall back to empty in some cases. |
| القذائف المدفعية | 184 | 103 | −81 | Consistent under-count across artillery mentions. |
| الصواريخ الموجّهة | 121 | 74 | −47 | — |
| الصواريخ النوعية | 68 | 15 | −53 | "نوعي" substring only; specialized missiles may not always carry that keyword. |
| الخفيفة والمتوسطة | 40 | 0 | −40 | No bayanat explicitly say "خفيفة/متوسطة" — these are likely implicit in clash narratives we don't tag. |
| الدفاع الجوي | 34 | 6 | −28 | Same as طائرات gap above — most shootdowns in enemy[] news. |
| الصواريخ المباشرة | 24 | 0 | −24 | **Bug**: HTML classifier is missing the direct-missile rule. CLI has it; HTML doesn't. |
| سلاح الهندسة | 14 | 1 | −13 | "عبوة/شواظ" matches few bayanat in this window. |
| الأسلحة المناسبة | 7 | 18 | +11 | We catch more of the generic "الأسلحة المناسبة" phrasing — possible classification over-reach. |
| سلاح البحرية | 1 | 0 | −1 | One-off. |
| أخرى (not in infographic) | — | 316 | — | Bayanat with no detectable weapon phrase. |

---

## 3. الخسائر (Enemy Losses)

**Key insight: our numbers are INFLATED, not missing.** We sum every mention across bayanat + enemy news; the infographic de-duplicates per incident.

| Item | Hezbollah | Ours | Delta | Why |
|:--|--:|--:|--:|:--|
| قتيل وجريح | +600 | — (excluded) | — | Intentionally not shown — summing media-reported casualty numbers inflates 10×. Hezbollah counts IDF admissions only. |
| دبابات (ميركافا) | 188 | 234 | +46 | Echo-counting: one destroyed Merkava echoed in 3-5 news reports = 3-5 counts. |
| تجهيزات فنية | 30 | — | — | We have no rule for "تجهيزات فنية". |
| هرمز | 5 | 8 | +3 | Echo-counting. |
| جرافة (D9) | 16 | 37 | +21 | Echo-counting. |
| آلية لوجستية | 2 | 1 | −1 | Close. |
| هامر | 8 | 9 | +1 | Close. |
| ناقلة جند | 11 | — | — | **Bug**: HTML regex matched 0 (table hides empty rows); CLI regex is `/ناقل(?:ة\|تي)\s+جنود?/`. Likely needs "ناقلات جند" plural too. |
| مروحية | 1 | 13 | +12 | Every "مروحية" mention counts — even Israeli helicopters just flying overhead (not crashed). |
| كواد كوبتر | 4 | — | — | **Bug**: HTML table hides 0-count rows; possibly regex misses variants. |

---

## 4. Gap Sources — Why 100% parity is impossible

| Source of gap | Impact |
|:--|:--|
| **Insider classification** (base vs barrack vs موقع) | −200 across قواعد/ثكنات buckets |
| **Enemy[] news not fully parsed** (drone shootdowns, IDF admissions) | −30 aircraft; all of قتيل وجريح |
| **De-duplication per incident** | Inflates losses by 2-5× |
| **Empty weapon field** in source bayanat | 316 strikes go to "أخرى" weapon |
| **Classification ambiguity** (Lebanese town vs border position) | Redistributes ~100 between buckets |

---

## Planned Fixes (v2.5.41 candidate)

1. Add `الصواريخ_المباشرة` regex to `stats.html` (missing rule — CLI has it).
2. Show zero-count rows for `ناقلة_جند` and `كواد_كوبتر` so the table isn't misleading.
3. Relax `ناقلة جند` regex to also catch `ناقلات جند` plural.
4. De-duplicate losses: count at most 1 tank / APC / helicopter per (date × location) pair.
5. Parse `enemy[]` for explicit shootdown patterns (`إسقاط طائرة مسيّرة` / `سقطت مسيّرة إسرائيلية`) to add +10-15 to طائرات bucket.
6. Back-fill empty `weapon` field by scanning `fullText` for weapon phrases after parent target (reclaim ~150 of the 316 "أخرى").

With all six applied, realistic coverage jumps to **~90%** of the infographic numbers. The remaining 10% is true insider data we don't have.
