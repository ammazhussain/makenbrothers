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
   ================================================ */
const LENGTH = 90;

/* Geometry whose origin sits at the near end, so scaling Z
   makes the layer grow away from the camera. */
function slab(width, height, length) {
  const g = new THREE.BoxGeometry(width, height, length);
  g.translate(0, 0, -length / 2);
  return g;
}

function initScene() {
  const canvas = document.getElementById('cc-canvas');
  const wrap = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdedad3, 34, 96);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
  camera.position.set(4.9, 3.6, 11.5);
  camera.lookAt(0, 0.5, -17);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9b9184, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1e0, 1.5);
  sun.position.set(-9, 14, 7);
  scene.add(sun);

  const mat = (color, rough) => new THREE.MeshStandardMaterial({ color, roughness: rough ?? 0.95, metalness: 0 });

  /* --- subgrade / surrounding earth --- */
  const groundGeo = new THREE.PlaneGeometry(120, 260);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, mat(0xb0a390));
  ground.position.z = -60;
  scene.add(ground);

  /* --- the formation strip, darker compacted earth --- */
  const formation = new THREE.Mesh(slab(11.4, 0.12, LENGTH), mat(0x8d7f6c));
  formation.position.y = 0.06;
  scene.add(formation);

  /* --- engineered layers --- */
  const subBase = new THREE.Mesh(slab(10.2, 0.35, LENGTH), mat(0xa79f92));
  subBase.position.y = 0.29;

  const base = new THREE.Mesh(slab(9.5, 0.28, LENGTH), mat(0x8a847b));
  base.position.y = 0.60;

  const asphalt = new THREE.Mesh(slab(8.8, 0.22, LENGTH), mat(0x2f2c29, 0.82));
  asphalt.position.y = 0.85;

  scene.add(subBase, base, asphalt);

  /* --- kerbs --- */
  const kerbs = new THREE.Group();
  [-4.62, 4.62].forEach(x => {
    const k = new THREE.Mesh(slab(0.44, 0.52, LENGTH), mat(0xcfc9bf));
    k.position.set(x, 0.63, 0);
    kerbs.add(k);
  });
  scene.add(kerbs);

  /* --- markings --- */
  const marks = new THREE.Group();
  const edgeMat = mat(0xf2efe9, 0.7);
  [-3.85, 3.85].forEach(x => {
    const e = new THREE.Mesh(slab(0.14, 0.02, LENGTH), edgeMat);
    e.position.set(x, 0.97, 0);
    marks.add(e);
  });
  scene.add(marks);

  const dashes = new THREE.Group();
  const dashMat = mat(0xf7f4ee, 0.7);
  const DASH_LEN = 2.6, DASH_GAP = 2.6;
  for (let z = -3; z > -LENGTH; z -= (DASH_LEN + DASH_GAP)) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, DASH_LEN), dashMat);
    d.position.set(0, 0.97, z);
    d.scale.set(0, 1, 1);
    dashes.add(d);
  }
  scene.add(dashes);

  /* --- roadside cones, a bit of site furniture --- */
  const cones = new THREE.Group();
  const coneMat = mat(0xe8731c, 0.8);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.72, 14), coneMat);
    c.position.set(i % 2 ? 5.6 : -5.6, 0.36, -4 - i * 6.5);
    c.scale.setScalar(0);
    cones.add(c);
  }
  scene.add(cones);

  /* --- start state --- */
  [subBase, base, asphalt, kerbs, ...marks.children].forEach(o => { o.scale.z = 0; });
  formation.scale.z = 0;

  /* --- sizing --- */
  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* --- render loop --- */
  const clock = new THREE.Clock();
  let running = true;
  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    // gentle idle drift so the shot never feels frozen
    camera.position.x = 4.9 + Math.sin(t * 0.24) * 0.5;
    camera.position.y = 3.6 + Math.sin(t * 0.19) * 0.22;
    camera.lookAt(0, 0.5, -17);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  /* --- pause when offscreen, to stay kind to laptops --- */
  const vis = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !running) { running = true; tick(); }
      else if (!e.isIntersecting) { running = false; }
    });
  }, { threshold: 0 });
  vis.observe(wrap);

  return { formation, subBase, base, asphalt, kerbs, marks, dashes, cones, camera };
}

/* ================================================
   3. SCROLL CHOREOGRAPHY
   ================================================ */
const STAGES = ['Subgrade', 'Sub-base', 'Road base', 'Surfacing', 'Kerbs & markings'];

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

  if (reduce || !gsap || !window.ScrollTrigger) {
    // Show the finished road, no scrubbing
    o.formation.scale.z = 1;
    [o.subBase, o.base, o.asphalt, o.kerbs, ...o.marks.children].forEach(m => { m.scale.z = 1; });
    o.dashes.children.forEach(d => d.scale.setScalar(1));
    o.cones.children.forEach(c => c.scale.setScalar(1));
    setStage(STAGES.length - 1);
    steps.forEach(s => s.classList.add('is-active'));
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
      scrub: 0.8,
      onUpdate: self => setStage(Math.floor(self.progress * STAGES.length))
    },
    defaults: { ease: 'none' }
  });

  tl.to(o.formation.scale, { z: 1, duration: 1 })
    .to(o.subBase.scale,   { z: 1, duration: 1 })
    .to(o.base.scale,      { z: 1, duration: 1 })
    .to(o.asphalt.scale,   { z: 1, duration: 1 })
    .to(o.kerbs.scale,     { z: 1, duration: 0.6 })
    .to(o.marks.children.map(m => m.scale), { z: 1, duration: 0.5 }, '<')
    .to(o.dashes.children.map(d => d.scale), {
      x: 1, duration: 0.5, stagger: { each: 0.02, from: 'start' }
    }, '<0.1')
    .to(o.cones.children.map(c => c.scale), {
      x: 1, y: 1, z: 1, duration: 0.4, stagger: 0.02
    }, '<');
}

/* ================================================
   4. BOOT
   ================================================ */
const bricks = buildWall();

let objects = null;
try {
  objects = initScene();
} catch (err) {
  console.error('[civil-construction] 3D scene failed:', err);
}

if (objects) {
  try {
    choreograph(objects);
  } catch (err) {
    console.error('[civil-construction] choreography failed:', err);
  }
}

// Break the wall once everything (fonts, CSS, the scene) is settled
if (document.readyState === 'complete') {
  setTimeout(() => shatterWall(bricks), 260);
} else {
  window.addEventListener('load', () => setTimeout(() => shatterWall(bricks), 260));
}
