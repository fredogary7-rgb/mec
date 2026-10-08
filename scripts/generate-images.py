# -*- coding: utf-8 -*-
"""Génère les images raster (PNG/ICO) du site Mec Calme.
Usage : python scripts/generate-images.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")

GOLD_TOP = (240, 199, 94)     # #f0c75e
GOLD_BOTTOM = (138, 111, 31)  # #8a6f1f
GOLD = (212, 175, 55)         # #d4af37
DARK = (14, 17, 22)           # #0e1116
INK = (20, 16, 10)            # #14100a
WHITE = (238, 241, 246)       # #eef1f6
MUTED = (152, 161, 176)       # #98a1b0


def load_font(size):
    candidates = [
        r"C:\Windows\Fonts\georgiab.ttf",
        r"C:\Windows\Fonts\georgia.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\timesbd.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def gradient_bg(w, h, top=GOLD_TOP, bottom=GOLD_BOTTOM):
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def round_corners(img, radius):
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def draw_centered(draw, size, text, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), text, fill=fill, font=font)


def make_mc_icon(size, path, text="MC"):
    img = gradient_bg(size, size)
    draw = ImageDraw.Draw(img)
    font = load_font(int(size * 0.52))
    draw_centered(draw, size, text, font, INK)
    img = round_corners(img, int(size * 0.22))
    img.save(path)
    print("OK", os.path.basename(path), img.size)


def make_ico(sizes=(16, 32, 48), name="favicon.ico"):
    imgs = []
    for s in sizes:
        img = gradient_bg(s, s)
        draw = ImageDraw.Draw(img)
        font = load_font(int(s * 0.52))
        draw_centered(draw, s, "MC", font, INK)
        imgs.append(img.convert("RGBA"))
    imgs[-1].save(os.path.join(IMG, name), sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    print("OK", name, sizes)


def make_og(size=(1200, 630), name="og-default.png"):
    w, h = size
    img = Image.new("RGB", (w, h), DARK)
    draw = ImageDraw.Draw(img)
    draw.ellipse([int(w * 0.78), -int(h * 0.25), int(w * 1.18), int(h * 0.4)], fill=(40, 46, 58))
    draw.ellipse([-int(w * 0.12), int(h * 0.72), int(w * 0.38), int(h * 1.2)], fill=(32, 38, 48))
    draw.rectangle([90, 210, 190, 222], fill=GOLD)
    draw.text((90, 240), "Mec Calme", fill=GOLD, font=load_font(96))
    draw.text((90, 380), "L'homme calme attire sans parler fort.", fill=WHITE, font=load_font(44))
    draw.text((90, 465), "Confiance | Séduction subtile | Mindset  ·  Lomé, Togo", fill=MUTED, font=load_font(30))
    img.save(os.path.join(IMG, name))
    print("OK", name, img.size)


if __name__ == "__main__":
    os.makedirs(IMG, exist_ok=True)
    make_mc_icon(48, os.path.join(IMG, "favicon.png"))
    make_mc_icon(180, os.path.join(IMG, "apple-touch-icon.png"))
    make_mc_icon(512, os.path.join(IMG, "logo.png"))
    make_ico()
    make_og()
    print("Terminé.")
