const fs = require('fs');
const files = ['index.html', 'catering.html', 'locations.html', 'menu.html', 'specials.html'];
const search = `        <div class="text-center-mobile">
          <div class="footer-label">Contact</div>
          <p style="font-size: 13px; margin-bottom: 6px;"><a href="tel:+13234211646" style="color: var(--white); text-decoration: none; font-weight: 600;">(323) 421-1646</a></p>
          <p style="font-size: 13px;"><a href="mailto:bigiawasaana@gmail.com" style="color: var(--gray); text-decoration: none; transition: color 0.2s;">bigiawasaana@gmail.com</a></p>
        </div>`;

const replacement = search + `
        <div class="text-center-mobile">
          <div class="footer-label">Follow Us</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="https://www.instagram.com/bigiawasaana" target="_blank" rel="noopener" style="font-size: 13px; color: var(--gray); text-decoration: none;">Instagram</a>
            <a href="https://www.tiktok.com/@bigiawasaana" target="_blank" rel="noopener" style="font-size: 13px; color: var(--gray); text-decoration: none;">TikTok</a>
            <a href="https://www.facebook.com/bigiawasaana" target="_blank" rel="noopener" style="font-size: 13px; color: var(--gray); text-decoration: none;">Facebook</a>
            <a href="https://www.youtube.com/@bigiawasaana" target="_blank" rel="noopener" style="font-size: 13px; color: var(--gray); text-decoration: none;">YouTube</a>
            <a href="https://www.snapchat.com/add/bigiawasaana" target="_blank" rel="noopener" style="font-size: 13px; color: var(--gray); text-decoration: none;">Snapchat</a>
          </div>
        </div>`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let searchNormalized = search.replace(/\r\n/g, '\n');
  let contentNormalized = content.replace(/\r\n/g, '\n');
  if (contentNormalized.includes(searchNormalized)) {
    contentNormalized = contentNormalized.replace(searchNormalized, replacement.replace(/\r\n/g, '\n'));
    fs.writeFileSync(file, contentNormalized, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('Could not find search block in ' + file);
  }
});
