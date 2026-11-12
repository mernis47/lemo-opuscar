#!/usr/bin/env python3
"""Artlist'te üretilen seslendirmeleri oturum kaydından bulup indirir.
Kullanım: python3 tools/fetch_voices.py <oturum.jsonl>
Her script.json satırının metni, üretilen seslendirmenin metniyle eşleştirilir ve
episodes/<ep>/voice/NN.mp3 olarak kaydedilir."""
import json, os, re, sys, subprocess, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
log = sys.argv[1]
uses, gen_of_use, urls = {}, {}, {}
url_re = re.compile(r'"assetUrl":"([^"]+)","generationId":"([0-9a-f-]+)"')
for raw in open(log, encoding="utf-8"):
    try: ev = json.loads(raw)
    except Exception: continue
    msg = ev.get("message") or {}
    content = msg.get("content")
    if not isinstance(content, list): continue
    for part in content:
        if part.get("type") == "tool_use" and part.get("name", "").endswith("generate_voiceover"):
            uses[part["id"]] = part["input"].get("text", "")
        if part.get("type") == "tool_result":
            txt = json.dumps(part.get("content"))
            txt = txt.replace('\\"', '"').replace('\\\\', '\\')
            m = re.search(r'"generationId":"([0-9a-f-]+)"', txt)
            if part.get("tool_use_id") in uses and m and '"status":"queued"' in txt:
                gen_of_use[part["tool_use_id"]] = m.group(1)
            for u, g in url_re.findall(txt):
                urls[g] = u
text2gen = {}
for uid, text in uses.items():
    if uid in gen_of_use: text2gen[text] = gen_of_use[uid]  # son üretim geçerli
missing = []
for sp in sorted(glob.glob(os.path.join(ROOT, "episodes", "*", "script.json"))):
    ep = json.load(open(sp, encoding="utf-8"))
    vdir = os.path.join(os.path.dirname(sp), "voice"); os.makedirs(vdir, exist_ok=True)
    for i, l in enumerate(ep["lines"], 1):
        out = os.path.join(vdir, f"{i:02d}.mp3")
        g = text2gen.get(l.get("say", l["text"]))
        if os.path.exists(out) and os.path.getsize(out) > 1000 and os.path.exists(out + ".id") and open(out + ".id").read() == g:
            continue
        if not g or g not in urls:
            missing.append(f'{ep["id"]}#{i} {"(üretilmedi)" if not g else "(bekliyor " + g + ")"}'); continue
        subprocess.run(["curl", "-sS", "--retry", "3", "-o", out, urls[g]], check=True)
        open(out + ".id", "w").write(g)
print("eksik:", len(missing)); print("\n".join(missing))
