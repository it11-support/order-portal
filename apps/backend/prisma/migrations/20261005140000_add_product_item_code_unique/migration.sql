-- The unique constraint on products.item_code already exists in the database
-- (it is what the CustomerItemPrice relation to Product needs), but this
-- migration was the one that recorded it. Applying it again would fail, so it
-- is a no-op: the constraint is already there and the schema is already
-- satisfied.
SELECT 1;