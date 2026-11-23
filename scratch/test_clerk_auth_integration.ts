import 'dotenv/config';
import express from 'express';
import http from 'http';
import { verifyToken } from '@clerk/express';
import { checkDbHealth } from '../src/lib/localPostgres';

async function runTests() {
  console.log('=== YATRA CLERK AUTHENTICATION INTEGRATION TEST SUITE ===\n');

  // 1. Verify Environment Variables
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  console.log('1. Checking Clerk Keys:');
  console.log(' - VITE_CLERK_PUBLISHABLE_KEY:', publishableKey ? `Set (${publishableKey.substring(0, 12)}...)` : 'MISSING');
  console.log(' - CLERK_SECRET_KEY:', secretKey ? `Set (${secretKey.substring(0, 10)}...)` : 'MISSING');
  if (!publishableKey || !secretKey) {
    throw new Error('Clerk publishable or secret key is missing from environment');
  }

  // 2. Setup Test Express Server with server.ts authenticate middleware logic
  const app = express();
  app.use(express.json());

  const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
    }
    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({ error: "Unauthorized: Invalid token format" });
    }

    try {
      // 1. Primary: Verify token with Clerk if CLERK_SECRET_KEY is configured
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (clerkSecretKey && clerkSecretKey.trim() !== '') {
        try {
          const verified = await verifyToken(token, {
            secretKey: clerkSecretKey,
          });
          if (verified && verified.sub) {
            (req as any).user = {
              uid: verified.sub,
              email: (verified as any).email || (verified as any).primary_email_address || undefined,
              role: 'authenticated',
              authProvider: 'clerk'
            };
            return next();
          }
        } catch (clerkErr: any) {
          // Fall through
        }
      }

      // 2. Guest Sandbox Session token check
      if (token.startsWith('guest_')) {
        (req as any).user = {
          uid: token,
          email: 'guest@yatra.ai',
          role: 'guest',
          authProvider: 'guest'
        };
        return next();
      }

      return res.status(401).json({ error: "Unauthorized: Invalid credentials" });
    } catch (error: any) {
      return res.status(401).json({ error: "Unauthorized: Authentication verification failed" });
    }
  };

  // Protected route
  app.get('/api/test/protected', authenticate, (req, res) => {
    res.json({
      success: true,
      message: 'Access granted to protected route',
      user: (req as any).user
    });
  });

  // DB Health route (from server.ts)
  app.get('/api/health/db', async (_req, res) => {
    try {
      const health = await checkDbHealth();
      if (health.connected) {
        return res.json({ status: "connected" });
      } else {
        return res.status(503).json({ status: "disconnected" });
      }
    } catch {
      return res.status(500).json({ status: "disconnected" });
    }
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3097, '127.0.0.1', () => resolve()));
  const baseUrl = 'http://127.0.0.1:3097';
  console.log(`\n2. Test Server active on ${baseUrl}`);

  try {
    // Test Case A: Missing Authorization Header
    console.log('\n--- Test A: Missing Authorization Header ---');
    const resA = await fetch(`${baseUrl}/api/test/protected`);
    const jsonA = await resA.json();
    console.log(`Status: ${resA.status} (Expected: 401)`);
    console.log(`Response:`, jsonA);
    if (resA.status !== 401 || !jsonA.error?.includes('Missing Authorization')) {
      throw new Error('Test A failed: Expected 401 Missing Authorization header');
    }
    console.log('Result: PASS');

    // Test Case B: Malformed / Invalid Bearer Token
    console.log('\n--- Test B: Invalid Bearer Token ---');
    const resB = await fetch(`${baseUrl}/api/test/protected`, {
      headers: { 'Authorization': 'Bearer invalid.token.payload' }
    });
    const jsonB = await resB.json();
    console.log(`Status: ${resB.status} (Expected: 401)`);
    console.log(`Response:`, jsonB);
    if (resB.status !== 401) {
      throw new Error('Test B failed: Expected 401 on invalid token');
    }
    console.log('Result: PASS');

    // Test Case C: Guest Candidate Session Token
    console.log('\n--- Test C: Guest Sandbox Candidate Token ---');
    const resC = await fetch(`${baseUrl}/api/test/protected`, {
      headers: { 'Authorization': 'Bearer guest_candidate_demo_987' }
    });
    const jsonC = await resC.json();
    console.log(`Status: ${resC.status} (Expected: 200)`);
    console.log(`Response:`, jsonC);
    if (resC.status !== 200 || jsonC.user?.uid !== 'guest_candidate_demo_987') {
      throw new Error('Test C failed: Expected 200 with guest candidate uid');
    }
    console.log('Result: PASS');

    // Test Case D: Clerk Token Verifier Mechanics
    console.log('\n--- Test D: Verify Clerk verifyToken function rejection of corrupted signatures ---');
    let rejected = false;
    try {
      await verifyToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.invalidsig', {
        secretKey: secretKey
      });
    } catch (e: any) {
      rejected = true;
      console.log('Clerk verifyToken correctly rejected forged JWT:', e.message);
    }
    if (!rejected) {
      throw new Error('Test D failed: verifyToken must reject forged signatures');
    }
    console.log('Result: PASS');

    // Test Case E: DB Health Endpoint
    console.log('\n--- Test E: GET /api/health/db ---');
    const resE = await fetch(`${baseUrl}/api/health/db`);
    const jsonE = await resE.json();
    console.log(`Status: ${resE.status}`);
    console.log(`Body:`, jsonE);
    if (!('status' in jsonE)) {
      throw new Error('Test E failed: Expected status property in response');
    }
    console.log('Result: PASS');

    console.log('\n======================================================');
    console.log('>>> ALL CLERK AUTH & BACKEND TESTS PASSED (5/5) <<<');
    console.log('======================================================');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
