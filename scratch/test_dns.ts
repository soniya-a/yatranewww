import dns from 'dns';

dns.lookup('ep-square-snow-bebbsgsh-pooler.c-9.us-east-2.aws.neon.tech', { all: true }, (err, addresses) => {
  console.log('dns.lookup result:');
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Addresses:', addresses);
  }
});
