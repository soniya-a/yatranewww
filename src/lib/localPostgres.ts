import 'dotenv/config';
import net from 'net';
import pg, { type Pool as PgPool, type PoolConfig, type QueryResult, type PoolClient } from 'pg';
const { Pool, Client } = pg;

/**
 * Server-only PostgreSQL Connection Module for YATRA.
 * Exclusively runs in Node.js / Express backend.
 * Connects to PostgreSQL (Neon or local) accessing the esco_raw schema.
 * Credentials are NEVER exposed to the frontend.
 */

/**
 * Custom PostgreSQL Client forcing IPv4 socket family.
 * Prevents Windows dual-stack IPv6 handshake timeouts to Neon endpoints.
 */
class IPv4PgClient extends Client {
  constructor(config?: any) {
    super(config);
    const conn = (this as any).connection;
    if (conn) {
      const origConnect = conn.connect.bind(conn);
      conn.connect = (port: number, host: string) => {
        conn.stream = new net.Socket();
        const origStreamConnect = conn.stream.connect.bind(conn.stream);
        conn.stream.connect = (opt: any, cb: any) => {
          if (typeof opt === 'object') {
            opt.family = 4;
            return origStreamConnect(opt, cb);
          }
          return origStreamConnect({ port: opt, host: cb, family: 4 });
        };
        return origConnect(port, host);
      };
    }
  }
}

interface ParsedDbConfig {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  connectionString?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  Client?: any;
}

function parsePostgresConfig(rawUrl?: string): ParsedDbConfig | null {
  const url = rawUrl || process.env.DATABASE_URL;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const isNeonOrSsl = trimmed.includes('sslmode=require') || trimmed.includes('neon.tech');
  const sslConfig = isNeonOrSsl ? { rejectUnauthorized: false } : undefined;

  // For Neon or cloud SSL URLs, pass connectionString directly so pg handles SNI and pooler parameters correctly
  if (isNeonOrSsl) {
    return {
      connectionString: trimmed,
      ssl: sslConfig,
      Client: IPv4PgClient
    };
  }

  // Pattern matches: postgresql://username:password@hostname:port/database?params
  // Gracefully handles raw local passwords containing '@' like '0410@'
  const match = trimmed.match(/^postgresql:\/\/([^:]+):(.*)@([^@\/:?]+)(?::(\d+))?\/([^?]+)/);
  if (match) {
    const [_, user, password, host, port, database] = match;
    return {
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
      ssl: sslConfig
    };
  }

  // Standard connectionString fallback
  return { 
    connectionString: trimmed,
    ssl: sslConfig 
  };
}

let poolInstance: PgPool | null = null;

export function getLocalPgPool(): PgPool {
  if (!poolInstance) {
    const config = parsePostgresConfig();
    if (!config) {
      throw new Error('DATABASE_URL is not configured in backend environment.');
    }

    const isNeonPooler = Boolean(
      config.connectionString && config.connectionString.includes('-pooler')
    );

    const poolConfig: PoolConfig = {
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      // Neon connection pooler (PgBouncer) rejects custom startup -c options
      ...(isNeonPooler ? {} : { options: '-c search_path=esco_raw,public' })
    };

    poolInstance = new Pool(poolConfig);

    poolInstance.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected client error:', err.message);
    });
  }

  return poolInstance;
}

export const isLocalPostgresConfigured = (): boolean => {
  const config = parsePostgresConfig();
  return Boolean(config && (config.database || config.connectionString));
};

/**
 * Safe query executor wrapper
 */
export async function queryLocalPostgres<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getLocalPgPool();
  return pool.query<T>(text, params);
}

/**
 * Basic database health check that executes SELECT 1.
 * Returns only connection status.
 */
export async function checkDbHealth(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!isLocalPostgresConfigured()) {
    return { connected: false, error: 'DATABASE_URL not configured' };
  }
  const t0 = Date.now();
  let client: PoolClient | null = null;
  try {
    const pool = getLocalPgPool();
    client = await pool.connect();
    await client.query('SELECT 1;');
    return {
      connected: true,
      latencyMs: Date.now() - t0
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || String(err)
    };
  } finally {
    if (client) client.release();
  }
}

/**
 * Diagnostic connection check & table verification
 */
export async function testLocalPostgresConnection(): Promise<{
  success: boolean;
  database?: string;
  user?: string;
  schema?: string;
  tablesCount?: number;
  occupationsCount?: number;
  skillsCount?: number;
  relationsCount?: number;
  sampleOccupation?: string;
  sampleSkill?: string;
  error?: string;
}> {
  if (!isLocalPostgresConfigured()) {
    return { success: false, error: 'DATABASE_URL not configured in environment' };
  }

  let client: PoolClient | null = null;
  try {
    const pool = getLocalPgPool();
    client = await pool.connect();

    const dbInfo = await client.query(`
      SELECT current_database() as db, current_user as usr, current_schema() as sch;
    `);

    const tablesResult = await client.query(`
      SELECT count(*)::int as count 
      FROM information_schema.tables 
      WHERE table_schema = 'esco_raw';
    `);

    const tablesCount = tablesResult.rows[0]?.count || 0;
    let occupationsCount = 0;
    let skillsCount = 0;
    let relationsCount = 0;
    let sampleOccupation: string | undefined;
    let sampleSkill: string | undefined;

    if (tablesCount > 0) {
      try {
        const occResult = await client.query(`SELECT count(*)::int as count FROM esco_raw.occupations_en;`);
        occupationsCount = occResult.rows[0]?.count || 0;
        const skillsResult = await client.query(`SELECT count(*)::int as count FROM esco_raw.skills_en;`);
        skillsCount = skillsResult.rows[0]?.count || 0;
        const relResult = await client.query(`SELECT count(*)::int as count FROM esco_raw.occupationskillrelations_en;`);
        relationsCount = relResult.rows[0]?.count || 0;
        const sampleOcc = await client.query(`SELECT preferredlabel FROM esco_raw.occupations_en LIMIT 1;`);
        sampleOccupation = sampleOcc.rows[0]?.preferredlabel;
        const sampleSkl = await client.query(`SELECT preferredlabel FROM esco_raw.skills_en LIMIT 1;`);
        sampleSkill = sampleSkl.rows[0]?.preferredlabel;
      } catch (err: any) {
        console.warn('[Postgres Diagnostic] Table detail lookup warning:', err.message);
      }
    }

    return {
      success: true,
      database: dbInfo.rows[0]?.db,
      user: dbInfo.rows[0]?.usr,
      schema: dbInfo.rows[0]?.sch,
      tablesCount,
      occupationsCount,
      skillsCount,
      relationsCount,
      sampleOccupation,
      sampleSkill
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err)
    };
  } finally {
    if (client) client.release();
  }
}
