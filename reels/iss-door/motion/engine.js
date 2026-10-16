// Shared render engine: Earth background layer + foreground (station / interior / astronaut) layer.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as SH from './shaders.js';

export const W = 1080, H = 1920;
const RS = 0.8, RW = Math.round(W * RS), RH = Math.round(H * RS);
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lin = (t, a, b) => clamp((t - a) / (b - a));
export const ss = (t, a, b) => { const x = lin(t, a, b); return x * x * (3 - 2 * x); };
export const eio = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const eo = x => 1 - Math.pow(1 - x, 3);
export const ei = x => x * x * x;
export const mix = (a, b, x) => a + (b - a) * x;
export const vmix = (a, b, x) => a.clone().lerp(b, x);
export function n1(t, seed) { return Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 23.7 + seed * 2.1) * 0.3 + Math.sin(t * 41.3 + seed * 3.7) * 0.2; }
export function ll(lat, lon) {
  const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI;
  return V3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
}

const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

export const bg = new THREE.Scene(); bg.background = new THREE.Color(0, 0, 0);
export const fg = new THREE.Scene();
export const bgCam = new THREE.PerspectiveCamera(32, W / H, 0.0005, 3000);
export const cam = new THREE.PerspectiveCamera(32, W / H, 0.02, 400);

const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 4 });
export const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(RW, RH);
const bgPass = new RenderPass(bg, bgCam);
const fgPass = new RenderPass(fg, cam); fgPass.clear = false; fgPass.clearDepth = true;
composer.addPass(bgPass); composer.addPass(fgPass);
export const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.6, 0.5, 1.0);
composer.addPass(bloom);
export const finalPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 1 }, uGrain: { value: 0.045 }, uVig: { value: 0.9 },
    uCA: { value: 0.012 }, uSat: { value: 1 }, uFlashColor: { value: V3(1, 1, 1) }, uLift: { value: V3(0, 0, 0) }, uGain: { value: V3(1, 1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: SH.finalFrag,
});
composer.addPass(finalPass);
export const FU = finalPass.uniforms;

const loader = new THREE.TextureLoader();
async function tex(p, srgb) {
  const t = await loader.loadAsync('tex/' + p);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  return t;
}
const [dayT, nightT, brcT, floodT, lavaT] = await Promise.all([tex('earth_day_4096.jpg', true), tex('earth_night_4096.jpg', true), tex('earth_bump_roughness_clouds_4096.jpg', false), tex('floodmap.png', false), tex('lavatile.jpg', true)]);

// stars
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const stars = (() => {
  const r = rng(7), N = 9000, pos = [], col = [], size = [];
  const band = V3(0.3, 0.85, 0.42).normalize();
  for (let i = 0; i < N; i++) {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); let d = V3(s * Math.cos(a), z, s * Math.sin(a));
    const mw = i > 5200;
    if (mw) { d.addScaledVector(band, -d.dot(band)).normalize(); let u = 0; while (u === 0) u = r(); d.addScaledVector(band, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) * 0.08).normalize(); }
    pos.push(d.x * 900, d.y * 900, d.z * 900);
    const b = mw ? 0.12 + r() * 0.25 : Math.pow(r(), 6) * 2.6 + 0.12;
    const tint = r(); const c = tint < 0.2 ? [1.0, 0.82, 0.65] : tint > 0.8 ? [0.7, 0.82, 1.0] : [1, 0.96, 0.92];
    col.push(c[0] * b, c[1] * b, c[2] * b); size.push(mw ? 2.2 : 2.0 + Math.pow(r(), 4) * 4.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uBright: { value: 1 } }, vertexShader: SH.starsVert, fragmentShader: SH.starsFrag, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -2; bg.add(p); return p;
})();

// earth + atmosphere
export const earthU = {
  dayMap: { value: dayT }, nightMap: { value: nightT }, brcMap: { value: brcT }, floodMap: { value: floodT }, lavaMap: { value: lavaT },
  sunDir: { value: V3(1, 0, 0) }, camPos: { value: V3() }, atmoColor: { value: V3(0.3, 0.55, 1.0) },
  uTime: { value: 0 }, cloudOffset: { value: 0 }, uFlood: { value: 0 }, uFloodPulse: { value: 0 }, uQuake: { value: 0 }, uRedSky: { value: 0 },
  uDry: { value: 0 }, uFire: { value: 0 }, uNight: { value: 1 }, uExposure: { value: 1 }, uDetail: { value: 1 },
  hot: { value: Array.from({ length: 16 }, () => V3(0, 1, 0)) },
  imp: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 1, 0, -1)) }, impSize: { value: Array(12).fill(1) }, uNow: { value: 0 },
};
export const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 320, 200), new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: SH.planetVert, fragmentShader: SH.earthFrag }));
bg.add(earth);
export const atmoU = { camPos: { value: V3() }, center: { value: V3() }, sunDir: { value: V3(1, 0, 0) }, atmoColor: { value: V3(0.3, 0.55, 1.0) }, radius: { value: 1 }, thick: { value: 0.07 }, strength: { value: 1.6 } };
export const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.1, 160, 120), new THREE.ShaderMaterial({ uniforms: atmoU, vertexShader: SH.atmoVert, fragmentShader: SH.atmoFrag, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
bg.add(atmo);

// sun glow sprite (bg layer) + flare ghosts handled in overlay
function glowTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}
export const glowT = glowTex([[0, 'rgba(255,255,255,1)'], [0.08, 'rgba(255,240,220,0.85)'], [0.25, 'rgba(255,200,150,0.25)'], [0.6, 'rgba(255,170,120,0.05)'], [1, 'rgba(0,0,0,0)']]);
export const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: new THREE.Color(4, 3.7, 3.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
sun.frustumCulled = false; bg.add(sun);

// foreground lights
export const sunLight = new THREE.DirectionalLight(0xfff6ea, 3.0); fg.add(sunLight); fg.add(sunLight.target);
export const earthLight = new THREE.HemisphereLight(0x9cc3ff, 0x0a0c10, 0.25); fg.add(earthLight);
export const fill = new THREE.DirectionalLight(0x8fb4ff, 0.0); fg.add(fill); fg.add(fill.target);

// cube cameras for visor reflections
export const cubeRT = new THREE.WebGLCubeRenderTarget(192, { type: THREE.HalfFloatType });
export const cubeCamBg = new THREE.CubeCamera(0.0005, 3000, cubeRT);
export const cubeCamFg = new THREE.CubeCamera(0.02, 400, cubeRT);
bg.add(cubeCamBg); fg.add(cubeCamFg);

export const state = { SUN: V3(1, 0.2, 0.5).normalize(), earthPos: V3(0, 0, 0), stationAt: V3(0, 1.063, 0), scale: 1 / 637100, bgOn: true };

const tmp = V3();
export function project(p, camera = cam) {
  camera.updateMatrixWorld(); tmp.copy(p).project(camera);
  return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, behind: tmp.z > 1 };
}
export function setCam(pos, target, fov = 32, roll = 0) {
  cam.fov = fov; cam.updateProjectionMatrix();
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(target);
  if (roll) cam.rotateZ(roll);
}
export function shake(t, amp) { if (amp <= 0) return; cam.rotateX(n1(t, 1.3) * amp); cam.rotateY(n1(t, 4.1) * amp); cam.rotateZ(n1(t, 7.7) * amp * 0.6); }

// bg camera follows the foreground camera: same orientation, placed at the station's position in Earth units
export function syncBg(mode = 'station') {
  cam.updateMatrixWorld();
  bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.updateProjectionMatrix();
  bgCam.quaternion.copy(cam.quaternion);
  if (mode === 'station') bgCam.position.copy(state.stationAt).addScaledVector(cam.position, state.scale);
  bgCam.updateMatrixWorld();
}

export function finalize(t) {
  const S = state.SUN;
  earthU.sunDir.value.copy(S); earthU.camPos.value.copy(bgCam.position);
  atmoU.sunDir.value.copy(S); atmoU.camPos.value.copy(bgCam.position); atmoU.center.value.copy(earth.position); atmoU.radius.value = earth.scale.x;
  atmo.position.copy(earth.position); atmo.scale.copy(earth.scale); atmoU.atmoColor.value.copy(earthU.atmoColor.value);
  earthU.uTime.value = t; earthU.cloudOffset.value = t * 0.0006;
  sunLight.position.copy(S).multiplyScalar(50); sunLight.target.position.set(0, 0, 0);
  stars.position.copy(bgCam.position);
  sun.position.copy(bgCam.position).addScaledVector(S, 600);
  FU.uTime.value = t;
}

export function resetCommon() {
  bloom.strength = 0.6; bloom.radius = 0.5; bloom.threshold = 1.0;
  FU.uFlash.value = 0; FU.uFade.value = 1; FU.uGrain.value = 0.045; FU.uVig.value = 0.9; FU.uCA.value = 0.012; FU.uSat.value = 1;
  FU.uFlashColor.value.set(1, 1, 1); FU.uLift.value.set(0, 0, 0); FU.uGain.value.set(1, 1, 1);
  stars.material.uniforms.uBright.value = 1; stars.visible = true;
  earth.visible = atmo.visible = true; sun.visible = false; sun.scale.setScalar(120);
  earthU.uNight.value = 1; earthU.uExposure.value = 1; earth.rotation.set(0, 0, 0); earth.position.set(0, 0, 0);
  atmoU.strength.value = 1.6; atmoU.thick.value = 0.025; earthU.atmoColor.value.set(0.3, 0.55, 1.0);
  sunLight.intensity = 3.0; earthLight.intensity = 0.25; fill.intensity = 0;
  bg.background.setRGB(0, 0, 0);
  bgPassEnabled(true);
}
export function bgPassEnabled(on) { bgPass.enabled = on; fgPass.clear = !on; }
export function render() { composer.render(); }
