// Loads NASA models (ISS, astronaut) and prepares them for the reel.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LoopSubdivision } from './node_modules/three-subdivide/build/index.module.js';

const L = new GLTFLoader();
const D = new DRACOLoader(); D.setDecoderPath('node_modules/three/examples/jsm/libs/draco/gltf/'); L.setDRACOLoader(D);

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ISS: centred, scaled so 1 unit = 10 m (truss ~10.9 units), long truss along X, nadir towards -Y
export async function loadISS() {
  const g = await L.loadAsync('glb/issD.glb');
  const root = g.scene;
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  root.position.sub(c);
  const wrap = new THREE.Group(); wrap.add(root);
  // longest axis is the truss
  const ax = size.x >= size.z ? 'x' : 'z';
  if (ax === 'z') wrap.rotation.y = Math.PI / 2;
  const s = 10.9 / Math.max(size.x, size.z);
  wrap.scale.setScalar(s);
  root.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = true;
      const m = o.material;
      if (m && m.isMeshStandardMaterial) { m.envMapIntensity = 0.6; if (m.metalness > 0.9) m.metalness = 0.8; }
    }
  });
  const outer = new THREE.Group(); outer.add(wrap);
  outer.userData.size = size.clone().multiplyScalar(s);
  return outer;
}

// Astronaut: smooth the low-poly suit, relax the T-pose arms, add a reflective gold visor
export async function loadAstronaut(envMap) {
  const g = await L.loadAsync('glb/astronaut.glb');
  const root = g.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const H = size.y, top = box.max.y;
  const s = 1.85 / H; // 1.85 m tall
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  // gather helmet vertices (top 14%) to fit the visor sphere
  let hc = new THREE.Vector3(), hn = 0, zmax = -1e9;
  const shoulderX = size.x * 0.2;
  for (const o of meshes) {
    let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    geo.translate(-c.x, -c.y, -c.z);
    geo.deleteAttribute('normal');
    geo = mergeVertices(geo, 1e-3);
    geo = LoopSubdivision.modify(geo, 2, { split: false, uvSmooth: false, preserveEdges: false, flatOnly: false });
    const p = geo.attributes.position, v = new THREE.Vector3();
    const ys = size.y * 0.27; // shoulder height (relative to centre)
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      // relax arms: rotate down around the shoulder pivot, blended
      const ax = Math.abs(v.x);
      if (ax > shoulderX * 0.9 && v.y > ys - size.y * 0.12) {
        const sg = Math.sign(v.x);
        const k = sstep(shoulderX * 0.95, shoulderX * 1.45, ax);
        const ang = -sg * 0.95 * k;
        const px = sg * shoulderX, py = ys;
        const dx = v.x - px, dy = v.y - py;
        let nx = px + dx * Math.cos(ang) - dy * Math.sin(ang), ny = py + dx * Math.sin(ang) + dy * Math.cos(ang);
        // slight forward bend of the forearm
        const k2 = sstep(size.x * 0.32, size.x * 0.42, ax);
        const nz = v.z + k2 * size.z * 0.35;
        v.set(nx, ny, nz);
      }
      p.setXYZ(i, v.x, v.y, v.z);
      if (v.y > (top - c.y) - H * 0.13 && Math.abs(v.x) < size.x * 0.09) { if (v.z > 0) { hc.add(v); hn++; } zmax = Math.max(zmax, v.z); }
    }
    geo.computeVertexNormals();
    geo.scale(s, s, s);
    const mat = o.material.clone();
    mat.roughness = 0.85; mat.metalness = 0.0;
    if ('sheen' in mat) { }
    const mesh = new THREE.Mesh(geo, mat);
    o.userData.newMesh = mesh;
  }
  const A = new THREE.Group();
  for (const o of meshes) A.add(o.userData.newMesh);
  hc.divideScalar(Math.max(1, hn)).multiplyScalar(s);
  zmax *= s;
  // helmet sphere: visor sits on the front of it
  const R = Math.max(0.12, zmax - hc.z);
  const visorM = new THREE.MeshStandardMaterial({ color: 0xd9a24e, metalness: 1.0, roughness: 0.04, envMap, envMapIntensity: 1.3 });
  const open = Math.PI * 0.34;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 64, 48, Math.PI / 2 - open, 2 * open, Math.PI * 0.18, Math.PI * 0.6), visorM);
  visor.position.copy(hc); visor.position.z += 0.0;
  A.add(visor);
  A.userData = { visor, headCenter: hc.clone(), headR: R, visorM };
  return A;
}

// NASA EVA glove, smoothed; scaled to ~0.3 m long
export async function loadGlove() {
  const g = await L.loadAsync('glb/glove.glb');
  const root = g.scene; root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const s = 0.3 / Math.max(size.x, size.y, size.z);
  const out = new THREE.Group(); const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    let geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.translate(-c.x, -c.y, -c.z);
    geo.deleteAttribute('normal'); geo = mergeVertices(geo, 1e-3);
    geo = LoopSubdivision.modify(geo, 2, { split: false, uvSmooth: false, preserveEdges: false, flatOnly: false });
    geo.computeVertexNormals(); geo.scale(s, s, s);
    const mat = o.material.clone(); mat.roughness = 0.85; mat.metalness = 0;
    out.add(new THREE.Mesh(geo, mat));
  }
  out.userData.size = size.clone().multiplyScalar(s);
  return out;
}
