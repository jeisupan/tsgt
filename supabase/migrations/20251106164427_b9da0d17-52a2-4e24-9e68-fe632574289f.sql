-- Step 1: Add temporary UUID columns to all tables that reference product_id
ALTER TABLE products ADD COLUMN product_id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE inventory ADD COLUMN product_id_uuid UUID;
ALTER TABLE order_items ADD COLUMN product_id_uuid UUID;
ALTER TABLE inbound_transactions ADD COLUMN product_id_uuid UUID;
ALTER TABLE outbound_transactions ADD COLUMN product_id_uuid UUID;

-- Step 2: Create a mapping table to convert existing text product_ids to UUIDs
CREATE TEMP TABLE product_id_mapping AS
SELECT DISTINCT product_id, gen_random_uuid() AS new_uuid
FROM products;

-- Step 3: Update the new UUID column in products table
UPDATE products p
SET product_id_uuid = m.new_uuid
FROM product_id_mapping m
WHERE p.product_id = m.product_id;

-- Step 4: Update all referencing tables with the new UUIDs
UPDATE inventory i
SET product_id_uuid = m.new_uuid
FROM product_id_mapping m
WHERE i.product_id = m.product_id;

UPDATE order_items oi
SET product_id_uuid = m.new_uuid
FROM product_id_mapping m
WHERE oi.product_id = m.product_id;

UPDATE inbound_transactions it
SET product_id_uuid = m.new_uuid
FROM product_id_mapping m
WHERE it.product_id = m.product_id;

UPDATE outbound_transactions ot
SET product_id_uuid = m.new_uuid
FROM product_id_mapping m
WHERE ot.product_id = m.product_id;

-- Step 5: Drop old text product_id columns
ALTER TABLE products DROP COLUMN product_id;
ALTER TABLE inventory DROP COLUMN product_id;
ALTER TABLE order_items DROP COLUMN product_id;
ALTER TABLE inbound_transactions DROP COLUMN product_id;
ALTER TABLE outbound_transactions DROP COLUMN product_id;

-- Step 6: Rename the UUID columns to product_id
ALTER TABLE products RENAME COLUMN product_id_uuid TO product_id;
ALTER TABLE inventory RENAME COLUMN product_id_uuid TO product_id;
ALTER TABLE order_items RENAME COLUMN product_id_uuid TO product_id;
ALTER TABLE inbound_transactions RENAME COLUMN product_id_uuid TO product_id;
ALTER TABLE outbound_transactions RENAME COLUMN product_id_uuid TO product_id;

-- Step 7: Add NOT NULL constraint to products.product_id
ALTER TABLE products ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE inventory ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE inbound_transactions ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE outbound_transactions ALTER COLUMN product_id SET NOT NULL;

-- Step 8: Add unique constraint to products.product_id
ALTER TABLE products ADD CONSTRAINT products_product_id_unique UNIQUE (product_id);