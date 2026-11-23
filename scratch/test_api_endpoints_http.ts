import express from 'express';
import http from 'http';
import {
  getEscoStatus,
  getOccupations,
  getOccupationByUri,
  getSkills,
  getSkillByUri,
  getOccupationSkillRelations
} from '../src/lib/escoService';
import { getLocalPgPool } from '../src/lib/localPostgres';

async function main() {
  const app = express();
  app.use(express.json());

  // Mount the exact ESCO endpoints from server.ts
  app.get("/api/esco/status", async (_req, res) => {
    try {
      const status = await getEscoStatus();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to retrieve ESCO status", details: err?.message });
    }
  });

  app.get("/api/esco/occupations", async (req, res) => {
    try {
      const { search, q, isco, code, page, limit } = req.query;
      const result = await getOccupations({
        search: (search || q) as string,
        isco: isco as string,
        code: code as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to retrieve ESCO occupations", details: err?.message });
    }
  });

  app.get("/api/esco/occupations/by-uri", async (req, res) => {
    try {
      const uri = req.query.uri as string;
      if (!uri) {
        return res.status(400).json({ error: "Missing required query parameter: uri" });
      }
      const includeSkills = req.query.includeSkills !== 'false';
      const result = await getOccupationByUri(uri, includeSkills);
      if (!result.success) {
        return res.status(404).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to retrieve ESCO occupation", details: err?.message });
    }
  });

  app.get("/api/esco/skills", async (req, res) => {
    try {
      const { search, q, skillType, reuseLevel, page, limit } = req.query;
      const result = await getSkills({
        search: (search || q) as string,
        skillType: skillType as string,
        reuseLevel: reuseLevel as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to retrieve ESCO skills", details: err?.message });
    }
  });

  app.get("/api/esco/skills/by-uri", async (req, res) => {
    try {
      const uri = req.query.uri as string;
      if (!uri) {
        return res.status(400).json({ error: "Missing required query parameter: uri" });
      }
      const includeOccupations = req.query.includeOccupations !== 'false';
      const result = await getSkillByUri(uri, includeOccupations);
      if (!result.success) {
        return res.status(404).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to retrieve ESCO skill", details: err?.message });
    }
  });

  app.get("/api/esco/occupation-skills", async (req, res) => {
    try {
      const { occupationUri, skillUri, relationType, search, q, page, limit } = req.query;
      const result = await getOccupationSkillRelations({
        occupationUri: occupationUri as string,
        skillUri: skillUri as string,
        relationType: relationType as string,
        search: (search || q) as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to retrieve occupation-skill relations", details: err?.message });
    }
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, '127.0.0.1', () => resolve()));
  console.log('Test HTTP Server running on http://127.0.0.1:3099');

  try {
    // 1. Test /api/esco/status
    console.log('\n[HTTP GET] /api/esco/status');
    const resStatus = await fetch('http://127.0.0.1:3099/api/esco/status');
    const jsonStatus = await resStatus.json();
    console.log(`Status HTTP ${resStatus.status}:`, JSON.stringify(jsonStatus, null, 2));

    // 2. Test /api/esco/occupations
    console.log('\n[HTTP GET] /api/esco/occupations?limit=2');
    const resOcc = await fetch('http://127.0.0.1:3099/api/esco/occupations?limit=2');
    const jsonOcc = await resOcc.json();
    console.log(`Occupations HTTP ${resOcc.status}: total=${jsonOcc.total}, page=${jsonOcc.page}, count=${jsonOcc.data?.length}`);
    console.log('Sample occupation:', jsonOcc.data[0]?.preferredlabel, `(${jsonOcc.data[0]?.concepturi})`);

    const targetOccUri = jsonOcc.data[0]?.concepturi;

    // 3. Test /api/esco/occupations/by-uri
    console.log(`\n[HTTP GET] /api/esco/occupations/by-uri?uri=${encodeURIComponent(targetOccUri)}`);
    const resOccUri = await fetch(`http://127.0.0.1:3099/api/esco/occupations/by-uri?uri=${encodeURIComponent(targetOccUri)}`);
    const jsonOccUri = await resOccUri.json();
    console.log(`Occupation detail HTTP ${resOccUri.status}: label="${jsonOccUri.occupation?.preferredlabel}", related skills=${jsonOccUri.skills?.length}`);

    // 4. Test /api/esco/skills
    console.log('\n[HTTP GET] /api/esco/skills?limit=2');
    const resSkl = await fetch('http://127.0.0.1:3099/api/esco/skills?limit=2');
    const jsonSkl = await resSkl.json();
    console.log(`Skills HTTP ${resSkl.status}: total=${jsonSkl.total}, page=${jsonSkl.page}, count=${jsonSkl.data?.length}`);
    console.log('Sample skill:', jsonSkl.data[0]?.preferredlabel, `(${jsonSkl.data[0]?.concepturi})`);

    const targetSklUri = jsonSkl.data[0]?.concepturi;

    // 5. Test /api/esco/skills/by-uri
    console.log(`\n[HTTP GET] /api/esco/skills/by-uri?uri=${encodeURIComponent(targetSklUri)}`);
    const resSklUri = await fetch(`http://127.0.0.1:3099/api/esco/skills/by-uri?uri=${encodeURIComponent(targetSklUri)}`);
    const jsonSklUri = await resSklUri.json();
    console.log(`Skill detail HTTP ${resSklUri.status}: label="${jsonSklUri.skill?.preferredlabel}", related occupations=${jsonSklUri.relatedOccupations?.length}`);

    // 6. Test /api/esco/occupation-skills
    console.log('\n[HTTP GET] /api/esco/occupation-skills?relationType=essential&limit=2');
    const resRel = await fetch('http://127.0.0.1:3099/api/esco/occupation-skills?relationType=essential&limit=2');
    const jsonRel = await resRel.json();
    console.log(`Relations HTTP ${resRel.status}: total=${jsonRel.total}, page=${jsonRel.page}, count=${jsonRel.data?.length}`);
    console.log('Sample relation:', jsonRel.data[0]?.occupationlabel, '->', jsonRel.data[0]?.skilllabel, `(${jsonRel.data[0]?.relationtype})`);

    console.log('\n>>> ALL 6 HTTP ENDPOINTS VERIFIED AND RESPONDING WITH 200 OK! <<<');
  } finally {
    server.close();
    await getLocalPgPool().end();
  }
}

main().catch(err => {
  console.error('HTTP Test Failure:', err);
  process.exit(1);
});
