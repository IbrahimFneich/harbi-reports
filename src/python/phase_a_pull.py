#!/usr/bin/env python3
"""Phase A executor — bulk-pulls the 29 items in phase_a_repull.py via Telethon.

Run with:
    /Users/ibrahimfneich/.local/bin/uv --directory \
        /Users/ibrahimfneich/.claude/mcp-servers/telegram-mcp \
        run python /Users/ibrahimfneich/Desktop/telegram-reports/src/python/phase_a_pull.py

Design:
  - Output format matches mcp__telegram__list_messages exactly:
      {"result": "ID: N | SENDER | Date: ... | views:X, forwards:Y, reactions:Z | Message: T\\nID: ..."}
  - Idempotent: skips dates whose current raw already reaches the month
    threshold (>= 50% of month avg). For p1 dates with no raw file, always pulls.
    For p3 monthly batches, always pulls (they need fresh generation).
  - Per-item counts are logged and summarized at end.
  - Catches FloodWaitError and sleeps.
"""
import asyncio, json, os, re, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import FloodWaitError
from telethon.sessions import StringSession

# ── Config ──────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "raw"
ENV_FILE = Path("/Users/ibrahimfneich/.claude/mcp-servers/telegram-mcp/.env")

CHANNEL_ID = 1048208601  # الإعلام الحربي - التغطية الإخبارية

# From RAW_COVERAGE_AUDIT.md §1 / §2A.
MONTH_AVG = {
    "2024-04": 50, "2024-05": 82, "2024-06": 80, "2024-09": 81,
    "2025-03": 15, "2025-06": 55, "2025-11": 13,
    "2026-02": 18, "2026-03": 230, "2026-04": 111,
}

# Dates that had no raw file at all — always pull.
P1_NO_RAW = [
    "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04",
    "2026-04-05", "2026-04-06", "2026-04-07", "2026-04-09",
    "2026-04-13", "2026-04-14", "2026-03-31",
]
# Truncated — always re-pull to try to improve.
P2_TRUNCATED = [
    "2026-04-08", "2026-03-02", "2024-04-10", "2024-04-11",
    "2024-05-01", "2024-05-02", "2024-05-03", "2024-05-04",
    "2024-06-22", "2024-09-06", "2025-06-09", "2026-02-06",
    "2025-11-21", "2025-03-22",
]
# Pre-2024-02 monthly batches — back-fill redundancy layer.
P3_BATCHES = ["2023-10", "2023-11", "2023-12", "2024-01"]

DAY_LIMIT = 2000
BATCH_LIMIT = 8000  # peak war months can exceed 4000 msgs

# ── Helpers mirroring telegram-mcp/main.py ──────────────────────────────────
def _sender_name(msg) -> str:
    s = msg.sender
    if not s:
        return "Unknown"
    if hasattr(s, "title") and s.title:
        return s.title
    first = getattr(s, "first_name", "") or ""
    last = getattr(s, "last_name", "") or ""
    full = f"{first} {last}".strip()
    return full or "Unknown"


def _engagement(msg) -> str:
    parts = []
    views = getattr(msg, "views", None)
    if views is not None:
        parts.append(f"views:{views}")
    fwd = getattr(msg, "forwards", None)
    if fwd is not None:
        parts.append(f"forwards:{fwd}")
    rx = getattr(msg, "reactions", None)
    if rx is not None:
        results = getattr(rx, "results", None)
        total = sum(getattr(r, "count", 0) or 0 for r in results) if results else 0
        parts.append(f"reactions:{total}")
    return f" | {', '.join(parts)}" if parts else ""


def _format(msg) -> str:
    text = msg.message or "[Media/No text]"
    reply = ""
    if msg.reply_to and getattr(msg.reply_to, "reply_to_msg_id", None):
        reply = f" | reply to {msg.reply_to.reply_to_msg_id}"
    return (f"ID: {msg.id} | {_sender_name(msg)} | Date: {msg.date}"
            f"{reply}{_engagement(msg)} | Message: {text}")


def _count_msgs_in_raw(path: Path) -> int:
    if not path.exists():
        return 0
    try:
        obj = json.loads(path.read_text())
        s = obj.get("result", "") if isinstance(obj, dict) else ""
    except Exception:
        return 0
    return len(re.findall(r"(?:^|\n)ID: ", s))


# ── Pull logic ──────────────────────────────────────────────────────────────
async def pull_range(client, entity, start_utc, end_utc_exclusive, limit):
    """Walk forward from start_utc; stop at end_utc_exclusive. Returns list of msgs."""
    msgs = []
    while True:
        try:
            async for m in client.iter_messages(entity, offset_date=start_utc, reverse=True):
                if m.date >= end_utc_exclusive:
                    break
                if m.date < start_utc:
                    continue
                msgs.append(m)
                if len(msgs) >= limit:
                    break
            return msgs
        except FloodWaitError as e:
            print(f"  FloodWait {e.seconds}s — sleeping...", flush=True)
            time.sleep(e.seconds + 1)


async def pull_one_day(client, entity, day: str):
    """day = YYYY-MM-DD. Returns (msgs, formatted_text)."""
    start = datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    msgs = await pull_range(client, entity, start, end, DAY_LIMIT)
    text = "\n".join(_format(m) for m in msgs)
    return len(msgs), text


async def pull_month_batch(client, entity, ym: str):
    """ym = YYYY-MM. Returns (msg_count, formatted_text)."""
    y, m = map(int, ym.split("-"))
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(y, m + 1, 1, tzinfo=timezone.utc)
    msgs = await pull_range(client, entity, start, end, BATCH_LIMIT)
    text = "\n".join(_format(m) for m in msgs)
    return len(msgs), text


def threshold(day: str) -> int:
    ym = day[:7]
    avg = MONTH_AVG.get(ym, 50)
    return max(5, avg // 2)


def adequate(day: str, path: Path) -> bool:
    return _count_msgs_in_raw(path) >= threshold(day)


async def main():
    load_dotenv(ENV_FILE)
    api_id = int(os.environ["TELEGRAM_API_ID"])
    api_hash = os.environ["TELEGRAM_API_HASH"]
    session = os.environ["TELEGRAM_SESSION_STRING"]

    client = TelegramClient(StringSession(session), api_id, api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        print("ERROR: session not authorized")
        sys.exit(1)
    # StringSession has no entity cache — warm via get_dialogs() then resolve.
    try:
        entity = await client.get_entity(CHANNEL_ID)
    except ValueError:
        await client.get_dialogs()
        entity = await client.get_entity(CHANNEL_ID)

    report = []  # (kind, key, pre_count, post_count, status)

    # p1 + p2 are day pulls. Merge, dedupe preserving p1 first.
    day_targets = list(dict.fromkeys(P1_NO_RAW + P2_TRUNCATED))

    for idx, day in enumerate(day_targets, 1):
        raw_path = RAW_DIR / f"{day}.json"
        pre = _count_msgs_in_raw(raw_path)
        thr = threshold(day)
        print(f"[{idx}/{len(day_targets)+len(P3_BATCHES)}] day {day}  pre={pre}  thr={thr}", flush=True)

        # p1 items have no file ⇒ always pull; p2 items have file but truncated
        # ⇒ always re-pull (may come back < thr on genuinely quiet days, still a win
        # because we have fresh data to cross-check).
        try:
            count, text = await pull_one_day(client, entity, day)
        except Exception as e:
            print(f"   FAIL: {e}")
            report.append(("day", day, pre, 0, f"error: {e}"))
            continue

        # Only overwrite if the new pull has equal-or-more msgs (safer on
        # transient errors that might return fewer).
        if count >= pre:
            raw_path.write_text(json.dumps({"result": text}, ensure_ascii=False))
            status = "OK" if count >= thr else "quiet-day"
        else:
            status = f"KEEP pre ({count} < {pre})"
        print(f"   post={count} → {status}", flush=True)
        report.append(("day", day, pre, count, status))
        # polite pause
        await asyncio.sleep(0.5)

    # p3 — monthly batches
    for idx, ym in enumerate(P3_BATCHES, 1):
        raw_path = RAW_DIR / f"{ym}-batch.json"
        pre = _count_msgs_in_raw(raw_path)
        print(f"[batch {idx}/{len(P3_BATCHES)}] {ym}  pre={pre}", flush=True)
        try:
            count, text = await pull_month_batch(client, entity, ym)
        except Exception as e:
            print(f"   FAIL: {e}")
            report.append(("batch", ym, pre, 0, f"error: {e}"))
            continue
        if count >= pre:
            raw_path.write_text(json.dumps({"result": text}, ensure_ascii=False))
            status = "OK"
        else:
            status = f"KEEP pre ({count} < {pre})"
        print(f"   post={count} → {status}", flush=True)
        report.append(("batch", ym, pre, count, status))
        await asyncio.sleep(1.0)

    await client.disconnect()

    # ── Summary ──
    print("\n" + "=" * 78)
    print(f"{'kind':6} {'key':14} {'pre':>6} {'post':>6}  status")
    print("-" * 78)
    for kind, key, pre, post, status in report:
        print(f"{kind:6} {key:14} {pre:>6} {post:>6}  {status}")
    print("=" * 78)

    # Exit non-zero if any hard errors.
    errs = [r for r in report if r[-1].startswith("error")]
    if errs:
        print(f"\n{len(errs)} errors — investigate before running pipeline.")
        sys.exit(2)


if __name__ == "__main__":
    asyncio.run(main())
