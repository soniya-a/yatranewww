import fs from 'fs';
import tls from 'tls';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
const u = new URL(parsed.DATABASE_URL);
const host = u.hostname;
const port = parseInt(u.port || '5432', 10);

console.log(`Connecting direct TLS to ${host}:${port}...`);
const socket = tls.connect({
  host,
  port,
  servername: host,
  rejectUnauthorized: false,
  timeout: 5000
}, () => {
  console.log('TLS direct connected! Authorized:', socket.authorized);
  console.log('ALPN protocol:', socket.alpnProtocol);
  console.log('Cipher:', socket.getCipher());
  socket.end();
});

socket.on('error', (err) => {
  console.log('TLS Error:', err.message);
});

socket.on('timeout', () => {
  console.log('TLS connection timed out');
  socket.destroy();
});
