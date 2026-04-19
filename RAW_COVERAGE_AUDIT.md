# Raw Telegram Pull Coverage Audit

_Generated 2026-04-19 from 924 day-files spanning 2023-10-07 to 2026-04-17._

Sources of truth:
- `raw/YYYY-MM-DD.json` — date-specific Telegram pulls (one wrap of a single day).
- `raw/YYYY-MM-batch.json` — monthly back-fill batches (cover the whole month in one file).
- `data/YYYY-MM-DD.json` — derived report after `categorize.py` + `fix_data.py`.

A date is **covered** when *either* the date-specific raw file exists *or* the matching monthly batch contains ≥1 message tagged with that date. "Messages-for-date" is computed by parsing every `Date: YYYY-MM-DD` header inside the raw text and counting only those that match the file's logical date — this strips spillover noise.

## 1. Executive Summary

| Metric | Value |
|---|---:|
| Total day-files in `data/` | 924 |
| Days with at least one raw source | 913 |
| Days with **no** raw source (rely on spillover) | 11 |
| Suspected truncated days (raw < 50% of monthly avg) | 98 |
| Days with raw pulled before 22:30 wrap-up | 1 |
| Estimated missing messages (uncovered days, using monthly avg) | 1,339 |
| Estimated missing messages (suspect-truncated days) | 2,577 |
| **Estimated total missing messages** | **3,916** |

### Caveat on suspects

Of the 98 "suspect" days, only **14 have `bayanat > 0`** in the derived data — those are the days where we know military bulletins were posted but the raw pull is far below the monthly average, i.e. real evidence of truncation. The remaining 84 are quiet days during ceasefire / post-cease windows (most of 2024-12 → 2025-05, most of 2025-07 → 2026-02) where the channel itself was almost silent and the < 50% threshold is a false positive driven by occasional flare-ups. The 14 high-confidence truncated days account for ~660 estimated missing messages.

## 2. Suspect Dates (raw < 50% of month average)

### 2A. High-confidence truncations (bayanat>0, content known to exist)

| Date | Raw msgs | Month avg | Ratio | Bayanat | Items | Pull mtime | Neighbour context |
|---|---:|---:|---:|---:|---:|---|---|
| 2025-06-09 | 4 | 55 | 0.07 | 1 | 2 | 2026-04-10T23:37:53 | prev 2025-06-08 10msg/0bay; next 2025-06-10 23msg/0bay |
| 2024-04-11 | 16 | 50 | 0.32 | 3 | 9 | 2026-04-10T22:26:27 | prev 2024-04-10 18msg/2bay; next 2024-04-12 39msg/8bay |
| 2024-05-04 | 26 | 82 | 0.32 | 3 | 15 | 2026-04-10T22:26:35 | prev 2024-05-03 36msg/3bay; next 2024-05-05 85msg/11bay |
| 2026-03-02 | 73 | 230 | 0.32 | 1 | 65 | 2026-04-09T01:44:25 | prev 2026-03-01 173msg/1bay; next 2026-03-03 119msg/13bay |
| 2026-04-08 | 38 | 111 | 0.34 | 2 | 29 | 2026-04-09T00:34:43 | prev 2026-04-07 0msg/43bay; next 2026-04-09 0msg/50bay |
| 2024-04-10 | 18 | 50 | 0.36 | 2 | 9 | 2026-04-10T22:26:27 | prev 2024-04-09 40msg/10bay; next 2024-04-11 16msg/3bay |
| 2024-05-02 | 32 | 82 | 0.39 | 6 | 23 | 2026-04-10T22:26:34 | prev 2024-05-01 37msg/6bay; next 2024-05-03 36msg/3bay |
| 2024-09-06 | 33 | 81 | 0.41 | 7 | 19 | 2026-04-10T22:55:27 | prev 2024-09-05 61msg/8bay; next 2024-09-07 70msg/11bay |
| 2024-05-03 | 36 | 82 | 0.44 | 3 | 23 | 2026-04-10T22:26:35 | prev 2024-05-02 32msg/6bay; next 2024-05-04 26msg/3bay |
| 2024-05-01 | 37 | 82 | 0.45 | 6 | 21 | 2026-04-10T22:26:34 | prev 2024-04-30 45msg/6bay; next 2024-05-02 32msg/6bay |
| 2024-06-22 | 36 | 80 | 0.45 | 5 | 20 | 2026-04-10T22:26:54 | prev 2024-06-21 71msg/6bay; next 2024-06-23 77msg/8bay |
| 2026-02-06 | 8 | 18 | 0.45 | 1 | 7 | 2026-04-11T14:50:07 | prev 2026-02-05 10msg/0bay; next 2026-02-07 9msg/0bay |
| 2025-11-21 | 6 | 13 | 0.47 | 1 | 1 | 2026-04-10T23:39:34 | prev 2025-11-20 7msg/0bay; next 2025-11-22 5msg/0bay |
| 2025-03-22 | 7 | 15 | 0.48 | 1 | 6 | 2026-04-10T23:37:08 | prev 2025-03-21 13msg/0bay; next 2025-03-23 6msg/0bay |

### 2B. Low-activity suspects (bayanat=0, likely genuine quiet days)

Listed compactly — these are **not** action items unless cross-checked against the channel for that date. They cluster in known ceasefire windows.

| Date | Raw msgs | Month avg | Ratio | Items |
|---|---:|---:|---:|---:|
| 2023-11-24 | 13 | 69 | 0.19 | 6 |
| 2023-11-25 | 18 | 69 | 0.26 | 13 |
| 2023-11-26 | 8 | 69 | 0.12 | 3 |
| 2023-11-27 | 7 | 69 | 0.10 | 6 |
| 2023-11-28 | 24 | 69 | 0.35 | 15 |
| 2023-11-29 | 19 | 69 | 0.28 | 15 |
| 2023-11-30 | 30 | 69 | 0.44 | 24 |
| 2024-06-16 | 22 | 80 | 0.28 | 17 |
| 2024-06-17 | 26 | 80 | 0.33 | 18 |
| 2024-07-17 | 31 | 63 | 0.49 | 15 |
| 2024-11-27 | 15 | 87 | 0.17 | 1 |
| 2024-11-28 | 23 | 87 | 0.26 | 10 |
| 2024-11-29 | 19 | 87 | 0.22 | 9 |
| 2024-11-30 | 14 | 87 | 0.16 | 6 |
| 2024-12-02 | 12 | 25 | 0.47 | 7 |
| 2025-01-28 | 8 | 25 | 0.31 | 6 |
| 2025-01-29 | 8 | 25 | 0.31 | 4 |
| 2025-02-03 | 7 | 18 | 0.38 | 5 |
| 2025-02-13 | 9 | 18 | 0.49 | 5 |
| 2025-02-24 | 8 | 18 | 0.43 | 6 |
| 2025-03-05 | 7 | 15 | 0.48 | 7 |
| 2025-03-10 | 5 | 15 | 0.34 | 3 |
| 2025-03-11 | 4 | 15 | 0.27 | 3 |
| 2025-03-15 | 5 | 15 | 0.34 | 3 |
| 2025-03-19 | 5 | 15 | 0.34 | 4 |
| 2025-03-23 | 6 | 15 | 0.41 | 5 |
| 2025-04-01 | 7 | 16 | 0.45 | 4 |
| 2025-04-08 | 6 | 16 | 0.39 | 4 |
| 2025-04-17 | 6 | 16 | 0.39 | 2 |
| 2025-05-01 | 5 | 15 | 0.33 | 4 |
| 2025-05-10 | 5 | 15 | 0.33 | 3 |
| 2025-05-16 | 5 | 15 | 0.33 | 2 |
| 2025-05-20 | 3 | 15 | 0.20 | 2 |
| 2025-05-24 | 2 | 15 | 0.13 | 2 |
| 2025-06-01 | 8 | 55 | 0.15 | 5 |
| 2025-06-02 | 16 | 55 | 0.29 | 8 |
| 2025-06-03 | 22 | 55 | 0.40 | 20 |
| 2025-06-04 | 18 | 55 | 0.33 | 10 |
| 2025-06-05 | 16 | 55 | 0.29 | 10 |
| 2025-06-06 | 23 | 55 | 0.42 | 14 |
| 2025-06-07 | 11 | 55 | 0.20 | 0 |
| 2025-06-08 | 10 | 55 | 0.18 | 5 |
| 2025-06-10 | 23 | 55 | 0.42 | 13 |
| 2025-06-11 | 19 | 55 | 0.35 | 14 |
| 2025-06-12 | 25 | 55 | 0.46 | 17 |
| 2025-06-27 | 11 | 55 | 0.20 | 6 |
| 2025-06-28 | 23 | 55 | 0.42 | 3 |
| 2025-06-30 | 22 | 55 | 0.40 | 9 |
| 2025-07-05 | 13 | 29 | 0.45 | 6 |
| 2025-08-09 | 8 | 22 | 0.37 | 3 |
| 2025-08-23 | 9 | 22 | 0.41 | 7 |
| 2025-09-01 | 7 | 23 | 0.31 | 4 |
| 2025-09-04 | 10 | 23 | 0.44 | 6 |
| 2025-09-05 | 7 | 23 | 0.31 | 5 |
| 2025-09-06 | 7 | 23 | 0.31 | 5 |
| 2025-10-03 | 8 | 18 | 0.43 | 3 |
| 2025-10-23 | 6 | 18 | 0.33 | 3 |
| 2025-10-27 | 8 | 18 | 0.43 | 2 |
| 2025-11-03 | 4 | 13 | 0.31 | 2 |
| 2025-11-08 | 6 | 13 | 0.47 | 2 |
| 2025-11-12 | 4 | 13 | 0.31 | 2 |
| 2025-11-14 | 3 | 13 | 0.24 | 0 |
| 2025-11-15 | 5 | 13 | 0.39 | 0 |
| 2025-11-16 | 5 | 13 | 0.39 | 2 |
| 2025-11-22 | 5 | 13 | 0.39 | 0 |
| 2025-12-15 | 6 | 14 | 0.44 | 5 |
| 2025-12-20 | 3 | 14 | 0.22 | 3 |
| 2025-12-22 | 5 | 14 | 0.36 | 5 |
| 2025-12-31 | 6 | 14 | 0.44 | 5 |
| 2026-01-07 | 4 | 11 | 0.37 | 4 |
| 2026-01-18 | 3 | 11 | 0.28 | 3 |
| 2026-01-23 | 3 | 11 | 0.28 | 3 |
| 2026-01-28 | 5 | 11 | 0.47 | 5 |
| 2026-02-04 | 5 | 18 | 0.28 | 3 |
| 2026-02-12 | 6 | 18 | 0.34 | 6 |
| 2026-02-13 | 6 | 18 | 0.34 | 5 |
| 2026-02-14 | 2 | 18 | 0.11 | 2 |
| 2026-02-15 | 2 | 18 | 0.11 | 2 |
| 2026-02-18 | 7 | 18 | 0.39 | 7 |
| 2026-02-19 | 6 | 18 | 0.34 | 4 |
| 2026-02-20 | 6 | 18 | 0.34 | 5 |
| 2026-02-22 | 6 | 18 | 0.34 | 5 |
| 2026-02-25 | 3 | 18 | 0.17 | 3 |
| 2026-02-27 | 8 | 18 | 0.45 | 8 |

## 3. Dates with No Raw Source

These days have **no** `raw/YYYY-MM-DD.json` and the matching monthly batch either does not exist or contains zero messages tagged with this date. Their `data/` content comes purely from spillover in the previous-day pull (late-night posts) or has been hand-typed during a previous workflow run.

| Date | Items in data | Bayanat | Adjacent raw pulls |
|---|---:|---:|---|
| 2026-03-31 | 142 | 43 | prev 2026-03-30 177msg; next 2026-04-01 0msg |
| 2026-04-01 | 124 | 47 | prev 2026-03-31 0msg; next 2026-04-02 0msg |
| 2026-04-02 | 118 | 41 | prev 2026-04-01 0msg; next 2026-04-03 0msg |
| 2026-04-03 | 139 | 38 | prev 2026-04-02 0msg; next 2026-04-04 0msg |
| 2026-04-04 | 104 | 38 | prev 2026-04-03 0msg; next 2026-04-05 0msg |
| 2026-04-05 | 104 | 31 | prev 2026-04-04 0msg; next 2026-04-06 0msg |
| 2026-04-06 | 125 | 52 | prev 2026-04-05 0msg; next 2026-04-07 0msg |
| 2026-04-07 | 137 | 43 | prev 2026-04-06 0msg; next 2026-04-08 38msg |
| 2026-04-09 | 126 | 50 | prev 2026-04-08 38msg; next 2026-04-10 100msg |
| 2026-04-13 | 123 | 48 | prev 2026-04-12 159msg; next 2026-04-14 0msg |
| 2026-04-14 | 85 | 34 | prev 2026-04-13 0msg; next 2026-04-15 112msg |

## 4. Raw Pulls That Happened Before the Daily Wrap-up (22:30 local)

| Date | Pull mtime | Raw msgs | Bayanat |
|---|---|---:|---:|
| 2026-04-10 | 2026-04-10T16:43:00 | 100 | 59 |

## 5. Per-Month Completeness Table

| Month | Days | Covered | NoRaw | Avg msgs/day | Median msgs/day | Avg bayanat/day | Suspect days | Score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023-10 | 25 | 25 | 0 | 79.2 | 77.0 | 1.92 | 0 | 100.0 |
| 2023-11 | 30 | 30 | 0 | 68.7 | 77.0 | 5.57 | 7 | 88.3 |
| 2023-12 | 31 | 31 | 0 | 85.0 | 81.0 | 7.03 | 0 | 100.0 |
| 2024-01 | 31 | 31 | 0 | 63.7 | 63.0 | 6.10 | 0 | 100.0 |
| 2024-02 | 29 | 29 | 0 | 52.3 | 53.0 | 6.69 | 0 | 100.0 |
| 2024-03 | 31 | 31 | 0 | 45.9 | 45.0 | 8.32 | 0 | 100.0 |
| 2024-04 | 30 | 30 | 0 | 49.8 | 50.5 | 6.70 | 2 | 96.7 |
| 2024-05 | 31 | 31 | 0 | 82.5 | 87.0 | 8.77 | 4 | 93.5 |
| 2024-06 | 30 | 30 | 0 | 79.6 | 78.0 | 7.87 | 3 | 95.0 |
| 2024-07 | 31 | 31 | 0 | 63.4 | 59.0 | 6.58 | 1 | 98.4 |
| 2024-08 | 31 | 31 | 0 | 61.5 | 58.0 | 7.87 | 0 | 100.0 |
| 2024-09 | 30 | 30 | 0 | 80.7 | 76.5 | 10.20 | 1 | 98.3 |
| 2024-10 | 31 | 31 | 0 | 112.1 | 109.0 | 12.61 | 0 | 100.0 |
| 2024-11 | 30 | 30 | 0 | 87.3 | 86.5 | 9.93 | 4 | 93.3 |
| 2024-12 | 31 | 31 | 0 | 25.4 | 23.0 | 0.06 | 1 | 98.4 |
| 2025-01 | 31 | 31 | 0 | 25.4 | 23.0 | 0.06 | 2 | 96.8 |
| 2025-02 | 28 | 28 | 0 | 18.4 | 15.0 | 0.14 | 3 | 94.6 |
| 2025-03 | 31 | 31 | 0 | 14.6 | 13.0 | 0.10 | 7 | 88.7 |
| 2025-04 | 30 | 30 | 0 | 15.5 | 15.0 | 0.10 | 3 | 95.0 |
| 2025-05 | 31 | 31 | 0 | 15.1 | 14.0 | 0.16 | 5 | 91.9 |
| 2025-06 | 30 | 30 | 0 | 54.8 | 27.0 | 0.17 | 15 | 75.0 |
| 2025-07 | 31 | 31 | 0 | 28.8 | 28.0 | 0.16 | 1 | 98.4 |
| 2025-08 | 31 | 31 | 0 | 21.7 | 21.0 | 0.06 | 2 | 96.8 |
| 2025-09 | 30 | 30 | 0 | 22.7 | 19.0 | 0.03 | 4 | 93.3 |
| 2025-10 | 31 | 31 | 0 | 18.4 | 16.0 | 0.13 | 3 | 95.2 |
| 2025-11 | 30 | 30 | 0 | 12.7 | 11.5 | 0.13 | 8 | 86.7 |
| 2025-12 | 31 | 31 | 0 | 13.7 | 14.0 | 0.10 | 4 | 93.5 |
| 2026-01 | 31 | 31 | 0 | 10.7 | 9.0 | 0.10 | 4 | 93.5 |
| 2026-02 | 28 | 28 | 0 | 17.9 | 10.0 | 0.21 | 12 | 78.6 |
| 2026-03 | 31 | 30 | 1 | 229.6 | 238.0 | 36.87 | 1 | 95.2 |
| 2026-04 | 17 | 7 | 10 | 110.9 | 112.0 | 38.71 | 1 | 38.2 |

**Score formula:** `(covered/total) − 0.5 * (suspect/total)`, clamped to [0, 100]. A month with full coverage and no flagged truncations scores 100.

## 6. Recommendations for a Full Re-pull Strategy

### Priority 1 — fix April 2026 (war is hot, coverage is broken)

- 10 of 17 days in 2026-04 have **no raw file**. The data we ship for those days is whatever leaked into adjacent-day pulls.
- Average bayanat in April 2026 is ~39/day → those 10 missing days probably have **390+ bayanat** that were never captured from the raw stream.
- Action: pull `raw/2026-04-{01..17}.json` again, day-by-day, with a fresh fetch covering 00:00–23:59 of each date. Then re-categorize the whole month.

### Priority 2 — re-pull the 14 truncated bulletin days

All 14 high-confidence suspects in §2A have raw pulls below 50% of the month average **and** non-zero extracted bayanat. The most extreme:

- **2026-03-02** — 73 raw msgs vs 230 monthly avg (32%); only 1 bayan extracted vs 13 the next day. Likely missed the war restart wave.
- **2026-04-08** — 38 raw msgs vs 111 avg, only 2 bayanat extracted; neighbours have 43 and 50 bayanat from spillover. Day is largely empty.
- **2024-05-{01..04}** — four consecutive days at 32–45% of month average, with bayanat already present. Suggests a single broken pull session.
- **2024-04-10/11**, **2024-06-22**, **2024-09-06** — each well below average on active days; re-pull recommended.

### Priority 3 — verify, don't re-pull, the quiet-day suspects

Most of the 84 zero-bayanat suspects fall inside ceasefire windows and are flagged only because the monthly average gets dragged up by occasional flare-ups. Spot-check one or two from each cluster (2024-11-27..30, 2025-06-{01..09}, 2026-02-{04..25}) against the channel. Only re-pull if a spot check finds missing material.

### Priority 4 — pre-2024-02 coverage gap

There are **no monthly batch files** for 2023-10, 2023-11, 2023-12, 2024-01. Those four months rely entirely on date-specific raw files. Coverage looks fine on average (`avg_raw_msgs/day` ≥ 60), but there is no second source to cross-check. Consider generating retroactive `raw/2023-{10,11,12}-batch.json` and `raw/2024-01-batch.json` for redundancy.

### Standing rule going forward

- Always pull **after 00:30 local** of the next day so the daily wrap-up post is included.
- Validate every pull against the in-month median: if a day's message count drops below 0.5× median for the trailing 7 days, re-pull immediately.
- Keep a monthly batch file as a redundancy layer; rebuild it at the end of each month.
