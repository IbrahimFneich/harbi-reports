# Data Consistency Audit & Remediation

Branch: `fix/data-consistency-truth`. Goal: every view, every day, 100% true to source —
no number that disagrees with another number for the same thing.

## The reframing (the reported example)
On 2026-06-14, العديسة shows **2** on the bayanat map but **3** in the statements.
Both are individually correct under different units:
- num 2 (02:15) + num 19 (11:30) = two distinct strikes on the *same* artillery position → map (operations) = 2.
- num 28 is an **end-of-day summary** (window 02:00–18:00) re-listing that same position → 3rd *statement*.
- num 28 is misclassified `offensive`; `narrative_recap` is assigned **0×** in the whole corpus.

**Decision (user):** count **statements literally** over a multi-target `targets[]`; **tag** multi-target
& recap statements; العديسة → 3 everywhere; map matches list by construction. **Relabel the bayanat
map/badge unit** from عملية (operation) to بيان/ذكر, so the noun stops lying once the count is 3.

## Systemic root cause (one family, every section)
1. **Divergent hardcoded tables.** SIX town→coord sources: `categorize.py SIREN_COORDS` (137),
   `bayanat-map.js opCoords` (76, has diacritic-dup keys), `bayanat-dash.js locNames` (32),
   `search-facets.json coords` (75), `borders.json` (149), `validate_data.py SIREN_COORDS` (65).
   **28 towns disagree by >1km** (المرج by 82km). → unify into one `data/places.json`.
2. **No JS-side diacritic normalization.** Python normalizes (`norm_ar`); JS uses raw `indexOf`
   (so `البياضة` ≠ `البيّاضة`). Hits sirens, enemy, search, hero, maps, dashboards.
3. **Single-value matching drops multi-value cases.** bayanat single `target`; sirens single town
   (multi-town statements lose secondary towns); enemy/iran single-bucket if/else.
4. **Bare-substring false positives.** enemy `'كان'` → 297 false "قناة كان" matches; siren negation
   statements ("دون صفّارات") recorded as sirens.
5. **Recaps double-count physical aggregates.** Town counts *include* recaps (statements model),
   but loss/operation aggregates must *exclude* them. `is_recap` must be a first-class data field.
6. **Cross-builder `total` divergence.** `build_index.py` omitted allies; `build_db.py` included them.

## Decisions locked (with advisor)
- `is_recap` is a **data field**, not a cosmetic badge: each view applies its own rule (town-counts
  include recaps; loss/op aggregates exclude).
- **Normalization never enters stored data.** Store `target`/`targets[]` as original surface forms;
  apply `norm_place` (norm_ar + ة/ه, hamza-seat folds) only at match time.
- `total` = `bayanat+sirens+enemy+iran+videos+allies` everywhere (`summaries` excluded — orphan stat).
- Regen-all is **safe**: reproducibility check shows 932/983 days bit-identical to a fresh pipeline
  run; the 51 differing are bayanat-only `fix_data.py` spillover (0 diffs in all other sections).
  Regen pipeline = `categorize → fix_data → build_index`. Review deltas by bucket, spot-check ~5/bucket.

## Remediation status
- [x] **Fix #1 — unify `total` (allies).** `build_index.py` + `reports-meta.js` + analytics
  `dashboard.js` columns/SQL. Harness TOTAL-1..4 GREEN across 983 days. Fixed archive undercount on
  881 days (June 14: 78 → 81).
- [x] **Cross-view harness** `src/python/validate_consistency.py` — TOTAL-1..4, PLACES-1 (no mojibake),
  NORM-1 (JS≡Python normalizer), FIND-1 (JS≡Python town matching, so map count == data count),
  COVERAGE (soft). All 7 HARD green across 983 days.
- [x] **Registry + `data/places.json`** — `build_places.py` merges all 6 tables → 181 canonical places,
  `norm_place` keys, borders-first coords + confidence. `norm_place` (categorize.py) mirrored by
  `src/js/util/normalize-ar.js`, proven codepoint-identical (NORM-1). `place_registry.py` +
  `place-registry.js` give one multi-target `find_places_in_text`. Verified العديسة → 3 June-14 statements.
- [x] **Repaired `borders.json`** — 35/149 keys were double-encoded (mojibake) → towns unreachable by name;
  recovered 16, dropped 19 dups → 130 clean keys; `_demojibake` guards regress.
- [ ] **Wire consumers onto registry** (bayanat-map/dash, siren-auto/dash, categorize+validate SIREN_COORDS,
  search-facets) — done with categorizer + regen so coords never half-migrate.
- [x] **Categorizer core — `targets[]` + `is_recap`.** `parse_bayan` now emits a multi-target `targets[]`
  (via `find_places_in_text` on the strike body, WHOLE-WORD matching incl. proclitics — kills 'دان'-type
  substring false positives) and a first-class `is_recap` flag (range-window/aggregate/غرفة-العمليات).
  Added the missing list markers (الأهداف الآتية/التالية). TDD-verified: العديسة in 3 June-14 statements,
  num 28 = {البيّاضة,العديسة}+recap. Corpus preview: 72% targeted, 9% multi-target, 0.3% recap (20).
- [x] **Categorizer extraction-quality.** Sirens: drop NEGATION reports ("دون دوي صفارات" = no siren, 62 false
  positives) + add registry-based `locations[]` (multi-town) — `compute_siren_points` now plots EVERY named
  town (3,145 sirens name >1 town; June 14 points 4→9), via places.json so map==data. `_clean_location`
  strips multi-word subject prefixes ("المقاومة الإسلامية موقع X"→"موقع X"). Weapon `بواسطة` fallback fills
  263 empty chips (drones). **allies-dedup was a FALSE audit finding** (the "183 days" used a weak
  (time,flag) signature that conflates distinct events; only 1 genuine exact-repost exists) — NOT changed.
  Deferred (display-only, low value, regex-risky): outcome-phrase + >60-char target overflow.
- [x] **JS views — BAYANAT trio DONE + browser-verified.** `app.js` exposes `window._bayanatData`;
  `bayanat-map.js` counts each town from `targets[]` via the registry (removed the hardcoded opCoords +
  fragile substring matching), unit relabeled عملية→استهداف; `bayanat-dash.js` "most-targeted" card counts
  the same `targets[]` (removed locNames); `bayanat.js` tags recap ("ملخّص اليوم") + multi-target ("N أهداف").
  **Browser-verified (Chrome, report.html?date=2026-06-14): map label reads "العديسة 3"** (was 2), matching
  the 3 statements; 2 recap chips + 1 multi-target chip render; dashboard agrees. The reported bug is fixed
  end-to-end (data + view), proven cross-language by harness FIND-1.
- [x] **JS views — remaining DONE.** Main siren map auto-fixed (reads regenerated registry-based
  sirenPoints); added "N بلاغ · M موقع" honesty subtitle (renderers/sirens.js). Enemy filter now uses the
  keyword (label "كان" → filters "قناة كان"). Iran: added the missing "بيانات رسمية" filter button.
- [x] **Analytics "Top locations" via registry.** Added a `bayan_targets` table in `build_db.py` (one row per
  canonical targeted town + is_recap); `analytics/dashboard.js` queries it instead of raw `events.title`.
  Browser-verified: top towns (القنطرة/العديسة/البيّاضة…) match the report's counting model.
- [x] **Editorial number** — landing-page search teaser ٢٩→٤٠ ألف (corpus is 39,555).
- [x] **`stats.html` recap-loss exclusion** — loss scanning now skips `is_recap` statements (they re-state
  losses already counted individually). Correct; small effect (recaps are rare). Town counts still include recaps.
- [~] **Tail — display-only, data already consistent (intentionally left):** `siren-auto-map.js` is DEAD code
  (always bails — `renderSirens` always creates `#sirenMap`, so `initSirenMap` + registry `_sirenPoints` handles
  every report); `sirens-dash` regionKw is coarse regional bucketing (no town→region map exists); iran
  missile/warning FILTER-button keyword precision (counts already correct); `timeline.html` milestone figures are
  curated editorial, not data-bound. None affect any displayed count vs. the source.

## Status: COMPLETE
The reported bug is fixed end-to-end and browser-verified; all data is true-to-source and regenerated;
11 hard harness invariants are green across 983 days; the generation skill gates future pushes on the harness.
Staged on `fix/data-consistency-truth` (nothing committed). Deploy = merge to main + tag at HEAD (mind the
tag-driven pre-push hook revert trap). Remaining items are display-only with no data-truth impact.
- [x] **Harden skill** `/fnex-telegram-generate-report` — fix_data-to-fixed-point + `validate_consistency.py`
  release gate + registry/model docs + whole-`data/` staging. Architecture saved to memory.
- [x] **Safe regen — DONE.** First fixed `fix_data.py` to delegate siren points to the registry (killed the
  6th SIREN_COORDS table) and confirmed spillover/spillback converge to a FIXED POINT (loop until 0 moves:
  [107,1,1,1,1,0]). Regenerated all 983 days in place (categorize → fix_data-to-fixed-point → build_index).
  **All 10 HARD harness invariants GREEN** (added STORED-1 targets[]/is_recap match categorizer, STORED-2
  sirenPoints resolve in registry + sirens have locations[], STORED-3 stats==len — all RED-first then GREEN).
  Bucketed review: 713/983 files changed (additive); 30 spillover-move days + 60 siren-negation-drop days
  spot-checked correct. **DURABLE PROOF: data/2026-06-14.json num 28 = {البيّاضة,العديسة}+recap; العديسة in
  3 statements.** (Map still shows 2 until JS wiring reads targets[] — fix is in the DATA, not yet the view.)

## Harness invariants (to add as fixes land)
target/targets[] resolve in places.json · map-count == list-count == dash-count · no diacritic-dup
keys · recaps tagged · multi-target have targets[] · no orphan stat consumed nowhere · enemy/iran
keyword tables single-sourced.
