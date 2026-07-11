// jaimerais.fr — micro-interactions « love ». Léger, GPU-friendly, respecte
// prefers-reduced-motion. Aucune dépendance.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------ Custom cursor + trail */
function initCursor() {
  if (!fine) return;
  const cursor = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor__dot');
  const ring = document.querySelector('.cursor__ring');
  if (!cursor) return;
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;

  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    const t = e.target.closest('a, button, .card, .chip, .btn, [data-hot]');
    cursor.classList.toggle('hot', !!t);
  }, { passive: true });

  function loop() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  if (!reduce) loop();
  else addEventListener('mousemove', (e) => { ring.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`; }, { passive: true });
}

/* ------------------------------------------------------ Heart burst on click */
function initHeartBurst() {
  if (reduce) return;
  const hearts = ['❤', '💕', '💖', '✨', '🧡'];
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'heart-burst';
      el.textContent = hearts[(Math.random() * hearts.length) | 0];
      el.style.left = e.clientX + 'px';
      el.style.top = e.clientY + 'px';
      document.body.appendChild(el);
      const angle = (Math.PI * 2 * i) / n + Math.random();
      const dist = 40 + Math.random() * 50;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30;
      el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`, opacity: 0 },
        ],
        { duration: 750 + Math.random() * 250, easing: 'cubic-bezier(.22,1,.36,1)' },
      ).onfinish = () => el.remove();
    }
  }, { passive: true });
}

/* ------------------------------------------------------ Reveal on scroll */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en, i) => {
      if (en.isIntersecting) {
        const el = en.target;
        const delay = Number(el.dataset.delay || 0);
        setTimeout(() => el.classList.add('in'), delay);
        io.unobserve(el);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------ Magnetic + tilt */
function initMagnetic() {
  if (!fine || reduce) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      el.style.transform = `translate(${x * 14}px, ${y * 14}px)`;
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-6px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ------------------------------------------------------ Reading progress */
function initReadingProgress() {
  const bar = document.querySelector('.reading-progress');
  const article = document.querySelector('[data-article]');
  if (!bar || !article) return;
  bar.classList.add('on');
  const span = bar.querySelector('span');
  const update = () => {
    const rect = article.getBoundingClientRect();
    const total = rect.height - innerHeight;
    const done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
    span.style.width = (total > 0 ? (done / total) * 100 : 0) + '%';
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ------------------------------------------------------ Rotating desires */
function initRotator() {
  const el = document.querySelector('[data-rotator]');
  if (!el) return;
  const words = JSON.parse(el.dataset.rotator || '[]');
  if (!words.length) return;
  let i = 0;
  el.textContent = words[0];
  if (reduce) return;
  setInterval(() => {
    i = (i + 1) % words.length;
    el.style.transition = 'opacity .35s, transform .35s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-12px) rotate(-2deg)';
    setTimeout(() => {
      el.textContent = words[i];
      el.style.transform = 'translateY(12px) rotate(2deg)';
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) rotate(-2deg)';
      });
    }, 350);
  }, 2400);
}

/* ------------------------------------------------------ Header shrink */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------ Client search (listing) */
function initSearch() {
  const input = document.querySelector('[data-search]');
  if (!input) return;
  const cards = [...document.querySelectorAll('[data-search-item]')];
  const empty = document.querySelector('[data-search-empty]');
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  input.addEventListener('input', () => {
    const q = norm(input.value.trim());
    let shown = 0;
    cards.forEach((c) => {
      const hit = !q || norm(c.dataset.searchItem).includes(q);
      c.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    if (empty) empty.style.display = shown ? 'none' : '';
  });
}

function boot() {
  initCursor();
  initHeartBurst();
  initReveal();
  initMagnetic();
  initReadingProgress();
  initRotator();
  initHeader();
  initSearch();
  window.__uiReady = true;
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
