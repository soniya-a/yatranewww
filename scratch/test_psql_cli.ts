import fs from 'fs';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
const url = parsed.DATABASE_URL;

console.log('Testing psql.exe with DATABASE_URL from .env...');
try {
  const psqlPath = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
  const out = execSync(`"${psqlPath}" "${url}" -c "SELECT 1 as psql_connected;"`, {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, PGCONNECT_TIMEOUT: '8' }
  });
  console.log('psql OUTPUT:');
  console.log(out);
} catch (e: any) {
  console.log('psql FAILED with code:', e.status);
  console.log('psql stderr:', e.stderr?.toString());
}
