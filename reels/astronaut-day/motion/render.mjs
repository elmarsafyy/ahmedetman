// usage: node render.mjs stills out_dir t1 t2 ...   |  node render.mjs video out.mp4 startFrame endFrame
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
const [mode, out, ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('PAGE', m.type(), m.text().slice(0, 600)); });
page.on('pageerror', e => console.error('PAGEERR', e.message));
await page.goto('http://127.0.0.1:8766/' + (process.env.PAGE||'index.html'));
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
const shot = async (t) => { await page.evaluate(t => window.renderAt(t), t); return page.screenshot({ type: 'jpeg', quality: 94 }); };
if (mode === 'stills') {
  fs.mkdirSync(out, { recursive: true });
  for (const ts of rest) { const t0 = Date.now(); const b = await shot(+ts); fs.writeFileSync(`${out}/t${(+ts).toFixed(2)}.jpg`, b); console.log(ts, Date.now() - t0, 'ms'); }
} else {
  const [a, b] = rest.map(Number);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const T0 = Date.now();
  for (let f = a; f < b; f++) {
    const buf = await shot(f / 30);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 60 === 0) console.log(out, f, ((Date.now() - T0) / (f - a + 1)).toFixed(0), 'ms/frame');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();
