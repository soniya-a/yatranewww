import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL || '';
console.log('process.env.DATABASE_URL:');
console.log('Length:', dbUrl.length);
console.log('Starts with quote:', dbUrl.startsWith('"') || dbUrl.startsWith("'"));
console.log('Ends with quote:', dbUrl.endsWith('"') || dbUrl.endsWith("'"));
console.log('Prefix:', dbUrl.substring(0, 20));
console.log('Suffix:', dbUrl.substring(dbUrl.length - 25));

try {
  const cleanUrl = dbUrl.replace(/^["']|["']$/g, '');
  const u = new URL(cleanUrl);
  console.log('Clean parsed host:', u.hostname);
  console.log('Clean parsed user:', u.username);
  console.log('Clean parsed search params:', u.search);
} catch (e: any) {
  console.log('Parse error:', e.message);
}
