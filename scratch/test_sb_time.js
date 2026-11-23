import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
console.log('Testing Supabase getUser with URL:', url ? url.substring(0, 20) + '...' : 'none');

if (url && key) {
  const sb = createClient(url, key);
  const t0 = Date.now();
  try {
    const res = await sb.auth.getUser("dummy_jwt_token_1234567890");
    console.log("Finished in", Date.now() - t0, "ms. Error:", res.error?.message);
  } catch (e) {
    console.log("Failed in", Date.now() - t0, "ms. Error:", e.message);
  }
}
