#!/usr/bin/env node
// Bölümü MP4 videoya render eder (kare kare, deterministik).
// Kullanım: node tools/render.js ep1 [--subs on|none] [--fps 24] [--size 1920x1080] [--stills]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ep = args[0] || 'ep1';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const subs = opt('subs', 'on');
const [CW, CH] = opt('size', '1920x1080').split('x').map(Number);
const fps = Number(opt('fps', 24));
const stills = args.includes('--stills');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'output', ep);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: CW, height: CH } });
  await page.setContent(`<html><body style="margin:0;background:#000"><canvas id="cv" width="${CW}" height="${CH}"></canvas></body></html>`);
  const files = ['engine/draw.js', 'engine/player.js', 'episodes/ep1/scenes.js', 'engine/kit.js'];
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', ep, 'script.json'), 'utf8'));
  const sdir = meta.scenes_from || ep;
  if (sdir !== 'ep1') files.push(`episodes/${sdir}/scenes.js`);
  files.push(`episodes/${ep}/episode.js`);
  for (const f of files)
    await page.addScriptTag({ path: path.join(ROOT, f) });
  const duration = await page.evaluate(() => window.EPISODE.duration);

  if (stills) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    const lines = await page.evaluate(() => window.EPISODE.lines.map(l => [l.scene, l.start, l.end]));
    for (let i = 0; i < lines.length; i++) {
      const [scene, s, e] = lines[i];
      const time = s + (e - s) * 0.62;
      const b64 = await page.evaluate(({ time, subs }) => {
        const cv = document.getElementById('cv');
        renderFrame(cv.getContext('2d'), window.EPISODE, time, { subs });
        return cv.toDataURL('image/jpeg', 0.85).split(',')[1];
      }, { time, subs });
      fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, '0')}_${scene}.jpg`), Buffer.from(b64, 'base64'));
    }
    await browser.close();
    console.log('stills ->', dir);
    return;
  }

  const outFile = path.join(OUT, `${ep}${subs === 'none' ? '.altyazisiz' : ''}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(OUT, 'mix.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'ignore', 'inherit'] });
  const total = Math.ceil(duration * fps);
  for (let f = 0; f < total; f++) {
    const b64 = await page.evaluate(({ f, fps, subs }) => {
      const cv = document.getElementById('cv');
      renderFrame(cv.getContext('2d'), window.EPISODE, f / fps, { subs, frame: f });
      return cv.toDataURL('image/jpeg', 0.92).split(',')[1];
    }, { f, fps, subs });
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 20) === 0) process.stdout.write(`\r${(f / total * 100).toFixed(0)}%`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('\nvideo ->', outFile);
})();
