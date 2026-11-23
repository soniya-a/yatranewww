import fs from 'fs';
import path from 'path';

console.log('CWD:', process.cwd());

['.env', '.env.local', '../.env'].forEach(f => {
  const p = path.resolve(process.cwd(), f);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    console.log(f, 'exists: true, line count:', lines.length);
    lines.forEach((l, idx) => {
      if (l.trim().startsWith('DATABASE_URL')) {
        const parts = l.split('=');
        const val = parts.slice(1).join('=').trim();
        console.log(`  Line ${idx + 1} in ${f}: length = ${val.length}, prefix = ${val.substring(0, 15)}..., has_quotes = ${val.startsWith('"') || val.startsWith("'")}`);
      }
    });
  } else {
    console.log(f, 'exists: false');
  }
});
