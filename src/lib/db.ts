import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";

dotenv.config();

export const isPostgresConfigured = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ""
);

// Create a singleton PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Error]", err);
});

/**
 * Checks if the PostgreSQL database is reachable.
 */
export async function testDbConnection(): Promise<boolean> {
  if (!isPostgresConfigured) return false;
  try {
    const res = await pool.query("SELECT NOW()");
    return !!res.rows[0];
  } catch (err) {
    console.warn("[PostgreSQL] Connection check failed:", err);
    return false;
  }
}

/**
 * Searches occupations from the ESCO dataset matching a role or keyword.
 */
export async function searchEscoOccupations(query: string, limit = 5) {
  if (!isPostgresConfigured) return [];
  const searchTerm = `%${query.trim().toLowerCase()}%`;
  const sql = `
    SELECT 
      concept_uri,
      isco_group,
      preferred_label,
      alt_labels,
      description
    FROM esco_occupations
    WHERE LOWER(preferred_label) LIKE $1 
       OR LOWER(alt_labels) LIKE $1
    ORDER BY 
      CASE WHEN LOWER(preferred_label) = LOWER($2) THEN 1
           WHEN LOWER(preferred_label) LIKE $3 THEN 2
           ELSE 3 END,
      LENGTH(preferred_label) ASC
    LIMIT $4;
  `;
  const res = await pool.query(sql, [searchTerm, query.trim(), `${query.trim().toLowerCase()}%`, limit]);
  return res.rows;
}

/**
 * Retrieves essential and optional skills for a given occupation title or URI from ESCO.
 */
export async function getSkillsForOccupation(occupationTitleOrUri: string, limit = 15) {
  if (!isPostgresConfigured) return [];
  const sql = `
    SELECT DISTINCT ON (LOWER(skill_label))
      skill_label,
      relation_type,
      skill_type,
      skill_uri
    FROM esco_occupation_skills
    WHERE LOWER(occupation_label) LIKE $1
       OR occupation_uri = $2
    ORDER BY 
      LOWER(skill_label) ASC,
      CASE WHEN relation_type = 'essential' THEN 1 ELSE 2 END
    LIMIT $3;
  `;
  const res = await pool.query(sql, [
    `%${occupationTitleOrUri.trim().toLowerCase()}%`,
    occupationTitleOrUri.trim(),
    limit
  ]);
  return res.rows;
}
