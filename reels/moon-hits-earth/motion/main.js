import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as SH from './shaders.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { drawOverlay } from './overlay.js';

const W = 1080, H = 1920;
export const FPS = 30;

// ---------- helpers ----------
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => { const x = lin(t, a, b); return x * x * (3 - 2 * x); };
const eio = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const ei = x => x * x * x;
const mix = (a, b, x) => a + (b - a) * x;
const vmix = (a, b, x) => a.clone().lerp(b, x);
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const gauss = r => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function randDir(r) { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return V3(s * Math.cos(a), z, s * Math.sin(a)); }
// smooth 1D noise for camera shake
function n1(t, seed) { return Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 23.7 + seed * 2.1) * 0.3 + Math.sin(t * 41.3 + seed * 3.7) * 0.2; }
// value noise 3D (for rock shapes)
function vnoise(x, y, z) {
  const h = (i, j, k) => { let n = i * 374761393 + j * 668265263 + k * 1274126177; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) & 0xffff) / 65535; };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
    r += h(xi + a, yi + b, zi + c) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return r;
}
const fbm3 = (x, y, z) => { let s = 0, a = 0.5; for (let i = 0; i < 5; i++) { s += a * vnoise(x, y, z); x *= 2.02; y *= 2.02; z *= 2.02; a *= 0.5; } return s; };

// lat/lon -> local position on the unit sphere (matches three.js SphereGeometry UVs)
function ll(lat, lon) {
  const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI;
  return V3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
}
// earth rotation.y that turns longitude `lon` towards +Z
function faceLon(lon) { const p = ll(0, lon); return -Math.atan2(p.x, p.z); }

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0, 0, 0);
const camera = new THREE.PerspectiveCamera(32, W / H, 0.005, 3000);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.6, 0.85);
composer.addPass(bloom);
const finalPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 1 }, uGrain: { value: 0.045 }, uVig: { value: 0.9 },
    uCA: { value: 0.012 }, uSat: { value: 1 }, uFlashColor: { value: V3(1, 1, 1) }, uLift: { value: V3(0, 0, 0) }, uGain: { value: V3(1, 1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: SH.finalFrag,
});
composer.addPass(finalPass);
const FU = finalPass.uniforms;

// ---------- assets ----------
const loader = new THREE.TextureLoader();
async function tex(p, srgb) {
  const t = await loader.loadAsync('tex/' + p);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
const [dayT, nightT, brcT, floodT, lavaT, moonT] = await Promise.all([
  tex('earth_day_4096.jpg', true), tex('earth_night_4096.jpg', true), tex('earth_bump_roughness_clouds_4096.jpg', false),
  tex('floodmap.png', false), tex('lavatile.jpg', true), tex('moon_1024.jpg', true)]);
lavaT.wrapT = THREE.RepeatWrapping;
moonT.wrapT = THREE.RepeatWrapping;

// ---------- stars ----------
const stars = (() => {
  const r = rng(7), N = 9000, pos = [], col = [], size = [];
  const band = V3(0.3, 0.85, 0.42).normalize();
  for (let i = 0; i < N; i++) {
    let d = randDir(r);
    const mw = i > 5200;
    if (mw) { // milky way: concentrate near a great circle
      d.addScaledVector(band, -d.dot(band)).normalize();
      d.addScaledVector(band, gauss(r) * 0.08).normalize();
    }
    pos.push(d.x * 900, d.y * 900, d.z * 900);
    const b = mw ? 0.12 + r() * 0.25 : Math.pow(r(), 6) * 2.6 + 0.12;
    const tint = r();
    const c = tint < 0.2 ? [1.0, 0.82, 0.65] : tint > 0.8 ? [0.7, 0.82, 1.0] : [1, 0.96, 0.92];
    col.push(c[0] * b, c[1] * b, c[2] * b);
    size.push(mw ? 2.2 : 2.0 + Math.pow(r(), 4) * 4.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uBright: { value: 1 } }, vertexShader: SH.starsVert, fragmentShader: SH.starsFrag, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -2; scene.add(p); return p;
})();

// ---------- sky gradient (ground shot) ----------
const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { uAmt: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.9999,1.0); }',
  fragmentShader: SH.skyFrag, depthWrite: false, depthTest: false,
}));
sky.frustumCulled = false; sky.renderOrder = -3; scene.add(sky);

// ---------- earth ----------
const VOLCANOES = [[35.36, 138.73], [-6.1, 105.42], [37.75, 14.99], [40.82, 14.43], [44.43, -110.59], [46.2, -122.18], [19.02, -98.62], [-0.68, -78.44],
  [-39.42, -71.93], [19.41, -155.28], [15.14, 120.35], [-3.07, 37.35], [-8.25, 118.0], [63.98, -19.7], [-7.54, 110.44], [56.06, 160.64]];
const earthU = {
  dayMap: { value: dayT }, nightMap: { value: nightT }, brcMap: { value: brcT }, floodMap: { value: floodT }, lavaMap: { value: lavaT },
  sunDir: { value: V3(1, 0, 0) }, camPos: { value: V3() }, atmoColor: { value: V3(0.3, 0.55, 1.0) },
  uTime: { value: 0 }, cloudOffset: { value: 0 }, uFlood: { value: 0 }, uFloodPulse: { value: 0 }, uQuake: { value: 0 }, uRedSky: { value: 0 },
  uDry: { value: 0 }, uFire: { value: 0 }, uNight: { value: 1 }, uExposure: { value: 1 },
  hot: { value: VOLCANOES.map(([a, b]) => ll(a, b)) },
  imp: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 1, 0, -1)) },
  impSize: { value: Array(12).fill(1) }, uNow: { value: 0 },
};
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 160), new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: SH.planetVert, fragmentShader: SH.earthFrag }));
scene.add(earth);
const atmoU = { camPos: { value: V3() }, center: { value: V3() }, sunDir: { value: V3(1, 0, 0) }, atmoColor: { value: V3(0.3, 0.55, 1.0) }, radius: { value: 1 }, thick: { value: 0.07 }, strength: { value: 1.6 } };
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.1, 128, 96), new THREE.ShaderMaterial({ uniforms: atmoU, vertexShader: SH.atmoVert, fragmentShader: SH.atmoFrag, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
scene.add(atmo);

// ---------- moon-like bodies ----------
function bodyMat(tint, texScale = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: moonT }, sunDir: { value: V3(1, 0, 0) }, camPos: { value: V3() }, tint: { value: tint }, uCrack: { value: 0 }, uHot: { value: 0 }, uExposure: { value: 1 }, uAmb: { value: 0.012 }, uTime: { value: 0 }, texScale: { value: texScale }, uTri: { value: 0 } },
    vertexShader: SH.planetVert, fragmentShader: SH.moonFrag,
  });
}
const MOON_R = 0.273;
const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 192, 128), bodyMat(V3(1, 1, 1)));
scene.add(moon);
const theia = new THREE.Mesh(new THREE.SphereGeometry(0.53, 160, 110), bodyMat(V3(1.0, 0.62, 0.45), 1));
theia.material.uniforms.uTri.value = 1;
scene.add(theia);

function rockGeometry(radius, detail, seed, amp, smooth = false) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  if (smooth) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g); }
  const p = g.attributes.position; const v = V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const d = v.clone().normalize();
    const n = fbm3(d.x * 1.6 + seed, d.y * 1.6, d.z * 1.6) - 0.5;
    const n2 = fbm3(d.x * 5 + seed * 2, d.y * 5, d.z * 5) - 0.5;
    v.copy(d).multiplyScalar(radius * (1 + n * amp + n2 * amp * 0.35));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  if (smooth === 'uv') {
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); uv[i * 2] = Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5; uv[i * 2 + 1] = Math.acos(v.y) / Math.PI; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  return g;
}
const asteroid = new THREE.Mesh(rockGeometry(0.3, 6, 3.3, 0.9, true), bodyMat(V3(0.85, 0.78, 0.7), 2));
asteroid.material.uniforms.uTri = { value: 1 };
asteroid.scale.set(1.25, 0.8, 0.9);
scene.add(asteroid);

// instanced rock chunks (moon fragments)
const sunLight = new THREE.DirectionalLight(0xffffff, 3.2); scene.add(sunLight); scene.add(sunLight.target);
const amb = new THREE.AmbientLight(0xffffff, 0.03); scene.add(amb);
const ROCKS = 1600;
const rockMat = new THREE.MeshStandardMaterial({ map: moonT, roughness: 1, metalness: 0, color: 0xb8b0a8, emissive: 0x000000 });
const rocks = new THREE.InstancedMesh(rockGeometry(1, 3, 9.1, 0.7, 'uv'), rockMat, ROCKS);
rocks.frustumCulled = false; scene.add(rocks);
const rockData = (() => {
  const r = rng(99), a = [];
  for (let i = 0; i < ROCKS; i++) {
    const o = randDir(r).multiplyScalar(Math.cbrt(r()));
    a.push({ o, s: 0.004 + Math.pow(r(), 3.2) * 0.05, ax: randDir(r), sp: (r() - 0.5) * 3, sc: V3(0.7 + r() * 0.6, 0.6 + r() * 0.5, 0.7 + r() * 0.6), u: r(), v: r(), w: r() });
  }
  return a;
})();

// ---------- generic additive point clouds ----------
function makePoints(n, soft = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uScale: { value: 1 }, uSoft: { value: soft }, uMaxPx: { value: 14 } }, vertexShader: SH.pointsVert, fragmentShader: SH.pointsFrag, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p);
  p.userData.n = n; return p;
}
function setPt(p, i, x, y, z, r, g, b, size, alpha) {
  const a = p.geometry.attributes;
  a.position.array[i * 3] = x; a.position.array[i * 3 + 1] = y; a.position.array[i * 3 + 2] = z;
  a.aColor.array[i * 3] = r; a.aColor.array[i * 3 + 1] = g; a.aColor.array[i * 3 + 2] = b;
  a.aSize.array[i] = size; a.aAlpha.array[i] = alpha;
}
function commit(p, count) {
  const a = p.geometry.attributes;
  for (const k of ['position', 'aColor', 'aSize', 'aAlpha']) a[k].needsUpdate = true;
  p.geometry.setDrawRange(0, count);
}

// ring / debris dust
const RING_N = 70000;
const ring = makePoints(RING_N, 0.6);
const ringData = (() => {
  const r = rng(1234), a = [];
  const dens = x => { // banded density like Saturn's rings
    if (x < 1.45 || x > 3.4) return 0;
    let d = 0.55 + 0.45 * Math.sin(x * 9.0) * Math.sin(x * 3.3);
    if (x > 2.55 && x < 2.68) d *= 0.08; // a "Cassini division"
    if (x > 1.9 && x < 1.95) d *= 0.3;
    return d * (x < 1.7 ? (x - 1.45) / 0.25 : 1) * (x > 3.1 ? (3.4 - x) / 0.3 : 1);
  };
  for (let i = 0; i < RING_N; i++) {
    let rf; do { rf = 1.45 + r() * 1.95; } while (r() > dens(rf));
    a.push({ rf, th: r() * Math.PI * 2, y: gauss(r) * 0.006, o: randDir(r).multiplyScalar(Math.cbrt(r())), d: r(), b: 0.5 + r() * 0.8, s: 0.006 + Math.pow(r(), 4) * 0.02, tint: r() });
  }
  return a;
})();

// theia debris
const DEB_N = 26000;
const debris = makePoints(DEB_N, 0.7);
const debData = (() => {
  const r = rng(555), a = [];
  for (let i = 0; i < DEB_N; i++) a.push({ v: randDir(r), sp: 0.4 + Math.pow(r(), 2) * 2.2, rf: 1.5 + Math.pow(r(), 0.7) * 2.6, th: r() * Math.PI * 2, y: gauss(r) * 0.03, d: r(), c: randDir(r).multiplyScalar(Math.cbrt(r())), s: 0.006 + Math.pow(r(), 4) * 0.03 });
  return a;
})();

// meteors with fiery trails
const TRAIL = 48, MET_N = 70;
const meteors = makePoints(MET_N * TRAIL, 1.0);

// glow sprites (sun, flashes)
function glowTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); return t;
}
const glowT = glowTex([[0, 'rgba(255,255,255,1)'], [0.08, 'rgba(255,240,220,0.85)'], [0.25, 'rgba(255,200,150,0.25)'], [0.6, 'rgba(255,170,120,0.05)'], [1, 'rgba(0,0,0,0)']]);
function sprite(color) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.frustumCulled = false; scene.add(s); return s;
}
const sun = sprite(new THREE.Color(3, 2.8, 2.5));
const flash = sprite(new THREE.Color(3, 2.1, 1.3));
const flash2 = sprite(new THREE.Color(1.6, 0.6, 0.2));

// tidal bulge shell
const shellU = { camPos: { value: V3() }, color: { value: V3(0.25, 0.7, 1.0) }, strength: { value: 1 } };
const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.ShaderMaterial({ uniforms: shellU, vertexShader: SH.planetVert, fragmentShader: SH.shellFrag, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
scene.add(shell);

// thin 3D rings for orbit / roche guides
function guideRing(radius) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 6, 360), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1.0), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = Math.PI / 2; scene.add(m); return m;
}
const rocheRing = guideRing(2.9);

// ---------- per-frame state ----------
const S = { hud: [], cam: camera };
let SUN = V3(1, 0.2, 0.5).normalize();
const tmp = V3();
function project(p) {
  camera.updateMatrixWorld();
  tmp.copy(p).project(camera);
  return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, behind: tmp.z > 1 };
}
S.project = project;

function setCam(pos, target, fov = 32, roll = 0) {
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(target);
  if (roll) camera.rotateZ(roll);
}
function shake(t, amp) {
  if (amp <= 0) return;
  camera.rotateX(n1(t, 1.3) * amp); camera.rotateY(n1(t, 4.1) * amp); camera.rotateZ(n1(t, 7.7) * amp * 0.6);
}

function reset(t) {
  for (const o of [earth, atmo, moon, theia, asteroid, rocks, ring, debris, meteors, sun, flash, flash2, shell, rocheRing, sky]) o.visible = false;
  stars.visible = true; stars.material.uniforms.uBright.value = 1;
  flash.material.opacity = 1; flash2.material.opacity = 1; amb.intensity = 0.03;
  earthU.uFlood.value = 0; earthU.uFloodPulse.value = 0; earthU.uQuake.value = 0; earthU.uRedSky.value = 0; earthU.uDry.value = 0; earthU.uFire.value = 0;
  earthU.uNight.value = 1; earthU.uExposure.value = 1; earthU.atmoColor.value.set(0.3, 0.55, 1.0); atmoU.atmoColor.value.set(0.3, 0.55, 1.0); atmoU.strength.value = 1.6;
  for (const v of earthU.imp.value) v.w = -1;
  earth.rotation.set(0, 0, 0); earth.position.set(0, 0, 0); earth.scale.setScalar(1);
  moon.position.set(0, 0, 0); moon.rotation.set(0, 0, 0); moon.scale.setScalar(1);
  for (const b of [moon, theia, asteroid]) { const u = b.material.uniforms; u.uCrack.value = 0; u.uHot.value = 0; u.uExposure.value = 1; u.uAmb.value = 0.012; }
  moon.material.uniforms.tint.value.set(1, 1, 1);
  SUN = V3(1, 0.2, 0.5).normalize();
  bloom.strength = 0.6; bloom.radius = 0.5; bloom.threshold = 1.0;
  FU.uFlash.value = 0; FU.uFade.value = 1; FU.uGrain.value = 0.045; FU.uVig.value = 0.9; FU.uCA.value = 0.012; FU.uSat.value = 1;
  FU.uFlashColor.value.set(1, 1, 1); FU.uLift.value.set(0, 0, 0); FU.uGain.value.set(1, 1, 1);
  S.hud = []; S.flags = {};
  earthU.uTime.value = t; earthU.uNow.value = t; earthU.cloudOffset.value = t * 0.0015;
}

function finalizeUniforms() {
  camera.updateMatrixWorld();
  const cp = camera.position;
  earthU.sunDir.value.copy(SUN); earthU.camPos.value.copy(cp);
  atmoU.sunDir.value.copy(SUN); atmoU.camPos.value.copy(cp); atmoU.center.value.copy(earth.position); atmoU.radius.value = earth.scale.x;
  atmo.position.copy(earth.position); atmo.scale.copy(earth.scale);
  atmoU.atmoColor.value.copy(earthU.atmoColor.value);
  for (const b of [moon, theia, asteroid]) { b.material.uniforms.sunDir.value.copy(SUN); b.material.uniforms.camPos.value.copy(cp); b.material.uniforms.uTime.value = earthU.uTime.value; }
  shellU.camPos.value.copy(cp);
  sunLight.position.copy(SUN).multiplyScalar(50); sunLight.target.position.set(0, 0, 0);
  stars.position.copy(cp);
  sun.position.copy(cp).addScaledVector(SUN, 600);
  const scale = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  for (const p of [ring, debris, meteors]) p.material.uniforms.uScale.value = scale;
}

// ---------- systems ----------
function placeImpacts(list) { // list of {dir(local), t, size}
  const sorted = list.slice(-12);
  sorted.forEach((im, i) => { earthU.imp.value[i].set(im.dir.x, im.dir.y, im.dir.z, im.t); earthU.impSize.value[i] = im.size || 1; });
}

// Moon fragments (instanced rocks) laid out by a function giving each a world position
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _p = V3();
function layoutRocks(t, fn, count = ROCKS) {
  rocks.visible = true; rocks.count = count;
  for (let i = 0; i < count; i++) {
    const d = rockData[i];
    const res = fn(d, i);
    _p.copy(res.p);
    _q.setFromAxisAngle(d.ax, t * d.sp + i);
    _s.copy(d.sc).multiplyScalar(res.s ?? d.s);
    _m.compose(_p, _q, _s); rocks.setMatrixAt(i, _m);
  }
  rocks.instanceMatrix.needsUpdate = true;
}

// ring dust: F = formation 0..1, rot = shared rotation, fall = inner erosion 0..1
const ORBIT_PHI = -1.05;
function ringFrame(t, F, rot, opts = {}) {
  ring.visible = true;
  const Rm = opts.Rm ?? 2.9, phi0 = opts.phi ?? ORBIT_PHI, fall = opts.fall ?? 0, bright = (opts.bright ?? 1) * (opts.scat ? 1 + opts.scat * Math.pow(Math.max(0, camera.getWorldDirection(V3()).dot(SUN)), 3) : 1);
  let n = 0;
  for (let i = 0; i < RING_N; i++) {
    const d = ringData[i];
    const f = eio(clamp(F * 1.35 - d.d * 0.35));
    const r0 = Rm + d.o.x * MOON_R * (1 + F * 2);
    const rr = mix(r0, d.rf, f);
    let dth = d.th - phi0; dth = ((dth % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const th = phi0 + d.o.z * MOON_R / Rm + dth * f + rot * Math.pow(2.9 / rr, 1.5);
    const y = mix(d.o.y * MOON_R, d.y, f);
    const x = rr * Math.cos(th), z = rr * Math.sin(th);
    let a = 0.55 * d.b * bright * (0.03 + 0.97 * f);
    if (fall > 0) a *= ss(rr, 1.4 + fall * 2.2, 1.6 + fall * 2.2);
    if (a <= 0.001) continue;
    // earth shadow
    const pd = x * SUN.x + y * SUN.y + z * SUN.z;
    let lit = 1;
    if (pd < 0) { const qx = x - pd * SUN.x, qy = y - pd * SUN.y, qz = z - pd * SUN.z; if (qx * qx + qy * qy + qz * qz < 1) lit = 0.06; }
    const warm = d.tint;
    const hot = opts.hot ? opts.hot * (1 - f) : 0;
    setPt(ring, n++, x, y, z, (0.8 + warm * 0.15 + hot * 2) * lit, (0.74 + hot * 0.6) * lit, (0.68 - warm * 0.1) * lit, d.s * (opts.size ?? 1), a);
  }
  commit(ring, n);
}

// meteors: list of {from, to, t0, dur}
function meteorFrame(t, list, opts = {}) {
  meteors.visible = true; let n = 0;
  for (const m of list) {
    const k = (t - m.t0) / m.dur;
    if (k < 0 || k > 1.02) continue;
    for (let j = 0; j < TRAIL; j++) {
      const kk = k - j * 0.004 * (m.trail ?? 1);
      if (kk < 0) break;
      const e = m.linear ? kk : ei(clamp(kk)) * 0.75 + kk * 0.25;
      const p = vmix(m.from, m.to, e);
      const alt = p.length() - 1;
      const heat = opts.space ? 1 : 0.4 + 0.6 * clamp(1.6 - alt * 1.6);
      const fade = 1 - j / TRAIL;
      const head = j === 0 ? 2.2 : 1;
      setPt(meteors, n++, p.x, p.y, p.z, 2.6 * heat * head, (1.2 + fade) * heat * head * 0.7, 0.35 * fade * heat * head, (m.size ?? 0.03) * (0.4 + fade * 0.8) * head, fade * (0.3 + heat * 0.7));
    }
  }
  commit(meteors, n);
}

// ---------- scenes ----------
const MILE = 1 / 3959; // earth radii per mile
const ROCHE_MI = 11000;

const scenes = [];
const scn = (a, b, fn) => scenes.push({ a, b, fn });

// 1. HOOK — the Moon rushing at Earth
scn(0, 2.52, (t) => {
  earth.visible = atmo.visible = moon.visible = true;
  earth.rotation.y = faceLon(-40) + t * 0.02;
  SUN = V3(0.85, 0.45, 0.35).normalize();
  const k = ei(lin(t, 0, 2.3));
  const target = V3(0.08, 0.9, 0.42).normalize().multiplyScalar(1 + MOON_R * 0.9);
  const start = V3(0.12, 1.02, 3.3);
  moon.position.copy(vmix(start, target, k));
  moon.rotation.y = t * 0.4;
  setCam(V3(0, 0.25 + k * 0.25, 5.0 - k * 1.3), V3(0, 1.0 - k * 0.05, 0), 34);
  shake(t, 0.002 + k * 0.012);
  if (t > 2.22) {
    const f = lin(t, 2.22, 2.4);
    flash.visible = true; flash.position.copy(target).multiplyScalar(0.98); flash.scale.setScalar(0.6 + f * 6);
    FU.uFlash.value = f * 1.5; FU.uFlashColor.value.set(1, 0.85, 0.7);
  }
  if (t > 2.4) FU.uFade.value = 1 - lin(t, 2.4, 2.52);
  FU.uCA.value = 0.012 + k * 0.02;
});

// 2. NOT A METEOR
scn(2.52, 4.12, (t, lt) => {
  stars.material.uniforms.uBright.value = 0.9;
  setCam(V3(0, 0, 0), V3(0.05, 0, -1), 32);
  const m = { from: V3(-1.6, 2.4, -6), to: V3(1.3, -1.9, -6), t0: 2.6, dur: 1.5, size: 0.012, trail: 3.5, linear: true };
  meteorFrame(t, [m], { space: true });
  FU.uFade.value = ss(t, 2.52, 2.7) * (1 - ss(t, 4.02, 4.12));
});

// 3. NOT AN ASTEROID
scn(4.12, 5.36, (t, lt) => {
  asteroid.visible = true;
  SUN = V3(-0.8, 0.3, 0.5).normalize();
  asteroid.rotation.set(t * 0.5, t * 0.8, 0.2);
  asteroid.position.set(0, 0.05, 0);
  setCam(V3(0, 0, 2.3 - lt * 0.15), V3(0, 0.05, 0), 32);
  FU.uFade.value = ss(t, 4.12, 4.25) * (1 - ss(t, 5.25, 5.36));
});

// 4. THE MOON — reveal + mass + heading for us
scn(5.36, 11.06, (t, lt) => {
  moon.visible = true;
  const r = ss(t, 5.4, 7.8);
  const a = mix(-2.6, -0.85, r);
  SUN = V3(Math.sin(a) * -1, 0.15, Math.cos(a)).normalize();
  moon.rotation.y = 2.4 + t * 0.03;
  const push = ei(lin(t, 9.4, 11.06));
  moon.position.set(0, 0.06, 0);
  const z = mix(2.25, 1.85, lin(t, 5.36, 9.4)) - push * 1.1;
  setCam(V3(0, 0, z), V3(0, 0.0, 0), 32);
  shake(t, push * 0.01);
  FU.uFade.value = ss(t, 5.36, 5.8);
  FU.uCA.value = 0.012 + push * 0.015;
  if (t > 10.9) FU.uFade.value = 1 - lin(t, 10.9, 11.06);
});

// 5. DISTANCE — true scale
scn(11.06, 16.92, (t, lt) => {
  earth.visible = atmo.visible = moon.visible = true;
  SUN = V3(0.9, 0.1, 0.45).normalize();
  earth.rotation.y = faceLon(10);
  const pull = eio(lin(t, 15.7, 16.92));
  const Dmi = mix(239000, 175000, pull);
  const D = Dmi * MILE;
  const dir = V3(0.12, 1, 0).normalize();
  moon.position.copy(dir).multiplyScalar(D);
  const camD = mix(170, 128, pull) + lt * 1.2;
  const mid = dir.clone().multiplyScalar(D * 0.47);
  setCam(V3(mid.x + 18, mid.y, camD), mid, 32);
  atmoU.strength.value = 2.4;
  FU.uFade.value = ss(t, 11.06, 11.5);
  // HUD
  const pe = project(earth.position), pm = project(moon.position);
  S.hud.push({ type: 'dist', a: ss(t, 11.6, 12.2), pe, pm, er: 0, label: Math.round(Dmi / 100) * 100, show: ss(t, 12.9, 13.3), km: true });
});

// 6. SKY — twice as wide
scn(16.92, 21.42, (t, lt) => {
  sky.visible = true; moon.visible = true;
  stars.material.uniforms.uBright.value = 0.35;
  SUN = V3(0.0, 0.05, 1).normalize();
  moon.material.uniforms.tint.value.set(1.05, 0.88, 0.72);
  const g = eio(lin(t, 17.55, 19.9));
  const D = 60.3 / (1 + g);
  const el = THREE.MathUtils.degToRad(0.28);
  moon.position.set(0, Math.sin(el) * D, -Math.cos(el) * D);
  moon.rotation.set(0.2, -0.3, 0);
  setCam(V3(0, 0, 0), V3(0, 0, -1), 3.2);
  bloom.strength = 0.5;
  FU.uFade.value = ss(t, 16.92, 17.3);
  const pm = project(moon.position);
  const rpx = (MOON_R / 60.3) / Math.tan(THREE.MathUtils.degToRad(1.6)) * 960;
  S.hud.push({ type: 'skyline', a: 1 });
  S.hud.push({ type: 'ghost', x: pm.x, y: pm.y, r: rpx, a: ss(t, 17.7, 18.3) * (1 - ss(t, 21.1, 21.4)) });
});

// 7. TIDES — 8x stronger
scn(21.42, 24.95, (t, lt) => {
  earth.visible = atmo.visible = moon.visible = shell.visible = true;
  SUN = V3(0.6, 0.25, 0.75).normalize();
  earth.rotation.y = faceLon(-30) + t * 0.01;
  const mdir = V3(0.55, 0.62, -0.56).normalize();
  moon.position.copy(mdir).multiplyScalar(4.4);
  const b = eo(lin(t, 23.7, 24.4));
  const st = 1.04 + b * 0.09 + Math.sin(t * 3) * 0.003;
  shell.scale.set(st, 1.015, 1.015);
  shell.quaternion.setFromUnitVectors(V3(1, 0, 0), mdir);
  shellU.strength.value = 0.5 + b * 0.9;
  const ang = -0.25 + lt * 0.04;
  setCam(V3(Math.sin(ang) * 9.6, 0.9, Math.cos(ang) * 9.6), V3(0.35, 0.95, 0), 32);
  FU.uFade.value = ss(t, 21.42, 21.7);
});

// 8. FLOODS — coastlines, NYC/Miami/Shanghai, twice a day
scn(24.95, 34.02, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(-0.55, 0.35, 0.75).normalize();
  const whip = eio(lin(t, 30.85, 31.3));
  const lonA = -76, lonB = 121;
  const lon = mix(lonA + (t - 24.95) * 0.8, lonB + 0.6, whip);
  earth.rotation.y = faceLon(lon);
  const lat = mix(31, 27, whip);
  const dist = mix(4.3, 3.6, ss(t, 24.95, 30.8)) - ss(t, 31.3, 34) * 0.25;
  const la = THREE.MathUtils.degToRad(lat);
  setCam(V3(0, Math.sin(la) * dist, Math.cos(la) * dist), V3(0, Math.sin(la) * 0.55 - 0.1, 0), 32);
  earthU.uExposure.value = 0.85;
  earthU.uFlood.value = ss(t, 27.3, 28.6);
  const pulse = 0.55 + 0.45 * Math.sin(t * 4.5);
  earthU.uFloodPulse.value = ss(t, 27.3, 28.6) * (0.55 + 0.45 * pulse) * (1 + ss(t, 32.1, 32.6) * 0.6);
  FU.uFade.value = ss(t, 24.95, 25.3);
  if (whip > 0 && whip < 1) FU.uCA.value = 0.012 + Math.sin(whip * Math.PI) * 0.08;
  earth.updateMatrixWorld();
  const mk = (name, la2, lo2, t0, t1) => {
    const p = ll(la2, lo2).applyMatrix4(earth.matrixWorld);
    const facing = p.clone().normalize().dot(camera.position.clone().sub(p).normalize());
    S.hud.push({ type: 'marker', name, p: project(p), a: ss(t, t0, t0 + 0.25) * (1 - ss(t, t1, t1 + 0.2)) * clamp(facing * 4), coord: `${Math.abs(la2).toFixed(1)}°${la2 >= 0 ? 'N' : 'S'} ${Math.abs(lo2).toFixed(1)}°${lo2 >= 0 ? 'E' : 'W'}` });
  };
  camera.updateMatrixWorld();
  mk('New York', 40.71, -74.0, 29.85, 30.85);
  mk('Miami', 25.76, -80.19, 30.45, 30.85);
  mk('Shanghai', 31.23, 121.47, 31.15, 33.9);
  S.hud.push({ type: 'tide', a: ss(t, 33.2, 33.5), k: lin(t, 33.25, 33.95) });
});

// 9. KEEP PULLING — quakes and volcanoes
scn(34.02, 41.62, (t, lt) => {
  earth.visible = atmo.visible = moon.visible = true;
  SUN = V3(0.75, 0.5, 0.45).normalize();
  earth.rotation.y = faceLon(150) + t * 0.012;
  const k = eio(lin(t, 34.02, 41.62));
  moon.position.copy(vmix(V3(1.0, 3.0, -2.0), V3(0.5, 1.5, 0.6), k));
  moon.rotation.y = t * 0.05;
  const q = ss(t, 38.5, 39.2);
  setCam(V3(-0.15, -0.55 - k * 0.1, 5.6 - k * 0.5), V3(0.05, 0.85, 0), 34);
  shake(t, q * 0.009 + k * 0.001);
  earthU.uQuake.value = ss(t, 39.5, 40.6);
  earthU.uNight.value = 1;
  FU.uFade.value = ss(t, 34.02, 34.3);
  S.hud.push({ type: 'counter', a: ss(t, 34.3, 34.7), label: Math.round(mix(119500, 24000, k) / 100) * 100 });
  S.hud.push({ type: 'seismo', a: ss(t, 38.5, 38.8) * (1 - ss(t, 41.3, 41.6)), t, k: lin(t, 38.5, 41.3) });
});

// 10. ROCHE LIMIT — torn apart
const BREAK = 50.42;
function moonOrbitPos(Rm, phi) { return V3(Rm * Math.cos(phi), 0, Rm * Math.sin(phi)); }
scn(41.62, 51.2, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.7, 0.45, 0.55).normalize();
  earth.rotation.y = faceLon(100) + t * 0.01;
  const appr = eo(lin(t, 41.62, 43.6));
  const Rm = mix(4.2, 2.9, appr);
  const phi = ORBIT_PHI + (t - 41.62) * 0.012;
  const mp = moonOrbitPos(Rm, phi);
  const radial = mp.clone().normalize();
  const camT = V3(0.55, 0.15, -0.95);
  const ang = 0.12 + lt * 0.008;
  setCam(V3(Math.sin(ang) * 8.7 + 0.4, 4.0, Math.cos(ang) * 8.7), camT, 34);
  rocheRing.visible = true;
  rocheRing.material.opacity = 0.45 * ss(t, 43.4, 44.0);
  const cr = ss(t, 46.0, 49.6) * 0.55 + ss(t, 49.6, BREAK) * 0.45;
  const stretch = ss(t, 45.8, BREAK) * 0.1;
  if (t < BREAK) {
    moon.visible = true;
    moon.position.copy(mp);
    moon.quaternion.setFromUnitVectors(V3(1, 0, 0), radial);
    moon.scale.set(1 + stretch, 1 - stretch * 0.3, 1 - stretch * 0.3);
    moon.material.uniforms.uCrack.value = cr;
  } else {
    // fragments drifting apart along the orbit
    const k = t - BREAK;
    const tang = V3(-radial.z, 0, radial.x);
    layoutRocks(t, (d) => {
      const o = d.o.clone().multiplyScalar(MOON_R);
      const ro = o.dot(radial), to = o.dot(tang);
      const p = mp.clone().addScaledVector(radial, ro * (1 + k * 0.9)).addScaledVector(tang, to * (1 + k * 0.4) - ro * k * k * 0.7);
      p.y = o.y * (1 + k * 0.3);
      return { p, s: d.s * 1.6 };
    });
    ringFrame(t, k * 0.03, 0, { Rm, phi, hot: 1, bright: 0.8 });
    flash.visible = true; flash.position.copy(mp); flash.scale.setScalar(1.8 * Math.exp(-k * 3));
  }
  shake(t, ss(t, 49.6, 50.3) * 0.008 + (t > BREAK ? 0.016 * Math.exp(-(t - BREAK) * 2.5) : 0));
  if (t > BREAK && t < BREAK + 0.35) { FU.uFlash.value = Math.exp(-(t - BREAK) * 12) * 1.4; FU.uFlashColor.value.set(1, 0.7, 0.45); }
  FU.uFade.value = ss(t, 41.62, 41.9);
  const pm = project(mp), pe = project(V3(0, 0, 0));
  S.hud.push({ type: 'counter', a: 1 - ss(t, 49.5, 50.0), label: Math.round(mix(24000, ROCHE_MI, appr) / 100) * 100 });
  const rp = project(moonOrbitPos(2.9, ORBIT_PHI - 0.75));
  S.hud.push({ type: 'tag', x: rp.x, y: rp.y, text: 'Roche limit', a: ss(t, 43.8, 44.3) * (1 - ss(t, 49.5, 50)) });
  // force arrows: near side strong, far side weak
  const near = mp.clone().addScaledVector(radial, -MOON_R * 1.05), far = mp.clone().addScaledVector(radial, MOON_R * 1.05);
  const nearT = mp.clone().addScaledVector(radial, -MOON_R * 1.05 - 0.9), farT = mp.clone().addScaledVector(radial, MOON_R * 1.05 - 0.35);
  S.hud.push({ type: 'arrow', p0: project(near), p1: project(nearT), a: ss(t, 46.4, 46.8) * (1 - ss(t, 49.9, 50.3)), k: eo(lin(t, 46.4, 47.4)), text: 'Near side', sub: 'Stronger pull', acc: true, side: 1 });
  S.hud.push({ type: 'arrow', p0: project(far), p1: project(farT), a: ss(t, 48.7, 49.1) * (1 - ss(t, 49.9, 50.3)), k: eo(lin(t, 48.7, 49.5)), text: 'Far side', sub: 'Weaker pull', side: -1 });
});

// 11. NOT IN ONE PIECE — stream & ring forming
scn(51.2, 54.45, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.7, 0.45, 0.55).normalize();
  earth.rotation.y = faceLon(100) + t * 0.01;
  const k = t - BREAK;
  const F = mix(0.03 * 0.78, 0.3, eio(lin(t, 51.2, 54.45)));
  ringFrame(t, F, 0, { hot: 0.6 });
  const mp = moonOrbitPos(2.9, ORBIT_PHI + (t - 41.62) * 0.012), radial = mp.clone().normalize(), tang = V3(-radial.z, 0, radial.x);
  layoutRocks(t, (d) => {
    const o = d.o.clone().multiplyScalar(MOON_R);
    const ro = o.dot(radial), to = o.dot(tang);
    const p = mp.clone().addScaledVector(radial, ro * (1 + k * 0.9)).addScaledVector(tang, to * (1 + k * 0.4) - ro * k * k * 0.7);
    p.y = o.y * (1 + k * 0.3);
    return { p, s: d.s * 1.6 };
  });
  const ang = 0.12 + (t - 41.62) * 0.008;
  const back = eio(lin(t, 51.2, 54.45));
  setCam(V3(Math.sin(ang) * mix(8.7, 10.5, back) + 0.4, mix(4.0, 3.2, back), Math.cos(ang) * mix(8.7, 10.5, back)), V3(0.4, 0.0, -0.6), 34);
  shake(t, 0.004 * Math.exp(-(t - 51.2)));
});

// 12. TRILLIONS OF FRAGMENTS — fly-through
scn(54.45, 57.42, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.2, 0.45, 0.9).normalize();
  earth.rotation.y = faceLon(60);
  const th = 1.15 + lt * 0.055;
  const R = 2.95;
  const cp = V3(R * Math.cos(th), 0.07, R * Math.sin(th));
  const fwd = V3(-Math.sin(th), 0, Math.cos(th));
  const look = cp.clone().addScaledVector(fwd, -1).add(V3(-cp.x * 0.32, -0.08, -cp.z * 0.32));
  setCam(cp, look, 40, 0.18);
  ringFrame(t, 0.55, 0, { size: 1.3 });
  layoutRocks(t, (d, i) => {
    const a = th - 0.02 - d.u * 0.55 + lt * 0.008 * (d.w - 0.5);
    const rr = R + (d.v - 0.5) * 0.28;
    const p = V3(rr * Math.cos(a), (d.w - 0.5) * 0.14 + 0.05, rr * Math.sin(a));
    return { p, s: d.s * 0.55 };
  });
  amb.intensity = 0.05;
  FU.uFade.value = ss(t, 54.45, 54.7);
});

// 13. A RING AROUND EARTH — like Saturn's
scn(57.42, 61.05, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.85, 0.35, 0.4).normalize();
  earth.rotation.y = faceLon(20) + t * 0.01;
  const F = mix(0.6, 1.0, eo(lin(t, 57.42, 60.2)));
  ringFrame(t, F, lt * 0.05, {});
  const ang = -0.35 + lt * 0.035;
  const d = mix(13.5, 12.2, eio(lin(t, 57.42, 61.05)));
  setCam(V3(Math.sin(ang) * d, 3.6, Math.cos(ang) * d), V3(0, 0.1, 0), 32, -0.12);
  FU.uFade.value = ss(t, 57.42, 57.7);
});

// 14. BEAUTIFUL? — eclipse view: sun peeking past Earth's limb, ring backlit
scn(61.05, 64.32, (t, lt) => {
  earth.visible = atmo.visible = sun.visible = true;
  earth.rotation.y = faceLon(100) + t * 0.005;
  const cp = V3(1.25 - lt * 0.05, 0.62, 4.3 - lt * 0.08);
  const e = cp.clone().negate().normalize();
  const alpha = Math.asin(1 / cp.length());
  const axis = V3().crossVectors(e, V3(0.35, 1, 0)).normalize();
  SUN = e.clone().applyAxisAngle(axis, alpha * mix(0.97, 1.03, lin(t, 61.05, 64.32)));
  ringFrame(t, 1.0, 0.2 + lt * 0.03, { bright: 1.0, scat: 2.6 });
  setCam(cp, V3(0.05, 0.12, 0), 36, -0.2);
  sun.scale.setScalar(160);
  atmoU.strength.value = 2.2;
  bloom.strength = 0.9;
  FU.uFade.value = ss(t, 61.05, 61.35) * (1 - ss(t, 63.4, 64.32) * 0.55);
  FU.uSat.value = 1 - ss(t, 63.3, 64.3) * 0.4;
});

// meteor schedule for the bombardment
const RAIN = (() => {
  const r = rng(77), list = [];
  for (let i = 0; i < 70; i++) {
    const t0 = 64.6 + Math.pow(r(), 0.75) * 10.2;
    const target = V3(r() * 1.5 - 0.75, r() * 1.3 - 0.4, 0.55 + r() * 0.6).normalize();
    const side = V3(r() - 0.5, r() * 0.6 + 0.3, r() - 0.5).normalize();
    const from = target.clone().multiplyScalar(2.8).addScaledVector(side, 1.4);
    list.push({ t0, dur: 0.9 + r() * 0.5, from, to: target.clone(), size: 0.012 + r() * 0.03, trail: 1.3, linear: true, impSize: 0.5 + r() * 0.8 });
  }
  return list.sort((a, b) => a.t0 - b.t0);
})();

// 15. FALLING — rain, red sky, oceans boil, magma
scn(64.32, 75.15, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.55, 0.4, 0.75).normalize();
  const rotE = faceLon(-10) + t * 0.008;
  earth.rotation.y = rotE;
  const fall = ss(t, 64.4, 73);
  ringFrame(t, 1.0, 0.2 + t * 0.02, { fall, bright: 1 - ss(t, 69, 75) * 0.7 });
  // meteors defined in world coords near the camera-facing hemisphere
  earth.updateMatrixWorld();
  meteorFrame(t, RAIN);
  const inv = earth.matrixWorld.clone().invert();
  const imps = RAIN.filter(m => m.t0 + m.dur <= t).map(m => ({ dir: m.to.clone().applyMatrix4(inv).normalize(), t: m.t0 + m.dur, size: m.impSize }));
  placeImpacts(imps);
  const red = ss(t, 69.9, 71.4);
  earthU.uRedSky.value = red;
  earthU.atmoColor.value.set(mix(0.3, 1.0, red), mix(0.55, 0.32, red), mix(1.0, 0.12, red));
  earthU.uDry.value = ss(t, 71.3, 73.0);
  earthU.uFire.value = ss(t, 73.0, 75.1) * 0.75;
  earthU.uNight.value = 1 - red;
  const close = eio(lin(t, 64.32, 70));
  const d = mix(6.5, 3.4, close) - ss(t, 70, 75.15) * 0.25;
  const ang = 0.15 - lt * 0.012;
  setCam(V3(Math.sin(ang) * d, mix(1.6, 0.7, close), Math.cos(ang) * d), V3(0, mix(0.2, 0.25, close), 0), 34);
  shake(t, 0.0015 + ss(t, 66.6, 67.4) * 0.003 + ss(t, 73, 75) * 0.002);
  FU.uFade.value = ss(t, 64.32, 64.6);
  FU.uGain.value.set(1 + red * 0.08, 1, 1 - red * 0.08);
});

// 16. PLANET OF FIRE / NOTHING SURVIVES
scn(75.15, 79.3, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.6, 0.35, 0.72).normalize();
  earth.rotation.y = faceLon(-10) + t * 0.012;
  earthU.uRedSky.value = 1; earthU.uDry.value = 1; earthU.uFire.value = mix(0.75, 1.0, ss(t, 75.15, 77)); earthU.uNight.value = 0;
  earthU.atmoColor.value.set(1.0, 0.3, 0.1);
  const d = mix(3.6, 5.6, eio(lin(t, 75.15, 79.3)));
  setCam(V3(Math.sin(0.1) * d, 0.55, Math.cos(0.1) * d), V3(0, 0.0, 0), 34);
  FU.uFade.value = 1 - ss(t, 78.1, 79.3) * 0.75;
  FU.uSat.value = 1 - ss(t, 78.1, 79.2) * 0.35;
  bloom.strength = 0.9;
});

// 17. HERE'S THE CRAZY PART — rewind into deep time
scn(79.3, 83.72, (t, lt) => {
  stars.material.uniforms.uBright.value = 0.8;
  earth.visible = atmo.visible = true;
  SUN = V3(0.6, 0.35, 0.72).normalize();
  earthU.uRedSky.value = 1; earthU.uDry.value = 1; earthU.uFire.value = 1; earthU.uNight.value = 0; earthU.atmoColor.value.set(1.0, 0.3, 0.1);
  earth.rotation.y = faceLon(-10) - (t - 79.3) * (0.3 + lt * 0.6);
  const d = 5.6 + ei(lin(t, 79.3, 83.72)) * 40;
  setCam(V3(Math.sin(0.1) * d, 0.55, Math.cos(0.1) * d), V3(0, 0, 0), 34);
  FU.uFade.value = 0.25 + ss(t, 79.3, 79.7) * 0.55;
  FU.uSat.value = 0.55;
  S.hud.push({ type: 'rewind', a: ss(t, 81.2, 81.6), t });
});

// 18. THEIA — 4.5 billion years ago
const THEIA_HIT = 86.4;
scn(83.72, 91.2, (t, lt) => {
  earth.visible = atmo.visible = true;
  SUN = V3(0.85, 0.3, 0.45).normalize();
  earth.rotation.y = 1.0 + t * 0.03;
  earthU.uDry.value = 1; earthU.uFire.value = 0.72; earthU.uRedSky.value = 0.5; earthU.uNight.value = 0;
  earthU.atmoColor.value.set(0.9, 0.45, 0.25); atmoU.strength.value = 1.0;
  const hitDir = V3(0.55, 0.55, 0.62).normalize();
  const contact = hitDir.clone().multiplyScalar(1 + 0.53 * 0.85);
  if (t < THEIA_HIT + 0.12) {
    theia.visible = true;
    const k = ei(lin(t, 83.72, THEIA_HIT));
    theia.position.copy(vmix(V3(2.0, 2.45, -0.3), contact, k));
    if (t > THEIA_HIT) theia.position.addScaledVector(hitDir, -(t - THEIA_HIT) * 4);
    theia.rotation.y = t * 0.2;
  }
  // camera: close two-shot, then pull back for the disk
  const back = eio(lin(t, 86.9, 90.2));
  const d = mix(7.6, 13.0, back);
  const ang = 0.35 + lt * 0.03;
  setCam(V3(Math.sin(ang) * d, mix(1.2, 4.2, back), Math.cos(ang) * d), V3(mix(0.55, 0.0, back), mix(1.1, 0.0, back), 0), 34);
  if (t > THEIA_HIT) {
    const k = t - THEIA_HIT;
    earth.updateMatrixWorld();
    const local = hitDir.clone().applyMatrix4(earth.matrixWorld.clone().invert()).normalize();
    placeImpacts([{ dir: local, t: THEIA_HIT, size: 3.5 }]);
    flash.visible = flash2.visible = true;
    flash.position.copy(hitDir).multiplyScalar(1.2); flash.scale.setScalar(2.0 + k * 3); flash.material.opacity = Math.exp(-k * 3);
    flash2.position.copy(hitDir).multiplyScalar(1.4); flash2.scale.setScalar(3.5 + k * 2.5); flash2.material.opacity = Math.exp(-k * 1.2) * 0.6;
    FU.uFlash.value = Math.exp(-k * 10) * 1.4; FU.uFlashColor.value.set(1, 0.8, 0.6);
    shake(t, 0.022 * Math.exp(-k * 2.2));
    // debris: eject -> disk -> coalesce into the moon
    debris.visible = true;
    const D = ss(t, 87.1, 89.6), C = ss(t, 89.6, 90.75);
    const moonP = V3(-2.6, 0.25, -1.4);
    const th0 = Math.atan2(hitDir.z, hitDir.x);
    let n = 0;
    for (let i = 0; i < DEB_N; i++) {
      const q = debData[i];
      const v = q.v.clone().multiplyScalar(0.55).add(hitDir).normalize();
      const tau = 1 - Math.exp(-k * 1.4 * q.sp);
      const pe = hitDir.clone().multiplyScalar(1.05).addScaledVector(v, tau * q.sp * 1.4);
      const th = th0 + q.th * D + k * 0.35 * Math.pow(2.5 / q.rf, 1.5);
      const pd = V3(q.rf * Math.cos(th), q.y, q.rf * Math.sin(th));
      let p = vmix(pe, pd, eio(clamp(D * 1.2 - q.d * 0.2)));
      const cc = eio(clamp(C * 1.25 - q.d * 0.25));
      p = vmix(p, moonP.clone().addScaledVector(q.c, 0.27), cc);
      const heat = Math.exp(-k * 0.5);
      setPt(debris, n++, p.x, p.y, p.z, 1.0 + heat * 2.2, 0.55 + heat * 0.7, 0.35 + heat * 0.15, q.s * (1 + heat), 0.55 * (1 - cc * 0.7));
    }
    commit(debris, n);
    if (C > 0.55) {
      moon.visible = true; moon.position.copy(moonP);
      moon.scale.setScalar(mix(0.6, 1.0, ss(C, 0.55, 1)));
      moon.material.uniforms.uHot.value = 1 - ss(t, 90.6, 91.2) * 0.4;
    }
  }
  FU.uFade.value = ss(t, 83.72, 84.1);
  FU.uSat.value = 0.85;
  S.hud.push({ type: 'theia', a: ss(t, 85.3, 85.6) * (1 - ss(t, 86.2, 86.4)), p: theia.visible ? project(theia.position) : { x: 0, y: 0 } });
});

// 19. ENDING — present day, calm
scn(91.2, 97.2, (t, lt) => {
  earth.visible = atmo.visible = moon.visible = sun.visible = true;
  SUN = V3(0.9, 0.3, 0.3).normalize();
  earth.rotation.y = faceLon(30) + t * 0.01;
  earth.position.set(-0.4, 1.2, -4.5);
  moon.position.set(0.12, -0.32, 0.9);
  moon.rotation.y = 3.4;
  const k = eio(lin(t, 91.2, 97.2));
  setCam(V3(-0.05 + k * 0.12, -0.08, 2.9 - k * 0.35), V3(-0.05, 0.25, 0), 34);
  sun.scale.setScalar(90);
  FU.uFade.value = ss(t, 91.2, 91.6) * (1 - ss(t, 95.8, 97.0));
});

// ---------- render ----------
window.renderAt = async (t) => {
  reset(t);
  const s = scenes.find(s => t >= s.a && t < s.b) || scenes[scenes.length - 1];
  s.fn(t, t - s.a);
  finalizeUniforms();
  FU.uTime.value = t;
  composer.render();
  drawOverlay(t, S);
  return true;
};
window.sceneCount = scenes.length;
await document.fonts.ready;
window.ready = true;
