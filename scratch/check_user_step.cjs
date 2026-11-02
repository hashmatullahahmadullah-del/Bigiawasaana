const fs = require('fs');
const transcriptPath = 'C:/Users/User/.gemini/antigravity/brain/6320e95d-64c8-4ec3-9718-6034f9efc967/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  const step = JSON.parse(lines[i]);
  if (step.type === 'USER_INPUT') {
    console.log('Step index:', step.step_index);
    console.log('Content:', step.content);
    console.log('Media count:', step.media ? step.media.length : 0);
    if (step.media) {
      step.media.forEach((m, idx) => console.log(`Media ${idx}: ${m.uri}`));
    }
    break;
  }
}
