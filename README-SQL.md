# Yelp Restaurant Complaint Analysis

**Which complaints hurt restaurant ratings most?** An end-to-end analysis of ~300,000 Yelp restaurant reviews using PostgreSQL, Python and AI-assisted text analysis.

> **Project status:** Stage 1 (SQL data cleaning) is complete. Stage 2 (Python EDA) and Stage 3 (AI topic tagging, findings and recommendations) are in progress. This README covers Stage 1.

---

## Why this project

A restaurant owner reads hundreds of reviews and cannot tell which complaint to fix first. This project aims to answer: **what are customers complaining about in low-star reviews, which complaints cost the most stars, and how are they changing over time?**

Before answering that, the data has to be trustworthy. Stage 1 is about proving it is.

## Data

- **Source:** [Yelp Open Dataset](https://business.yelp.com/data/resources/open-dataset/) (free for personal and educational use; the raw data is **not** included in this repo).
- **What I used:** a random ~6.5% sample of restaurant reviews, taken with `scripts/sample_yelp.py`.

| Table | One row is | Rows |
|---|---|---|
| `business` | one restaurant | 52,268 |
| `users` | one reviewer | 214,971 |
| `reviews` | one review | 307,515 |

The `reviews` table links to the other two through `business_id` and `user_id`.

## Tools

PostgreSQL 18 (pgAdmin 4) for loading, profiling and cleaning. Excel for a first look only. Python and AI tools come in Stage 2 and 3.

## Process

1. **Looked before touching.** Inspected each file in Excel and found that Excel misreads IDs starting with a dash as formulas (`#NAME?`). That is why the original CSVs go straight into a database and are never saved from Excel.
2. **Kept raw data untouched.** Loaded all three files into a `raw` schema with every column as text, then checked row counts against the CSVs, including that dash-start IDs survived.
3. **Profiled every table before fixing anything.** 26 health checks across the three tables (duplicates, missing values, impossible values, inconsistent text, broken links between tables).
4. **Wrote a decision log.** Every problem got a documented action: drop, fix, flag or set to NULL.
5. **Built the clean tables** in a separate `clean` schema, with primary and foreign keys so PostgreSQL itself refuses broken data.
6. **Tested the result** against expected counts and an independent calculation.

## Data quality findings and decisions

| Problem found | Rows | Action |
|---|---|---|
| Restaurants whose city/state contradict their coordinates | 5 | **Dropped** (cannot tell which field is wrong; 0.01% of data) |
| Their reviews | 5 | **Dropped** (otherwise orphaned) |
| Same city spelled several ways (TUCSON/Tucson, St./Saint, Mt./Mount) | 1,708 changed; 941 to 843 cities | **Fixed** |
| Spaces at the ends of names and cities | 51 / 11 | **Fixed** |
| Hotels, grocery stores, gas stations tagged as restaurants | 1,512 | **Flagged** (`is_core_restaurant`) |
| Very short reviews (under 20 characters) | 18 | **Flagged** (`is_short_review`) |
| Reviews containing a web link | 353 | **Flagged** (`has_url`) |
| 2022 contains only 19 days of data | 1,420 | **Flagged** (`is_partial_year`) |
| Users with an impossible lifetime review count of 0 | 2 | **Set to NULL** |
| HTML codes (`&amp;` etc.) in review text | 4 | **Fixed** |
| Category tags crammed into one cell | all | **Split** into `business_categories` (243,587 rows, 728 tags) |
| Same tag repeated for one restaurant | 2 | **De-duplicated** |
| Numbers and dates stored as text | all | **Converted** to proper types |

**Deciding what to drop.** I asked three questions in order: (1) Is it wrong, or just unusual? Unusual but real data is kept and flagged. (2) Can I fix it with certainty? If yes, fix it. (3) Is it tiny, and does removing it break nothing else? Only then drop it. Full details are in [`docs/cleaning_log.md`](docs/cleaning_log.md).

## Result

| Table | Before | After |
|---|---|---|
| Restaurants | 52,268 | 52,263 |
| Reviews | 307,515 | 307,510 |
| Users | 214,971 | 214,971 |
| Category tags (new) | n/a | 243,587 |

**How I know the clean tables are right**
- Primary and foreign keys enforced by PostgreSQL.
- The average star rating (3.7925) matched an independent calculation in a second database engine and in Python.
- Joining the three tables does not change the review count, so there is no accidental row multiplication.

## Lessons learned

- **Excel can silently damage data.** About 1.6% of IDs start with a dash and show as `#NAME?`. Saving would have destroyed them. Loading the original CSVs as text avoids this.
- **Suspect your own query first.** An early check showed all reviews with invalid stars and thousands dated before the user joined. The data was fine: stars are stored as `5.0`, and the dates include a time of day. I fixed the checks, not the data.
- **Dropping is the last resort.** Only 10 rows in total were removed, and each one is justified in the log.

## Limitations

- This is a ~6.5% random sample. About 11,000 restaurants (21%) have no review in it, so the analysis will compare cities, cuisines and years rather than single restaurants.
- About 33% of the restaurants are now closed (`is_open = 0`).
- Review volume dips in 2020 (COVID), and 2022 is a partial year.
- Coverage is 13 US states plus Alberta, not the whole of the US.

## Repo structure

```
yelp-restaurant-complaint-analysis/
├── scripts/
│   └── sample_yelp.py            # cuts the 4 GB Yelp download to a ~300k review sample
├── sql/
│   ├── 00_create_raw_tables.sql  # raw and clean schemas, raw tables (all text)
│   ├── 01_load_raw_NOTES.md      # how the CSVs were loaded
│   ├── 02_profile_business.sql   # 11 health checks
│   ├── 03_profile_users_reviews.sql  # 15 health checks
│   ├── 04_clean_business.sql     # city fixes, drop, flags
│   ├── 05_clean_users_reviews.sql
│   ├── 06_clean_categories.sql
│   └── 07_checks_clean.sql       # tests on the clean tables
└── docs/
    └── cleaning_log.md           # every decision, with row counts
```

## How to reproduce

1. Download the Yelp Open Dataset from the link above and run `python scripts/sample_yelp.py` to create the three CSV files.
2. In PostgreSQL, create a database and run `sql/00_create_raw_tables.sql`.
3. Import the three CSVs into the `raw` tables (see `sql/01_load_raw_NOTES.md`) and check the row counts.
4. Run the scripts `02` to `06` in order.
5. Run `07_checks_clean.sql` and compare with the expected values in `docs/cleaning_log.md`.

## Next steps

- **Stage 2:** Python EDA on the clean tables (rating trends, cities, cuisines).
- **Stage 3:** AI-assisted sentiment and complaint-topic tagging, then findings and recommendations for restaurant owners.

---

*Data: Yelp Open Dataset, used for educational purposes.*
