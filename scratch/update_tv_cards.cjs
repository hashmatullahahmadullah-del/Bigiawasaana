const fs = require('fs');

let content = fs.readFileSync('src/admin/menu.js', 'utf8');
const startIdx = content.indexOf('export function createTvDragItem');
const endMarker = 'return div;\r\n}';
let endIdx = content.indexOf(endMarker, startIdx);

if (endIdx === -1) {
  endIdx = content.indexOf('return div;\n}', startIdx);
}

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find createTvDragItem boundaries');
  process.exit(1);
}

const replacement = `export function createTvDragItem(item, index = 0, total = 1) {
  const div = document.createElement('div');
  div.className = 'tv-drag-item';
  div.dataset.id = item.id;
  div.dataset.name = (item.name || '').toLowerCase();
  div.dataset.category = (item.category || '').toLowerCase();
  
  const isTv1 = item.tvScreen === 'TV1';
  const isTv2 = item.tvScreen === 'TV2';
  const isTvScreen = isTv1 || isTv2;
  const rank = index + 1;
  const isFirst = index === 0;
  const isLast = index >= total - 1;

  const imgHtml = item.img 
    ? \`<img src="\${item.img}" alt="\${escapeHtml(item.name || '')}" class="tv-card-img" loading="lazy">\` 
    : \`<div class="tv-card-noimg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10a4 4 0 0 1-8 0V2"/><path d="M11 2v4"/><path d="M15 14v8"/><path d="M7 14v8"/></svg></div>\`;

  div.innerHTML = \`
    <div class="tv-card-main-row">
      <!-- Left: Rank + Thumbnail + Info -->
      <div class="tv-card-left">
        \${isTvScreen ? \`<div class="tv-card-rank" title="Order #\${rank}">#\${rank}</div>\` : ''}
        <div class="tv-card-thumb-wrap">
          \${imgHtml}
        </div>
        <div class="tv-card-info">
          <div class="tv-card-title" title="\${escapeHtml(item.name || '')}">\${escapeHtml(item.name || '')}</div>
          <div class="tv-card-meta">
            <span class="tv-card-price">$\${typeof item.price === 'number' ? item.price.toFixed(2) : (item.price || '0.00')}</span>
            <span class="tv-card-dot">•</span>
            <span class="tv-card-cat">\${escapeHtml(item.category || 'general')}</span>
          </div>
        </div>
      </div>

      <!-- Right: Touch Controls & Target Screen Actions -->
      <div class="tv-card-actions">
        \${isTvScreen ? \`
        <div class="tv-order-group">
          <button type="button" class="tv-btn-order \${isFirst ? 'disabled' : ''}" onclick="event.stopPropagation(); window.moveItemOrder('\${item.id}', -1)" title="Move up" \${isFirst ? 'disabled' : ''} aria-label="Move item up">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button type="button" class="tv-btn-order \${isLast ? 'disabled' : ''}" onclick="event.stopPropagation(); window.moveItemOrder('\${item.id}', 1)" title="Move down" \${isLast ? 'disabled' : ''} aria-label="Move item down">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        \` : ''}

        <div class="tv-move-group">
          \${!isTv1 ? \`
          <button type="button" class="tv-pill-action tv-action-to-tv1" onclick="event.stopPropagation(); window.moveItemToScreen('\${item.id}', 'TV1')" title="Assign to TV Screen 1">
            <span>\${isTv2 ? 'TV 1' : '+ TV 1'}</span>
          </button>\` : ''}

          \${!isTv2 ? \`
          <button type="button" class="tv-pill-action tv-action-to-tv2" onclick="event.stopPropagation(); window.moveItemToScreen('\${item.id}', 'TV2')" title="Assign to TV Screen 2">
            <span>\${isTv1 ? 'TV 2' : '+ TV 2'}</span>
          </button>\` : ''}

          \${isTvScreen ? \`
          <button type="button" class="tv-pill-action tv-action-hide" onclick="event.stopPropagation(); window.moveItemToScreen('\${item.id}', null)" title="Remove from TV screen" aria-label="Hide dish">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span class="tv-hide-label">Hide</span>
          </button>\` : ''}
        </div>
      </div>
    </div>
  \`;
  return div;
}`;

const actualMarker = content.substring(endIdx, endIdx + endMarker.length);
content = content.substring(0, startIdx) + replacement + content.substring(endIdx + actualMarker.length);
fs.writeFileSync('src/admin/menu.js', content, 'utf8');
console.log('Successfully updated createTvDragItem in src/admin/menu.js!');
