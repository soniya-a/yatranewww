import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/jsoni/.gemini/antigravity-ide/brain/91622024-e434-42ac-989e-39269f95dce0/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
const lines: string[] = [];

rl.on('line', (line) => { lines.push(line); });
rl.on('close', () => {
  for (const l of lines) {
    try {
      const obj = JSON.parse(l);
      if (obj.step_index >= 715 && obj.step_index <= 735) {
        const tc = obj.tool_calls ? obj.tool_calls.map((t: any) => t.name + ' (' + (t.args?.toolSummary || t.args?.toolAction || '') + ': ' + (t.args?.CommandLine || '').slice(0, 80) + ')').join(', ') : '';
        const content = obj.content ? obj.content.replace(/\n/g, ' ').slice(0, 150) : '';
        console.log(`[${obj.step_index}] ${obj.source} ${obj.type} | tools: ${tc} | content: ${content}`);
      }
    } catch (e) {}
  }
});
