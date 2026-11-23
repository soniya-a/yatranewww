import fs from 'fs';
import dotenv from 'dotenv';
import { Client } from 'pg';

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
// Use direct host from pgAdmin instead of -pooler
const rawUrl = parsed.DATABASE_URL;
const directUrl = rawUrl.replace('-pooler', '');

console.log('Testing pg.Client to Neon with direct URL...');
const client = new Client({
  connectionString: directUrl,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000
});

client.connect((err) => {
  if (err) {
    console.error('Connection failed:', err.message);
    console.error('Error code:', err.code);
  } else {
    console.log('SUCCESS! Connected to Neon!');
    client.query('SELECT 1 as connected', (qErr, res) => {
      if (qErr) {
        console.error('Query failed:', qErr.message);
      } else {
        console.log('SELECT 1 result:', res.rows);
      }
      client.end();
    });
  }
});
