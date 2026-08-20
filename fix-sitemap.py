with open('functions/ssr.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# find <loc>${baseUrl}/menu.html</loc> and similar and remove .html
new_content = re.sub(r'<loc>(\$\{baseUrl\}/[^<]+)\.html</loc>', r'<loc>\1</loc>', content)

if new_content != content:
    with open('functions/ssr.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed ssr.js")
