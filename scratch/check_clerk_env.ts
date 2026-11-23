import 'dotenv/config';
import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: false });
}

console.log('CLERK_PUBLISHABLE_KEY loaded:', Boolean(process.env.VITE_CLERK_PUBLISHABLE_KEY));
console.log('CLERK_SECRET_KEY loaded:', Boolean(process.env.CLERK_SECRET_KEY));
