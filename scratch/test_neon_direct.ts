import fs from 'fs';
import { Client } from 'pg';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split(/\r?\n/);
let raw = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    raw = line.substring('DATABASE_URL='.length).trim();
  }
}
if (raw.startsWith('"') && raw.endsWith('"')) {
  raw = raw.slice(1, -1);
}

const direct = raw.replace('-pooler', '').replace('&channel_binding=require', '').replace('channel_binding=require&', '');

console.log('Testing direct endpoint...');
const client = new Client({
  connectionString: direct,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

client.connect((err) => {
  if (err) {
    console.error('Direct Connection Result:');
    console.error('Code:', err.code);
    console.error('Message:', err.message);
  } else {
    console.log('Direct Connection SUCCESS!');
    client.query('SELECT 1 as connected', (qErr, res) => {
      if (qErr) console.error('Query error:', qErr.message);
      else console.log('Query result:', res.rows);
      client.end();
    });
  }
});
