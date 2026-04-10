#!/usr/bin/env python3
"""
Split a multi-day raw Telegram dump into per-day raw files,
then run categorize.py on each day.

Usage:
  python3 batch_split.py <raw_file> [--dry-run]

Reads the raw dump (may contain multiple days), splits by date,
saves each day to raw/YYYY-MM-DD.json, and runs categorize.py.
"""

import json
import os
import re
import subprocess
import sys
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), '..', 'raw')
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), '..', 'data')
CATEGORIZE = os.path.join(SCRIPT_DIR, 'categorize.py')


def split_raw(filepath):
    """Split a raw telegram dump into per-day message groups."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Handle JSON wrapper
    try:
        data = json.loads(content)
        if isinstance(data, dict) and 'result' in data:
            content = data['result']
    except json.JSONDecodeError:
        pass

    # Split by message ID boundary
    parts = re.split(r'(?:^|\n)(ID:\s*\d+)', content)

    # Reassemble: parts[0] is before first ID, then alternating ID prefix + body
    messages_by_date = defaultdict(list)
    i = 1
    while i < len(parts) - 1:
        id_prefix = parts[i]
        body = parts[i + 1]
        full_msg = id_prefix + body

        # Extract date
        date_m = re.search(r'Date:\s*(\d{4}-\d{2}-\d{2})', full_msg)
        if date_m:
            date_str = date_m.group(1)
            messages_by_date[date_str].append(full_msg.strip())

        i += 2

    return messages_by_date


def main():
    if len(sys.argv) < 2:
        print('Usage: python3 batch_split.py <raw_file> [--dry-run]')
        sys.exit(1)

    raw_file = sys.argv[1]
    dry_run = '--dry-run' in sys.argv

    # Normalize dirs
    raw_dir = os.path.normpath(RAW_DIR)
    data_dir = os.path.normpath(DATA_DIR)
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(data_dir, exist_ok=True)

    print('Splitting {}...'.format(raw_file))
    by_date = split_raw(raw_file)

    dates = sorted(by_date.keys())
    print('Found {} days: {} to {}'.format(len(dates), dates[0] if dates else '?', dates[-1] if dates else '?'))

    for date_str in dates:
        day_raw = os.path.join(raw_dir, date_str + '.json')
        day_data = os.path.join(data_dir, date_str + '.json')

        # Skip if data already exists
        if os.path.exists(day_data):
            print('  SKIP {} (data exists)'.format(date_str))
            continue

        msgs = by_date[date_str]
        print('  {} — {} messages'.format(date_str, len(msgs)))

        if dry_run:
            continue

        # Write per-day raw file
        raw_content = json.dumps({'result': '\n'.join(msgs)}, ensure_ascii=False)
        with open(day_raw, 'w', encoding='utf-8') as f:
            f.write(raw_content)

        # Run categorize.py (suppress build_index since we'll run it once at the end)
        result = subprocess.run(
            [sys.executable, CATEGORIZE, day_raw, date_str,
             '--output', day_data],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print('    ERROR: {}'.format(result.stderr.strip()))
        else:
            # Print just the stats line
            for line in result.stdout.strip().split('\n'):
                if 'Output:' in line or 'b:' in line:
                    print('    {}'.format(line.strip()))

    if not dry_run:
        # Rebuild indexes once at the end
        build_script = os.path.join(SCRIPT_DIR, 'build_index.py')
        if os.path.exists(build_script):
            print('\nRebuilding indexes...')
            subprocess.run([sys.executable, build_script], check=True)

    print('\nDone! {} days processed.'.format(len(dates)))


if __name__ == '__main__':
    main()
