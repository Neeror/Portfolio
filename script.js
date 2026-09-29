const $ = (s, c = document) => c.querySelector(s); const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const canvas = $('#starfield');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let stars = [];

function resize() {
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * d;
  canvas.height = innerHeight * d;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(d, 0, 0, d, 0, 0);
  
  stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 12500) }, (_, i) => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.3 + 0.35,
    a: Math.random() * 0.7 + 0.18,
    s: Math.random() * 0.14 + 0.025,
    accent: i % 17 === 0
  }));
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

addEventListener('resize', resize, { passive: true });
resize();
draw();

const dot = $('.cursor-dot');
const ring = $('.cursor-ring'); let p = { x: -50, y: -50 }; let t = { ...p };  addEventListener('pointermove', e => {   p = { x: e.clientX, y: e.clientY };   dot.style.opacity = ring.style.opacity = 1; });  function cursor() {   t.x += (p.x - t.x) * 0.18;   t.y += (p.y - t.y) * 0.18;   dot.style.left = p.x + 'px';   dot.style.top = p.y + 'px';   ring.style.left = t.x + 'px';   ring.style.top = t.y + 'px';   requestAnimationFrame(cursor); }  if (!reduced && matchMedia('(pointer:fine)').matches) cursor();  const observer = new IntersectionObserver(es => {   es.forEach(e => {     if (e.isIntersecting) {       e.target.classList.add('show');       observer.unobserve(e.target);     }   }); }, { threshold: 0.12 });  $$('.reveal').forEach(e => observer.observe(e));

const menu = $('.menu');
const nav = $('.header nav');  menu?.addEventListener('click', () => {   const open = menu.getAttribute('aria-expanded') === 'true';   menu.setAttribute('aria-expanded', String(!open));   nav.classList.toggle('open', !open); });  $$('.header nav a').forEach(a => {
  a.addEventListener('click', () => {
    menu?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  });
});