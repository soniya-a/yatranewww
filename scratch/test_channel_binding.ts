import 'dotenv/config';
import { Pool } from 'pg';

async function testChannelBinding() {
  const rawUrl = process.env.DATABASE_URL || '';
  
  // 1. With channel_binding
  console.log('--- Test 1: Full URL with channel_binding ---');
  try {
    const pool1 = new Pool({
      connectionString: rawUrl,
      ssl: { rejectUnauthorized: false }
    });
    const c1 = await pool1.connect();
    console.log('Result 1: SUCCESS');
    c1.release();
    await pool1.end();
  } catch (err: any) {
    console.log('Result 1 Error:', err.message);
  }

  // 2. Without channel_binding
  console.log('\n--- Test 2: URL with channel_binding stripped ---');
  try {
    const strippedUrl = rawUrl.replace('&channel_binding=require', '').replace('channel_binding=require&', '').replace('channel_binding=require', '');
    const pool2 = new Pool({
      connectionString: strippedUrl,
      ssl: { rejectUnauthorized: false }
    });
    const c2 = await pool2.connect();
    console.log('Result 2: SUCCESS');
    const ver = await c2.query('SELECT version();');
    console.log('Postgres Version:', ver.rows[0]?.version);
    c2.release();
    await pool2.end();
  } catch (err: any) {
    console.log('Result 2 Error:', err.message);
  }
}

testChannelBinding();
