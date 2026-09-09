import sys
import types
import unittest
from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
from pathlib import Path

# Unit tests run without database drivers or connections.
sys.modules.setdefault('pymssql', types.ModuleType('pymssql'))
sys.modules.setdefault('psycopg2', types.ModuleType('psycopg2'))
extras = types.ModuleType('psycopg2.extras')
extras.execute_values = lambda *args, **kwargs: None
sys.modules.setdefault('psycopg2.extras', extras)
base = types.ModuleType('jobs.base_sync')
base.BaseSync = MagicMock
sys.modules.setdefault('jobs.base_sync', base)
sys.path.insert(0, str(Path(__file__).parent))
from jobs.invoices import COLUMNS, extract_query, transform, upsert_query, sync_invoices


class InvoiceTests(unittest.TestCase):
    def row(self, unit='KG'):
        row = dict.fromkeys(COLUMNS)
        row.update(quantity=Decimal('2'), inventory_quantity=Decimal('12'),
                   inventory_uom=unit, unit_msr='BOX', line_total=Decimal('100'),
                   disc_total=Decimal('10'), canceled='Y', doc_entry=1, line_num=0)
        return row

    def test_decimal_quantities_and_discounts(self):
        row = dict(zip(COLUMNS, transform([self.row()], 'company')[0]))
        self.assertEqual(row['qty_kg'], Decimal('12'))
        self.assertEqual(row['total_sales'], Decimal('90.000000'))
        self.assertEqual(row['canceled'], 'Y')
        self.assertIsNone(dict(zip(COLUMNS, transform([self.row('PCS')], 'company')[0]))['qty_kg'])

    def test_query_identity_and_all_time(self):
        for target in ('sales_invoices', 'retur_invoices'):
            self.assertNotIn('WHERE', extract_query(target))
            self.assertNotIn('InvQty', extract_query(target))
            self.assertIn('H.UpdateDate >= %s', extract_query(target, True))
            self.assertIn('ON CONFLICT (company_id, doc_entry, line_num)', upsert_query(target))
        with self.assertRaises(ValueError):
            upsert_query('invalid')

    def run_sync(self, fail=False, checkpoint=None):
        source, target = MagicMock(), MagicMock()
        sap, pg = MagicMock(), MagicMock()
        source.cursor.return_value.__enter__.return_value = sap
        target.cursor.return_value.__enter__.return_value = pg
        pg.fetchone.side_effect = [(True,), checkpoint]
        sap.fetchone.return_value = {'source_now': datetime(2026, 9, 9, 12)}
        sap.fetchmany.side_effect = [[self.row()], [self.row('PCS')], []]
        engine = MagicMock(mssql_config={'database': 'test'}, pg_config={})
        with patch('jobs.invoices.BaseSync', return_value=engine), \
             patch('jobs.invoices.pymssql.connect', create=True, return_value=source), \
             patch('jobs.invoices.psycopg2.connect', create=True, return_value=target), \
             patch('jobs.invoices.execute_values', side_effect=RuntimeError('failed') if fail else None) as write:
            if fail:
                with self.assertRaises(RuntimeError):
                    sync_invoices('sales_invoices')
                target.rollback.assert_called_once()
                target.commit.assert_not_called()
                self.assertFalse(any('INSERT INTO sync_checkpoints' in str(c) for c in pg.execute.call_args_list))
            else:
                self.assertEqual(sync_invoices('sales_invoices'), 2)
                self.assertEqual(write.call_count, 2)
                target.commit.assert_called_once()
                self.assertIn('INSERT INTO sync_checkpoints', pg.execute.call_args[0][0])
            sap.fetchall.assert_not_called()
            source.close.assert_called_once()
            target.close.assert_called_once()
        return sap

    def test_batches_and_atomic_checkpoint(self):
        self.run_sync()

    def test_rollback_without_advancing_checkpoint(self):
        self.run_sync(fail=True)

    def test_incremental_overlap(self):
        sap = self.run_sync(checkpoint=(datetime(2026, 9, 9),))
        self.assertEqual(str(sap.execute.call_args[0][1][0]), '2026-09-07')


if __name__ == '__main__':
    unittest.main()
