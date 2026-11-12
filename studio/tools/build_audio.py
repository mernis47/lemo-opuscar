#!/usr/bin/env python3
"""Bir bölümün seslendirmesini, ambiyansını, efektlerini ve zaman çizelgesini üretir.

Kullanım:  python3 tools/build_audio.py ep1

- Seslendirme: episodes/<ep>/voice/NN.mp3 (Artlist'te üretilen ya da kendi kaydınız).
  Dosya yoksa geçici olarak espeak-ng Türkçe sesi kullanılır.
- Sahne süreleri seslendirmeye göre hesaplanır ve bölüm script.json'daki
  "target" süresine (saniye) sığdırılır.
- Çıktılar: episodes/<ep>/episode.js, output/<ep>/mix.wav, mix.mp3, <ep>.srt
"""
import json, os, subprocess, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from align import align

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1] if len(sys.argv) > 1 else "ep1"
EPDIR = os.path.join(ROOT, "episodes", ep)
OUT = os.path.join(ROOT, "output", ep)
TMP = os.path.join(OUT, "tmp")
os.makedirs(TMP, exist_ok=True)

script = json.load(open(os.path.join(EPDIR, "script.json"), encoding="utf-8"))
rng = np.random.default_rng(47)

# Anlatıcı: yakın, sıcak; hafif oda yankısı - sanki biri kulağına senin hayatını anlatıyor.
NARRATOR_FX = "aresample=44100,highpass=f=70,aecho=0.85:0.35:35|70:0.12|0.06,loudnorm=I=-17:TP=-2"
# Kuyudan gelen nine sesi: uzak, titrek, derin yankılı.
GRANDMA_FX = ("aresample=44100,highpass=f=220,lowpass=f=3400,vibrato=f=5:d=0.25,"
              "aecho=0.8:0.85:160|380|700:0.5|0.33|0.2,loudnorm=I=-19:TP=-2")
# Hatıradaki nine sesi: eski bant gibi, hafif boğuk.
MEMORY_FX = "aresample=44100,highpass=f=180,lowpass=f=3800,aecho=0.8:0.4:60:0.2,loudnorm=I=-19:TP=-2"


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def read_wav(path):
    with wave.open(path) as w:
        assert w.getsampwidth() == 2
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            data = data.reshape(-1, 2).mean(axis=1)
        assert w.getframerate() == SR, path
    return data


def voice_line(i, line):
    out = os.path.join(TMP, f"{i+1:02d}.wav")
    src = None
    for ext in ("wav", "mp3", "m4a"):
        cand = os.path.join(EPDIR, "voice", f"{i+1:02d}.{ext}")
        if os.path.exists(cand): src = cand; break
    if src is None:  # geçici sentetik ses
        src = os.path.join(TMP, f"{i+1:02d}_raw.wav")
        run(["espeak-ng", "-v", "tr", "-s", "150", "-w", src, line["text"]])
    fx = {"well": GRANDMA_FX, "memory": MEMORY_FX}.get(line.get("fx"), NARRATOR_FX)
    # baştaki/sondaki sessizliği kırp, efekt uygula
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    run(["ffmpeg", "-y", "-i", src, "-af", trim + fx, "-ac", "1", "-ar", str(SR), out])
    return read_wav(out)


# ---------- seslendirme ve zaman çizelgesi ----------
LEAD, PAD, HEAD, TAIL = 0.25, 0.6, 0.6, 1.0
raw = [voice_line(i, l) for i, l in enumerate(script["lines"])]
PAD = script.get("pad_default", PAD)
pads = [l.get("pad", PAD) for l in script["lines"]]
speech = sum(len(v) for v in raw) / SR
fixed = HEAD + TAIL + LEAD * len(raw)
target = script.get("target")
scale, tempo = 1.0, 1.0
if target:
    scale = (target - fixed - speech) / sum(pads)
    if scale < 0.55:  # sığmıyorsa sesi biraz hızlandır
        tempo = min(1.15, speech / (target - fixed - 0.55 * sum(pads)))
        scale = 0.55
    scale = min(scale, script.get("max_stretch", 4.0))
voices, timeline = [], []
t = HEAD
for i, (line, v) in enumerate(zip(script["lines"], raw)):
    if tempo != 1.0:
        src = os.path.join(TMP, f"{i+1:02d}.wav"); dst = os.path.join(TMP, f"{i+1:02d}_t.wav")
        run(["ffmpeg", "-y", "-i", src, "-af", f"atempo={tempo:.4f}", "-ar", str(SR), dst])
        v = read_wav(dst)
    dur = len(v) / SR
    start = t
    end = start + LEAD + dur + pads[i] * scale
    words = [[w, round(start + LEAD + a, 3), round(start + LEAD + b, 3)] for w, a, b in align(v, line["text"], SR)]
    timeline.append({**line, "start": round(start, 3), "end": round(end, 3),
                     "vStart": round(start + LEAD, 3), "vEnd": round(start + LEAD + dur, 3), "words": words})
    voices.append((start + LEAD, v))
    t = end
total = t + TAIL
print(f"konuşma {speech:.1f} sn, boşluk ölçeği {scale:.2f}, tempo {tempo:.3f}")



def movavg(x, k):
    """np.convolve(x, ones(k)/k, 'same') ile aynı, ama O(n) (kümülatif toplam)."""
    x = np.asarray(x, dtype=np.float64)
    c = np.concatenate(([0.0], np.cumsum(x)))
    n = len(x); off = (k - 1) // 2
    i = np.arange(n)
    lo = np.clip(i + off - k + 1, 0, n); hi = np.clip(i + off + 1, 0, n)
    return ((c[hi] - c[lo]) / k).astype(np.float32)

# ---------- ambiyans ve efektler (tamamen sentetik) ----------
n = int(total * SR)
tt = np.arange(n) / SR
mix = np.zeros(n, dtype=np.float32)


# derin uğultu (iki yakın frekans -> ürpertici dalgalanma)
drone = (np.sin(2 * np.pi * 49 * tt) + 0.8 * np.sin(2 * np.pi * 51.5 * tt)
         + 0.25 * np.sin(2 * np.pi * 98.3 * tt)) * 0.035
# rüzgar: filtrelenmiş gürültü, yavaş genlik modülasyonu
noise = rng.standard_normal(n).astype(np.float32)
wind = movavg(noise, 220)
wind = wind * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * tt + 1.3)) * 0.35
amb = script.get("ambient_gain", 0.45 if script.get("music") else 1.0)  # müzik varsa uğultuyu kıs
mix += ((drone + wind) * amb).astype(np.float32)


def add(at, sig, gain=1.0):
    i0 = int(at * SR)
    i1 = min(n, i0 + len(sig))
    if i0 < n:
        mix[i0:i1] += sig[: i1 - i0] * gain


def env(length, attack=0.01, release=0.2):
    m = int(length * SR)
    e = np.ones(m, dtype=np.float32)
    a, r = int(attack * SR), int(release * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e


def tone(freqs, length, **kw):
    x = np.arange(int(length * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * x) for f in freqs) / len(freqs)
    return (s * env(length, **kw)).astype(np.float32)


def sfx_ring(at):
    for k in range(2):
        add(at + k * 2.2, tone([440, 480], 1.1, attack=0.02, release=0.05) *
            (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 20 * np.arange(int(1.1 * SR)) / SR))), 0.12)


def sfx_creak(at):
    L = 1.8
    x = np.arange(int(L * SR)) / SR
    f = 180 + 90 * np.sin(2 * np.pi * 1.3 * x) + 40 * x
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * x))
    add(at, (s * env(L, 0.1, 0.5)).astype(np.float32), 0.05)


def sfx_tick(at, count=6):
    for k in range(count):
        add(at + k, tone([2400, 3100], 0.02, attack=0.001, release=0.015), 0.25)


def sfx_steps(at, count=5):
    for k in range(count):
        s = rng.standard_normal(int(0.12 * SR)).astype(np.float32)
        s = np.convolve(s, np.ones(40) / 40, mode="same") * env(0.12, 0.002, 0.1)
        add(at + k * 0.75, s, 0.9)


def sfx_stone(at):
    L = 2.2
    s = rng.standard_normal(int(L * SR)).astype(np.float32)
    s = np.convolve(s, np.ones(90) / 90, mode="same")
    s *= env(L, 0.3, 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * np.arange(len(s)) / SR))
    add(at, s, 1.6)


def sfx_sting(at):
    L = 3.5
    x = np.arange(int(L * SR)) / SR
    s = (np.sin(2 * np.pi * (55 - 10 * x) * x) * 0.8 +
         0.25 * np.sin(2 * np.pi * 740 * x + 3 * np.sin(2 * np.pi * 7 * x)) +
         0.2 * np.sin(2 * np.pi * 1046 * x))
    add(at, (s * env(L, 0.005, 2.5)).astype(np.float32), 0.45)


def sfx_heart(at, count=6):
    for k in range(count):
        b = at + k * 0.62
        add(b, tone([48, 62], 0.14, attack=0.005, release=0.12), 0.7)
        add(b + 0.2, tone([44, 58], 0.12, attack=0.005, release=0.1), 0.5)


def sfx_scream(at):
    L = 2.4
    x = np.arange(int(L * SR)) / SR
    f = 520 + 380 * x + 60 * np.sin(2 * np.pi * 11 * x)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.5 * np.sin(2.01 * ph) + 0.3 * rng.standard_normal(len(x))
    s = np.convolve(s, np.ones(6) / 6, mode="same")
    add(at, (s * env(L, 0.05, 1.6)).astype(np.float32), 0.16)
    sfx_sting(at + 0.1)


def sfx_drum(at, beats=10):
    # davul (dum-tek) ve uzaktan zurna benzeri ince, burnunda bir ses
    pat = [0, 0.5, 0.75, 1.25, 1.5]
    for k in range(beats):
        b = at + (k // len(pat)) * 1.8 + pat[k % len(pat)]
        boom = tone([58, 72], 0.25, attack=0.003, release=0.22) if k % len(pat) in (0, 3) else tone([180, 240], 0.08, attack=0.002, release=0.07)
        add(b, boom, 0.55 if k % len(pat) in (0, 3) else 0.25)
    L = 3.4
    x = np.arange(int(L * SR)) / SR
    f = 620 + 40 * np.sin(2 * np.pi * 5.5 * x) + 90 * np.round(np.sin(2 * np.pi * 0.9 * x))
    ph = 2 * np.pi * np.cumsum(f) / SR
    z = np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.3
    add(at + 0.3, (z * env(L, 0.2, 1.0)).astype(np.float32), 0.025)


def sfx_beat(at, beats=10):
    # sadece davul vuruşları (zurnasız, temiz)
    pat = [0, 0.5, 0.75, 1.25, 1.5]
    for k in range(beats):
        b = at + (k // len(pat)) * 1.8 + pat[k % len(pat)]
        strong = k % len(pat) in (0, 3)
        add(b, tone([58, 72], 0.25, attack=0.003, release=0.22) if strong else tone([180, 240], 0.08, attack=0.002, release=0.07), 0.55 if strong else 0.22)


def sfx_whoosh(at):
    L = 0.45
    x = np.arange(int(L * SR)) / SR
    nz = rng.standard_normal(len(x)).astype(np.float32)
    nz = np.convolve(nz, np.ones(70) / 70, mode="same") * 3
    e = np.sin(np.pi * x / L) ** 3
    add(at - 0.2, (nz * e).astype(np.float32), 0.15)


def sfx_glass(at):
    L = 1.6
    s_ = rng.standard_normal(int(L * SR)).astype(np.float32) * env(L, 0.001, 1.4) ** 3
    x = np.arange(int(L * SR)) / SR
    ring = sum(np.sin(2 * np.pi * f * x) for f in (2300, 3170, 4410, 5230)) * env(L, 0.001, 1.5) ** 2
    add(at, (s_ * 0.5 + ring * 0.12).astype(np.float32), 0.6)
    sfx_sting(at)


def sfx_knock(at, count=3):
    for k in range(count):
        b = at + 0.9 + k * 0.55 + (0.4 if k == 2 else 0)
        add(b, tone([95, 140, 210], 0.18, attack=0.002, release=0.16), 0.9)


SFX = {"beat": sfx_beat, "whoosh": sfx_whoosh, "knock": sfx_knock, "drum": sfx_drum, "glass": sfx_glass, "ring": sfx_ring, "creak": sfx_creak, "tick": sfx_tick, "steps": sfx_steps,
       "stone": sfx_stone, "sting": sfx_sting, "heart": sfx_heart, "scream": sfx_scream}
def sfx_page(at, L):
    """Defter sayfası çevirme: kağıt hışırtısı + sonda hafif 'flap'. Sadece cümleler arası boşluğa sığdırılır."""
    from scipy.signal import butter as _b, sosfilt as _f
    m = int(L * SR); x = np.arange(m) / SR
    nz = rng.standard_normal(m).astype(np.float32)
    hiss = _f(_b(2, [1800, 7000], btype="band", fs=SR, output="sos"), nz).astype(np.float32)
    grains = np.zeros(m, dtype=np.float32)
    for _ in range(int(L * 60)):
        i = rng.integers(0, max(1, m - 200)); g = rng.standard_normal(120).astype(np.float32) * np.exp(-np.arange(120) / 25)
        grains[i:i + 120] += g * (0.5 + rng.random())
    grains = _f(_b(2, 2500, btype="high", fs=SR, output="sos"), grains).astype(np.float32)
    env = np.sin(np.pi * np.clip(x / L, 0, 1)) ** 1.5 * (0.6 + 0.4 * x / L)
    flap_t = int(0.8 * m); fl = np.zeros(m, dtype=np.float32)
    k = min(m - flap_t, int(0.05 * SR))
    if k > 0:
        fl[flap_t:flap_t + k] = _f(_b(2, 900, btype="low", fs=SR, output="sos"), rng.standard_normal(k).astype(np.float32)) * np.exp(-np.arange(k) / (0.012 * SR))
    sig = (hiss * 0.5 + grains * 0.35) * env + fl * 0.6
    f = int(0.02 * SR); sig[:f] *= np.linspace(0, 1, f); sig[-f:] *= np.linspace(1, 0, f)
    sig = sig / (np.abs(sig).max() + 1e-9)
    add(at, sig.astype(np.float32), script.get("page_gain", 0.16))


if script.get("page_cuts"):
    vs = sorted(voices, key=lambda p: p[0])
    for (a0, v0), (a1, v1) in zip(vs, vs[1:]):
        g0 = a0 + len(v0) / SR + 0.04; g1 = a1 - 0.04   # sadece sessiz aralık
        if g1 - g0 >= 0.18:
            sfx_page(g0, min(0.45, g1 - g0))
elif script.get("whoosh_cuts"):
    for line in timeline[1:]:
        sfx_whoosh(line["start"])
for line in timeline:
    if "sfx" in line:
        offset = {"scream": line["vEnd"] - line["start"] + 0.2, "sting": 1.4}.get(line["sfx"], 0.2)
        SFX[line["sfx"]](line["start"] + offset)

# ---------- gerçekçi efekt yatakları (satır boyunca süren) ----------
# script.json satırında: "beds": ["hooves:6", "hooves:2:walk", "cannon:3", "musket:6", "arrows", "fire"]
from scipy.signal import butter, sosfilt


def filt(x, kind, f):
    return sosfilt(butter(2, f, btype=kind, fs=SR, output="sos"), x).astype(np.float32)


def noise(L):
    return rng.standard_normal(int(L * SR)).astype(np.float32)


def decay(L, tau, attack=0.002):
    x = np.arange(int(L * SR)) / SR
    e = np.exp(-x / tau)
    a = int(attack * SR)
    if a: e[:a] *= np.linspace(0, 1, a)
    return e.astype(np.float32)


def room(sig, delays=(0.09, 0.21, 0.37, 0.6), gains=(0.35, 0.22, 0.14, 0.08)):
    out = np.concatenate([sig, np.zeros(int((max(delays) + 0.1) * SR), dtype=np.float32)])
    for d, g in zip(delays, gains):
        i = int(d * SR)
        out[i:i + len(sig)] += filt(sig, "lowpass", 2500) * g
    return out




def hoof_hit(hard=1.0, walk=False):
    L = 0.09
    th = filt(noise(L), "lowpass", 260) * decay(L, 0.018) * 2.2          # yere vuruş (gümbür)
    cl = filt(filt(noise(L), "highpass", 700), "lowpass", 3200) * decay(L, 0.008) * (0.9 if walk else 0.5)  # nal tıkırtısı
    x = np.arange(len(th)) / SR
    bump = np.sin(2 * np.pi * (90 + 40 * rng.random()) * x) * decay(L, 0.02) * 0.6
    return ((th + cl + bump) * hard).astype(np.float32)


def bed_hooves(t0, t1, count=4, mode="gallop"):
    count = max(1, int(count))
    walk = mode == "walk"
    voices_n = min(count, 8)
    g = 0.55 / np.sqrt(voices_n) * (1.0 if count < 8 else 1.25)
    for h in range(voices_n):
        stride = (1.1 if walk else 0.42) * (0.92 + 0.16 * rng.random())
        pat = [0, 0.25, 0.5, 0.75] if walk else [0, 0.13, 0.24]   # dörtnal: ta-ka-dum
        t = t0 + rng.random() * stride
        while t < t1:
            for k, ph in enumerate(pat):
                at = t + ph * stride + rng.normal(0, 0.004)
                if at < t1:
                    fade = min(1.0, (at - t0) / 0.4, (t1 - at) / 0.5)
                    add(at, hoof_hit(0.8 + 0.3 * rng.random() + (0.25 if k == len(pat) - 1 else 0), walk), g * max(fade, 0))
            t += stride
    if count >= 5:  # çok atlı: toz ve yer titremesi
        L = t1 - t0
        r = filt(noise(L), "lowpass", 120) * env(L, 0.8, 0.8) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.6 * np.arange(int(L * SR)) / SR))
        add(t0, r.astype(np.float32), 0.35 * min(1.0, count / 10))


def cannon_shot(dist=1.0):
    L = 3.0
    b = filt(noise(L), "lowpass", 180) * decay(L, 0.5) * 3.0
    x = np.arange(int(L * SR)) / SR
    sub = np.sin(2 * np.pi * (55 * np.exp(-x * 1.5) + 28) * x) * decay(L, 0.35) * 1.2
    crack = filt(noise(L), "highpass", 900) * decay(L, 0.03) * 0.9 / dist
    s = b + sub + crack
    return room(s, (0.25, 0.6, 1.1, 1.7), (0.4, 0.28, 0.18, 0.1))


def bed_cannon(t0, t1, count=1):
    count = max(1, int(count))
    span = max(0.1, t1 - t0 - 1.2)
    for k in range(count):
        at = t0 + 0.15 + (span * (k + rng.random() * 0.6) / count if count > 1 else 0.1)
        dist = 1.0 if k == 0 else 1.0 + rng.random() * 1.5
        add(at, cannon_shot(dist), 0.42 / dist)


def musket_shot():
    L = 0.6
    c = filt(noise(L), "highpass", 500) * decay(L, 0.025) * 1.6
    body = filt(noise(L), "lowpass", 600) * decay(L, 0.08) * 1.2
    return room(c + body, (0.12, 0.3, 0.55), (0.3, 0.18, 0.1))


def bed_musket(t0, t1, count=6):
    count = max(1, int(count))
    for k in range(count):
        at = t0 + 0.2 + rng.random() * max(0.1, t1 - t0 - 0.8)
        add(at, musket_shot(), (0.35 + 0.2 * rng.random()))


def arrow_whoosh():
    L = 0.55
    x = np.arange(int(L * SR)) / SR
    nz = noise(L)
    lo = filt(nz, "bandpass", [900, 2400])
    e = np.sin(np.pi * np.clip(x / L, 0, 1)) ** 2
    return (lo * e * 0.9).astype(np.float32)


def bed_arrows(t0, t1, count=3):
    count = max(1, int(count))
    for v in range(count):  # yay salvoları
        vt = t0 + 0.3 + (t1 - t0 - 1.0) * v / max(1, count)
        for a in range(10):
            add(vt + rng.random() * 0.35, arrow_whoosh(), 0.09)
        for a in range(6):  # saplanma
            add(vt + 0.6 + rng.random() * 0.4, filt(noise(0.06), "lowpass", 900) * decay(0.06, 0.012), 0.25)


def bed_fire(t0, t1, count=1):
    L = t1 - t0
    m = int(L * SR)
    roar = filt(noise(L), "lowpass", 400) * env(L, 0.6, 0.8) * 0.6
    cr = np.zeros(m, dtype=np.float32)
    for _ in range(int(L * 18)):
        i = rng.integers(0, max(1, m - 800))
        p = filt(noise(0.012), "highpass", 1500) * decay(0.012, 0.002) * (0.3 + rng.random())
        cr[i:i + len(p)] += p
    add(t0, (roar + cr * env(L, 0.3, 0.6)).astype(np.float32), 0.45)


BEDS = {"hooves": bed_hooves, "cannon": bed_cannon, "musket": bed_musket, "arrows": bed_arrows, "fire": bed_fire}
for line in timeline:
    for b in line.get("beds", []):
        parts = b.split(":")
        args = [float(parts[1])] if len(parts) > 1 else []
        if len(parts) > 2: args.append(parts[2])
        BEDS[parts[0]](line["start"], line["end"] + 0.15, *args)

for at, v in voices:
    add(at, v, 0.9)


# ---------- fırtına yatağı (satır başına "wind": 0..1) ----------
# Boğuk (alçak geçiren filtreli) rüzgar + yavaş esintiler; konuşma sırasında kısılır, cızırtı yok.
if any("wind" in l for l in timeline):
    lv = np.zeros(n, dtype=np.float32)
    for l in timeline:
        i0 = int(l["start"] * SR); i1 = min(n, int((l["end"] + 0.15) * SR))
        lv[i0:i1] = l.get("wind", 0.0)
    k = int(1.5 * SR)
    lv = movavg(lv, k)
    base = filt(filt(rng.standard_normal(n).astype(np.float32), "lowpass", 500), "lowpass", 700)
    howl = filt(filt(rng.standard_normal(n).astype(np.float32), "highpass", 250), "lowpass", 900)
    gust = (0.55 + 0.45 * np.sin(2 * np.pi * 0.09 * tt + 0.7) * np.sin(2 * np.pi * 0.023 * tt + 2.1)).astype(np.float32)
    storm = (base * 1.0 + howl * 0.35 * gust) * gust
    storm = storm / (np.abs(storm).max() + 1e-9)
    wd = np.ones(n, dtype=np.float32)
    for at, v in voices:
        i0 = int(at * SR); i1 = min(n, i0 + len(v)); wd[i0:i1] = 0.4
    kk = int(0.4 * SR)
    wd = movavg(wd, kk)
    mix += storm * lv * wd * script.get("wind_gain", 0.22)

# ---------- müzik (isteğe bağlı) ----------
# script.json: "music": [{"file": "01.wav", "from": "title"}, ...]  -> her parça o sahnede başlar,
# bir sonraki parça gelene kadar (gerekirse döngüyle) çalar; geçişler yumuşak; konuşmada ses kısılır.
if script.get("music"):
    starts = {l["scene"]: l["start"] for l in timeline}
    cues = script["music"]
    bed = np.zeros(n, dtype=np.float32)
    XF = 4.0
    for k, cue in enumerate(cues):
        t0 = starts[cue["from"]]
        t1 = starts[cues[k + 1]["from"]] if k + 1 < len(cues) else total
        if not os.path.exists(os.path.join(EPDIR, "music", cue["file"])):
            print("müzik yok, atlanıyor:", cue["file"]); continue
        mp = os.path.join(TMP, f"music_{k}.wav")
        run(["ffmpeg", "-y", "-i", os.path.join(EPDIR, "music", cue["file"]), "-ac", "1", "-ar", str(SR),
             "-af", "loudnorm=I=-24:TP=-3", mp])
        m = read_wav(mp)
        need = int((t1 - t0 + XF) * SR)
        seg = np.zeros(need, dtype=np.float32)
        pos, xf = 0, int(XF * SR)
        while pos < need:  # döngü + çapraz geçiş
            chunk = m[: need - pos].copy()
            if pos > 0:
                r = min(xf, len(chunk))
                chunk[:r] *= np.linspace(0, 1, r)
                seg[pos:pos + r] *= np.linspace(1, 0, r)
            seg[pos:pos + len(chunk)] += chunk
            pos += len(m) - xf
        fi = int(XF * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fi:] *= np.linspace(1, 0, fi)
        i0 = int(t0 * SR); i1 = min(n, i0 + len(seg))
        bed[i0:i1] += seg[: i1 - i0]
    # konuşurken müziği kıs (ducking)
    duck = np.ones(n, dtype=np.float32)
    for at, v in voices:
        i0 = int(at * SR); i1 = min(n, i0 + len(v))
        duck[i0:i1] = 0.45
    k = int(0.35 * SR)
    duck = movavg(duck, k)
    mix += bed * duck * script.get("music_gain", 0.55)

# yumuşak sınırlayıcı
mix = np.tanh(mix * 1.1) * 0.92
fade = int(1.0 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)

wav_path = os.path.join(OUT, "mix.wav")
with wave.open(wav_path, "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
run(["ffmpeg", "-y", "-i", wav_path, "-b:a", "160k", os.path.join(OUT, "mix.mp3")])


# ---------- altyazılar ----------
def ts(s):
    h, rem = divmod(s, 3600); m, sec = divmod(rem, 60)
    ms = int(round((sec % 1) * 1000)) % 1000
    return f"{int(h):02d}:{int(m):02d}:{int(sec):02d},{ms:03d}"


with open(os.path.join(OUT, f"{ep}.srt"), "w", encoding="utf-8") as f:
    for i, l in enumerate(timeline, 1):
        f.write(f"{i}\n{ts(l['vStart'])} --> {ts(l['end'] - 0.15)}\n{l['text']}\n\n")

meta = {k: v for k, v in script.items() if k != "lines"}
meta.update({"duration": round(total, 3), "audio": f"../../output/{ep}/mix.mp3", "lines": timeline})
with open(os.path.join(EPDIR, "episode.js"), "w", encoding="utf-8") as f:
    f.write("window.EPISODE = " + json.dumps(meta, ensure_ascii=False, indent=1) + ";\n")
print(f"{ep}: {len(timeline)} sahne, {total:.1f} sn ({int(total//60)}:{int(total%60):02d})")
