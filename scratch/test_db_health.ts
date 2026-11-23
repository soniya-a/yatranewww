import express from 'express';
import http from 'http';
import { checkDbHealth, getLocalPgPool, testLocalPostgresConnection } from '../src/lib/localPostgres';

async function main() {
  console.log('--- 1. Testing checkDbHealth() directly ---');
  const healthDirect = await checkDbHealth();
  console.log('checkDbHealth() result:', JSON.stringify(healthDirect, null, 2));

  console.log('\n--- 2. Testing HTTP endpoint GET /api/health/db ---');
  const app = express();
  app.get('/api/health/db', async (_req, res) => {
    try {
      const health = await checkDbHealth();
      if (health.connected) {
        return res.json({ status: 'connected' });
      } else {
        return res.status(503).json({ status: 'disconnected' });
      }
    } catch {
      return res.status(500).json({ status: 'disconnected' });
    }
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3098, '127.0.0.1', () => resolve()));
  console.log('HTTP Test Server listening on http://127.0.0.1:3098');

  try {
    const res = await fetch('http://127.0.0.1:3098/api/health/db');
    const json = await res.json();
    console.log(`Endpoint HTTP Status: ${res.status}`);
    console.log(`Endpoint Response Body:`, JSON.stringify(json, null, 2));

    console.log('\n--- 3. Testing testLocalPostgresConnection() ---');
    const diag = await testLocalPostgresConnection();
    console.log('Diagnostic Result:', JSON.stringify(diag, null, 2));
  } finally {
    server.close();
    await getLocalPgPool().end();
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
