-- How many restaurants per state? Does any state look strange?
SELECT state , COUNT(*) AS restaurants
FROM raw.business
GROUP BY state
ORDER BY restaurants DESC;


-- =====================================================================
-- Business table health check: one result table, 11 checks.
-- Each line below is one check. Column 1 = the name of the check,
-- column 2 = the number found.
-- UNION ALL simply stacks the results of all the checks into one table.
-- =====================================================================

-- so this are basically the major checks to determine what rows or columns or even tables we are going to drop 


-- CHECK 1: Group restaurants by state, keep only states that have fewer than
-- 10 restaurants, then count how many such states exist (should be the 5 odd ones).
SELECT '1 states with fewer than 10 restaurants' AS check_name, COUNT(*) AS value
  FROM (SELECT state FROM raw.business GROUP BY state HAVING COUNT(*) < 10) x

-- CHECK 2: Find any business_id that appears more than once (duplicates).
-- We want 0, because every restaurant should have its own unique ID.
UNION ALL SELECT '2 duplicated business_id', COUNT(*)
  FROM (SELECT business_id FROM raw.business GROUP BY business_id HAVING COUNT(*) > 1) x

-- CHECK 3: Count missing postal codes. A missing value can be NULL (nothing there)
-- or blank (empty text), so we test for both.
UNION ALL SELECT '3 blank postal codes', COUNT(*) FROM raw.business WHERE postal_code IS NULL OR BTRIM(postal_code) = ''

-- CHECK 4: BTRIM removes spaces from both ends of a text.
-- If the trimmed name differs from the original, the name had extra spaces.
UNION ALL SELECT '4 names with spaces at the ends', COUNT(*) FROM raw.business WHERE name <> BTRIM(name)

-- CHECK 5: Same test as check 4, but for the city column.
UNION ALL SELECT '5 cities with spaces at the ends', COUNT(*) FROM raw.business WHERE city <> BTRIM(city)

-- CHECK 6: Within each state, turn the city to lower case and trim it, then find
-- cities that still appear with more than one spelling (e.g. TUCSON, Tucson, tucson).
UNION ALL SELECT '6 cities spelled more than one way (capitals/spaces)', COUNT(*)
  FROM (SELECT state, LOWER(BTRIM(city)) FROM raw.business GROUP BY 1, 2 HAVING COUNT(DISTINCT city) > 1) x

-- CHECK 7: "~" means "matches this pattern". The pattern ^St\.? means: starts with "St"
-- followed by an optional dot and a space. Finds "St. Louis" and "St Louis" but not "Saint Louis".
UNION ALL SELECT '7 cities starting St. or St (not Saint)', COUNT(*) FROM raw.business WHERE city ~ '^St\.? '

-- CHECK 8: is_open is stored as text, so we compare with '0' in quotes. 0 = closed.
UNION ALL SELECT '8 closed restaurants (is_open = 0)', COUNT(*) FROM raw.business WHERE is_open = '0'

-- CHECKS 9, 10, 11: LIKE '%word%' means "contains that word anywhere in the text".
-- These count places that carry a non-restaurant tag in their categories.
UNION ALL SELECT '9 tagged hotel', COUNT(*) FROM raw.business WHERE categories LIKE '%Hotels%'
UNION ALL SELECT '10 tagged grocery', COUNT(*) FROM raw.business WHERE categories LIKE '%Grocery%'
UNION ALL SELECT '11 tagged gas station', COUNT(*) FROM raw.business WHERE categories LIKE '%Gas Stations%'

-- Sort the final table by the check name.
ORDER BY 1;






-- =====================================================================
-- Users + reviews health check. Same idea as the business check:
-- one result table, one check per line, "value" is the number found.
-- =====================================================================

-- ---------- USERS TABLE ----------
-- U1: duplicate user_id (we want 0)
SELECT 'U1 duplicated user_id' AS check_name, COUNT(*) AS value
  FROM (SELECT user_id FROM raw.users GROUP BY user_id HAVING COUNT(*) > 1) x

-- U2: missing join date or id
UNION ALL SELECT 'U2 users with missing id or join date', COUNT(*)
  FROM raw.users WHERE user_id IS NULL OR yelping_since IS NULL

-- U3: review_count is how many reviews the user has EVER written, so 0 is impossible
UNION ALL SELECT 'U3 users with review_count below 1', COUNT(*)
  FROM raw.users WHERE review_count::int < 1

-- U4: average star rating must be between 1 and 5
-- (::numeric turns the text into a number so we can compare it)
UNION ALL SELECT 'U4 users with average_stars outside 1-5', COUNT(*)
  FROM raw.users WHERE average_stars::numeric NOT BETWEEN 1 AND 5

-- ---------- REVIEWS TABLE ----------
-- R1: duplicate review_id (we want 0)
UNION ALL SELECT 'R1 duplicated review_id', COUNT(*)
  FROM (SELECT review_id FROM raw.reviews GROUP BY review_id HAVING COUNT(*) > 1) x

-- R2: stars must be 1 to 5. In the raw file they are written like 5.0 (text),
-- so we convert to a number first with ::numeric, then test.
UNION ALL SELECT 'R2 reviews with stars not in 1-5', COUNT(*)
  FROM raw.reviews WHERE stars::numeric NOT IN (1,2,3,4,5)

-- R3: every date should look like 2018-07-07 22:09:11 ("~" = matches a pattern)
UNION ALL SELECT 'R3 reviews with a date in the wrong format', COUNT(*)
  FROM raw.reviews WHERE date !~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'

-- R4: orphan reviews = the review points to a restaurant that is not in the business table
UNION ALL SELECT 'R4 reviews whose restaurant is missing', COUNT(*)
  FROM raw.reviews r WHERE NOT EXISTS (SELECT 1 FROM raw.business b WHERE b.business_id = r.business_id)

-- R5: same test for users
UNION ALL SELECT 'R5 reviews whose user is missing', COUNT(*)
  FROM raw.reviews r WHERE NOT EXISTS (SELECT 1 FROM raw.users u WHERE u.user_id = r.user_id)

-- R6: reviews belonging to the 5 restaurants with impossible locations
UNION ALL SELECT 'R6 reviews of the 5 odd-state restaurants', COUNT(*)
  FROM raw.reviews r
  WHERE r.business_id IN (SELECT business_id FROM raw.business
                          WHERE state IN (SELECT state FROM raw.business GROUP BY state HAVING COUNT(*) < 10))

-- R7: very short reviews (under 20 characters), e.g. "Yum" - too little text for topic analysis
UNION ALL SELECT 'R7 reviews shorter than 20 characters', COUNT(*)
  FROM raw.reviews WHERE LENGTH(BTRIM(text)) < 20

-- R8: reviews containing a web link. ILIKE = LIKE but ignores capitals (catches HTTP too)
UNION ALL SELECT 'R8 reviews containing http', COUNT(*)
  FROM raw.reviews WHERE text ILIKE '%http%'

-- R9: reviews with leftover HTML codes such as &amp; or &quot; (junk in the text)
UNION ALL SELECT 'R9 reviews with HTML codes', COUNT(*)
  FROM raw.reviews WHERE text ~ '&(amp|quot|lt|gt|#39);'

-- R10: reviews written in 2022 (the data stops 19 January 2022, so it is a partial year)
UNION ALL SELECT 'R10 reviews written in 2022', COUNT(*)
  FROM raw.reviews WHERE date LIKE '2022%'

-- R11: a review dated BEFORE its writer joined Yelp would be impossible.
-- Both columns hold a date AND a time, so we keep only the first 10 characters
-- (the date part) of each before comparing.
UNION ALL SELECT 'R11 reviews dated before the user joined', COUNT(*)
  FROM raw.reviews r JOIN raw.users u ON u.user_id = r.user_id
  WHERE LEFT(r.date, 10) < LEFT(u.yelping_since, 10)

ORDER BY 1;
