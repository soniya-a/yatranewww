import 'dotenv/config';

const rawUrl = process.env.DATABASE_URL || '';
const trimmed = rawUrl.trim();
const match = trimmed.match(/^postgresql:\/\/([^:]+):(.*)@([^@\/:?]+)(?::(\d+))?\/([^?]+)/);
if (match) {
  const [_, user, password, host, port, database] = match;
  console.log({
    user: user ? user.substring(0, 3) + '***' : undefined,
    host,
    port: port ? parseInt(port, 10) : 5432,
    database
  });
} else {
  console.log('No match');
}
