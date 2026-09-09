import time
from jobs import subgroups, customers, products, sales_invoices, retur_invoices


def main():
    while True:
        for job in (subgroups, customers, products, sales_invoices, retur_invoices):
            try:
                job.sync()
            except Exception as error:
                print(f'[{job.__name__}] Sync failed: {error}', flush=True)
        time.sleep(600)


if __name__ == '__main__':
    main()
