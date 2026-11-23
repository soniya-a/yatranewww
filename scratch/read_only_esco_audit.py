import os
import dotenv
import psycopg2

dotenv.load_dotenv(r'd:\YATRA\Yatranew\.env')
conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

print("=" * 90)
print("YATRA ESCO FINAL DATA INTEGRITY AUDIT (READ-ONLY)")
print("=" * 90)

# -------------------------------------------------------------
# Check 1: Duplicate concepturi in occupations_en and skills_en
# -------------------------------------------------------------
print("\n--- CHECK 1: DUPLICATE CONCEPTURIS ---")

# Occupations
cur.execute("""
    SELECT concepturi, preferredlabel, count(*) as cnt
    FROM esco_raw.occupations_en
    GROUP BY concepturi, preferredlabel
    HAVING count(*) > 1
    ORDER BY cnt DESC, concepturi;
""")
occ_dups = cur.fetchall()
print(f"Occupations with duplicate concepturi: {len(occ_dups)} duplicate URI groups found")
for uri, label, cnt in occ_dups:
    print(f"  - Count: {cnt} | Label: '{label}' | URI: {uri}")

# Inspect total duplicates vs distinct
cur.execute("SELECT count(*), count(DISTINCT concepturi) FROM esco_raw.occupations_en;")
occ_tot, occ_dist = cur.fetchone()
print(f"  Total occupations: {occ_tot}, Distinct concepturi: {occ_dist}, Difference: {occ_tot - occ_dist}")

# Skills
cur.execute("""
    SELECT concepturi, preferredlabel, count(*) as cnt
    FROM esco_raw.skills_en
    GROUP BY concepturi, preferredlabel
    HAVING count(*) > 1
    ORDER BY cnt DESC, concepturi;
""")
skl_dups = cur.fetchall()
print(f"\nSkills with duplicate concepturi: {len(skl_dups)} duplicate URI groups found")
for uri, label, cnt in skl_dups:
    print(f"  - Count: {cnt} | Label: '{label}' | URI: {uri}")

cur.execute("SELECT count(*), count(DISTINCT concepturi) FROM esco_raw.skills_en;")
skl_tot, skl_dist = cur.fetchone()
print(f"  Total skills: {skl_tot}, Distinct concepturi: {skl_dist}, Difference: {skl_tot - skl_dist}")

# Verify if entire row is identical in source CSV
print("\nChecking if duplicates are exact full-row duplicates:")
cur.execute("""
    SELECT count(*) - count(DISTINCT (concepttype, concepturi, iscogroup, preferredlabel, altlabels, hiddenlabels, status, modifieddate, regulatedprofessionnote, scopenote, definition, inscheme, description, code, nacecode))
    FROM esco_raw.occupations_en;
""")
occ_exact_dups = cur.fetchone()[0]
print(f"  Occupations exact full-row duplicate rows: {occ_exact_dups}")

cur.execute("""
    SELECT count(*) - count(DISTINCT (concepttype, concepturi, skilltype, reuselevel, preferredlabel, altlabels, hiddenlabels, status, modifieddate, scopenote, definition, inscheme, description))
    FROM esco_raw.skills_en;
""")
skl_exact_dups = cur.fetchone()[0]
print(f"  Skills exact full-row duplicate rows: {skl_exact_dups}")

# -------------------------------------------------------------
# Check 2: Missing occupation URIs in occupationSkillRelations_en
# -------------------------------------------------------------
print("\n--- CHECK 2: MISSING OCCUPATION URIS (NOT EXISTS) ---")
cur.execute("""
    SELECT count(*), count(DISTINCT r.occupationuri)
    FROM esco_raw.occupationskillrelations_en r
    WHERE NOT EXISTS (
        SELECT 1 FROM esco_raw.occupations_en o 
        WHERE o.concepturi = r.occupationuri
    );
""")
miss_occ_cnt, miss_occ_dist = cur.fetchone()
print(f"Missing occupation URIs count in relations: {miss_occ_cnt} (distinct URIs: {miss_occ_dist})")

# -------------------------------------------------------------
# Check 3: Missing skill URIs in occupationSkillRelations_en
# -------------------------------------------------------------
print("\n--- CHECK 3: MISSING SKILL URIS (NOT EXISTS) ---")
cur.execute("""
    SELECT count(*), count(DISTINCT r.skilluri)
    FROM esco_raw.occupationskillrelations_en r
    WHERE NOT EXISTS (
        SELECT 1 FROM esco_raw.skills_en s 
        WHERE s.concepturi = r.skilluri
    );
""")
miss_skl_cnt, miss_skl_dist = cur.fetchone()
print(f"Missing skill URIs count in relations: {miss_skl_cnt} (distinct URIs: {miss_skl_dist})")

# -------------------------------------------------------------
# Check 4: Count distinct relationship pairs (occupationuri, skilluri)
# -------------------------------------------------------------
print("\n--- CHECK 4: DISTINCT RELATIONSHIP PAIRS ---")
cur.execute("""
    SELECT 
        count(*) as total_rows,
        count(DISTINCT (occupationuri, skilluri)) as distinct_pairs,
        count(DISTINCT (occupationuri, skilluri, relationtype)) as distinct_triplets
    FROM esco_raw.occupationskillrelations_en;
""")
tot_rel, dist_pairs, dist_triplets = cur.fetchone()
print(f"Total relation rows: {tot_rel:,}")
print(f"Distinct (occupationuri, skilluri) pairs: {dist_pairs:,}")
print(f"Distinct (occupationuri, skilluri, relationtype) triplets: {dist_triplets:,}")
print(f"Duplicate relationship pairs: {tot_rel - dist_pairs}")

# -------------------------------------------------------------
# Check 5: Check whether duplicate concept URIs cause join multiplication
# -------------------------------------------------------------
print("\n--- CHECK 5: JOIN MULTIPLICATION ROOT CAUSE ANALYSIS ---")
cur.execute("""
    SELECT count(*)
    FROM esco_raw.occupationskillrelations_en r
    JOIN esco_raw.occupations_en o ON r.occupationuri = o.concepturi
    JOIN esco_raw.skills_en s ON r.skilluri = s.concepturi;
""")
three_way_join_count = cur.fetchone()[0]

cur.execute("""
    SELECT count(*)
    FROM esco_raw.occupationskillrelations_en r
    JOIN esco_raw.occupations_en o ON r.occupationuri = o.concepturi;
""")
rel_occ_join_count = cur.fetchone()[0]

cur.execute("""
    SELECT count(*)
    FROM esco_raw.occupationskillrelations_en r
    JOIN esco_raw.skills_en s ON r.skilluri = s.concepturi;
""")
rel_skl_join_count = cur.fetchone()[0]

print(f"Relations table raw rows:                          {tot_rel:,}")
print(f"Relations joined with Occupations only:            {rel_occ_join_count:,} (difference: +{rel_occ_join_count - tot_rel})")
print(f"Relations joined with Skills only:                 {rel_skl_join_count:,} (difference: +{rel_skl_join_count - tot_rel})")
print(f"Three-way Join (Relations x Occ x Skills):         {three_way_join_count:,} (total difference: +{three_way_join_count - tot_rel})")

# Breakdown of exact rows multiplied by duplicated occupations
cur.execute("""
    SELECT o.concepturi, o.preferredlabel, count(r.skilluri) as rel_count
    FROM esco_raw.occupations_en o
    JOIN esco_raw.occupationskillrelations_en r ON o.concepturi = r.occupationuri
    WHERE o.concepturi IN (
        SELECT concepturi FROM esco_raw.occupations_en GROUP BY concepturi HAVING count(*) > 1
    )
    GROUP BY o.concepturi, o.preferredlabel;
""")
occ_mult_breakdown = cur.fetchall()
print("\nMultiplication breakdown from duplicate occupations:")
total_occ_extra = 0
for u, lab, rc in occ_mult_breakdown:
    # Since each appears 2 times, each relation is duplicated 1 extra time
    extra = rc // 2 # rc has double count because o has 2 rows
    total_occ_extra += extra
    print(f"  - Occupation '{lab}': {extra} relations x 2 rows in occupations_en -> +{extra} extra join rows")
print(f"  Total extra rows from duplicate occupations: +{total_occ_extra}")

# Breakdown of exact rows multiplied by duplicated skills
cur.execute("""
    SELECT s.concepturi, s.preferredlabel, count(r.occupationuri) as rel_count
    FROM esco_raw.skills_en s
    JOIN esco_raw.occupationskillrelations_en r ON s.concepturi = r.skilluri
    WHERE s.concepturi IN (
        SELECT concepturi FROM esco_raw.skills_en GROUP BY concepturi HAVING count(*) > 1
    )
    GROUP BY s.concepturi, s.preferredlabel;
""")
skl_mult_breakdown = cur.fetchall()
print("\nMultiplication breakdown from duplicate skills:")
total_skl_extra = 0
for u, lab, rc in skl_mult_breakdown:
    extra = rc // 2
    total_skl_extra += extra
    print(f"  - Skill '{lab}': {extra} relations x 2 rows in skills_en -> +{extra} extra join rows")
print(f"  Total extra rows from duplicate skills: +{total_skl_extra}")
print(f"Sum of occupation + skill join expansions: {total_occ_extra} + {total_skl_extra} = {total_occ_extra + total_skl_extra}")

# -------------------------------------------------------------
# Check 6: Verify essential and optional relation counts
# -------------------------------------------------------------
print("\n--- CHECK 6: ESSENTIAL & OPTIONAL RELATION COUNTS ---")
cur.execute("""
    SELECT relationtype, count(*) as cnt
    FROM esco_raw.occupationskillrelations_en
    GROUP BY relationtype
    ORDER BY cnt DESC;
""")
rel_types = cur.fetchall()
for rt, cnt in rel_types:
    print(f"  - Relation Type '{rt}': {cnt:,} rows ({cnt / tot_rel * 100:.2f}%)")

# -------------------------------------------------------------
# Check 7: Verify all 19 import-log entries and imported row counts
# -------------------------------------------------------------
print("\n--- CHECK 7: IMPORT-LOG ENTRIES AND ROW COUNTS ---")
cur.execute("""
    SELECT file_name, table_name, row_count, import_status, imported_at
    FROM esco_raw.dataset_import_log
    ORDER BY id;
""")
log_entries = cur.fetchall()
print(f"Total import log entries: {len(log_entries)}")
for le in log_entries:
    print(f"  - File: {le[0]:<35} | Table: {le[1]:<32} | Logged Count: {le[2]:<7} | Status: {le[3]}")

# -------------------------------------------------------------
# Check 8: Confirm public tables remain untouched
# -------------------------------------------------------------
print("\n--- CHECK 8: CONFIRM PUBLIC TABLES REMAIN UNTOUCHED ---")
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
""")
pub_tables = [r[0] for r in cur.fetchall()]
print(f"Public tables count: {len(pub_tables)}")
print(f"Public tables: {pub_tables}")

cur.close()
conn.close()
print("\n" + "=" * 90)
print("AUDIT EXECUTION COMPLETE")
print("=" * 90)
