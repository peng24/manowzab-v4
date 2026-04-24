import os
from PIL import Image

src_img = r"C:\Users\PR-Notebook-new\.gemini\antigravity\brain\d8e70616-a7d8-4514-93d7-a6a64c502503\modern_app_icon_1777004534078.png"
if not os.path.exists(src_img):
    print("Source image not found.")
    exit(1)

img = Image.open(src_img)
width, height = img.size
min_dim = min(width, height)
left = (width - min_dim)/2
top = (height - min_dim)/2
right = (width + min_dim)/2
bottom = (height + min_dim)/2
img = img.crop((left, top, right, bottom))

public_dir = r"c:\Users\PR-Notebook-new\Desktop\manowzab-v4\public"

# favicon.ico
img.resize((256, 256), Image.Resampling.LANCZOS).save(f"{public_dir}\\favicon.ico", format="ICO")
# apple-touch-icon.png
img.resize((180, 180), Image.Resampling.LANCZOS).save(f"{public_dir}\\apple-touch-icon.png", format="PNG")
# pwa-192x192.png
img.resize((192, 192), Image.Resampling.LANCZOS).save(f"{public_dir}\\pwa-192x192.png", format="PNG")
# pwa-512x512.png
img.resize((512, 512), Image.Resampling.LANCZOS).save(f"{public_dir}\\pwa-512x512.png", format="PNG")

print("Icons generated successfully!")
