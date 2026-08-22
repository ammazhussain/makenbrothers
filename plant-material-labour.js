/* ================================================
   MAKEN BROTHERS - plant-material-labour.js
   Hazard-barrier loader (GSAP) + scroll-scrubbed yard load-out (Three.js)
   ================================================ */

import * as THREE from 'three';

// Tells the inline failsafe in the HTML that the module did load.
window.__mbBooted = true;

const gsap = window.gsap;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = document.getElementById('cc-loader');
const shell = document.getElementById('cc-shell');

document.getElementById('cc-year').textContent = new Date().getFullYear();

let revealed = false;
function revealPage() {
  if (revealed) return;
  revealed = true;
  shell.classList.add('is-revealed');
  loader.classList.add('is-gone');
}
setTimeout(revealPage, 6000);

/* ================================================
   1. HAZARD BARRIER LOADER
   ================================================ */
function buildBarrier() {
  const wrap = document.getElementById('pml-barrier');
  const h = window.innerHeight + 4;
  const barH = Math.max(56, Math.round(h / 9));
  const rows = Math.ceil(h / barH) + 1;

  const frag = document.createDocumentFragment();
  const bars = [];

  for (let i = 0; i < rows; i++) {
    const bar = document.createElement('div');
    bar.className = 'pml-bar' + (i % 2 ? ' is-dim' : '');
    bar.style.height = barH + 'px';
    bar.style.top = (i * barH) + 'px';
    frag.appendChild(bar);
    bars.push(bar);
  }
  wrap.appendChild(frag);
  return bars;
}

function raiseBarrier(bars) {
  if (reduce || !gsap) {
    revealPage();
    return;
  }

  const tl = gsap.timeline({ onComplete: () => loader.classList.add('is-gone') });

  tl.to('.cc-loader-caption', { opacity: 0, scale: 0.94, duration: 0.3, ease: 'power2.in' });

  // Barriers pull back alternately, like a gate being drawn open
  tl.to(bars, {
    duration: 0.9,
    ease: 'power3.in',
    xPercent: (i) => (i % 2 ? 118 : -118),
    stagger: { each: 0.045, from: 'edges' }
  }, '-=0.08');

  tl.add(() => revealPage(), '-=0.6');
}

/* ================================================
   2. THREE.JS - THE YARD
   ================================================ */
const EPS = 0.002;

function initScene() {
  const canvas = document.getElementById('cc-canvas');
  const wrap = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd2cec6, 40, 118);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 500);
  camera.position.set(17, 15, 26);
  camera.lookAt(-0.5, 0, -8);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x938c82, 1.5));
  const sun = new THREE.DirectionalLight(0xfff2e2, 1.4);
  sun.position.set(-12, 20, 12);
  scene.add(sun);

  const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r ?? 0.92, metalness: 0 });

  const ORANGE = 0xe8731c;
  const DARK = 0x2f2c29;
  const STEEL = 0x8f8981;

  /* Cheap contact shadow. Real shadow maps are overkill here, but without
     something under each object everything reads as floating. Parented to
     the object so it scales in with it. */
  const shadowGeo = new THREE.CircleGeometry(1, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  function contactShadow(rx, rz, opacity) {
    const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
      color: 0x2a2620, transparent: true, opacity: opacity ?? 0.22, depthWrite: false
    }));
    m.scale.set(rx, 1, rz);
    m.position.y = 0.04;
    return m;
  }

  /* --- concrete hardstanding --- */
  const slab = new THREE.PlaneGeometry(150, 200);
  slab.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(slab, mat(0xb9b5ad));
  ground.position.z = -40;
  scene.add(ground);

  /* --- painted bay markings --- */
  const marks = new THREE.Group();
  const paint = mat(0xe9e5dd, 0.8);
  const paintOrange = mat(0xd9812f, 0.8);

  // haul road edges
  [-3, 2].forEach(x => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 62), paintOrange);
    line.position.set(x, 0.02, -12);
    marks.add(line);
  });
  // bay divisions
  [[-8, -16], [-8, -31], [6.5, -18], [6.5, -32]].forEach(([x, z]) => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.03, 0.2), paint);
    line.position.set(x, 0.02, z);
    marks.add(line);
  });
  marks.children.forEach(m => { m.scale.z = EPS; m.scale.x = EPS; });
  scene.add(marks);

  /* --- 02 material: graded stockpiles --- */
  const piles = new THREE.Group();
  [[-7.5, -5, 2.5, 0xc6b493], [-9.2, -10.5, 2.1, 0xa39a8d], [-5.6, -12.5, 1.7, 0x8d8579]].forEach(([x, z, r, c]) => {
    const g = new THREE.Group();
    const pile = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.8, 12), mat(c));
    pile.position.y = r * 0.4;
    pile.rotation.y = Math.random() * Math.PI;
    g.add(pile, contactShadow(r * 1.05, r * 1.05, 0.26));
    g.position.set(x, 0, z);
    g.scale.setScalar(EPS);
    piles.add(g);
  });
  scene.add(piles);

  /* --- 03 plant --- */
  function excavator() {
    const g = new THREE.Group();
    const tracks = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.7, 1.9), mat(DARK));
    tracks.position.y = 0.35;
    g.add(tracks);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.7), mat(ORANGE));
    body.position.set(-0.4, 1.25, 0);
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.3), mat(0x3a3733));
    cab.position.set(0.7, 1.35, 0);
    g.add(cab);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.34, 0.34), mat(ORANGE));
    boom.position.set(2.1, 1.9, 0);
    boom.rotation.z = -0.5;
    g.add(boom);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.3), mat(ORANGE));
    stick.position.set(3.5, 1.0, 0);
    stick.rotation.z = 0.7;
    g.add(stick);
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.1), mat(DARK));
    bucket.position.set(4.0, 0.4, 0);
    g.add(bucket);
    g.add(contactShadow(2.3, 1.2));
    return g;
  }

  function roller() {
    const g = new THREE.Group();
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.1, 20), mat(STEEL, 0.6));
    drum.rotation.z = Math.PI / 2;
    drum.position.set(-1.3, 0.95, 0);
    g.add(drum);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.8), mat(ORANGE));
    body.position.set(0.5, 1.35, 0);
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.5), mat(0x3a3733));
    cab.position.set(0.9, 2.3, 0);
    g.add(cab);
    [[1.8, 0.9], [1.8, -0.9]].forEach(([x, z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16), mat(DARK));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.8, z);
      g.add(w);
    });
    g.add(contactShadow(2.3, 1.3));
    return g;
  }

  function dumper() {
    const g = new THREE.Group();
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 2.0), mat(0x3a3733));
    chassis.position.y = 0.95;
    g.add(chassis);
    const skip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.0), mat(ORANGE));
    skip.position.set(-0.7, 1.85, 0);
    skip.rotation.z = 0.06;
    g.add(skip);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.7), mat(0x3a3733));
    cab.position.set(1.5, 1.9, 0);
    g.add(cab);
    [[-1.2, 1.1], [-1.2, -1.1], [1.4, 1.1], [1.4, -1.1]].forEach(([x, z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 16), mat(DARK));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.62, z);
      g.add(w);
    });
    g.add(contactShadow(2.5, 1.4));
    return g;
  }

  const plant = new THREE.Group();
  [[excavator(), 6.2, -4.5, -0.5], [roller(), 7.4, -10, 2.5], [dumper(), 5.8, -15.5, -0.3]].forEach(([m, x, z, ry]) => {
    m.position.set(x, 0, z);
    m.rotation.y = ry;
    m.scale.setScalar(EPS);
    plant.add(m);
  });
  scene.add(plant);

  /* --- 04 cable drums --- */
  function cableDrum(r) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 1.5, 18), mat(0x4a4540));
    core.rotation.z = Math.PI / 2;
    g.add(core);
    [-0.82, 0.82].forEach(x => {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 20), mat(0x8a8279, 0.85));
      f.rotation.z = Math.PI / 2;
      f.position.x = x;
      g.add(f);
    });
    return g;
  }
  const drums = new THREE.Group();
  [[-8, -21, 1.5], [-5.6, -25, 1.2], [-9.6, -26.5, 1.3]].forEach(([x, z, r]) => {
    const g = new THREE.Group();
    const d = cableDrum(r);
    d.position.y = r;
    g.add(d, contactShadow(1.15, r * 1.05, 0.24));
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * 0.7 - 0.35;
    g.scale.setScalar(EPS);
    drums.add(g);
  });
  scene.add(drums);

  /* --- 04 welfare cabins: where the crews muster --- */
  function cabin() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.7, 2.4), mat(0xe3dfd7));
    body.position.y = 0.95;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 2.6), mat(0x4a4744));
    roof.position.y = 1.86;
    g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.08), mat(ORANGE));
    door.position.set(-1.3, 0.7, 1.22);
    g.add(door);
    [0.2, 1.4].forEach(x => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.08), mat(0x5d7a86, 0.5));
      win.position.set(x, 1.15, 1.22);
      g.add(win);
    });
    g.add(contactShadow(2.3, 1.35));
    return g;
  }
  const cabins = new THREE.Group();
  [[6.2, -22.5, 0.1], [6.6, -27.5, -0.08]].forEach(([x, z, ry]) => {
    const c = cabin();
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    c.scale.setScalar(EPS);
    cabins.add(c);
  });
  scene.add(cabins);

  /* --- 05 haul trucks --- */
  function truck() {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 2.4), mat(0x6f6a63));
    bed.position.y = 1.2;
    g.add(bed);
    const load = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 2.2), mat(0xa89b83));
    load.position.set(-0.8, 1.9, 0);
    g.add(load);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 2.2), mat(ORANGE));
    cab.position.set(2.6, 1.9, 0);
    g.add(cab);
    [[-2.2, 1.25], [-2.2, -1.25], [0.4, 1.25], [0.4, -1.25], [2.6, 1.25], [2.6, -1.25]].forEach(([x, z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.42, 16), mat(DARK));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.6, z);
      g.add(w);
    });
    g.add(contactShadow(3.4, 1.4, 0.2));
    g.rotation.y = Math.PI / 2; // face down the haul road
    return g;
  }
  const trucks = new THREE.Group();
  [-26, -38, -50].forEach((z, i) => {
    const t = truck();
    t.position.set(-0.5, 0, z);
    t.userData.start = z;
    trucks.add(t);
  });
  scene.add(trucks);

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    camera.position.x = 17 + Math.sin(t * 0.21) * 0.9;
    camera.position.y = 15 + Math.sin(t * 0.17) * 0.4;
    camera.lookAt(-0.5, 0, -8);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  const vis = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !running) { running = true; tick(); }
      else if (!e.isIntersecting) { running = false; }
    });
  }, { threshold: 0 });
  vis.observe(wrap);

  return { marks, piles, plant, drums, cabins, trucks };
}

/* ================================================
   3. SCROLL CHOREOGRAPHY
   ================================================ */
const STAGES = ['The yard', 'Material supply', 'Machinery hire', 'Cable & crews', 'Mobilised'];

function choreograph(o) {
  const idxEl = document.getElementById('cc-stage-index');
  const nameEl = document.getElementById('cc-stage-name');
  const steps = Array.from(document.querySelectorAll('.cc-step'));

  const setStage = i => {
    const n = Math.max(0, Math.min(STAGES.length - 1, i));
    idxEl.textContent = String(n + 1).padStart(2, '0');
    nameEl.textContent = STAGES[n];
    steps.forEach((s, k) => s.classList.toggle('is-active', k === n));
  };
  setStage(0);

  const settle = () => {
    o.marks.children.forEach(m => { m.scale.x = 1; m.scale.z = 1; });
    [o.piles, o.plant, o.drums, o.cabins].forEach(grp =>
      grp.children.forEach(c => c.scale.setScalar(1)));
    o.trucks.children.forEach((t, i) => { t.position.z = t.userData.start + 30 + i * 4; });
  };

  if (reduce || !gsap || !window.ScrollTrigger) {
    settle();
    setStage(STAGES.length - 1);
    steps.forEach(s => s.classList.add('is-active'));
    return;
  }

  gsap.registerPlugin(window.ScrollTrigger);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.cc-build',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: self => setStage(Math.floor(self.progress * STAGES.length))
    },
    defaults: { ease: 'none' }
  });

  // 01 - bays marked out
  tl.to(o.marks.children.map(m => m.scale), {
    x: 1, z: 1, duration: 0.7, stagger: { each: 0.05 }
  })

    // 02 - stockpiles built by grade
    .to(o.piles.children.map(p => p.scale), {
      x: 1, y: 1, z: 1, duration: 0.8, stagger: { each: 0.12 }
    })

    // 03 - plant lined up
    .to(o.plant.children.map(m => m.scale), {
      x: 1, y: 1, z: 1, duration: 0.9, stagger: { each: 0.16 }
    })

    // 04 - drums and welfare cabins
    .to(o.drums.children.map(d => d.scale), {
      x: 1, y: 1, z: 1, duration: 0.6, stagger: { each: 0.1 }
    })
    .to(o.cabins.children.map(c => c.scale), {
      x: 1, y: 1, z: 1, duration: 0.6, stagger: { each: 0.12 }
    }, '<0.2')

    // 05 - loaded out and away down the haul road
    .to(o.trucks.children.map(t => t.position), {
      z: (i, target) => target.z + 30 + i * 4,
      duration: 1.2,
      stagger: { each: 0.08 }
    });
}

/* ================================================
   4. BOOT
   ================================================ */
const bars = buildBarrier();

let objects = null;
try {
  objects = initScene();
} catch (err) {
  console.error('[plant-material-labour] 3D scene failed:', err);
}

if (objects) {
  try {
    choreograph(objects);
  } catch (err) {
    console.error('[plant-material-labour] choreography failed:', err);
  }
}

if (document.readyState === 'complete') {
  setTimeout(() => raiseBarrier(bars), 260);
} else {
  window.addEventListener('load', () => setTimeout(() => raiseBarrier(bars), 260));
}
