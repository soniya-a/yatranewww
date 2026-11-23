import 'dotenv/config';

const rawUrl = process.env.DATABASE_URL || '';
try {
  const u = new URL(rawUrl.replace(/^["']|["']$/g, ''));
  console.log('Password length:', u.password.length);
  console.log('Password has special chars:', /[^a-zA-Z0-9]/.test(u.password));
  if (/[^a-zA-Z0-9]/.test(u.password)) {
    console.log('Special chars present:', u.password.match(/[^a-zA-Z0-9]/g));
  }
} catch (e: any) {
  console.error(e.message);
}
