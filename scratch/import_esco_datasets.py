import os
import sys
import csv
import re
import glob
import time
from datetime import datetime, timezone
import dotenv
import psycopg2
from psycopg2.extras import execute_values

# 1. Configuration & Safe Limits
CSV_DIR = r"D:\ESCO dataset - v1.2.1 - classification - en - csv"
dotenv.load_dotenv(r"d:\YATRA\Yatranew\.env")
DATABASE_URL = os.environ.get("DATABASE_URL")

# Set safe CSV field size limit (avoiding sys.maxsize OverflowError on Windows)
try:
    csv.field_size_limit(sys.maxsize)
except OverflowError:
    csv.field_size_limit(2147483647)

def sanitize_identifier(name: str) -> str:
    """Sanitize column or table name to a clean PostgreSQL identifier."""
    cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', name.strip().lower())
    cleaned = re.sub(r'_+', '_', cleaned).strip('_')
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"col_{cleaned}"
    return cleaned

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def import_all_esco_datasets():
    print("=" * 70)
    print("STARTING YATRA ESCO DATASET IMPORT INTO NEON [schema: esco_raw]")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    all_csvs = sorted(glob.glob(os.path.join(CSV_DIR, "*.csv")))
    files_to_import = [
        f for f in all_csvs 
        if os.path.basename(f) != "esco_import_report.csv"
    ]

    print(f"Total CSVs in directory: {len(all_csvs)}")
    print(f"Total ESCO files to import: {len(files_to_import)}")
    print("Excluded: esco_import_report.csv")
    print("-" * 70)

    conn = get_db_connection()
    conn.autocommit = False

    import_summary = []

    try:
        with conn.cursor() as cur:
            # Verify esco_raw schema exists
            cur.execute("CREATE SCHEMA IF NOT EXISTS esco_raw;")
            
            # Ensure dataset_import_log exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS esco_raw.dataset_import_log (
                    id BIGSERIAL PRIMARY KEY,
                    file_name TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    row_count BIGINT NOT NULL,
                    import_status TEXT NOT NULL,
                    imported_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            conn.commit()

        for idx, file_path in enumerate(files_to_import, 1):
            fname = os.path.basename(file_path)
            tname = os.path.splitext(fname)[0].lower()
            start_time = time.time()

            print(f"\n[{idx}/19] Processing '{fname}' -> esco_raw.{tname}...")

            # 1. Read CSV header and rows using standard csv reader with utf-8
            with open(file_path, mode='r', encoding='utf-8', errors='replace') as fp:
                reader = csv.reader(fp)
                try:
                    raw_header = next(reader)
                except StopIteration:
                    raw_header = []
                
                # Sanitize column names and handle any duplicates safely
                seen_cols = {}
                sanitized_cols = []
                for c in raw_header:
                    sc = sanitize_identifier(c)
                    if sc in seen_cols:
                        seen_cols[sc] += 1
                        sc = f"{sc}_{seen_cols[sc]}"
                    else:
                        seen_cols[sc] = 1
                    sanitized_cols.append(sc)

                expected_col_count = len(sanitized_cols)

                # Collect all rows safely, handling uneven lengths without discarding
                rows_data = []
                malformed_count = 0
                for row_idx, r in enumerate(reader, 1):
                    if len(r) == expected_col_count:
                        rows_data.append(tuple(r))
                    elif len(r) < expected_col_count:
                        # Pad with empty strings
                        padded = tuple(r + [''] * (expected_col_count - len(r)))
                        rows_data.append(padded)
                        malformed_count += 1
                    else:
                        # Extra columns: join the overflow into the last column
                        merged = tuple(r[:expected_col_count - 1] + [",".join(r[expected_col_count - 1:])])
                        rows_data.append(merged)
                        malformed_count += 1

                source_count = len(rows_data)

            # 2. Check restart-safety: does the table already exist with the exact row count?
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'esco_raw' AND table_name = %s
                    );
                """, (tname,))
                table_exists = cur.fetchone()[0]

                if table_exists:
                    cur.execute(f"SELECT count(*) FROM esco_raw.{tname};")
                    existing_count = cur.fetchone()[0]
                    if existing_count == source_count and source_count > 0:
                        print(f"  -> Table esco_raw.{tname} already exists with exact {existing_count} rows. Skipping recreation.")
                        import_summary.append({
                            "file": fname,
                            "table": tname,
                            "source_rows": source_count,
                            "imported_rows": existing_count,
                            "status": "ALREADY_IMPORTED",
                            "malformed": malformed_count,
                            "time_sec": 0
                        })
                        continue

            # 3. Create table in esco_raw and insert batch in transaction
            with conn.cursor() as cur:
                # Drop existing partial/incomplete table inside esco_raw only
                cur.execute(f"DROP TABLE IF EXISTS esco_raw.{tname};")
                
                col_defs = ", ".join([f'"{col}" TEXT' for col in sanitized_cols])
                create_sql = f'CREATE TABLE esco_raw.{tname} ({col_defs});'
                cur.execute(create_sql)

                # Batch insert using execute_values
                cols_joined = ", ".join([f'"{col}"' for col in sanitized_cols])
                insert_template = f"INSERT INTO esco_raw.{tname} ({cols_joined}) VALUES %s"

                batch_size = 5000
                total_batches = (source_count + batch_size - 1) // batch_size if source_count > 0 else 1

                for b_idx in range(0, source_count, batch_size):
                    batch = rows_data[b_idx:b_idx + batch_size]
                    execute_values(cur, insert_template, batch, page_size=len(batch))

                # Verify count matches in Neon
                cur.execute(f"SELECT count(*) FROM esco_raw.{tname};")
                db_count = cur.fetchone()[0]

                if db_count != source_count:
                    raise RuntimeError(f"Row count mismatch for {fname}: CSV={source_count}, DB={db_count}")

                # Log into dataset_import_log
                cur.execute("""
                    INSERT INTO esco_raw.dataset_import_log 
                        (file_name, table_name, row_count, import_status, imported_at)
                    VALUES (%s, %s, %s, %s, NOW());
                """, (fname, tname, db_count, "SUCCESS"))

            conn.commit()
            elapsed = time.time() - start_time
            print(f"  -> SUCCESS: Imported {db_count:,} rows into esco_raw.{tname} in {elapsed:.2f}s (malformed/adjusted rows: {malformed_count})")

            import_summary.append({
                "file": fname,
                "table": tname,
                "source_rows": source_count,
                "imported_rows": db_count,
                "status": "PASS",
                "malformed": malformed_count,
                "time_sec": round(elapsed, 2)
            })

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Transaction aborted: {e}")
        raise
    finally:
        conn.close()

    print("\n" + "=" * 70)
    print("ESCO DATASET IMPORT SUMMARY:")
    print("=" * 70)
    for res in import_summary:
        print(f"File: {res['file']:<35} | Table: {res['table']:<32} | Source: {res['source_rows']:<7} | DB: {res['imported_rows']:<7} | Status: {res['status']}")
    print("=" * 70)

if __name__ == "__main__":
    import_all_esco_datasets()
