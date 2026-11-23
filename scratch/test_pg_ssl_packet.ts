import fs from 'fs';
import net from 'net';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split(/\r?\n/);
let raw = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    raw = line.substring('DATABASE_URL='.length).trim();
  }
}
if (raw.startsWith('"') && raw.endsWith('"')) {
  raw = raw.slice(1, -1);
}
raw = raw.replace('&channel_binding=require', '').replace('channel_binding=require&', '');

const u = new URL(raw);
const host = u.hostname;
const port = parseInt(u.port || '5432', 10);

console.log('Testing raw PG protocol connection to:', host, port);
const socket = new net.Socket();
socket.setTimeout(8000);

socket.connect(port, host, () => {
  console.log('Connected TCP socket! Sending SSLRequest packet...');
  const sslPacket = Buffer.alloc(8);
  sslPacket.writeInt32BE(8, 0);
  sslPacket.writeInt32BE(80877103, 4);
  socket.write(sslPacket);
});

socket.on('data', (data) => {
  console.log('Received response byte from server:', data.toString('utf8'), data);
  socket.destroy();
});

socket.on('error', (err) => {
  console.error('Socket error:', err.message);
});

socket.on('timeout', () => {
  console.log('Socket timed out waiting for server response');
  socket.destroy();
});
