"""Seslendirme ile metni hizalar (ASR modeli olmadan).

Yöntem: sesteki duraklamaları (sessizlik aralıklarını) bulur, metni noktalama işaretlerinden
parçalara böler ve parça sınırlarını en uygun duraklamalara oturtur (dinamik programlama).
Her parçanın içinde kelimeler hece sayısına göre dağıtılır; parça içindeki kısa
duraklamalar da kelime sınırı olarak kullanılır.
"""
import re
import numpy as np

VOWELS = "aeıioöuüâîûäAEIIOÖUÜÂÎÛÄyY"
PUNCT = re.compile(r"[.,:;!?…]+[\"'”’)]*$")


def syllables(w):
    core = re.sub(r"[^\w]", "", w)
    if not core:
        return 1.0
    if core.isdigit():  # "1644" -> bin altı yüz kırk dört
        return 1.6 * len(core)
    groups = re.findall(r"[aeıioöuüâîûäAEIİOÖUÜÂÎÛÄ]+", core)
    return max(1, len(groups)) + 0.15 * len(core) / 4


def frames(v, sr, hop=0.01):
    n = int(hop * sr)
    m = len(v) // n
    rms = np.sqrt((v[: m * n].reshape(m, n) ** 2).mean(axis=1) + 1e-12)
    return rms, hop


def pauses(v, sr, min_len=0.09, rel_db=-32):
    rms, hop = frames(v, sr)
    ref = np.percentile(rms, 95)
    sil = rms < ref * 10 ** (rel_db / 20)
    out, i = [], 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]:
                j += 1
            a, b = i * hop, j * hop
            if b - a >= min_len and a > 0.05 and b < len(sil) * hop - 0.05:
                out.append((a, b))
            i = j
        else:
            i += 1
    return out


def align(v, text, sr):
    """-> [(kelime, başlangıç, bitiş)] (saniye, klibin başına göre)"""
    T = len(v) / sr
    words = text.split()
    if not words:
        return []
    syl = [syllables(w) for w in words]
    # parçalar (noktalamada böl)
    phrases, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if PUNCT.search(w):
            phrases.append(cur); cur = []
    if cur:
        phrases.append(cur)
    tot = sum(syl)
    # her parça sınırının beklenen zamanı
    acc, exp = 0.0, []
    for p in phrases[:-1]:
        acc += sum(syl[i] for i in p)
        exp.append(acc / tot * T)
    P = pauses(v, sr)
    k, n = len(exp), len(P)
    # DP: sınır j -> duraklama i (ya da duraklamasız, beklenen zamanda)
    INF = 1e9
    best = [[INF] * (n + 1) for _ in range(k + 1)]  # best[j][i]: ilk j sınır, son kullanılan duraklama < i
    choice = [[None] * (n + 1) for _ in range(k + 1)]
    for i in range(n + 1):
        best[0][i] = 0.0
    for j in range(1, k + 1):
        e = exp[j - 1]
        for i in range(n + 1):
            # seçenek 1: duraklama kullanma
            c0 = best[j - 1][i] + 1.2
            bi, bc = None, c0
            # seçenek 2: i'den önceki bir duraklamayı kullan
            for q in range(i):
                if best[j - 1][q] >= INF:
                    continue
                a, b = P[q]
                mid = (a + b) / 2
                c = best[j - 1][q] + abs(mid - e) / max(T, 1e-3) * 6 - min(b - a, 0.7) * 2
                if c < bc:
                    bc, bi = c, q
            best[j][i] = bc
            choice[j][i] = bi
            if i > 0 and best[j][i - 1] < best[j][i]:
                best[j][i] = best[j][i - 1]; choice[j][i] = ('skip',)
    # geri izleme
    bounds = [None] * k
    i, j = n, k
    while j > 0:
        ch = choice[j][i]
        if ch == ('skip',):
            i -= 1; continue
        if ch is None:
            bounds[j - 1] = None
        else:
            bounds[j - 1] = P[ch]; i = ch
        j -= 1
    # sınırları zaman aralıklarına çevir
    segs, t0 = [], 0.0
    for j, p in enumerate(phrases):
        if j < k:
            bnd = bounds[j]
            if bnd is None:
                e = exp[j]
                end, nxt = e, e
            else:
                end, nxt = bnd
            end = max(end, t0 + 0.05)
        else:
            end, nxt = T, T
        segs.append((p, t0, end))
        t0 = nxt
    # parça içi: uzun iç duraklamaları kelime sınırına oturt, kalanları hece oranında dağıt
    P2 = pauses(v, sr, min_len=0.18, rel_db=-30)
    out = []

    def spread(idx, a, b):
        st = sum(syl[i] for i in idx); t = a
        for n_, i in enumerate(idx):
            we = b if n_ == len(idx) - 1 else t + (b - a) * syl[i] / st
            out.append((words[i], round(t, 3), round(we, 3))); t = we

    for p, a, b in segs:
        inner = [(x, y) for x, y in P2 if a + 0.1 < x and y < b - 0.1]
        cuts = []  # (kelime sınırı indeksi, duraklama)
        if inner and len(p) > 1:
            st = sum(syl[i] for i in p); acc = 0; bt = []
            for i in p[:-1]:
                acc += syl[i]; bt.append(a + (b - a) * acc / st)
            used = set()
            for x, y in inner:
                m = (x + y) / 2
                j = min(range(len(bt)), key=lambda q: abs(bt[q] - m))
                if j not in used and abs(bt[j] - m) < 1.2:
                    used.add(j); cuts.append((j, x, y))
            cuts.sort()
            # monoton olmayanları at
            mono, last = [], -1
            for c in cuts:
                if c[1] > last: mono.append(c); last = c[2]
            cuts = mono
        s0, t0 = 0, a
        for j, x, y in cuts:
            spread(p[s0:j + 1], t0, x); s0, t0 = j + 1, y
        spread(p[s0:], t0, b)
    return out
