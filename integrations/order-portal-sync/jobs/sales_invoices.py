from jobs.invoices import sync_invoices


def sync(full=False):
    return sync_invoices('sales_invoices', full=full)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--full', action='store_true')
    sync(full=parser.parse_args().full)
