import os
import re

files = ['menu.html', 'faq.html', 'catering.html', 'locations.html', 'specials.html', 'blog.html']
basedir = r'c:\Users\User\Documents\Bigi-Awasaana'

tags_to_add = '''
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#111111">
  <link rel="apple-touch-icon" href="/logo.webp">'''

for f in files:
    path = os.path.join(basedir, f)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
        
    # Add tags after favicon
    if '<link rel="manifest" href="/site.webmanifest">' not in content:
        content = content.replace('<link rel="icon" type="image/jpeg" href="/favicon.jpg">', 
                                  '<link rel="icon" type="image/jpeg" href="/favicon.jpg">' + tags_to_add)
                                  
    # Add BreadcrumbList
    breadcrumb = '''
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://bigiawasaana.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "PAGENAME",
        "item": "https://bigiawasaana.com/PAGEFILE"
      }
    ]
  }
  </script>'''
    
    if 'BreadcrumbList' not in content:
        # Determine page name from filename
        page_name = f.replace('.html', '').capitalize()
        b_list = breadcrumb.replace('PAGENAME', page_name).replace('PAGEFILE', f)
        
        head_end = content.find('</head>')
        head_content = content[:head_end]
        scripts = list(re.finditer(r'<script type="application/ld\+json">.*?</script>', head_content, re.DOTALL))
        
        if scripts:
            insert_pos = scripts[-1].end()
            content = content[:insert_pos] + b_list + content[insert_pos:]
        else:
            content = content[:head_end] + b_list + '\n' + content[head_end:]
    
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)
