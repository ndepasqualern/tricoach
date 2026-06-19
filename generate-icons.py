#!/usr/bin/env python3
"""
Run this once to generate PWA icon PNGs.
Requires: pip install Pillow
Usage: python3 generate-icons.py
Output: public/pwa-192x192.png, public/pwa-512x512.png, public/apple-touch-icon.png
"""
try:
    from PIL import Image, ImageDraw, ImageFont
    import os

    for size in [192, 512, 180]:
        img = Image.new("RGBA", (size, size), (15, 17, 23, 255))
        draw = ImageDraw.Draw(img)
        # Rounded rect background
        r = size // 5
        draw.rounded_rectangle([0, 0, size, size], radius=r, fill=(15, 17, 23))
        # Medal emoji text — fallback to circle if no emoji font
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", int(size * 0.65))
            draw.text((size//2, size//2), "🏅", font=font, anchor="mm")
        except:
            # Fallback: teal circle with T
            cx, cy, cr = size//2, size//2, size//3
            draw.ellipse([cx-cr, cy-cr, cx+cr, cy+cr], fill=(0, 194, 203))
            try:
                font2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size*0.35))
            except:
                font2 = ImageFont.load_default()
            draw.text((cx, cy), "T", fill="white", font=font2, anchor="mm")

        fname = f"public/apple-touch-icon.png" if size == 180 else f"public/pwa-{size}x{size}.png"
        img.save(fname, "PNG")
        print(f"Generated {fname}")

    print("Icons generated successfully.")
except ImportError:
    print("Pillow not installed. Creating placeholder PNGs...")
    import struct, zlib

    def make_simple_png(size, color=(0, 194, 203)):
        """Create a minimal solid-color PNG without Pillow."""
        def png_chunk(chunk_type, data):
            c = chunk_type + data
            return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

        signature = b"\x89PNG\r\n\x1a\n"
        ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
        ihdr = png_chunk(b"IHDR", ihdr_data)

        raw_rows = b""
        for _ in range(size):
            row = b"\x00" + bytes(color) * size
            raw_rows += row
        idat = png_chunk(b"IDAT", zlib.compress(raw_rows))
        iend = png_chunk(b"IEND", b"")
        return signature + ihdr + idat + iend

    import os
    os.makedirs("public", exist_ok=True)
    for size in [192, 512]:
        with open(f"public/pwa-{size}x{size}.png", "wb") as f:
            f.write(make_simple_png(size))
        print(f"Created placeholder public/pwa-{size}x{size}.png")
    with open("public/apple-touch-icon.png", "wb") as f:
        f.write(make_simple_png(180))
    print("Created placeholder public/apple-touch-icon.png")
    print("\nFor better icons, install Pillow: pip install Pillow && python3 generate-icons.py")
