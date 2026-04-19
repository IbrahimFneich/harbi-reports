#!/usr/bin/env python3
"""Phase A — Re-pull missing / truncated raw files from the Telegram channel.

Lists every date that needs re-pulling with a priority bucket. An LLM-driven
session with the `telegram` MCP server loaded should iterate this list and
call mcp__telegram__list_messages for each date.

Usage:
    python3 src/python/phase_a_repull.py         # prints the plan
    python3 src/python/phase_a_repull.py --json  # emits JSON for machine use

The LLM should then, for each date in the emitted list:
  1. mcp__telegram__list_messages(chat_id=1048208601,
         from_date=DATE, to_date=DATE, limit=2000)
  2. Write the raw text to raw/DATE.json in the `result` wrapper format.
  3. Post-pull sanity check: the raw file should have ≥ 50% of the 7-day
     median message count for that month. Re-pull once if below.
  4. Re-categorize:  src/python/categorize.py raw/DATE.json DATE
  5. When all dates done:
       - python3 src/python/fix_data.py
       - python3 src/python/build_index.py
       - python3 src/python/build_monthly.py
       - python3 src/python/validate_data.py       # expect 0 errors
  6. Bump version to 2.6.0, changelog entry, footer sync.
"""
import argparse, json

# From RAW_COVERAGE_AUDIT §3 + §2A (as of 2026-04-19).
# Keep authoritative — the LLM should trust this list over reading the audit
# markdown (which could drift).
PHASE_A_DATES = {
    "p1_no_raw": [
        # 10 April-2026 days with no raw file at all
        "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04",
        "2026-04-05", "2026-04-06", "2026-04-07", "2026-04-09",
        "2026-04-13", "2026-04-14",
        # Plus 2026-03-31 which is also spillover-only
        "2026-03-31",
    ],
    "p2_truncated_bayanat": [
        # raw pulled but < 50% of month avg AND bayanat known to exist
        "2026-04-08",   # 38 msgs vs 111 avg — only 2 bayanat extracted
        "2026-03-02",   # 73 vs 230 — war-restart wave missed
        "2024-04-10",   # 18 vs 50
        "2024-04-11",   # 16 vs 50
        "2024-05-01",   # 37 vs 82
        "2024-05-02",   # 32 vs 82
        "2024-05-03",   # 36 vs 82
        "2024-05-04",   # 26 vs 82
        "2024-06-22",   # 36 vs 80
        "2024-09-06",   # 33 vs 81
        "2025-06-09",   # 4 vs 55
        "2026-02-06",   # 8 vs 18
        "2025-11-21",   # 6 vs 13
        "2025-03-22",   # 7 vs 15
    ],
    "p3_generate_monthly_batches": [
        # Pre-2024-02 has no monthly-batch redundancy layer; re-generate
        # these for cross-check.
        "2023-10-batch", "2023-11-batch", "2023-12-batch", "2024-01-batch",
    ],
}

CHANNEL = {
    "chat_id": 1048208601,
    "title": "الإعلام الحربي - التغطية الإخبارية",
}

MCP_CALL = (
    "mcp__telegram__list_messages("
    "chat_id={chat_id}, "
    "from_date=\"{date}\", "
    "to_date=\"{date}\", "
    "limit=2000)"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    if args.json:
        print(json.dumps({"channel": CHANNEL, "dates": PHASE_A_DATES}, ensure_ascii=False, indent=2))
        return

    total = sum(len(v) for v in PHASE_A_DATES.values())
    print(f"Phase A plan — re-pull {total} items from {CHANNEL['title']}")
    print(f"Channel: chat_id={CHANNEL['chat_id']}\n")

    for bucket, dates in PHASE_A_DATES.items():
        label = {
            "p1_no_raw": "Priority 1 — No raw file at all",
            "p2_truncated_bayanat": "Priority 2 — Truncated raw, known bayanat",
            "p3_generate_monthly_batches": "Priority 3 — Monthly-batch redundancy layer",
        }[bucket]
        print(f"━━━ {label} ━━━  ({len(dates)} items)")
        for d in dates:
            if d.endswith("-batch"):
                month = d.replace("-batch", "")
                print(f"  {month} (full month batch)")
            else:
                print(f"  {d}   →  {MCP_CALL.format(chat_id=CHANNEL['chat_id'], date=d)}")
        print()

    print("After each successful pull:")
    print("  python3 src/python/categorize.py raw/<DATE>.json <DATE> --skip-build")
    print("")
    print("Once all pulled + categorized:")
    print("  python3 src/python/fix_data.py")
    print("  python3 src/python/build_index.py")
    print("  python3 src/python/build_monthly.py")
    print("  python3 src/python/validate_data.py")
    print("")
    print("Then bump to v2.6.0 (major release — corpus now authoritative).")


if __name__ == "__main__":
    main()
