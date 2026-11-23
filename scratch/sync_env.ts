import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const localContent = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf-8') : '';

let toAppend = '';
const localLines = localContent.split('\n').map(l => l.trim()).filter(Boolean);
for (const line of localLines) {
  const [key] = line.split('=');
  if (key && !envContent.includes(key)) {
    toAppend += `\n${line}`;
  }
}

if (toAppend) {
  fs.appendFileSync('.env', toAppend);
  console.log('Appended missing Clerk keys to .env');
} else {
  console.log('Clerk keys already in .env');
}
