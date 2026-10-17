# -*- coding: utf-8 -*-
"""Recadre la photo Mec Calme en 16:9 paysage sans le visage (cadrage sur le buste)."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "img", "articles", "mec-calme.jpg")
OUT = os.path.join(ROOT, "assets", "img", "articles", "mec-calme-16x9-discret.jpg")

img = Image.open(SRC).convert("RGB")
w, h = img.size  # 1151 x 1600
print("Source:", img.size)

# Visage détecté entre y=232 et y=469. On démarre sous le visage (y=520)
# pour garder le buste et cacher le visage.
TOP = 520
CH = int(round(w * 9 / 16))  # hauteur d'un cadre 16:9 = 647 px
box = (0, TOP, w, TOP + CH)
crop = img.crop(box).resize((1200, 675), Image.LANCZOS)
crop.save(OUT, "JPEG", quality=88)
print("Sauvegarde:", OUT, crop.size)
