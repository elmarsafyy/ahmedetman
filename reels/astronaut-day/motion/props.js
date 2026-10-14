// Props for the interior shots and the X-ray style body graphics.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './models.js';

// cupola seen from inside: hexagonal frustum frame with 6 trapezoid windows and a round top window
export function buildCupola() {
  const g = new THREE.Group();
  const frameM = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.55, metalness: 0.5 });
  const trimM = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.4, metalness: 0.7 });
  const Rb = 1.5, Rt = 0.85, Hh = 0.75; // base radius (cabin side), top radius (window side), depth
  // round top window plate at y=-Hh
  const plate = new THREE.Shape(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2; const x = Math.cos(a) * Rt, z = Math.sin(a) * Rt; i ? plate.lineTo(x, z) : plate.moveTo(x, z); }
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.5, 0, Math.PI * 2, true); plate.holes.push(hole);
  const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(plate, { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), frameM);
  pm.rotation.x = Math.PI / 2; pm.position.y = -Hh; g.add(pm);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 12, 64), trimM); ring.rotation.x = Math.PI / 2; ring.position.y = -Hh - 0.02; g.add(ring);
  // 6 side faces, each a trapezoid frame with a trapezoid window
  for (let i = 0; i < 6; i++) {
    const a0 = i / 6 * Math.PI * 2, a1 = (i + 1) / 6 * Math.PI * 2;
    const P = (a, r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const A = P(a0, Rb, 0), B = P(a1, Rb, 0), C = P(a1, Rt, -Hh), Dd = P(a0, Rt, -Hh);
    // build face in local 2D: u along edge, v from base to top
    const u = B.clone().sub(A).normalize(); const mid0 = A.clone().add(B).multiplyScalar(0.5), mid1 = Dd.clone().add(C).multiplyScalar(0.5);
    const vdir = mid1.clone().sub(mid0); const vl = vdir.length(); vdir.normalize();
    const n = new THREE.Vector3().crossVectors(u, vdir).normalize();
    const wB = A.distanceTo(B) / 2, wT = Dd.distanceTo(C) / 2;
    const sh = new THREE.Shape([new THREE.Vector2(-wB, 0), new THREE.Vector2(wB, 0), new THREE.Vector2(wT, vl), new THREE.Vector2(-wT, vl)]);
    const m = 0.11, wb = wB - m * 1.6, wt = wT - m * 1.2;
    sh.holes.push(new THREE.Path([new THREE.Vector2(-wb, m), new THREE.Vector2(-wt, vl - m), new THREE.Vector2(wt, vl - m), new THREE.Vector2(wb, m)]));
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), frameM);
    const basis = new THREE.Matrix4().makeBasis(u, vdir, n); face.quaternion.setFromRotationMatrix(basis); face.position.copy(mid0); g.add(face);
  }
  // handrails and a laptop-ish box near the cabin edge
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 8, 24, Math.PI), trimM); r.position.set(Math.cos(a) * 1.25, -0.15, Math.sin(a) * 1.25); r.rotation.y = -a; g.add(r); }
  g.userData.windowY = -Hh;
  return g;
}

// wobbling water sphere (transmission)
export function buildWater() {
  const geo = new THREE.SphereGeometry(0.11, 96, 64);
  geo.userData.base = geo.attributes.position.array.slice();
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 1, thickness: 0.22, ior: 1.33, specularIntensity: 1, envMapIntensity: 1.2, attenuationColor: new THREE.Color(0.85, 0.95, 1.0), attenuationDistance: 1.5 });
  const w = new THREE.Mesh(geo, m);
  w.userData.wobble = (t, amp = 1) => {
    const p = geo.attributes.position, b = geo.userData.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1], z = b[i * 3 + 2];
      const k = 1 + amp * (0.07 * Math.sin(t * 3.1 + y * 28) * Math.cos(t * 2.3 + x * 22) + 0.05 * Math.sin(t * 4.7 + z * 30 + x * 9));
      p.setXYZ(i, x * k, y * k * (1 + 0.04 * amp * Math.sin(t * 2.2)), z * k);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  return w;
}

export function buildToothbrush() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.15, 6, 16), new THREE.MeshPhysicalMaterial({ color: 0x2f6fd6, roughness: 0.25, clearcoat: 1, transmission: 0.35, thickness: 0.01 }));
  handle.scale.set(1.3, 1, 0.8); g.add(handle);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.03, 0.01, 2, 0.003), handle.material); head.position.y = 0.088; g.add(head);
  const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.026, 0.012), new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.9 })); bristles.position.set(0, 0.088, 0.011); g.add(bristles);
  const paste = new THREE.Mesh(new THREE.SphereGeometry(0.009, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, roughness: 0.35, clearcoat: 0.6 }));
  paste.scale.set(1.4, 1, 1); paste.position.set(0, 0.09, 0.022); g.add(paste);
  g.userData.paste = paste;
  return g;
}

export function buildTortilla(T) {
  const geo = new THREE.CircleGeometry(0.1, 64, 0, Math.PI * 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const r = Math.hypot(x, y); p.setZ(i, 0.008 * Math.sin(x * 40 + 1) * Math.sin(y * 31) * (r / 0.1) + 0.01 * (r / 0.1) ** 2); }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: T.tortilla, roughness: 0.85, side: THREE.DoubleSide }));
}
export function buildBottle(color, label) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 32), new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.8 })); g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.02, 24), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 })); cap.position.y = 0.04; g.add(cap);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0142, 0.0142, 0.025, 32, 1, true), new THREE.MeshStandardMaterial({ color: label, roughness: 0.7 })); g.add(lab);
  return g;
}

// plant growth chamber with magenta LEDs (like NASA's Veggie)
export function buildVeggie(T) {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.6, metalness: 0.4 });
  const W = 0.6, D = 0.45, Hc = 0.5;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, Hc, 0.02), frame); p.position.set(x * W / 2, Hc / 2, z * D / 2); g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), frame); top.position.y = Hc; g.add(top);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, D * 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.35, 1.4) })); led.rotation.x = Math.PI / 2; led.position.y = Hc - 0.025; g.add(led);
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, D), frame); g.add(base);
  const leafM = new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 });
  const r = rng(5);
  for (let k = 0; k < 6; k++) {
    const px = (k % 3 - 1) * 0.17, pz = (Math.floor(k / 3) - 0.5) * 0.2;
    const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.05, 0.1, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xc9b98f, roughness: 0.9 })); pillow.position.set(px, 0.05, pz); g.add(pillow);
    for (let l = 0; l < 7; l++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.12, 1, 4), leafM);
      const pp = leaf.geometry.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.02 * (pp.getY(i) / 0.06) ** 2);
      leaf.geometry.computeVertexNormals();
      leaf.position.set(px, 0.13, pz); leaf.rotation.set(-0.5 - r() * 0.6, l / 7 * Math.PI * 2 + r(), 0); leaf.translateY(0.03); g.add(leaf);
    }
  }
  const light = new THREE.PointLight(0xff6ad8, 1.1, 2.0, 1.5); light.position.y = Hc - 0.08; g.add(light);
  return g;
}

// X-ray / hologram material
export function holoMat(color = new THREE.Color(0.35, 0.85, 1.0)) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uTime: { value: 0 }, uAmp: { value: 1 }, uDensity: { value: 1 }, uScan: { value: -10 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vP=position; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime,uAmp,uDensity,uScan; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(floor(p),vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ float f=pow(1.0-abs(dot(normalize(vN),vV)),2.2);
        float lines=0.5+0.5*smoothstep(0.85,1.0,abs(sin(vP.y*180.0)));
        float pores=step(1.0-uDensity*0.75, h(vP*90.0));
        float scan=exp(-pow((vP.y-uScan)*20.0,2.0));
        vec3 c=uColor*(f*1.4+0.08+pores*0.12*(1.0-f))*lines + vec3(1.0)*scan*0.8;
        gl_FragColor=vec4(c*uAmp,1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}
export function buildBone(mat) {
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const y = (u - 0.5) * 1.2; const r = 0.07 + 0.06 * Math.pow(Math.abs(u - 0.5) * 2, 6) + 0.012 * Math.sin(u * 9); pts.push(new THREE.Vector2(r, y)); }
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat); g.add(shaft);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), mat); head.position.set(-0.07, 0.68, 0); g.add(head);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 24), mat); c.position.set(s * 0.06, -0.66, 0.01); g.add(c); }
  return g;
}
export function buildSpine(mat) {
  const g = new THREE.Group(); const verts = [];
  for (let i = 0; i < 9; i++) {
    const v = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.1, 40, 3), mat); v.add(body);
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.16), mat); sp.position.set(0, 0, -0.17); sp.rotation.x = 0.4; v.add(sp);
    for (const s of [-1, 1]) { const tp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), mat); tp.position.set(s * 0.15, 0, -0.1); v.add(tp); }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 40), holoMat(new THREE.Color(1.0, 0.55, 0.25))); disc.position.y = -0.075; v.add(disc);
    v.userData.disc = disc; g.add(v); verts.push(v);
  }
  g.userData.verts = verts;
  g.userData.layout = (gap) => verts.forEach((v, i) => { v.position.y = (i - 4) * (0.15 + gap); v.userData.disc.scale.y = 1 + gap / 0.035; v.userData.disc.position.y = -0.075 - gap / 2; });
  g.userData.layout(0);
  return g;
}
