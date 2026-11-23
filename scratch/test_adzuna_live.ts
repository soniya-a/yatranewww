import fs from 'fs';

const lines = fs.readFileSync('D:/YATRA/Yatranew/.env', 'utf8').split('\n');
const env: Record<string, string> = {};
lines.forEach(l => {
  const eq = l.indexOf('=');
  if (eq > 0) {
    const k = l.substring(0, eq).trim();
    let val = l.substring(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[k] = val;
  }
});

const appId = env.ADZUNA_APP_ID;
const appKey = env.ADZUNA_APP_KEY;
console.log('Testing Adzuna API with ID:', appId);
const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&content-type=application/json&what=developer`;

try {
  const res = await fetch(url);
  console.log('Adzuna HTTP Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Total count:', data.count, 'Results length:', data.results?.length);
  if (data.results && data.results.length > 0) {
    console.log('Sample Job Title:', data.results[0].title);
    console.log('Sample redirect_url:', data.results[0].redirect_url);
  }
} catch (err: any) {
  console.error('Fetch error:', err.message);
}
