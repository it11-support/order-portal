-- "Harga aktual" is defined by the presence of a customer_item_prices row, so a
-- row left behind by an invoice that was later cancelled, renumbered or re-synced
-- away keeps reporting a price of its own for an item the customer never bought.
-- That is what made suggested products show an actual price instead of the price
-- list.
--
-- The comparison matches the one the application uses when it refreshes the
-- cache, so this purge and the ongoing cleanup agree on what counts as backed.
DELETE FROM "customer_item_prices" cip
USING "customers" c
WHERE c.id = cip."customer_id"
  AND (
    c."card_code" IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM "sales_invoices" si
      WHERE si."card_code" = c."card_code"
        AND si."item_code" = cip."item_code"
        AND si."canceled" = 'N'
        AND si."quantity" > 0
    )
  );