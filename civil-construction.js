/* ================================================
   MAKEN BROTHERS — civil-construction.js
   Brick-wall loader (GSAP) + scroll-scrubbed road build (Three.js)
   ================================================ */

import * as THREE from 'three';

// Tells the inline failsafe in the HTML that the module did load.
window.__mbBooted = true;

const gsap = window.gsap;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = document.getElementById('cc-loader');
const shell = document.getElementById('cc-shell');

document.getElementById('cc-year').textContent = new Date().getFullYear();

/* ---------- Safety net: never leave the page behind the wall ---------- */
let revealed = false;
function revealPage() {
  if (revealed) return;
  revealed = true;
  shell.classList.add('is-revealed');
  loader.classList.add('is-gone');
}
setTimeout(revealPage, 6000);

/* ================================================
   1. BRICK WALL LOADER
   ================================================ */
function buildWall() {
  const wall = document.getElementById('cc-wall');
  const w = window.innerWidth + 4;
  const h = window.innerHeight + 4;

  const brickH = Math.max(34, Math.round(h / 14));
  const brickW = Math.round(brickH * 2.6);
  const gap = 3;
  const rows = Math.ceil(h / (brickH + gap)) + 1;
  const cols = Math.ceil(w / (brickW + gap)) + 2;

  const frag = document.createDocumentFragment();
  const bricks = [];

  for (let r = 0; r < rows; r++) {
    // running bond — every other course offset by half a brick
    const offset = (r % 2) ? -(brickW + gap) / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const b = document.createElement('div');
      b.className = 'cc-brick';
      const roll = Math.random();
      if (roll > 0.93) b.classList.add('is-accent');
      else if (roll > 0.72) b.classList.add('is-light');
      b.style.width = brickW + 'px';
      b.style.height = brickH + 'px';
      b.style.left = (c * (brickW + gap) + offset) + 'px';
      b.style.top = (r * (brickH + gap)) + 'px';
      frag.appendChild(b);
      bricks.push(b);
    }
  }
  wall.appendChild(frag);
  return bricks;
}

function shatterWall(bricks) {
  if (reduce || !gsap) {
    revealPage();
    return;
  }

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const tl = gsap.timeline({ onComplete: () => loader.classList.add('is-gone') });

  tl.to('.cc-loader-caption', {
    opacity: 0,
    scale: 0.92,
    duration: 0.35,
    ease: 'power2.in'
  });

  // Each brick is thrown outward from the centre of the blast
  tl.to(bricks, {
    duration: 1.05,
    ease: 'power3.in',
    opacity: 0,
    x: (i, el) => {
      const r = el.getBoundingClientRect();
      return ((r.left + r.width / 2) - cx) * (0.9 + Math.random() * 1.5);
    },
    y: (i, el) => {
      const r = el.getBoundingClientRect();
      return ((r.top + r.height / 2) - cy) * (0.9 + Math.random() * 1.5) + 140;
    },
    rotation: () => (Math.random() - 0.5) * 220,
    scale: () => 0.55 + Math.random() * 0.5,
    stagger: { each: 0.0022, from: 'center', grid: 'auto' }
  }, '-=0.1');

  tl.add(() => revealPage(), '-=0.72');
}

/* ================================================
   2. THREE.JS — THE ROAD BUILD
   Everything in the scene is a pure function of `state` (one 0→1 value per
   stage, plus camera and dusk), so scrubbing backwards un-builds the road.
   ================================================ */
const LENGTH = 90;
const ORANGE = 0xe8731c;
const V3 = THREE.Vector3;
const clamp01 = v => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Machine for each stage drives from behind the camera to past the far end.
const DRIVE_FROM = 12, DRIVE_TO = -LENGTH - 16;
// Linger near the camera, then speed off down the road.
const travel = lp => lerp(DRIVE_FROM, DRIVE_TO, 0.45 * lp + 0.55 * lp ** 2.4);
// Top of the surface each machine drives on: ground, formation, sub-base, base, asphalt.
const DECK = [0, 0.12, 0.6, 0.92, 1.17];

/* ---------- procedural textures, so the page downloads no images ---------- */
function canvasTex(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Seamless scatter of stones: each is drawn at its wrapped neighbours too.
function stones(base, n, rMin, rMax, shades, extra) {
  return (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = rMin + Math.random() * (rMax - rMin);
      const sq = 0.55 + Math.random() * 0.4, rot = Math.random() * Math.PI;
      const shade = shades[(Math.random() * shades.length) | 0];
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        if (x + dx < -rMax || x + dx > s + rMax || y + dy < -rMax || y + dy > s + rMax) continue;
        g.fillStyle = 'rgba(0,0,0,.28)';
        g.beginPath(); g.ellipse(x + dx + r * 0.3, y + dy + r * 0.35, r, r * sq, rot, 0, 7); g.fill();
        g.fillStyle = shade;
        g.beginPath(); g.ellipse(x + dx, y + dy, r, r * sq, rot, 0, 7); g.fill();
      }
    }
    if (extra) extra(g, s);
  };
}

// Roller passes: soft bands running along the road (texture v = world z).
const rollerBands = alpha => (g, s) => {
  for (let x = 0; x < s; x += s / 2) {
    g.fillStyle = `rgba(255,255,255,${alpha})`;
    g.fillRect(x, 0, s / 4, s);
  }
};

const dryGrass = (g, s) => {
  g.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    g.strokeStyle = ['#7d7a4a', '#948b5a', '#6b6a3e'][i % 3];
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 6, y - 3 - Math.random() * 5);
    }
    g.stroke();
  }
};

/* Standard material whose map is sampled in world space (triplanar-lite),
   so layers can be scaled along the road without the texture stretching.
   `heat` adds the glow of freshly laid asphalt just behind `heatFront`. */
function worldMat(map, uvScale, rough = 0.95) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0 });
  const u = { uvScale: { value: uvScale }, heatFront: { value: 0 }, heat: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = 'varying vec3 vWP;\nvarying vec3 vWN;\n' + s.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWN = normalize(mat3(modelMatrix) * objectNormal);`);
    s.fragmentShader = 'varying vec3 vWP;\nvarying vec3 vWN;\nuniform float uvScale, heatFront, heat;\n' + s.fragmentShader
      .replace('#include <map_fragment>', `
      vec3 an = abs(vWN);
      vec2 wuv = an.y > .5 ? vWP.xz : (an.x > .5 ? vWP.zy : vWP.xy);
      diffuseColor *= texture2D(map, wuv * uvScale);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(1., .3, .05) * heat
        * exp(-max(vWP.z - heatFront, 0.) / 2.5) * step(heatFront, vWP.z) * step(.5, vWN.y);`);
  };
  return m;
}

/* Geometry whose origin sits at the near end, so scaling Z
   makes the layer grow away from the camera. */
function slab(width, height, length) {
  const g = new THREE.BoxGeometry(width, height, length);
  g.translate(0, 0, -length / 2);
  return g;
}

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function axleGeo(r, w) {
  const g = new THREE.CylinderGeometry(r, r, w, 24);
  g.rotateZ(Math.PI / 2);
  return g;
}
function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function initScene(state) {
  const canvas = document.getElementById('cc-canvas');
  const wrap = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);

  /* ---------- sky, haze, Margalla-ish ridgeline ---------- */
  const DAY = { top: 0x9fb3c4, horizon: 0xe6ddcf, far: 0xb7bab2, near: 0x9aa294 };
  const DUSK = { top: 0x1b2236, horizon: 0xe0905a, far: 0x5c4a57, near: 0x37303e };
  const col = hex => new THREE.Color(hex);
  const mixCol = (a, b, t, out) => out.lerpColors(col(a), col(b), t);

  scene.fog = new THREE.Fog(DAY.horizon, 55, 190);

  const skyU = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 top, bottom; varying float h;
      void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-.02, .4, h)), 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  })));

  function ridge(z, base, amp, phase, color) {
    const sh = new THREE.Shape();
    sh.moveTo(-420, -10);
    for (let x = -420; x <= 420; x += 6) {
      sh.lineTo(x, base + amp * (Math.sin(x * 0.012 + phase) * 0.6 + Math.sin(x * 0.033 + phase * 2) * 0.28 + Math.sin(x * 0.081 + phase * 3) * 0.12));
    }
    sh.lineTo(420, -10);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.z = z;
    scene.add(m);
    return m.material;
  }
  const ridgeFar = ridge(-250, 22, 16, 0.4, DAY.far);
  const ridgeNear = ridge(-205, 10, 9, 2.1, DAY.near);

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x8b7b66, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6c8, 2.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN_DAY = new V3(-14, 18, -12), SUN_DUSK = new V3(-26, 5, -30);

  /* ---------- materials ---------- */
  const T = {
    earth: canvasTex(256, stones('#9c8a72', 700, 0.6, 2.2, ['#8a7660', '#a9957c', '#7e6b57', '#b4a087'], dryGrass)),
    formation: canvasTex(256, stones('#85735f', 1600, 0.5, 1.6, ['#7a6955', '#90806b', '#6f5f4d'], rollerBands(0.05))),
    subBase: canvasTex(256, stones('#9a948a', 1100, 1.6, 4.2, ['#b6aea3', '#8e877d', '#a69e93', '#c6bfb4', '#7b756c'])),
    base: canvasTex(256, stones('#7d786f', 2600, 0.8, 2.2, ['#8f8a82', '#6c675f', '#9c968d', '#5e5a53'], rollerBands(0.035))),
    asphalt: canvasTex(256, stones('#2c2a28', 3800, 0.4, 1.2, ['#3d3a36', '#242220', '#4b4642', '#1c1b1a'], rollerBands(0.03))),
    concrete: canvasTex(128, stones('#cfc9bf', 900, 0.3, 0.9, ['#c2bcb2', '#dbd6cd', '#b9b3a9'])),
    puff: canvasTex(64, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,.5)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
    })
  };
  T.puff.wrapS = T.puff.wrapT = THREE.ClampToEdgeWrapping;

  const L = {
    earth: worldMat(T.earth, 0.22),
    formation: worldMat(T.formation, 0.25),
    subBase: worldMat(T.subBase, 0.3),
    base: worldMat(T.base, 0.33),
    asphalt: worldMat(T.asphalt, 0.45, 0.78),
    concrete: worldMat(T.concrete, 0.5, 0.85)
  };
  const std = (color, roughness = 0.6, metalness = 0, extra) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const K = {
    body: std(ORANGE, 0.5, 0.1),
    dark: std(0x2a2826, 0.7),
    tyre: std(0x161514, 0.92),
    hub: std(0x55524d, 0.5, 0.5),
    steel: std(0x9a968f, 0.38, 0.75),
    glass: std(0x23313b, 0.12, 0.6),
    white: std(0xf2efe9, 0.55),
    canopy: std(0xe9e4da, 0.8),
    beacon: std(ORANGE, 0.4, 0, { emissive: 0xff7a1a, emissiveIntensity: 0 }),
    amber: std(0x332211, 0.4, 0, { emissive: 0xffa42a, emissiveIntensity: 1.6 }),
    head: std(0xfff6e6, 0.3, 0, { emissive: 0xfff1d6, emissiveIntensity: 0 }),
    tail: std(0x5a0a0a, 0.3, 0, { emissive: 0xff2a1a, emissiveIntensity: 0 }),
    lamp: std(0x2b2a28, 0.5, 0, { emissive: 0xffc98a, emissiveIntensity: 0 }),
    window: std(0x30393f, 0.2, 0.3, { emissive: 0xffc27a, emissiveIntensity: 0 }),
    cone: std(ORANGE, 0.75),
    leaf: std(0x66724a, 0.95, 0, { flatShading: true }),
    leaf2: std(0x7a7f50, 0.95, 0, { flatShading: true }),
    trunk: std(0x5b4636, 0.95)
  };
  const glow = color => new THREE.MeshBasicMaterial({
    map: T.puff, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
  });

  /* ---------- ground & surroundings ---------- */
  const groundGeo = new THREE.PlaneGeometry(420, 420);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, L.earth);
  ground.position.z = -100;
  ground.receiveShadow = true;
  scene.add(ground);

  // Aggregate stockpiles and the site cabin
  [[-10, -9, 2.8, L.subBase], [-11.5, -34, 3.2, L.base], [11, -24, 2.6, L.subBase]].forEach(([x, z, r, m]) => {
    const pile = add(scene, new THREE.ConeGeometry(r, r * 0.62, 18, 1), m, x, r * 0.31, z);
    pile.rotation.y = Math.random() * 3;
  });
  const cabin = new THREE.Group();
  add(cabin, B(5.2, 2.6, 2.4), K.white, 0, 1.4, 0);
  add(cabin, B(5.24, 0.28, 2.44), K.body, 0, 2.2, 0);
  add(cabin, B(5.3, 0.14, 2.6), K.dark, 0, 2.77, 0);
  [-1.4, 1.4].forEach(x => add(cabin, B(1.1, 0.7, 0.05), K.window, x, 1.55, 1.21));
  cabin.position.set(10.5, 0, -15);
  cabin.rotation.y = -0.35;
  scene.add(cabin);

  // Low-poly trees, scattered clear of the corridor and the props
  const TREES = 64;
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6), K.trunk, TREES);
  const leafMeshes = [K.leaf, K.leaf2].map(m => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.25, 0), m, TREES));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < TREES; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (15 + Math.random() * 40);
    const z = 12 - Math.random() * 150;
    const s = 0.8 + Math.random() * 1.1;
    dummy.position.set(x, 0.7 * s, z); dummy.scale.setScalar(s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 2.1 * s; dummy.scale.set(s, s * 1.3, s); dummy.rotation.y = Math.random() * 3; dummy.updateMatrix();
    leafMeshes[i % 2].setMatrixAt(i, dummy.matrix);
    dummy.scale.setScalar(0); dummy.updateMatrix();
    leafMeshes[(i + 1) % 2].setMatrixAt(i, dummy.matrix);
  }
  [trunkMesh, ...leafMeshes].forEach(m => { m.castShadow = true; scene.add(m); });

  /* ---------- the engineered layers ---------- */
  const layer = (w, h, y, m) => {
    const mesh = add(scene, slab(w, h, LENGTH), m, 0, y, 0);
    mesh.castShadow = false;
    return mesh;
  };
  const formation = layer(11.6, 0.12, 0.06, L.formation);
  const subBase = layer(10.2, 0.45, 0.345, L.subBase);
  const base = layer(9.5, 0.35, 0.745, L.base);
  const asphalt = layer(8.8, 0.25, 1.045, L.asphalt);
  const kerbs = [-4.62, 4.62].map(x => layer(0.44, 0.75, 0.945, L.concrete));
  kerbs[0].position.x = -4.62; kerbs[1].position.x = 4.62;
  const edges = [-3.85, 3.85].map(x => {
    const e = layer(0.14, 0.02, 1.18, K.white);
    e.position.x = x;
    return e;
  });
  const DASH_LEN = 2.6, DASH_GAP = 2.6;
  const dashes = [];
  for (let z = -3; z > -LENGTH; z -= DASH_LEN + DASH_GAP) {
    dashes.push(add(scene, slab(0.2, 0.02, DASH_LEN), K.white, 0, 1.18, z));
  }
  const layers = [formation, subBase, base, asphalt];

  /* ---------- site furniture ---------- */
  const cones = [];
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    add(c, new THREE.ConeGeometry(0.26, 0.72, 16), K.cone, 0, 0.4, 0);
    add(c, new THREE.CylinderGeometry(0.15, 0.19, 0.12, 16), K.white, 0, 0.42, 0);
    add(c, B(0.62, 0.05, 0.62), K.dark, 0, 0.025, 0);
    c.position.set(i % 2 ? 5.6 : -5.6, 0, -2 - i * 6.2);
    scene.add(c);
    cones.push(c);
  }

  const lights = [];
  for (let i = 0; i < 8; i++) {
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      add(g, new THREE.CylinderGeometry(0.07, 0.1, 5.2, 10), K.dark, 0, 2.6, 0);
      add(g, B(1.7, 0.08, 0.08), K.dark, -side * 0.8, 5.15, 0);
      add(g, B(0.7, 0.12, 0.32), K.lamp, -side * 1.55, 5.1, 0);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), glow(0xffb870));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-side * 2, 1.2, 0);
      g.add(pool);
      g.position.set(side * 6.6, 0, -6 - i * 11 - (side > 0 ? 5.5 : 0));
      g.userData.pool = pool;
      scene.add(g);
      lights.push(g);
    }
  }

  /* ---------- machines ---------- */
  function machine() {
    const g = new THREE.Group();
    g.userData.wheels = [];
    g.userData.acc = 0;
    g.visible = false;
    scene.add(g);
    return g;
  }
  function wheel(g, r, w, x, y, z, mat = K.tyre) {
    const m = add(g, axleGeo(r, w), mat, x, y, z);
    add(m, B(w + 0.04, r * 1.15, 0.14), K.hub);
    add(m, B(w + 0.04, 0.14, r * 1.15), K.hub);
    g.userData.wheels.push({ m, r });
    return m;
  }
  const stack = (g, x, y, z, h = 0.9) => {
    add(g, new THREE.CylinderGeometry(0.07, 0.07, h, 10), K.dark, x, y - h / 2, z);
    g.userData.exhaust = new V3(x, y + 0.05, z);
  };
  const beacon = (g, x, y, z) => add(g, B(0.2, 0.2, 0.2), K.beacon, x, y, z);

  // 01 — motor grader
  const grader = machine();
  add(grader, B(2.2, 1.2, 2.2), K.body, 0, 1.35, 1.6);
  add(grader, B(2.26, 0.16, 2.0), K.dark, 0, 2.03, 1.6);
  add(grader, B(1.9, 1.5, 1.7), K.glass, 0, 2.55, 0.25);
  add(grader, B(2.05, 0.14, 1.9), K.body, 0, 3.35, 0.25);
  add(grader, B(0.5, 0.5, 4.6), K.body, 0, 1.55, -2.4);
  add(grader, B(1.2, 0.6, 0.7), K.body, 0, 1.4, -4.6);
  add(grader, new THREE.CylinderGeometry(0.75, 0.75, 0.12, 24), K.dark, 0, 0.95, -1.5);
  add(grader, B(3.7, 0.65, 0.14), K.steel, 0, 0.42, -1.4).rotation.y = 0.42;
  [-1.05, 1.05].forEach(x => wheel(grader, 0.62, 0.45, x, 0.62, -4.6));
  [1.0, 2.35].forEach(z => [-1.12, 1.12].forEach(x => wheel(grader, 0.62, 0.45, x, 0.62, z)));
  stack(grader, 0.7, 2.9, 2.3);
  beacon(grader, 0, 3.52, 0.25);
  Object.assign(grader.userData, { rear: 2.8, emit: new V3(0, 0.4, -1.2) });

  // 02 — tipper spreading aggregate off the tailgate
  const tipper = machine();
  add(tipper, B(2.4, 1.7, 1.7), K.body, 0, 1.95, -3.4);
  add(tipper, B(2.2, 0.75, 0.06), K.glass, 0, 2.3, -4.26);
  add(tipper, B(2.44, 0.6, 1.0), K.glass, 0, 2.35, -3.25);
  add(tipper, B(2.5, 0.3, 0.2), K.dark, 0, 0.85, -4.3);
  add(tipper, B(1.3, 0.4, 6.4), K.dark, 0, 0.95, -0.6);
  const bed = new THREE.Group();
  bed.position.set(0, 1.45, 2.55);
  bed.rotation.x = 0.36;
  tipper.add(bed);
  add(bed, B(2.5, 0.15, 4.8), K.body, 0, 0, -2.4);
  [-1.2, 1.2].forEach(x => add(bed, B(0.12, 1.1, 4.8), K.body, x, 0.55, -2.4));
  add(bed, B(2.5, 1.4, 0.12), K.body, 0, 0.7, -4.8);
  add(bed, B(2.25, 0.7, 3.4), L.subBase, 0, 0.45, -2.9);
  [-1.1, 1.1].forEach(x => {
    wheel(tipper, 0.58, 0.5, x, 0.58, -3.3);
    wheel(tipper, 0.58, 0.5, x, 0.58, 1.0);
    wheel(tipper, 0.58, 0.5, x, 0.58, 2.25);
  });
  stack(tipper, 1.0, 3.3, -2.45, 1.4);
  beacon(tipper, 0, 2.9, -3.4);
  Object.assign(tipper.userData, { rear: 2.8, emit: new V3(0, 1.1, 2.85) });

  // 03 — single-drum vibratory roller
  const roller = machine();
  const drum = wheel(roller, 0.85, 2.1, 0, 0.85, -1.7, K.steel);
  [-1.15, 1.15].forEach(x => add(roller, B(0.18, 1.2, 2.1), K.body, x, 1.0, -1.7));
  add(roller, B(2.5, 0.3, 2.1), K.body, 0, 1.75, -1.7);
  add(roller, B(2.0, 1.25, 2.6), K.body, 0, 1.45, 1.05);
  add(roller, B(2.02, 0.08, 1.6), K.dark, 0, 2.1, 1.3);
  [-1.0, 1.0].forEach(x => wheel(roller, 0.78, 0.6, x, 0.78, 1.4));
  [-0.85, 0.85].forEach(x => [-0.15, 0.85].forEach(z => add(roller, B(0.1, 1.4, 0.1), K.dark, x, 2.8, z)));
  add(roller, B(1.95, 0.12, 1.3), K.body, 0, 3.55, 0.35);
  add(roller, B(0.6, 0.5, 0.6), K.dark, 0, 2.35, 0.35);
  stack(roller, 0.7, 2.75, 2.0);
  beacon(roller, 0, 3.7, 0.35);
  Object.assign(roller.userData, { rear: 2.4, emit: new V3(0, 0.2, -1.7) });

  // 04 — asphalt paver, with a tandem roller finishing behind it
  const paver = machine();
  [-1.05, 1.05].forEach(x => add(paver, B(0.6, 0.65, 3.2), K.dark, x, 0.33, -0.3));
  add(paver, B(2.6, 1.1, 2.8), K.body, 0, 1.15, -0.3);
  add(paver, B(2.7, 0.12, 1.8), K.dark, 0, 0.8, -2.6);
  [[-1.35, 0.35], [1.35, -0.35]].forEach(([x, rz]) => { add(paver, B(0.12, 0.9, 1.8), K.body, x, 1.2, -2.6).rotation.z = rz; });
  add(paver, B(2.4, 0.35, 1.5), L.asphalt, 0, 1.0, -2.6);
  add(paver, B(2.8, 0.1, 1.4), K.dark, 0, 1.75, 1.0);
  [-0.7, 0.7].forEach(x => add(paver, B(0.5, 0.5, 0.5), K.dark, x, 2.05, 1.0));
  [-1.3, 1.3].forEach(x => [0.4, 1.6].forEach(z => add(paver, B(0.08, 1.5, 0.08), K.dark, x, 2.5, z)));
  add(paver, B(3.0, 0.08, 2.0), K.canopy, 0, 3.28, 1.0);
  add(paver, B(8.6, 0.4, 0.8), K.dark, 0, 0.32, 2.0);
  add(paver, B(8.6, 0.06, 0.5), K.steel, 0, 0.6, 2.55);
  [-4.32, 4.32].forEach(x => add(paver, B(0.1, 0.7, 1.1), K.body, x, 0.4, 2.0));
  const auger = add(paver, axleGeo(0.2, 8.2), K.steel, 0, 0.3, 1.25);
  add(auger, B(8.2, 0.42, 0.06), K.steel);
  stack(paver, 0.9, 2.8, -1.2, 1.2);
  beacon(paver, 0, 3.42, 1.0);
  Object.assign(paver.userData, { rear: 2.45 });

  const tandem = machine();
  [-1.25, 1.25].forEach(z => {
    wheel(tandem, 0.62, 1.9, 0, 0.62, z, K.steel);
    add(tandem, B(2.1, 0.2, 1.4), K.body, 0, 1.35, z);
  });
  add(tandem, B(1.9, 0.9, 1.2), K.body, 0, 1.25, 0);
  [-0.85, 0.85].forEach(x => [-0.45, 0.45].forEach(z => add(tandem, B(0.08, 1.3, 0.08), K.dark, x, 2.25, z)));
  add(tandem, B(1.9, 0.1, 1.2), K.body, 0, 2.92, 0);
  add(tandem, B(0.5, 0.45, 0.5), K.dark, 0, 1.9, 0);
  stack(tandem, -0.6, 2.4, 0.5, 0.7);
  beacon(tandem, 0, 3.05, 0);

  // 05 — line-marking truck
  const marker = machine();
  add(marker, B(2.1, 1.5, 1.7), K.white, 0, 1.6, -2.3);
  add(marker, B(2.12, 0.2, 1.72), K.body, 0, 1.2, -2.3);
  add(marker, B(1.95, 0.65, 0.06), K.glass, 0, 1.95, -3.16);
  add(marker, B(1.2, 0.35, 5), K.dark, 0, 0.75, -0.2);
  add(marker, B(2.1, 0.2, 3.1), K.dark, 0, 1.0, 0.75);
  const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.8, 20);
  tankGeo.rotateX(Math.PI / 2);
  add(marker, tankGeo, K.white, 0, 1.65, 0.4);
  add(marker, B(0.1, 1.2, 0.1), K.dark, 0, 1.6, 2.2);
  add(marker, B(1.8, 1.1, 0.1), K.dark, 0, 2.6, 2.2);
  add(marker, B(1.1, 0.16, 0.12), K.amber, 0, 2.6, 2.26);
  add(marker, B(0.3, 0.3, 0.12), K.amber, 0.5, 2.6, 2.26).rotation.z = Math.PI / 4;
  [-1.0, 1.0].forEach(x => [-2.3, 1.5].forEach(z => wheel(marker, 0.45, 0.4, x, 0.45, z)));
  [-0.8, 0.8].forEach(x => beacon(marker, x, 2.45, -2.3));
  stack(marker, -0.8, 0.5, 2.3, 0.1);
  Object.assign(marker.userData, { rear: 2.4, emit: new V3(0, 0.15, 2.4) });

  const MACHINES = [grader, tipper, roller, paver, marker];

  // Traffic for the finale
  function car(color, dir) {
    const g = new THREE.Group();
    g.userData.wheels = [];
    const paint = std(color, 0.35, 0.3);
    add(g, B(1.8, 0.55, 4.2), paint, 0, 0.6, 0);
    add(g, B(1.6, 0.5, 2.1), K.glass, 0, 1.1, 0.2);
    [-0.6, 0.6].forEach(x => {
      add(g, B(0.38, 0.14, 0.06), K.head, x, 0.66, -2.12);
      add(g, B(0.38, 0.14, 0.06), K.tail, x, 0.72, 2.12);
    });
    [-0.9, 0.9].forEach(x => [-1.35, 1.35].forEach(z => wheel(g, 0.33, 0.25, x, 0.33, z)));
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9), glow(0xfff0d0));
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.03, -6.6);
    g.add(beam);
    Object.assign(g.userData, { beam, dir });
    g.rotation.y = dir > 0 ? Math.PI : 0;
    g.visible = false;
    scene.add(g);
    return g;
  }
  const cars = [car(0xe9e6df, -1), car(0x7a1f1a, 1), car(0x2d3e52, -1)];
  const CAR_LANE = [-2.1, 2.1, -2.1], CAR_PHASE = [0, 0.45, 0.6];

  /* ---------- particles: dust, steam, exhaust, spray ---------- */
  const parts = [];
  for (let i = 0; i < 260; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.puff, transparent: true, depthWrite: false }));
    sp.visible = false;
    sp.userData = { life: 0, max: 1, v: new V3(), g: 0, s0: 1, s1: 1, a: 1 };
    scene.add(sp);
    parts.push(sp);
  }
  let pi = 0;
  const rnd = () => Math.random() - 0.5;
  function emit(p, color, o) {
    const sp = parts[pi = (pi + 1) % parts.length];
    const d = sp.userData;
    sp.visible = true;
    sp.position.set(p.x + rnd() * (o.sx || 0), p.y, p.z + rnd() * (o.sz || 0));
    d.v.set(rnd() * (o.vx ?? 0.5), o.vy * (0.6 + Math.random() * 0.8), rnd() * (o.vz ?? 0.5));
    d.life = 0;
    d.max = o.life * (0.7 + Math.random() * 0.6);
    d.g = o.g || 0;
    d.s0 = o.s0; d.s1 = o.s1; d.a = o.a;
    sp.material.color.set(color);
    sp.scale.setScalar(o.s0);
  }
  function updateParticles(dt) {
    for (const sp of parts) {
      if (!sp.visible) continue;
      const d = sp.userData;
      d.life += dt;
      const t = d.life / d.max;
      if (t >= 1) { sp.visible = false; continue; }
      d.v.y += d.g * dt;
      sp.position.addScaledVector(d.v, dt);
      sp.scale.setScalar(d.s0 + (d.s1 - d.s0) * t);
      sp.material.opacity = d.a * Math.min(1, t * 6) * (1 - t);
    }
  }
  const tmp = new V3();
  const worldOf = (g, local) => g.localToWorld(tmp.copy(local));

  /* ---------- camera path, low and close to high and wide ---------- */
  const camPath = new THREE.CatmullRomCurve3([
    new V3(5.6, 2.1, 7), new V3(5.2, 3.1, 8.5), new V3(0.6, 6.2, 10.5),
    new V3(-5.6, 2.9, 7.5), new V3(-4.2, 4.6, 9.5), new V3(8, 9.5, 14)
  ]);
  const lookPath = new THREE.CatmullRomCurve3([
    new V3(0, -0.9, -8), new V3(0, -0.8, -10), new V3(0, -1.2, -10),
    new V3(0, -0.7, -9), new V3(0, -0.6, -12), new V3(0, -0.8, -22)
  ]);
  const look = new V3();

  /* --- sizing --- */
  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 58 : camera.aspect < 1.2 ? 50 : 42;
    camera.updateProjectionMatrix();
  }
  resize();
  // The box itself can change size (mobile caption height), not just the window
  new ResizeObserver(resize).observe(wrap);

  /* ---------- apply state → scene ---------- */
  const lastZ = MACHINES.map(() => DRIVE_FROM);
  const stageS = () => [state.s0, state.s1, state.s2, state.s3, state.s4];

  function apply(t, dt) {
    const S = stageS();
    const fronts = S.map((lp, i) => {
      const z = travel(lp);
      return { z, front: Math.min(0, Math.max(-LENGTH, z + MACHINES[i].userData.rear)) };
    });

    layers.forEach((m, i) => {
      const f = -fronts[i].front / LENGTH;
      m.visible = f > 0.0005;
      m.scale.z = Math.max(f, 1e-4);
    });
    const f4 = fronts[4].front;
    [...kerbs, ...edges].forEach(m => {
      m.visible = f4 < -0.01;
      m.scale.z = Math.max(-f4 / LENGTH, 1e-4);
    });
    dashes.forEach(d => {
      const k = clamp01((d.position.z - f4) / DASH_LEN);
      d.visible = k > 0;
      d.scale.z = Math.max(k, 1e-4);
    });

    // Fresh asphalt glows hot just behind the screed, then cools off
    const au = L.asphalt.userData.u;
    au.heatFront.value = fronts[3].front;
    au.heat.value = state.s3 > 0 ? 0.6 * (1 - clamp01(state.s4 * 4)) : 0;

    // Cones arrive with the grader and are cleared once the road is marked
    cones.forEach(c => {
      const z = c.position.z;
      const k = clamp01((z - fronts[0].front) / 2) * (1 - clamp01((z - f4) / 2));
      c.visible = k > 0.01;
      c.scale.setScalar(Math.max(k, 0.01));
    });

    // Street lights rise behind the marking truck
    lights.forEach(l => {
      const k = clamp01((l.position.z - f4 - 1) / 4);
      l.visible = k > 0.01;
      l.scale.set(1, Math.max(k * k * (3 - 2 * k), 0.01), 1);
      l.userData.pool.material.opacity = state.dusk * 0.5;
    });

    // Machines
    const flash = reduce ? 0 : (Math.sin(t * 9) > 0.2 ? 2.2 : 0.05);
    K.beacon.emissiveIntensity = flash;
    MACHINES.forEach((g, i) => {
      const lp = S[i];
      const { z } = fronts[i];
      g.visible = lp > 0.0005 && lp < 0.9995;
      g.position.set(0, DECK[i], z);
      g.userData.wheels.forEach(w => { w.m.rotation.x = z / w.r; });
      const dz = Math.abs(z - lastZ[i]);
      lastZ[i] = z;
      if (!g.visible || reduce) return;
      g.updateMatrixWorld();

      if (Math.random() < dt * 5) {
        emit(worldOf(g, g.userData.exhaust), 0x3a3633, { vy: 1.6, life: 1.8, s0: 0.3, s1: 1.6, a: 0.35, vx: 0.3, vz: 0.3 });
      }
      const ud = g.userData;
      if (i === 0) ud.acc += dz * 5;
      if (i === 1) ud.acc += dz * 14;
      if (i === 2) ud.acc += dz * 3;
      if (i === 3) ud.acc += dt * 34;
      if (i === 4) ud.acc += dz * 8;
      for (; ud.acc >= 1; ud.acc--) {
        if (i === 0) emit(worldOf(g, ud.emit), 0xb39c80, { sx: 3, sz: 1, vy: 0.9, life: 2.4, s0: 0.8, s1: 4, a: 0.55, vx: 1.2 });
        if (i === 1) {
          emit(worldOf(g, ud.emit), 0x6f6a62, { sx: 2, vy: -0.5, g: -14, life: 0.32, s0: 0.22, s1: 0.18, a: 1, vx: 0.6, vz: 1.2 });
          if (Math.random() < 0.3) emit(worldOf(g, ud.emit), 0xa9a196, { sx: 2.4, vy: 0.6, life: 2, s0: 0.8, s1: 3.4, a: 0.32 });
        }
        if (i === 2) emit(worldOf(g, ud.emit), 0xa39d92, { sx: 2.2, vy: 0.5, life: 1.8, s0: 0.6, s1: 2.6, a: 0.3 });
        if (i === 3) emit(worldOf(g, tmp.set(0, 0.5, 2.7)), 0xf4f1ea, { sx: 8.4, sz: 1.5, vy: 1.1, life: 2.6, s0: 0.8, s1: 4.2, a: 0.26, vx: 0.4 });
        if (i === 4) emit(worldOf(g, ud.emit), 0xffffff, { sx: 0.3, vy: 0.3, life: 0.7, s0: 0.25, s1: 0.9, a: 0.6, vx: 0.2 });
      }
    });

    // Roller vibrates while it works; augers spin; tandem trails the paver
    drum.position.y = 0.85 + (roller.visible && !reduce ? Math.sin(t * 70) * 0.015 : 0);
    auger.rotation.x = t * 6;
    tandem.visible = paver.visible;
    tandem.position.set(1.6, DECK[3] + 0.25, Math.max(fronts[3].z + 7.5, -LENGTH + 4));
    tandem.userData.wheels.forEach(w => { w.m.rotation.x = tandem.position.z / w.r; });
    if (tandem.visible && Math.random() < dt * 4) {
      tandem.updateMatrixWorld();
      emit(worldOf(tandem, tandem.userData.exhaust), 0x3a3633, { vy: 1.4, life: 1.6, s0: 0.3, s1: 1.4, a: 0.3 });
    }

    // Dusk: light, sky, lamps and traffic
    const d = state.dusk;
    mixCol(DAY.top, DUSK.top, d, skyU.top.value);
    mixCol(DAY.horizon, DUSK.horizon, d, skyU.bottom.value);
    scene.fog.color.copy(skyU.bottom.value);
    mixCol(DAY.far, DUSK.far, d, ridgeFar.color);
    mixCol(DAY.near, DUSK.near, d, ridgeNear.color);
    sun.intensity = lerp(2.8, 1.1, d);
    mixCol(0xffe6c8, 0xff8a4a, d, sun.color);
    hemi.intensity = lerp(1.0, 0.55, d);
    mixCol(0xdfe6ee, 0x7a7fa0, d, hemi.color);
    K.lamp.emissiveIntensity = d * 3;
    K.window.emissiveIntensity = d * 1.6;
    K.head.emissiveIntensity = d * 3;
    K.tail.emissiveIntensity = d * 2.2;

    cars.forEach((c, i) => {
      c.visible = d > 0.25 && !reduce;
      if (!c.visible) return;
      const u = ((t * 0.045 + CAR_PHASE[i]) % 1);
      const z = c.userData.dir < 0 ? lerp(1, -LENGTH, u) : lerp(-LENGTH, 1, u);
      c.position.set(CAR_LANE[i], 1.17, z);
      c.userData.wheels.forEach(w => { w.m.rotation.x = z / w.r * -c.userData.dir; });
      c.userData.beam.material.opacity = d * 0.35;
    });

    // Sun and its shadow box follow the action down the road
    const focus = Math.max(-50, Math.min(0, Math.min(...fronts.map((f, i) => (S[i] > 0 && S[i] < 1 ? f.z : 0)))));
    sun.target.position.set(0, 0, focus - 8);
    sun.position.copy(sun.target.position).add(tmp.lerpVectors(SUN_DAY, SUN_DUSK, d));

    // Camera
    camPath.getPoint(state.cam, camera.position);
    lookPath.getPoint(state.cam, look);
    // Lean the shot toward whichever machine is working, while it is close
    look.z = lerp(look.z, Math.max(focus, -24), 0.35);
    if (!reduce) {
      camera.position.x += Math.sin(t * 0.24) * 0.45;
      camera.position.y += Math.sin(t * 0.19) * 0.2;
    }
    camera.lookAt(look);

    updateParticles(dt);
  }

  /* --- render loop --- */
  const clock = new THREE.Clock();
  let running = true;
  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    apply(clock.elapsedTime, dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  /* --- pause when offscreen, to stay kind to laptops --- */
  const vis = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !running) { running = true; clock.getDelta(); tick(); }
      else if (!e.isIntersecting) { running = false; }
    });
  }, { threshold: 0 });
  vis.observe(wrap);

  return true;
}

/* ================================================
   3. SCROLL CHOREOGRAPHY
   ================================================ */
const STAGES = ['Subgrade', 'Sub-base', 'Road base', 'Surfacing', 'Kerbs & markings'];
const state = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, cam: 0, dusk: 0 };

function choreograph() {
  const idxEl = document.getElementById('cc-stage-index');
  const nameEl = document.getElementById('cc-stage-name');
  const steps = Array.from(document.querySelectorAll('.cc-step'));
  // Mobile sizes the scene from the caption's real height (see service-page.css)
  const cap = document.querySelector('.cc-steps');
  new ResizeObserver(() => {
    document.getElementById('cc-build').style.setProperty('--cap-h', cap.offsetHeight + 'px');
  }).observe(cap);
  const rail = Array.from(document.querySelectorAll('.cc-rail i'));
  const fillRail = () => [state.s0, state.s1, state.s2, state.s3, state.s4]
    .forEach((v, k) => { if (rail[k]) rail[k].style.setProperty('--fill', v); });

  let current = -1;
  const setStage = (i, open) => {
    const key = open ? 99 : i;
    if (key === current) return;
    current = key;
    idxEl.textContent = String(i + 1).padStart(2, '0');
    nameEl.textContent = open ? 'Open to traffic' : STAGES[i];
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  };
  setStage(0);

  if (reduce || !gsap || !window.ScrollTrigger) {
    // Show the finished road, no scrubbing
    Object.assign(state, { s0: 1, s1: 1, s2: 1, s3: 1, s4: 1, cam: 0.9 });
    setStage(STAGES.length - 1);
    steps.forEach(s => s.classList.add('is-active'));
    fillRail();
    return;
  }

  gsap.registerPlugin(window.ScrollTrigger);

  const tl = gsap.timeline({
    scrollTrigger: {
      // Span the whole sticky travel of the section, so the build finishes
      // exactly as the last step leaves the viewport.
      trigger: '.cc-build',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8
    },
    // On the timeline, not the trigger, so it tracks the smoothed scrub
    onUpdate: () => {
      const i = [state.s0, state.s1, state.s2, state.s3, state.s4].findIndex(v => v < 1);
      setStage(i < 0 ? STAGES.length - 1 : i, state.dusk > 0.5);
      fillRail();
    },
    defaults: { ease: 'none' }
  });

  tl.to(state, { s0: 1, duration: 1 })
    .to(state, { s1: 1, duration: 1 })
    .to(state, { s2: 1, duration: 1 })
    .to(state, { s3: 1, duration: 1 })
    .to(state, { s4: 1, duration: 1 })
    .to(state, { dusk: 1, duration: 0.7 });
  tl.to(state, { cam: 1, duration: tl.duration() }, 0);
}

/* ================================================
   4. BOOT
   ================================================ */
const bricks = buildWall();

try {
  choreograph();
} catch (err) {
  console.error('[civil-construction] choreography failed:', err);
}

try {
  initScene(state);
} catch (err) {
  console.error('[civil-construction] 3D scene failed:', err);
}

// Break the wall once everything (fonts, CSS, the scene) is settled
if (document.readyState === 'complete') {
  setTimeout(() => shatterWall(bricks), 260);
} else {
  window.addEventListener('load', () => setTimeout(() => shatterWall(bricks), 260));
}
