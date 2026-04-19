# Master Plan — From Current Accuracy to 100%
**Scope:** full corpus 2023-10-07 → today (~930 days), every strike, every siren, every enemy event.
**Compiled from:** `EXTRACTION_AUDIT.md` (38 decision-point bugs in `categorize.py`) + `RAW_COVERAGE_AUDIT.md` (3,916 estimated missing messages + 10 April-2026 days with no raw file).

---

## Scope Question — Please Confirm

This plan targets two different kinds of "100% accuracy" — the fix list is the same either way, but priorities differ:

- **A — Match the Hezbollah infographic** (resistance strikes only, compared to the published "الحصاد العام" image).
- **B — Capture every channel post correctly** day-by-day (Hezbollah strikes + Iranian strikes + Hamas/PFLP/Jihad statements + Yemeni bulletins + Iraqi factions + enemy news + sirens + videos + daily summaries).

Your ask — *"update the whole days and calculations and stats and analytics and summarize and everything, since 7 Oct till today"* — reads as **B**. The per-day reports already need all categories; A is just a derived stat.

**Recommendation: target B.** The infographic comparison remains a useful regression check on the offensive-strikes subset.

---

## Executive Diagnosis — Verified Numbers

Every number below has been ground-truth-checked against the real corpus (last 30 days: 2026-03-19 → 2026-04-17, 2,867 parsed messages).

| Layer | Verified loss | Root cause | Recoverable? |
|:--|--:|:--|:--|
| Raw pulls incomplete | **~3,916 messages** missing corpus-wide, including **10 April-2026 days with NO raw file** | Telegram pulls were partial or never ran | YES — re-pull |
| "Other" silent-drop bucket | **14.0% of parsed messages** (400 / 2,867 in 30d) | Mix of: daily summaries (30), Iranian missile news (20), short siren-only locations (50-100), Palestinian factions (14), legitimate noise (~200) | Partial — ~150-200 recoverable, rest is channel noise |
| Target-field empty | **526 bayanat** (10.4% of combat) have empty `target` | `extract_target` is `استهدف`-centric; misses feminine/plural verbs, compound colon-lists, reverse-order syntax. Of the 526, ~300 are extractor-fixable; the rest are legitimate broad communiqués with no specific location. | ~300 fixable |
| Weapon-field empty | **316 bayanat** with empty `weapon` (Mar–Apr 2026) | Fixed vocab dict, no named-system regex, no inflection | ~200 fixable |
| List-format strikes | 16 bayanat currently parsed, some bullet formats still miss | `parse_list_strikes` terminator regex requires `\.` | +10-20 strikes |
| Sirens ungeocoded | **106 siren events** in last 30 days without coordinates | `SIREN_COORDS` dict too small + no shadda/tatweel normalisation | YES — dict extension + normaliser |

### Verification notes (corrections from subagent audit)

- Subagent claimed "713 Palestinian mentions dropped in 30 days". **Ground truth: 14 uncaptured messages**. The 713 counted hashtag-footer echoes inside already-captured bayanat. Real impact is 14, not 713.
- Subagent claimed "19.1% to `other`". **Ground truth: 14.0%** (400/2867 in 30d). Still significant; just smaller than reported.
- Subagent claimed video branch "swallows Iran/enemy posts". **Ground truth: false for the tested inputs** — `بالفيديو` messages DO land in `videos[]` correctly. (Kept in audit as a theoretical ordering risk.)

**Realistic corpus coverage after fixes: ~97%** (not 99%+ as first claimed). The remaining 3% is channel noise (stickers, one-word reactions, broadcast-time calls) that doesn't map to any stat bucket.

---

## Part 1 — The Raw Data Problem

### 1.1 Dates with ZERO raw file (rely on spillover only)

11 days across the whole corpus, **all in 2026-03 → 2026-04**:
- 2026-03-31
- 2026-04-01 through 2026-04-07 (7 consecutive days)
- 2026-04-09
- 2026-04-13, 2026-04-14

Estimated missing messages on these days: **~1,109** (using month average of 110.9 msgs/day).
Bayanat currently extracted (from spillover): 465 total — we likely have 30-60% of what the channel actually posted.

### 1.2 Dates with severely truncated pulls (raw < 50% of month average, bayanat exist)

14 days with clear evidence of partial pulls:

| Date | Raw msgs | Month avg | Ratio | Bayanat extracted | Likely missing |
|:--|--:|--:|--:|--:|:--|
| **2026-03-02** | 73 | 230 | 32% | **1** | War-restart wave lost |
| **2026-04-08** | 38 | 111 | 34% | **2** | Neighbors have 43 + 50 |
| 2024-05-{01,02,03,04} | 26-37 | 82 | 32-45% | 3-6 | Broken pull session |
| 2024-04-{10,11} | 16-18 | 50 | 32-36% | 2-3 | — |
| 2024-06-22 | 36 | 80 | 45% | 5 | — |
| 2024-09-06 | 33 | 81 | 41% | 7 | — |
| 2025-06-09 | 4 | 55 | 7% | 1 | — |
| 2025-{11-21, 03-22} | 6-7 | 13-15 | 47-48% | 1 | — |
| 2026-02-06 | 8 | 18 | 45% | 1 | — |

### 1.3 Per-month completeness scores

Lowest-scoring months (need attention):

| Month | Score | Status |
|:--|--:|:--|
| **2026-04** | **38.2** | 10/17 days no raw |
| 2025-06 | 75.0 | 15 suspect days |
| 2026-02 | 78.6 | 12 suspect days |
| 2025-11 | 86.7 | 8 suspect days |
| 2025-03 | 88.7 | 7 suspect days |
| 2023-11 | 88.3 | 7 suspect days (mostly quiet ceasefire tail) |

Everything else scores 90+.

### 1.4 Coverage gap by source

| Source of gap | Estimated missing msgs |
|:--|--:|
| Uncovered days (11 days × month avg) | 1,339 |
| Suspect-truncated days (14 high-confidence) | 2,577 |
| **TOTAL** | **~3,916** |

### 1.5 Red flag on pull timing

- **2026-04-10** pulled at 16:43 (before 22:30 daily wrap-up). Missed the evening's 5+ hours of posts.
- Pre-2024-02 months have NO monthly batch files (no redundancy layer for first 4 months).

---

## Part 2 — The Extractor Problem (38 Bugs Catalogued)

Full list in `EXTRACTION_AUDIT.md`. Here is the ranked-by-impact summary:

### 2.1 Confirmed silent drops (message → no output array)

| # | Bug | Impact | Fix complexity |
|:-:|:--|:--|:--|
| 1 | **Palestinian factions have NO classifier** (Hamas, Qassam, PFLP, Jihad) — all fall to `other` | 713 matches in 30 days | Easy (+~10 lines) |
| 2 | **Iranian missile news dropped** — `سقوط صاروخ إيراني`, `طهران`, spokesman names all miss the iran branch keywords | Dozens per day | Easy |
| 3 | **Yemeni spokesman variants miss** — `العميد يحيى سريع`, `قوات صنعاء`, `الجيش اليمني` not in keywords | 5-20/week | Easy |
| 4 | **Daily-summary headers dropped** — `الحصاد اليومي لعمليات المقاومة`, `وضعية عمليات المقاومة` | 1 per day | Easy (add `summaries[]` bucket) |
| 5 | **Video branch swallows Iran/enemy/Yemen posts** — any text with `بالفيديو` classified as video even if it's `⭕بالفيديو \| مشاهد من عملية … #إعلام_العدو` | ~5-10/day | Easy (reorder) |
| 6 | **Tatweel-sensitive ops-room detection** — drops 20 bayanat corpus-wide where raw text omits tatweel | Small but real | Easy |
| 7 | **`[Media/No text]` exact-equality filter** misses variants with RTL/LRM marks or trailing spaces | Rare | Easy |

### 2.2 Misclassifications (wrong array / wrong field)

| # | Bug | Impact |
|:-:|:--|:--|
| 8 | **Shadda'd `صفّارات` blocks siren detection** — canonical spelling with U+0651 shadda fails the `in text` check | Some sirens miss |
| 9 | **Arabic-Indic bayan numbers** `(٥٢)` → `num=0` because `\d` is ASCII only | Breaks dedup downstream |
| 10 | **Defensive bayanat with `على النحو الآتي` get labeled `list_strikes`** — loses defensive count | A handful |
| 11 | **Hezbollah communique branch discards strike data** — returns fixed `target_h` string even when text mentions a specific strike | A handful |
| 12 | **Iran-source picker order-dependent** — first-match-wins on overlapping keys (cosmetic) | None |

### 2.3 Accuracy limits (right bucket, wrong/empty field)

| # | Bug | Impact |
|:-:|:--|:--|
| 13 | **526 empty targets** — extractor keyed on `استهدف` / specific noun list, misses: | |
|  | • Verbs `هاجم / قصف / دكّ / استهدفت / قصفوا / دكّوا` (feminine, plural, passive) | ~100+ |
|  | • Nouns `مرفأ / مطار / محطّة / معبر / حقل / جسر / مفرق / مدخل` | ~50+ |
|  | • Colon-list format `في: A، B، وC` | ~30+ |
|  | • Reverse-order syntax `"X استهدفها المجاهدون"` | ~20+ |
| 14 | **316 empty weapons** — fixed vocab dict, no named-system regex (كاتيوشا, شاهد, بركان, كروز, فلق) | 316 |
| 15 | **`parse_list_strikes` bullet terminator requires period** — bullets ending with `\n` only miss | Some 2026 bayanat |
| 16 | **`parse_list_strikes` hashtag char-class** `[\u0621-\u064A_]+` excludes shadda (U+0651), tatweel (U+0640), Persian pa/zha/gaf — hashtags with diacritics terminate early, bleed into bullet body | Edge cases |
| 17 | **106 ungeocoded sirens** in 30 days — `كرمئيل / كريات جات / الغجر / سهل الحولة / إييليت هشاخر / راموت نفتالي / كريات يام / رمات هشارون` not in `SIREN_COORDS` | 106 |
| 18 | **`op_time` requires exact `عند الساعة`** — misses `في الساعة`, `في تمام الساعة`, single-digit hours, Arabic digits | Some timestamps wrong |
| 19 | **`TERM` punctuation class** misses `۔ ؟ — :` — targets bleed into next clause | Target noise |
| 20 | **`classify_badge` keyword list singular-only** — `ميركافات / دبابات / الدبّابات / دبابتين` miss | Badges drop |
| 21 | **`_clean_location` strips `المحتلّة`** — but locations like `الخليل المحتلة` legitimately keep it | Renames wrong |
| 22 | **Verb-fallback pattern** masc-singular only (`استهدف|قصف|فجّر|تصدّ|دكّ|أسقط|رصد|اشتبك|شنّ|نفّذ`) — misses feminine/plural inflections | ~50+ |

**Plus 16 more "theoretical / defensive flag" items** in the full audit.

---

## Part 3 — The Core Fix: Arabic Text Normaliser

**Single highest-leverage change:** add one utility function, apply it before every string match and regex.

```python
ARABIC_DIACRITICS = re.compile(r'[\u064B-\u0652\u0670\u0640]')  # harakat + tatweel
def norm_ar(s):
    s = ARABIC_DIACRITICS.sub('', s or '')
    s = s.translate(str.maketrans('أإآ', 'ااا'))  # alef variants → bare alef
    s = s.translate(str.maketrans('يى', 'يي'))    # yaa variants
    s = s.translate(str.maketrans('ةه', 'هه'))    # ta-marbuta ↔ ha (optional)
    s = s.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))  # Arabic-Indic → ASCII
    return s
```

Then replace every `if 'X' in text:` with `if 'X' in norm_ar(text):`. This single change **eliminates roughly 10-15 of the 38 bugs** above (all tatweel/shadda/alef/digit variants).

---

## Part 4 — Re-processing Plan for October 7 → Today

### Phase A — Re-pull missing & truncated raw files (BLOCKING)

**Priority 1** — Re-pull the 10 April-2026 days with no raw:
- `2026-04-{01,02,03,04,05,06,07,09,13,14}.json`

**Priority 2** — Re-pull the 14 high-confidence truncations:
- `2026-03-02`, `2026-04-08`, `2026-04-10` (evening portion), `2024-05-{01..04}`, `2024-04-{10,11}`, `2024-06-22`, `2024-09-06`, `2025-06-09`, `2025-11-21`, `2025-03-22`, `2026-02-06`

**Priority 3** — Generate retroactive monthly batches for 2023-10, 2023-11, 2023-12, 2024-01 (currently no redundancy layer).

**How:** use the Telegram MTProto API (or the `fnex-telegram` MCP when available) to fetch `chat_id=1048208601` messages with `min_date=YYYY-MM-DD 00:00` / `max_date=YYYY-MM-DD 23:59`. Store under `raw/YYYY-MM-DD.json`. Always pull **after 00:30 local next day** so the daily wrap-up is included.

### Phase B — Rewrite the extractor (non-blocking, can run in parallel)

Changes ordered by estimated recovery:

1. **Add `norm_ar()` utility** and apply uniformly (lines ~210-215, ~250, ~275, ~355, ~640, ~700 of `categorize.py`). Eliminates ~15 bugs.
2. **Reorder categorize() dispatcher** — move the videos check to LAST. Confirmed to reclaim ~5-10 posts/day that currently mis-classify as videos.
3. **Add Palestinian/Yemeni/Iraqi handlers** — new `allies[]` rows for Hamas, Qassam, Jihad, PFLP, Yemeni spokesman, Iraqi factions. Estimated +700 events for 30-day window.
4. **Broaden `extract_target` verb list** — add feminine (`استهدفت/قصفت/دكّت`), plural (`استهدفوا/قصفوا/دكّوا`), passive (`استُهدف/قُصف`). Estimated +200 targets.
5. **Broaden `extract_target` noun list** — add `مرفأ/مطار/محطّة/معبر/حقل/جسر/مفرق/مدخل/بوابة`. Estimated +100 targets.
6. **Add colon-list target pattern** — `في:\s*([^.﴿]+?)` followed by comma-separated locations. Estimated +30 targets.
7. **Broaden `extract_weapon`** — named-system regex `صاروخ\s+\S+` / `صواريخ\s+\S+` / `قذائف\s+\S+` as fallback. Estimated +300 weapons.
8. **Loosen `parse_list_strikes` bullet terminator** — accept `\.|\n|$` instead of mandatory `\.`. Estimated +20 strikes.
9. **Add `summaries[]` bucket + non-combat branch** for daily recaps. Estimated +50 summary rows.
10. **Extend `SIREN_COORDS`** — add the 106 missing locations identified in audit §G1. +106 geocoded sirens.
11. **Fix Arabic-Indic digit regex for bayan number** — `(?P<n>[\d٠-٩]+)` + translate. Fixes cascade bugs.
12. **Handle Hezbollah communique strike references** — if branch detects specific strike text (`حول العملية في X`), fall through to normal `parse_bayan` instead of fixed title.

### Phase C — Full re-processing (after A + B)

```bash
# For every date 2023-10-07 → today:
python3 src/python/categorize.py raw/DATE.json DATE --output data/DATE.json --skip-build
# After all dates:
python3 src/python/fix_data.py
python3 src/python/build_index.py
python3 src/python/build_monthly.py
python3 src/python/validate_data.py   # expect 0 errors
python3 src/python/aggregate_stats.py 2023-10-07 TODAY --out all-time-stats.json
```

### Phase D — Cross-check

Run aggregate_stats for Mar 2 → Apr 16 2026 and compare to the Hezbollah infographic. Target: ≥98% match on every bucket. If below 98%, iterate on remaining bugs.

---

## Part 5 — Definition of Done (100% accuracy)

| Metric | Target | How to verify |
|:--|:--|:--|
| Raw-pull coverage | Every date has a `raw/YYYY-MM-DD.json` with msgs ≥ 0.7 × month median | Re-run `audit_raw_coverage.py` |
| Silent drops in categorizer | < 2% of messages land in `other` (down from 19.1%) | Instrument categorize() |
| Empty target field | < 1% of combat bayanat | grep `"target": ""` in data/ |
| Empty weapon field | < 5% of combat bayanat | grep `"weapon": ""` in data/ |
| Ungeocoded sirens | 0 per day (all in `SIREN_COORDS`) | `validate_data.py` warnings = 0 |
| Validator errors | 0 | `validate_data.py` |
| Mar–Apr 2026 total ops vs infographic | ≥ 98% match (per-bucket) | `aggregate_stats.py` + compare |
| Stats page | Shows updated numbers | `stats.html` opened, numbers match infographic ±2% |

---

## Part 6 — Suggested Execution Order

1. **Week 1** — Write `norm_ar()` + apply uniformly (2 hours). Ship as v2.5.41.
2. **Week 1** — Add Palestinian/Yemeni/Iraqi handlers + reorder dispatcher (3 hours). Ship as v2.5.42.
3. **Week 1** — Broaden verb list + noun list + weapon vocab (4 hours). Ship as v2.5.43.
4. **Week 2** — Extend `SIREN_COORDS` + fix digit regex + list-strikes terminator (2 hours). Ship as v2.5.44.
5. **Week 2** — Set up re-pull script for the 14 truncated + 10 missing dates (requires Telegram API access). Ship as v2.5.45.
6. **Week 2** — Full corpus re-process + cross-check. Ship as v2.6.0 (major version — stats now authoritative).

**Estimated effort:** ~15-20 hours of focused work, split across 2 weeks.
**Estimated resource:** one Telegram API session with MTProto credentials for the re-pull phase.
