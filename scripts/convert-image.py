# -*- coding: utf-8 -*-
"""Convertit une image HEIC (iPhone) en JPG/WebP pour le site."""
import os
import sys
import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()

SRC = r"C:\Users\user\Downloads\Telegram Desktop\IMG_0815.HEIC"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img", "articles")
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC).convert("RGB")
print("Original size:", img.size)

# Version couverture (max 1600px de large)
cover = img.copy()
cover.thumbnail((1600, 1600), Image.LANCZOS)
cover_path = os.path.join(OUT_DIR, "mec-calme.jpg")
cover.save(cover_path, "JPEG", quality=88)
print("Saved JPG:", cover_path, cover.size)

# Version WebP
webp_path = os.path.join(OUT_DIR, "mec-calme.webp")
cover.save(webp_path, "WEBP", quality=85)
print("Saved WebP:", webp_path)

# Version paysage 16:9 pour Google Actualités (1200x675), recadrée au centre
def center_crop(im, tw, th):
    w, h = im.size
    if w / h > tw / th:
        nh = h
        nw = int(h * tw / th)
        left = (w - nw) / 2
        return im.crop((left, 0, left + nw, h)).resize((tw, th), Image.LANCZOS)
    else:
        nw = w
        nh = int(w * th / tw)
        top = (h - nh) / 2
        return im.crop((0, top, w, top + nh)).resize((tw, th), Image.LANCZOS)

og = center_crop(img, 1200, 675)
og_path = os.path.join(OUT_DIR, "mec-calme-16x9.jpg")
og.save(og_path, "JPEG", quality=88)
print("Saved 16:9:", og_path, og.size)

print("Terminé.")
