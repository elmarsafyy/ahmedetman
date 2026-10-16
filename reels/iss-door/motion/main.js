import * as THREE from 'three';
import * as E from './engine.js';
import * as M from './models.js';
import * as P from './props.js';
import * as D from './door.js';
import { loadISS, loadAstronaut, loadGlove } from './assets.js';
import { drawOverlay } from './overlay.js';
const { V3, ss, lin, eio, eo, ei, mix, vmix, clamp, setCam, shake, project, ll } = E;

const T = M.makeTextures();
const iss = await loadISS(); E.fg.add(iss);
const inter = M.buildInterior(T); E.fg.add(inter);
const astro = await loadAstronaut(E.cubeRT.texture); E.fg.add(astro);
const glove = await loadGlove(); E.fg.add(glove);
const hatch = D.buildHatch(); E.fg.add(hatch);
const airlock = D.buildAirlock(T); E.fg.add(airlock);
const fog = D.buildFog(); E.fg.add(fog);
const stream = D.buildStream(); E.fg.add(stream);
const chamber = D.buildChamber(); E.fg.add(chamber);
const leak = D.buildLeak(T); E.fg.add(leak);
const water = P.buildWater(); E.fg.add(water);
water.material = new THREE.MeshStandardMaterial({ color: 0xd8ecff, metalness: 0.0, roughness: 0.03, transparent: true, opacity: 0.42, envMap: E.cubeRT.texture, envMapIntensity: 2.2, depthWrite: false });
const holo = P.holoMat(); const holoRed = P.holoMat(new THREE.Color(1.0, 0.35, 0.25));
const holoAstro = new THREE.Group(); astro.traverse(o => { if (o.isMesh && o !== astro.userData.visor) holoAstro.add(new THREE.Mesh(o.geometry, holo)); }); E.fg.add(holoAstro);
// lungs inside the hologram torso
const lungs = new THREE.Group(); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), holoRed); l.scale.set(0.8, 1.35, 0.7); l.position.set(s * 0.1, 0.42, 0.02); lungs.add(l); } holoAstro.add(lungs);
// boiling bubbles on the water droplet
const bubbles = new THREE.Group(); { const r = M.rng(77); for (let i = 0; i < 60; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMap: E.cubeRT.texture, envMapIntensity: 1.5 })); b.userData = { d: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), t0: r(), s: 0.004 + r() * 0.012 }; bubbles.add(b); } } E.fg.add(bubbles);
// loose objects that get pulled out
const debris = [P.buildTortilla(T), P.buildBottle(0xf4f4f0, 0x2a6bd1), P.buildBottle(0x2b2b2b, 0xc0392b), P.buildToothbrush()];
{ const r = M.rng(5); for (let i = 0; i < 6; i++) debris.push(new THREE.Mesh(new (await import('three/addons/geometries/RoundedBoxGeometry.js')).RoundedBoxGeometry(0.12 + r() * 0.15, 0.08 + r() * 0.08, 0.1 + r() * 0.15, 2, 0.02), new THREE.MeshStandardMaterial({ color: [0xe8e4d8, 0x3c4a5c, 0xd9cfb5, 0x5a5f66][i % 4], roughness: 0.9 }))); }
debris.forEach((d, i) => { d.userData.seed = i; E.fg.add(d); });
const key = new THREE.SpotLight(0xfff1de, 6, 8, 0.5, 0.6, 1.5); E.fg.add(key); E.fg.add(key.target);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0); E.fg.add(rim); E.fg.add(rim.target);

const ALL = [iss, inter, astro, glove, hatch, airlock, fog, stream, chamber, leak, water, holoAstro, bubbles, ...debris];
const S = { hud: [] };
function FU() { return E.FU; }
function earthUnder(lat, lon, spin = 0) { E.earth.quaternion.setFromUnitVectors(ll(lat, lon), V3(0, 1, 0)); if (spin) E.earth.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), spin)); }
function keyOn(pos, target, I = 6) { key.intensity = I; key.position.copy(pos); key.target.position.copy(target); }
const HZ = -8.92; // hatch plane at the end of the module
function hatchSet(level = 1, red = 0) {
  inter.visible = hatch.visible = true; E.bgPassEnabled(false); E.fg.fog = new THREE.FogExp2(0x090c10, 0.06);
  for (const l of inter.userData.lights) l.intensity = 1.3 * level;
  inter.userData.ledM.color.setRGB(1.6 * level + red * 1.5, 1.7 * level, 1.9 * level);
  hatch.position.set(0, 0, HZ); hatch.rotation.set(0, 0, 0);
  E.sunLight.intensity = 0; E.earthLight.intensity = 0.1;
  keyOn(V3(0.6, 0.7, -6.6), V3(0, 0, HZ), 4.5 * level);
}
// airlock oriented so its hatch looks down and out towards the horizon
function airlockSet() {
  airlock.visible = true; airlock.position.set(0, 0, 0); airlock.rotation.set(-Math.PI / 2 + 1.15, 0, 0);
  earthUnder(24, 33, 0); E.state.SUN = V3(0.4, 0.7, -0.6).normalize();
  E.sunLight.intensity = 0.5; E.earthLight.intensity = 0.5; E.earthLight.color.setRGB(0.6, 0.75, 1.0);
}
function airlockPoint(z, x = 0, y = 0) { airlock.updateMatrixWorld(); return V3(x, y, z).applyMatrix4(airlock.matrixWorld); }

function reset(t) {
  E.resetCommon();
  for (const o of ALL) o.visible = false;
  E.fg.fog = null; key.intensity = 0; key.color.setRGB(1, 0.95, 0.87); rim.intensity = 0;
  astro.position.set(0, 0, 0); astro.rotation.set(0, 0, 0);
  iss.position.set(0, 0, 0); iss.rotation.set(0, 0, 0);
  airlock.userData.hatch.position.set(0, 0, -airlock.userData.L - 0.01); airlock.userData.hatch.rotation.set(0, 0, 0);
  airlock.userData.red.intensity = 0; airlock.userData.beaconM.color.setRGB(0.2, 0.02, 0.02); airlock.userData.white.intensity = 1.2;
  hatch.userData.handle.rotation.z = 0; hatch.userData.lampM.emissive.setRGB(0, 1, 0.3);
  E.earth.quaternion.identity(); E.state.SUN = V3(0.7, 0.35, 0.6).normalize(); E.earthU.uDetail.value = 1;
  holo.uniforms.uScan.value = -10; holo.uniforms.uTime.value = t; holoRed.uniforms.uScan.value = -10; holoRed.uniforms.uAmp.value = 1;
  E.earthLight.color.setRGB(0.61, 0.76, 1.0);
  S.hud = []; S.mode = 'station';
}
const scenes = []; const scn = (a, b, fn) => scenes.push({ a, b, fn });
const strobe = (t, f = 2.2) => (Math.sin(t * Math.PI * 2 * f) > 0.2 ? 1 : 0.08);

// glove on the handle, in front of the hatch
function gloveAt(turn, push = 0) {
  glove.visible = true;
  glove.position.set(0.24 - push * 0.02, -0.05, HZ + 0.33 - push * 0.05);
  glove.rotation.set(0.2, Math.PI * 0.95, -0.4 + turn);
}

// A. HOOK — an astronaut at the hatch, the handle turns, red alarm
scn(0, 3.65, (t, lt) => {
  const r = strobe(t, 1.6);
  hatchSet(0.3, r);
  const turn = -eio(lin(t, 0.7, 2.4)) * 0.9;
  hatch.userData.handle.rotation.z = turn; hatch.userData.lampM.emissive.setRGB(r * 1.6, 0.05, 0.02);
  astro.visible = true; astro.position.set(-0.42, -0.2, HZ + 0.75); astro.rotation.set(0.05, Math.PI - 0.5, 0.04);
  keyOn(V3(0.6, 0.6, HZ + 2.2), V3(0.0, 0, HZ), 2.0 + r * 5);
  key.color.setRGB(1, 0.3 + 0.65 * (1 - r), 0.25 + 0.65 * (1 - r));
  rim.intensity = 1.2; rim.color.setRGB(1, 0.25, 0.2); rim.position.set(0.5, 0.8, HZ - 1); rim.target.position.set(0, 0, HZ);
  const k = eio(lin(t, 0, 3.65));
  setCam(V3(mix(0.75, 0.45, k), mix(0.25, 0.12, k), HZ + mix(3.4, 2.6, k)), V3(0.05, -0.05, HZ), 40, 0.05);
  shake(t, 0.0015);
  FU().uFade.value = ss(t, 0, 0.2) * (1 - ss(t, 3.5, 3.65));
});
// B. ...and stepped outside — POV out of an open airlock
scn(3.65, 5.85, (t, lt) => {
  airlockSet(); airlock.userData.hatch.visible = false;
  airlock.userData.hatch.position.z = -airlock.userData.L - 50;
  const k = eio(lin(t, 3.65, 5.85));
  const pos = airlockPoint(mix(-0.6, -2.2, k)), tgt = airlockPoint(-4);
  setCam(pos, tgt, 46, k * 0.15);
  E.syncBg();
  FU().uFade.value = ss(t, 3.65, 3.8) * (1 - ss(t, 5.65, 5.85));
});
// C/D/E. YOU CAN'T — pressure holds the hatch shut
scn(5.85, 20.35, (t, lt) => {
  hatchSet(1);
  const k = eio(lin(t, 5.85, 20.35));
  let cp = V3(mix(0.45, 0.25, k), mix(0.2, 0.12, k), HZ + mix(3.0, 3.9, k));
  setCam(cp, V3(0.0, 0.0, HZ), 40, 0.02);
  FU().uFade.value = ss(t, 5.85, 6.1);
  S.hud.push({ type: 'pressure', a: ss(t, 8.6, 9.2) * (1 - ss(t, 20.0, 20.35)), t, c: project(V3(0, 0, HZ)), s: project(V3(0.62, 0.62, HZ)), k: eo(lin(t, 9.9, 11.0)) });
  S.hud.push({ type: 'lbs', a: ss(t, 15.6, 15.9) * (1 - ss(t, 20.0, 20.35)), v: Math.round(35000 * eo(lin(t, 15.7, 17.5))) });
});
// F. the airlock... the outer hatch fails
scn(20.35, 24.7, (t, lt) => {
  airlockSet();
  const fail = t > 23.5; const r = fail ? strobe(t, 2.5) : 0;
  airlock.userData.red.intensity = r * 3; airlock.userData.beaconM.color.setRGB(0.2 + r * 3, 0.02, 0.02);
  airlock.userData.hatch.position.z = -airlock.userData.L - 0.01 - (fail ? Math.sin(t * 60) * 0.004 : 0);
  const k = eio(lin(t, 20.35, 24.7));
  setCam(airlockPoint(mix(0.0, -0.6, k), 0.05, -0.1), airlockPoint(-2.6, 0, 0), 48, 0.03);
  glove.visible = true; const gp = airlockPoint(mix(-0.25, -0.75, k), 0.2, -0.32); glove.position.copy(gp); glove.quaternion.copy(E.cam.quaternion); glove.rotateX(-0.3); glove.rotateY(Math.PI);
  shake(t, fail ? 0.004 : 0.001);
  E.syncBg();
  FU().uFade.value = ss(t, 20.35, 20.6);
});
// G/H/I. WHOOSH — decompression, fog, silence
const BLOW = 24.72;
scn(24.7, 38.4, (t, lt) => {
  airlockSet();
  const k = t - BLOW;
  const H = airlock.userData.hatch; H.position.z = -airlock.userData.L - 0.01 - Math.max(0, k) * Math.max(0, k) * 6; H.rotation.set(k * 2, k * 3, 0);
  if (k > 1.5) H.visible = false;
  const r = strobe(t, 2.5) * (1 - ss(t, 33, 36));
  airlock.userData.red.intensity = r * 3; airlock.userData.beaconM.color.setRGB(0.2 + r * 3, 0.02, 0.02);
  airlock.userData.white.intensity = 1.2 * (1 - ss(t, 25, 26) * 0.7);
  stream.visible = true; stream.position.set(0, 0, 0); stream.rotation.copy(airlock.rotation);
  stream.userData.update(t, ss(t, 24.7, 25.0) * (1 - ss(t, 31, 34)), airlock.userData.L);
  fog.visible = true; fog.rotation.copy(airlock.rotation); fog.userData.update(t, ss(t, 29.3, 31.8), ss(t, 24.7, 25.2) * (1 - ss(t, 30, 33)) * 0.6);
  // debris pulled past the camera towards the hole
  debris.forEach((d, i) => {
    const t0 = BLOW + 0.15 + i * 0.32; const u = (t - t0) / 1.4;
    d.visible = u > 0 && u < 1.05;
    if (d.visible) { const zz = mix(0.4, -airlock.userData.L - 1.5, ei(clamp(u)) * 0.6 + clamp(u) * 0.4); d.position.copy(airlockPoint(zz, Math.sin(i * 2.1) * 0.35 * (1 - u), Math.cos(i * 1.7) * 0.3 * (1 - u))); d.rotation.set(t * (2 + i), t * (1.5 + i * 0.3), i); }
  });
  const slow = ss(t, 33, 36);
  setCam(airlockPoint(mix(-0.4, -0.7, lin(t, 24.7, 38.4)), 0.05, -0.08), airlockPoint(-2.6, 0, 0), 50, 0.04 + Math.sin(t * 0.3) * 0.02);
  shake(t, (k > 0 ? 0.03 * Math.exp(-k * 0.8) : 0) + 0.004 * (1 - slow));
  E.syncBg();
  if (k > 0 && k < 0.4) { FU().uFlash.value = Math.exp(-k * 10) * 0.9; FU().uFlashColor.value.set(0.9, 0.95, 1.0); }
  FU().uSat.value = 1 - slow * 0.7; FU().uFade.value = 1 - slow * 0.25;
  S.hud.push({ type: 'temp', a: ss(t, 29.3, 29.6) * (1 - ss(t, 32.9, 33.2)), v: Math.round(mix(70, -40, eo(lin(t, 29.4, 32.5)))) });
  S.hud.push({ type: 'wave', a: ss(t, 33.2, 33.6) * (1 - ss(t, 38.0, 38.4)), amp: 1 - ss(t, 34.4, 36.6), t });
});
// J. BREATHE OUT — lungs
scn(38.4, 44.9, (t, lt) => {
  E.bgPassEnabled(false);
  holoAstro.visible = true; holoAstro.rotation.y = 0.35 + Math.sin(t * 0.3) * 0.2;
  const breath = t < 42.1 ? 1 - 0.25 * ss(t, 40.8, 41.6) : 0.75 + 0.55 * ss(t, 42.2, 43.8);
  lungs.children.forEach(l => l.scale.set(0.8 * breath, 1.35 * breath, 0.7 * breath));
  holoRed.uniforms.uAmp.value = t > 43.2 ? 1 + 0.8 * Math.abs(Math.sin(t * 9)) : 0.9;
  const k = eio(lin(t, 38.4, 44.9));
  setCam(V3(0.0, 0.3, mix(2.9, 2.3, k)), V3(0, 0.25, 0), 34);
  FU().uFade.value = ss(t, 38.4, 38.7);
});
// K. WATER BOILS — a droplet in front of the open hatch
scn(44.9, 50.2, (t, lt) => {
  airlockSet(); airlock.userData.hatch.visible = false;
  const cpos = airlockPoint(-0.25, 0.02, -0.02), wpos = airlockPoint(-0.95, 0.04, 0.05);
  water.visible = bubbles.visible = true; water.position.copy(wpos); water.scale.setScalar(0.55);
  const boil = ss(t, 48.1, 49.4);
  water.userData.wobble(t, 0.6 + boil * 1.6);
  bubbles.position.copy(wpos);
  bubbles.children.forEach((b, i) => {
    const u = b.userData; const ph = ((t * (0.6 + u.t0) + u.t0) % 1);
    b.visible = boil > 0.05; const r = 0.03 + ph * 0.04 * boil; b.position.copy(u.d).multiplyScalar(r * (0.5 + u.t0 * 0.6));
    b.scale.setScalar(u.s * 0.6 * (0.3 + ph) * boil);
  });
  keyOn(airlockPoint(-0.2, 0.4, 0.3), wpos, 3);
  setCam(cpos.clone().lerp(wpos, 0.25 * eio(lin(t, 44.9, 50.2))), wpos, 40, 0.05);
  E.syncBg(); E.finalize(t); E.cubeCamBg.position.copy(E.state.stationAt); E.cubeCamBg.update(E.renderer, E.bg);
  FU().uFade.value = ss(t, 44.9, 45.15);
});
// L. 1966 — NASA vacuum chamber, black & white
scn(50.2, 58.95, (t, lt) => {
  E.bgPassEnabled(false);
  chamber.visible = astro.visible = true; chamber.position.set(0, 0, 0);
  astro.position.set(0, -0.05, 0); astro.rotation.set(0, 0.35, 0);
  const k = eio(lin(t, 50.2, 58.95));
  setCam(V3(mix(1.45, 1.05, k), mix(0.35, 0.55, k), mix(1.35, 0.95, k)), V3(0, 0.25, 0), 52);
  FU().uSat.value = 0.0; FU().uGain.value.set(1.08, 1.0, 0.86); FU().uGrain.value = 0.09; FU().uVig.value = 1.2;
  FU().uFade.value = ss(t, 50.2, 50.5) * (0.92 + 0.08 * Math.sin(t * 37));
  S.hud.push({ type: 'gauge', a: ss(t, 52.2, 52.6) * (1 - ss(t, 58.5, 58.9)), v: mix(14.7, 0.1, eo(lin(t, 52.4, 53.6))) });
});
// M. FIFTEEN SECONDS — POV, vision tunnels
scn(58.95, 63.85, (t, lt) => {
  airlockSet(); airlock.userData.hatch.visible = false;
  const k = lin(t, 58.95, 63.85);
  setCam(airlockPoint(-1.2, 0.05, -0.05), airlockPoint(-4, 0.1, 0.0), 50, Math.sin(t * 0.8) * 0.05 + k * 0.1);
  shake(t, 0.002 + k * 0.004);
  E.syncBg();
  FU().uVig.value = 1 + ss(t, 61.2, 63.6) * 2.5; FU().uFade.value = 1 - ss(t, 62.6, 63.8) * 0.85; FU().uSat.value = 1 - ss(t, 61.5, 63.5) * 0.6;
  E.bloom.strength = 0.6 + ss(t, 61.5, 63.5) * 0.8;
  S.hud.push({ type: 'count', a: ss(t, 61.1, 61.4) * (1 - ss(t, 63.5, 63.85)), v: Math.max(0, Math.ceil(15 * (1 - lin(t, 61.2, 63.5)))) });
});
// N. THERMOS — sunlit side vs shadow side
scn(63.85, 73.65, (t, lt) => {
  iss.visible = true;
  earthUnder(20, 40 + lt * 0.3, 0);
  E.state.SUN = V3(1, 0.15, -0.05).normalize(); E.sunLight.intensity = 3.6; E.earthLight.intensity = 0.06;
  const k = eio(lin(t, 63.85, 73.65));
  setCam(V3(mix(-1.0, 0.5, k), mix(1.6, 1.0, k), mix(10.5, 9.0, k)), V3(0, -0.8, 0), 36);
  E.syncBg(); E.earthU.uNight.value = 1.2;
  FU().uFade.value = ss(t, 63.85, 64.1);
  S.hud.push({ type: 'hot', a: ss(t, 68.3, 68.7) * (1 - ss(t, 73.3, 73.65)), p: project(V3(4.4, 1.0, 0)), v: Math.round(250 * eo(lin(t, 68.5, 70.0))) });
  S.hud.push({ type: 'cold', a: ss(t, 71.6, 72.0) * (1 - ss(t, 73.3, 73.65)), p: project(V3(-4.4, -1.2, 0)), v: Math.round(250 * eo(lin(t, 71.8, 72.9))) });
});
// O. RESCUE — re-pressurise within ~90 s
scn(73.65, 77.95, (t, lt) => {
  airlockSet();
  const c = eio(lin(t, 73.9, 75.3));
  airlock.userData.hatch.visible = true; airlock.userData.hatch.position.z = -airlock.userData.L - 0.01 - (1 - c) * 3.5;
  fog.visible = true; fog.rotation.copy(airlock.rotation); fog.userData.update(t, 0.4 * (1 - ss(t, 75.3, 77.5)), 0);
  airlock.userData.white.intensity = 1.2 * ss(t, 75.3, 76.2) + 0.3;
  setCam(airlockPoint(-0.3, 0.05, -0.08), airlockPoint(-2.6, 0, 0), 48, 0.02);
  E.syncBg();
  FU().uFade.value = ss(t, 73.65, 73.9);
  S.hud.push({ type: 'timer', a: ss(t, 73.9, 74.2) * (1 - ss(t, 77.6, 77.95)), k: eo(lin(t, 74.0, 75.9)) });
});
// P. TEA LEAVES — finding a real leak (2020)
scn(77.95, 86.35, (t, lt) => {
  inter.visible = leak.visible = true; E.bgPassEnabled(false); E.fg.fog = new THREE.FogExp2(0x090c10, 0.07);
  for (const l of inter.userData.lights) l.intensity = 1.0;
  const wallP = V3(-0.99, 0.1, -3.2);
  leak.position.copy(wallP);
  const { leaves, crack, glow } = leak.userData;
  crack.position.set(0.002, 0, 0); crack.rotation.set(0, Math.PI / 2, 0.3);
  glow.position.set(0.05, 0, 0); glow.intensity = 0.3 * ss(t, 82.4, 83.5);
  const pull = ss(t, 84.2, 86.3);
  leaves.forEach((l, i) => {
    const u = l.userData; const p = u.o.clone().add(V3(0.35, 0, 0));
    p.add(V3(Math.sin(t * u.sp + i) * 0.02, Math.cos(t * u.sp * 0.8 + i) * 0.02, Math.sin(t * u.sp * 0.6 + i * 2) * 0.02));
    l.position.copy(p.lerp(V3(0.01, 0, 0), pull * (0.55 + 0.45 * Math.sin(i))));
    l.quaternion.setFromAxisAngle(u.ax, t * u.sp * 2 + i);
    l.visible = t > 83.9;
  });
  keyOn(V3(0.2, 0.5, -2.6), wallP, t < 83.9 ? 4 : 1.2);
  const k = eio(lin(t, 77.95, 86.35));
  const camT = t < 83.9 ? V3(-0.3, 0.1, -4.0) : wallP.clone().add(V3(0.15, 0, 0));
  setCam(t < 83.9 ? V3(mix(0.6, 0.3, k), 0.2, mix(-0.4, -1.2, k)) : wallP.clone().add(V3(0.75, 0.05, 0.3)), camT, t < 83.9 ? 46 : 34);
  FU().uFade.value = ss(t, 77.95, 78.2);
});
// Q. KEEP IT CLOSED — handle locks, lights go green
scn(86.35, 91.3, (t, lt) => {
  hatchSet(1);
  const lock = eio(lin(t, 86.5, 88.2));
  hatch.userData.handle.rotation.z = -0.9 * (1 - lock); hatch.userData.lampM.emissive.setRGB(0, 1.5 * lock + 0.2, 0.4 * lock);
  const k = eio(lin(t, 86.35, 91.3));
  setCam(V3(mix(0.4, 0.25, k), mix(0.15, 0.08, k), HZ + mix(2.6, 3.6, k)), V3(0.05, 0, HZ), 38);
  FU().uFade.value = ss(t, 86.35, 86.6) * (1 - ss(t, 90.0, 91.2));
});

window.renderAt = async (t) => {
  reset(t);
  const s = scenes.find(s => t >= s.a && t < s.b) || scenes[scenes.length - 1];
  s.fn(t, t - s.a);
  if (S.mode === 'station' && E.bgCam) E.syncBg();
  E.finalize(t);
  E.render();
  { const b = new THREE.Box3().setFromObject(astro); window.__dbg = { vis: astro.visible, min: b.min.toArray().map(v=>+v.toFixed(2)), max: b.max.toArray().map(v=>+v.toFixed(2)), cam: E.cam.position.toArray().map(v=>+v.toFixed(2)), fov: E.cam.fov }; }
  drawOverlay(t, S);
  return true;
};
await document.fonts.ready;
window.ready = true;
