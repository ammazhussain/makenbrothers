/* ============ HAMBURGER ============ */
const hamburger = document.getElementById('hamburger-btn');
const mobileNav = document.getElementById('mobile-nav');

function setMenu(open) {
  hamburger.setAttribute('aria-expanded', String(open));
  if (open) {
    mobileNav.removeAttribute('hidden');
  } else {
    mobileNav.setAttribute('hidden', '');
  }
}

hamburger.addEventListener('click', () => {
  setMenu(hamburger.getAttribute('aria-expanded') !== 'true');
});

mobileNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('click', e => {
  if (!e.target.closest('.site-header')) setMenu(false);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') setMenu(false);
});

/* ============ SCROLL REVEAL ============ */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealNodes = Array.from(document.querySelectorAll('[data-reveal]'));

if (reduce) {
  revealNodes.forEach(n => n.classList.add('is-visible'));
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  revealNodes.forEach(n => io.observe(n));

  setTimeout(() => revealNodes.forEach(n => n.classList.add('is-visible')), 2500);
} else {
  revealNodes.forEach(n => n.classList.add('is-visible'));
}

/* ============ BRICK WALL ============ */
function buildWall() {
  const tiles = Array.from(document.querySelectorAll('.wall-tile'));
  if (!tiles.length || reduce || !('IntersectionObserver' in window)) return;

  tiles.forEach(t => {
    const dir = t.dataset.dir === 'right' ? 1 : -1;
    t.style.opacity = '0';
    t.style.transform = `translateX(${dir * 64}px)`;
    t.style.boxShadow = 'none';
  });

  const wall = document.getElementById('wall-grid');
  const wio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      tiles.forEach((t, i) => {
        setTimeout(() => {
          t.style.transition = 'transform .6s cubic-bezier(.34,1.26,.64,1), opacity .45s ease, box-shadow .6s ease';
          t.style.opacity = '1';
          t.style.transform = 'translateX(0)';
          t.style.boxShadow = '0 10px 30px rgba(22,21,20,.14)';
          setTimeout(() => {
            t.style.transition = 'transform .3s ease, box-shadow .3s ease';
          }, 680);
        }, i * 120);
      });
      wio.disconnect();
    });
  }, { threshold: 0.32, rootMargin: '0px 0px -6% 0px' });

  wio.observe(wall);

  setTimeout(() => {
    tiles.forEach(t => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(0)';
      t.style.boxShadow = '0 10px 30px rgba(22,21,20,.14)';
    });
  }, 3000);
}

buildWall();
