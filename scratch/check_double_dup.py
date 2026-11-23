import os
import dotenv
import psycopg2

dotenv.load_dotenv(r'd:\YATRA\Yatranew\.env')
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# Find the cross-product where an occupation with 2 rows AND a skill with 2 rows meet in the same relation!
cur.execute("""
    SELECT 
        r.occupationuri, o.preferredlabel,
        r.skilluri, s.preferredlabel,
        count(*) as join_occurrences
    FROM esco_raw.occupationskillrelations_en r
    JOIN esco_raw.occupations_en o ON r.occupationuri = o.concepturi
    JOIN esco_raw.skills_en s ON r.skilluri = s.concepturi
    WHERE r.occupationuri IN (
        SELECT concepturi FROM esco_raw.occupations_en GROUP BY concepturi HAVING count(*) > 1
    )
    AND r.skilluri IN (
        SELECT concepturi FROM esco_raw.skills_en GROUP BY concepturi HAVING count(*) > 1
    )
    GROUP BY r.occupationuri, o.preferredlabel, r.skilluri, s.preferredlabel;
""")
double_dups = cur.fetchall()
print("Relations where BOTH occupation AND skill have duplicate concepturi in their respective tables:")
print(f"Count: {len(double_dups)}")
for row in double_dups:
    print(f"Occupation '{row[1]}' x Skill '{row[3]}' -> {row[4]} rows generated from 1 relationship record!")

cur.close()
conn.close()
