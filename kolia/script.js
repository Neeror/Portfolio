/* =========================================================
   КОЛІЯ · шиномонтаж
   script.js
   1. Утиліти        5. Футер-колесо     9. Галерея
   2. Фото-фолбек    6. Навігація       10. Форма запису
   3. 3D-колесо      7. Reveal          11. Паралакс
   4. Hero-сцена     8. Акордеон, ціни
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. Утиліти ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth <= 760;

  /* ---------- 2. Фото: якщо локального файлу немає, беремо з інтернету ---------- */
  $$('img[data-fallback]').forEach(img => {
    const swap = () => {
      if (img.dataset.swapped) return;
      img.dataset.swapped = '1';
      img.src = img.dataset.fallback;
    };
    if (img.complete && img.naturalWidth === 0) swap();
    else img.addEventListener('error', swap, { once: true });
  });

  /* ---------- 3. 3D-колесо (canvas, власний рендер) ----------
     Колесо зібране з полігонів: шина (тор із протектором), обід,
     спиці, диск гальма, супорт і світлове кільце. Рендер: поворот,
     перспектива, сортування за глибиною, освітлення Ламберта + блік. */

  const MAT = {
    tire:    { c: [0.02, 0.019, 0.02], spec: 0.08, shin: 10, rim: 0.3 },
    tread:   { c: [0.017, 0.016, 0.017], spec: 0.04, shin: 8,  rim: 0.25 },
    letter:  { c: [0.055, 0.052, 0.05],  spec: 0.1,  shin: 12, rim: 0.2 },
    lip:     { c: [0.58, 0.58, 0.6],     spec: 1.0,  shin: 60, rim: 0.2 },
    spoke:   { c: [0.19, 0.19, 0.205],   spec: 0.85, shin: 34, rim: 0.3 },
    spokeSide:{ c: [0.08, 0.08, 0.088],  spec: 0.4,  shin: 20, rim: 0.3 },
    barrel:  { c: [0.045, 0.045, 0.05],  spec: 0.25, shin: 16, rim: 0.1 },
    disc:    { c: [0.14, 0.135, 0.13],   spec: 0.45, shin: 18, rim: 0.1 },
    hat:     { c: [0.07, 0.07, 0.07],    spec: 0.3,  shin: 14, rim: 0.1 },
    caliper: { c: [0.78, 0.085, 0.03],   spec: 0.7,  shin: 30, rim: 0.12 },
    hub:     { c: [0.12, 0.12, 0.13],    spec: 0.7,  shin: 30, rim: 0.2 },
    cap:     { c: [0.78, 0.085, 0.03],   spec: 0.8,  shin: 40, rim: 0.1 },
    lug:     { c: [0.52, 0.52, 0.55],    spec: 1.0,  shin: 50, rim: 0.2 },
    led:     { c: [0.05, 0.02, 0.02],    spec: 0.2,  shin: 20, rim: 0, emissive: true }
  };

  const pt = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];

  function buildWheel() {
    const polys = [];
    const add = (v, m, opts = {}) => polys.push({ v, m, k: opts.k || 1, spin: opts.spin !== false, two: !!opts.two, ang: opts.ang });

    const N = 96;
    // профіль шини (r, z): від переднього борту через протектор до заднього
    const prof = [
      [0.684, 0.186], [0.76, 0.212], [0.85, 0.226], [0.925, 0.217], [0.97, 0.192],
      [0.994, 0.15], [1.0, 0.095], [1.0, 0.032], [1.0, -0.032], [1.0, -0.095],
      [0.994, -0.15], [0.97, -0.192], [0.925, -0.217], [0.85, -0.226], [0.76, -0.212], [0.684, -0.186]
    ];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
      for (let j = 0; j < prof.length - 1; j++) {
        const [r0, z0] = prof[j], [r1, z1] = prof[j + 1];
        let m = 'tire', k = 1, ins = 1;
        if (j >= 5 && j <= 9) {
          m = 'tread';
          // малюнок протектора: зміщені поперечні ламелі + центральне ребро
          const off = j === 7 ? 0 : j < 7 ? 1 : 3;
          const groove = (i + off) % 4 === 0;
          const rib = j === 7 && i % 2 === 0;
          if (groove) { k = 0.32; ins = 0.985; }
          else if (rib) k = 0.75;
        } else if (j === 1 || j === 2) {
          // «напис» на боковині: світліші блоки в двох секторах
          const sector = (i % 48);
          if (j === 2 && sector >= 6 && sector <= 17 && sector % 2 === 0) m = 'letter';
        }
        const v = [pt(r0 * ins, a0, z0), pt(r1 * ins, a0, z1), pt(r1 * ins, a1, z1), pt(r0 * ins, a1, z0)];
        add(v, m, { k });
      }
    }

    // світлове кільце (не обертається разом із колесом, щоб «замітання» було стабільним)
    const NL = 96;
    for (let i = 0; i < NL; i++) {
      const a0 = (i / NL) * TAU, a1 = ((i + 1) / NL) * TAU;
      add([pt(0.664, a0, 0.19), pt(0.684, a0, 0.19), pt(0.684, a1, 0.19), pt(0.664, a1, 0.19)], 'led', { spin: false, ang: (a0 + a1) / 2 });
    }

    // закраїна обода
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
      add([pt(0.628, a0, 0.186), pt(0.664, a0, 0.19), pt(0.664, a1, 0.19), pt(0.628, a1, 0.186)], 'lip');
    }

    // внутрішня полиця обода (видно крізь спиці)
    const NB = 48;
    const zs = [0.186, 0.06, -0.06, -0.186];
    for (let i = 0; i < NB; i++) {
      const a0 = (i / NB) * TAU, a1 = ((i + 1) / NB) * TAU;
      for (let s = 0; s < zs.length - 1; s++) {
        add([pt(0.628, a0, zs[s]), pt(0.628, a1, zs[s]), pt(0.628, a1, zs[s + 1]), pt(0.628, a0, zs[s + 1])], 'barrel', { inward: true });
      }
    }

    // гальмівний диск (перфорований) і маточина диска
    const ND = 48;
    for (let i = 0; i < ND; i++) {
      const a0 = (i / ND) * TAU, a1 = ((i + 1) / ND) * TAU;
      add([pt(0.3, a0, 0.02), pt(0.43, a0, 0.02), pt(0.43, a1, 0.02), pt(0.3, a1, 0.02)], 'disc', { two: true, k: i % 3 === 0 ? 0.72 : 1 });
      add([pt(0.43, a0, 0.02), pt(0.56, a0, 0.02), pt(0.56, a1, 0.02), pt(0.43, a1, 0.02)], 'disc', { two: true, k: (i + 1) % 3 === 0 ? 0.72 : 1 });
      add([pt(0.16, a0, 0.055), pt(0.3, a0, 0.02), pt(0.3, a1, 0.02), pt(0.16, a1, 0.055)], 'hat', { two: true });
    }

    // супорт (не обертається)
    const cA0 = 0.3, cA1 = 1.18, CS = 8, ri = 0.44, ro = 0.61, zb = 0.035, zf = 0.118;
    for (let s = 0; s < CS; s++) {
      const a0 = lerp(cA0, cA1, s / CS), a1 = lerp(cA0, cA1, (s + 1) / CS);
      add([pt(ri, a0, zf), pt(ro, a0, zf), pt(ro, a1, zf), pt(ri, a1, zf)], 'caliper', { spin: false });
      add([pt(ro, a0, zf), pt(ro, a0, zb), pt(ro, a1, zb), pt(ro, a1, zf)], 'caliper', { spin: false, k: 0.8 });
      add([pt(ri, a1, zf), pt(ri, a1, zb), pt(ri, a0, zb), pt(ri, a0, zf)], 'caliper', { spin: false, k: 0.7 });
    }
    add([pt(ri, cA0, zf), pt(ri, cA0, zb), pt(ro, cA0, zb), pt(ro, cA0, zf)], 'caliper', { spin: false, k: 0.8 });
    add([pt(ro, cA1, zf), pt(ro, cA1, zb), pt(ri, cA1, zb), pt(ri, cA1, zf)], 'caliper', { spin: false, k: 0.8 });

    // спиці: 5 здвоєних
    const SEG = 5;
    for (let p = 0; p < 5; p++) {
      const base = (p / 5) * TAU + Math.PI / 2;
      for (const side of [-1, 1]) {
        const at = t => base + side * lerp(0.05, 0.125, t);
        const rr = t => lerp(0.165, 0.626, t);
        const hw = t => lerp(0.03, 0.026, t);
        const zf2 = t => lerp(0.16, 0.184, t) - 0.018 * Math.sin(Math.PI * t);
        for (let s = 0; s < SEG; s++) {
          const t0 = s / SEG, t1 = (s + 1) / SEG;
          const P = t => {
            const r = rr(t), a = at(t), da = hw(t) / r;
            return { l: pt(r, a - da, zf2(t)), r: pt(r, a + da, zf2(t)), lb: pt(r, a - da, zf2(t) - 0.055), rb: pt(r, a + da, zf2(t) - 0.055) };
          };
          const A = P(t0), B = P(t1);
          add([A.l, A.r, B.r, B.l], 'spoke');
          add([A.lb, A.l, B.l, B.lb], 'spokeSide');
          add([A.r, A.rb, B.rb, B.r], 'spokeSide');
        }
      }
    }

    // маточина, ковпачок, гайки
    const NH = 30;
    for (let i = 0; i < NH; i++) {
      const a0 = (i / NH) * TAU, a1 = ((i + 1) / NH) * TAU;
      add([pt(0.075, a0, 0.17), pt(0.17, a0, 0.162), pt(0.17, a1, 0.162), pt(0.075, a1, 0.17)], 'hub');
      add([[0, 0, 0.182], pt(0.075, a0, 0.176), pt(0.075, a1, 0.176)], 'cap');
    }
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU + Math.PI / 2 + Math.PI / 5, c = pt(0.122, a, 0.176), s = 0.017;
      add([[c[0] - s, c[1] - s, c[2]], [c[0] + s, c[1] - s, c[2]], [c[0] + s, c[1] + s, c[2]], [c[0] - s, c[1] + s, c[2]]], 'lug');
    }

    // нормалі та центри в локальних координатах
    for (const P of polys) {
      const v = P.v, n = v.length;
      let cx = 0, cy = 0, cz = 0;
      for (const q of v) { cx += q[0]; cy += q[1]; cz += q[2]; }
      cx /= n; cy /= n; cz /= n;
      const a = v[0], b = v[1], c = v[2], d = v[n === 3 ? 0 : 3];
      const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
      const wx = (n === 3 ? b[0] - a[0] : d[0] - b[0]), wy = (n === 3 ? b[1] - a[1] : d[1] - b[1]), wz = (n === 3 ? b[2] - a[2] : d[2] - b[2]);
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
      // орієнтація нормалі
      if (P.m === 'tire' || P.m === 'tread' || P.m === 'letter') {
        const rc = Math.hypot(cx, cy) || 1;
        const ox = cx - (cx / rc) * 0.85, oy = cy - (cy / rc) * 0.85, oz = cz;
        if (nx * ox + ny * oy + nz * oz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      } else if (P.m === 'barrel') {
        if (nx * cx + ny * cy > 0) { nx = -nx; ny = -ny; nz = -nz; }
      } else if (P.m === 'spokeSide') {
        const rc = Math.hypot(cx, cy) || 1;
        // бокова грань дивиться від осі спиці (дотична)
        const tx = -cy / rc, ty = cx / rc;
        const sgn = Math.sign(nx * tx + ny * ty) || 1;
        nx = tx * sgn; ny = ty * sgn; nz = 0;
      } else if (P.m === 'caliper' && Math.abs(nz) < 0.5) {
        // бокові грані супорта: назовні від його центру
        const mA = (cA0 + cA1) / 2, mx = Math.cos(mA) * 0.525, my = Math.sin(mA) * 0.525;
        if (nx * (cx - mx) + ny * (cy - my) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      } else {
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      }
      P.n = [nx, ny, nz];
      P.c = [cx, cy, cz];
      P.sx = new Float32Array(n * 2);
    }
    return polys;
  }

  const MODEL = buildWheel();
  const norm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
  const L1 = norm(-0.5, 0.62, 0.6);   // ключове світло: зліва згори
  const L2 = norm(0.9, 0.05, 0.3);    // контрове тепле світло справа
  const L3 = norm(0.1, 1, 0.1);       // верхнє заповнення
  const H1 = norm(L1[0], L1[1], L1[2] + 1);
  const H2 = norm(L2[0], L2[1], L2[2] + 1);
  const RIM = [1.0, 0.36, 0.2];
  const toSRGB = c => Math.round(255 * Math.pow(clamp(c), 1 / 2.2));

  class Wheel {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.list = MODEL.slice();
      this.resize();
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // проєкція довільної точки моделі (для виносок)
    project(p, st, spin = false) {
      const out = [0, 0, 0];
      this._rot(p[0], p[1], p[2], spin, st, out);
      const S = st.scale * Math.min(this.w, this.h), D = 5;
      const f = D / (D - out[2]);
      return { x: st.cx * this.w + out[0] * S * f, y: st.cy * this.h - out[1] * S * f, z: out[2] };
    }
    _rot(x, y, z, spin, st, out) {
      let x1 = x, y1 = y;
      if (spin) { const cs = Math.cos(st.spin), ss = Math.sin(st.spin); x1 = x * cs - y * ss; y1 = x * ss + y * cs; }
      const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
      const x2 = x1 * ca + z * sa, z2 = -x1 * sa + z * ca;
      out[0] = x2; out[1] = y1 * cb - z2 * sb; out[2] = y1 * sb + z2 * cb;
    }
    render(st) {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const S = st.scale * Math.min(w, h), D = 5, cx = st.cx * w, cy = st.cy * h;
      const cs = Math.cos(st.spin), ss = Math.sin(st.spin);
      const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw), cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
      const lights = st.lights, amb = 0.05 + 0.1 * lights;
      const led = st.led, sweep = st.sweep;

      // тінь на підлозі
      if (lights > 0.01) {
        const sw = S * (0.42 + 0.72 * Math.abs(ca)), sy = cy + S * 1.0 * cb;
        const g = ctx.createRadialGradient(cx, sy, 0, cx, sy, sw);
        g.addColorStop(0, `rgba(8,6,6,${0.7 * lights})`);
        g.addColorStop(1, 'rgba(8,6,6,0)');
        ctx.save(); ctx.translate(cx, sy); ctx.scale(1, 0.1); ctx.translate(-cx, -sy);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, sy, sw, 0, TAU); ctx.fill(); ctx.restore();
      }

      const list = this.list;
      let count = 0;
      for (let i = 0; i < MODEL.length; i++) {
        const P = MODEL[i];
        const spin = P.spin;
        // нормаль
        let nx = P.n[0], ny = P.n[1], nz = P.n[2];
        if (spin) { const t = nx * cs - ny * ss; ny = nx * ss + ny * cs; nx = t; }
        let t2 = nx * ca + nz * sa; nz = -nx * sa + nz * ca; nx = t2;
        t2 = ny * cb - nz * sb; nz = ny * sb + nz * cb; ny = t2;
        // центр
        let px = P.c[0], py = P.c[1], pz = P.c[2];
        if (spin) { const t = px * cs - py * ss; py = px * ss + py * cs; px = t; }
        t2 = px * ca + pz * sa; pz = -px * sa + pz * ca; px = t2;
        t2 = py * cb - pz * sb; pz = py * sb + pz * cb; py = t2;
        // відсікання задніх граней
        const dot = -nx * px - ny * py + nz * (D - pz);
        if (dot <= 0) {
          if (!P.two) continue;
          nx = -nx; ny = -ny; nz = -nz;
        }
        // вершини → екран
        const v = P.v, sx = P.sx;
        for (let k = 0; k < v.length; k++) {
          let x = v[k][0], y = v[k][1], z = v[k][2];
          if (spin) { const t = x * cs - y * ss; y = x * ss + y * cs; x = t; }
          let q = x * ca + z * sa; z = -x * sa + z * ca; x = q;
          q = y * cb - z * sb; z = y * sb + z * cb; y = q;
          const f = D / (D - z);
          sx[k * 2] = cx + x * S * f;
          sx[k * 2 + 1] = cy - y * S * f;
        }
        // колір
        const M = MAT[P.m];
        let r, g, b;
        if (M.emissive) {
          let a = P.ang - (-Math.PI / 2); // кут від низу
          a = Math.atan2(Math.sin(a), Math.cos(a));
          const on = Math.abs(a) <= sweep * Math.PI ? led : 0;
          r = lerp(M.c[0] + 0.05 * lights, 1.0, on);
          g = lerp(M.c[1] + 0.05 * lights, 0.42, on);
          b = lerp(M.c[2] + 0.05 * lights, 0.3, on);
        } else {
          const d1 = Math.max(0, nx * L1[0] + ny * L1[1] + nz * L1[2]);
          const d2 = Math.max(0, nx * L2[0] + ny * L2[1] + nz * L2[2]);
          const d3 = Math.max(0, nx * L3[0] + ny * L3[1] + nz * L3[2]);
          const s1 = Math.pow(Math.max(0, nx * H1[0] + ny * H1[1] + nz * H1[2]), M.shin);
          const s2 = Math.pow(Math.max(0, nx * H2[0] + ny * H2[1] + nz * H2[2]), M.shin);
          const lit = amb + lights * (1.05 * d1 + 0.14 * d3);
          const k = P.k;
          const sp = lights * M.spec * (s1 + 0.5 * s2);
          const rim = lights * M.rim * Math.pow(d2, 1.5) * 0.12;
          r = M.c[0] * k * lit + sp * 0.9 + rim * RIM[0];
          g = M.c[1] * k * lit + sp * 0.88 + rim * RIM[1];
          b = M.c[2] * k * lit + sp * 0.86 + rim * RIM[2];
        }
        P.col = `rgb(${toSRGB(r)},${toSRGB(g)},${toSRGB(b)})`;
        P.depth = D - pz;
        list[count++] = P;
      }
      list.length = count;
      list.sort((a, b) => b.depth - a.depth);

      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < count; i++) {
        const P = list[i], sx = P.sx, n = P.v.length;
        ctx.beginPath();
        ctx.moveTo(sx[0], sx[1]);
        for (let k = 1; k < n; k++) ctx.lineTo(sx[k * 2], sx[k * 2 + 1]);
        ctx.closePath();
        ctx.fillStyle = P.col; ctx.strokeStyle = P.col;
        ctx.fill(); ctx.stroke();
      }
      this.list = MODEL.slice();

      // сяйво світлового кільця (bloom)
      const glow = st.glow * led;
      if (glow > 0.01 && sweep > 0) {
        const facing = clamp(sa * 0 + ca * cb + 0.35); // наскільки лицьова сторона до камери
        const vis = clamp(0.35 + Math.abs(Math.sin(st.yaw)) * 0.4 + facing * 0.3);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        const seg = 72, pts = [];
        for (let i = 0; i <= seg; i++) {
          const a = -Math.PI / 2 - sweep * Math.PI + (i / seg) * sweep * TAU;
          pts.push(this.project(pt(0.674, a, 0.19), st, false));
        }
        const pass = (lw, blur, alpha, col) => {
          ctx.lineWidth = lw; ctx.shadowBlur = blur; ctx.shadowColor = col;
          ctx.strokeStyle = col.replace('ALPHA', alpha);
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        };
        ctx.shadowColor = `rgba(255,70,40,${0.8 * glow * vis})`;
        pass(S * 0.05, S * 0.25, (0.28 * glow * vis).toFixed(3), 'rgba(255,80,45,ALPHA)');
        pass(S * 0.012, S * 0.06, (0.45 * glow * vis).toFixed(3), 'rgba(255,170,130,ALPHA)');
        ctx.restore();
      }
    }
  }

  /* ---------- 4. Hero-сцена: інтро «ввімкнення світла» + обертання на скролі ---------- */
  const stage = $('#stage');
  const hero = $('#top');
  const heroCanvas = $('#wheel');
  let heroWheel = null;

  if (stage && heroCanvas) {
    heroWheel = new Wheel(heroCanvas);
    const flash = $('#flash');
    const readout = $('#readout');
    const copy = $('#heroCopy');
    const meta = $('#heroMeta');
    const badge = $('#heroBadge');
    const word = $('#heroWord');
    const hint = $('#hint');
    const specsBox = $('#specs');
    const specs = $$('.spec', specsBox);
    const paths = $$('#lines path');
    const dots = $$('#lines circle');

    const YAW_FRONT = 1.3, YAW_SIDE = -0.3;
    const st = { yaw: YAW_FRONT, pitch: 0.1, spin: 0, cx: 0.5, cy: 0.55, scale: 0.32, lights: 0, led: 0, sweep: 0, glow: 1 };
    const anchors = {
      tread: [Math.cos(0.62) * 1.0, Math.sin(0.62) * 1.0, 0.1],
      rim: [Math.cos(3.75) * 0.42, Math.sin(3.75) * 0.42, 0.17],
      caliper: [Math.cos(0.75) * 0.53, Math.sin(0.75) * 0.53, 0.118]
    };

    const skipIntro = reduceMotion || window.scrollY > window.innerHeight * 0.5;
    let introStart = performance.now();
    let introT = skipIntro ? 99 : 0;
    let lit = false;
    let heroVisible = true;
    let spinIdle = 0;
    let last = performance.now();

    const light = () => {
      if (lit) return;
      lit = true;
      stage.classList.add('is-lit');
      document.body.classList.remove('is-intro');
      // після появи текст керується скролом, тож прибираємо повільні переходи
      setTimeout(() => {
        [copy, meta, badge, hint].forEach(el => { if (el) el.style.transition = 'opacity 0.15s linear, transform 0.15s linear'; });
      }, 1500);
    };
    if (skipIntro) light();

    // будь-яка взаємодія під час інтро пришвидшує його
    const hurry = () => { if (introT < 2.2) introStart = performance.now() - 2200; };
    ['wheel', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, hurry, { passive: true, once: true }));

    const io = new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; if (heroVisible) loop(); }, { threshold: 0 });
    io.observe(hero);

    let rafId = 0;
    function loop() {
      if (rafId) return;
      rafId = requestAnimationFrame(frame);
    }

    function frame(now) {
      rafId = 0;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!skipIntro) introT = (now - introStart) / 1000;

      // --- інтро: темрява → кільце світла → спалах → студія ---
      const sweep = easeInOutCubic(range(introT, 0.35, 1.45));
      const flashV = introT < 1.3 ? 0 : Math.max(0, 1 - Math.abs(introT - 1.58) / (introT < 1.58 ? 0.2 : 0.55));
      const lightsV = easeOutExpo(range(introT, 1.5, 2.5));
      if (introT > 1.75) light();

      // --- скрол ---
      const rect = hero.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = clamp(-rect.top / (total || 1));
      const r = easeInOutCubic(range(p, 0.04, 0.72));
      const mob = isMobile();

      st.sweep = sweep;
      st.led = introT < 0.35 ? 0 : 1;
      st.lights = lightsV;
      st.glow = lerp(1, 0.28, range(introT, 1.5, 2.6)) * (1 - 0.4 * r) + (introT > 2.6 ? 0.06 * Math.sin(now / 700) : 0);
      st.yaw = lerp(YAW_FRONT, YAW_SIDE, r);
      st.pitch = lerp(0.12, 0.05, r);
      spinIdle += dt * 0.18 * lightsV;
      st.spin = -(spinIdle + p * TAU * 2.2);
      st.cx = mob ? 0.5 : lerp(0.5, 0.64, r);
      st.cy = mob ? lerp(0.5, 0.44, r) : lerp(0.56, 0.53, r);
      st.scale = mob ? lerp(0.34, 0.36, r) * (window.innerHeight > window.innerWidth ? 0.95 : 1) : lerp(0.31, 0.345, r);

      heroWheel.render(st);

      stage.style.setProperty('--lights', lightsV.toFixed(3));
      stage.style.setProperty('--sx', (st.cx * 100).toFixed(1) + '%');

      // спалах у точці кільця
      if (flash) {
        flash.style.opacity = flashV.toFixed(3);
        if (flashV > 0) {
          const c = heroWheel.project([0, -0.5, 0.19], st);
          flash.style.setProperty('--fx', c.x + 'px');
          flash.style.setProperty('--fy', c.y + 'px');
        }
      }

      // текстові шари
      if (lit) {
        const outA = range(p, 0.08, 0.28);
        copy.style.opacity = (1 - outA).toFixed(3);
        copy.style.transform = `translateY(${(-outA * 40).toFixed(1)}px)`;
        copy.style.visibility = outA >= 1 ? 'hidden' : 'visible';
        meta.style.opacity = (1 - outA).toFixed(3);
        hint.style.opacity = (1 - range(p, 0.01, 0.08)).toFixed(3);
        if (badge) badge.style.opacity = (1 - range(p, 0.1, 0.3)).toFixed(3);
        word.style.transform = `translate3d(${(-r * 7).toFixed(2)}vw,0,0)`;
        word.style.opacity = (1 - 0.82 * r).toFixed(3);
      }
      if (readout) readout.textContent = Math.round((st.yaw * 180) / Math.PI) + '°';

      // виноски
      const showSpecs = p > 0.5;
      specsBox.classList.toggle('is-on', showSpecs);
      specs.forEach((el, i) => {
        const on = p > 0.52 + i * 0.07;
        el.classList.toggle('is-on', on);
        const path = paths[i], dot = dots[i];
        if (!path || mob) return;
        const lineP = easeOutQuart(range(p, 0.55 + i * 0.07, 0.68 + i * 0.07));
        const a = heroWheel.project(anchors[el.dataset.anchor], st);
        const t = el.querySelector('.spec__t').getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        const x1 = t.right - sr.left + 16, y1 = t.top - sr.top + t.height / 2;
        const xm = Math.min(a.x - 30, x1 + 60);
        path.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} H${xm.toFixed(1)} L${a.x.toFixed(1)} ${a.y.toFixed(1)}`);
        path.style.strokeDashoffset = (1 - lineP).toFixed(3);
        dot.setAttribute('cx', a.x.toFixed(1));
        dot.setAttribute('cy', a.y.toFixed(1));
        dot.classList.toggle('is-on', lineP > 0.95);
      });

      const animating = !lit || introT < 3 || heroVisible;
      if (animating && heroVisible) loop();
    }

    window.addEventListener('resize', () => { heroWheel.resize(); loop(); });
    window.addEventListener('scroll', loop, { passive: true });
    loop();
  }

  /* ---------- 5. Колесо у футері ---------- */
  const miniCanvas = $('#wheelMini');
  if (miniCanvas) {
    const mini = new Wheel(miniCanvas);
    const st = { yaw: -0.42, pitch: 0.06, spin: 0, cx: 0.5, cy: 0.5, scale: 0.46, lights: 1, led: 1, sweep: 1, glow: 0.3 };
    let vis = false, raf = 0, prev = performance.now();
    const tick = now => {
      raf = 0;
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      if (!reduceMotion) st.spin -= dt * 0.9;
      mini.render(st);
      if (vis && !reduceMotion) raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
    }).observe(miniCanvas);
    window.addEventListener('resize', () => { mini.resize(); mini.render(st); });
  }

  /* ---------- 6. Навігація ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#menu');
  let lastY = window.scrollY;

  function onScrollNav() {
    const y = window.scrollY;
    const heroEnd = hero ? hero.offsetHeight - window.innerHeight : 0;
    nav.classList.toggle('is-solid', y > heroEnd - 10);
    const goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (y > heroEnd + 200 && goingDown && !document.body.classList.contains('menu-open')) nav.classList.add('is-hidden');
    else if (goingUp || y <= heroEnd) nav.classList.remove('is-hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  }

  /* ---------- 7. Reveal при скролі ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], .split').forEach(el => {
    if (reduceMotion) el.classList.add('is-in'); else revealIO.observe(el);
  });

  /* ---------- 8a. Акордеон послуг ---------- */
  const acc = $('#acc');
  if (acc) {
    acc.addEventListener('click', e => {
      const btn = e.target.closest('.acc__btn');
      if (!btn) return;
      const item = btn.closest('.acc__item');
      const willOpen = !item.classList.contains('is-open');
      $$('.acc__item', acc).forEach(it => {
        it.classList.remove('is-open');
        $('.acc__btn', it).setAttribute('aria-expanded', 'false');
      });
      if (willOpen) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  }

  // «Записатися на послугу» → підставляємо послугу у форму
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    const sel = $('#f-service');
    if (sel) { sel.value = a.dataset.service; sel.dispatchEvent(new Event('change')); }
  }));

  /* ---------- 8b. Таблиця цін ---------- */
  const PRICES = {
    car:   { from: 13, m: [520, 560, 600, 680, 760, 880, 1000, 1120], b: [320, 340, 360, 400, 440, 480, 540, 600] },
    cross: { from: 15, m: [680, 760, 840, 960, 1080, 1200, 1320], b: [400, 440, 480, 520, 560, 620, 680] },
    suv:   { from: 16, m: [880, 960, 1080, 1200, 1360, 1480, 1600], b: [480, 520, 560, 620, 680, 740, 800] }
  };
  const uah = n => n.toLocaleString('uk-UA').replace(/\s/g, '\u00a0') + '\u00a0₴';
  const tabs = $$('.tabs__btn');
  const tbody = $('#priceBody');
  const panel = $('#price-panel');

  function renderPrices(key) {
    const d = PRICES[key];
    tbody.innerHTML = d.m.map((m, i) => {
      const b = d.b[i], total = Math.round(((m + b) * 0.9) / 10) * 10;
      return `<tr class="row-in"><th scope="row">R${d.from + i}</th><td>${uah(m)}</td><td>${uah(b)}</td><td>${uah(total)}</td></tr>`;
    }).join('');
    $$('tr', tbody).forEach((tr, i) => tr.style.animationDelay = (i * 35) + 'ms');
  }
  function selectTab(btn) {
    tabs.forEach(t => {
      const on = t === btn;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', btn.id);
    renderPrices(btn.dataset.set);
  }
  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => selectTab(btn));
    btn.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); selectTab(next);
    });
  });

  /* ---------- 9. Галерея ---------- */
  const track = $('#galTrack');
  if (track) {
    const slides = $$('.slide', track);
    const prev = $('#galPrev'), next = $('#galNext'), cur = $('#galCur'), tot = $('#galTotal');
    const pad2 = n => String(n).padStart(2, '0');
    tot.textContent = pad2(slides.length);

    const padL = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const current = () => {
      const x = track.scrollLeft + padL();
      let best = 0, bestD = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(s.offsetLeft - x); if (d < bestD) { bestD = d; best = i; } });
      return best;
    };
    const update = () => {
      const i = current();
      cur.textContent = pad2(i + 1);
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    const go = dir => {
      const i = clamp(current() + dir, 0, slides.length - 1);
      track.scrollTo({ left: slides[i].offsetLeft - padL(), behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    // перетягування мишею
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); }
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) { track.classList.remove('is-drag'); const i = current(); track.scrollTo({ left: slides[i].offsetLeft - padL(), behavior: 'smooth' }); }
    });
    track.addEventListener('dragstart', e => e.preventDefault());
    update();
  }

  /* ---------- 10. Форма запису ---------- */
  const form = $('#form');
  if (form) {
    const phone = $('#f-phone');
    const nameI = $('#f-name');
    const service = $('#f-service');
    const submit = $('#submit');
    const status = $('#formStatus');
    const done = $('#done');
    const doneText = $('#doneText');

    const digits = v => v.replace(/\D/g, '');
    function formatPhone(v) {
      let d = digits(v);
      if (d.startsWith('0')) d = '38' + d;
      if (!d.startsWith('380')) d = '380' + d.replace(/^3?8?0?/, '');
      d = d.slice(0, 12);
      const p = d.slice(3);
      let out = '+380';
      if (p.length) out += ' ' + p.slice(0, 2);
      if (p.length > 2) out += ' ' + p.slice(2, 5);
      if (p.length > 5) out += ' ' + p.slice(5, 7);
      if (p.length > 7) out += ' ' + p.slice(7, 9);
      return out;
    }
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+380 '; });
    phone.addEventListener('blur', () => { if (digits(phone.value).length <= 3) phone.value = ''; });
    phone.addEventListener('input', () => { phone.value = formatPhone(phone.value); clearErr(phone); });
    nameI.addEventListener('input', () => clearErr(nameI));
    service.addEventListener('change', () => clearErr(service));

    function setErr(input, msg) {
      const f = input.closest('.field');
      f.classList.add('has-error');
      input.setAttribute('aria-invalid', 'true');
      const e = $('#e-' + input.name);
      e.textContent = msg;
      input.setAttribute('aria-describedby', e.id);
    }
    function clearErr(input) {
      const f = input.closest('.field');
      f.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
      const e = $('#e-' + input.name);
      if (e) e.textContent = '';
    }
    function validate() {
      let first = null;
      if (!service.value) { setErr(service, 'Оберіть, що потрібно зробити.'); first = first || service; }
      if (nameI.value.trim().length < 2) { setErr(nameI, 'Напишіть ім\u2019я, щоб майстер знав, як звертатися.'); first = first || nameI; }
      if (digits(phone.value).length !== 12) { setErr(phone, 'Потрібен номер у форматі +380 67 123 45 67.'); first = first || phone; }
      if (first) first.focus();
      return !first;
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      status.textContent = '';
      if (!validate()) return;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      $('.btn__label', submit).textContent = 'Надсилаємо…';

      // тут підключається ваш бекенд / Telegram-бот
      setTimeout(() => {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        $('.btn__label', submit).textContent = 'Домовитися про заїзд';
        if (!navigator.onLine) {
          status.textContent = 'Немає з\u2019єднання з інтернетом. Спробуйте ще раз або зателефонуйте: +380 67 412 18 90.';
          return;
        }
        const day = (form.querySelector('input[name="day"]:checked') || {}).value || 'найближчий день';
        doneText.textContent = `${nameI.value.trim()}, передзвонимо протягом 10 хвилин і підтвердимо час на ${day}. Послуга: ${service.value.toLowerCase()}.`;
        form.hidden = true;
        done.hidden = false;
        done.focus();
      }, 1100);
    });

    $('#again').addEventListener('click', () => {
      form.reset();
      done.hidden = true;
      form.hidden = false;
      service.focus();
    });
  }

  /* ---------- 11. Паралакс темної смуги ---------- */
  const bandImg = $('#bandImg');
  if (bandImg && !reduceMotion) {
    const band = bandImg.closest('.band');
    let ticking = false;
    const upd = () => {
      ticking = false;
      const r = band.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const t = (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight + r.height);
      bandImg.style.transform = `translate3d(0, ${(t * -14).toFixed(2)}%, 0) scale(1.04)`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }
})();
