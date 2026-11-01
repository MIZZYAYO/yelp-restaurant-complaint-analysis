-- =====================================================================
-- NEXT STEP AFTER CLEANING ANALYSIS: build clean.business from raw.business
-- raw.business is only READ here. Nothing in raw is ever changed.
-- Re-runnable: the DROP lines only remove tables in the "clean" schema.
-- =====================================================================
DROP TABLE IF EXISTS clean.business;
DROP TABLE IF EXISTS clean.city_lookup;

-- ---------------------------------------------------------------------
-- 5A. CITY LOOKUP: decide the ONE official spelling of every city.
-- The same city shows up as TUCSON / Tucson, "St. Louis" / "Saint Louis".
-- Plan: (1) trim spaces, (2) write St./Mt./Ft. out as Saint/Mount/Fort,
--       (3) for each city keep its most common spelling as the official one.
-- ---------------------------------------------------------------------
CREATE TABLE clean.city_lookup AS
WITH step1 AS (                       -- steps 1 and 2: trim, then expand abbreviations
  SELECT state,
         regexp_replace(
           regexp_replace(
             regexp_replace(BTRIM(city), '^st\.? ', 'Saint ', 'i'),   -- St. / St  -> Saint
                                         '^mt\.? ', 'Mount ', 'i'),   -- Mt. / Mt  -> Mount
                                         '^ft\.? ', 'Fort ',  'i')    -- Ft. / Ft  -> Fort
         AS city_fixed
  FROM raw.business
),
counted AS (                          -- how often is each spelling used?
  SELECT state, LOWER(city_fixed) AS city_key, city_fixed, COUNT(*) AS n
  FROM step1
  GROUP BY state, LOWER(city_fixed), city_fixed
)
-- step 3: for each (state, city) keep the spelling with the highest count
SELECT DISTINCT ON (state, city_key)
       state, city_key, city_fixed AS city_official
FROM counted
ORDER BY state, city_key, n DESC, city_fixed;

-- ---------------------------------------------------------------------
-- 5B. CLEAN BUSINESS TABLE
--   DROP : the 5 restaurants in states that appear fewer than 100 times
--   FIX  : spaces trimmed, official city spelling, text -> real numbers
--   FLAG : is_core_restaurant = 0 for hotels / grocery / gas stations
-- ---------------------------------------------------------------------
CREATE TABLE clean.business AS
SELECT
  b.business_id,
  BTRIM(b.name)                              AS name,
  l.city_official                            AS city,
  b.state,
  CASE WHEN b.state = 'AB' THEN 'Canada' ELSE 'USA' END AS country,   -- AB = Alberta
  NULLIF(BTRIM(b.postal_code), '')           AS postal_code,          -- blank -> NULL
  b.latitude::double precision               AS latitude,             -- text -> number
  b.longitude::double precision              AS longitude,
  b.stars::numeric(2,1)                      AS business_stars,
  b.review_count::integer                    AS total_reviews_all_time,
  b.is_open::smallint                        AS is_open,
  BTRIM(b.categories)                        AS categories,
  CASE WHEN b.categories LIKE '%Hotels%'
         OR b.categories LIKE '%Grocery%'
         OR b.categories LIKE '%Gas Stations%' THEN 0 ELSE 1 END AS is_core_restaurant   -- the FLAG
FROM raw.business b
JOIN clean.city_lookup l
  ON  l.state    = b.state
  AND l.city_key = LOWER(regexp_replace(regexp_replace(regexp_replace(
                       BTRIM(b.city), '^st\.? ', 'Saint ', 'i'),
                                      '^mt\.? ', 'Mount ', 'i'),
                                      '^ft\.? ', 'Fort ',  'i'))
-- the DROP: keep only states that have at least 100 restaurants
WHERE b.state IN (SELECT state FROM raw.business GROUP BY state HAVING COUNT(*) >= 100);

-- a primary key = "no duplicate restaurants allowed" (Postgres will enforce it)
ALTER TABLE clean.business ADD PRIMARY KEY (business_id);





-- THE CHECK TO DETERMINE WHETHER THE ACTION WAS TAKEN !!!


SELECT 'a rows in clean.business' AS check_name, COUNT(*) AS value FROM clean.business
UNION ALL SELECT 'b distinct state+city', COUNT(DISTINCT state || '|' || city) FROM clean.business
UNION ALL SELECT 'c states with fewer than 100 restaurants', COUNT(*) FROM (SELECT state FROM clean.business GROUP BY state HAVING COUNT(*)<100) x
UNION ALL SELECT 'd names/cities with spaces at the ends', COUNT(*) FROM clean.business WHERE name<>BTRIM(name) OR city<>BTRIM(city)
UNION ALL SELECT 'e cities starting St./Mt./Ft.', COUNT(*) FROM clean.business WHERE city ~* '^(st|mt|ft)\.? '
UNION ALL SELECT 'f cities spelled 2 ways in same state', COUNT(*) FROM (SELECT state, LOWER(city) FROM clean.business GROUP BY 1,2 HAVING COUNT(DISTINCT city)>1) x
UNION ALL SELECT 'g flagged NOT core restaurant', COUNT(*) FROM clean.business WHERE is_core_restaurant = 0
UNION ALL SELECT 'h Canadian restaurants', COUNT(*) FROM clean.business WHERE country = 'Canada'
UNION ALL SELECT 'i blank postal codes now NULL', COUNT(*) FROM clean.business WHERE postal_code IS NULL
ORDER BY 1;




-- SHOWING THAT A CITY HAS ONLY ONE NAME IN THE CORRECT FORM (Saint Louis as the standard)

SELECT city, state, COUNT(*) AS restaurants
FROM clean.business WHERE city LIKE 'Saint %'
GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 4;