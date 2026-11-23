import fs from 'fs';

const env = fs.readFileSync('D:/YATRA/Yatranew/.env', 'utf8');
const lines = env.split('\n');
let pubKey = '';
let secKey = '';
lines.forEach(l => {
  if (l.startsWith('VITE_CLERK_PUBLISHABLE_KEY=')) pubKey = l.split('=')[1].trim();
  if (l.startsWith('CLERK_SECRET_KEY=')) secKey = l.split('=')[1].trim();
});

console.log('Publishable Key prefix:', pubKey.substring(0, 8));
// Clerk publishable keys format: pk_test_<base64_encoded_instance_slug>$
const b64Part = pubKey.replace(/^pk_(test|live)_/, '').replace(/\$$/, '');
try {
  const decoded = Buffer.from(b64Part, 'base64').toString('utf8');
  console.log('Decoded instance from Publishable Key:', decoded);
} catch (e: any) {
  console.log('Error decoding pub key:', e.message);
}

console.log('Secret Key prefix:', secKey.substring(0, 8));
console.log('Secret Key length:', secKey.length);
