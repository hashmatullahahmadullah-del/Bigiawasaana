from PIL import Image
import os

src_img = r'C:\Users\User\.gemini\antigravity\brain\57384c1b-b97a-4528-92e4-5542c592f0e1\media__1782346734425.jpg'
dest_img = r'C:\Users\User\Documents\Bigi-Awasaana\public\7-afghan-dishes-to-try.jpg'

img = Image.open(src_img)
img = img.convert('RGB')
w, h = img.size

target_w = 1200
target_h = 675
target_ratio = target_w / target_h
current_ratio = w / h

if current_ratio > target_ratio:
    new_w = target_w
    new_h = int(new_w / current_ratio)
else:
    new_h = target_h
    new_w = int(new_h * current_ratio)

resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
final_img = Image.new('RGB', (target_w, target_h), (17, 17, 17)) # #111111
offset = ((target_w - new_w) // 2, (target_h - new_h) // 2)
final_img.paste(resized, offset)
final_img.save(dest_img, quality=85)
print('Image resized and saved to', dest_img)
