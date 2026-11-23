import fs from 'fs';
import dotenv from 'dotenv';
import net from 'net';
import { Client } from 'pg';

const parsed = dotenv.parse(fs.readFileSync('.env', 'utf8'));
const connStr = parsed.DATABASE_URL;

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  // Provide a custom stream factory that forces IPv4 on the net.Socket
  stream: () => {
    console.log('Custom stream factory invoked! Creating net.Socket with family:4...');
    const socket = new net.Socket();
    const origConnect = socket.connect.bind(socket);
    socket.connect = function (options: any, cb?: any) {
      if (typeof options === 'object') {
        options.family = 4;
        return origConnect(options, cb);
      } else {
        // connect(port, host)
        const port = options;
        const host = cb;
        return origConnect({ port, host, family: 4 });
      }
    };
    return socket;
  }
});

console.log('Connecting with custom IPv4 stream...');
client.connect(async (err) => {
  if (err) {
    console.error('Connection failed:', err.message, err.code);
  } else {
    console.log('CONNECTION SUCCEEDED!');
    try {
      const res = await client.query('SELECT 1 as connected, current_database() as db, current_user as usr;');
      console.log('SELECT 1 RESULT:', res.rows);

      const tables = await client.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'esco_raw' OR table_name = 'dataset_import_log';
      `);
      console.log('Neon Tables found:', tables.rows);
    } catch (qErr: any) {
      console.error('Query error:', qErr.message);
    } finally {
      await client.end();
    }
  }
});
