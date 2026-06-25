import glob
import re
import sys

def main():
    # 1. Read the correct nav, drawer, and footer from index.html
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            index_content = f.read()
    except Exception as e:
        print("Error reading index.html:", e)
        return

    nav_match = re.search(r'(<nav class="site-nav">.*?</nav>)', index_content, re.DOTALL)
    drawer_match = re.search(r'(<div class="nav-mobile-drawer"[^>]*>.*?</div>)', index_content, re.DOTALL)
    footer_match = re.search(r'(<footer class="footer">.*?</footer>)', index_content, re.DOTALL)

    if not (nav_match and drawer_match and footer_match):
        print("Could not find standard components in index.html")
        return

    std_nav = nav_match.group(1)
    std_drawer = drawer_match.group(1)
    std_footer = footer_match.group(1)

    # 2. Clean the FAQ link from standard nav and drawer
    std_nav = re.sub(r'\s*<li><a href="/faq\.html"[^>]*>FAQ</a></li>', '', std_nav)
    # The drawer link might not have <li>
    std_drawer = re.sub(r'\s*<a href="/faq\.html"[^>]*>FAQ</a>', '', std_drawer)
    
    # 3. Clean FAQ from index.html itself (we haven't written it yet)
    
    html_files = glob.glob('*.html') + glob.glob('functions/*.html')
    for filepath in html_files:
        if filepath in ['admin.html', 'customer-display.html', 'kitchen.html', 'tv-menu.html', 'order-status.html']:
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original = content
        
        # If it's faq.html, replace the entire weird split nav block and mobile nav
        if filepath == 'faq.html':
            # Remove old split nav
            content = re.sub(r'<nav class="nav-desktop[^>]*>.*?</nav>', std_nav, content, flags=re.DOTALL)
            # Remove old separate mobile nav
            content = re.sub(r'<nav class="nav-mobile[^>]*>.*?</nav>\s*', '', content, flags=re.DOTALL)
            # Replace drawer and footer
            content = re.sub(r'<div class="nav-mobile-drawer"[^>]*>.*?</div>', std_drawer, content, flags=re.DOTALL)
            content = re.sub(r'<footer class="footer">.*?</footer>', std_footer, content, flags=re.DOTALL)
            
            # (Optional) Add active class if needed, but keeping it simple is fine since FAQ is not in top nav anymore!
            
        elif filepath == 'blog.html':
            # Replace nav, drawer, footer entirely
            content = re.sub(r'<nav class="site-nav">.*?</nav>', std_nav, content, flags=re.DOTALL)
            content = re.sub(r'<div class="nav-mobile-drawer"[^>]*>.*?</div>', std_drawer, content, flags=re.DOTALL)
            content = re.sub(r'<footer class="footer">.*?</footer>', std_footer, content, flags=re.DOTALL)
            
            # Since blog IS in the top nav, let's restore the active class
            content = re.sub(r'(<a href="/blog\.html"[^>]*)>', r'\1 class="active">', content)
            
        else:
            # Just strip FAQ from top nav and mobile drawer for all other files
            content = re.sub(r'\s*<li><a href="/faq\.html"[^>]*>FAQ</a></li>', '', content)
            content = re.sub(r'\s*<a href="/faq\.html"(?! class="footer-link")[^>]*>FAQ</a>(?=\s*<a href="/#delivery"|\s*<button|\s*<a href="/blog)', '', content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")

    print("Sync complete.")

if __name__ == "__main__":
    main()
