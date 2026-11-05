-- =====================================================================
-- STEP 6: build clean.users and clean.reviews (raw tables are only READ)
-- Re-runnable: the DROP lines only remove tables in the "clean" schema.
-- =====================================================================
DROP TABLE IF EXISTS clean.reviews;
DROP TABLE IF EXISTS clean.users;

-- ---------------------------------------------------------------------
-- 6A. CLEAN USERS
--   SET TO NULL : lifetime review_count below 1 (impossible, so "unknown")
--   FIX         : text -> numbers; join date -> a real date
-- ---------------------------------------------------------------------
CREATE TABLE clean.users AS
SELECT
  user_id,
  CASE WHEN review_count::integer < 1 THEN NULL            -- the 2 impossible zeros
       ELSE review_count::integer END   AS total_reviews_all_time,
  yelping_since::date                   AS yelping_since,  -- drops the time of day, we only need the date
  useful::integer                       AS useful_votes,
  funny::integer                        AS funny_votes,
  cool::integer                         AS cool_votes,
  fans::integer                         AS fans,
  average_stars::numeric(3,2)           AS average_stars
FROM raw.users;

ALTER TABLE clean.users ADD PRIMARY KEY (user_id);

-- ---------------------------------------------------------------------
-- 6B. CLEAN REVIEWS
--   DROP : reviews of the 5 removed restaurants (the JOIN to clean.business does this)
--   FIX  : text -> numbers/dates; HTML codes (&amp; etc.) turned back into normal characters
--   FLAG : short review, contains a link, partial year 2022
--   NEW  : year, month, star_group (negative / neutral / positive)
-- ---------------------------------------------------------------------
CREATE TABLE clean.reviews AS
WITH tidy AS (                      -- first tidy the text once, then reuse it below
  SELECT r.*,
         BTRIM(replace(replace(replace(replace(replace(r.text,
           '&amp;', '&'), '&quot;', '"'), '&#39;', ''''), '&lt;', '<'), '&gt;', '>')) AS review_text
  FROM raw.reviews r
  JOIN clean.business b ON b.business_id = r.business_id   -- keeps only reviews of surviving restaurants
)
SELECT
  review_id,
  user_id,
  business_id,
  stars::numeric::smallint                                   AS stars,        -- '5.0' -> 5
  CASE WHEN stars::numeric <= 2 THEN 'negative'
       WHEN stars::numeric  = 3 THEN 'neutral'
       ELSE 'positive' END                                   AS star_group,
  date::timestamp                                            AS review_datetime,
  date::timestamp::date                                      AS review_date,
  EXTRACT(YEAR  FROM date::timestamp)::smallint              AS review_year,
  EXTRACT(MONTH FROM date::timestamp)::smallint              AS review_month,
  CASE WHEN date LIKE '2022%' THEN 1 ELSE 0 END              AS is_partial_year,   -- FLAG
  useful::integer                                            AS useful_votes,
  funny::integer                                             AS funny_votes,
  cool::integer                                              AS cool_votes,
  review_text,
  LENGTH(review_text)                                        AS text_length,
  CASE WHEN LENGTH(review_text) < 20 THEN 1 ELSE 0 END       AS is_short_review,   -- FLAG
  CASE WHEN review_text ILIKE '%http%' THEN 1 ELSE 0 END     AS has_url            -- FLAG
FROM tidy;

-- Primary key = no duplicate reviews. Foreign keys = every review MUST point to a
-- real restaurant and a real user. If one did not, Postgres would refuse these lines.
ALTER TABLE clean.reviews ADD PRIMARY KEY (review_id);
ALTER TABLE clean.reviews ADD FOREIGN KEY (business_id) REFERENCES clean.business (business_id);
ALTER TABLE clean.reviews ADD FOREIGN KEY (user_id)     REFERENCES clean.users (user_id);
-- indexes = the "index at the back of a book": make joins and filters fast later
CREATE INDEX ix_reviews_business ON clean.reviews (business_id);
CREATE INDEX ix_reviews_user     ON clean.reviews (user_id);
CREATE INDEX ix_reviews_year     ON clean.reviews (review_year);









-- TO CHECK MY CHANGES 

SELECT 'a rows in clean.users' AS check_name, COUNT(*) AS value FROM clean.users
UNION ALL SELECT 'b users with review_count now NULL', COUNT(*) FROM clean.users WHERE total_reviews_all_time IS NULL
UNION ALL SELECT 'c rows in clean.reviews', COUNT(*) FROM clean.reviews
UNION ALL SELECT 'd reviews removed vs raw', (SELECT COUNT(*) FROM raw.reviews) - COUNT(*) FROM clean.reviews
UNION ALL SELECT 'e stars outside 1-5', COUNT(*) FROM clean.reviews WHERE stars NOT BETWEEN 1 AND 5
UNION ALL SELECT 'f HTML codes left in text', COUNT(*) FROM clean.reviews WHERE review_text ~ '&(amp|quot|lt|gt|#39);'
UNION ALL SELECT 'g flagged: 2022 partial year', COUNT(*) FROM clean.reviews WHERE is_partial_year = 1
UNION ALL SELECT 'h flagged: short review', COUNT(*) FROM clean.reviews WHERE is_short_review = 1
UNION ALL SELECT 'i flagged: contains link', COUNT(*) FROM clean.reviews WHERE has_url = 1
UNION ALL SELECT 'j reviews in star group negative', COUNT(*) FROM clean.reviews WHERE star_group = 'negative'
UNION ALL SELECT 'k average star rating x10000', ROUND(AVG(stars) * 10000) FROM clean.reviews
UNION ALL SELECT 'l 3-table join changes review count', (SELECT COUNT(*) FROM clean.reviews r JOIN clean.business b USING (business_id) JOIN clean.users u USING (user_id)) - COUNT(*) FROM clean.reviews
ORDER BY 1;