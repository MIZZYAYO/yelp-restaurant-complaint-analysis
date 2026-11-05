-- =====================================================================
-- STEP 7: split the category tags into their own table (one row per tag)
-- =====================================================================

-- Why a separate table: a restaurant can have many tags,
-- and with all of them in one cell we can’t count how many restaurants are “Pizza”.
-- One row per tag fixes that. The DISTINCT is the fix for the 2 repeated tags,
-- and the primary key (business_id, category) makes Postgres refuse any future repeat.





DROP TABLE IF EXISTS clean.business_categories;

CREATE TABLE clean.business_categories AS
SELECT DISTINCT                                   -- DISTINCT: if a tag is repeated for one restaurant, keep it once
       business_id,
       BTRIM(category) AS category
FROM clean.business,
     LATERAL string_to_table(categories, ',') AS category   -- cuts "Pizza, Italian, Bars" into 3 rows
WHERE BTRIM(category) <> '';

ALTER TABLE clean.business_categories ADD PRIMARY KEY (business_id, category);
ALTER TABLE clean.business_categories ADD FOREIGN KEY (business_id) REFERENCES clean.business (business_id);
CREATE INDEX ix_bc_category ON clean.business_categories (category);




-- TO CHECK IT 

SELECT '(a) rows (one per restaurant-tag pair)' AS check_name, COUNT(*) AS value FROM clean.business_categories
UNION ALL SELECT '(b) restaurants with at least 1 tag', COUNT(DISTINCT business_id) FROM clean.business_categories
UNION ALL SELECT '(c) restaurants with NO tag', COUNT(*) FROM clean.business b WHERE NOT EXISTS (SELECT 1 FROM clean.business_categories c WHERE c.business_id = b.business_id)
UNION ALL SELECT '(d) different tags in total', COUNT(DISTINCT category) FROM clean.business_categories
UNION ALL SELECT '(e) tags with spaces at the ends', COUNT(*) FROM clean.business_categories WHERE category <> BTRIM(category)
UNION ALL SELECT '(f) restaurants tagged "Restaurants"', COUNT(*) FROM clean.business_categories WHERE category = 'Restaurants'
ORDER BY 1;




-- AN EXAMPLE OF CATEGORY TAGS THAT HAVE BEEN UPDATED 

SELECT category, COUNT(*) AS restaurants
FROM clean.business_categories
WHERE category NOT IN ('Restaurants', 'Food')
GROUP BY 1 ORDER BY 2 DESC LIMIT 5;