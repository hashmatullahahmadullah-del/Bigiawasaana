const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:/Users/User/.gemini/antigravity/brain/6320e95d-64c8-4ec3-9718-6034f9efc967/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
const lastLine = JSON.parse(lines[lines.length - 1]);
console.log('Last line type:', lastLine.type);
console.log('Media:', JSON.stringify(lastLine.media, null, 2));
