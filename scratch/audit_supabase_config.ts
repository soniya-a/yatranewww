import dotenv from 'dotenv';
dotenv.config({ path: 'D:/YATRA/Yatranew/.env' });

import { isSupabaseConfigured as serverConfigured, supabase as serverClient } from '../src/lib/supabaseServer';
import { isSupabaseConfigured as clientConfigured } from '../src/lib/supabase';

console.log('--- Supabase Configuration Audit ---');
console.log('serverConfigured:', serverConfigured);
console.log('clientConfigured:', clientConfigured);
console.log('process.env.SUPABASE_URL:', process.env.SUPABASE_URL ? 'PRESENT (starts with ' + process.env.SUPABASE_URL.substring(0, 15) + '...)' : 'UNDEFINED');
console.log('process.env.SUPABASE_PUBLISHABLE_KEY:', process.env.SUPABASE_PUBLISHABLE_KEY ? 'PRESENT' : 'UNDEFINED');
console.log('process.env.VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'PRESENT' : 'UNDEFINED');
console.log('process.env.VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'PRESENT' : 'UNDEFINED');

if (serverConfigured) {
  console.log('Testing minimal query on serverClient...');
  try {
    const { data, error } = await serverClient.from('esco_skills').select('*').limit(1);
    console.log('Query result: data length =', data?.length, 'error =', error?.message);
  } catch (e: any) {
    console.log('Query threw exception:', e.message);
  }
} else {
  console.log('Notice: isSupabaseConfigured evaluates to FALSE because URL contains \"vimllthildskrgkjpwdv\" (legacy/blacklisted/dormant endpoint)');
}
