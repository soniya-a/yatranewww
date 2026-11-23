import { testLocalPostgresConnection, getLocalPgPool } from '../src/lib/localPostgres';

async function main() {
  const res = await testLocalPostgresConnection();
  console.log('Postgres Diagnostic Result:', JSON.stringify(res, null, 2));
  try {
    await getLocalPgPool().end();
  } catch (_) {}
  process.exit(res.success ? 0 : 1);
}

main();
