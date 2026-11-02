'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GRUBHUB_URL = 'https://www.grubhub.com/restaurant/bigi-awasaana-15530-hesby-st-reseda/15107496';

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}
function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

// Smart replace: works regardless of line endings by normalizing
function smartReplace(content, searchLines, replacementLines) {
  // Try CRLF first, then LF
  const searchCRLF = searchLines.join('\r\n');
  const searchLF = searchLines.join('\n');
  if (content.includes(searchCRLF)) {
    return { content: content.split(searchCRLF).join(replacementLines.join('\r\n')), found: true };
  } else if (content.includes(searchLF)) {
    return { content: content.split(searchLF).join(replacementLines.join('\n')), found: true };
  }
  return { content, found: false };
}

function patchFile(filePath, patches) {
  let content = readFile(filePath);
  let changed = 0;
  for (const [searchLines, replacementLines, label] of patches) {
    const result = smartReplace(content, searchLines, replacementLines);
    if (result.found) {
      content = result.content;
      changed++;
      console.log(`  [OK] ${label} → ${path.basename(filePath)}`);
    } else {
      console.warn(`  [WARN] Not found: "${label}" in ${path.basename(filePath)}`);
    }
  }
  if (changed > 0) writeFile(filePath, content);
  return changed;
}

// ─── index.html ─────────────────────────────────────────────────────────────
patchFile(path.join(ROOT, 'index.html'), [
  // Add animated class to hero delivery row wrapper
  [
    ['          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">'],
    ['          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;" class="delivery-platforms-animated">'],
    'hero row animated class'
  ],
  // Add Grubhub after DoorDash in hero (standard size)
  [
    [
      '            <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash">',
      '              <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash" width="110" height="28">',
      '            </a>',
      '          </div>',
      '        </div>',
    ],
    [
      '            <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash">',
      '              <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash" width="110" height="28">',
      '            </a>',
      `            <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" class="delivery-btn delivery-btn-grubhub">`,
      '              <img loading="lazy" src="/grubhub_logo.svg" alt="Order Halal Afghan Food on Grubhub" width="110" height="28">',
      '            </a>',
      '          </div>',
      '        </div>',
    ],
    'hero DoorDash + Grubhub'
  ],
  // Add animated class to CTA section delivery row
  [
    ['      <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center;">'],
    ['      <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center;" class="delivery-platforms-animated">'],
    'CTA row animated class'
  ],
  // Add Grubhub after DoorDash in CTA (lg size)
  [
    [
      '        <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-lg">',
      '          <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash" width="110" height="28">',
      '        </a>',
      '      </div>',
    ],
    [
      '        <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-lg">',
      '          <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash" width="110" height="28">',
      '        </a>',
      `        <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" class="delivery-btn delivery-btn-grubhub delivery-btn-lg">`,
      '          <img loading="lazy" src="/grubhub_logo.svg" alt="Order Halal Afghan Food on Grubhub" width="110" height="28">',
      '        </a>',
      '      </div>',
    ],
    'CTA DoorDash + Grubhub (lg)'
  ],
]);

// ─── menu.html ────────────────────────────────────────────────────────────
patchFile(path.join(ROOT, 'menu.html'), [
  // Location 1: menu header (no size)
  [
    [
      '        <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash">',
      '          <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash">',
      '        </a>',
      '      </div>',
    ],
    [
      '        <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash">',
      '          <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash">',
      '        </a>',
      `        <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" class="delivery-btn delivery-btn-grubhub">`,
      '          <img loading="lazy" src="/grubhub_logo.svg" alt="Order Halal Afghan Food on Grubhub">',
      '        </a>',
      '      </div>',
    ],
    'menu header DoorDash + Grubhub'
  ],
  // Location 2: cart promo text links
  [
    [
      '              <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">DoorDash</a>',
      '            </div>',
    ],
    [
      '              <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">DoorDash</a>',
      '              <span style="color: var(--border);">|</span>',
      `              <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" style="font-size: 13px; font-weight: 500; text-decoration: underline; color: var(--white);">Grubhub</a>`,
      '            </div>',
    ],
    'cart promo text Grubhub link'
  ],
  // Location 3: bottom -sm buttons
  [
    [
      '          <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-sm">',
      '            <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash">',
      '          </a>',
      '        </div>',
    ],
    [
      '          <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-sm">',
      '            <img loading="lazy" src="/doordash_logo.svg" alt="Order Halal Afghan Food Delivery on DoorDash">',
      '          </a>',
      `          <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" class="delivery-btn delivery-btn-grubhub delivery-btn-sm">`,
      '            <img loading="lazy" src="/grubhub_logo.svg" alt="Order Halal Afghan Food on Grubhub">',
      '          </a>',
      '        </div>',
    ],
    'menu sm DoorDash + Grubhub'
  ],
]);

// ─── area-template.html ───────────────────────────────────────────────────
patchFile(path.join(ROOT, 'area-template.html'), [
  [
    [
      '          <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-sm">',
      '            <img loading="lazy" src="/doordash_logo.svg" alt="DoorDash">',
      '          </a>',
      '        </div>',
    ],
    [
      '          <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-sm">',
      '            <img loading="lazy" src="/doordash_logo.svg" alt="DoorDash">',
      '          </a>',
      `          <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" class="delivery-btn delivery-btn-grubhub delivery-btn-sm">`,
      '            <img loading="lazy" src="/grubhub_logo.svg" alt="Grubhub">',
      '          </a>',
      '        </div>',
    ],
    'area-template DoorDash + Grubhub'
  ],
]);

// ─── item-template.html ───────────────────────────────────────────────────
patchFile(path.join(ROOT, 'item-template.html'), [
  [
    [
      '          <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-sm">',
      '            <img loading="lazy" src="/doordash_logo.svg" alt="DoorDash">',
      '          </a>',
      '        </div>',
    ],
    [
      '          <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="delivery-btn delivery-btn-doordash delivery-btn-sm">',
      '            <img loading="lazy" src="/doordash_logo.svg" alt="DoorDash">',
      '          </a>',
      `          <a href="${GRUBHUB_URL}" target="_blank" rel="noopener" class="delivery-btn delivery-btn-grubhub delivery-btn-sm">`,
      '            <img loading="lazy" src="/grubhub_logo.svg" alt="Grubhub">',
      '          </a>',
      '        </div>',
    ],
    'item-template DoorDash + Grubhub'
  ],
]);

console.log('\nAll done!');
