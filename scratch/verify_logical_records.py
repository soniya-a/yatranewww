import os
import glob
import csv
import dotenv
import psycopg2

CSV_DIR = r"D:\ESCO dataset - v1.2.1 - classification - en - csv"
dotenv.load_dotenv(r"d:\YATRA\Yatranew\.env")
DATABASE_URL = os.environ.get("DATABASE_URL")

csv.field_size_limit(2147483647)
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("=" * 105)
print(f"{'#':<3} {'CSV File Name':<38} {'Neon Table':<34} {'CSV Records':<12} {'DB Rows':<10} {'Match':<6}")
print("-" * 105)

csv_files = sorted([f for f in glob.glob(os.path.join(CSV_DIR, "*.csv")) if os.path.basename(f) != "esco_import_report.csv"])

total_csv_records = 0
total_db_rows = 0
all_matched = True

for idx, f in enumerate(csv_files, 1):
    fname = os.path.basename(f)
    tname = os.path.splitext(fname)[0].lower()
    
    # Count actual logical CSV records using standard CSV parser
    with open(f, 'r', encoding='utf-8', errors='replace') as fp:
        reader = csv.reader(fp)
        next(reader) # skip header
        csv_records = sum(1 for _ in reader)
    
    # Count database rows
    cur.execute(f"SELECT count(*) FROM esco_raw.{tname};")
    db_rows = cur.fetchone()[0]
    
    total_csv_records += csv_records
    total_db_rows += db_rows
    
    match = (csv_records == db_rows)
    if not match:
        all_matched = False
    status = "PASS" if match else "FAIL"
    print(f"{idx:<3} {fname:<38} {tname:<34} {csv_records:<12} {db_rows:<10} {status:<6}")

print("-" * 105)
print(f"TOTALS: CSV Records = {total_csv_records:,} | DB Rows = {total_db_rows:,} | 100% Match = {all_matched}")
print("=" * 105)

cur.close()
conn.close()
