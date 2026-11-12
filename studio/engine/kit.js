// 2-4. bölümlerin ortak çizim parçaları (ayna, yüz, halay, gelin, kartlar...).
(function (G) {
  const { TAU, W, H, clamp, lerp, range, sky, stars, moon, fog, eyes, centerText, person, well, archShape, rng } = G.D;

  function titleCard(c, p, t, sub, icon) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    fog(c, t, 0.08, 520);
    if (icon) icon(c, p, t);
    const shake = Math.sin(t * 40) * (p > 0.5 ? 1.5 : 0);
    centerText(c, 'KUYUNUN SESİ', 220 + shake, 90, `rgba(200,30,25,${range(p, 0.05, 0.3)})`, { spacing: 10, shadow: 'rgba(255,0,0,0.6)', blur: 30 });
    centerText(c, sub, 320, 36, `rgba(230,220,200,${range(p, 0.35, 0.6)})`, { weight: '400' });
  }

  function nextCard(c, p, t, label, icon) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = range(p, 0.05, 0.3); if (icon) icon(c, p, t); c.restore();
    centerText(c, label, 600, 40, `rgba(200,30,25,${range(p, 0.3, 0.5)})`, { spacing: 6, shadow: 'rgba(255,0,0,0.5)' });
    centerText(c, 'Kuyunun Sesi', 660, 22, `rgba(220,210,190,${0.6 * range(p, 0.4, 0.6)})`, { weight: '400', spacing: 6 });
  }

  // Oval ayna: inside(c) aynanın içini çizer (clip'li)
  function mirror(c, x, y, w, h, inside, o = {}) {
    c.save();
    c.fillStyle = o.frame || '#3b2615';
    c.beginPath(); c.ellipse(x, y, w / 2 + 16, h / 2 + 16, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(200,160,90,0.35)'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); c.clip();
    const g = c.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, '#47535a'); g.addColorStop(0.5, '#222a2f'); g.addColorStop(1, '#101518');
    c.fillStyle = g; c.fillRect(x - w / 2, y - h / 2, w, h);
    if (inside) { c.save(); inside(c); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.beginPath(); c.moveTo(x - w / 2, y - h / 3); c.lineTo(x - w / 6, y - h / 2); c.lineTo(x, y - h / 2); c.lineTo(x - w / 2, y); c.fill();
    if (o.crack) cracks(c, x, y, Math.max(w, h) * 0.6, o.crack, o.seed || 1);
    c.restore();
  }

  function cracks(c, x, y, r, k, seed) {
    const R = rng(seed);
    c.strokeStyle = 'rgba(230,240,245,0.75)'; c.lineWidth = 1.5;
    for (let i = 0; i < 11; i++) {
      let a = R() * TAU, px = x, py = y;
      c.beginPath(); c.moveTo(px, py);
      const L = r * k * (0.5 + R() * 0.5);
      for (let d = 0; d < L; d += 18) { a += (R() - 0.5) * 0.5; px += Math.cos(a) * 18; py += Math.sin(a) * 18; c.lineTo(px, py); }
      c.stroke();
    }
    c.beginPath(); c.arc(x, y, 10 * k, 0, TAU); c.stroke();
  }

  // Yakın plan yüz. eyesMode: 'normal'|'empty'|'scared'; smile 0..1; slip 0..1 (yüz kayması)
  function face(c, x, y, s, o = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const skin = o.skin || '#9a8670';
    c.fillStyle = '#120c08'; c.beginPath(); c.ellipse(0, -150, 210, 120, 0, Math.PI, 0); c.fill(); // saç
    c.fillStyle = skin; c.beginPath(); c.ellipse(0, 0, 190, 250, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(-70, 10, 170, 260, 0, -0.6, 1.2); c.fill();
    const slip = o.slip || 0;
    c.save(); c.translate(slip * 60, slip * 25);
    for (const dx of [-70, 70]) {
      if (o.eyesMode === 'empty') {
        c.fillStyle = '#f4f2ea'; c.beginPath(); c.ellipse(dx, -50, 40, 22, 0, 0, TAU); c.fill();
      } else {
        c.fillStyle = '#f2ece0'; c.beginPath(); c.ellipse(dx, -50, 40, o.eyesMode === 'scared' ? 28 : 20, 0, 0, TAU); c.fill();
        c.fillStyle = '#120b06'; c.beginPath(); c.arc(dx + (o.look || 0) * 10, -50, o.eyesMode === 'scared' ? 7 : 11, 0, TAU); c.fill();
      }
    }
    c.strokeStyle = '#1a120c'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(-115, -100); c.lineTo(-35, -95); c.moveTo(115, -100); c.lineTo(35, -95); c.stroke();
    c.strokeStyle = 'rgba(40,25,15,0.6)'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -30); c.lineTo(-12, 40); c.lineTo(8, 46); c.stroke();
    const sm = o.smile || 0;
    if (o.mouthOpen) { c.fillStyle = '#0d0505'; c.beginPath(); c.ellipse(0, 120, 50, 10 + o.mouthOpen * 60, 0, 0, TAU); c.fill(); }
    else {
      c.strokeStyle = '#2a0e0a'; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-60 - sm * 50, 115 - sm * 30); c.quadraticCurveTo(0, 120 + sm * 70, 60 + sm * 50, 115 - sm * 30); c.stroke();
      if (sm > 0.5) { c.fillStyle = 'rgba(240,235,220,0.9)'; c.beginPath(); c.moveTo(-60 - sm * 40, 118 - sm * 25); c.quadraticCurveTo(0, 125 + sm * 55, 60 + sm * 40, 118 - sm * 25); c.quadraticCurveTo(0, 135, -60 - sm * 40, 118 - sm * 25); c.fill(); }
    }
    c.restore();
    if (slip > 0.02) { // kayan yüzün altından görünen karanlık
      c.fillStyle = `rgba(0,0,0,${0.8 * slip})`;
      c.beginPath(); c.ellipse(-150 + slip * 40, 30, 40 * slip, 180, 0.1, 0, TAU); c.fill();
    }
    c.restore();
  }

  // Halay oyuncusu: kollar yana açık, serçe parmakla bağlı
  function dancer(c, x, y, s, o = {}) {
    const ph = o.phase || 0;
    const bob = Math.sin(ph) * 6;
    c.save(); c.translate(x, y - bob); c.scale(s, s);
    const col = o.color || '#0b0908';
    c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round';
    c.lineWidth = 12;
    const step = Math.sin(ph) * 0.3;
    c.beginPath(); c.moveTo(0, -80); c.lineTo(-10 + step * 30, 0); c.moveTo(0, -80); c.lineTo(12 - step * 20, 0); c.stroke();
    if (o.dress) { c.beginPath(); c.moveTo(-26, -6); c.lineTo(-16, -140); c.lineTo(16, -140); c.lineTo(26, -6); c.fill(); }
    else { c.beginPath(); c.moveTo(-20, -82); c.lineTo(-22, -140); c.lineTo(22, -140); c.lineTo(20, -82); c.fill(); }
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(-18, -134); c.lineTo(-58, -110 + bob * 0.5); c.moveTo(18, -134); c.lineTo(58, -110 + bob * 0.5); c.stroke();
    c.beginPath(); c.ellipse(0, -160, 15, 18, 0, 0, TAU); c.fill();
    if (o.kerchief) { c.fillStyle = o.kerchief; c.beginPath(); c.moveTo(-58, -110); c.lineTo(-72 + Math.sin(ph * 2) * 8, -150); c.lineTo(-48, -132); c.fill(); }
    if (o.faceless === false && o.faceColor) { c.fillStyle = o.faceColor; c.beginPath(); c.ellipse(4, -160, 10, 13, 0, 0, TAU); c.fill(); c.fillStyle = '#000'; c.fillRect(-2, -164, 3, 3); c.fillRect(7, -164, 3, 3); }
    else if (o.blank) { c.fillStyle = o.blank; c.beginPath(); c.ellipse(0, -160, 12, 15, 0, 0, TAU); c.fill(); }
    c.restore();
  }

  function halayLine(c, n, x0, y0, dx, s, t, o = {}) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * dx, y = y0 + (o.curve ? Math.sin(i * 0.5) * o.curve : 0);
      dancer(c, x, y, s, { phase: t * 5 + i * 0.6, kerchief: i === 0 ? '#b0201a' : null, dress: i % 3 === 1, blank: o.blank, color: o.color });
    }
  }

  // Gelin: kırmızı duvaklı, oturan ya da ayakta
  function bride(c, x, y, s, o = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = o.dress || '#e9e2d2';
    c.beginPath(); c.moveTo(-60, 0); c.quadraticCurveTo(-40, -90, -22, -130); c.lineTo(22, -130); c.quadraticCurveTo(40, -90, 60, 0); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(0, -128); c.lineTo(-40, 0); c.lineTo(0, 0); c.fill();
    c.fillStyle = '#e0cbb0'; c.beginPath(); c.ellipse(0, -152, 17, 21, 0, 0, TAU); c.fill();
    if (o.eyes) eyes(c, 0, -155, 0.28, o.eyes, '#f0e6c8', 26);
    const lift = o.lift || 0;
    c.fillStyle = 'rgba(170,20,20,0.92)';
    c.beginPath();
    c.moveTo(-26, -180); c.quadraticCurveTo(0, -196, 26, -180);
    c.lineTo(34 + lift * 10, lerp(-120, -175, lift)); c.quadraticCurveTo(0, lerp(-110, -190, lift), -34 - lift * 10, lerp(-120, -175, lift)); c.closePath(); c.fill();
    c.fillStyle = 'rgba(200,170,60,0.8)'; for (let i = -2; i <= 2; i++) c.fillRect(i * 10 - 2, -186, 4, 4);
    c.restore();
  }

  function card(c, x, y, w, h, lines, o = {}) {
    c.save(); c.translate(x, y); c.rotate(o.rot || 0);
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
    c.fillStyle = o.paper || '#e8dcc0'; c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = o.border || '#8a1a14'; c.lineWidth = 4; c.strokeRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach(([txt, size, col, yy, font]) => {
      c.font = `${font || '400'} ${size}px "DejaVu Serif"`; c.fillStyle = col || '#2a1a10'; c.fillText(txt, 0, yy);
    });
    c.restore();
  }

  function apartment(c, t, lamp = 0.5) {
    c.fillStyle = '#14161c'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1d2029'; c.fillRect(0, 0, W, 520);
    c.fillStyle = '#0f1015'; c.fillRect(0, 520, W, 200);
    // pencere: şehir ışıkları
    c.fillStyle = '#0a0d18'; c.fillRect(900, 120, 260, 220);
    const R = rng(77);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,200,110,${0.3 + R() * 0.5})`; c.fillRect(905 + R() * 250, 200 + R() * 135, 4, 6); }
    c.strokeStyle = '#2a2d36'; c.lineWidth = 10; c.strokeRect(900, 120, 260, 220); c.beginPath(); c.moveTo(1030, 120); c.lineTo(1030, 340); c.stroke();
    const g = c.createRadialGradient(300, 180, 5, 300, 180, 600);
    g.addColorStop(0, `rgba(255,220,160,${0.25 * lamp})`); g.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function chest(c, x, y, s, open = 0, glow = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#4a2d16'; c.fillRect(-150, -110, 300, 110);
    c.strokeStyle = '#c9a050'; c.lineWidth = 6; c.strokeRect(-150, -110, 300, 110);
    for (const xx of [-90, 0, 90]) { c.beginPath(); c.moveTo(xx, -110); c.lineTo(xx, 0); c.stroke(); }
    if (glow) { const g = c.createRadialGradient(0, -110, 5, 0, -110, 200); g.addColorStop(0, `rgba(255,230,170,${glow})`); g.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = g; c.fillRect(-200, -320, 400, 320); }
    c.save(); c.translate(0, -110); c.scale(1, Math.cos(open * 1.4));
    c.fillStyle = '#5a361b'; c.beginPath(); c.moveTo(-150, 0); c.lineTo(-150, -50); c.quadraticCurveTo(0, -90, 150, -50); c.lineTo(150, 0); c.fill();
    c.strokeStyle = '#c9a050'; c.stroke();
    c.restore();
    c.fillStyle = '#c9a050'; c.fillRect(-12, -118, 24, 26);
    c.restore();
  }

  function clockFace(c, cx, cy, r, t) {
    c.fillStyle = '#2a1d12'; c.beginPath(); c.arc(cx, cy, r + 12, 0, TAU); c.fill();
    c.fillStyle = '#c8b894'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
    c.fillStyle = '#1a120a';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillRect(cx + Math.sin(a) * r * 0.82 - 2, cy - Math.cos(a) * r * 0.82 - 2, 4, 4); }
    c.strokeStyle = '#1a120a'; c.lineCap = 'round';
    c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + r * 0.55, cy); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - r * 0.8); c.stroke();
    const sec = Math.floor(t) / 60 * TAU;
    c.strokeStyle = '#8a1a14'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(sec) * r * 0.88, cy - Math.cos(sec) * r * 0.88); c.stroke();
  }

  function weddingCourtyard(c, t, o = {}) {
    G.H.courtyard(c, t, 0.4);
    // ip üzerinde lambalar
    for (let i = 0; i < 14; i++) {
      const x = 40 + i * 92, y = 250 + Math.sin(i * 0.7) * 16;
      const fl = 0.7 + 0.3 * Math.sin(t * 9 + i * 3);
      const g = c.createRadialGradient(x, y, 1, x, y, 40);
      g.addColorStop(0, `rgba(255,190,90,${0.8 * fl * (o.lamps ?? 1)})`); g.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = g; c.fillRect(x - 40, y - 40, 80, 80);
    }
    c.strokeStyle = 'rgba(30,20,10,0.8)'; c.lineWidth = 2;
    c.beginPath(); for (let i = 0; i < 14; i++) c.lineTo(40 + i * 92, 250 + Math.sin(i * 0.7) * 16); c.stroke();
  }

  G.K = { titleCard, nextCard, mirror, cracks, face, dancer, halayLine, bride, card, apartment, chest, clockFace, weddingCourtyard };
})(typeof window !== 'undefined' ? window : globalThis);
