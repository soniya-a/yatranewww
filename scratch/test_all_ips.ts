import net from 'net';

const testHost = (h: string) => {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: h, port: 5432, timeout: 5000 }, () => {
      console.log(`Connected to ${h}! Sending SSL packet...`);
      const packet = Buffer.from([0x00, 0x00, 0x00, 0x08, 0x04, 0xd2, 0x16, 0x2f]);
      s.write(packet);
    });
    s.on('data', (d) => {
      console.log(`Reply from ${h}: "${d.toString('utf8')}"`);
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      console.log(`Timeout on ${h}`);
      s.destroy();
      resolve(false);
    });
    s.on('error', (err) => {
      console.log(`Error on ${h}:`, err.message);
      resolve(false);
    });
  });
};

async function run() {
  console.log('--- 1. Testing pooler host ---');
  await testHost('ep-square-snow-bebbsgsh-pooler.c-9.us-east-2.aws.neon.tech');

  console.log('--- 2. Testing direct host ---');
  await testHost('ep-square-snow-bebbsgsh.c-9.us-east-2.aws.neon.tech');

  console.log('--- 3. Testing resolved IP 77.113.7.222 ---');
  await testHost('77.113.7.222');

  console.log('--- 4. Testing resolved IP 3.147.219.177 ---');
  await testHost('3.147.219.177');

  console.log('--- 5. Testing resolved IP 77.113.120.60 ---');
  await testHost('77.113.120.60');
}

run();
