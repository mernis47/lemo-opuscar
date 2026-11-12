#!/usr/bin/env python3
"""Ücretsiz, doğal Microsoft (edge-tts) sesiyle seslendirme üretir. Anahtar gerekmez.

Kullanım:  python3 tools/free_voice.py bach_de [--voice de-DE-ConradNeural] [--rate -6%]
Kurulum:   pip install edge-tts

Her satırın "say" (yoksa "text") alanını okur, episodes/<ep>/voice/NN.mp3 yazar.
Sonra:     python3 tools/build_audio.py <ep>  &&  node tools/render_reel.js <ep> --fps 25
Almanca sesler: de-DE-ConradNeural (erkek, derin), de-DE-KillianNeural, de-DE-FlorianMultilingualNeural,
                de-DE-SeraphinaMultilingualNeural (kadın)
"""
import argparse, asyncio, json, os, subprocess

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ap = argparse.ArgumentParser()
ap.add_argument("ep")
ap.add_argument("--voice", default="de-DE-ConradNeural")
ap.add_argument("--rate", default="-6%")
ap.add_argument("--only", help="sadece bu satırlar, örn. 1,5,12")
a = ap.parse_args()

epdir = os.path.join(ROOT, "episodes", a.ep)
lines = json.load(open(os.path.join(epdir, "script.json"), encoding="utf-8"))["lines"]
os.makedirs(os.path.join(epdir, "voice"), exist_ok=True)
only = {int(x) for x in a.only.split(",")} if a.only else None


async def main():
    for i, l in enumerate(lines, 1):
        if only and i not in only:
            continue
        txt = (l.get("say") or l["text"]).replace("–", ",")
        raw = os.path.join(epdir, "voice", f"_raw{i:02d}.mp3")
        out = os.path.join(epdir, "voice", f"{i:02d}.mp3")
        for attempt in range(4):
            try:
                await edge_tts.Communicate(txt, a.voice, rate=a.rate).save(raw)
                break
            except Exception as e:  # ağ hatasında tekrar dene
                print("tekrar", i, e)
                await asyncio.sleep(2 * (attempt + 1))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw,
                        "-af", "highpass=f=70,loudnorm=I=-16:TP=-1.5", "-ar", "44100",
                        "-b:a", "160k", out], check=True)
        os.remove(raw)
        print(f"{i}/{len(lines)}", flush=True)

asyncio.run(main())
