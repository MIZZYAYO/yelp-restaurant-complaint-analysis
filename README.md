<p align="center">
    <img src="yelp-logo.jpg" alt="Yelp logo" width="200">
</p>

<h1 align="center">Yelp Restaurant Complaint Analysis</h1>

<p align="center">
  <b>Which complaints hurt restaurant ratings most?</b><br>
  An end-to-end analysis of ~300,000 Yelp restaurant reviews: SQL cleaning, Python EDA, AI-assisted topic tagging and a responsive dashboard.
</p>

<p align="center">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-EDA-3776AB?logo=python&logoColor=white">
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
| **Tools** | PostgreSQL (pgAdmin 4), Excel (first look only), Python (pandas, matplotlib, seaborn), AI text analysis, Power BI |
| **Deliverables** | Clean database, decision log, EDA notebook, AI-tagged complaint topics, responsive dashboard, written findings |

## Project status

| Stage | What happens | Status |
|---|---|---|
| 1. SQL cleaning | Load raw data, profile every table, clean in PostgreSQL, prove it | **Complete** |
| 2. Python EDA | Explore ratings, cities, cuisines and time trends | Next |
| 3. AI analysis | Tag sentiment and complaint topics in review text | Planned |
| 4. Dashboard | Responsive Power BI dashboard (desktop, tablet, phone) | Planned |
| 5. Findings | Recommendations for restaurant owners | Planned |

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

## Stage 3: AI-assisted analysis (planned)

Reading 300,000 reviews by hand is impossible, so AI tools will read them for me:

- **Sentiment and topic tagging** of review text (service, wait time, price, food quality, cleanliness, atmosphere, and others).
- **A free method on all reviews** compared against **a larger AI model on a small sample (about 5,000)**, so I can report how well the cheap method agrees with the stronger one.
- **A small "ask a question" tool** so questions such as "what do customers hate most about pizza places in Tampa?" can be answered from the data.
- Short and link-only reviews (flagged in Stage 1) are excluded from topic tagging, and the effect is reported.

## Stage 4: Responsive dashboard plan (Power BI)

**Goal:** a dashboard that is clear in 5 seconds and works on a laptop, a tablet and a phone.

**Who opens it:** a restaurant owner, who should learn in 5 seconds how often customers complain, about what, and whether it is getting better or worse.

**Desktop layout (16:9)**

```
+--------------------------------------------------------------+
| Title: What are restaurant customers complaining about?      |
+--------------+--------------+--------------+-----------------+
| Reviews      | Avg rating   | % negative   | Top complaint   |   <- KPI cards
+--------------+--------------+--------------+-----------------+
| Negative reviews over time   | Complaint topics ranked       |   <- main story
| (line, by year)              | (horizontal bars)             |
+------------------------------+-------------------------------+
| City comparison (bars)       | Cuisine x topic (heatmap)     |
+------------------------------+-------------------------------+
| Filters: year range | city | cuisine | star group             |
+--------------------------------------------------------------+
```

**Phone layout (built separately in Power BI's Phone layout view)**
1. Title and the 4 KPI cards, stacked
2. Complaint topics ranked (the key chart)
3. Negative reviews over time
4. Filters in a pop-up panel opened by a button, so they do not take up screen space

**Responsive design rules**
- Build the desktop page first, then arrange a separate phone layout with only the key visuals (not everything squeezed in).
- Filters sit in a bookmark-controlled panel on small screens.
- One question per chart, at most 6 to 8 visuals per page, text at least 12 pt.
- Tooltip pages carry the detail instead of extra visuals.
- Consistent theme, one highlight colour, colour-blind safe palette, sorted bars, no pie charts or 3D.
- Every chart title states its takeaway and every number shows units and the date range (with 2022 marked as a partial year).

**Planned measures (DAX):** Total Reviews, Average Rating, % Negative, Negative Reviews by Topic, Year-over-Year Change.

**Testing before publishing:** every dashboard number is cross-checked against SQL or Python, the phone layout is previewed in Power BI's phone view, and the 5-second test is run on a friend who has not seen it.

**Sharing:** screenshots (desktop and phone) and a short screen recording are added to this README, plus a link if publishing to the web is available.

---

## Repository structure

```
yelp-restaurant-complaint-analysis/
├── README.md
├── assets/                       # logo and dashboard screenshots
├── scripts/
│   └── sample_yelp.py            # cuts the 4 GB Yelp download to a ~300k review sample
├── SQL/                          # numbered cleaning scripts (00 to 07)
├── docs/
│   └── cleaning_log.md           # every cleaning decision with row counts
├── notebooks/                    # Python EDA and AI analysis (Stage 2 and 3)
└── dashboard/                    # Power BI file and exports (Stage 4)
```

## How to reproduce

1. Download the Yelp Open Dataset from the link above and run `python scripts/sample_yelp.py` to create the sample CSV files.
2. In PostgreSQL, create a database and run `SQL/00_create_raw_tables.sql`.
3. Import the three CSVs into the `raw` tables and check the row counts.
4. Run the scripts `02` to `06` in order, then `07` to confirm the checks pass.

The raw data is not included in this repository (Yelp's licence allows personal and educational use only).

## Limitations

- A ~6.5% random sample: about 11,000 restaurants (21%) have no review in it, so the analysis compares cities, cuisines and years rather than single restaurants.
- About 33% of the restaurants are now closed, which can bias older reviews.
- Review volume dips in 2020 (COVID), and 2022 is a partial year.
- Coverage is 13 US states plus Alberta, not the whole of the US.
- Topic tagging by AI is imperfect; agreement between methods will be reported.

## Skills demonstrated

SQL (profiling, cleaning, joins, constraints, validation) · data quality thinking and documentation · Python EDA · AI-assisted text analysis · dashboard design for desktop and mobile · clear written communication

## About

Built by [MIZZYAYO](https://github.com/MIZZYAYO). Connect on LinkedIn: _add your link here_.

*Data: Yelp Open Dataset, used for educational purposes.*
