"""Shared, incremental SAP invoice extraction. No writes are made to SAP."""
import os
from datetime import datetime, timedelta
from decimal import Decimal

import pymssql
import psycopg2
from psycopg2.extras import execute_values
from jobs.base_sync import BaseSync

TABLES = {
    'sales_invoices': ('OINV', 'INV1'),
    'retur_invoices': ('ORIN', 'RIN1'),
}
COLUMNS = (
    'company_id', 'doc_entry', 'doc_num', 'line_num', 'doc_date',
    'card_code', 'card_name', 'item_code', 'description', 'quantity',
    'inventory_quantity', 'qty_kg', 'unit_msr', 'inventory_uom',
    'price_bef_disc', 'disc_line', 'disc_total', 'line_total', 'total_sales',
    'currency', 'canceled', 'base_type', 'base_entry', 'base_line',
    'dwh_created_at', 'dwh_updated_at', 'updated_at',
)


def extract_query(target, incremental=False):
    header, lines = TABLES[target]  # Identifiers come only from this allowlist.
    where = ''
    if incremental:
        # SAP timestamps may have only day precision. Re-read an overlap window.
        where = 'WHERE H.UpdateDate >= %s OR H.CreateDate >= %s'
    return f'''
        SELECT H.DocEntry AS doc_entry, H.DocNum AS doc_num,
            L.LineNum AS line_num, H.DocDate AS doc_date,
            H.CardCode AS card_code, H.CardName AS card_name,
            L.ItemCode AS item_code, ISNULL(L.Dscription, '') AS description,
            L.Quantity AS quantity,
            CASE WHEN L.UseBaseUn = 'Y' THEN L.Quantity
                 ELSE L.Quantity * ISNULL(NULLIF(L.NumPerMsr, 0), 1)
            END AS inventory_quantity,
            L.unitMsr AS unit_msr, I.InvntryUom AS inventory_uom,
            L.PriceBefDi AS price_bef_disc, L.DiscPrcnt AS disc_line,
            H.DiscPrcnt AS disc_total, L.LineTotal AS line_total,
            L.Currency AS currency, H.CANCELED AS canceled,
            L.BaseType AS base_type, L.BaseEntry AS base_entry,
            L.BaseLine AS base_line, H.CreateDate AS dwh_created_at,
            H.UpdateDate AS dwh_updated_at
        FROM {header} H
        INNER JOIN {lines} L ON L.DocEntry = H.DocEntry
        LEFT JOIN OITM I ON I.ItemCode = L.ItemCode
        {where}
        ORDER BY H.DocEntry, L.LineNum
    '''


def transform(rows, company_id):
    now = datetime.now()
    data = []
    for source in rows:
        row = dict(source)
        row['company_id'] = company_id
        row['quantity'] = Decimal(str(row['quantity'] or 0))
        row['inventory_quantity'] = Decimal(str(row['inventory_quantity'] or 0))
        # Do not label PCS, boxes or litres as kilograms without a conversion.
        inventory_uom = (row['inventory_uom'] or '').strip().upper()
        sales_uom = (row['unit_msr'] or '').strip().upper()
        row['qty_kg'] = (row['inventory_quantity'] if inventory_uom in ('KG', 'KGS', 'KILOGRAM')
                         else row['quantity'] if sales_uom in ('KG', 'KGS', 'KILOGRAM') else None)
        # LineTotal is SAP local-currency net line value (already after line discount).
        # Allocate header percentage discount; exclude VAT, freight and rounding.
        line_total = Decimal(str(row['line_total'] or 0))
        discount = Decimal(str(row['disc_total'] or 0))
        row['total_sales'] = (line_total * (1 - discount / 100)).quantize(Decimal('0.000001'))
        row['updated_at'] = now
        data.append(tuple(row[column] for column in COLUMNS))
    return data


def upsert_query(target):
    if target not in TABLES:
        raise ValueError('Unknown invoice table')
    keys = {'company_id', 'doc_entry', 'line_num'}
    assignments = ', '.join(f'{column} = EXCLUDED.{column}' for column in COLUMNS if column not in keys)
    return f'''INSERT INTO {target} ({', '.join(COLUMNS)}) VALUES %s
        ON CONFLICT (company_id, doc_entry, line_num) DO UPDATE SET {assignments}'''


def sync_invoices(target, full=False):
    if target not in TABLES:
        raise ValueError('Unknown invoice table')
    engine = BaseSync()
    company = os.getenv('SAP_COMPANY_ID') or engine.mssql_config['database']
    if not company:
        raise ValueError('MSSQL_DATABASE or SAP_COMPANY_ID is required')
    batch_size = int(os.getenv('INVOICE_BATCH_SIZE', '2000'))
    overlap_days = int(os.getenv('INVOICE_OVERLAP_DAYS', '2'))
    if batch_size < 1 or batch_size > 10000 or overlap_days < 1:
        raise ValueError('Invalid invoice batch size or overlap days')

    source = target_conn = None
    try:
        target_conn = psycopg2.connect(**engine.pg_config, connect_timeout=15)
        with target_conn.cursor() as pg:
            pg.execute('SELECT pg_try_advisory_xact_lock(hashtext(%s))', (f'{target}:{company}',))
            if not pg.fetchone()[0]:
                print(f'[{target}] Another sync is running; skipped.')
                return
            pg.execute('SELECT source_watermark FROM sync_checkpoints WHERE job_name=%s AND company_id=%s',
                       (target, company))
            checkpoint = pg.fetchone()
            lower = checkpoint[0] - timedelta(days=overlap_days) if checkpoint and not full else None

            source = pymssql.connect(**engine.mssql_config, login_timeout=15, timeout=180)
            with source.cursor(as_dict=True) as sap:
                sap.execute('SELECT GETDATE() AS source_now')
                watermark = sap.fetchone()['source_now']
                query = extract_query(target, incremental=lower is not None)
                if lower is None:
                    sap.execute(query)
                else:
                    sap.execute(query, (lower.date(), lower.date()))
                count = 0
                while True:
                    rows = sap.fetchmany(batch_size)
                    if not rows:
                        break
                    execute_values(pg, upsert_query(target), transform(rows, company), page_size=1000)
                    count += len(rows)
                    print(f'[{target}] {count} rows processed', flush=True)

            pg.execute('''INSERT INTO sync_checkpoints (job_name, company_id, source_watermark, updated_at)
                VALUES (%s, %s, %s, NOW()) ON CONFLICT (job_name, company_id)
                DO UPDATE SET source_watermark=EXCLUDED.source_watermark, updated_at=NOW()''',
                       (target, company, watermark))
        # Rows and checkpoint are committed together. A failed run is safely retryable.
        target_conn.commit()
        print(f'[{target}] Committed {count} rows ({"all-time" if lower is None else "incremental"}).')
        return count
    except Exception:
        if target_conn:
            target_conn.rollback()
        raise
    finally:
        if source:
            source.close()
        if target_conn:
            target_conn.close()
