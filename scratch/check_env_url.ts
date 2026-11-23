import fs from 'fs';

const lines = fs.readFileSync('.env', 'utf-8').split('\n');
lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL')) {
    const eqIdx = trimmed.indexOf('=');
    const val = trimmed.slice(eqIdx + 1).trim();
    console.log(`Line ${idx + 1}: length=${val.length}, startsWith=${val.substring(0, 16)}..., endsWith=...${val.substring(val.length - 16)}`);
    try {
      const u = new URL(val);
      console.log(`URL parse: protocol=${u.protocol}, user=${u.username}, host=${u.hostname}, db=${u.pathname}, search=${u.search}`);
    } catch (e: any) {
      console.log(`URL parse error: ${e.message}`);
    }
  }
});
