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

// Strip channel_binding if present
const fixed = raw.replace('&channel_binding=require', '').replace('channel_binding=require&', '');

console.log('Testing connection string...');
console.log('Parameters after strip:', fixed.split('?')[1]);

const client = new Client({
  connectionString: fixed,
  ssl: { rejectUnauthorized: false }
});

client.connect((err) => {
  if (err) {
    console.error('PostgreSQL Connection Result:');
    console.error('Code:', err.code);
    console.error('Name:', err.name);
    console.error('Message:', err.message);
  } else {
    console.log('PostgreSQL Connection SUCCESS!');
    client.query('SELECT 1 as connected', (qErr, res) => {
      if (qErr) {
        console.error('Query error:', qErr.message);
      } else {
        console.log('Query result:', res.rows);
      }
      client.end();
    });
  }
});
