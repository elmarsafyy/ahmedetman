// Procedural models: ISS exterior, a station module interior, and an EVA-suited astronaut.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function canvasTex(w, h, draw, srgb = true, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function noiseFill(x, w, h, base, amp, r) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- textures
export function makeTextures() {
  const r = rng(42);
  const solar = canvasTex(512, 2048, (x, w, h) => {
    x.fillStyle = '#2a1d10'; x.fillRect(0, 0, w, h);
    const cw = 32, ch = 32;
    for (let y = 0; y < h; y += ch) for (let xx = 0; xx < w; xx += cw) {
      const v = 18 + r() * 10;
      x.fillStyle = `rgb(${v},${v + 8},${v + 34})`;
      x.fillRect(xx + 2, y + 2, cw - 3, ch - 3);
      x.fillStyle = 'rgba(160,170,210,0.10)'; x.fillRect(xx + 2, y + 2 + (ch - 3) / 2, cw - 3, 1);
    }
    for (let y = 0; y < h; y += ch * 8) { x.fillStyle = '#7a5a2a'; x.fillRect(0, y, w, 6); }
    x.fillStyle = '#8a6a35'; x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h);
  });
  const mli = canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = '#d9d6cf'; x.fillRect(0, 0, w, h);
    noiseFill(x, w, h, 0, 14, r);
    x.strokeStyle = 'rgba(90,90,90,0.35)'; x.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const xx = (i / 8) * w; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, h); x.stroke(); }
    for (let j = 0; j < 4; j++) { const y = (j / 3) * h; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(120,115,105,${0.08 + r() * 0.12})`; x.fillRect(r() * w, r() * h, 20 + r() * 80, 10 + r() * 50); }
    x.fillStyle = 'rgba(60,60,60,0.6)';
    for (let i = 0; i < 160; i++) x.fillRect(r() * w, r() * h, 3, 3);
  });
  const rack = canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#c9c7bf'; x.fillRect(0, 0, w, h);
    noiseFill(x, w, h, 0, 10, r);
    for (let i = 0; i < 26; i++) {
      const pw = 120 + r() * 320, ph = 80 + r() * 260, px = r() * (w - pw), py = r() * (h - ph);
      const g = 175 + r() * 50;
      x.fillStyle = `rgb(${g},${g - 2},${g - 8})`; x.fillRect(px, py, pw, ph);
      x.strokeStyle = 'rgba(70,70,70,0.6)'; x.lineWidth = 3; x.strokeRect(px, py, pw, ph);
      x.fillStyle = 'rgba(40,40,40,0.8)';
      for (const [a, b] of [[6, 6], [pw - 12, 6], [6, ph - 12], [pw - 12, ph - 12]]) x.fillRect(px + a, py + b, 6, 6);
      if (r() < 0.5) { x.fillStyle = 'rgba(30,30,30,0.75)'; for (let k = 0; k < 4; k++) x.fillRect(px + 14, py + 16 + k * 12, pw * (0.3 + r() * 0.4), 5); }
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = r() < 0.5 ? '#2b2b2b' : '#3b4a5c'; x.fillRect(r() * w, r() * h, 26 + r() * 30, 18 + r() * 20); } // velcro / connectors
    for (let i = 0; i < 6; i++) { // warning stickers
      const px = r() * (w - 120), py = r() * (h - 40);
      for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#1b1b1b' : '#e2b31c'; x.beginPath(); x.moveTo(px + k * 15, py); x.lineTo(px + k * 15 + 15, py); x.lineTo(px + k * 15 + 5, py + 30); x.lineTo(px + k * 15 - 10, py + 30); x.fill(); }
    }
    for (let i = 0; i < 12; i++) { x.fillStyle = ['#c0392b', '#2c6db5', '#e6e6e6', '#1d1d1d'][Math.floor(r() * 4)]; x.fillRect(r() * w, r() * h, 40 + r() * 70, 12); }
  });
  const fabric = canvasTex(512, 512, (x, w, h) => { // normal-ish bump for suit fabric (grayscale)
    x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 100 + r() * 60; x.fillStyle = `rgba(${v},${v},${v},0.25)`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    x.strokeStyle = 'rgba(60,60,60,0.35)'; x.lineWidth = 3;
    for (let i = 0; i < 26; i++) { x.beginPath(); const y = r() * h; x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 60, w * 0.6, y + (r() - 0.5) * 60, w, y + (r() - 0.5) * 30); x.stroke(); }
  }, false, true);
  const tortilla = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#e9d7a8'); g.addColorStop(0.9, '#dcc188'); g.addColorStop(1, '#c9a868');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const s = 3 + r() * 16; x.fillStyle = `rgba(${110 + r() * 50},${70 + r() * 30},${30},${0.25 + r() * 0.5})`; x.beginPath(); x.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.5), r() * 3, 0, 7); x.fill(); }
  });
  const leaf = canvasTex(256, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#3f8a2d'; x.beginPath(); x.moveTo(w / 2, h); x.bezierCurveTo(-20, h * 0.6, 10, h * 0.05, w / 2, 0); x.bezierCurveTo(w - 10, h * 0.05, w + 20, h * 0.6, w / 2, h); x.fill();
    x.strokeStyle = 'rgba(200,240,170,0.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2, 10); x.stroke();
    x.lineWidth = 1.5; for (let i = 1; i < 9; i++) { const y = h - i * h / 10; x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w * 0.15, y - 40); x.moveTo(w / 2, y); x.lineTo(w * 0.85, y - 40); x.stroke(); }
  });
  return { solar, mli, rack, fabric, tortilla, leaf };
}

// ---------------------------------------------------------------- ISS exterior
export function buildISS(T) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.6, roughness: 0.45 });
  const white = new THREE.MeshStandardMaterial({ map: T.mli, color: 0xffffff, metalness: 0.05, roughness: 0.75 });
  const solarM = new THREE.MeshStandardMaterial({ map: T.solar, color: 0xffffff, metalness: 0.55, roughness: 0.32, side: THREE.DoubleSide });
  const radM = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide });

  // truss: instanced lattice beams along X
  const beams = [];
  const L = 10.8, A = 0.24;
  const corners = [[A, A], [-A, A], [-A, -A], [A, -A]];
  for (const [y, z] of corners) beams.push({ p: [0, y, z], s: [L, 0.035, 0.035], r: [0, 0, 0] });
  for (let x = -L / 2; x <= L / 2 + 1e-6; x += 0.48) {
    for (let k = 0; k < 4; k++) {
      const [y0, z0] = corners[k], [y1, z1] = corners[(k + 1) % 4];
      beams.push({ p: [x, (y0 + y1) / 2, (z0 + z1) / 2], s: [0.025, Math.abs(y1 - y0) + 0.025, Math.abs(z1 - z0) + 0.025], r: [0, 0, 0] });
      if (x + 0.48 <= L / 2 + 1e-6) { // diagonal brace on each face
        const len = Math.hypot(0.48, 2 * A);
        const ang = Math.atan2(2 * A, 0.48);
        const face = { p: [x + 0.24, (y0 + y1) / 2, (z0 + z1) / 2], s: [len, 0.02, 0.02] };
        face.r = (y0 === y1) ? [0, (k % 2 ? 1 : -1) * ang, 0] : [0, 0, (k % 2 ? 1 : -1) * ang];
        beams.push(face);
      }
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const truss = new THREE.InstancedMesh(box, metal, beams.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  beams.forEach((b, i) => { q.setFromEuler(e.set(...b.r)); m4.compose(new THREE.Vector3(...b.p), q, new THREE.Vector3(...b.s)); truss.setMatrixAt(i, m4); });
  g.add(truss);

  // solar array wings (8), each with two blankets either side of a mast
  const wings = [];
  const blanket = new THREE.PlaneGeometry(0.46, 3.4);
  for (const x of [-4.95, -3.95, 3.95, 4.95]) {
    const gimbal = new THREE.Group(); gimbal.position.set(x, 0, 0); g.add(gimbal);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 24), white); hub.rotation.z = Math.PI / 2; gimbal.add(hub);
    for (const dir of [1, -1]) {
      const wing = new THREE.Group(); wing.position.y = dir * 0.3; gimbal.add(wing);
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.5, 0.05), metal); mast.position.y = dir * 1.75; wing.add(mast);
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(blanket, solarM); b.position.set(side * 0.27, dir * 1.78, 0); wing.add(b);
      }
      const tip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.06), metal); tip.position.y = dir * 3.5; wing.add(tip);
    }
    wings.push(gimbal);
  }
  // radiators
  for (const x of [-1.9, 1.9]) {
    for (let k = 0; k < 3; k++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.5), radM);
      p.rotation.x = Math.PI / 2; p.position.set(x + (k - 1) * 0.45, -0.05, 1.1); g.add(p);
    }
  }
  // pressurised modules along Z under the truss
  const mod = (r, len, z, x = 0, y = -0.62, axis = 'z') => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 40, 1), white);
    if (axis === 'z') m.rotation.x = Math.PI / 2; else m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z); g.add(m);
    const capG = new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const s of [1, -1]) {
      const c = new THREE.Mesh(capG, white); c.scale.y = 0.35;
      if (axis === 'z') { c.rotation.x = s * Math.PI / 2; c.position.set(x, y, z + s * len / 2); }
      else { c.rotation.z = -s * Math.PI / 2; c.position.set(x + s * len / 2, y, z); }
      g.add(c);
    }
    return m;
  };
  mod(0.21, 1.0, 0.2);            // Destiny
  mod(0.23, 0.6, 1.0);            // Harmony
  mod(0.22, 0.75, 1.0, 0.75, -0.62, 'x');  // Columbus
  mod(0.22, 1.1, 1.0, -0.95, -0.62, 'x');  // Kibo
  mod(0.22, 0.5, -0.55);          // Unity
  mod(0.2, 0.62, -0.55, 0.0, -0.62, 'z');
  mod(0.21, 1.25, -1.5);          // Zarya
  mod(0.2, 1.3, -2.85);           // Zvezda
  mod(0.21, 0.6, -0.55, -0.6, -0.62, 'x'); // Tranquility
  // cupola on Tranquility, facing nadir (-Y)
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 7), white); cup.position.set(-0.75, -0.9, -0.55); g.add(cup);
  const cupGlass = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshStandardMaterial({ color: 0x0b0f14, metalness: 0.9, roughness: 0.05 }));
  cupGlass.rotation.x = Math.PI / 2; cupGlass.position.set(-0.75, -0.985, -0.55); g.add(cupGlass);
  // Zvezda's own small arrays
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.36), solarM); w.position.set(s * 0.95, -0.62, -3.2); g.add(w);
  }
  // pylon connecting truss and lab
  const pyl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.3), metal); pyl.position.set(0, -0.35, 0.2); g.add(pyl);
  g.userData.wings = wings;
  g.userData.cupola = new THREE.Vector3(-0.75, -0.98, -0.55);
  return g;
}

// ---------------------------------------------------------------- module interior
export function buildInterior(T) {
  const g = new THREE.Group();
  const W = 2.1, LEN = 9;
  const rackM = new THREE.MeshStandardMaterial({ map: T.rack, roughness: 0.7, metalness: 0.05 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.3 });
  const railM = new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 0.5, metalness: 0.2 });
  const ledM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9) });
  const r = rng(7);
  for (let i = 0; i < LEN; i++) {
    const z = -i - 0.5;
    for (let k = 0; k < 4; k++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 0.08, 0.96), rackM);
      // vary texture region per panel
      const uv = panel.geometry.attributes.uv; const ox = r() * 0.5, oy = r() * 0.5;
      for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 0.5 + ox, uv.getY(j) * 0.5 + oy);
      const a = k * Math.PI / 2;
      panel.position.set(Math.sin(a) * W / 2, Math.cos(a) * W / 2, z);
      panel.rotation.z = -a;
      g.add(panel);
      // angled corner strip with LED light
      const ca = a + Math.PI / 4;
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.98), darkM);
      corner.position.set(Math.sin(ca) * W * 0.6, Math.cos(ca) * W * 0.6, z); corner.rotation.z = -ca; g.add(corner);
      if (k === 0 || k === 3) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.8), ledM);
        led.position.set(Math.sin(ca) * W * 0.585, Math.cos(ca) * W * 0.585, z); led.rotation.z = -ca; g.add(led);
      }
      // handrail
      if (r() < 0.6) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), railM);
        const off = (r() - 0.5) * 0.6;
        rail.position.set(Math.sin(a) * (W / 2 - 0.1) + Math.cos(a) * off, Math.cos(a) * (W / 2 - 0.1) - Math.sin(a) * off, z); rail.rotation.z = -a; g.add(rail);
      }
    }
    // equipment boxes & bags strapped on walls
    if (r() < 0.8) {
      const bw = 0.25 + r() * 0.3;
      const bag = new THREE.Mesh(new RoundedBoxGeometry(bw, 0.18, 0.3 + r() * 0.3, 3, 0.04), new THREE.MeshStandardMaterial({ color: [0xe8e4d8, 0x3c4a5c, 0xd9cfb5, 0x5a5f66][Math.floor(r() * 4)], roughness: 0.9 }));
      const a = Math.floor(r() * 4) * Math.PI / 2;
      bag.position.set(Math.sin(a) * (W / 2 - 0.13) + Math.cos(a) * (r() - 0.5) * 0.7, Math.cos(a) * (W / 2 - 0.13), z + (r() - 0.5) * 0.4);
      bag.rotation.z = -a; g.add(bag);
    }
  }
  // cable bundles
  for (let c = 0; c < 6; c++) {
    const a = r() * Math.PI * 2, pts = [];
    for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(a + (r() - 0.5) * 0.15) * (W / 2 - 0.08), Math.cos(a + (r() - 0.5) * 0.15) * (W / 2 - 0.08), -i * LEN / 8));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 6), new THREE.MeshStandardMaterial({ color: [0x222222, 0x8a8a8a, 0x2c3e66][c % 3], roughness: 0.6 }));
    g.add(tube);
  }
  // hatch at the far end, bright next module beyond
  const hatch = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 16, 48), darkM); hatch.position.z = -LEN; g.add(hatch);
  const endWall = new THREE.Mesh(new THREE.RingGeometry(0.62, 1.6, 48), rackM); endWall.position.z = -LEN; g.add(endWall);
  const beyond = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.35, 1.4) })); beyond.position.z = -LEN - 0.6; g.add(beyond);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), rackM); back.position.z = 0.6; back.rotation.y = Math.PI; g.add(back);
  // lights
  const lights = [];
  for (let i = 0; i < 4; i++) { const p = new THREE.PointLight(0xdde8ff, 1.3, 5, 1.8); p.position.set(0, 0.55, -1 - i * 2.2); g.add(p); lights.push(p); }
  g.userData.len = LEN; g.userData.lights = lights; g.userData.ledM = ledM; g.userData.beyondM = beyond.material;
  return g;
}

// ---------------------------------------------------------------- astronaut (EMU-style suit)
export function buildAstronaut(T, envMap) {
  const A = new THREE.Group();
  const fab = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xe6e3dc, roughness: 0.82, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color(1, 1, 1), sheenRoughness: 0.6, bumpMap: T.fabric, bumpScale: 0.6 });
  T.fabric.repeat.set(3, 3);
  const hard = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.45, metalness: 0.05 });
  const gray = new THREE.MeshStandardMaterial({ color: 0x8b8f96, roughness: 0.5, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.6, metalness: 0.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa3261f, roughness: 0.7 });
  const visorM = new THREE.MeshStandardMaterial({ color: 0xe0a650, metalness: 1.0, roughness: 0.035, envMap, envMapIntensity: 1.25 });
  const lampM = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.2, metalness: 0.6, emissive: 0xffffff, emissiveIntensity: 0 });

  const lathe = (pts, mat, seg = 40) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);
  let wseed = 1;
  // fabric tube: bulging profile, horizontal folds + random creases, crease shading baked into vertex colours
  const wrinkle = (geo, r0, amp = 1) => {
    const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3); const sd = wseed++ * 7.31;
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const rr = Math.hypot(x, z);
      if (rr < 1e-4) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1; continue; }
      const f1 = Math.sin(y * 55 + Math.sin(a * 2 + sd) * 2.2 + sd);
      const f2 = Math.sin(a * 3 + y * 18 + sd * 2) * Math.sin(y * 23 + sd);
      const d = (Math.pow(Math.abs(f1), 3) * Math.sign(f1) * 0.035 + f2 * 0.02) * amp;
      const k = 1 + d;
      p.setXYZ(i, x * k, y, z * k);
      const ao = THREE.MathUtils.clamp(0.86 + d * 5.5, 0.55, 1.0);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo;
  };

  // torso (hard upper torso), slightly wider than deep
  const torso = new THREE.Group(); A.add(torso);
  const hut = new THREE.Mesh(wrinkle(new THREE.LatheGeometry([[0.0, -0.28], [0.2, -0.27], [0.24, -0.15], [0.25, 0.05], [0.23, 0.18], [0.16, 0.26], [0.1, 0.28], [0.0, 0.28]].map(([x, y]) => new THREE.Vector2(x, y)), 48), 0.25, 0.35), fab);
  hut.scale.set(1.38, 1.08, 0.95); torso.add(hut);
  const dcm = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.15, 0.1, 3, 0.02), hard); dcm.position.set(0, -0.06, 0.24); torso.add(dcm);
  for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.025, 12), i === 0 ? red : dark); k.rotation.x = Math.PI / 2; k.position.set(-0.09 + i * 0.06, -0.05, 0.295); torso.add(k); }
  const pls = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.68, 0.26, 4, 0.06), hard); pls.position.set(0, 0.02, -0.36); torso.add(pls);
  const plsTop = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.08, 0.2, 3, 0.03), gray); plsTop.position.set(0, 0.38, -0.35); torso.add(plsTop);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 12, 40), gray); neck.rotation.x = Math.PI / 2; neck.position.y = 0.29; torso.add(neck);

  // helmet: shell + gold visor + lamps
  const head = new THREE.Group(); head.position.set(0, 0.47, 0.03); torso.add(head);
  const open = Math.PI * 0.34;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.215, 56, 36, Math.PI / 2 + open, Math.PI * 2 - 2 * open, 0, Math.PI * 0.6), hard);
  head.add(shell);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 72, 48, Math.PI / 2 - open, 2 * open, Math.PI * 0.1, Math.PI * 0.5), visorM);
  head.add(visor); visor.name = 'visor';
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.206, 56, 40, 0, Math.PI * 2, 0, Math.PI * 0.72), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.02, transparent: true, opacity: 0.12, envMap, envMapIntensity: 2.0, depthWrite: false }));
  head.add(bubble);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.06, 40, 1, true), gray); collar.position.y = -0.17; head.add(collar);
  for (const s of [-1, 1]) {
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.07, 0.12, 2, 0.015), hard); lamp.position.set(s * 0.2, 0.09, 0.02); head.add(lamp);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), lampM); lens.position.set(s * 0.2, 0.09, 0.081); head.add(lens);
    lens.name = 'lamp';
  }
  // waist + lower torso
  const waist = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 12, 40), gray); waist.rotation.x = Math.PI / 2; waist.position.y = -0.31; waist.scale.set(1.15, 0.85, 1); torso.add(waist);
  const brief = new THREE.Mesh(wrinkle(new THREE.LatheGeometry([[0.0, -0.2], [0.2, -0.17], [0.215, -0.05], [0.2, 0.0], [0.0, 0.0]].map(([x, y]) => new THREE.Vector2(x, y)), 48), 0.2, 0.6), fab); brief.position.y = -0.32; brief.scale.set(1.2, 1.1, 0.85); torso.add(brief);

  // limbs built from tapered segments with bellows joints
  const seg = (r0, r1, len, mat = fab) => {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector2((r0 + (r1 - r0) * u) * (1 + 0.08 * Math.sin(u * Math.PI)), -u * len)); }
    const g = wrinkle(new THREE.LatheGeometry(pts, 40), r0);
    return new THREE.Mesh(g, mat);
  };
  const bellows = (r, n = 4, mat = fab) => {
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector2(r * (0.9 + 0.08 * Math.pow(Math.abs(Math.sin(u * Math.PI * n)), 0.6)), -u * n * 0.03 + 0.015)); }
    const g = wrinkle(new THREE.LatheGeometry(pts, 40), r, 0.4);
    const c = g.attributes.color; for (let i = 0; i < c.count; i++) { const y = g.attributes.position.getY(i); const v = 0.7 + 0.3 * Math.abs(Math.sin((0.015 - y) / (n * 0.03) * Math.PI * n)); c.setXYZ(i, v, v, v); }
    return new THREE.Mesh(g, mat);
  };
  const joints = {};
  for (const s of [-1, 1]) {
    // arm
    const sh = new THREE.Group(); sh.position.set(s * 0.37, 0.13, 0); torso.add(sh);
    const shCap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), fab); sh.add(shCap);
    const upper = new THREE.Group(); sh.add(upper);
    upper.add(seg(0.095, 0.088, 0.3));
    const elbow = new THREE.Group(); elbow.position.y = -0.31; upper.add(elbow);
    elbow.add(bellows(0.086, 3));
    const fore = new THREE.Group(); fore.position.y = -0.08; elbow.add(fore);
    fore.add(seg(0.086, 0.07, 0.26));
    const wr = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.01, 10, 28), gray); wr.rotation.x = Math.PI / 2; wr.position.y = -0.27; fore.add(wr);
    const hand = new THREE.Group(); hand.position.y = -0.33; fore.add(hand);
    const palm = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.13, 0.06, 3, 0.025), fab); hand.add(palm);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.09, 0.012, 2, 0.005), dark); pad.position.z = 0.025; hand.add(pad);
    for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.065, 4, 10), fab); fg.position.set(-0.045 + f * 0.03, -0.105, 0.01); fg.rotation.x = 0.35; hand.add(fg); }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.045, 4, 10), fab); th.position.set(s * -0.055, -0.03, 0.02); th.rotation.z = s * 0.7; hand.add(th);
    // leg
    const hip = new THREE.Group(); hip.position.set(s * 0.13, -0.5, 0); torso.add(hip);
    hip.add(seg(0.115, 0.095, 0.42));
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.11, 0.06, 28), red); stripe.position.y = -0.19; if (s > 0) hip.add(stripe);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    knee.add(bellows(0.094, 3));
    const shin = new THREE.Group(); shin.position.y = -0.08; knee.add(shin);
    shin.add(seg(0.093, 0.078, 0.4));
    const boot = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.12, 0.27, 3, 0.04), hard); boot.position.set(0, -0.46, 0.05); shin.add(boot);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.03, 0.28, 2, 0.01), dark); sole.position.set(0, -0.525, 0.05); shin.add(sole);
    joints[s < 0 ? 'L' : 'R'] = { sh, upper, elbow, fore, hand, hip, knee, shin };
  }
  A.userData = { joints, head, visor, torso, lampM };
  return A;
}

// neutral microgravity posture with gentle breathing/drift
export function poseNeutral(A, t, k = 1) {
  const J = A.userData.joints;
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? -1 : 1, ph = s === 'L' ? 0 : 1.3;
    J[s].sh.rotation.set(-0.55 * k + Math.sin(t * 0.5 + ph) * 0.05, 0, sg * (0.35 + Math.sin(t * 0.4 + ph) * 0.04));
    J[s].elbow.rotation.set(-0.9 * k + Math.sin(t * 0.6 + ph) * 0.06, 0, 0);
    J[s].hand.rotation.set(-0.2, 0, 0);
    J[s].hip.rotation.set(-0.45 * k + Math.sin(t * 0.35 + ph) * 0.04, 0, sg * 0.1);
    J[s].knee.rotation.set(0.85 * k + Math.sin(t * 0.45 + ph) * 0.05, 0, 0);
  }
  A.userData.head.rotation.set(-0.1 + Math.sin(t * 0.3) * 0.03, Math.sin(t * 0.25) * 0.05, 0);
}
