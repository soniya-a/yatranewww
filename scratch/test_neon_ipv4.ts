import fs from 'fs';
import dotenv from 'dotenv';
import dns from 'dns';
import { Pool } from 'pg';

// Set DNS lookup default to IPv4 first
dns.setDefaultResultOrder('ipv4first');

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
const connStr = parsed.DATABASE_URL;

console.log('Testing pg.Pool with dns.setDefaultResultOrder(ipv4first)...');
console.log('Using connection string from line 11 (without changing passwords or removing credentials)');

const pool = new Pool({
  connectionString: connStr,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
});

async function main() {
  try {
    const res = await pool.query('SELECT 1 as connected, current_database() as db, current_user as usr, current_schema() as sch;');
    console.log('QUERY SUCCESSFUL!');
    console.log('Result rows:', res.rows);

    // Verify dataset_import_log and schema esco_raw as seen in pgAdmin
    const tables = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'esco_raw' OR table_name = 'dataset_import_log';
    `);
    console.log('Found tables in Neon:', tables.rows);
  } catch (err: any) {
    console.error('Query failed:');
    console.error('Code:', err.code);
    console.error('Routine:', err.routine);
    console.error('Message:', err.message);
  } finally {
    await pool.end();
  }
}

main();
