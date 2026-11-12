#!/usr/bin/env node
// Dikey (9:16) "yapay zeka çizimli dizi" render'ı: her satır bir resim, yavaş kamera hareketi,
// yumuşak geçiş, kelime kelime yanan altyazı. Ses build_audio.py'den (output/<ep>/mix.mp3).
// Kullanım: node tools/render_reel.js reel1 [--fps 30] [--stills]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ep = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const fps = Number(opt('fps', 30));
const stills = args.includes('--stills');
const ROOT = path.resolve(__dirname, '..');
const EPDIR = path.join(ROOT, 'episodes', ep);
const OUT = path.join(ROOT, 'output', ep);
const SCRIPT = JSON.parse(fs.readFileSync(path.join(EPDIR, 'script.json'), 'utf8'));
const WIDE = !!SCRIPT.widescreen;  // 16:9 uzun video modu
const W = WIDE ? 1920 : 1080, H = WIDE ? 1080 : 1920;

const page_src = `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="cv" width="${W}" height="${H}"></canvas>
<script src="episode.js"></script>
<script>
const W=${W},H=${H},WIDE=${WIDE};
const EP=window.EPISODE, L=EP.lines;
const imgs={};
window.ready=Promise.all(L.map(l=>new Promise(r=>{ if(imgs[l.img]) return r(); const im=new Image(); im.onload=r; im.src=l.img; imgs[l.img]=im; })));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const loc={de:'de-DE',en:'en-US'}[EP.lang]||'tr-TR';
function findLine(t){ for(let i=0;i<L.length;i++) if(t<L[i].end) return i; return L.length-1; }
function drawImg(c,l,p,alpha){
  const im=imgs[l.img]; const base=Math.max(W/im.width,H/im.height)*(l.crop||1);
  const m=l.move||'in', k=ease(p);
  let z=1.06, dx=0, dy=0;
  if(m==='in') z=1.04+0.12*k; else if(m==='out') z=1.16-0.12*k;
  else if(m==='left'){z=1.14; dx=(0.5-k)*0.08;} else if(m==='right'){z=1.14; dx=(k-0.5)*0.08;}
  else if(m==='up'){z=1.14; dy=(0.5-k)*0.07;} else if(m==='down'){z=1.14; dy=(k-0.5)*0.07;}
  const s=base*z, w=im.width*s, h=im.height*s;
  c.globalAlpha=alpha;
  c.drawImage(im, (W-w)/2 - dx*w, (H-h)/2 - dy*h, w, h);
  c.globalAlpha=1;
}

// ---- hızlı kurgu: her satır ~1.2 sn'lik çekimlere bölünür (farklı kadraj) ----
const FR=[[1.25,.5,.38],[1.2,.38,.5],[1.2,.62,.52],[1.3,.5,.45],[1.15,.5,.6]];
function shots(l,i){
  if(l._s) return l._s;
  const d=l.end-l.start, n=Math.max(1,Math.round(d/(WIDE?4.2:2.8))), out=[];
  for(let k=0;k<n;k++){
    const f=k===0?[1.06,.5,.5]:FR[(i*4+k*3)%FR.length];
    out.push({t0:l.start+d*k/n, t1:l.start+d*(k+1)/n, z:Math.max(f[0],l.fz||0), cx:f[1], cy:(l.fy!=null?l.fy:f[2]), dir:((i+k)%2?1:-1)});
  }
  return l._s=out;
}
function drawShot(c,l,s,t,ox){
  const im=imgs[l.img]; const base=Math.max(W/im.width,H/im.height)*(l.crop||1);
  const k=clamp((t-s.t0)/(s.t1-s.t0));
  const punch=1;
  const z=s.z*(1+0.03*ease(k))*punch, sc=base*z, w=im.width*sc, h=im.height*sc;
  let x=W/2-s.cx*w + s.dir*ease(k)*0.012*w, y=H/2-s.cy*h;
  x=Math.min(0,Math.max(W-w,x)); y=Math.min(0,Math.max(H-h,y));
  const sh=0;
  c.drawImage(im, x+ox+Math.sin(t*90)*sh, y+Math.cos(t*77)*sh, w, h);
}
function drawLine(c,l,i,t,ox){
  const ss=shots(l,i); const j=ss.findIndex(q=>t<q.t1); const si=j<0?ss.length-1:j; const s=ss[si];
  const tt=Math.max(t,ss[0].t0), XS=0.35, q=(tt-s.t0)/XS;
  if(si>0 && q<1){ drawShot(c,l,ss[si-1],tt,ox||0); const a=c.globalAlpha; c.globalAlpha=a*ease(clamp(q)); drawShot(c,l,s,tt,ox||0); c.globalAlpha=a; }
  else drawShot(c,l,s,tt,ox||0);
}
function words(l){
  if(l._g) return l._g;
  if(l.words&&l.words.length){ const out=l.words.map(([w,a,b])=>({w,a,b})); const g=[]; let cur=[];
    out.forEach((o,i)=>{cur.push(o); const gap=i+1<out.length?out[i+1].a-o.b:0; if(cur.length>=3||/[.,:;!?…]$/.test(o.w)||gap>0.25){g.push(cur);cur=[];}});
    if(cur.length) g.push(cur); return l._g=g; }
  const ws=l.text.split(/\\s+/).filter(Boolean);
  const wt=ws.map(w=>w.replace(/[^\\p{L}\\p{N}]/gu,'').length+2+(/[.,:;!?…]$/.test(w)?3:0));
  const tot=wt.reduce((a,b)=>a+b,0); let acc=l.vStart; const out=[];
  ws.forEach((w,i)=>{const d=(l.vEnd-l.vStart)*wt[i]/tot; out.push({w,a:acc,b:acc+d}); acc+=d;});
  const g=[]; let cur=[];
  out.forEach(o=>{cur.push(o); if(cur.length>=3||/[.,:;!?…]$/.test(o.w)){g.push(cur);cur=[];}});
  if(cur.length) g.push(cur);
  return l._g=g;
}
function caption(c,l,t){
  if(t<l.vStart-0.05||t>l.end-0.05) return;
  const gs=words(l); let gi=gs.findIndex(g=>t<g[g.length-1].b+0.05); if(gi<0) gi=gs.length-1;
  const g=gs[gi];
  c.save(); c.textBaseline='middle'; c.textAlign='left';
  const size=WIDE?60:78; c.font='800 '+size+'px "DejaVu Sans", sans-serif';
  const sp=WIDE?18:24, ws=g.map(o=>c.measureText(o.w).width);
  // gerekirse iki satıra böl
  let lines=[[0,g.length]];
  const total=ws.reduce((a,b)=>a+b,0)+sp*(g.length-1);
  if(total>W*(WIDE?0.7:0.86) && g.length>1){ const h=Math.ceil(g.length/2); lines=[[0,h],[h,g.length]]; }
  const pop=clamp((t-g[0].a)/0.12);
  const y0=H*(WIDE?0.86:0.70) - (lines.length-1)*size*0.6 + (1-pop)*16;
  lines.forEach(([a,b],li)=>{
    let tw=0; for(let i=a;i<b;i++) tw+=ws[i]+(i>a?sp:0);
    let sc=tw>W*0.9?W*0.9/tw:1;
    let x=W/2-tw*sc/2; const y=y0+li*size*1.2;
    for(let i=a;i<b;i++){
      const o=g[i], act=t>=o.a&&t<o.b+0.04, done=t>=o.b;
      c.save(); c.translate(x,y); c.scale(sc,sc);
      c.lineJoin='round'; c.lineWidth=WIDE?10:12; c.strokeStyle='rgba(0,0,0,0.9)'; c.globalAlpha=pop;
      c.shadowColor='rgba(0,0,0,0.6)'; c.shadowBlur=18;
      c.strokeText(o.w,0,0); c.shadowBlur=0;
      c.fillStyle=act?'#ffe9a8':(done?'#ffffff':'rgba(255,255,255,0.72)');
      c.fillText(o.w,0,0); c.restore();
      x+=(ws[i]+sp)*sc;
    }
  });
  c.restore();
}
// ---- hareketli kar (satırda "snow": 0..1, "wind": 0..1) ----
const SN=[]; (function(){let a=12345; const r=()=>{a=(a*1103515245+12345)%2147483648; return a/2147483648;};
  for(let i=0;i<520;i++) SN.push({x:r(),y:r(),z:0.35+0.65*r(),p:r()*6.28,k:r()});})();
function lineVal(i,t,key){ const l=L[i], v=l[key]||0; if(i===0) return v; const q=clamp((t-l.start)/1.2); return (L[i-1][key]||0)*(1-q)+v*q; }
function snowLayer(c,i,t){
  const s=lineVal(i,t,'snow'); if(s<=0.01) return; const w=lineVal(i,t,'wind');
  const n=Math.floor(SN.length*s*0.7), sc=H/1080; c.save(); c.fillStyle='#fff';
  for(let j=0;j<n;j++){ const f=SN[j], z=f.z, sp=(0.10+0.22*z)*(1+w*1.6);
    let y=((f.y + sp*t) % 1)*(H+40)-20;
    let x=((f.x + w*sp*1.6*t + 0.012*Math.sin(t*(0.8+f.k)+f.p)) % 1 + 1) % 1 * W;
    const r=(1.2+3.6*z*z)*sc; c.globalAlpha=(0.25+0.5*z)*Math.min(1,s*1.4);
    if(w>0.5 && z>0.6){ c.save(); c.translate(x,y); c.rotate(Math.atan2(sp,w*sp*1.6)-Math.PI/2); c.beginPath(); c.ellipse(0,0,r,r*(1+w*2.2),0,0,6.283); c.fill(); c.restore(); }
    else { c.beginPath(); c.arc(x,y,r,0,6.283); c.fill(); } }
  c.restore();
}
function badge(c,l,t){
  if(!l.badge) return;
  const v=parseFloat(l.badge.replace(',','.')); const k=clamp((37-v)/9);
  const col='rgb('+Math.round(255-(255-120)*k)+','+Math.round(140+(212-140)*k)+','+Math.round(60+(255-60)*k)+')';
  const a=clamp((t-l.start)/0.5);
  c.save(); c.globalAlpha=a; const sz=Math.round(H*0.075);
  c.font='800 '+sz+'px "DejaVu Sans", sans-serif'; c.textBaseline='middle';
  const tw=c.measureText(l.badge).width, x=W*0.04, y=H*0.09, pad=sz*0.35;
  c.fillStyle='rgba(0,0,0,0.55)'; c.beginPath(); c.roundRect(x-pad,y-sz*0.7,tw+pad*2,sz*1.4,sz*0.3); c.fill();
  c.lineWidth=4; c.strokeStyle=col; c.stroke();
  c.fillStyle=col; c.fillText(l.badge,x,y+2); c.restore();
}
window.renderFrame=function(t){
  const c=document.getElementById('cv').getContext('2d');
  c.fillStyle='#000'; c.fillRect(0,0,W,H);
  const i=findLine(Math.max(t,L[0].start)), l=L[i];
  if(EP.shots){
    const XF=0.45, q=(t-l.start)/XF;
    if(i>0 && q<1 && q>=0){ drawLine(c,L[i-1],i-1,t,0); c.globalAlpha=ease(q); drawLine(c,l,i,t,0); c.globalAlpha=1; }
    else drawLine(c,l,i,t,0);
  } else {
  const XF=0.4;
  const p=clamp((t-l.start)/(l.end-l.start+XF));
  if(i>0 && t<l.start+XF){ const pl=L[i-1]; drawImg(c,pl,clamp((t-pl.start)/(pl.end-pl.start+XF)),1); drawImg(c,l,p,clamp((t-l.start)/XF)); }
  else drawImg(c,l,p,1);
  }
  // alt kararma (altyazı okunurluğu) + vinyet
  let gr=c.createLinearGradient(0,H*0.5,0,H); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,0.55)');
  c.fillStyle=gr; c.fillRect(0,0,W,H);
  gr=c.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.75); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,0.45)');
  c.fillStyle=gr; c.fillRect(0,0,W,H);
  // başta ve sonda kararma
  const fin=clamp(t/0.6), fout=clamp((EP.duration-t)/0.8);
  if(fin<1||fout<1){ c.fillStyle='rgba(0,0,0,'+(1-Math.min(fin,fout))+')'; c.fillRect(0,0,W,H); }
  snowLayer(c,i,t);
  badge(c,l,t);
  caption(c,l,t);
};
</script></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const html = path.join(EPDIR, '_reel.html');
  fs.writeFileSync(html, page_src);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto('file://' + html);
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.EPISODE.duration);
  const grab = async (t) => {
    const b64 = await page.evaluate((t) => { renderFrame(t); return document.getElementById('cv').toDataURL('image/jpeg', 0.92).split(',')[1]; }, t);
    return Buffer.from(b64, 'base64');
  };
  if (stills) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    const ls = await page.evaluate(() => EPISODE.lines.map(l => [l.scene, l.vStart, l.vEnd]));
    for (let i = 0; i < ls.length; i++) fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, '0')}_${ls[i][0]}.jpg`), await grab(ls[i][1] + (ls[i][2] - ls[i][1]) * 0.4));
    await browser.close(); fs.unlinkSync(html); console.log('stills ->', dir); return;
  }
  const outFile = path.join(OUT, `${ep}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(OUT, 'mix.mp3'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'ignore', 'inherit'] });
  const n = Math.ceil(duration * fps);
  for (let f = 0; f < n; f++) {
    const buf = await grab(f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 10) === 0) process.stderr.write(`${Math.round(100 * f / n)}% `);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close(); fs.unlinkSync(html);
  console.log('\n->', outFile);
})();
