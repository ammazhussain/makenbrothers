/* ================================================
   MAKEN BROTHERS - sewerage-drainage.js
   Trench-opening loader (GSAP) + scroll-scrubbed drainage run (Three.js)
   ================================================ */

import * as THREE from 'three';

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
   1. TRENCH LOADER - soil strata parting down the centre
   ================================================ */
const SOIL = ['#4a3d2f', '#5b4b39', '#6d5b45', '#7b6851', '#87745c', '#6f5f4a', '#5e5040'];

function buildGround() {
  const ground = document.getElementById('sd-ground');
  const h = window.innerHeight + 4;

  const bands = [];
  let y = -2;
  let i = 0;

  while (y < h) {
    // Uneven band depths read as natural strata rather than a stripe pattern
    const bh = Math.round(h / 13) + Math.round((Math.random() - 0.5) * 22);
    const band = document.createElement('div');
    band.className = 'sd-stratum';
    band.style.top = y + 'px';
    band.style.height = bh + 'px';

    const tone = i === 3 ? '#c2601a' : SOIL[i % SOIL.length];
    ['l', 'r'].forEach(side => {
      const half = document.createElement('div');
      half.className = 'sd-half sd-half-' + side;
      half.style.background = tone;
      band.appendChild(half);
    });

    ground.appendChild(band);
    bands.push(band);
    y += bh;
    i++;
  }

  // Scatter grit so the strata are not flat fills
  const frag = document.createDocumentFragment();
  for (let g = 0; g < 90; g++) {
    const dot = document.createElement('span');
    dot.className = 'sd-grit';
    const s = 2 + Math.random() * 5;
    dot.style.width = s + 'px';
    dot.style.height = s + 'px';
    dot.style.left = Math.random() * 100 + '%';
    dot.style.top = Math.random() * 100 + '%';
    dot.style.opacity = (0.15 + Math.random() * 0.3).toFixed(2);
    frag.appendChild(dot);
  }
  ground.appendChild(frag);

  return bands;
}

function openTrench(bands) {
  if (reduce || !gsap) {
    revealPage();
    return;
  }

  const left = bands.map(b => b.children[0]);
  const right = bands.map(b => b.children[1]);

  const tl = gsap.timeline({ onComplete: () => loader.classList.add('is-gone') });

  tl.to('.cc-loader-caption', { opacity: 0, scale: 0.94, duration: 0.32, ease: 'power2.in' });

  // A thin cut opens first, then the ground is pushed aside
  tl.to([left, right], {
    duration: 0.28,
    ease: 'power2.out',
    xPercent: (i, el) => (el.classList.contains('sd-half-l') ? -2 : 2)
  }, '-=0.12');

  tl.to(left, {
    duration: 1.0,
    ease: 'power3.in',
    xPercent: -108,
    rotation: () => -(1 + Math.random() * 3),
    stagger: { each: 0.028, from: 'center' }
  }, '-=0.04');

  tl.to(right, {
    duration: 1.0,
    ease: 'power3.in',
    xPercent: 108,
    rotation: () => (1 + Math.random() * 3),
    stagger: { each: 0.028, from: 'center' }
  }, '<');

  tl.add(() => revealPage(), '-=0.66');
}

/* ================================================
   2. THREE.JS - THE DRAINAGE RUN
   ================================================ */
const LENGTH = 84;
const TRENCH_W = 3.2;
const TRENCH_D = 2.6;

/* A mesh scaled to exactly 0 on one axis keeps full-area end caps but gets a
   singular normal matrix, which shades them solid black. Collapse to a
   sub-pixel epsilon instead of true zero. */
const EPS = 0.002;

/* Origin at the near end: scale.z EPS -> 1 grows away from the camera. */
function grows(w, h, l) {
  const g = new THREE.BoxGeometry(w, h, l);
  g.translate(0, 0, -l / 2);
  return g;
}

function initScene() {
  const canvas = document.getElementById('cc-canvas');
  const wrap = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd6cfc4, 30, 92);

  // Raised and angled down - the story here is depth, so the shot has to
  // look into the trench rather than along the ground.
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
  camera.position.set(6.4, 7.2, 11);
  camera.lookAt(0, -1.4, -14);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b8072, 1.45));
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.45);
  sun.position.set(-8, 15, 8);
  scene.add(sun);

  // DoubleSide: we look down into an open trench, so inward-facing
  // surfaces are visible and must not cull to black.
  const mat = (c, r) => new THREE.MeshStandardMaterial({
    color: c, roughness: r ?? 0.95, metalness: 0, side: THREE.DoubleSide
  });

  const SUBSOIL = 0x8a7a63;
  const TOPSOIL = 0x5f5140;

  /* --- banks either side of the trench --- */
  const bankW = 17;
  [-1, 1].forEach(side => {
    const x = side * (TRENCH_W / 2 + bankW / 2);

    const body = new THREE.Mesh(new THREE.BoxGeometry(bankW, TRENCH_D, 260), mat(SUBSOIL));
    body.position.set(x, -TRENCH_D / 2, -70);
    scene.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(bankW, 0.34, 260), mat(TOPSOIL));
    cap.position.set(x, -0.17, -70);
    scene.add(cap);
  });

  /* --- trench floor --- */
  const floor = new THREE.Mesh(new THREE.BoxGeometry(TRENCH_W, 0.16, 260), mat(0x6f6252));
  floor.position.set(0, -TRENCH_D - 0.08, -70);
  scene.add(floor);

  /* --- unexcavated ground sitting in the trench line ---
     Anchored at the far end so it retreats away: digging forward. */
  const spoilGeo = new THREE.BoxGeometry(TRENCH_W, TRENCH_D, LENGTH);
  spoilGeo.translate(0, 0, LENGTH / 2);
  const spoil = new THREE.Mesh(spoilGeo, mat(SUBSOIL));
  spoil.position.set(0, -TRENCH_D / 2, -LENGTH);
  scene.add(spoil);

  const spoilCapGeo = new THREE.BoxGeometry(TRENCH_W, 0.34, LENGTH);
  spoilCapGeo.translate(0, 0, LENGTH / 2);
  const spoilCap = new THREE.Mesh(spoilCapGeo, mat(TOPSOIL));
  spoilCap.position.set(0, -0.17, -LENGTH);
  scene.add(spoilCap);

  /* --- arisings heaped along the bank --- */
  const heaps = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const r = 1.1 + Math.random() * 0.7;
    const heap = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.85, 9), mat(0x7d6c56));
    heap.position.set(3.9 + Math.random() * 0.5, r * 0.42 - 0.1, -5 - i * 8.6);
    heap.rotation.y = Math.random() * Math.PI;
    heap.scale.setScalar(EPS);
    heaps.add(heap);
  }
  scene.add(heaps);

  /* --- granular bedding --- */
  const bedding = new THREE.Mesh(grows(TRENCH_W - 0.2, 0.34, LENGTH), mat(0xb3aa9a));
  bedding.position.y = -TRENCH_D + 0.17;
  bedding.scale.z = EPS;
  scene.add(bedding);

  /* --- RCC pipes, laid one length at a time --- */
  const PIPE_R = 0.62;
  const PIPE_L = 3.5;
  const pipeY = -TRENCH_D + 0.34 + PIPE_R;
  const pipeMat = mat(0x9c968c, 0.9);
  const socketMat = mat(0x8b8579, 0.9);

  const pipes = new THREE.Group();
  for (let z = -2.2; z > -LENGTH + PIPE_L; z -= (PIPE_L + 0.08)) {
    const unit = new THREE.Group();

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, PIPE_L, 22), pipeMat);
    barrel.rotation.x = Math.PI / 2;
    unit.add(barrel);

    // socket collar at the leading end, so the run reads as jointed lengths
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R + 0.1, PIPE_R + 0.1, 0.34, 22), socketMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.z = -PIPE_L / 2 + 0.17;
    unit.add(collar);

    unit.position.set(0, pipeY, z - PIPE_L / 2);
    unit.scale.setScalar(EPS);
    pipes.add(unit);
  }
  scene.add(pipes);

  /* --- manhole chambers --- */
  const chambers = new THREE.Group();
  [-13, -41, -69].forEach(z => {
    const c = new THREE.Group();

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, TRENCH_D, 24), mat(0x9c968c, 0.9));
    shaft.position.y = -TRENCH_D / 2;
    c.add(shaft);

    const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.16, 24), mat(0x8b8579, 0.9));
    slab.position.y = 0.06;
    c.add(slab);

    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 20), mat(0x3c3833, 0.6));
    cover.position.y = 0.17;
    c.add(cover);

    c.position.z = z;
    c.scale.setScalar(EPS);
    chambers.add(c);
  });
  scene.add(chambers);

  /* --- backfill and reinstatement --- */
  const backfill = new THREE.Mesh(grows(TRENCH_W, 0.72, LENGTH), mat(0x7f7361));
  backfill.position.y = -0.7;
  backfill.scale.z = EPS;
  scene.add(backfill);

  const reinstate = new THREE.Mesh(grows(TRENCH_W, 0.34, LENGTH), mat(0x554839));
  reinstate.position.y = -0.17;
  reinstate.scale.z = EPS;
  scene.add(reinstate);

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
    camera.position.x = 6.4 + Math.sin(t * 0.23) * 0.5;
    camera.position.y = 7.2 + Math.sin(t * 0.18) * 0.26;
    camera.lookAt(0, -1.4, -14);
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

  return { spoil, spoilCap, heaps, bedding, pipes, chambers, backfill, reinstate };
}

/* ================================================
   3. SCROLL CHOREOGRAPHY
   ================================================ */
const STAGES = ['Excavation', 'Bedding', 'Pipe laying', 'Chambers', 'Backfill & reinstate'];

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
    o.spoil.scale.z = EPS;
    o.spoilCap.scale.z = EPS;
    [o.bedding, o.backfill, o.reinstate].forEach(m => { m.scale.z = 1; });
    o.heaps.children.forEach(h => h.scale.setScalar(EPS));
    o.pipes.children.forEach(p => p.scale.setScalar(1));
    o.chambers.children.forEach(c => c.scale.setScalar(1));
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

  // 01 - the trench is cut, arisings pile up alongside
  tl.to([o.spoil.scale, o.spoilCap.scale], { z: EPS, duration: 1 })
    .to(o.heaps.children.map(h => h.scale), {
      x: 1, y: 1, z: 1, duration: 0.5, stagger: { each: 0.04 }
    }, '<0.15')

    // 02 - bedding to the design invert
    .to(o.bedding.scale, { z: 1, duration: 0.8 })

    // 03 - pipes go in a length at a time
    .to(o.pipes.children.map(p => p.scale), {
      x: 1, y: 1, z: 1, duration: 1.1, stagger: { each: 0.035, from: 'start' }
    })

    // 04 - chambers at the junctions
    .to(o.chambers.children.map(c => c.scale), {
      x: 1, y: 1, z: 1, duration: 0.6, stagger: 0.12
    })

    // 05 - surround, backfill, reinstate; the arisings go back in the hole
    .to(o.backfill.scale, { z: 1, duration: 0.7 })
    .to(o.heaps.children.map(h => h.scale), {
      x: EPS, y: EPS, z: EPS, duration: 0.5, stagger: { each: 0.03 }
    }, '<0.2')
    .to(o.reinstate.scale, { z: 1, duration: 0.6 }, '-=0.3');
}

/* ================================================
   4. BOOT
   ================================================ */
const bands = buildGround();

let objects = null;
try {
  objects = initScene();
} catch (err) {
  console.error('[sewerage-drainage] 3D scene failed:', err);
}

if (objects) {
  try {
    choreograph(objects);
  } catch (err) {
    console.error('[sewerage-drainage] choreography failed:', err);
  }
}

if (document.readyState === 'complete') {
  setTimeout(() => openTrench(bands), 260);
} else {
  window.addEventListener('load', () => setTimeout(() => openTrench(bands), 260));
}
