import 'dotenv/config';
import { verifyToken } from '@clerk/express';

async function test() {
  const secret = process.env.CLERK_SECRET_KEY;
  console.log('Secret key exists:', Boolean(secret));
  try {
    await verifyToken('dummy.token.here', { secretKey: secret });
  } catch (err: any) {
    console.log('Expected failure on dummy token:', err.message);
  }
}

test();
