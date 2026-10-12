// Typography + HUD layer, rebuilt every frame from the timeline.
const ov = document.getElementById('ov');
const back = document.getElementById('back');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => { const x = lin(t, a, b); return x * x * (3 - 2 * x); };
const eo = x => 1 - Math.pow(1 - x, 3);
const fmt = n => Math.round(n).toLocaleString('en-US');

// Each cue: lines appear at their own time; whole cue leaves at `out`.
// y = top of the block in px. Keep text away from the bottom ~22% (reel UI) and right edge.
const CUES = [
  { y: 330, out: 2.32, lines: [{ t: 0.18, cls: 'h3', html: 'What if the Moon' }, { t: 1.25, cls: 'h1', html: '<span class="acc">Crashed</span> into Earth?', gap: 34 }] },
  { y: 1240, out: 4.0, lines: [{ t: 3.05, cls: 'h2 mono', html: 'strike:Not a meteor:3.7' }] },
  { y: 1300, out: 5.25, lines: [{ t: 4.2, cls: 'h2 mono', html: 'strike:Not an asteroid:4.95' }] },
  { y: 1430, out: 6.55, lines: [{ t: 5.45, cls: 'thin', html: 'The Moon' }] },
  { y: 1390, out: 9.45, lines: [{ t: 6.72, cls: 'h2 mono', html: 'roll:73,000,000,000,000,000,000:6.72:8.6' }, { t: 8.55, cls: 'h3', html: 'Tons of rock', gap: 30 }] },
  { y: 1420, out: 10.95, lines: [{ t: 9.5, cls: 'h1', html: 'Heading straight' }, { t: 9.85, cls: 'h1', html: '<span class="acc">for us</span>', gap: 14 }] },
  { y: 1330, out: 16.85, lines: [{ t: 15.7, cls: 'h2', html: 'Let’s pull it closer' }] },
  { y: 330, out: 19.4, lines: [{ t: 17.5, cls: 'h3', html: 'At half the distance' }] },
  { y: 330, out: 21.3, lines: [{ t: 19.5, cls: 'h1', html: '<span class="acc">2×</span> wider' }, { t: 20.6, cls: 'h3', html: 'in the sky', gap: 26 }] },
  { y: 300, out: 24.85, lines: [{ t: 22.2, cls: 'h3', html: 'Pull on the oceans' }, { t: 23.7, cls: 'h1', html: '<span class="acc">8×</span> stronger', gap: 30 }] },
  { y: 300, out: 29.6, lines: [{ t: 25.45, cls: 'h3', html: 'High tide' }, { t: 27.45, cls: 'h2', html: 'floods the <span class="cool">coastlines</span>', gap: 28 }] },
  { y: 300, out: 33.9, lines: [{ t: 32.2, cls: 'h1', html: '<span class="cool">Underwater</span>' }, { t: 33.25, cls: 'h3', html: 'Twice a day', gap: 30 }] },
  { y: 1330, out: 35.4, lines: [{ t: 34.5, cls: 'h3', html: 'Keep pulling' }] },
  { y: 1330, out: 38.35, lines: [{ t: 36.45, cls: 'h3', html: 'Gravity tugs the ground' }] },
  { y: 1300, out: 41.5, lines: [{ t: 38.6, cls: 'h1 quake', html: 'Earthquakes' }, { t: 39.62, cls: 'h1', html: '<span class="acc">Volcanoes</span>', gap: 16 }] },
  { y: 1350, out: 45.4, lines: [{ t: 44.1, cls: 'h2', html: 'Something wild happens' }] },
  { y: 1330, out: 51.3, lines: [{ t: 50.0, cls: 'h1 quake', html: 'Ripped <span class="acc">apart</span>' }] },
  { y: 1330, out: 54.3, lines: [{ t: 52.35, cls: 'h3', html: 'Never in one piece' }] },
  { y: 1330, out: 57.3, lines: [{ t: 55.85, cls: 'h2', html: 'Trillions of fragments' }] },
  { y: 300, out: 60.95, lines: [{ t: 57.95, cls: 'h1', html: 'A ring' }, { t: 58.4, cls: 'h3', html: 'around Earth', gap: 26 }, { t: 59.85, cls: 'h3 dim', html: 'like Saturn’s', gap: 20 }] },
  { y: 1300, out: 64.2, lines: [{ t: 61.1, cls: 'h2', html: 'Beautiful?' }, { t: 61.9, cls: 'h2', html: 'Absolutely.', gap: 14 }, { t: 63.3, cls: 'h3 dim', html: 'For a little while', gap: 30 }] },
  { y: 300, out: 66.4, lines: [{ t: 65.3, cls: 'h3', html: 'Then they fall' }] },
  { y: 300, out: 69.6, lines: [{ t: 66.65, cls: 'h1', html: 'Massive chunks' }, { t: 67.5, cls: 'h3', html: 'rain down', gap: 26 }, { t: 68.45, cls: 'h3 acc', html: 'every single day', gap: 18 }] },
  { y: 300, out: 72.9, lines: [{ t: 70.25, cls: 'h1', html: 'Sky: <span class="acc">red hot</span>' }, { t: 71.4, cls: 'h3', html: 'Oceans boil away', gap: 30 }] },
  { y: 300, out: 75.1, lines: [{ t: 73.9, cls: 'h2', html: 'A sea of <span class="acc">magma</span>' }] },
  { y: 300, out: 78.05, lines: [{ t: 76.35, cls: 'h1', html: 'Planet of <span class="acc">fire</span>' }] },
  { y: 870, out: 79.35, lines: [{ t: 78.2, cls: 'h3', html: 'Nothing survives' }] },
  { y: 820, out: 81.3, lines: [{ t: 79.65, cls: 'h3', html: 'Here’s the crazy part' }] },
  { y: 820, out: 83.6, lines: [{ t: 82.3, cls: 'h2', html: 'It happened before' }] },
  { y: 300, out: 86.3, lines: [{ t: 83.78, cls: 'h2 mono', html: '4.5 billion' }, { t: 84.2, cls: 'h3', html: 'years ago', gap: 24 }] },
  { y: 300, out: 89.6, lines: [{ t: 88.25, cls: 'h3', html: 'The debris…' }] },
  { y: 300, out: 91.3, lines: [{ t: 89.95, cls: 'h2', html: 'became the <span class="cool">Moon</span>' }] },
  { y: 1330, out: 93.7, lines: [{ t: 92.0, cls: 'h3', html: 'Born from a' }, { t: 92.8, cls: 'h1', html: '<span class="acc">collision</span>', gap: 22 }] },
  { y: 1300, out: 96.6, lines: [{ t: 93.9, cls: 'h2', html: 'Let’s hope it never' }, { t: 94.85, cls: 'h1', html: 'comes <span class="acc">home</span>', gap: 22 }] },
];

const SIZES = { h1: 76, h2: 56, h3: 40, thin: 96 };
function lineHeight(cls) { for (const k in SIZES) if (cls.split(' ').includes(k)) return SIZES[k]; return 50; }

function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

function renderLineContent(html, t) {
  if (html.startsWith('strike:')) {
    const [, txt, ts] = html.split(':');
    const k = eo(lin(t, +ts, +ts + 0.25));
    return `<span style="position:relative;display:inline-block">${txt}<span class="strike" style="left:-3%;top:46%;width:${k * 106}%"></span></span>`;
  }
  if (html.startsWith('roll:')) {
    const [, txt, a, b] = html.split(':');
    const k = lin(t, +a, +b);
    const frame = Math.floor(t * 30);
    let out = '', di = 0;
    const digits = txt.replace(/,/g, '').length;
    for (const ch of txt) {
      if (ch === ',') { out += ','; continue; }
      const settled = k >= (di + 1) / digits;
      out += settled ? ch : String(Math.floor(hash(frame * 31 + di) * 10));
      di++;
    }
    return out;
  }
  return html;
}

function cueHTML(t) {
  let s = '';
  for (const c of CUES) {
    const first = c.lines[0].t;
    if (t < first - 0.05 || t > c.out + 0.35) continue;
    const outK = ss(t, c.out, c.out + 0.3);
    let y = c.y;
    for (const L of c.lines) {
      y += L.gap || 0;
      const h = lineHeight(L.cls);
      const k = ss(t, L.t, L.t + 0.42);
      if (k > 0) {
        const a = k * (1 - outK);
        const blur = (1 - k) * 14 + outK * 8;
        const dy = (1 - eo(k)) * 22;
        const sc = 1 + (1 - eo(k)) * 0.05;
        let jx = 0, jy = 0;
        if (L.cls.includes('quake')) { const q = Math.exp(-(t - L.t) * 2.2) * 9; jx = (hash(t * 97) - 0.5) * q; jy = (hash(t * 53 + 1) - 0.5) * q; }
        const dim = L.cls.includes('dim') ? 0.7 : 1;
        s += `<div class="c ${L.cls}" style="top:${y}px;opacity:${(a * dim).toFixed(3)};filter:blur(${blur.toFixed(2)}px);transform:translate(${jx.toFixed(1)}px,${(dy + jy).toFixed(1)}px) scale(${sc.toFixed(4)})">${renderLineContent(L.html, t)}</div>`;
      }
      y += h;
    }
  }
  return s;
}

// --- skyline (generated once) ---
const SKY = (() => {
  let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let x = -10, d = 'M -10 1920 ';
  const lights = [];
  while (x < 1100) {
    const w = 18 + r() * 60;
    const tall = r() < 0.12;
    const h = (tall ? 330 + r() * 260 : 70 + Math.pow(r(), 2) * 260);
    const top = 1520 - h;
    d += `L ${x.toFixed(1)} ${top.toFixed(1)} `;
    if (tall && r() < 0.6) { const ax = x + w * 0.5; d += `L ${ax - 2} ${top} L ${ax - 2} ${top - 60 - r() * 70} L ${ax + 2} ${top - 60 - r() * 70} L ${ax + 2} ${top} `; }
    d += `L ${(x + w).toFixed(1)} ${top.toFixed(1)} `;
    for (let i = 0; i < w * h / 2600; i++) if (r() < 0.35) lights.push([x + 3 + r() * (w - 6), top + 8 + r() * (h - 10), r()]);
    x += w + (r() < 0.2 ? r() * 12 : 0);
  }
  d += 'L 1100 1920 Z';
  const lp = lights.map(([lx, ly, b]) => `<rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="3" height="4" fill="rgba(255,196,130,${(0.18 + b * 0.45).toFixed(2)})"/>`).join('');
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0">
    <defs><linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,150,90,0)"/><stop offset="1" stop-color="rgba(255,140,80,0.16)"/></linearGradient></defs>
    <rect x="0" y="1150" width="1080" height="380" fill="url(#haze)"/>
    <path d="${d}" fill="#020306"/>${lp}
    <rect x="0" y="1520" width="1080" height="400" fill="#020306"/></svg>`;
})();

function hudHTML(t, S) {
  let s = '';
  let svg = '';
  for (const h of S.hud) {
    if (h.a <= 0.001) continue;
    if (h.type === 'counter' || h.type === 'dist') {
      // distance read-out: top of frame, or beside the line in the true-scale shot
      const top = h.type === 'dist' ? (h.pe.y + h.pm.y) / 2 - 150 : (h.top ?? 250);
      s += `<div class="c" style="top:${top}px;opacity:${h.a}"><div class="lab" style="position:static;font-size:24px;letter-spacing:.3em;color:#9fb3c4">Earth — Moon distance</div>
        <div class="mono" style="font-size:68px;margin-top:14px;letter-spacing:.04em">${fmt(h.label)} <span style="font-size:34px;color:#9fb3c4">MI</span></div></div>`;
    }
    if (h.type === 'dist') {
      const { pe, pm } = h;
      const k = eo(clamp((t - 11.6) / 1.0));
      const y0 = pe.y - 40, y1 = pm.y + 26;
      const ye = y0 + (y1 - y0) * k;
      svg += `<g opacity="${h.a}"><circle cx="${pe.x}" cy="${pe.y}" r="38" fill="none" stroke="rgba(220,235,245,.6)" stroke-width="2"/>
        <circle cx="${pm.x}" cy="${pm.y}" r="20" fill="none" stroke="rgba(220,235,245,.6)" stroke-width="2"/>
        <line x1="${pe.x}" y1="${y0}" x2="${pe.x + (pm.x - pe.x) * k}" y2="${ye}" stroke="rgba(220,235,245,.5)" stroke-width="2" stroke-dasharray="10 12"/></g>`;
      s += `<div class="lab" style="left:${pe.x + 56}px;top:${pe.y - 16}px;opacity:${h.a}">Earth</div>`;
      s += `<div class="lab" style="left:${pm.x + 38}px;top:${pm.y - 16}px;opacity:${h.a}">Moon</div>`;
      s += `<div class="c mono" style="top:${(pe.y + pm.y) / 2 + 10}px;opacity:${h.a * h.show};color:#8FD6FF;font-size:28px">384,400 km</div>`;
    }
    if (h.type === 'skyline') back.innerHTML = SKY;
    if (h.type === 'ghost') {
      svg += `<g opacity="${h.a}"><circle cx="${h.x}" cy="${h.y}" r="${h.r}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.5" stroke-dasharray="8 10"/></g>`;
      s += `<div class="lab" style="left:${h.x - h.r - 10}px;top:${h.y - h.r - 50}px;opacity:${h.a};transform:translateX(-50%)">Today</div>`;
    }
    if (h.type === 'marker') {
      const { x, y } = h.p;
      const lx = x + 70, ly = y - 90;
      svg += `<g opacity="${h.a}"><circle cx="${x}" cy="${y}" r="${10 + (1 - h.a) * 30}" fill="none" stroke="#8FD6FF" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4" fill="#fff"/>
        <polyline points="${x + 8},${y - 8} ${lx},${ly} ${lx + 40},${ly}" fill="none" stroke="rgba(220,240,255,.8)" stroke-width="2"/></g>`;
      s += `<div class="lab" style="left:${lx + 52}px;top:${ly - 30}px;opacity:${h.a};font-size:34px;font-weight:500;color:#fff;letter-spacing:.12em">${h.name}</div>`;
      s += `<div class="lab" style="left:${lx + 52}px;top:${ly + 12}px;opacity:${h.a * 0.8};font-size:22px;color:#8FD6FF">${h.coord}</div>`;
    }
    if (h.type === 'tide') {
      let d = '';
      const x0 = 240, x1 = 840, yb = 590, amp = 34;
      const n = Math.floor(80 * h.k);
      for (let i = 0; i <= n; i++) { const u = i / 80; const x = x0 + (x1 - x0) * u; const y = yb - Math.cos(u * Math.PI * 4) * amp; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; }
      svg += `<g opacity="${h.a}"><line x1="${x0}" y1="${yb + 50}" x2="${x1}" y2="${yb + 50}" stroke="rgba(255,255,255,.25)" stroke-width="2"/><path d="${d}" fill="none" stroke="#8FD6FF" stroke-width="4"/></g>`;
      s += `<div class="lab" style="left:${x0 - 6}px;top:${yb + 64}px;opacity:${h.a};font-size:20px;color:#9fb3c4">0 h</div><div class="lab" style="left:${x1 - 40}px;top:${yb + 64}px;opacity:${h.a};font-size:20px;color:#9fb3c4">24 h</div>`;
    }
    if (h.type === 'seismo') {
      let d = '';
      const yb = 1560, N = 140;
      for (let i = 0; i <= N; i++) {
        const u = i / N; const x = 80 + 920 * u;
        const age = (1 - u) * 1.2;
        const env = clamp(h.k * 1.6 - age * 0.6) ;
        const v = (Math.sin((t - age) * 60 + i) * 0.6 + Math.sin((t - age) * 97 + i * 1.7) * 0.4) * env * (20 + 70 * Math.pow(hash(i + Math.floor(t * 30) * 0.0), 1));
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (yb + v).toFixed(1) + ' ';
      }
      svg += `<g opacity="${h.a * 0.85}"><path d="${d}" fill="none" stroke="#FF8A3D" stroke-width="2.5"/></g>`;
      s += `<div class="lab" style="left:80px;top:${yb - 120}px;opacity:${h.a * 0.8};font-size:20px;color:#FFB385">Seismic activity</div>`;
    }
    if (h.type === 'tag') {
      s += `<div class="lab" style="left:${h.x + 18}px;top:${h.y - 44}px;opacity:${h.a};font-size:26px;color:#fff">${h.text}</div>`;
      s += `<div class="lab" style="left:${h.x + 18}px;top:${h.y - 10}px;opacity:${h.a * 0.8};font-size:20px;color:#8FD6FF">≈ 11,000 mi</div>`;
    }
    if (h.type === 'arrow') {
      const { p0, p1, k } = h;
      const x = p0.x + (p1.x - p0.x) * k, y = p0.y + (p1.y - p0.y) * k;
      const ang = Math.atan2(y - p0.y, x - p0.x);
      const hl = 22, col = h.acc ? '#FF8A3D' : '#E6EEF5';
      const a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85;
      svg += `<g opacity="${h.a}"><line x1="${p0.x}" y1="${p0.y}" x2="${x}" y2="${y}" stroke="${col}" stroke-width="${h.acc ? 6 : 4}"/>
        <polyline points="${x + Math.cos(a1) * hl},${y + Math.sin(a1) * hl} ${x},${y} ${x + Math.cos(a2) * hl},${y + Math.sin(a2) * hl}" fill="none" stroke="${col}" stroke-width="${h.acc ? 6 : 4}"/></g>`;
      const lx = h.side > 0 ? Math.min(p0.x, p1.x) - 40 : Math.max(p0.x, p1.x) + 30;
      const ly = h.side > 0 ? Math.max(p0.y, p1.y) + 30 : Math.min(p0.y, p1.y) - 100;
      const al = h.side > 0 ? 'transform:translateX(-50%)' : '';
      s += `<div class="lab" style="left:${lx}px;top:${ly}px;opacity:${h.a};font-size:28px;color:${col};${al}">${h.text}</div>`;
      s += `<div class="lab" style="left:${lx}px;top:${ly + 38}px;opacity:${h.a * 0.8};font-size:20px;${al}">${h.sub}</div>`;
    }
    if (h.type === 'rewind') {
      const k = clamp((t - 81.3) / 2.4);
      const yrs = Math.pow(10, 1 + k * 8.65);
      s += `<div class="c mono" style="top:1180px;opacity:${h.a * 0.85};font-size:30px;color:#9fb3c4;letter-spacing:.2em">◀◀ ${fmt(yrs)} YEARS</div>`;
    }
    if (h.type === 'theia') {
      const { x, y } = h.p;
      svg += `<g opacity="${h.a}"><line x1="${x - 30}" y1="${y + 110}" x2="${x - 120}" y2="${y + 230}" stroke="rgba(255,255,255,.7)" stroke-width="2"/></g>`;
      s += `<div class="lab" style="left:${x - 140}px;top:${y + 240}px;opacity:${h.a};font-size:40px;color:#fff;transform:translateX(-50%)">Theia</div>`;
      s += `<div class="lab" style="left:${x - 140}px;top:${y + 292}px;opacity:${h.a * 0.85};font-size:22px;color:#FFB385;transform:translateX(-50%)">Mars-sized planet</div>`;
    }
  }
  if (!S.hud.some(h => h.type === 'skyline')) back.innerHTML = '';
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0">${svg}</svg>` + s;
}

export function drawOverlay(t, S) {
  ov.innerHTML = hudHTML(t, S) + cueHTML(t);
}
