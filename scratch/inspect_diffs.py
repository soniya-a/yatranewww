import os
import dotenv
import psycopg2

dotenv.load_dotenv(r'd:\YATRA\Yatranew\.env')
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

print("--- EXAMINING DUPLICATE ROWS IN OCCUPATIONS_EN ---")
cur.execute("""
    SELECT concepturi, preferredlabel, iscogroup, code, modifieddate, description
    FROM esco_raw.occupations_en
    WHERE concepturi = 'http://data.europa.eu/esco/occupation/4d27152a-a8ee-4f5a-9f93-a2fb4fb2b2e3';
""")
rows = cur.fetchall()
print(f"Occupation row 1 (desc length {len(rows[0][5])}): isco={rows[0][2]}, code={rows[0][3]}")
print(f"Occupation row 2 (desc length {len(rows[1][5])}): isco={rows[1][2]}, code={rows[1][3]}")
print(f"Are row 1 and row 2 identical? {rows[0] == rows[1]}")
if rows[0] != rows[1]:
    for col_idx in range(len(rows[0])):
        if rows[0][col_idx] != rows[1][col_idx]:
            print(f"  Col {col_idx} differs: val1={repr(rows[0][col_idx][:50])} vs val2={repr(rows[1][col_idx][:50])}")

print("\n--- EXAMINING DUPLICATE ROWS IN SKILLS_EN ---")
cur.execute("""
    SELECT concepturi, preferredlabel, skilltype, reuselevel, modifieddate, description
    FROM esco_raw.skills_en
    WHERE concepturi = 'http://data.europa.eu/esco/skill/598de5b0-5b58-4ea7-8058-a4bc4d18c742';
""")
s_rows = cur.fetchall()
print(f"Skill 'SQL' row 1: reuselevel={s_rows[0][3]}, desc length={len(s_rows[0][5])}")
print(f"Skill 'SQL' row 2: reuselevel={s_rows[1][3]}, desc length={len(s_rows[1][5])}")
print(f"Are skill row 1 and row 2 identical? {s_rows[0] == s_rows[1]}")
if s_rows[0] != s_rows[1]:
    for col_idx in range(len(s_rows[0])):
        if s_rows[0][col_idx] != s_rows[1][col_idx]:
            print(f"  Col {col_idx} differs: val1={repr(s_rows[0][col_idx][:50])} vs val2={repr(s_rows[1][col_idx][:50])}")

cur.close()
conn.close()
