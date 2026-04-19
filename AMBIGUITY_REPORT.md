# Bayanat Content Ambiguity Report
**Scope:** entire corpus — 924 daily files, 2023-10-07 → 2026-04-17
**Total bayanat scanned:** 5,079

## TL;DR
- Our data treats 1 bayan = 1 istihdaf. That is wrong for **16 bayanat** corpus-wide (all in 2026) covering **81 individual strikes**.
- True estimated istihdaf count: **5,059 combat strikes** from 4,978 non-statement bayanat (uplift **+65** vs the 16 stored list_strikes rows).
- All multi-strike ambiguity is concentrated in the **Mar–Apr 2026 resumption period** — the 2023–2024 war and the 2025 truce produced no list-format or narrative-recap bayanat.
- Found **17 data-quality bugs** in `target` field (12 list-marker corruption, 5 action-verb capture) — **all fixed in v2.5.37**.
- **Tier 1 (v2.5.37)** fixed the target bugs and added `bayan_type`.
- **Tier 2 (v2.5.38)** added `strikes[]` sub-arrays on all 16 list_strikes bayanat. Final numbers above reflect Tier 2 parsing (broader format coverage than the initial scanner, which missed 7 list_strikes and 34 strikes).

---

## Overall Category Breakdown

| # | Category | Count | Est. istihdafat | Notes |
|--:|:--|--:|--:|:--|
| A | Non-combat statements (political / condolence / address) | 84 | 0 | Should not count as operations. |
| B | Defensive (clash / ambush / counter-advance) | 86 | 86 | Maps to "تصدّي لعملية تقدّم". |
| C | Single-strike offensive | 4,899 | 4,899 | Stored correctly. |
| **D** | **List-format multi-strike** (`على النحو الآتي:`) | **9** | **47** | **Stored as 1, should be N.** |
| **E** | **Narrative multi-event recap** (ops-room summary) | **1** | **5** | Stored as 1, recaps multi-day operation. |
| — | **TOTAL** | **5,079** | **5,037** combat | |

Combat bayanat = B+C+D+E = 4,995. Strike uplift = +42.

---

## Per-Year Breakdown

| Year | Bayanat | A non-combat | B defensive | C single-strike | D list | E narrative | Strike uplift |
|:--|--:|--:|--:|--:|--:|--:|--:|
| 2023 (Oct→Dec) | 433 | 4 | 1 | 428 | 0 | 0 | 0 |
| 2024 (full year) | 2,795 | 16 | 33 | 2,746 | 0 | 0 | 0 |
| 2025 (truce — statements only) | 41 | 41 | 0 | 0 | 0 | 0 | 0 |
| 2026 (Jan→Apr 17) | 1,810 | 23 | 52 | 1,725 | **9** | **1** | **+42** |

**Key insight**: the multi-strike bayan format (`على النحو الآتي:`) is brand-new behavior introduced in March 2026. None of the ~2,795 bayanat from the original 2023–2024 war used this format.

---

## Ambiguity Type D — List-format bayanat (all 9 cases)

A single bayan enumerates multiple strikes with timestamps. Pattern: `على النحو الآتي:` followed by either `- HH:MM LOC weapon.` bullets or inline `عند الساعة HH:MM …` lines.

| Date | # | Stored | Actual | Area |
|:--|--:|--:|--:|:--|
| 2026-03-27 | 23 | 1 | **8** | القنطرة — 06:20→08:30 |
| 2026-03-27 | 30 | 1 | **5** | بلدات القنطرة/مركبا — 00:10→06:xx |
| 2026-03-27 | 58 | 1 | **7** | القنطرة — 12:15→xx |
| 2026-03-28 | 32 | 1 | **5** | الطيبة — 03:00→xx |
| 2026-04-09 | 41 | 1 | **5** | موقع 17 / بنت جبيل — 16:35→23:00 |
| 2026-04-09 | 42 | 1 | **4** | مثلّث التحرير / بنت جبيل |
| 2026-04-09 | 43 | 1 | **4** | تلّة غدماثا + فريز / عيناتا |
| 2026-04-09 | 44 | 1 | **5** | مجمّع موسى عبّاس / بنت جبيل |
| 2026-04-09 | 50 | 1 | **4** | مشروع الطيبة |

**Example — 2026-03-27 bayan #23** (stored as 1, should be 8):
> …استهدف مجاهدو المُقاومة الإسلاميّة الجمعة 27-03-2026 تجمّعات … في بلدة القنطرة **على النحو الآتي:**
> - 06:20 محيط الجبّانة بصلية صاروخيّة.
> - 07:10 خلّة العين بصلية صاروخيّة.
> - 07:15 ساحة البلدة بصلية صاروخيّة.
> - 07:30 محيط الجبّانة بصلية صاروخيّة.
> - 07:30 قرب الخزّان بقذائف المدفعيّة.
> - 07:45 وادي العرايش بصلية صاروخيّة.
> - 08:00 ساحة البلدة بقذائف المدفعيّة.
> - 08:30 ساحة البلدة بصلية صاروخيّة.

---

## Ambiguity Type E — Narrative multi-event recap (1 case)

| Date | # | Stored | Actual | Description |
|:--|--:|--:|--:|:--|
| 2026-03-31 | 0 | 1 | **≥5** | Operations-room recap of 3-day محور عيناتا engagement: IED on Merkava 01:30, engagement 10:00, IEDs 15:00 + 16:00, 3 consecutive clashes 12:00–17:00 on Mar 30, command-post strike 19:45, >15 artillery salvos. |

**Risk**: this is a post-hoc summary — its constituent events are already individually announced in earlier daily bayanat, so adding the 5 strikes risks double-counting. Flag but consider excluding from totals.

---

## Ambiguity Type B — Defensive bayanat (86 corpus-wide)

Bayanat describing Israeli advances / infiltrations / landing attempts that the resistance countered, rather than offensive strikes outward.

| Year | Count |
|:--|--:|
| 2023 | 1 |
| 2024 | 33 |
| 2026 | 52 |

**Sample (2026-03-26 #3):**
> …وأثناء محاولة قوّة من جيش العدوّ الإسرائيليّ التقدّم باتّجاه بلدة دير سريان عند الساعة 02:20 **اشتبك معها مجاهدو المُقاومة الإسلاميّة** بالأسلحة المناسبة…

**Recommendation**: tag with `bayan_type: "defensive"` so stats can split offensive vs counter-operations — this is the dimension the published infographic uses.

---

## Ambiguity Type A — Non-combat statements (84 corpus-wide)

Political statements, condolences, addresses to citizens. They shouldn't count as operations.

| Year | Count | Notes |
|:--|--:|:--|
| 2023 | 4 | Few political statements during early war |
| 2024 | 16 | Periodic political statements |
| 2025 | **41** | **Entire year — truce period, only statements (no combat ops)** |
| 2026 | 23 | Resumption period statements |

The 2025 figure is a giant data-quality smell: that whole year is currently being ingested as "bayanat" but contains zero strike announcements — it's purely Hezbollah communiqués (Khamenei, condolences, ceasefire violations, etc.).

**Examples:**
- 2025-01-20 #0 — `بيان صادر عن حزب الله` celebrating Gaza ceasefire (not a strike).
- 2026-03-02 #0 — `بيان إلى أهالي الجنوب والبقاع والضاحية`.
- 2026-03-09 #0 — `بيان صادر عن حزب الله حول انتخاب آية الله السيد مجتبى الخامنئي`.

**Recommendation**: add a `bayan_type: "statement"` flag at categorize time so they don't pollute strike counts.

---

## Data-Quality Bugs in `target` Field (17 cases)

Found while scanning. Separate from the multi-strike ambiguity but worth surfacing.

### Bug 1 — List-format target corruption (12 bayanat, all 2026)
Categorizer captured text after `على النحو الآتي:` as the target instead of the actual primary target.

| Date | # | Bad target |
|:--|--:|:--|
| 2026-03-27 | 23 | `الآتي: - 06:20 محيط الجبّانة` |
| 2026-03-27 | 30 | `الآتي: - 00:10 مرتفع جنيجل في بلدة القنطرة` |
| 2026-03-27 | 58 | `الآتي: - 12:15 مرتفع دوّار العرايش` |
| 2026-03-28 | 32 | `الآتي: - 03:00 طريق بيدر النهر` |
| 2026-04-09 | 43 | `الآتي: تلّة غدماثا` |
| 2026-04-09 | 50 | `الآتي: مشروع الطيبة` |
| 2026-04-11 | 36 | `الآتي: - منطقة صف الهوا ومحيط مدرسة الإشراق` |
| 2026-04-11 | 37 | `الآتي: - شرق معتقل الخيام` |
| 2026-04-13 | 21 | `الآتي: - غرفة منامة جنود في ثكنة يفتاح` |
| 2026-04-13 | 45 | `الآتي: - جنوب بلدة مركبا` |
| 2026-04-16 | 24 | `الآتي: - قرب الخزّان` |
| 2026-04-16 | 25 | `الآتي: - محيط مجمّع موسى عبّاس` |

### Bug 2 — Action-verb captured in target (5 bayanat)
Target field swallowed the clash verb + operator phrase.

| Date | # | Bad target |
|:--|--:|:--|
| 2024-10-02 | 0 | `العديسة من جهة خلة المحافر واشتبكوا معها وأوقعوا بها خسائر` |
| 2026-03-18 | 6 | `معتقل الخيام واشتبكوا معهم` |
| 2026-03-25 | 68 | `مدخل بلدة القنطرة اشتبك معها مجاهدو المُقاومة الإسلاميّة واستهدفوا من مسافة` |
| 2026-03-26 | 3 | `دير سريان اشتبك معها مجاهدو المُقاومة الإسلاميّة` |
| 2026-03-29 | 54 | `مارون الراس الحدوديّة واشتبكوا معها` |

**Recommendation**: patch `src/python/categorize.py` target extractor to:
1. Stop at `على النحو الآتي` / `على الشكل الآتي` / `كالآتي` — use the pre-marker phrase as target.
2. Strip trailing `اشتبك معها / واشتبكوا معها / واستهدفوا…` suffix from extracted target.

---

## Comparison vs Published Infographic (Mar 2 → Apr 16, 2026)

The infographic states 2,184 operations for that window. Our slice for the same window:

| Source | Count |
|:--|--:|
| Our stored bayanat | 1,794 |
| +list-format uplift | +42 |
| − non-combat statements | −13 |
| Our **offensive** istihdaf estimate | **~1,827** |
| Infographic's "داخل الأراضي الفلسطينية" (offensive) | 1,127 |
| Infographic's "داخل الأراضي اللبنانية" (defensive/counter-ops) | 1,057 |
| Our defensive bayanat (type B) for that window | 48 |
| Our `enemy[]` events for that window | 1,411 |

We're **above** their offensive count for the window (1,827 vs 1,127) — likely because we count every announcement and they only count strikes that hit specific defined target categories. Their 1,057 Lebanese-side ops cannot come from bayanat alone; it must include filtered `enemy[]` clash/advance events.

---

## Recommended Fixes (prioritized)

1. **Patch `src/python/categorize.py`** — fix target extractor for list-format + action-verb patterns (17 bayanat fixed, plus all future occurrences). Quickest win.
2. **Add `bayan_type` field** at categorize time: `statement | offensive | defensive | list | narrative`. Lets all downstream code (validator, build_index, stats) filter cleanly.
3. **Expand list-format bayanat into a `strikes[]` sub-array** — keep 1 announcement = 1 bayan row, but emit N strike entries for downstream stats.
4. **Reclassify 2025 bayanat as statements** — the 41 entries from the truce year shouldn't appear in operation counts.
5. **Build a two-source aggregator** for infographic-style stats: `bayanat` (offensive) + filtered `enemy[]` (defensive clashes via `اشتباك | تصدّي | تقدّم | تسلّل`).
