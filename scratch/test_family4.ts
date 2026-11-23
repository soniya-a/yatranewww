import net from 'net';

const testHost = (h: string) => {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: h, port: 5432, family: 4, timeout: 5000 }, () => {
      console.log(`Connected with family:4 to ${h}! Sending SSL packet...`);
      const packet = Buffer.from([0x00, 0x00, 0x00, 0x08, 0x04, 0xd2, 0x16, 0x2f]);
      s.write(packet);
    });
    s.on('data', (d) => {
      console.log(`Reply with family:4 from ${h}: "${d.toString('utf8')}"`);
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      console.log(`Timeout with family:4 on ${h}`);
      s.destroy();
      resolve(false);
    });
    s.on('error', (err) => {
      console.log(`Error on ${h}:`, err.message);
      resolve(false);
    });
  });
};

testHost('ep-square-snow-bebbsgsh.c-9.us-east-2.aws.neon.tech');
