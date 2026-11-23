import { queryLocalPostgres, getLocalPgPool } from '../src/lib/localPostgres';

async function main() {
  const indexes = await queryLocalPostgres(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'esco_raw' 
    ORDER BY tablename, indexname;
  `);
  console.log('Indexes in esco_raw:', JSON.stringify(indexes.rows, null, 2));

  await getLocalPgPool().end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
