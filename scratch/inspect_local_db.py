import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, dbname='yatra_db', user='yatra_app', password='0410@')
cur = conn.cursor()

# List schemas
cur.execute("SELECT schema_name FROM information_schema.schemata;")
print("Schemas:", [r[0] for r in cur.fetchall()])

# List tables in esco_raw
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'esco_raw'
    ORDER BY table_name;
""")
tables = [r[0] for r in cur.fetchall()]
print(f"\nTables in esco_raw ({len(tables)} tables):")
for t in tables:
    cur.execute(f'SELECT count(*) FROM "esco_raw"."{t}";')
    cnt = cur.fetchone()[0]
    print(f"  - {t}: {cnt:,} rows")

# Detailed check of required 3 tables
for t in ['occupations_en', 'skills_en', 'occupationskillrelations_en']:
    print(f"\n=== Table structure: esco_raw.{t} ===")
    cur.execute(f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'esco_raw' AND table_name = '{t}'
        ORDER BY ordinal_position;
    """)
    cols = cur.fetchall()
    for col in cols:
        print(f"  {col[0]} ({col[1]}, nullable: {col[2]})")
    
    cur.execute(f'SELECT * FROM "esco_raw"."{t}" LIMIT 2;')
    rows = cur.fetchall()
    print(f"Sample row (first): {rows[0] if rows else 'EMPTY'}")

conn.close()
