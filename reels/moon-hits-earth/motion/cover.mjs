// usage: node cover.mjs out.jpg t [titleHTML]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, t, mode] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('PAGEERR', e.message));
await page.goto('http://127.0.0.1:8765/index.html');
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
await page.evaluate(t => window.renderAt(t), +t);
await page.evaluate((mode) => {
  const ov = document.getElementById('ov');
  ov.innerHTML = mode === 'none' ? '' : `
    <div style="position:absolute;left:0;top:1050px;width:1080px;height:870px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.72) 45%,rgba(0,0,0,.85))"></div>
    <div class="c h3" style="top:1300px;font-size:46px">What if the Moon</div>
    <div class="c h1" style="top:1372px;font-size:136px;letter-spacing:-.01em"><span class="acc">Hit</span> Earth?</div>
    <div class="c mono" style="top:1548px;font-size:26px;letter-spacing:.3em;color:#9fb3c4">A SCIENCE WHAT-IF</div>`;
}, mode);
await page.screenshot({ path: out, type: 'jpeg', quality: 95 });
await browser.close();
