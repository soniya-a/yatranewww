import os
import dotenv
import psycopg2

dotenv.load_dotenv(r'd:\YATRA\Yatranew\.env')
url = os.environ.get('DATABASE_URL')
conn = psycopg2.connect(url)
cur = conn.cursor()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
public_tables = [t[0] for t in cur.fetchall()]
print('Public tables in Neon:', public_tables)

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'esco_raw' ORDER BY table_name;")
esco_tables = [t[0] for t in cur.fetchall()]
print('esco_raw tables in Neon currently:', esco_tables)

cur.close()
conn.close()
