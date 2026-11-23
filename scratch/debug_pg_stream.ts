import fs from 'fs';
import dotenv from 'dotenv';
import { Client } from 'pg';

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
const connStr = parsed.DATABASE_URL;

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

(client as any).on('error', (e: any) => console.log('Client error event:', e));

console.log('Attaching stream listeners...');
const origConnect = client.connect.bind(client);

client.connect((err) => {
  if (err) console.error('Connect callback err:', err);
  else console.log('Connected!');
});

// Inspect internal socket
setTimeout(() => {
  const stream = (client as any).connection?.stream;
  if (stream) {
    console.log('Stream found! remoteAddress:', stream.remoteAddress, 'remotePort:', stream.remotePort, 'destroyed:', stream.destroyed);
    stream.on('data', (d: Buffer) => console.log('Stream got data:', d.length, d.toString('utf8')));
  } else {
    console.log('No stream yet on connection object');
  }
}, 1000);
