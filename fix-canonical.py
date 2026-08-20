import os
import re

directories = ['.', 'functions']

for d in directories:
    if not os.path.exists(d):
        continue
    for filename in os.listdir(d):
        if filename.endswith('.html'):
            filepath = os.path.join(d, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = re.sub(
                r'href="https://bigiawasaana\.com/([^/]+?)\.html"',
                r'href="https://bigiawasaana.com/\1"',
                content
            )

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Updated {filepath}')
