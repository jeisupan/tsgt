-- Step 1: Create a mapping of product_id to id for data migration
CREATE TEMP TABLE product_mapping AS
SELECT id, product_id FROM products;

-- Step 2: Add temporary id columns to all referencing tables
ALTER TABLE inventory ADD COLUMN product_id_new UUID;
ALTER TABLE order_items ADD COLUMN product_id_new UUID;
ALTER TABLE inbound_transactions ADD COLUMN product_id_new UUID;
ALTER TABLE outbound_transactions ADD COLUMN product_id_new UUID;

-- Step 3: Map product_id to id in all referencing tables
UPDATE inventory i
SET product_id_new = m.id
FROM product_mapping m
WHERE i.product_id = m.product_id;

UPDATE order_items oi
SET product_id_new = m.id
FROM product_mapping m
WHERE oi.product_id = m.product_id;

UPDATE inbound_transactions it
SET product_id_new = m.id
FROM product_mapping m
WHERE it.product_id = m.product_id;

UPDATE outbound_transactions ot
SET product_id_new = m.id
FROM product_mapping m
WHERE ot.product_id = m.product_id;

-- Step 4: Drop old product_id columns
ALTER TABLE inventory DROP COLUMN product_id;
ALTER TABLE order_items DROP COLUMN product_id;
ALTER TABLE inbound_transactions DROP COLUMN product_id;
ALTER TABLE outbound_transactions DROP COLUMN product_id;

-- Step 5: Rename new columns to product_id
ALTER TABLE inventory RENAME COLUMN product_id_new TO product_id;
ALTER TABLE order_items RENAME COLUMN product_id_new TO product_id;
ALTER TABLE inbound_transactions RENAME COLUMN product_id_new TO product_id;
ALTER TABLE outbound_transactions RENAME COLUMN product_id_new TO product_id;

-- Step 6: Add NOT NULL constraints
ALTER TABLE inventory ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE inbound_transactions ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE outbound_transactions ALTER COLUMN product_id SET NOT NULL;

-- Step 7: Drop the redundant product_id column from products table
ALTER TABLE products DROP COLUMN product_id;

-- Step 8: Drop the unique constraint if it exists
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_id_unique;