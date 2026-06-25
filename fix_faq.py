import glob
import re

html_files = glob.glob('*.html') + glob.glob('functions/*.html')

for filepath in html_files:
    if filepath == 'faq.html':
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Revert all FAQ links completely
    content = re.sub(r'\s*<a href="/faq\.html"[^>]*>FAQ</a>', '', content)
    
    # Now let's carefully inject them.
    
    # 1. Desktop Nav & Mobile Drawer
    # Case A: <li><a href="/catering.html" ...>Catering</a></li>
    content = re.sub(
        r'(<li><a href="/catering\.html"[^>]*>Catering</a></li>)',
        r'\1\n        <li><a href="/faq.html" data-i18n="nav.faq">FAQ</a></li>',
        content
    )
    
    # Case B: Just <a href="/catering.html" ...>Catering</a> (without <li>, NOT in footer)
    # We can identify footer links because they have class="footer-link"
    # So we match <a href="/catering.html" ...>Catering</a> where it does NOT have class="footer-link"
    content = re.sub(
        r'(<a href="/catering\.html"(?!.*class="footer-link")[^>]*>Catering</a>)(?!</li>)',
        r'\1\n        <a href="/faq.html" data-i18n="nav.faq">FAQ</a>',
        content
    )
    
    # 2. Footer
    content = re.sub(
        r'(<a href="/catering\.html"\s+class="footer-link">Catering</a>)',
        r'\1\n            <a href="/faq.html" class="footer-link">FAQ</a>',
        content
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Fixed FAQ links.")
