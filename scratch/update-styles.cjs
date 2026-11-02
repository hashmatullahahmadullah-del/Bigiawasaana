const fs = require('fs');

let style = fs.readFileSync('src/style.css', 'utf8').replace(/\r\n/g, '\n');

const block1 = `/* Slide Over */
.crm-slide-over {
  position: fixed;
  top: 0;
  right: -400px;
  width: 100%;
  max-width: 400px;
  height: 100vh;
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: none;
  visibility: hidden;
  pointer-events: none;
  transition: right 0.3s var(--ease), visibility 0.3s var(--ease);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.crm-slide-over.open {
  right: 0;
  visibility: visible;
  pointer-events: auto;
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}`;

const block2 = `/* Slide Over */
.crm-slide-over {
  position: fixed;
  top: 72px; /* below admin nav */
  right: -400px;
  width: 100%;
  max-width: 400px;
  height: calc(100vh - 72px);
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: none;
  visibility: hidden;
  pointer-events: none;
  transition: right 0.3s var(--ease), visibility 0.3s var(--ease);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.crm-slide-over.open {
  right: 0;
  visibility: visible;
  pointer-events: auto;
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}`;

const target1 = `/* Slide Over */
.crm-slide-over {
  position: fixed;
  top: 0;
  right: -400px;
  width: 100%;
  max-width: 400px;
  height: 100vh;
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
  transition: right 0.3s var(--ease);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.crm-slide-over.open { right: 0; }`;

const target2 = `/* Slide Over */
.crm-slide-over {
  position: fixed;
  top: 72px; /* below admin nav */
  right: -400px;
  width: 100%;
  max-width: 400px;
  height: calc(100vh - 72px);
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
  transition: right 0.3s var(--ease);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.crm-slide-over.open { right: 0; }`;

if (style.includes(target1)) {
  style = style.replace(target1, block1);
  console.log('Target 1 replaced');
} else {
  console.log('Target 1 not found');
}

if (style.includes(target2)) {
  style = style.replace(target2, block2);
  console.log('Target 2 replaced');
} else {
  console.log('Target 2 not found');
}

fs.writeFileSync('src/style.css', style, 'utf8');
