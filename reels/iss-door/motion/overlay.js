// Keyword typography + HUD for "What if you opened the ISS door?"
const ov = document.getElementById('ov');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => { const x = lin(t, a, b); return x * x * (3 - 2 * x); };
const eo = x => 1 - Math.pow(1 - x, 3);
const fmt = n => Math.round(n).toLocaleString('en-US');

const TOP = 300, LOW = 1330;
const CUES = [
  { y: TOP, out: 3.5, lines: [{ t: 0.3, cls: 'h3', html: 'What if you opened' }, { t: 1.1, cls: 'h1', html: 'the <span class="acc">ISS</span> door?', gap: 26 }] },
  { y: LOW, out: 5.6, lines: [{ t: 3.85, cls: 'h3', html: '…and stepped outside' }] },
  { y: TOP, out: 8.3, lines: [{ t: 5.96, cls: 'h3', html: 'Good news' }, { t: 7.24, cls: 'h1', html: 'You <span class="acc">can’t</span>', gap: 26 }] },
  { y: TOP, out: 11.5, lines: [{ t: 9.0, cls: 'h2', html: 'Hatches open inward' }] },
  { y: TOP, out: 14.3, lines: [{ t: 11.7, cls: 'h1 mono', html: '14.7 psi' }, { t: 12.9, cls: 'h3', html: 'on every square inch', gap: 24 }] },
  { y: LOW, out: 20.2, lines: [{ t: 18.25, cls: 'h2', html: '≈ 3 elephants' }, { t: 19.1, cls: 'h3', html: 'holding it shut', gap: 22 }] },
  { y: TOP, out: 23.3, lines: [{ t: 21.6, cls: 'h3', html: 'The airlock' }] },
  { y: TOP, out: 24.6, lines: [{ t: 23.45, cls: 'h1', html: 'Outer hatch <span class="acc">fails</span>' }] },
  { y: TOP, out: 27.2, lines: [{ t: 26.0, cls: 'h2', html: 'Air rushes out' }] },
  { y: TOP, out: 29.1, lines: [{ t: 27.3, cls: 'h3', html: 'Everything goes with it' }] },
  { y: LOW, out: 33.0, lines: [{ t: 31.6, cls: 'h2', html: 'Instant <span class="cool">fog</span>' }] },
  { y: 880, out: 38.2, lines: [{ t: 36.7, cls: 'thin', html: 'Silence' }] },
  { y: TOP, out: 40.6, lines: [{ t: 38.6, cls: 'h3', html: 'Most important' }] },
  { y: TOP, out: 42.1, lines: [{ t: 40.8, cls: 'h1', html: '<span class="acc">Breathe out</span>' }] },
  { y: TOP, out: 44.8, lines: [{ t: 42.2, cls: 'h3', html: 'Hold your breath' }, { t: 43.2, cls: 'h2', html: 'lungs can <span class="acc">rupture</span>', gap: 22 }] },
  { y: TOP, out: 47.9, lines: [{ t: 45.0, cls: 'h2', html: 'You don’t explode' }, { t: 46.4, cls: 'h3', html: 'Blood doesn’t boil', gap: 22 }] },
  { y: TOP, out: 50.1, lines: [{ t: 48.0, cls: 'h3', html: 'But the water' }, { t: 48.6, cls: 'h1', html: 'on your tongue <span class="acc">does</span>', gap: 22 }] },
  { y: TOP, out: 55.0, lines: [{ t: 50.4, cls: 'h1 mono', html: '1966' }, { t: 51.5, cls: 'h3', html: 'NASA test chamber', gap: 22 }] },
  { y: TOP, out: 58.8, lines: [{ t: 54.9, cls: 'h3', html: 'His last memory' }, { t: 56.5, cls: 'h2', html: 'saliva <span class="acc">bubbling</span>', gap: 22 }] },
  { y: TOP, out: 60.9, lines: [{ t: 59.1, cls: 'h2', html: 'Skin swells' }] },
  { y: TOP, out: 63.6, lines: [{ t: 61.0, cls: 'h3', html: 'before you pass out' }] },
  { y: TOP, out: 65.7, lines: [{ t: 64.0, cls: 'h3', html: 'You won’t freeze instantly' }] },
  { y: TOP, out: 67.8, lines: [{ t: 65.9, cls: 'h2', html: 'Space is a <span class="cool">thermos</span>' }] },
  { y: LOW, out: 77.7, lines: [{ t: 76.45, cls: 'h1', html: 'You could <span class="cool">survive</span>' }] },
  { y: TOP, out: 79.3, lines: [{ t: 78.1, cls: 'h3', html: 'The wild part' }] },
  { y: TOP, out: 81.5, lines: [{ t: 79.5, cls: 'h2', html: 'The station leaks' }] },
  { y: TOP, out: 84.0, lines: [{ t: 81.7, cls: 'h1 mono', html: '2020' }, { t: 82.5, cls: 'h3', html: 'crew tracked one down', gap: 22 }] },
  { y: TOP, out: 86.2, lines: [{ t: 84.3, cls: 'h3', html: 'using floating' }, { t: 85.0, cls: 'h1', html: '<span class="acc">tea leaves</span>', gap: 22 }] },
  { y: LOW, out: 90.2, lines: [{ t: 87.9, cls: 'h2', html: 'Keep that door' }, { t: 88.8, cls: 'h1', html: '<span class="acc">closed</span>', gap: 20 }] },
];
const SIZES = { h1: 76, h2: 56, h3: 40, thin: 96 };
const lh = cls => { for (const k in SIZES) if (cls.split(' ').includes(k)) return SIZES[k]; return 50; };
function cues(t) {
  let s = '';
  for (const c of CUES) {
    if (t < c.lines[0].t - 0.05 || t > c.out + 0.35) continue;
    const outK = ss(t, c.out, c.out + 0.3); let y = c.y;
    for (const L of c.lines) {
      y += L.gap || 0; const k = ss(t, L.t, L.t + 0.42);
      if (k > 0) { const a = k * (1 - outK), blur = (1 - k) * 14 + outK * 8, dy = (1 - eo(k)) * 22, sc = 1 + (1 - eo(k)) * 0.05;
        s += `<div class="c ${L.cls}" style="top:${y}px;opacity:${a.toFixed(3)};filter:blur(${blur.toFixed(2)}px);transform:translateY(${dy.toFixed(1)}px) scale(${sc.toFixed(4)})">${L.html}</div>`; }
      y += lh(L.cls);
    }
  }
  return s;
}
function hud(t, S) {
  let s = '', svg = '';
  for (const h of S.hud) {
    if (h.a <= 0.001) continue;
    if (h.type === 'pressure') { // arrows pressing on the hatch from the cabin side
      const cx = h.c.x, cy = h.c.y, hw = Math.abs(h.s.x - cx) * 1.05;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const x = cx + (i - 2) / 2 * hw * 0.8, y = cy + (j - 2) / 2 * hw * 0.8;
        const ph = ((t * 1.2 + (i + j) * 0.13) % 1); const len = 46 * h.k;
        const y0 = y - 50 - ph * 22;
        svg += `<g opacity="${h.a * (0.35 + 0.65 * (1 - ph))}" stroke="#8FD6FF" stroke-width="5" fill="none"><line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + len}"/><polyline points="${x - 7},${y0 + len - 8} ${x},${y0 + len} ${x + 7},${y0 + len - 8}"/></g>`;
      }
      svg += `<rect x="${cx - hw}" y="${cy - hw}" width="${2 * hw}" height="${2 * hw}" rx="40" fill="none" stroke="rgba(143,214,255,.6)" stroke-width="2" stroke-dasharray="10 10" opacity="${h.a}"/>`;
    }
    if (h.type === 'lbs') s += `<div class="c mono" style="top:1180px;opacity:${h.a};font-size:96px;font-weight:500">${fmt(h.v)}<span style="font-size:40px;color:#9fb3c4"> LB</span></div>`;
    if (h.type === 'temp') s += `<div class="c mono" style="top:1180px;opacity:${h.a};font-size:84px;color:#8FD6FF">${h.v}°F</div><div class="c mono" style="top:1290px;opacity:${h.a};font-size:24px;letter-spacing:.3em;color:#9fb3c4">CABIN TEMP ▼</div>`;
    if (h.type === 'wave') {
      let d = ''; const N = 120, y0 = 1420;
      for (let i = 0; i <= N; i++) { const x = 120 + 840 * i / N; const v = Math.sin(i * 0.7 + t * 25) * Math.sin(i * 0.13 + t * 3) * 70 * h.amp; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y0 + v).toFixed(1) + ' '; }
      svg += `<path d="${d}" fill="none" stroke="rgba(230,240,250,.8)" stroke-width="3" opacity="${h.a}"/>`;
      s += `<div class="c mono" style="top:1520px;opacity:${h.a * 0.8};font-size:22px;letter-spacing:.3em;color:#9fb3c4">SOUND ${Math.round(h.amp * 100)}%</div>`;
    }
    if (h.type === 'gauge') {
      const cx = 540, cy = 1450, r = 120, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, f = h.v / 14.7, ang = a0 + (a1 - a0) * f;
      const arc = (p) => `${cx + Math.cos(p) * r},${cy + Math.sin(p) * r}`;
      svg += `<g opacity="${h.a}"><path d="M ${arc(a0)} A ${r} ${r} 0 1 1 ${arc(a1)}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="8"/><line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(ang) * (r - 14)}" y2="${cy + Math.sin(ang) * (r - 14)}" stroke="#fff" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="8" fill="#fff"/></g>`;
      s += `<div class="c mono" style="top:${cy + 50}px;opacity:${h.a};font-size:40px">${h.v.toFixed(1)} PSI</div>`;
    }
    if (h.type === 'count') s += `<div class="c mono" style="top:760px;opacity:${h.a};font-size:220px;font-weight:500;color:#fff">${h.v}</div><div class="c mono" style="top:1000px;opacity:${h.a};font-size:26px;letter-spacing:.4em;color:#FF8A3D">SECONDS</div>`;
    if (h.type === 'hot') s += `<div class="lab" style="left:${Math.min(820, h.p.x) - 80}px;top:${h.p.y - 120}px;opacity:${h.a};font-size:64px;color:#FF8A3D">+${h.v}°F</div><div class="lab" style="left:${Math.min(820, h.p.x) - 80}px;top:${h.p.y - 46}px;opacity:${h.a};font-size:22px;color:#FFB385">IN THE SUN</div>`;
    if (h.type === 'cold') s += `<div class="lab" style="left:${Math.max(80, h.p.x)}px;top:${h.p.y + 20}px;opacity:${h.a};font-size:64px;color:#8FD6FF">−${h.v}°F</div><div class="lab" style="left:${Math.max(80, h.p.x)}px;top:${h.p.y + 94}px;opacity:${h.a};font-size:22px;color:#BFE6FF">IN THE SHADE</div>`;
    if (h.type === 'timer') {
      const cx = 540, cy = 1420, r = 110, C = 2 * Math.PI * r; const sec = Math.round(90 * h.k);
      svg += `<g opacity="${h.a}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.15)" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8FD6FF" stroke-width="8" stroke-dasharray="${C * h.k} ${C}" transform="rotate(-90 ${cx} ${cy})"/></g>`;
      s += `<div class="c mono" style="top:${cy - 32}px;opacity:${h.a};font-size:58px">${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</div>`;
    }
  }
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0">${svg}</svg>` + s;
}
export function drawOverlay(t, S) { ov.innerHTML = hud(t, S) + cues(t); }
