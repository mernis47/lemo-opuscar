// Zaman çizelgesine göre tek bir kareyi çizer. Hem tarayıcı oynatıcısı hem video render'ı kullanır.
(function (G) {
  const { W, H, clamp, range, filmFX, subtitle } = G.D;

  // Ekrandaki yazıların dil çevirisi: episode "labels" haritası (tam eşleşme, sonra sonek eşleşmesi).
  G.LABELS = null;
  const trLabel = (s) => {
    const L = G.LABELS;
    if (!L || typeof s !== 'string') return s;
    if (L[s] !== undefined) return L[s];
    for (const k in L) if (k[0] === '~' && s.endsWith(k.slice(1))) return s.slice(0, s.length - k.length + 1) + L[k];
    return s;
  };
  G.trLabel = trLabel;
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype._trPatched) {
    const P = CanvasRenderingContext2D.prototype;
    for (const m of ['fillText', 'strokeText', 'measureText']) {
      const orig = P[m];
      P[m] = function (txt, ...rest) { return orig.call(this, trLabel(txt), ...rest); };
    }
    P._trPatched = true;
  }

  function findLine(ep, time) {
    const ls = ep.lines;
    for (let i = 0; i < ls.length; i++) if (time < ls[i].end) return i;
    return ls.length - 1;
  }

  // opts: { subs: 'on' | 'none', frame }
  function renderFrame(c, ep, time, opts = {}) {
    if (ep.style === 'dynamic') return renderDynamic(c, ep, time, opts);
    c.save();
    c.setTransform(c.canvas.width / W, 0, 0, c.canvas.height / H, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (time < ep.lines[0].start) { c.restore(); return; }
    const i = findLine(ep, time);
    const L = ep.lines[i];
    const dur = L.end - L.start;
    const t = Math.max(0, time - L.start);
    const p = clamp(t / dur);
    const scene = G.SCENES[L.scene];

    c.save();
    // yavaş "nefes alan" kamera
    const z = 1.02 + 0.03 * p;
    c.translate(W / 2, H / 2); c.scale(z, z);
    c.translate(-W / 2 + Math.sin(time * 0.3) * 4, -H / 2 + Math.cos(time * 0.23) * 3);
    if (scene) scene(c, p, t, L); else { c.fillStyle = '#300'; c.fillRect(0, 0, W, H); }
    c.restore();

    // sahne geçişi: kısa karartma
    const fade = Math.max(1 - clamp(t / 0.35), 1 - clamp((L.end - time) / 0.35));
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, W, H); }

    filmFX(c, opts.frame != null ? opts.frame : Math.floor(time * 24), { grain: 0.06 });

    const subs = opts.subs || 'on';
    if (subs !== 'none' && L.scene !== 'title' && L.scene !== 'next' && L.scene !== 'end') {
      const a = range(time, L.vStart - 0.15, L.vStart + 0.15) * (1 - range(time, L.end - 0.45, L.end - 0.15));
      subtitle(c, L.text, a, { color: L.voice === 'grandma' ? '#bfe3d6' : '#f2ead8', size: 36 });
    }
    c.restore();
  }


  // ================= DİNAMİK MOD =================
  // Sürekli kamera hareketi, flaşlı/kaydırmalı geçişler, sahne içi alt planlar ve kelime kelime altyazı.
  const easeIO = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  function camera(c, i, p, time) {
    const moves = ['in', 'right', 'out', 'left', 'in', 'up'];
    const m = moves[i % moves.length];
    const e = easeIO(clamp(p));
    let z = 1.08, dx = 0, dy = 0;
    if (m === 'in') z = 1.0 + 0.16 * e;
    if (m === 'out') z = 1.16 - 0.14 * e;
    if (m === 'right') { z = 1.12; dx = lerpD(-40, 40, e); }
    if (m === 'left') { z = 1.12; dx = lerpD(40, -40, e); }
    if (m === 'up') { z = 1.1; dy = lerpD(30, -30, e); }
    // el kamerası titremesi
    dx += Math.sin(time * 1.7) * 3 + Math.sin(time * 4.3) * 1.2;
    dy += Math.cos(time * 1.3) * 2.5 + Math.sin(time * 3.7) * 1;
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2 + dx, -H / 2 + dy);
  }
  const lerpD = (a, b, t) => a + (b - a) * t;

  function wordTimes(L) {
    if (L._wt) return L._wt;
    const words = L.text.split(/\s+/).filter(Boolean);
    const wts = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2 + (/[.,:;!?…]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = L.vStart; const out = [];
    words.forEach((w, k) => { const d = (L.vEnd - L.vStart) * wts[k] / tot; out.push({ w, a: acc, b: acc + d }); acc += d; });
    // 2-4 kelimelik gruplar (noktalamada böl)
    const groups = []; let g = [];
    out.forEach((o) => { g.push(o); if (g.length >= 4 || /[.,:;!?…]$/.test(o.w)) { groups.push(g); g = []; } });
    if (g.length) groups.push(g);
    L._wt = groups; return groups;
  }

  function kinetic(c, L, time) {
    if (time < L.vStart - 0.05 || time > L.end - 0.05) return;
    const groups = wordTimes(L);
    let gi = groups.findIndex(g => time < g[g.length - 1].b + 0.05);
    if (gi < 0) gi = groups.length - 1;
    const g = groups[gi];
    c.save();
    c.font = `900 54px "DejaVu Sans", Arial, sans-serif`;
    c.textBaseline = 'middle';
    const loc = { de: 'de-DE', en: 'en-US', zh: 'zh-CN' }[(window.EPISODE || {}).lang] || 'tr-TR';
    const up = (s) => s.toLocaleUpperCase(loc);
    const sp = 30;
    const widths = g.map(o => c.measureText(up(o.w)).width * 1.15); // aktif kelime büyüyünce çakışmasın
    let total = widths.reduce((a, b) => a + b, 0) + sp * (g.length - 1);
    let scaleAll = total > W * 0.9 ? (W * 0.9) / total : 1;
    let x = W / 2 - (total * scaleAll) / 2;
    const y = H - 92;
    const gStart = g[0].a;
    const pop = clamp((time - gStart) / 0.12);
    g.forEach((o, k) => {
      const active = time >= o.a && time < o.b + 0.04;
      const done = time >= o.b;
      const ww = widths[k] * scaleAll;
      c.save();
      c.translate(x + ww / 2, y + (1 - pop) * 18);
      const sc = scaleAll * (active ? 1.14 : 1) * Math.min(1, (W * 0.9) / (widths[k] / 1.15 * 1.14));
      c.scale(sc, sc);
      c.textAlign = 'center';
      c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,0.95)';
      c.strokeText(up(o.w), 0, 0);
      c.fillStyle = active ? '#ffd23a' : (done ? '#ffffff' : 'rgba(255,255,255,0.88)');
      c.globalAlpha = pop;
      c.fillText(up(o.w), 0, 0);
      c.restore();
      x += ww + sp * scaleAll;
    });
    c.restore();
  }

  function renderDynamic(c, ep, time, opts) {
    G.LABELS = ep.labels || null;
    c.save();
    c.setTransform(c.canvas.width / W, 0, 0, c.canvas.height / H, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const i = findLine(ep, Math.max(time, ep.lines[0].start));
    const L = ep.lines[i];
    const dur = L.end - L.start;
    const t = Math.max(0, time - L.start);
    const p = clamp(t / dur);
    let scene = G.SCENES[L.scene];
    let sp = p, st = t, sub = 0;
    if (Array.isArray(scene)) { // sahne içi alt planlar (hızlı kesmeler)
      const n = scene.length; sub = Math.min(n - 1, Math.floor(p * n));
      sp = p * n - sub; st = sp * dur / n; scene = scene[sub];
    }
    c.save();
    camera(c, i * 3 + sub, sp, time);
    // geçiş: yeni plan yandan kayarak girer
    const tIn = (Array.isArray(G.SCENES[L.scene]) ? st : t);
    const slide = 1 - easeIO(clamp(tIn / 0.22));
    if (slide > 0) c.translate(((i + sub) % 2 ? -1 : 1) * slide * 160, 0);
    if (scene) scene(c, sp, st, L); else { c.fillStyle = '#300'; c.fillRect(0, 0, W, H); }
    c.restore();
    // flaş
    const fl = Math.max(0, 1 - tIn / 0.1) * 0.55;
    if (fl > 0) { c.fillStyle = `rgba(255,250,235,${fl})`; c.fillRect(0, 0, W, H); }
    // ince sinematik şeritler
    c.fillStyle = '#000'; c.fillRect(0, 0, W, 22); c.fillRect(0, H - 22, W, 22);
    filmFX(c, opts.frame != null ? opts.frame : Math.floor(time * 24), { grain: 0.045, vignette: 0.6, flicker: 0.02 });
    if ((opts.subs || 'on') !== 'none' && L.scene !== 'title') kinetic(c, L, time);
    c.restore();
  }

  G.renderFrame = renderFrame;
})(typeof window !== 'undefined' ? window : globalThis);
