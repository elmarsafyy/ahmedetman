// usage: node cover.mjs out.jpg t [title|none]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, t, mode] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('PAGEERR', e.message));
await page.goto('http://127.0.0.1:8767/index.html');
await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });
await page.evaluate(t => window.renderAt(t), +t);
await page.evaluate((mode) => {
  const ov = document.getElementById('ov');
  ov.innerHTML = mode === 'none' ? '' : `
    <div style="position:absolute;left:0;top:0;width:1080px;height:560px;background:linear-gradient(rgba(0,0,0,.85),rgba(0,0,0,.6) 55%,rgba(0,0,0,0))"></div>
    <div style="position:absolute;left:0;top:1380px;width:1080px;height:540px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.75) 45%,rgba(0,0,0,.9))"></div>
    <div class="c h3" style="top:150px;font-size:50px">What if you opened</div>
    <div class="c h1" style="top:225px;font-size:132px;letter-spacing:-.01em">The ISS Door?</div>
    <div class="c mono" style="top:1640px;font-size:34px;letter-spacing:.24em;color:#9fb3c4"><span style="color:#FF3B3B">35,000 LB</span> HOLDING IT SHUT</div>
    <div class="c mono" style="top:1700px;font-size:26px;letter-spacing:.3em;color:#6f8294">YOU HAVE <span style="color:#EEF1F5">15 SECONDS</span></div>`;
  }, mode);
await page.screenshot({ path: out, type: 'jpeg', quality: 95 });
await browser.close();
