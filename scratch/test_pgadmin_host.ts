import fs from 'fs';
import net from 'net';
import tls from 'tls';

const host = 'ep-square-snow-bebbsgsh.c-9.us-east-2.aws.neon.tech';
const port = 5432;

console.log(`Connecting TCP to direct host: ${host}:${port}...`);
const socket = new net.Socket();
socket.setTimeout(8000);

socket.connect(port, host, () => {
  console.log('TCP Connected to direct host! Sending SSLRequest packet...');
  const packet = Buffer.alloc(8);
  packet.writeInt32BE(8, 0);
  packet.writeInt32BE(80877103, 4);
  socket.write(packet);
});

socket.once('data', (data) => {
  const reply = data.toString('utf8');
  console.log(`Server responded to SSLRequest with: "${reply}" (0x${data.toString('hex')})`);
  if (reply === 'S') {
    console.log('Server accepts SSL! Upgrading to TLS...');
    const tlsSocket = tls.connect({
      socket,
      servername: host,
      rejectUnauthorized: false
    }, () => {
      console.log('TLS Upgrade SUCCESS on DIRECT host!');
      console.log('Cipher:', tlsSocket.getCipher());
      console.log('Peer cert subject:', tlsSocket.getPeerCertificate()?.subject);
      tlsSocket.end();
    });

    tlsSocket.on('error', (err) => {
      console.log('TLS Handshake error:', err.message);
    });
  } else {
    console.log('Unexpected response:', data);
    socket.destroy();
  }
});

socket.on('error', (err) => {
  console.log('Socket error:', err.message);
});

socket.on('timeout', () => {
  console.log('Socket timed out waiting for SSL response');
  socket.destroy();
});
