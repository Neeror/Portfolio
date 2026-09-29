const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const canvas = $('#starfield');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let stars = [];
let lastW = 0;
let lastH = 0;

function makeStars(w, h) {
  stars = Array.from({ length: Math.round((w * h) / 12500) }, (_, i) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.3 + 0.35,
    a: Math.random() * 0.7 + 0.18,
    s: Math.random() * 0.14 + 0.025,
    accent: i % 17 === 0
  }));
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  const d = Math.min(devicePixelRatio || 1, 2);

  canvas.width = w * d;
  canvas.height = h * d;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(d, 0, 0, d, 0, 0);

  if (w !== lastW || !stars.length) {
    makeStars(w, h);
  } else if (h !== lastH && lastH) {
    const k = h / lastH;
    stars.forEach(s => { s.y *= k; });
  }

  lastW = w;
  lastH = h;
  if (reduced) draw();
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.accent ? `rgba(143,132,255,${s.a})` : `rgba(235,239,255,${s.a})`;
    ctx.fill();

    if (!reduced) {
      s.y += s.s;
      if (s.y > innerHeight + 5) {
        s.y = -5;
        s.x = Math.random() * innerWidth;
      }
    }
  });

  if (!reduced) requestAnimationFrame(draw);
}

let resizeRaf = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(resize);
}, { passive: true });
resize();
if (!reduced) draw();

const dot = $('.cursor-dot');
const ring = $('.cursor-ring');
const fineCursor = !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches;

if (fineCursor && dot && ring) {
  let p = { x: -50, y: -50 };
  let t = { ...p };

  addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    p = { x: e.clientX, y: e.clientY };
    dot.style.opacity = ring.style.opacity = 1;
  }, { passive: true });

  function cursor() {
    t.x += (p.x - t.x) * 0.18;
    t.y += (p.y - t.y) * 0.18;
    dot.style.left = p.x + 'px';
    dot.style.top = p.y + 'px';
    ring.style.left = t.x + 'px';
    ring.style.top = t.y + 'px';
    requestAnimationFrame(cursor);
  }
  cursor();
}

const observer = new IntersectionObserver(es => {
  es.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('show');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
$$('.reveal').forEach(e => observer.observe(e));

const menu = $('.menu');
const nav = $('.header nav');
const header = $('.header');

function setMenu(open) {
  if (!menu || !nav) return;
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
}

menu?.addEventListener('click', () => {
  setMenu(menu.getAttribute('aria-expanded') !== 'true');
});

$$('.header nav a').forEach(a => {
  a.addEventListener('click', () => setMenu(false));
});

document.addEventListener('click', e => {
  if (nav?.classList.contains('open') && !header.contains(e.target)) setMenu(false);
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') setMenu(false);
});
matchMedia('(min-width: 769px)').addEventListener('change', e => {
  if (e.matches) setMenu(false);
});