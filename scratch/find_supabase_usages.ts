import fs from 'fs';
import path from 'path';

const targets = [
  'AdminDashboard.tsx',
  'Home.tsx',
  'Interview.tsx',
  'CareerRoadmapView.tsx',
  'assessmentEngine.ts',
  'questionEngine.ts',
  'escoRetriever.ts',
  'careerRanker.ts',
  'escoMatcher.ts',
  'server.ts'
];

function checkFiles(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') checkFiles(p);
    } else {
      for (const t of targets) {
        if (f === t) {
          console.log('\n=== FILE: ' + p + ' ===');
          const lines = fs.readFileSync(p, 'utf8').split('\n');
          lines.forEach((l, idx) => {
            const low = l.toLowerCase();
            if (low.includes('supabase') || low.includes('.from(') || low.includes('getusersupabase')) {
              console.log('  L' + (idx+1) + ': ' + l.trim());
            }
          });
        }
      }
    }
  }
}

checkFiles('D:/YATRA/Yatranew');
