# Harbi Reports

Daily military news report viewer for the **الإعلام الحربي - التغطية الإخبارية** Telegram channel.

**Live:** [harbi-reports.com](http://harbi-reports.com)

## Overview

A single-page application that renders daily reports from raw Telegram channel data into a structured, searchable, multi-tab interface with maps, dashboards, and full-text search.

Each report covers:
- **بيانات المقاومة** — Resistance statements with target, weapon type, tags, and full original text
- **صفارات الإنذار** — Siren alerts with location mapping (Leaflet)
- **إعلام العدو** — Enemy media reports
- **إيران** — Iranian-related statements
- **فيديوهات** — Video releases
- **اليمن والعراق** — Allied operations

## Architecture

```
index.html              Landing page — calendar heatmap, global search
report.html             Report shell — loads app.js
app.js                  Rendering engine — fetches JSON, builds DOM
styles.css              Core report styling
report-enhancements.js  Auto-generated dashboards, maps, filters, theme toggle
report-enhancements.css Light theme, categorization styles
search.js               Cross-tab search with Arabic normalization
scripts/categorize.py   Telegram dump → structured JSON
data/*.json             Per-day report data
```

### Data flow

```
Telegram channel → MCP fetch → raw dump → categorize.py → data/YYYY-MM-DD.json → app.js renders
```

## Adding a report

1. Fetch messages from Telegram for the target date
2. Run the categorizer:
   ```bash
   python3 scripts/categorize.py <raw_file> YYYY-MM-DD --output data/YYYY-MM-DD.json
   ```
3. Update `index.html` — add date to `reports` array, `reportStats`, and `searchIndex`
4. Update `report-enhancements.js` — add date to `ALL_REPORTS` array
5. Update `changelog.json` — add version entry
6. Push to `main` (pre-push hook auto-bumps version in `app.js` and `index.html`)

## Features

- RTL Arabic-first design with dark/light theme toggle
- Auto-generated dashboards per tab (operation types, weapons, hourly distribution, top targets)
- Interactive Leaflet maps for statement targets and siren locations
- Full-text search with Arabic normalization (tashkeel, hamza, ta marbuta) and English aliases
- Deep-linking to specific cards via URL params (`?tab=X&idx=N&q=term`)
- Phase grouping by time of day (فجر، صباح، ظهر، مساء)
- Collapsible full original text on every card
- Mobile-compatible (ES5, no template literals, no arrow functions)
- Changelog modal with version history
- Previous/next day navigation

## Tech stack

- Vanilla JS (ES5 for mobile compatibility)
- Leaflet 1.9.4 for maps
- GitHub Pages for hosting
- No build step, no dependencies, no framework

## Deployment

Hosted on GitHub Pages from the `main` branch root.

- **Repo:** [IbrahimFneich/harbi-reports](https://github.com/IbrahimFneich/harbi-reports)
- **Custom domain:** harbi-reports.com
- **Versioning:** Semantic (v1.0.x), auto-incremented on push via pre-push hook
