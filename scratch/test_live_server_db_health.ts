import http from 'http';
import { spawn } from 'child_process';

console.log('Spawning tsx server.ts...');
const child = spawn('npx', ['tsx', 'server.ts'], {
  cwd: 'd:\\YATRA\\Yatranew',
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (d) => {
  const line = d.toString();
  process.stdout.write('[server stdout] ' + line);
  if (line.includes('Server running on http://localhost:3000')) {
    queryHealth();
  }
});

child.stderr.on('data', (d) => {
  process.stderr.write('[server stderr] ' + d.toString());
});

function queryHealth() {
  console.log('\nSending GET http://localhost:3000/api/health/db...');
  const req = http.get('http://localhost:3000/api/health/db', (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      console.log('====================================');
      console.log('HTTP STATUS:', res.statusCode);
      console.log('RESPONSE BODY:', body);
      console.log('====================================');
      child.kill();
      process.exit(0);
    });
  });
  req.on('error', (e) => {
    console.error('Request failed:', e.message);
    child.kill();
    process.exit(1);
  });
}

setTimeout(() => {
  console.error('Timeout waiting for server to start');
  child.kill();
  process.exit(1);
}, 25000);
