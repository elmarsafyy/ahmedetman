// Hatch, airlock, decompression fog/debris, vacuum chamber, tea leaves.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './models.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// square-ish CBM hatch (as on the US segment) with a small window and a central actuator handle
export function buildHatch() {
  const g = new THREE.Group();
  const face = canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#bdbcb6'; x.fillRect(0, 0, w, h);
    const r = rng(3); const img = x.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 12; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgba(60,60,60,.55)'; x.lineWidth = 6; x.strokeRect(70, 70, w - 140, h - 140);
    x.lineWidth = 3; x.strokeRect(130, 130, w - 260, h - 260);
    x.fillStyle = '#1d1d1d'; x.font = 'bold 44px DejaVu Sans'; x.textAlign = 'center';
    x.fillText('NODE 1  ·  HATCH 3', w / 2, 210);
    x.font = 'bold 34px DejaVu Sans'; x.fillText('DO NOT OPEN UNLESS', w / 2, h - 230); x.fillText('ΔP < 0.2 PSI', w / 2, h - 185);
    for (let k = 0; k < 12; k++) { x.fillStyle = k % 2 ? '#1b1b1b' : '#e2b31c'; x.beginPath(); const px = 200 + k * 52; x.moveTo(px, h - 150); x.lineTo(px + 52, h - 150); x.lineTo(px + 26, h - 110); x.lineTo(px - 26, h - 110); x.fill(); }
    for (const [a, b] of [[100, 100], [w - 100, 100], [100, h - 100], [w - 100, h - 100]]) { x.fillStyle = '#555'; x.beginPath(); x.arc(a, b, 14, 0, 7); x.fill(); }
  });
  const metal = new THREE.MeshStandardMaterial({ map: face, roughness: 0.55, metalness: 0.35 });
  const frameM = new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.4, metalness: 0.75 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.5, metalness: 0.6 });
  const plate = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 0.08, 4, 0.12), metal);
  const fuv = plate.geometry.attributes.uv; // keep the decal on the front face
  g.add(plate);
  const frame = new THREE.Mesh(new RoundedBoxGeometry(1.45, 1.45, 0.06, 4, 0.16), frameM); frame.position.z = -0.06; g.add(frame);
  // window
  const win = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.05, metalness: 0.9 }));
  win.rotation.x = Math.PI / 2; win.position.set(0, 0.32, 0.03); g.add(win);
  const winRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 10, 40), frameM); winRing.position.set(0, 0.32, 0.06); g.add(winRing);
  // central actuator + handle bar (rotates)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 40), frameM); hub.rotation.x = Math.PI / 2; hub.position.z = 0.08; g.add(hub);
  const handle = new THREE.Group(); handle.position.z = 0.14; g.add(handle);
  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.07, 0.05, 3, 0.02), darkM); handle.add(bar);
  for (const s of [-1, 1]) { const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x1e5aa8, roughness: 0.6 })); grip.rotation.x = Math.PI / 2; grip.position.set(s * 0.28, 0, 0.06); handle.add(grip); }
  // latch indicators
  const lamp = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(0, 1, 0.3), emissiveIntensity: 1.5 });
  const lamps = [];
  for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 16), lamp); l.rotation.x = Math.PI / 2; l.position.set(x, y, 0.05); g.add(l); lamps.push(l); }
  g.userData = { handle, lampM: lamp };
  return g;
}

// cylindrical airlock with a round EVA hatch at the far end; the end wall has a hole onto space
export function buildAirlock(T) {
  const g = new THREE.Group();
  const R = 1.0, L = 2.6;
  const wallM = new THREE.MeshStandardMaterial({ map: T.rack, roughness: 0.75, side: THREE.BackSide });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true), wallM); tube.rotation.x = Math.PI / 2; tube.position.z = -L / 2; g.add(tube);
  const ringM = new THREE.MeshStandardMaterial({ color: 0x7d8186, roughness: 0.45, metalness: 0.7 });
  for (let i = 0; i <= 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.03, 8, 64), ringM); r.position.z = -i * L / 4; g.add(r); }
  // end wall with a hole (the EVA hatch opening, r=0.5)
  const end = new THREE.Mesh(new THREE.RingGeometry(0.5, R, 64), new THREE.MeshStandardMaterial({ color: 0x9a9ca0, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide })); end.position.z = -L; g.add(end);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 12, 64), ringM); lip.position.z = -L + 0.02; g.add(lip);
  // hatch disc (moves out when it fails)
  const hatch = new THREE.Group(); hatch.position.z = -L - 0.01; g.add(hatch);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.07, 64), new THREE.MeshStandardMaterial({ color: 0xc9c8c2, roughness: 0.5, metalness: 0.35 })); disc.rotation.x = Math.PI / 2; hatch.add(disc);
  const hh = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.06, 3, 0.02), ringM); hh.position.z = 0.06; hatch.add(hh);
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ color: 0x8d8f93, roughness: 0.7, side: THREE.DoubleSide })); back.position.z = 0.02; g.add(back);
  // warning beacon
  const beaconM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.02, 0.02) });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 12), beaconM); beacon.position.set(0.6, 0.75, -0.6); g.add(beacon);
  const red = new THREE.PointLight(0xff2a1a, 0, 4, 1.5); red.position.copy(beacon.position).add(new THREE.Vector3(-0.1, -0.1, 0)); g.add(red);
  const white = new THREE.PointLight(0xe6eeff, 1.2, 5, 1.6); white.position.set(-0.3, 0.6, -0.9); g.add(white);
  g.userData = { hatch, beaconM, red, white, L };
  return g;
}

// soft sprite particles: fog (normal blend) or streaming dust (additive)
function softTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
export function buildFog(n = 160) {
  const g = new THREE.Group(); const tex = softTex(); const r = rng(21);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xdfe8f2, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { p: new THREE.Vector3((r() - 0.5) * 1.7, (r() - 0.5) * 1.7, -r() * 2.6), sz: 0.35 + r() * 0.8, ph: r() * 6.28, d: r() };
    g.add(s);
  }
  g.userData.update = (t, amt, flow = 0) => {
    g.children.forEach(s => {
      const u = s.userData; s.position.copy(u.p);
      s.position.x += Math.sin(t * 0.7 + u.ph) * 0.05; s.position.y += Math.cos(t * 0.5 + u.ph) * 0.05;
      s.position.z -= flow * ((t * 0.6 + u.d * 2.6) % 2.6);
      s.scale.setScalar(u.sz * (0.8 + amt * 0.6)); s.material.opacity = 0.06 * amt * (0.5 + u.d * 0.5);
    });
  };
  return g;
}
export function buildStream(n = 1500) {
  const geo = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: 0xcfd9e6, size: 0.012, map: softTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; const r = rng(31);
  const base = Array.from({ length: n }, () => [(r() - 0.5) * 1.8, (r() - 0.5) * 1.8, -r() * 2.4, 0.5 + r()]);
  pts.userData.update = (t, k, L) => {
    for (let i = 0; i < n; i++) {
      const b = base[i]; const z = b[2] - ((t * 3.5 * b[3] + i * 0.013) % 2.6) * k;
      const f = Math.min(1, Math.max(0, (-z) / L)); // converge on the hole near the end
      p[i * 3] = b[0] * (1 - f * 0.75); p[i * 3 + 1] = b[1] * (1 - f * 0.75); p[i * 3 + 2] = Math.max(z, -L - 0.3);
    }
    geo.attributes.position.needsUpdate = true; m.opacity = Math.min(1, k);
  };
  return pts;
}

// vacuum test chamber (1966)
export function buildChamber() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4.5, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.55, metalness: 0.6, side: THREE.BackSide }));
  g.add(wall);
  const ribM = new THREE.MeshStandardMaterial({ color: 0x3c3f43, roughness: 0.5, metalness: 0.7 });
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.05, 8, 64), ribM); r.rotation.x = Math.PI / 2; r.position.y = -2 + i * 0.5; g.add(r); }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshStandardMaterial({ color: 0x2d2f32, roughness: 0.8 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.0; g.add(floor);
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) })); port.position.set(0, 1.2, -2.35); g.add(port);
  const key = new THREE.SpotLight(0xffffff, 6, 9, 0.45, 0.5, 1.4); key.position.set(0.8, 2.0, 1.6); key.target.position.set(0, 0.2, 0); g.add(key); g.add(key.target);
  return g;
}

// tea leaves + a hairline crack
export function buildLeak(T) {
  const g = new THREE.Group();
  const leafTex = canvasTex(64, 64, (x) => { x.fillStyle = '#3b2512'; x.beginPath(); x.ellipse(32, 32, 26, 12, 0.4, 0, 7); x.fill(); x.fillStyle = 'rgba(90,60,30,.8)'; x.fillRect(10, 30, 44, 2); });
  const m = new THREE.MeshStandardMaterial({ map: leafTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 });
  const r = rng(41); const leaves = [];
  for (let i = 0; i < 70; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.02), m); l.userData = { o: new THREE.Vector3((r() - 0.5) * 0.5, (r() - 0.5) * 0.4, (r() - 0.5) * 0.5), sp: 0.3 + r() * 0.7, ax: new THREE.Vector3(r(), r(), r()).normalize() }; g.add(l); leaves.push(l); }
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.02, 0.02) }));
  g.add(crack);
  const glow = new THREE.PointLight(0x9fd0ff, 0.0, 0.6, 2); g.add(glow);
  g.userData = { leaves, crack, glow };
  return g;
}
