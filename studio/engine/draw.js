// Ortak 2D çizim yardımcıları — tüm bölümler bunları kullanır.
(function (G) {
  const TAU = Math.PI * 2;
  const W = 1280, H = 720;

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const range = (p, a, b) => smooth((p - a) / (b - a)); // p, a..b arasında 0->1

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sky(c, top, bottom, h = H) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, h);
  }

  function stars(c, n, seed, t, alpha = 0.8, maxY = H * 0.6) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * maxY, s = r() * 1.6 + 0.3;
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + i);
      c.fillStyle = `rgba(230,225,210,${alpha * tw * (0.3 + r() * 0.7)})`;
      c.fillRect(x, y, s, s);
    }
  }

  function moon(c, x, y, r, glow = 0.35, color = '#e9e2c8') {
    const g = c.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
    g.addColorStop(0, `rgba(230,220,190,${glow})`);
    g.addColorStop(1, 'rgba(230,220,190,0)');
    c.fillStyle = g; c.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    c.fillStyle = color;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(120,110,90,0.18)';
    c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, TAU); c.fill();
    c.beginPath(); c.arc(x + r * 0.35, y + r * 0.3, r * 0.15, 0, TAU); c.fill();
  }

  function hills(c, baseY, amp, color, seed, freq = 1, offset = 0) {
    const r = rng(seed);
    const ph = [r() * TAU, r() * TAU, r() * TAU];
    c.fillStyle = color;
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const u = (x + offset) / W * freq;
      const y = baseY - amp * (0.55 * Math.sin(u * 3.1 + ph[0]) + 0.3 * Math.sin(u * 7.3 + ph[1]) + 0.15 * Math.sin(u * 17 + ph[2]));
      c.lineTo(x, y);
    }
    c.lineTo(W, H); c.closePath(); c.fill();
  }

  // Mardin tarzı sarı taş ev (kemerli kapı/pencere)
  function stoneHouse(c, x, y, w, h, o = {}) {
    const col = o.color || '#b8945a';
    c.fillStyle = col; c.fillRect(x, y - h, w, h);
    // taş sıraları
    c.strokeStyle = o.line || 'rgba(60,40,20,0.25)'; c.lineWidth = 1;
    for (let yy = y - h + 10; yy < y; yy += 12) {
      c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
    }
    // düz çatı korkuluğu
    c.fillStyle = o.dark || 'rgba(0,0,0,0.25)'; c.fillRect(x - 3, y - h - 6, w + 6, 6);
    const lit = o.lit || 0;
    const nWin = Math.max(1, Math.floor(w / 46));
    for (let i = 0; i < nWin; i++) {
      const wx = x + (i + 0.5) * (w / nWin) - 9, wy = y - h + h * 0.28;
      archShape(c, wx, wy, 18, 26);
      c.fillStyle = i === o.litIndex ? `rgba(255,190,90,${0.4 + lit * 0.6})` : 'rgba(20,14,10,0.85)';
      c.fill();
    }
    if (o.door !== false) {
      archShape(c, x + w / 2 - 14, y - 44, 28, 44);
      c.fillStyle = o.doorColor || 'rgba(25,16,10,0.95)'; c.fill();
    }
  }

  function archShape(c, x, y, w, h) {
    c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x, y + w / 2);
    c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    c.lineTo(x + w, y + h); c.closePath();
  }

  // İnsan silueti. walk: adım fazı (radyan), s: ölçek (1 => ~170px boy)
  function person(c, x, y, s = 1, o = {}) {
    const col = o.color || '#0b0908';
    const ph = o.walk || 0, amp = o.walk == null ? 0 : 0.42;
    c.save(); c.translate(x, y); c.scale(s * (o.facing || 1), s);
    c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round';
    const bob = Math.abs(Math.sin(ph)) * 4 * (amp ? 1 : 0);
    // bacaklar
    c.lineWidth = 13;
    leg(c, 0, -80 - bob, Math.sin(ph) * amp);
    leg(c, 0, -80 - bob, -Math.sin(ph) * amp);
    // gövde (ceket)
    c.beginPath();
    c.moveTo(-20, -82 - bob); c.lineTo(-24, -140 - bob); c.quadraticCurveTo(0, -152 - bob, 24, -140 - bob);
    c.lineTo(20, -82 - bob); c.closePath(); c.fill();
    // kollar
    c.lineWidth = 11;
    const arm = o.arm != null ? o.arm : -Math.sin(ph) * amp * 0.8;
    limb(c, 0, -138 - bob, arm, 58, o.armUp);
    limb(c, 0, -138 - bob, -arm, 58, o.armUp2);
    // kafa
    c.save(); c.translate(0, -160 - bob); c.rotate(o.tilt || 0);
    c.beginPath(); c.ellipse(0, 0, 15, 18, 0, 0, TAU); c.fill();
    c.restore();
    if (o.phone) {
      c.fillStyle = `rgba(150,200,255,${o.phone})`;
      c.fillRect(16, -170 - bob, 6, 11);
    }
    c.restore();
  }
  function leg(c, x, y, a) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 78); c.stroke();
    c.restore();
  }
  function limb(c, x, y, a, len, up) {
    c.save(); c.translate(x, y); c.rotate(up != null ? up : a);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, len); c.stroke();
    c.restore();
  }

  // Yaşlı nine: kambur, başörtülü (kofî/şal), bastonlu
  function grandma(c, x, y, s = 1, o = {}) {
    const col = o.color || '#0b0908';
    c.save(); c.translate(x, y); c.scale(s * (o.facing || 1), s);
    c.fillStyle = col; c.strokeStyle = col;
    // uzun etek / entari
    c.beginPath();
    c.moveTo(-34, 0); c.lineTo(-22, -90); c.quadraticCurveTo(0, -120, 20, -96); c.lineTo(32, 0); c.closePath(); c.fill();
    // kambur sırt
    c.beginPath(); c.ellipse(-4, -104, 24, 22, -0.4, 0, TAU); c.fill();
    // başörtüsü sarkan
    c.beginPath(); c.moveTo(4, -128); c.quadraticCurveTo(-26, -120, -30, -80); c.lineTo(-10, -96); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(10, -128, 15, 16, 0.3, 0, TAU); c.fill();
    // baston
    c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(30, -82); c.lineTo(44, 0); c.stroke();
    c.lineWidth = 8;
    c.beginPath(); c.moveTo(12, -100); c.lineTo(30, -82); c.stroke();
    if (o.finger) { // uyarı için kalkmış parmak
      c.lineWidth = 7;
      c.beginPath(); c.moveTo(8, -104); c.lineTo(28, -136 - o.finger * 6); c.stroke();
    }
    if (o.eyes) eyes(c, 16, -130, 0.35, o.eyes, '#ffffff');
    c.restore();
  }

  function dog(c, x, y, s = 1, o = {}) {
    const col = o.color || '#0b0908';
    c.save(); c.translate(x, y); c.scale(s * (o.facing || 1), s);
    c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round';
    if (o.sit) {
      c.beginPath(); c.ellipse(0, -34, 22, 34, -0.25, 0, TAU); c.fill();
      c.lineWidth = 7; c.beginPath(); c.moveTo(14, -30); c.lineTo(18, 0); c.stroke();
      c.beginPath(); c.moveTo(-18, -6); c.quadraticCurveTo(-40, -4, -44, -20); c.stroke();
      c.save(); c.translate(14, -70); c.rotate(o.head || 0);
    } else {
      c.beginPath(); c.ellipse(0, -40, 46, 18, 0, 0, TAU); c.fill();
      c.lineWidth = 8;
      for (const lx of [-34, -24, 26, 36]) { c.beginPath(); c.moveTo(lx, -34); c.lineTo(lx, 0); c.stroke(); }
      c.lineWidth = 6;
      c.beginPath(); c.moveTo(-44, -46); c.quadraticCurveTo(-64, -60 + Math.sin((o.t || 0) * 3) * 4, -70, -50); c.stroke();
      c.save(); c.translate(46, -56); c.rotate(o.head || 0);
    }
    c.beginPath(); c.ellipse(0, 0, 16, 13, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(14, 4, 12, 7, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-8, -8); c.lineTo(-4, -24); c.lineTo(4, -10); c.fill();
    if (o.eyes) {
      c.fillStyle = `rgba(255,220,120,${o.eyes})`;
      c.shadowColor = '#ffcc55'; c.shadowBlur = 10;
      c.beginPath(); c.arc(6, -2, 2.6, 0, TAU); c.fill();
      c.shadowBlur = 0;
    }
    c.restore(); c.restore();
  }

  // Taş kuyu. lid: 0 = taş tam kapalı, 1 = kenara itilmiş
  function well(c, x, y, s = 1, o = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const lid = o.lid || 0;
    const stone = o.stone || '#8a7350', dark = '#2a2016';
    // gövde
    c.fillStyle = stone;
    c.beginPath(); c.moveTo(-90, -70); c.lineTo(-90, 0); c.quadraticCurveTo(0, 26, 90, 0); c.lineTo(90, -70); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,28,15,0.45)'; c.lineWidth = 2;
    for (let yy = -52; yy < 0; yy += 18) { c.beginPath(); c.moveTo(-90, yy); c.quadraticCurveTo(0, yy + 22, 90, yy); c.stroke(); }
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 26, -70 + (i % 2) * 18); c.lineTo(i * 26, -52 + (i % 2) * 18); c.stroke(); }
    // ağız
    c.fillStyle = '#a58c64';
    c.beginPath(); c.ellipse(0, -70, 92, 24, 0, 0, TAU); c.fill();
    c.fillStyle = '#050403';
    c.beginPath(); c.ellipse(0, -70, 74, 17, 0, 0, TAU); c.fill();
    if (o.glow) {
      const g = c.createRadialGradient(0, -70, 2, 0, -70, 80);
      g.addColorStop(0, `rgba(160,200,190,${o.glow})`); g.addColorStop(1, 'rgba(160,200,190,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, -70, 74, 17, 0, 0, TAU); c.fill();
    }
    // kapak taşı
    c.save(); c.translate(lid * 150, -78 + lid * 40); c.rotate(lid * 0.25);
    c.fillStyle = dark; c.beginPath(); c.ellipse(0, 6, 82, 20, 0, 0, TAU); c.fill();
    c.fillStyle = '#6d5b40'; c.beginPath(); c.ellipse(0, 0, 80, 19, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.ellipse(-16, -5, 40, 7, 0, 0, TAU); c.fill();
    c.restore();
    c.restore();
  }

  function eyes(c, x, y, s, open, color = '#e8f0e0', gap = 46) {
    if (open <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(s, s);
    for (const dx of [-gap / 2, gap / 2]) {
      c.save(); c.translate(dx, 0);
      c.shadowColor = color; c.shadowBlur = 25;
      c.fillStyle = color;
      c.beginPath(); c.ellipse(0, 0, 16, 9 * open, 0, 0, TAU); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#000';
      c.beginPath(); c.ellipse(0, 0, 3.5, 7 * open, 0, 0, TAU); c.fill();
      c.restore();
    }
    c.restore();
  }

  // Uzanan kemikli el (yukarı doğru), angle: döndürme
  function hand(c, x, y, s = 1, o = {}) {
    c.save(); c.translate(x, y); c.rotate(o.angle || 0); c.scale(s, s);
    c.fillStyle = o.color || '#c9d1c4'; c.strokeStyle = o.color || '#c9d1c4'; c.lineCap = 'round';
    c.fillRect(-14, 0, 28, 200); // kol
    c.beginPath(); c.ellipse(0, -4, 26, 30, 0, 0, TAU); c.fill();
    const curl = o.curl || 0;
    c.lineWidth = 9;
    const fingers = [[-20, -0.35, 52], [-8, -0.12, 62], [4, 0.05, 64], [16, 0.25, 56]];
    for (const [fx, a, len] of fingers) {
      c.save(); c.translate(fx, -26); c.rotate(a);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * 0.5);
      c.rotate(curl * 0.9); c.lineTo(Math.sin(curl * 0.9) * len * 0.5, -len * 0.5 - Math.cos(curl * 0.9) * len * 0.5);
      c.stroke(); c.restore();
    }
    c.lineWidth = 10;
    c.beginPath(); c.moveTo(-22, 0); c.lineTo(-44, -26); c.stroke();
    c.restore();
  }

  function fog(c, t, alpha = 0.25, y = H * 0.65, color = '200,210,205') {
    for (let i = 0; i < 6; i++) {
      const x = ((t * (12 + i * 5) + i * 300) % (W + 600)) - 300;
      const g = c.createRadialGradient(x, y + i * 20, 10, x, y + i * 20, 320);
      g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g; c.fillRect(x - 320, y + i * 20 - 320, 640, 640);
    }
  }

  function vignette(c, k = 0.85) {
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  // film greni + titreme + çizikler (frame'e göre deterministik)
  function filmFX(c, frame, o = {}) {
    const r = rng(frame * 7919 + 13);
    c.save();
    c.globalAlpha = o.grain != null ? o.grain : 0.07;
    for (let i = 0; i < 900; i++) {
      c.fillStyle = r() > 0.5 ? '#fff' : '#000';
      c.fillRect(r() * W, r() * H, 1.5, 1.5);
    }
    c.globalAlpha = 1;
    if (r() < 0.25) {
      c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
      const x = r() * W; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + r() * 6 - 3, H); c.stroke();
    }
    const fl = (o.flicker != null ? o.flicker : 0.05) * r();
    c.fillStyle = `rgba(0,0,0,${fl})`; c.fillRect(0, 0, W, H);
    c.restore();
    vignette(c, o.vignette != null ? o.vignette : 0.8);
  }

  function centerText(c, text, y, size, color, o = {}) {
    c.save();
    c.font = `${o.weight || '700'} ${size}px ${o.font || '"DejaVu Serif", Georgia, serif'}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.spacing) c.letterSpacing = o.spacing + 'px';
    if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.blur || 20; }
    c.fillStyle = color;
    c.fillText(text, W / 2 + (o.dx || 0), y);
    c.restore();
  }

  function wrap(c, text, maxW) {
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (c.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function subtitle(c, text, alpha, o = {}) {
    if (!text || alpha <= 0) return;
    c.save();
    c.globalAlpha = alpha;
    c.font = `600 ${o.size || 34}px "DejaVu Sans", Arial, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const lines = wrap(c, text, W * 0.82);
    const lh = (o.size || 34) * 1.3;
    let y = (o.y || H - 70) - (lines.length - 1) * lh;
    for (const l of lines) {
      c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineJoin = 'round';
      c.strokeText(l, W / 2, y);
      c.fillStyle = o.color || '#f2ead8'; c.fillText(l, W / 2, y);
      y += lh;
    }
    c.restore();
  }

  G.D = { TAU, W, H, clamp, lerp, smooth, range, rng, sky, stars, moon, hills, stoneHouse, archShape,
          person, grandma, dog, well, eyes, hand, fog, vignette, filmFX, centerText, subtitle, wrap };
})(typeof window !== 'undefined' ? window : globalThis);
