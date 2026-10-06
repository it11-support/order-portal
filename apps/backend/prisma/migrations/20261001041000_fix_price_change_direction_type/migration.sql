-- price_change_logs.direction was CHAR(4), which Postgres blank-pads. The
-- padded value ("up  ") leaked through the API and broke direction comparisons.
ALTER TABLE "price_change_logs" ALTER COLUMN "direction" TYPE VARCHAR(4) USING TRIM("direction");