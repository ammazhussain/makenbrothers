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

/* ============ EMAIL ============ */
/* A mailto: link silently does nothing when no mail client is registered, which
   is common on desktop Chrome. Copy the address on click and confirm it, so the
   link always leaves the visitor with something usable. */
function wireEmailCopy() {
  const links = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
  if (!links.length || !navigator.clipboard) return;

  let toast;
  let hideTimer;

  const notify = (msg) => {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'copy-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-shown');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.classList.remove('is-shown'), 2600);
  };

  links.forEach(link => {
    link.addEventListener('click', () => {
      const address = link.getAttribute('href').replace(/^mailto:/, '');
      navigator.clipboard.writeText(address)
        .then(() => notify('Copied ' + address))
        // Clipboard can be refused (unfocused document, permission denied).
        // Still surface the address so it is never a dead click.
        .catch(() => notify(address));
    });
  });
}

wireEmailCopy();

/* ============ STAT COUNTERS ============ */
function runCounters() {
  const nodes = Array.from(document.querySelectorAll('[data-count-to]'));
  if (!nodes.length) return;

  const settle = el => {
    el.textContent = el.dataset.countTo + (el.dataset.countSuffix || '');
  };

  if (reduce || !('IntersectionObserver' in window)) {
    nodes.forEach(settle);
    return;
  }

  const count = el => {
    const target = Number(el.dataset.countTo);
    const suffix = el.dataset.countSuffix || '';
    const duration = 1100;
    const start = performance.now();

    const step = now => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic, so it decelerates into the final number
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      count(e.target);
      cio.unobserve(e.target);
    });
  }, { threshold: 0.6 });

  nodes.forEach(n => {
    n.textContent = '0';
    cio.observe(n);
  });

  // Safety net, matching the scroll-reveal fallback
  setTimeout(() => nodes.forEach(n => {
    if (n.textContent === '0') settle(n);
  }), 3000);
}

runCounters();

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
