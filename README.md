<p align="center">
    <img src="yelp-logo.jpg" alt="Yelp logo" width="200">
</p>

<h1 align="center">Yelp Restaurant Complaint Analysis</h1>

<p align="center">
  <b>Which complaints hurt restaurant ratings most?</b><br>
  An end-to-end analysis of ~300,000 Yelp restaurant reviews: SQL cleaning, Python EDA, AI-assisted topic tagging, an interactive web app dashboard and a Power BI version.
</p>

<p align="center">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-EDA-3776AB?logo=python&logoColor=white">
  <img alt="Web App" src="https://img.shields.io/badge/Web%20App-Interactive-7C3AED?logo=javascript&logoColor=white">
  <img alt="Power BI" src="https://img.shields.io/badge/Power%20BI-Dashboard-F2C811?logo=powerbi&logoColor=black">
  <img alt="Status" src="https://img.shields.io/badge/Status-Stage%201%20complete-brightgreen">
</p>

> Independent portfolio project using the public Yelp Open Dataset. Not affiliated with or endorsed by Yelp.

---

## Project at a glance

| | |
|---|---|
| **Business question** | What are restaurant customers complaining about, which complaints cost the most stars, and how are they changing over time? |
| **Who it is for** | Restaurant owners and managers who need to know what to fix first |
| **Data** | [Yelp Open Dataset](https://business.yelp.com/data/resources/open-dataset/): ~300k reviews from 52k restaurants in 13 US states and Alberta (a random ~6.5% sample) |
| **Tools** | PostgreSQL (pgAdmin 4), Excel (first look only), Python (pandas, matplotlib, seaborn), AI text analysis, interactive web app (HTML, CSS, JavaScript), Power BI |
| **Deliverables** | Clean database, decision log, EDA notebook, AI-tagged complaint topics, interactive web app dashboard, Power BI version, written findings |

## Project status

| Stage | What happens | Status |
|---|---|---|
| 1. SQL cleaning | Load raw data, profile every table, clean in PostgreSQL, prove it | **Complete** |
| 2. Python EDA | Explore ratings, cities, cuisines and time trends | Next |
| 3. AI analysis | Tag sentiment and complaint topics in review text | Planned |
| 4. Web app dashboard | Interactive, responsive web app (desktop, tablet, phone) | Planned |
| 5. Power BI version | Power BI report of the same findings | Planned |
| 6. Findings | Recommendations for restaurant owners | Planned |

## Questions this project will answer

1. What share of reviews are negative (1 to 2 stars), and how has it changed over the years?
2. Which complaint topics (service, waiting time, price, food quality, cleanliness, and others) appear most in negative reviews?
3. Which complaints are linked to the lowest ratings?
4. How do cities and cuisines differ?
5. Did complaints change during 2020 (COVID)?

> Findings will be added here as each stage finishes. Nothing below Stage 1 is a result yet.

---

## Stage 1: SQL data cleaning (complete)

The raw data was loaded unchanged, every table was profiled with 26 health checks, and each problem got a documented decision: drop, fix, flag or set to NULL. Only 10 rows were removed in total.

| Table | Before | After |
|---|---|---|
| Restaurants | 52,268 | 52,263 |
| Reviews | 307,515 | 307,510 |
| Users | 214,971 | 214,971 |
| Category tags (new table) | n/a | 243,587 |

**Main problems found:** 5 restaurants with contradicting locations (dropped), the same city spelled several ways (941 names became 843), hotels/grocery stores/gas stations tagged as restaurants (flagged), very short reviews, links in reviews, HTML codes, a partial final year (2022 has only 19 days), and numbers and dates stored as text.

**How it was proved right:** primary and foreign keys enforced by PostgreSQL, an average rating (3.7925) that matches an independent calculation in a second database engine, and a three-table join that does not change the review count.

Details: [`SQL/`](SQL/) (numbered scripts) and the full decision log in [`docs/cleaning_log.md`](docs/cleaning_log.md).

**Lessons learned**
- Excel silently breaks IDs that start with a dash (`#NAME?`), so original CSVs go straight into the database and are never saved from Excel.
- When a check shows something shocking, suspect the query first. Two early checks looked alarming because of my own mistakes (stars stored as `5.0`, dates that include a time of day), not because of the data.
- Dropping rows is the last resort. Each drop is justified in the log.

---

## Stage 2: Python EDA (next)

EDA (exploratory data analysis) means looking at the data from many angles before drawing conclusions. The notebook will connect Python to the `clean` tables and cover:

1. Shape, types and a re-check of data quality
2. One column at a time (rating spread, review length, votes)
3. Two columns together (rating vs. city, rating vs. cuisine)
4. Change over time (by year and month, handling 2020 and the partial 2022)
5. Groups compared (cities and cuisines with at least 30 reviews)
6. A cross-check of the headline numbers against SQL

Rules I am following: every chart title states its takeaway, small groups are excluded from rankings, and wording says "is associated with", never "causes".

**Output that feeds the dashboards:** the EDA also exports small summary tables (by year, city, cuisine and star group). The web app and the Power BI report both read these, so every number on a dashboard traces back to a checked analysis.

## Stage 3: AI-assisted analysis (planned)

Reading 300,000 reviews by hand is impossible, so AI tools will read them for me:

- **Sentiment and topic tagging** of review text (service, wait time, price, food quality, cleanliness, atmosphere, and others).
- **A free method on all reviews** compared against **a larger AI model on a small sample (about 5,000)**, so I can report how well the cheap method agrees with the stronger one.
- **A small "ask a question" tool** so questions such as "what do customers hate most about pizza places in Tampa?" can be answered from the data.
- Short and link-only reviews (flagged in Stage 1) are excluded from topic tagging, and the effect is reported.
- Topic counts are saved as summary tables (topic by year, city, cuisine and star group) for the dashboards.

## Stage 4: Interactive web app dashboard (planned)

**Goal:** a polished dashboard that feels like an app, with smooth motion and a frosted-glass look, that a restaurant owner can understand in 5 seconds on a laptop or a phone.

**How it works.** Stages 2 and 3 export small summary tables. The web app loads them and draws every chart. It is a snapshot, not a live database connection, and no raw reviews are published. It will be hosted free on GitHub Pages, with the link added to this README.

**Look and feel**
- Dark and light themes, frosted-glass cards (translucent panels with a blur effect) and a soft glow on one highlight colour.
- Motion with a purpose: numbers count up when the page loads, charts animate in, cards lift on hover and tooltips follow the cursor.
- Accessible: respects the "reduce motion" setting, high-contrast text on glass, colour-blind safe palette.

**Desktop layout**

```
+--------------------------------------------------------------------+
| What are restaurant customers complaining about?     [dark | light]  |
+----------+----------+----------+----------+------------------------+
| Reviews  | Avg      | % nega-  | Top      |  FILTERS (glass panel) |
|          | rating   | tive     | complaint|  year range slider     |
+----------+----------+----------+----------+  city                  |
| Complaint topics ranked      | Negative   |  cuisine               |
| (click a bar to filter all)  | reviews    |  star group            |
|                              | over time  |  [reset]               |
+------------------------------+------------+------------------------+
| City comparison              | Cuisine x topic heatmap             |
+------------------------------+-------------------------------------+
```

**Interactions**
- Clicking a complaint topic updates every other chart.
- Filters: year range, city, cuisine and star group, with a reset button.
- Hover for exact numbers, and a short "how to read this" tip for first-time visitors.

**Responsive behaviour**
- Built with a flexible grid: two columns on a tablet, one column on a phone.
- Phone order: KPI cards first, then the ranked complaint topics, then the trend, with filters in a slide-up drawer so they do not take up screen space.
- Touch-friendly buttons, readable text sizes, and nothing that scrolls sideways.

**Quality checks before publishing**
- Every number is cross-checked against SQL or Python.
- 2022 is labelled as a partial year, and groups with fewer than 30 reviews are hidden.
- Tested on a real phone and in the browser's phone preview, plus a 5-second test on someone who has not seen it.

## Stage 5: Power BI version (planned)

A one-to-two page Power BI report of the same findings, because Power BI is a standard tool in analyst job listings. It reads the same summary tables (or the PostgreSQL `clean` tables).

- Desktop page first, then a separate Phone layout with only the key visuals.
- Filters in a bookmark-controlled panel on small screens, and tooltip pages for detail.
- Planned measures (DAX): Total Reviews, Average Rating, % Negative, Negative Reviews by Topic, Year-over-Year Change.
- One theme, one highlight colour, sorted bars, no pie charts or 3D.
- Desktop and phone screenshots and a short screen recording added to this README.

---

## Repository structure

```
yelp-restaurant-complaint-analysis/
├── README.md
├── yelp-logo.jpg
├── assets/                       # dashboard screenshots and recordings
├── scripts/
│   └── sample_yelp.py            # cuts the 4 GB Yelp download to a ~300k review sample
├── SQL/                          # numbered cleaning scripts (00 to 07)
├── docs/
│   └── cleaning_log.md           # every cleaning decision with row counts
├── notebooks/                    # Python EDA and AI analysis (Stage 2 and 3)
├── data/summary/                 # small summary tables exported by Stage 2 and 3
├── app/                          # interactive web app dashboard (Stage 4)
└── powerbi/                      # Power BI report and exports (Stage 5)
```

## How to reproduce

1. Download the Yelp Open Dataset from the link above and run `python scripts/sample_yelp.py` to create the sample CSV files.
2. In PostgreSQL, create a database and run `SQL/00_create_raw_tables.sql`.
3. Import the three CSVs into the `raw` tables and check the row counts.
4. Run the scripts `02` to `06` in order, then `07` to confirm the checks pass.

Steps for the Python analysis, the web app and the Power BI report will be added as each stage is completed.

The raw data is not included in this repository (Yelp's licence allows personal and educational use only).

## Limitations

- A ~6.5% random sample: about 11,000 restaurants (21%) have no review in it, so the analysis compares cities, cuisines and years rather than single restaurants.
- About 33% of the restaurants are now closed, which can bias older reviews.
- Review volume dips in 2020 (COVID), and 2022 is a partial year.
- Coverage is 13 US states plus Alberta, not the whole of the US.
- Topic tagging by AI is imperfect; agreement between methods will be reported.

## Skills demonstrated

SQL (profiling, cleaning, joins, constraints, validation) · data quality thinking and documentation · Python EDA · AI-assisted text analysis · interactive web dashboard design (HTML, CSS, JavaScript) · Power BI · responsive design for desktop and mobile · clear written communication

## About

Built by [MIZZYAYO](https://github.com/MIZZYAYO). Connect on LinkedIn: [Daniel Mgbeahurike](https://www.linkedin.com/in/daniel-mgbeahurike-93978b282).

*Data: Yelp Open Dataset, used for educational purposes.*
