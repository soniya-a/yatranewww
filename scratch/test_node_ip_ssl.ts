import net from 'net';

const s = net.createConnection({ host: '77.113.7.222', port: 5432, timeout: 5000 }, () => {
  console.log('Node connected to 77.113.7.222!');
  // Length 8, code 80877103
  const packet = Buffer.from([0x00, 0x00, 0x00, 0x08, 0x04, 0xd2, 0x16, 0x2f]);
  s.write(packet);
});

s.on('data', (d) => {
  console.log('Node received reply:', d.toString('utf8'), d);
  s.destroy();
});

s.on('timeout', () => {
  console.log('Node timeout on 77.113.7.222');
  s.destroy();
});

s.on('error', (e) => {
  console.log('Node error:', e.message);
});
