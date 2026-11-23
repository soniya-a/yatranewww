import fs from 'fs';

const content = fs.readFileSync('.env', 'utf-8');
const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
const keys = lines.map(l => l.split('=')[0].trim());
console.log('Environment variable keys present:');
keys.forEach(k => console.log(' - ' + k));
