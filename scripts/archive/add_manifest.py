import os
import re

files = ['menu.html', 'faq.html', 'catering.html', 'locations.html', 'specials.html', 'blog.html']
basedir = r'c:\Users\User\Documents\Bigi-Awasaana'

for f in files:
    path = os.path.join(basedir, f)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
        
    # Add tags after favicon
    if '<link rel="manifest" href="/site.webmanifest">' not in content:
        content = re.sub(
            r'<link rel="icon"[^>]*>',
            lambda m: m.group(0) + '\n  <link rel="manifest" href="/site.webmanifest">\n  <meta name="theme-color" content="#111111">\n  <link rel="apple-touch-icon" href="/logo.webp">',
            content
        )
                                  
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)
