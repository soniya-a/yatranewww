import { queryLocalPostgres, getLocalPgPool } from '../src/lib/localPostgres';

async function main() {
  const t0 = Date.now();
  const res = await queryLocalPostgres(`
    SELECT * FROM esco_raw.occupationskillrelations_en 
    WHERE occupationuri = 'http://data.europa.eu/esco/occupation/00030d09-2b3a-4efd-87cc-c4ea39d27c34';
  `);
  const elapsed = Date.now() - t0;
  console.log(`Found ${res.rowCount} rows in ${elapsed}ms`);

  await getLocalPgPool().end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
