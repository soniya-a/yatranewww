import {
  getEscoStatus,
  getOccupations,
  getOccupationByUri,
  getSkills,
  getSkillByUri,
  getOccupationSkillRelations
} from '../src/lib/escoService';
import { getLocalPgPool } from '../src/lib/localPostgres';

async function runTests() {
  console.log('--- 1. Testing getEscoStatus() ---');
  const status = await getEscoStatus();
  console.log('Status Result:', JSON.stringify(status, null, 2));
  if (!status.connected) throw new Error('Postgres not connected');

  console.log('\n--- 2. Testing getOccupations() ---');
  const occ1 = await getOccupations({ page: 1, limit: 5 });
  console.log(`Found ${occ1.total} occupations. Page 1 data count: ${occ1.data.length}. First: "${occ1.data[0]?.preferredlabel}"`);

  console.log('\n--- 3. Testing getOccupations() with search "software" ---');
  const occSearch = await getOccupations({ search: 'software', page: 1, limit: 5 });
  console.log(`Found ${occSearch.total} matching "software". First match: "${occSearch.data[0]?.preferredlabel}"`);

  console.log('\n--- 4. Testing getOccupationByUri() ---');
  const testUri = occSearch.data[0]?.concepturi;
  console.log(`Testing URI: ${testUri}`);
  const occDetail = await getOccupationByUri(testUri, true);
  console.log(`Occupation: "${occDetail.occupation?.preferredlabel}", Related skills count: ${occDetail.skills?.length}`);
  if (occDetail.skills && occDetail.skills.length > 0) {
    console.log(`Sample skill: "${occDetail.skills[0].skilllabel}" (${occDetail.skills[0].relationtype})`);
  }

  console.log('\n--- 5. Testing getSkills() ---');
  const skl1 = await getSkills({ page: 1, limit: 5 });
  console.log(`Found ${skl1.total} skills. Page 1 data count: ${skl1.data.length}. First: "${skl1.data[0]?.preferredlabel}"`);

  console.log('\n--- 6. Testing getSkills() with search "python" ---');
  const sklSearch = await getSkills({ search: 'python', page: 1, limit: 5 });
  console.log(`Found ${sklSearch.total} matching "python". First match: "${sklSearch.data[0]?.preferredlabel}"`);

  console.log('\n--- 7. Testing getSkillByUri() ---');
  const testSkillUri = sklSearch.data[0]?.concepturi;
  console.log(`Testing Skill URI: ${testSkillUri}`);
  const sklDetail = await getSkillByUri(testSkillUri, true);
  console.log(`Skill: "${sklDetail.skill?.preferredlabel}", Related occupations count: ${sklDetail.relatedOccupations?.length}`);

  console.log('\n--- 8. Testing getOccupationSkillRelations() ---');
  const rel1 = await getOccupationSkillRelations({ page: 1, limit: 5 });
  console.log(`Total relations: ${rel1.total}. Sample relation: "${rel1.data[0]?.occupationlabel}" -> "${rel1.data[0]?.skilllabel}"`);

  console.log('\n--- 9. Testing getOccupationSkillRelations() filtered by relationType="essential" ---');
  const relEssential = await getOccupationSkillRelations({ relationType: 'essential', page: 1, limit: 5 });
  console.log(`Total essential relations: ${relEssential.total}. Sample: "${relEssential.data[0]?.occupationlabel}" -> "${relEssential.data[0]?.skilllabel}"`);

  await getLocalPgPool().end();
  console.log('\nALL ESCO SERVICE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
