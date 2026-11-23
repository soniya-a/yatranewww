import { getLocalPgPool, checkDbHealth } from '../src/lib/localPostgres.js';

async function test() {
  console.log('Testing checkDbHealth()...');
  const health = await checkDbHealth();
  console.log('Health result:', health);

  const pool = getLocalPgPool();
  console.log('Testing pool.query SELECT 1...');
  const res = await pool.query('SELECT 1 as connected, current_database() as db, current_user as usr;');
  console.log('Query result rows:', res.rows);

  const tables = await pool.query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'esco_raw' OR table_name = 'dataset_import_log';"
  );
  console.log('Neon Tables query result:', tables.rows);
}

test()
  .catch((err) => console.error('Test error:', err))
  .finally(() => process.exit(0));
