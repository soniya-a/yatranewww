import fs from 'fs';

function inspectEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return { filePath, exists: false };
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const vars: any[] = [];
  lines.forEach(l => {
    const eq = l.indexOf('=');
    if (eq > 0) {
      const key = l.substring(0, eq).trim();
      let val = l.substring(eq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      let masked = '';
      if (val.length > 12) {
        masked = `${val.substring(0, 10)}...${val.substring(val.length - 4)} (len: ${val.length})`;
      } else if (val.length > 0) {
        masked = `${val.substring(0, 3)}... (len: ${val.length})`;
      } else {
        masked = 'EMPTY';
      }
      vars.push({ key, masked });
    }
  });
  return { filePath, exists: true, vars };
}

console.log(JSON.stringify(inspectEnv('D:/YATRA/Yatranew/.env'), null, 2));
console.log(JSON.stringify(inspectEnv('D:/YATRA/Yatranew/.env.local'), null, 2));
