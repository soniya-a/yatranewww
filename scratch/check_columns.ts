import { queryLocalPostgres, getLocalPgPool } from '../src/lib/localPostgres';

async function main() {
  const occCols = await queryLocalPostgres("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'esco_raw' AND table_name = 'occupations_en' ORDER BY ordinal_position;");
  console.log('Occupations columns:', occCols.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
  
  const sklCols = await queryLocalPostgres("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'esco_raw' AND table_name = 'skills_en' ORDER BY ordinal_position;");
  console.log('Skills columns:', sklCols.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
  
  const relCols = await queryLocalPostgres("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'esco_raw' AND table_name = 'occupationskillrelations_en' ORDER BY ordinal_position;");
  console.log('Relations columns:', relCols.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
  
  await getLocalPgPool().end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
