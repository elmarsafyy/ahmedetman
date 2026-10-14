import * as THREE from 'three';
import * as E from './engine.js';
import * as M from './models.js';
import * as P from './props.js';
import { loadISS, loadAstronaut } from './assets.js';
import { drawOverlay } from './overlay.js';
const { V3, ss, lin, eio, eo, ei, mix, vmix, clamp, setCam, shake, project, ll } = E;

// ---------------- assets
const T = M.makeTextures();
const iss = await loadISS(); E.fg.add(iss);
const inter = M.buildInterior(T); E.fg.add(inter);
const astro = await loadAstronaut(E.cubeRT.texture); E.fg.add(astro);
const HEAD = astro.userData.headCenter;
const cupola = P.buildCupola(); E.fg.add(cupola);
const water = P.buildWater(); E.fg.add(water);
const drops = [0, 1, 2, 3].map(() => { const d = P.buildWater(); d.scale.setScalar(0.18 + Math.random() * 0.1); E.fg.add(d); return d; });
const brush = P.buildToothbrush(); E.fg.add(brush);
const tortilla = P.buildTortilla(T); E.fg.add(tortilla);
const salt = P.buildBottle(0xf4f4f0, 0x2a6bd1), pepper = P.buildBottle(0x2b2b2b, 0xc0392b); E.fg.add(salt); E.fg.add(pepper);
const veggie = P.buildVeggie(T); E.fg.add(veggie);
const holo = P.holoMat(); const holoOrange = P.holoMat(new THREE.Color(1.0, 0.55, 0.25));
const bone = P.buildBone(holo); E.fg.add(bone);
const spine = P.buildSpine(holo); E.fg.add(spine);
// astronaut hologram copy (for the "you are the experiment" scan)
const holoAstro = new THREE.Group(); astro.traverse(o => { if (o.isMesh && o !== astro.userData.visor) holoAstro.add(new THREE.Mesh(o.geometry, holo)); }); E.fg.add(holoAstro);
// straps for sleeping upright
const strapM = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.8 });
const straps = new THREE.Group(); for (const y of [0.3, -0.38]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.78), strapM); s.position.set(0.0, y, 0); straps.add(s); } E.fg.add(straps);
// crumbs
const crumbs = (() => {
  const n = 400, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), r = M.rng(9); const base = [];
  for (let i = 0; i < n; i++) base.push([ (r() - 0.5) * 0.04, (r() - 0.5) * 0.04, (r() - 0.5) * 0.04, (r() - 0.5), (r() - 0.5), (r() - 0.5), 0.5 + r() ]);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc9a066, size: 0.0035, sizeAttenuation: true, map: dot, transparent: true, depthWrite: false }));
  pts.userData.base = base; pts.frustumCulled = false; E.fg.add(pts); return pts;
})();
// bread slice that crumbles
const bread = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xd8b77a, roughness: 0.9 })); E.fg.add(bread);
// orbit ring + ISS marker in the Earth layer
const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.063, 0.0018, 8, 400), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.9, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
E.bg.add(orbit);
const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: E.glowT, color: new THREE.Color(3, 3, 3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); E.bg.add(marker);
// key light for the astronaut in interior shots
const key = new THREE.SpotLight(0xfff1de, 6, 8, 0.5, 0.6, 1.5); E.fg.add(key); E.fg.add(key.target);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0); E.fg.add(rim); E.fg.add(rim.target);

const ALL = [iss, inter, astro, cupola, water, ...drops, brush, tortilla, salt, pepper, veggie, bone, spine, holoAstro, straps, crumbs, bread, orbit, marker];
const S = { hud: [] };
const EGYPT = ll(26.5, 31.5);
function earthUnder(lat, lon, spin = 0) { // rotate earth so (lat,lon) is straight below the station (+Y), plus a spin about +Y
  E.earth.quaternion.setFromUnitVectors(ll(lat, lon), V3(0, 1, 0));
  if (spin) E.earth.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), spin));
}
function visorEnv(fromBg, pos) {
  astro.userData.visor.visible = false;
  if (fromBg) { E.cubeCamBg.position.copy(E.state.stationAt); E.cubeCamBg.update(E.renderer, E.bg); }
  else { const v = astro.visible; astro.visible = false; E.cubeCamFg.position.copy(pos); E.cubeCamFg.update(E.renderer, E.fg); astro.visible = v; }
  astro.userData.visor.visible = true;
}
function headWorld() { astro.updateMatrixWorld(); return HEAD.clone().applyMatrix4(astro.matrixWorld); }
function interiorOn(level = 1) {
  inter.visible = true; E.bgPassEnabled(false); E.fg.fog = new THREE.FogExp2(0x090c10, 0.085);
  for (const l of inter.userData.lights) l.intensity = 1.3 * level;
  inter.userData.ledM.color.setRGB(1.6 * level, 1.7 * level, 1.9 * level);
  E.sunLight.intensity = 0; E.earthLight.intensity = 0.1 * level;
}
function keyOn(pos, target, I = 6) { key.intensity = I; key.position.copy(pos); key.target.position.copy(target); }

function reset(t) {
  E.resetCommon();
  for (const o of ALL) o.visible = false;
  E.fg.fog = null; key.intensity = 0; rim.intensity = 0;
  astro.position.set(0, 0, 0); astro.rotation.set(0, 0, 0); astro.scale.setScalar(1);
  iss.position.set(0, 0, 0); iss.rotation.set(0, 0, 0);
  E.earth.quaternion.identity();
  E.state.SUN = V3(0.7, 0.35, 0.6).normalize();
  E.earthU.uDetail.value = 1;
  holo.uniforms.uDensity.value = 1; holo.uniforms.uScan.value = -10; holo.uniforms.uAmp.value = 1; holo.uniforms.uTime.value = t;
  S.hud = []; S.mode = 'station';
}

const scenes = [];
const scn = (a, b, fn) => scenes.push({ a, b, fn });

// helper: sunrise cycles reflected in the visor
function sunCycle(cyc) {
  const e = -0.33 + 0.42 * Math.sin(cyc * Math.PI * 2 - Math.PI / 2);
  const az = 0.25 + Math.sin(cyc * 1.3) * 0.15;
  return V3(Math.sin(az), e, Math.cos(az)).normalize();
}
function visorShot(t, lt, dur, push, cycles) {
  astro.visible = true; astro.rotation.set(-0.05, 0.22, 0);
  earthUnder(24, 33, t * 0.004);
  const c = cycles(t);
  E.state.SUN = sunCycle(c);
  E.sunLight.intensity = 3.5 * clamp(E.state.SUN.y * 3 + 0.9); E.earthLight.intensity = 0.35;
  const hp = headWorld();
  const d = mix(1.0, 0.72, eio(lin(lt, 0, dur))) * push;
  setCam(hp.clone().add(V3(0.2, 0.06, d)), hp.clone().add(V3(0, -0.04, 0)), 30);
  E.syncBg();
  E.finalize(t);
  visorEnv(true);
  return c;
}

// A. HOOK — sixteen sunrises in a visor
scn(0, 4.95, (t, lt) => {
  const c = visorShot(t, lt, 4.95, 1, tt => 3.75 * eio(lin(tt, 0.1, 3.3)) + 0.25 * lin(tt, 3.3, 4.95));
  S.hud.push({ type: 'sunrise', a: ss(t, 0.3, 0.7) * (1 - ss(t, 4.5, 4.9)), n: Math.min(16, Math.max(1, Math.round(1 + 15 * eio(lin(t, 0.4, 3.1))))) });
  FU().uFade.value = ss(t, 0, 0.25) * (1 - ss(t, 4.75, 4.95));
  E.bloom.strength = 0.8;
});

// B. ISS hero over Egypt
scn(4.95, 8.45, (t, lt) => {
  iss.visible = true;
  earthUnder(23.5, 31.5, -lt * 0.004);
  E.state.SUN = V3(0.75, 0.45, 0.5).normalize();
  E.earthLight.intensity = 0.35;
  const k = eio(lin(t, 4.95, 8.45));
  setCam(V3(mix(8.5, 6.2, k), mix(1.2, 0.5, k), mix(11.0, 9.5, k)), V3(0.0, -1.9, -1.0), 38, 0.06);
  E.syncBg();
  FU().uFade.value = ss(t, 4.95, 5.3);
});

// C. ORBIT — once around every 90 minutes
scn(8.45, 11.65, (t, lt) => {
  S.mode = 'free'; E.bgPassEnabled(true);
  orbit.visible = marker.visible = true;
  E.earth.quaternion.setFromUnitVectors(ll(20, 20), V3(0, 0, 1));
  E.state.SUN = V3(0.8, 0.3, 0.55).normalize();
  orbit.rotation.set(Math.PI / 2 - 0.9, 0.0, 0.25);
  const k = eio(lin(t, 8.7, 11.3));
  const ang = -0.6 + k * Math.PI * 2;
  const p = V3(Math.cos(ang) * 1.063, Math.sin(ang) * 1.063, 0).applyEuler(orbit.rotation);
  marker.position.copy(p); marker.scale.setScalar(0.08);
  orbit.material.opacity = 0.7 * ss(t, 8.6, 9.0);
  const camD = mix(4.6, 4.1, lin(t, 8.45, 11.65));
  E.bgCam.fov = 32; E.bgCam.aspect = E.W / E.H; E.bgCam.updateProjectionMatrix();
  E.bgCam.position.set(0.35, 0.5, camD); E.bgCam.lookAt(0, 0.05, 0); E.bgCam.updateMatrixWorld();
  E.atmoU.thick.value = 0.04;
  FU().uFade.value = ss(t, 8.45, 8.8);
  S.hud.push({ type: 'orbit', a: ss(t, 9.2, 9.6) * (1 - ss(t, 11.4, 11.65)), k });
});

// D. SPEED — the station tears past
scn(11.65, 14.45, (t, lt) => {
  iss.visible = true;
  const k = lin(t, 11.65, 14.45);
  iss.position.set(mix(22, -24, eio(k)), 0, 0);
  iss.rotation.y = 0.15;
  earthUnder(28, 34 + lt * 2.0);
  E.state.SUN = V3(0.4, 0.55, 0.7).normalize();
  setCam(V3(0, -0.9, 8.0), V3(0, -1.6, 0), 42, 0.03);
  shake(t, 0.002);
  E.syncBg();
  FU().uFade.value = ss(t, 11.65, 11.85);
  FU().uCA.value = 0.012 + Math.sin(k * Math.PI) * 0.02;
});

// E. ALTITUDE — 400 km up
scn(14.45, 16.75, (t, lt) => {
  S.mode = 'free';
  marker.visible = true; marker.scale.setScalar(0.012);
  E.earth.quaternion.setFromUnitVectors(ll(28, 30), V3(0, 1, 0));
  E.state.SUN = V3(0.3, 0.7, 0.65).normalize();
  const k = eio(lin(t, 14.45, 16.75));
  marker.position.set(0, 1.0628, 0);
  E.bgCam.fov = 30; E.bgCam.aspect = E.W / E.H; E.bgCam.updateProjectionMatrix();
  E.bgCam.position.set(0, mix(1.04, 1.02, k), mix(0.62, 0.5, k)); E.bgCam.lookAt(0, 1.02, 0); E.bgCam.updateMatrixWorld();
  E.atmoU.thick.value = 0.02;
  FU().uFade.value = ss(t, 14.45, 14.7) * (1 - ss(t, 16.5, 16.75));
  S.hud.push({ type: 'alt', a: ss(t, 14.6, 15.0), p0: project(V3(0, 1.0, 0), E.bgCam), p1: project(V3(0, 1.0628, 0), E.bgCam), k: eo(lin(t, 14.6, 15.4)) });
});

// F/G. WAKE UP — sleeping upright, strapped to the wall
function sleepSet(t, level) {
  interiorOn(level);
  astro.visible = straps.visible = true;
  astro.rotation.set(0, Math.PI / 2, 0); astro.position.set(-0.58, 0.02, -3.0);
  straps.position.set(-0.27, 0.02, -3.0);
  keyOn(V3(0.6, 0.9, -2.0), V3(-0.5, 0.2, -3.0), 3 * level);
}
scn(16.75, 22.95, (t, lt) => {
  const on = t < 18.3 ? 0.08 : (0.08 + 0.92 * ss(t, 18.3, 18.9)) * (t < 18.6 ? (Math.sin(t * 90) > 0 ? 1 : 0.3) : 1);
  sleepSet(t, on);
  const roll = mix(Math.PI / 2, 0, eio(lin(t, 19.4, 21.6)));
  const k = lin(t, 16.75, 22.95);
  setCam(V3(mix(0.8, 0.7, k), 0.05, mix(-0.9, -1.2, k)), V3(-0.55, 0.1, -3.0), 54, roll);
  const hp = headWorld(); visorEnv(false, hp.clone().add(V3(0.3, 0, 0)));
  FU().uFade.value = ss(t, 16.75, 17.1);
  S.hud.push({ type: 'clock', a: ss(t, 16.9, 17.3) * (1 - ss(t, 19.2, 19.5)), text: '06:00', sub: 'GMT', blink: t > 18.3 && t < 19.2 });
});
scn(22.95, 27.85, (t, lt) => {
  sleepSet(t, 1);
  const drift = ss(t, 25.3, 27.0);
  astro.position.x += drift * 0.06; astro.rotation.z = drift * 0.04;
  const k = eio(lin(t, 22.95, 27.85));
  setCam(V3(mix(0.6, 0.45, k), mix(0.4, 0.3, k), mix(-1.6, -2.0, k)), V3(-0.5, mix(0.1, 0.3, k), -3.0), 46, 0.05);
  const hp = headWorld(); visorEnv(false, hp.clone().add(V3(0.3, 0, 0)));
  FU().uFade.value = ss(t, 22.95, 23.2);
});

// H. TEETH — a floating toothbrush, the paste drifts off
scn(27.85, 33.95, (t, lt) => {
  interiorOn(1); astro.visible = brush.visible = true;
  astro.position.set(0, -0.05, -3.2); astro.rotation.set(0.05, 0.35, 0.02);
  const hp = headWorld();
  brush.position.copy(hp).add(V3(0.08 + lt * 0.006, -0.05 + Math.sin(t * 0.8) * 0.01, 0.38));
  brush.rotation.set(0.4 + t * 0.15, t * 0.35, 0.9 + t * 0.1);
  const pd = ss(t, 30.4, 33.8);
  brush.userData.paste.position.set(0, 0.09 + pd * 0.05, 0.022 + pd * 0.06);
  keyOn(V3(0.8, 0.8, -1.8), hp, 6);
  const k = eio(lin(t, 27.85, 33.95));
  setCam(hp.clone().add(V3(mix(0.4, 0.3, k), 0.02, mix(1.25, 1.0, k))), hp.clone().add(V3(0.06, -0.06, 0.3)), 36);
  visorEnv(false, hp.clone().add(V3(0, 0, 0.3)));
  FU().uFade.value = ss(t, 27.85, 28.1);
});

// I. WATER — a wobbling sphere of recycled water
scn(33.95, 43.35, (t, lt) => {
  interiorOn(1); astro.visible = water.visible = true;
  astro.position.set(-0.45, -0.1, -7.9); astro.rotation.set(0.1, 0.35, 0.1);
  water.position.set(0.02, 0.12 + Math.sin(t * 0.7) * 0.01, -2.3); water.userData.wobble(t, 1);
  drops.forEach((d, i) => { d.visible = true; d.position.set(-0.22 + i * 0.15, 0.25 + Math.sin(t * 0.5 + i) * 0.03 - i * 0.07, -2.45 - i * 0.12); d.userData.wobble(t + i, 0.7); });
  keyOn(V3(0.7, 0.9, -1.4), V3(0, 0.1, -2.4), 5);
  const k = eio(lin(t, 33.95, 43.35));
  setCam(V3(mix(0.22, 0.1, k), mix(0.2, 0.15, k), mix(-1.3, -1.45, k)), V3(0, 0.12, -2.3), 38);
  FU().uFade.value = ss(t, 33.95, 34.2);
  S.hud.push({ type: 'gauge', a: ss(t, 35.6, 36.0) * (1 - ss(t, 38.7, 39.0)), v: Math.round(98 * eo(lin(t, 35.9, 37.9))) });
});

// J. FOOD — crumbs, tortilla, liquid salt & pepper
scn(43.35, 52.95, (t, lt) => {
  interiorOn(1); astro.visible = true;
  astro.position.set(0.45, -0.1, -7.9); astro.rotation.set(0.05, -0.35, 0);
  const c0 = V3(0.0, 0.1, -2.3);
  if (t < 47.7) {
    bread.visible = t < 45.9; crumbs.visible = t > 45.6;
    bread.position.copy(c0); bread.rotation.set(t * 0.3, t * 0.5, 0.2);
    const k = Math.max(0, t - 45.7);
    const base = crumbs.userData.base, pa = crumbs.geometry.attributes.position;
    for (let i = 0; i < base.length; i++) { const b = base[i]; pa.setXYZ(i, c0.x + b[0] + b[3] * k * 0.08 * b[6] + k * 0.03, c0.y + b[1] + b[4] * k * 0.06 * b[6], c0.z + b[2] + b[5] * k * 0.08 * b[6]); }
    pa.needsUpdate = true;
  } else {
    tortilla.visible = t < 49.3 || t > 52.4;
    tortilla.scale.setScalar(0.85); tortilla.position.copy(c0).add(V3(Math.sin(t * 0.5) * 0.02, 0, 0)); tortilla.rotation.set(0.9 + t * 0.2, t * 0.7, 0.3);
    if (t > 49.2) {
      salt.visible = pepper.visible = true; tortilla.visible = false;
      salt.scale.setScalar(1.3); pepper.scale.setScalar(1.3); salt.position.copy(c0).add(V3(-0.045, 0.01 + Math.sin(t) * 0.01, 0)); salt.rotation.set(0.3, t * 0.4, 0.4 + t * 0.2);
      pepper.position.copy(c0).add(V3(0.045, -0.01, 0.02)); pepper.rotation.set(-0.3, -t * 0.35, -0.5 + t * 0.15);
    }
  }
  keyOn(V3(0.6, 0.8, -1.3), c0, 5);
  const k = eio(lin(t, 43.35, 52.95));
  setCam(c0.clone().add(V3(mix(0.12, -0.06, k), 0.08, mix(1.0, 0.85, k))), c0, 36);
  FU().uFade.value = ss(t, 43.35, 43.6);
});

// K. WORK — the plant chamber; then you are the experiment
scn(52.95, 58.4, (t, lt) => {
  interiorOn(0.6);
  if (t < 56.2) {
    veggie.visible = astro.visible = true;
    veggie.position.set(0.15, -0.35, -2.6); veggie.rotation.y = -0.3;
    astro.position.set(-0.45, -0.1, -7.9); astro.rotation.set(0, 0.4, 0);
    const k = eio(lin(t, 52.95, 56.2));
    setCam(V3(mix(0.55, 0.4, k), mix(0.15, 0.08, k), mix(-1.55, -1.7, k)), V3(0.12, -0.22, -2.6), 42);
    keyOn(V3(0.6, 0.6, -1.9), V3(0.15, -0.2, -2.6), 2.5);
  } else {
    E.bgPassEnabled(false); inter.visible = false; E.fg.fog = null;
    holoAstro.visible = true; holoAstro.rotation.y = t * 0.4;
    holo.uniforms.uScan.value = mix(-1.0, 1.0, lin(t, 56.3, 58.2));
    setCam(V3(0, 0.05, 3.4), V3(0, 0, 0), 34);
  }
  FU().uFade.value = ss(t, 52.95, 53.2);
});

// L. BONES — losing ~1% a month; 2 hours of exercise a day
scn(58.4, 67.0, (t, lt) => {
  E.bgPassEnabled(false);
  if (t < 64.4) {
    bone.visible = true; bone.rotation.set(0.2, t * 0.35, 0.15);
    holo.uniforms.uDensity.value = 1 - 0.32 * lin(t, 60.7, 63.9);
    holo.uniforms.uScan.value = mix(-0.7, 0.7, (t * 0.5) % 1);
    setCam(V3(0, 0, mix(2.6, 2.2, lin(t, 58.4, 64.4))), V3(0, 0, 0), 34);
    S.hud.push({ type: 'months', a: ss(t, 60.6, 61.0) * (1 - ss(t, 64.0, 64.4)), m: Math.min(6, Math.floor(lin(t, 60.7, 63.9) * 6.99)) });
  } else {
    holoAstro.visible = true; holoAstro.rotation.y = 0.5 + t * 0.3;
    holo.uniforms.uScan.value = mix(-1.0, 1.0, (t * 0.6) % 1);
    setCam(V3(0, 0.05, 3.2), V3(0, 0, 0), 34);
    S.hud.push({ type: 'timer', a: ss(t, 64.5, 64.9) * (1 - ss(t, 66.7, 67.0)), k: eo(lin(t, 64.6, 66.4)), t });
  }
  FU().uFade.value = ss(t, 58.4, 58.65);
});

// M. SPINE — you grow ~5 cm, then lose it back home
scn(67.0, 75.6, (t, lt) => {
  E.bgPassEnabled(false);
  spine.visible = true; spine.rotation.set(0.1, -0.5 + t * 0.12, 0);
  const g = 0.035 * eio(lin(t, 68.7, 71.4)) * (1 - eio(lin(t, 73.8, 75.2)));
  spine.userData.layout(g);
  holo.uniforms.uScan.value = mix(-0.8, 0.8, (t * 0.45) % 1);
  setCam(V3(0.0, 0.05, 4.0), V3(0.05, 0, 0), 32);
  const top = spine.userData.verts[8], bot = spine.userData.verts[0];
  spine.updateMatrixWorld();
  S.hud.push({ type: 'height', a: ss(t, 69.9, 70.3) * (1 - ss(t, 75.1, 75.5)), p0: project(bot.getWorldPosition(V3()).add(V3(0.3, -0.05, 0))), p1: project(top.getWorldPosition(V3()).add(V3(0.3, 0.05, 0))), cm: Math.round(5 * (g / 0.035)) });
  FU().uFade.value = ss(t, 67.0, 67.25);
});

// N. CUPOLA — the biggest window on the station, looking out to the horizon
scn(75.6, 84.6, (t, lt) => {
  cupola.visible = astro.visible = true;
  cupola.position.set(0, 0, 0);
  earthUnder(16, 27 + lt * 0.25, 0);
  const night = ss(t, 82.4, 84.6);
  E.state.SUN = V3(0.35 - night * 1.0, 0.8 - night * 0.95, -0.45).normalize();
  E.sunLight.intensity = 0.6 * (1 - night); E.earthLight.intensity = 0.8 * (1 - night * 0.7); E.earthLight.color.setRGB(0.6, 0.75, 1.0);
  rim.intensity = 1.0 * (1 - night); rim.position.set(0, -3, -1.5); rim.target.position.set(0, 0, 0);
  E.earthU.uExposure.value = 0.85; E.earthU.uNight.value = 1.6;
  astro.position.set(-0.35, 0.05, 0.55); astro.rotation.set(-0.55, 2.7, 0.15);
  if (t < 80.4) {
    const k = eio(lin(t, 75.6, 80.4));
    setCam(V3(mix(1.0, 0.8, k), mix(1.35, 1.2, k), mix(2.3, 2.05, k)), V3(-0.25, -0.45, -0.6), 52, 0.04);
  } else {
    const k = eio(lin(t, 80.4, 84.6));
    setCam(V3(0.2, mix(0.1, 0.0, k), 0.5), V3(-0.05, -0.75, -1.6), 46, 0.02);
  }
  E.syncBg();
  E.finalize(t); visorEnv(true);
  FU().uFade.value = ss(t, 75.6, 75.9);
});

// O. PALE BLUE DOT — pull all the way out
scn(84.6, 92.05, (t, lt) => {
  const d = t < 88.1 ? 1e-5 * Math.pow(55, eio(lin(t, 84.6, 88.1))) : 0.9 * Math.pow(330, eio(lin(t, 88.1, 91.9))); // earth radii from the station
  earthUnder(28, 31, 0);
  E.state.SUN = V3(0.75, 0.45, 0.5).normalize();
  const dir = V3(0.35, 0.45, 0.82).normalize();
  if (d < 0.0006) {
    iss.visible = true;
    const fgd = d / E.state.scale;
    setCam(dir.clone().multiplyScalar(fgd), V3(0, -0.4, 0).lerp(V3(0, -fgd * 0.5, 0), 0), 38);
    E.cam.lookAt(V3(0, -mix(0.4, fgd * 0.6, Math.min(1, fgd / 300)), 0));
    E.syncBg();
  } else {
    S.mode = 'free';
    const look = vmix(E.state.stationAt.clone().multiplyScalar(0.98), V3(0, 0, 0), ss(d, 0.001, 0.8));
    E.bgCam.fov = 38; E.bgCam.aspect = E.W / E.H; E.bgCam.updateProjectionMatrix();
    E.bgCam.position.copy(E.state.stationAt).addScaledVector(dir, d); E.bgCam.lookAt(look); E.bgCam.updateMatrixWorld();
  }
  E.atmoU.thick.value = mix(0.025, 0.06, ss(d, 0.05, 2));
  FU().uFade.value = ss(t, 84.6, 84.85);
});

// P. 21:30 — back into the sleeping bag, lights down
scn(92.05, 96.0, (t, lt) => {
  const lv = 1 - 0.9 * ss(t, 94.4, 95.6);
  sleepSet(t, lv);
  const k = eio(lin(t, 92.05, 96.0));
  setCam(V3(mix(0.8, 0.7, k), 0.1, mix(-0.9, -1.3, k)), V3(-0.55, 0.1, -3.0), 52);
  const hp = headWorld(); visorEnv(false, hp.clone().add(V3(0.3, 0, 0)));
  FU().uFade.value = ss(t, 92.05, 92.3) * (1 - ss(t, 95.7, 96.0));
  S.hud.push({ type: 'clock', a: ss(t, 92.3, 92.7) * (1 - ss(t, 94.3, 94.7)), text: '21:30', sub: 'GMT' });
});

// Q. ENDING — the sun rises again in the visor
scn(96.0, 101.2, (t, lt) => {
  visorShot(t, lt, 5.2, 1.0, tt => 0.08 + 0.27 * eio(lin(tt, 96.2, 99.4)));
  E.bloom.strength = 0.85;
  FU().uFade.value = ss(t, 96.0, 96.4) * (1 - ss(t, 99.9, 101.0));
});

function FU() { return E.FU; }

window.renderAt = async (t) => {
  reset(t);
  const s = scenes.find(s => t >= s.a && t < s.b) || scenes[scenes.length - 1];
  s.fn(t, t - s.a);
  if (S.mode === 'station') E.syncBg();
  E.finalize(t);
  E.render();
  if (window.DEBUG) { const b = new THREE.Box3().setFromObject(astro); console.error('astro bbox', t, b.min.toArray().map(v=>v.toFixed(2)), b.max.toArray().map(v=>v.toFixed(2)), 'cam', E.cam.position.toArray().map(v=>v.toFixed(2)), 'vis', astro.visible); }
  drawOverlay(t, S);
  return true;
};
await document.fonts.ready;
window.ready = true;
