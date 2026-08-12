from PIL import Image
import os
import glob

# 1. Convert logo.webp to logo.webp
try:
    img = Image.open('logo.webp')
    img.save('logo.webp', 'webp')
    print("Successfully converted logo.webp to logo.webp")
except Exception as e:
    print(f"Error converting image: {e}")

# 2. Replace 'logo.webp' with 'logo.webp' in all text files
def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace('logo.webp', 'logo.webp')
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception:
        pass

extensions = ['html', 'js', 'json', 'py', 'mjs', 'cjs', 'webmanifest']

for ext in extensions:
    for filepath in glob.glob(f"**/*.{ext}", recursive=True):
        if 'node_modules' in filepath or '.git' in filepath or 'dist' in filepath:
            continue
        replace_in_file(filepath)
