import os
import dotenv
import psycopg2

dotenv.load_dotenv(r'd:\YATRA\Yatranew\.env')
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'esco_raw' AND table_name = 'dataset_import_log'
    ORDER BY ordinal_position;
""")
for col in cur.fetchall():
    print(f"  {col[0]}: {col[1]}")
cur.close()
conn.close()
