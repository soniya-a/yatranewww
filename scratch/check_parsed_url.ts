import fs from 'fs';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
const raw = parsed.DATABASE_URL || '';
console.log('Parsed DATABASE_URL stats:');
console.log('length:', raw.length);
console.log('starts with quote:', raw.startsWith('"') || raw.startsWith("'"));
console.log('ends with quote:', raw.endsWith('"') || raw.endsWith("'"));
console.log('search params:', raw.includes('?') ? raw.split('?')[1] : 'none');

try {
  const u = new URL(raw);
  console.log('URL parse: host =', u.host, ', user =', u.username, ', db =', u.pathname);
} catch (e: any) {
  console.log('URL parse failed:', e.message);
}
