import os
import dotenv
import psycopg2

dotenv.load_dotenv(r'd:\YATRA\Yatranew\.env')
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

for t in ['occupations_en', 'skills_en', 'occupationskillrelations_en']:
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'esco_raw' AND table_name = %s
        ORDER BY ordinal_position;
    """, (t,))
    print(t, 'columns:', [r[0] for r in cur.fetchall()])

cur.close()
conn.close()
