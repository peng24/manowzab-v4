import os
from PIL import Image, ImageDraw

# Create a 512x512 transparent RGBA image
width, height = 512, 512
img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

# Create a 512x512 grayscale mask image for drawing shape
mask = Image.new("L", (width, height), 0)
draw = ImageDraw.Draw(mask)

# Points for the minimal M path
points = [(150, 360), (150, 160), (256, 266), (362, 160), (362, 360)]
r = 22 # radius of the stroke (stroke width 44)

# Draw lines on the mask
for i in range(len(points) - 1):
    draw.line([points[i], points[i+1]], fill=255, width=r*2)

# Draw circles at vertices to round caps/joints
for pt in points:
    x, y = pt
    draw.ellipse([x - r, y - r, x + r, y + r], fill=255)

# Create the gradient image
gradient = Image.new("RGBA", (width, height))

# Generate a smooth diagonal gradient
for y in range(height):
    for x in range(width):
        # Diagonal factor from 0.0 to 1.0 within the shape bounds
        t = (x + y - 310) / 412.0
        t = max(0.0, min(1.0, t))
        
        # Color interpolation from #00e676 (0, 230, 118) to #00b0ff (0, 176, 255)
        g = int(230 * (1 - t) + 176 * t)
        b = int(118 * (1 - t) + 255 * t)
        gradient.putpixel((x, y), (0, g, b, 255))

# Apply mask to gradient image
gradient.putalpha(mask)

public_dir = r"c:\Users\PR-Notebook-new\Desktop\manowzab-v4\public"

# Save multi-size icons with transparency
# favicon.ico
gradient.resize((256, 256), Image.Resampling.LANCZOS).save(f"{public_dir}\\favicon.ico", format="ICO")
# apple-touch-icon.png
gradient.resize((180, 180), Image.Resampling.LANCZOS).save(f"{public_dir}\\apple-touch-icon.png", format="PNG")
# pwa-192x192.png
gradient.resize((192, 192), Image.Resampling.LANCZOS).save(f"{public_dir}\\pwa-192x192.png", format="PNG")
# pwa-512x512.png
gradient.resize((512, 512), Image.Resampling.LANCZOS).save(f"{public_dir}\\pwa-512x512.png", format="PNG")

print("Transparent icons generated successfully!")
