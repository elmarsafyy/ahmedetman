// Keyword typography + HUD for "A day on the ISS".
const ov = document.getElementById('ov');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => { const x = lin(t, a, b); return x * x * (3 - 2 * x); };
const eo = x => 1 - Math.pow(1 - x, 3);
const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

const TOP = 300, LOW = 1330;
const CUES = [
  { y: TOP, out: 3.45, lines: [{ t: 2.05, cls: 'h1', html: '<span class="acc">16</span> sunrises' }, { t: 2.6, cls: 'h3', html: 'every day', gap: 26 }] },
  { y: LOW, out: 4.75, lines: [{ t: 3.65, cls: 'h3', html: 'Just a normal day' }] },
  { y: TOP, out: 8.25, lines: [{ t: 5.45, cls: 'h3', html: 'International' }, { t: 5.9, cls: 'h2', html: 'Space Station', gap: 22 }] },
  { y: TOP, out: 11.45, lines: [{ t: 8.8, cls: 'h3', html: 'One orbit' }, { t: 9.9, cls: 'h1', html: '<span class="cool">90</span> minutes', gap: 24 }] },
  { y: TOP, out: 14.3, lines: [{ t: 12.3, cls: 'h1 mono', html: 'roll:28,000:12.3:13.6' }, { t: 13.5, cls: 'h3', html: 'km per hour', gap: 24 }] },
  { y: TOP, out: 16.55, lines: [{ t: 14.6, cls: 'h1', html: '400 km' }, { t: 15.2, cls: 'h3', html: 'above our heads', gap: 24 }] },
  { y: LOW, out: 22.8, lines: [{ t: 19.5, cls: 'h3', html: 'Sleeping' }, { t: 20.25, cls: 'h1', html: '<span class="acc">upright</span>', gap: 18 }] },
  { y: LOW, out: 25.15, lines: [{ t: 23.4, cls: 'h2', html: 'Strapped to the wall' }] },
  { y: LOW, out: 27.6, lines: [{ t: 25.3, cls: 'h3', html: 'or you’d drift away' }] },
  { y: TOP, out: 30.15, lines: [{ t: 28.3, cls: 'h2', html: 'Teeth first' }] },
  { y: TOP, out: 33.1, lines: [{ t: 30.35, cls: 'h3', html: 'Toothpaste?' }, { t: 31.2, cls: 'h2', html: '<span class="acc">Swallow it</span>', gap: 22 }, { t: 32.0, cls: 'h3', html: 'or spit in a towel', gap: 20 }] },
  { y: TOP, out: 33.9, lines: [{ t: 33.25, cls: 'h1', html: 'No sink' }] },
  { y: TOP, out: 35.6, lines: [{ t: 34.4, cls: 'h3', html: 'Your drinking water?' }] },
  { y: TOP, out: 40.3, lines: [{ t: 38.8, cls: 'h2', html: 'Sweat <span class="cool">+</span> urine' }] },
  { y: TOP, out: 43.2, lines: [{ t: 40.5, cls: 'h3', html: 'Cleaner than' }, { t: 41.2, cls: 'h2', html: 'most tap water', gap: 22 }] },
  { y: TOP, out: 45.6, lines: [{ t: 43.65, cls: 'h1', html: 'No <span class="acc">bread</span>' }] },
  { y: TOP, out: 47.7, lines: [{ t: 45.9, cls: 'h2', html: 'Crumbs float' }] },
  { y: TOP, out: 49.2, lines: [{ t: 47.95, cls: 'h1', html: 'Tortillas' }] },
  { y: TOP, out: 52.8, lines: [{ t: 49.4, cls: 'h3', html: 'Salt & pepper' }, { t: 50.8, cls: 'h1', html: '<span class="cool">liquid</span>', gap: 20 }] },
  { y: TOP, out: 56.1, lines: [{ t: 54.4, cls: 'h3', html: 'Hundreds of' }, { t: 54.9, cls: 'h2', html: 'experiments', gap: 22 }] },
  { y: TOP, out: 58.3, lines: [{ t: 56.3, cls: 'h3', html: 'You are' }, { t: 56.8, cls: 'h2', html: 'the experiment', gap: 22 }] },
  { y: TOP, out: 60.5, lines: [{ t: 58.7, cls: 'h2', html: 'Your body changes' }] },
  { y: TOP, out: 64.2, lines: [{ t: 60.7, cls: 'h3', html: 'Bone mass' }, { t: 61.9, cls: 'h1', html: '<span class="acc">−1%</span> a month', gap: 22 }] },
  { y: TOP, out: 66.8, lines: [{ t: 64.6, cls: 'h3', html: 'Exercise' }, { t: 65.3, cls: 'h1', html: '2 hours a day', gap: 22 }] },
  { y: TOP, out: 69.4, lines: [{ t: 67.45, cls: 'h2', html: 'You get taller' }] },
  { y: TOP, out: 73.5, lines: [{ t: 72.35, cls: 'h1', html: 'But…' }] },
  { y: TOP, out: 75.4, lines: [{ t: 73.7, cls: 'h2', html: 'gone back on Earth' }] },
  { y: TOP, out: 78.4, lines: [{ t: 76.6, cls: 'thin', html: 'Cupola' }] },
  { y: TOP, out: 80.3, lines: [{ t: 78.65, cls: 'h2', html: 'Biggest window' }, { t: 79.2, cls: 'h3', html: 'on the station', gap: 22 }] },
  { y: TOP, out: 84.4, lines: [{ t: 82.9, cls: 'h3', html: 'Night sweeps across' }] },
  { y: LOW, out: 88.0, lines: [{ t: 86.6, cls: 'h2', html: 'Everything you know' }] },
  { y: LOW, out: 89.7, lines: [{ t: 88.2, cls: 'h2', html: 'Everyone you love' }] },
  { y: LOW, out: 91.9, lines: [{ t: 89.86, cls: 'h3', html: 'on one small' }, { t: 90.4, cls: 'h1', html: '<span class="cool">blue dot</span>', gap: 22 }] },
  { y: LOW, out: 95.8, lines: [{ t: 94.5, cls: 'h3', html: 'Back to sleep' }] },
  { y: TOP, out: 98.25, lines: [{ t: 96.25, cls: 'h2', html: 'And the sun rises' }, { t: 97.0, cls: 'h1', html: '<span class="acc">again</span>', gap: 20 }] },
  { y: TOP, out: 100.5, lines: [{ t: 98.4, cls: 'h3', html: 'before you even' }, { t: 99.0, cls: 'h2', html: 'fall asleep', gap: 22 }] },
];
const SIZES = { h1: 76, h2: 56, h3: 40, thin: 96 };
const lh = cls => { for (const k in SIZES) if (cls.split(' ').includes(k)) return SIZES[k]; return 50; };

function content(html, t) {
  if (html.startsWith('roll:')) {
    const [, txt, a, b] = html.split(':'); const k = lin(t, +a, +b); const f = Math.floor(t * 30);
    let out = '', di = 0; const n = txt.replace(/,/g, '').length;
    for (const ch of txt) { if (ch === ',') { out += ','; continue; } out += k >= (di + 1) / n ? ch : String(Math.floor(hash(f * 31 + di) * 10)); di++; }
    return out;
  }
  return html;
}
function cues(t) {
  let s = '';
  for (const c of CUES) {
    if (t < c.lines[0].t - 0.05 || t > c.out + 0.35) continue;
    const outK = ss(t, c.out, c.out + 0.3); let y = c.y;
    for (const L of c.lines) {
      y += L.gap || 0; const k = ss(t, L.t, L.t + 0.42);
      if (k > 0) {
        const a = k * (1 - outK), blur = (1 - k) * 14 + outK * 8, dy = (1 - eo(k)) * 22, sc = 1 + (1 - eo(k)) * 0.05;
        s += `<div class="c ${L.cls}" style="top:${y}px;opacity:${a.toFixed(3)};filter:blur(${blur.toFixed(2)}px);transform:translateY(${dy.toFixed(1)}px) scale(${sc.toFixed(4)})">${content(L.html, t)}</div>`;
      }
      y += lh(L.cls);
    }
  }
  return s;
}

function hud(t, S) {
  let s = '', svg = '';
  for (const h of S.hud) {
    if (h.a <= 0.001) continue;
    if (h.type === 'sunrise') {
      s += `<div class="c mono" style="top:190px;opacity:${h.a};font-size:26px;letter-spacing:.3em;color:#9fb3c4">SUNRISE ${String(h.n).padStart(2, '0')} / 16</div>`;
    }
    if (h.type === 'orbit') {
      const mins = Math.round(90 * h.k);
      s += `<div class="c mono" style="top:1360px;opacity:${h.a};font-size:30px;letter-spacing:.2em;color:#cfe6f5">T+ ${String(mins).padStart(2, '0')}:00 <span style="color:#7d93a6">/ 90:00</span></div>`;
    }
    if (h.type === 'alt') {
      const { p0, p1, k } = h; const x = p0.x + 140; const y1 = p0.y + (p1.y - p0.y) * k;
      svg += `<g opacity="${h.a}" stroke="rgba(220,240,255,.85)" stroke-width="2.5" fill="none"><line x1="${x}" y1="${p0.y}" x2="${x}" y2="${y1}"/><line x1="${x - 14}" y1="${p0.y}" x2="${x + 14}" y2="${p0.y}"/><line x1="${x - 14}" y1="${y1}" x2="${x + 14}" y2="${y1}"/><line x1="${p1.x + 14}" y1="${p1.y}" x2="${x - 18}" y2="${p1.y}" stroke-dasharray="6 8" opacity="${k}"/></g>`;
      s += `<div class="lab" style="left:${x + 26}px;top:${(p0.y + y1) / 2 - 16}px;opacity:${h.a * k};font-size:30px;color:#fff">400 KM</div>`;
      s += `<div class="lab" style="left:${p1.x - 60}px;top:${p1.y - 56}px;opacity:${h.a * k};font-size:22px;color:#8FD6FF">ISS</div>`;
    }
    if (h.type === 'clock') {
      const vis = h.blink ? (Math.floor(t * 4) % 2 ? 1 : 0.25) : 1;
      s += `<div class="c mono" style="top:700px;opacity:${h.a * vis};font-size:150px;font-weight:500;letter-spacing:.04em">${h.text}</div>`;
      s += `<div class="c mono" style="top:875px;opacity:${h.a};font-size:28px;letter-spacing:.4em;color:#9fb3c4">${h.sub}</div>`;
    }
    if (h.type === 'gauge') {
      const cx = 540, cy = 1430, r = 110, C = 2 * Math.PI * r, f = h.v / 100;
      svg += `<g opacity="${h.a}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.15)" stroke-width="10"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8FD6FF" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 ${cx} ${cy})"/></g>`;
      s += `<div class="c mono" style="top:${cy - 44}px;opacity:${h.a};font-size:64px">${h.v}%</div><div class="c mono" style="top:${cy + 26}px;opacity:${h.a};font-size:20px;letter-spacing:.3em;color:#9fb3c4">RECYCLED</div>`;
    }
    if (h.type === 'months') {
      s += `<div class="c mono" style="top:1420px;opacity:${h.a};font-size:30px;letter-spacing:.18em;color:#cfe6f5">MONTH ${h.m} &nbsp;·&nbsp; BONE ${100 - h.m}%</div>`;
      svg += `<g opacity="${h.a}"><rect x="290" y="1480" width="500" height="8" fill="rgba(255,255,255,.15)"/><rect x="290" y="1480" width="${500 * (100 - h.m) / 100}" height="8" fill="#FF8A3D"/></g>`;
    }
    if (h.type === 'timer') {
      const cx = 540, cy = 1440, r = 100, C = 2 * Math.PI * r;
      svg += `<g opacity="${h.a}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FF8A3D" stroke-width="8" stroke-dasharray="${C * h.k} ${C}" transform="rotate(-90 ${cx} ${cy})"/></g>`;
      const hh = Math.floor(2 * h.k), mm = Math.floor((120 * h.k) % 60);
      s += `<div class="c mono" style="top:${cy - 30}px;opacity:${h.a};font-size:52px">${hh}:${String(mm).padStart(2, '0')}</div>`;
    }
    if (h.type === 'height') {
      const { p0, p1 } = h; const x = Math.max(p0.x, p1.x) + 40;
      svg += `<g opacity="${h.a}" stroke="#FF8A3D" stroke-width="3" fill="none"><line x1="${x}" y1="${p0.y}" x2="${x}" y2="${p1.y}"/><line x1="${x - 16}" y1="${p0.y}" x2="${x + 16}" y2="${p0.y}"/><line x1="${x - 16}" y1="${p1.y}" x2="${x + 16}" y2="${p1.y}"/></g>`;
      s += `<div class="lab" style="left:${x + 26}px;top:${(p0.y + p1.y) / 2 - 22}px;opacity:${h.a};font-size:44px;color:#FF8A3D">+${h.cm} CM</div>`;
    }
  }
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0">${svg}</svg>` + s;
}

export function drawOverlay(t, S) { ov.innerHTML = hud(t, S) + cues(t); }
