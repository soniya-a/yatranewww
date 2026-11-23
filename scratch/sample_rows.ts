import { queryLocalPostgres, getLocalPgPool } from '../src/lib/localPostgres';

async function main() {
  const occ = await queryLocalPostgres("SELECT concepturi, preferredlabel, iscogroup, code FROM esco_raw.occupations_en LIMIT 3;");
  console.log('Occupations sample:', JSON.stringify(occ.rows, null, 2));

  const skl = await queryLocalPostgres("SELECT concepturi, preferredlabel, skilltype, reuselevel FROM esco_raw.skills_en LIMIT 3;");
  console.log('Skills sample:', JSON.stringify(skl.rows, null, 2));

  const rel = await queryLocalPostgres("SELECT occupationlabel, relationtype, skilltype, skilllabel FROM esco_raw.occupationskillrelations_en LIMIT 3;");
  console.log('Relations sample:', JSON.stringify(rel.rows, null, 2));

  await getLocalPgPool().end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
