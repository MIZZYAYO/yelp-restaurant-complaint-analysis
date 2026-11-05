-- =====================================================================
-- 00_create_raw_tables.sql  (PostgreSQL)
-- STEP 1: a safe home for the RAW data.
--
-- Why a separate schema called "raw"?
--   A schema is a folder inside the database. Everything in "raw" is the
--   original data, exactly as it arrived. We never edit it. All our
--   cleaning will write into a different folder called "clean".
--
-- Why is EVERY column text, even the numbers and dates?
--   If we let the database guess types, it can silently change or reject
--   values (for example turn 007 into 7). Loading as text keeps the raw
--   data exactly as it arrived. We convert to numbers and dates ourselves,
--   on purpose, in the cleaning step, and write each change in the log.
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS clean;

DROP TABLE IF EXISTS raw.reviews, raw.users, raw.business;

CREATE TABLE raw.business (
  business_id  text,
  name         text,
  city         text,
  state        text,
  postal_code  text,
  latitude     text,
  longitude    text,
  stars        text,
  review_count text,
  is_open      text,
  categories   text
);

CREATE TABLE raw.users (
  user_id        text,
  review_count   text,
  yelping_since  text,
  useful         text,
  funny          text,
  cool           text,
  fans           text,
  average_stars  text
);

CREATE TABLE raw.reviews (
  review_id    text,
  user_id      text,
  business_id  text,
  stars        text,
  date         text,
  text         text,
  useful       text,
  funny        text,
  cool         text
);

-- checking if the tables have been imported 

SELECT COUNT(*)
FROM raw.business;

SELECT COUNT(*)
FROM raw.users;

SELECT COUNT(*)
FROM raw.reviews;


SELECT 'business' AS tbl, COUNT(*) AS rows_loaded, 52268 AS expected FROM raw.business
UNION ALL SELECT 'users',   COUNT(*), 214971 FROM raw.users
UNION ALL SELECT 'reviews', COUNT(*), 307515 FROM raw.reviews
UNION ALL SELECT 'reviews with dash-start business_id', COUNT(*), 5085 FROM raw.reviews WHERE business_id LIKE '-%';