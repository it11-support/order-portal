import time
from jobs import subgroups, customers, products

def main():
    while True:
        conn = None
        try:            
          subgroups.sync()
          customers.sync()
          products.sync()
        except Exception as e:
            print("[FATAL]", e)

        finally:
            if conn:
                conn.close()
                print("[OK] MSSQL connection closed")

        time.sleep(600)

if __name__ == "__main__":
    main()
