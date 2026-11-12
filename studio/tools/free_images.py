#!/usr/bin/env python3
"""Ücretsiz görsel üretimi (Pollinations, anahtar gerekmez) – Artlist kredisi bitince kullanılır.

Kullanım:  python3 tools/free_images.py <ep> [--force] [--only 3,7]
Kurulum:   pip install requests pillow

Her satırda "prompt" (sahne açıklaması, İngilizce) ve "img" (örn. img/B05.jpg) olmalı.
Stil satırı brand/stil_prompt.txt ile aynıdır ve her isteme otomatik eklenir.
Var olan görselleri atlar (--force ile yeniden üretir). Seed sabit: aynı bölüm aynı görünür.
Ücretsiz servis yavaş ve sınırlı olabilir; istekler arasında bekler, hata olursa tekrar dener.
"""
import argparse, io, json, os, time, urllib.parse

import requests
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = ("16:9 widescreen moody hand-drawn comic illustration, clean ink outlines, painterly "
         "shading, cinematic lighting, muted desaturated palette, dark atmosphere, realistic "
         "facial likeness. Bottom fifth darker for subtitles. No text, no letters, no watermark.")

ap = argparse.ArgumentParser()
ap.add_argument("ep")
ap.add_argument("--force", action="store_true")
ap.add_argument("--only")
ap.add_argument("--model", default="flux")
ap.add_argument("--wait", type=float, default=16, help="istekler arası saniye")
a = ap.parse_args()

epdir = os.path.join(ROOT, "episodes", a.ep)
lines = json.load(open(os.path.join(epdir, "script.json"), encoding="utf-8"))["lines"]
only = {int(x) for x in a.only.split(",")} if a.only else None
os.makedirs(os.path.join(epdir, "img"), exist_ok=True)

for i, l in enumerate(lines, 1):
    if only and i not in only:
        continue
    if not l.get("prompt") or not l.get("img"):
        continue
    out = os.path.join(epdir, l["img"])
    if os.path.exists(out) and not a.force:
        continue
    q = urllib.parse.quote(f"{l['prompt']} {STYLE}")
    url = (f"https://image.pollinations.ai/prompt/{q}?width=1344&height=768"
           f"&model={a.model}&seed={1000 + i}&nologo=true&private=true")
    for attempt in range(5):
        try:
            r = requests.get(url, timeout=180)
            if r.ok and r.headers.get("content-type", "").startswith("image"):
                img = Image.open(io.BytesIO(r.content)).convert("RGB").resize((1920, 1080), Image.LANCZOS)
                img.save(out, quality=92)
                print(f"{i}/{len(lines)} ok", flush=True)
                break
            print(f"{i}: HTTP {r.status_code}, tekrar", flush=True)
        except Exception as e:
            print(f"{i}: {e}, tekrar", flush=True)
        time.sleep(a.wait * (attempt + 1))
    time.sleep(a.wait)
