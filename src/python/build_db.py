#!/usr/bin/env python3
"""
Build data/harbi.db (SQLite) from data/*.json report files.

Tables:
  reports — one row per day (date, stats, metadata)
  events  — one row per event (bayanat, sirens, enemy, iran, videos, allies)
  events_fts — FTS5 full-text search index on events

Usage:
  python3 src/python/build_db.py
"""

import json
import os
import sqlite3
import sys
from glob import glob

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE, 'data')
DB_PATH = os.path.join(DATA_DIR, 'harbi.db')


def create_schema(cur):
    cur.executescript('''
        DROP TABLE IF EXISTS events_fts;
        DROP TABLE IF EXISTS events;
        DROP TABLE IF EXISTS reports;

        CREATE TABLE reports (
            date        TEXT PRIMARY KEY,
            day_ar      TEXT,
            date_ar     TEXT,
            hijri       TEXT,
            bayanat     INTEGER DEFAULT 0,
            sirens      INTEGER DEFAULT 0,
            enemy       INTEGER DEFAULT 0,
            iran        INTEGER DEFAULT 0,
            videos      INTEGER DEFAULT 0,
            allies      INTEGER DEFAULT 0,
            total       INTEGER DEFAULT 0
        );

        CREATE TABLE events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            date        TEXT NOT NULL,
            category    TEXT NOT NULL,
            time        TEXT,
            op_time     TEXT,
            title       TEXT,
            subtitle    TEXT,
            badge       TEXT,
            tags        TEXT,
            lat         REAL,
            lng         REAL,
            location    TEXT,
            full_text   TEXT
        );

        CREATE INDEX idx_events_date ON events(date);
        CREATE INDEX idx_events_category ON events(category);
        CREATE INDEX idx_events_date_cat ON events(date, category);

        CREATE VIRTUAL TABLE events_fts USING fts5(
            title, full_text, location, subtitle,
            content='events', content_rowid='id'
        );
    ''')


def insert_report(cur, data):
    stats = data.get('stats', {})
    b = stats.get('bayanat', 0)
    s = stats.get('sirens', 0)
    e = stats.get('enemy', 0)
    ir = stats.get('iran', 0)
    v = stats.get('videos', 0)
    al = stats.get('allies', 0)

    cur.execute('''
        INSERT INTO reports (date, day_ar, date_ar, hijri,
                             bayanat, sirens, enemy, iran, videos, allies, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['date'], data.get('dayAr', ''), data.get('dateAr', ''),
          data.get('hijri', ''), b, s, e, ir, v, al, b + s + e + ir + v + al))


def insert_events(cur, data):
    date = data['date']

    for item in data.get('bayanat', []):
        cur.execute('''
            INSERT INTO events (date, category, time, op_time, title, subtitle,
                                badge, tags, full_text)
            VALUES (?, 'bayanat', ?, ?, ?, ?, ?, ?, ?)
        ''', (date, item.get('postTime', ''), item.get('opTime', ''),
              item.get('target', ''), item.get('weapon', ''),
              item.get('badge', ''),
              json.dumps(item.get('tags', []), ensure_ascii=False),
              item.get('fullText', '')))

    for item in data.get('sirens', []):
        cur.execute('''
            INSERT INTO events (date, category, time, title, location, full_text)
            VALUES (?, 'sirens', ?, ?, ?, ?)
        ''', (date, item.get('time', ''), item.get('location', ''),
              item.get('location', ''), item.get('fullText', '')))

    for item in data.get('enemy', []):
        cur.execute('''
            INSERT INTO events (date, category, time, title, full_text)
            VALUES (?, 'enemy', ?, ?, ?)
        ''', (date, item.get('time', ''), item.get('summary', ''),
              item.get('fullText', '')))

    for item in data.get('iran', []):
        cur.execute('''
            INSERT INTO events (date, category, time, title, subtitle, full_text)
            VALUES (?, 'iran', ?, ?, ?, ?)
        ''', (date, item.get('time', ''), item.get('summary', ''),
              item.get('source', ''), item.get('fullText', '')))

    for item in data.get('videos', []):
        cur.execute('''
            INSERT INTO events (date, category, time, title, full_text)
            VALUES (?, 'videos', ?, ?, ?)
        ''', (date, item.get('time', ''), item.get('description', ''),
              item.get('fullText', '')))

    for item in data.get('allies', []):
        cur.execute('''
            INSERT INTO events (date, category, time, title, subtitle, full_text)
            VALUES (?, 'allies', ?, ?, ?, ?)
        ''', (date, item.get('time', ''), item.get('summary', ''),
              item.get('flag', ''), item.get('fullText', '')))


def rebuild_fts(cur):
    cur.execute("INSERT INTO events_fts(events_fts) VALUES('rebuild')")


def main():
    files = sorted(glob(os.path.join(DATA_DIR, '????-??-??.json')))
    if not files:
        print('No data files found in ' + DATA_DIR)
        sys.exit(1)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('PRAGMA journal_mode=WAL')
    cur.execute('PRAGMA synchronous=OFF')

    create_schema(cur)

    for i, fpath in enumerate(files):
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        insert_report(cur, data)
        insert_events(cur, data)
        if (i + 1) % 100 == 0:
            print('  Processed {}/{}...'.format(i + 1, len(files)))

    print('Building FTS5 search index...')
    rebuild_fts(cur)

    conn.commit()

    cur.close()
    conn.execute('PRAGMA journal_mode=DELETE')
    conn.execute('VACUUM')
    conn.close()

    conn = sqlite3.connect(DB_PATH)
    report_count = conn.execute('SELECT COUNT(*) FROM reports').fetchone()[0]
    event_count = conn.execute('SELECT COUNT(*) FROM events').fetchone()[0]
    fts_count = conn.execute('SELECT COUNT(*) FROM events_fts').fetchone()[0]
    db_size = os.path.getsize(DB_PATH)
    conn.close()

    print('Written {} ({} reports, {} events, {} FTS entries, {:.1f}MB)'.format(
        DB_PATH, report_count, event_count, fts_count, db_size / 1024 / 1024))


if __name__ == '__main__':
    main()
