const fs = require('fs');
const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\e85d0b41-c6bf-4a94-a8fe-7c418068f25b\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  const step = JSON.parse(lines[i]);
  if (step.tool_calls) {
    const call = step.tool_calls.find(tc => tc.name === 'send_message');
    if (call && call.args && call.args.Message) {
      fs.writeFileSync('scratch/full_security_audit.md', call.args.Message, 'utf8');
      console.log('Successfully wrote scratch/full_security_audit.md from transcript_full, size:', call.args.Message.length);
      break;
    }
  }
}
