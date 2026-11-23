import 'dotenv/config';
import { Pool } from 'pg';

async function testNeon() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.log('DATABASE_URL is MISSING');
    process.exit(1);
  }

  const url = new URL(rawUrl);
  const host = url.hostname;
  const db = url.pathname.replace(/^\//, '');

  console.log(`Connecting to Neon (${host}, db: ${db}) with 15s timeout...`);
  const pool = new Pool({
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    const client = await pool.connect();
    console.log('Connection: SUCCESS');
    const verRes = await client.query('SELECT version();');
    console.log('PostgreSQL Version:', verRes.rows[0]?.version);

    const schemaRes = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast');");
    console.log('Existing Schemas:', schemaRes.rows.map(r => r.schema_name));

    const tableRes = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema');");
    console.log(`Existing Tables Count: ${tableRes.rows.length}`);
    if (tableRes.rows.length > 0) {
      console.log('Tables:', tableRes.rows.map(r => `${r.table_schema}.${r.table_name}`));
    }

    client.release();
  } catch (err: any) {
    console.error('Connection test error:', err.message);
  } finally {
    await pool.end();
  }
}

testNeon();
