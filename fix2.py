with open('functions/ssr.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Fix the escaped interpolations
content = content.replace('\\${baseUrl}', '${baseUrl}')
content = content.replace('\\${now}', '${now}')

# Fix .html in sitemap URLs
start_idx = content.find('let xml = `<?xml version="1.0" encoding="UTF-8"?>')
end_idx = content.find('xml += `\\n</urlset>`;')

if start_idx != -1 and end_idx != -1:
    sitemap_block = content[start_idx:end_idx]
    sitemap_block = sitemap_block.replace('.html</loc>', '</loc>')
    content = content[:start_idx] + sitemap_block + content[end_idx:]

with open('functions/ssr.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed ssr.js')
