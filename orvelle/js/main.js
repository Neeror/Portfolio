
(function () {
  "use strict";

  const doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileMq = window.matchMedia("(max-width: 860px)");

  /* ---------- 1. images: local file -> Pexels fallback -> styled placeholder ---------- */
  const pexels = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
  function onImgError(img) {
    const id = img.dataset.pexels;
    if (id && !img.dataset.triedRemote) {
      img.dataset.triedRemote = "1";
      img.src = pexels(id);
    } else if (img.parentElement) {
      img.parentElement.classList.add("img-missing");
    }
  }
  $$("img[data-pexels]").forEach((img) => {
    img.addEventListener("error", () => onImgError(img));
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("loading") !== "lazy") onImgError(img);
  });

  /* ---------- 2. intro: hands point to real time ---------- */
  const intro = $("[data-intro]");
  (function setHands() {
    const now = new Date();
    const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();
    const set = (sel, deg) => { const el = $(sel); if (el) el.style.setProperty("--to", deg + "deg"); };
    set(".lume__hand--h", (h + m / 60) * 30 + 360);
    set(".lume__hand--m", (m + s / 60) * 6);
    set(".lume__hand--s", s * 6);
  })();

  function finishIntro() {
    document.body.classList.add("intro-done");
    if (intro) intro.setAttribute("hidden", "");
  }
  if (intro) {
    if (reduced) finishIntro();
    intro.addEventListener("animationend", (e) => { if (e.target === intro) finishIntro(); });
    const skip = () => { document.body.classList.add("intro-skip"); setTimeout(finishIntro, 60); };
    $("[data-intro-skip]").addEventListener("click", skip);
    intro.addEventListener("click", (e) => { if (e.target === intro) skip(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !intro.hidden) skip(); });
    setTimeout(finishIntro, 4500); // safety net
  }

  /* ---------- 3. nav + menu ---------- */
  const nav = $("[data-nav]");
  const menu = $("[data-menu]");
  const burger = $("[data-menu-toggle]");
  let lastY = window.scrollY;

  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
      document.body.style.overflow = "hidden";
    } else {
      menu.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 520);
    }
  }
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$(".menu__link").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });

  /* ---------- 4. cached geometry ---------- */
  const hero = $("[data-hero]");
  const heroMedia = $("[data-hero-media]");
  const heroA = $(".hero__img--a");
  const heroB = $(".hero__img--b");
  const heroGlint = $("[data-hero-glint]");
  const heroCopy = $("[data-hero-copy]");
  const heroScroll = $("[data-hero-scroll]");
  const heroReel = $("[data-reel]");
  const heroModel = $("[data-hero-model]");

  const features = $("[data-features]");
  const featureItems = $$("[data-feature]");
  const featureImgs = $$(".features__media img");
  const featureCaption = $("[data-feature-caption]");
  const captions = [
    "Калібр O-26. Колонне колесо, вертикальне зчеплення.",
    "Два барабани, 72 години без підзаводу.",
    "Сапфір 2,2 мм, антивідблиск з обох боків.",
    "Super-LumiNova BGW9, три шари вручну.",
    "Регулювання у 5 положеннях, −2/+4 с на добу."
  ];

  const story = $("[data-story]");
  const storyPath = $("[data-story-path]");
  const parallaxEls = $$("[data-parallax]");
  const ruler = $("[data-ruler]");

  let geo = {};
  function measure() {
    const top = (el) => el.getBoundingClientRect().top + window.scrollY;
    geo = {
      vh: window.innerHeight,
      vw: window.innerWidth,
      heroTop: top(hero), heroH: hero.offsetHeight,
      featTop: top(features), featH: features.offsetHeight,
      storyTop: top(story), storyH: story.offsetHeight,
      mobile: mobileMq.matches
    };
    if (storyPath) {
      geo.pathLen = storyPath.getTotalLength();
      storyPath.style.strokeDasharray = geo.pathLen;
    }
  }

  /* ---------- 5. hero choreography (front -> zoom -> turn -> card) ---------- */
  function updateHero(y) {
    const p = clamp((y - geo.heroTop) / (geo.heroH - geo.vh));
    // copy leaves first
    const pc = range(p, 0, 0.12);
    const out = `translate3d(0, ${-50 * pc}px, 0)`;
    heroCopy.style.opacity = String(1 - pc);
    heroCopy.style.transform = out;
    heroScroll.style.opacity = String(1 - range(p, 0, 0.05));
    heroReel.style.opacity = String(1 - pc);
    heroReel.style.pointerEvents = pc > 0.5 ? "none" : "";
    heroCopy.style.pointerEvents = pc > 0.5 ? "none" : "";

    // phase 1: push in to the dial
    const p1 = easeInOut(range(p, 0.02, 0.45));
    // phase 2: turn (crossfade to angled shot)
    const p2 = easeInOut(range(p, 0.4, 0.64));
    // phase 3: container transform into a card
    const p3 = easeInOut(range(p, 0.64, 0.9));

    let scale = lerp(1, 1.42, p1);
    let rot = lerp(0, -9, p1) + lerp(0, 9, p2);
    let tx = 0, ty = lerp(0, -3, p1);
    scale = lerp(scale, 1.05, p2);

    let insetV = 0, insetH = 0, radius = 0;
    if (p3 > 0) {
      if (geo.mobile) {
        scale = lerp(scale, 0.9, p3);
        ty = lerp(ty, -18, p3);
        insetV = lerp(0, 16, p3); insetH = lerp(0, 8, p3);
      } else {
        scale = lerp(scale, 0.62, p3);
        tx = lerp(0, 21, p3);
        insetV = lerp(0, 9, p3); insetH = lerp(0, 16, p3);
      }
      radius = lerp(0, 28, p3);
    }
    heroMedia.style.transform = `translate3d(${tx}vw, ${ty}vh, 0) scale(${scale}) rotate(${rot}deg)`;
    heroMedia.style.clipPath = p3 > 0 ? `inset(${insetV}% ${insetH}% ${insetV}% ${insetH}% round ${radius}px)` : "";

    heroA.style.opacity = String(1 - p2);
    heroB.style.opacity = String(p2);
    heroB.style.transform = `rotateY(${lerp(22, 0, p2)}deg) scale(${lerp(1.1, 1, p2)})`;

    heroGlint.style.transform = `translateX(${lerp(-120, 120, range(p, 0.15, 0.62))}%)`;

    const pm = easeOut(range(p, 0.74, 0.92));
    heroModel.style.opacity = String(pm);
    heroModel.style.transform = `translate3d(${lerp(-30, 0, pm)}px, 0, 0)`;
    heroModel.classList.toggle("is-visible", pm > 0.01);
  }

  /* ---------- 6. features: sticky list ---------- */
  let activeFeature = 0;
  function setFeature(i) {
    if (i === activeFeature) return;
    featureItems[activeFeature].classList.remove("is-active");
    featureImgs.forEach((img) => img.classList.remove("was-active"));
    featureImgs[activeFeature].classList.add("was-active");
    featureImgs[activeFeature].classList.remove("is-active");
    activeFeature = i;
    featureItems[i].classList.add("is-active");
    featureImgs[i].classList.add("is-active");
    featureCaption.classList.add("is-swap");
    setTimeout(() => { featureCaption.textContent = captions[i]; featureCaption.classList.remove("is-swap"); }, 220);
  }
  function updateFeatures(y) {
    const p = clamp((y - geo.featTop) / (geo.featH - geo.vh));
    setFeature(Math.min(featureItems.length - 1, Math.floor(p * featureItems.length)));
  }
  featureItems.forEach((item, i) => {
    item.addEventListener("click", () => {
      const target = geo.featTop + ((i + 0.5) / featureItems.length) * (geo.featH - geo.vh);
      window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* ---------- 7. parallax, story path, ruler ---------- */
  function updateParallax(y) {
    parallaxEls.forEach((img) => {
      const box = img.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > geo.vh) return;
      const k = parseFloat(img.dataset.parallax) || 0.15;
      const center = box.top + box.height / 2 - geo.vh / 2;
      img.style.transform = `translate3d(0, ${-center * k - box.height * 0.12}px, 0)`;
    });
  }
  function updateStory(y) {
    if (!storyPath || !geo.pathLen) return;
    const p = clamp((y + geo.vh * 0.7 - geo.storyTop) / geo.storyH);
    storyPath.style.strokeDashoffset = String(geo.pathLen * (1 - p));
  }
  if (ruler) {
    ruler.innerHTML = "<span></span>".repeat(160);
  }
  function updateRuler(y) {
    if (!ruler) return;
    ruler.style.transform = `translate3d(0, ${-(y * 0.12) % 50}px, 0)`;
  }

  /* ---------- 8. the loop ---------- */
  let ticking = false;
  function frame() {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    const menuOpen = menu.classList.contains("is-open");
    nav.classList.toggle("is-hidden", !menuOpen && y > lastY + 4 && y > geo.vh * 1.2);
    if (y < lastY - 4) nav.classList.remove("is-hidden");
    lastY = y;
    if (reduced) return;
    updateHero(y);
    updateFeatures(y);
    updateParallax(y);
    updateStory(y);
    updateRuler(y);
  }
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", () => { measure(); requestFrame(); });
  window.addEventListener("load", () => { measure(); requestFrame(); });
  measure();
  frame();

  /* ---------- 9. reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal], [data-showcase]").forEach((el) => io.observe(el));

  /* ---------- 10. hero reel thumbnail ---------- */
  const reelImgs = $$(".hero__reel-frame img");
  let reelI = 0;
  if (!reduced && reelImgs.length > 1) {
    setInterval(() => {
      reelImgs[reelI].classList.remove("is-active");
      reelI = (reelI + 1) % reelImgs.length;
      reelImgs[reelI].classList.add("is-active");
    }, 2600);
  }

  /* ---------- 11. cart + toast ---------- */
  const cartCount = $("[data-cart-count]");
  const toast = $("[data-toast]");
  let cart = 0, toastT;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("is-show"), 2400);
  }
  function addToCart(name, btn) {
    cart += 1;
    cartCount.textContent = String(cart);
    cartCount.classList.remove("is-bump");
    void cartCount.offsetWidth;
    cartCount.classList.add("is-bump");
    showToast(`${name} · додано в кошик`);
    if (btn) {
      btn.classList.add("is-added");
      const label = btn.firstChild;
      if (btn.classList.contains("row__add")) {
        btn.textContent = "✓";
        setTimeout(() => { btn.textContent = "+"; btn.classList.remove("is-added"); }, 1600);
      } else if (label && label.nodeType === 3) {
        const old = label.textContent;
        label.textContent = "Додано ";
        setTimeout(() => { label.textContent = old; btn.classList.remove("is-added"); }, 1600);
      } else {
        setTimeout(() => btn.classList.remove("is-added"), 1600);
      }
    }
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-cart]");
    if (!btn) return;
    const name = btn.dataset.name || (models[btn.dataset.scBuy] && models[btn.dataset.scBuy].name) || "Годинник";
    addToCart(name, btn);
  });

  /* ---------- 12. collection: filters, drag, arrows, hearts ---------- */
  const track = $("[data-track]");
  const cards = $$(".card", track);
  const bar = $("[data-track-bar]");
  const prev = $("[data-track-prev]");
  const next = $("[data-track-next]");
  const empty = $("[data-track-empty]");

  function updateTrackUI() {
    const max = track.scrollWidth - track.clientWidth;
    const ratio = track.clientWidth / track.scrollWidth;
    const p = max > 0 ? track.scrollLeft / max : 1;
    bar.style.transform = `scaleX(${clamp(ratio + (1 - ratio) * p, 0.05, 1)})`;
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > max - 4;
  }
  track.addEventListener("scroll", () => requestAnimationFrame(updateTrackUI), { passive: true });
  window.addEventListener("resize", updateTrackUI);
  const step = () => (cards.find((c) => !c.classList.contains("is-hidden")) || cards[0]).offsetWidth + 18;
  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); track.scrollBy({ left: step(), behavior: "smooth" }); }
    if (e.key === "ArrowLeft") { e.preventDefault(); track.scrollBy({ left: -step(), behavior: "smooth" }); }
  });

  // mouse drag (touch uses native scroll)
  let drag = null;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) { drag.moved = true; track.classList.add("is-drag"); }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    track.classList.remove("is-drag");
    if (moved) {
      const s = step();
      track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: "smooth" });
    }
  });

  $$("[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      $$("[data-filter]").forEach((c) => { c.classList.toggle("is-active", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
      let shown = 0;
      cards.forEach((card, i) => {
        const match = f === "all" || card.dataset.cat === f;
        card.classList.toggle("is-hidden", !match);
        card.classList.remove("is-enter");
        if (match) {
          shown++;
          void card.offsetWidth;
          card.style.animationDelay = `${Math.min(shown - 1, 5) * 50}ms`;
          card.classList.add("is-enter");
        }
      });
      empty.hidden = shown > 0;
      track.scrollTo({ left: 0 });
      updateTrackUI();
    });
  });

  $$("[data-heart]").forEach((h) => {
    h.addEventListener("click", (e) => {
      e.stopPropagation();
      const on = h.getAttribute("aria-pressed") !== "true";
      h.setAttribute("aria-pressed", String(on));
      h.classList.remove("is-burst");
      if (on) { void h.offsetWidth; h.classList.add("is-burst"); }
      const name = h.closest(".card").querySelector(".card__name").textContent;
      showToast(on ? `${name} · в обраному` : `${name} · прибрано з обраного`);
    });
  });
  updateTrackUI();

  /* ---------- 13. showcase ---------- */
  const models = {
    meridian: { name: "Meridian Chrono 42", since: "з 1982", sub: "Хронограф Космополіт", img: "images/w-meridian.jpg", px: "190819", price: "€12 400",
      desc: "Оригінальна версія з заводною головкою ліворуч, сталевим браслетом і чорно-зеленим безелем. Створена для тих, хто літає частіше, ніж ночує вдома.",
      specs: { calibre: "O-26, автоматичний", case: "42 мм, сталь 904L", reserve: "72 години", water: "100 м" } },
    aurum: { name: "Aurum Yacht 40", since: "з 1996", sub: "Жовте золото 18 карат", img: "images/w-aurum.jpg", px: "4235659", price: "€18 900",
      desc: "Регатний таймер з обертовим безелем і суцільним золотим браслетом. Важить рівно стільки, щоб про нього не забувати.",
      specs: { calibre: "O-18, автоматичний", case: "40 мм, золото 750", reserve: "60 годин", water: "100 м" } },
    nocturne: { name: "Nocturne 39", since: "з 2008", sub: "Чорний циферблат, люм", img: "images/w-nocturne.jpg", px: "25682459", price: "€7 650",
      desc: "Наш перший годинник для ночі. Матовий чорний циферблат, широкі індекси і люм, що тримається до ранку.",
      specs: { calibre: "O-11, ручний завод", case: "39 мм, сталь", reserve: "48 годин", water: "50 м" } },
    heritage: { name: "Heritage Speed", since: "з 1994", sub: "Тахіметр, золотий безель", img: "images/w-heritage.jpg", px: "13703305", price: "€14 200",
      desc: "Гоночний хронограф з тахіметричною шкалою на безелі. Три лічильники, ніякої зайвої декорації.",
      specs: { calibre: "O-26T, автоматичний", case: "41 мм, сталь і золото", reserve: "72 години", water: "100 м" } },
    gem: { name: "Atelier Gem", since: "з 2019", sub: "Сапфіри ручної закріпки", img: "images/w-gem.jpg", px: "10445217", price: "€41 500",
      desc: "Сорок два сапфіри, закріплені вручну в ательє Ле-Брасю. Лімітована серія на 88 екземплярів.",
      specs: { calibre: "O-09, ультратонкий", case: "36 мм, золото 750", reserve: "42 години", water: "30 м" } },
    rosee: { name: "Rosée 34", since: "з 2012", sub: "Рожеве золото, перламутр", img: "images/w-rosee.jpg", px: "14410757", price: "€9 300",
      desc: "Компактний корпус, перламутровий циферблат і ремінець з алігатора. Тонкий настільки, що ховається під манжетою.",
      specs: { calibre: "O-09, ультратонкий", case: "34 мм, рожеве золото", reserve: "42 години", water: "30 м" } },
    sentinel: { name: "Sentinel 41", since: "з 2003", sub: "Пілотський хронограф", img: "images/w-sentinel.jpg", px: "9305747", price: "€6 900",
      desc: "Великі цифри, антимагнітний корпус і ремінець зі старої льотної шкіри. Читається за пів секунди.",
      specs: { calibre: "O-20, автоматичний", case: "41 мм, сталь", reserve: "56 годин", water: "100 м" } }
  };

  const showcase = $("[data-showcase]");
  const scImgWrap = $("[data-sc-imgwrap]");
  const scImg = $("[data-sc-img]");
  const scPanel = $("[data-sc-panel]");
  const scDots = $$("[data-model]");
  const scToggle = $("[data-sc-toggle]");
  const scDetails = $("[data-sc-details]");
  let current = "meridian";

  function renderModel(id, scroll) {
    const m = models[id];
    if (!m) return;
    if (scroll) showcase.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    scDots.forEach((d) => { const on = d.dataset.model === id; d.classList.toggle("is-active", on); d.setAttribute("aria-selected", String(on)); });
    if (id === current) return;
    current = id;
    scImgWrap.classList.remove("is-in");
    scImgWrap.classList.add("is-out");
    scPanel.classList.add("is-swap");
    setTimeout(() => {
      scImg.dataset.triedRemote = "";
      scImg.dataset.pexels = m.px;
      scImgWrap.classList.remove("img-missing");
      scImg.src = m.img;
      scImg.alt = m.name;
      $("[data-sc-name]").textContent = m.name;
      $("[data-sc-since]").textContent = m.since;
      $("[data-sc-sub]").textContent = m.sub;
      $("[data-sc-desc]").textContent = m.desc;
      $("[data-sc-price]").textContent = m.price;
      $("[data-sc-buy]").dataset.scBuy = id;
      Object.keys(m.specs).forEach((k) => { const el = $(`[data-sc-spec="${k}"]`); if (el) el.textContent = m.specs[k]; });
      scImgWrap.classList.remove("is-out");
      scImgWrap.classList.add("is-in");
      scPanel.classList.remove("is-swap");
    }, 320);
  }
  scDots.forEach((d) => d.addEventListener("click", () => renderModel(d.dataset.model, false)));
  $$("[data-show]").forEach((b) => b.addEventListener("click", () => {
    if (track.classList.contains("is-drag")) return;
    renderModel(b.dataset.show, true);
  }));
  $("[data-sc-dots]").addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const i = scDots.findIndex((d) => d.dataset.model === current);
    const n = (i + (e.key === "ArrowDown" ? 1 : -1) + scDots.length) % scDots.length;
    scDots[n].focus();
    renderModel(scDots[n].dataset.model, false);
  });
  scToggle.addEventListener("click", () => {
    const open = scToggle.getAttribute("aria-expanded") !== "true";
    scToggle.setAttribute("aria-expanded", String(open));
    scDetails.hidden = !open;
  });

  /* ---------- 14. newsletter input (states: idle / error / loading / success) ---------- */
  const form = $("[data-news]");
  const field = $("[data-field]", form);
  const input = $("#news-email");
  const msg = $("[data-news-msg]");
  const setState = (state, text) => {
    field.classList.remove("is-error", "is-loading", "is-success");
    msg.classList.remove("is-error", "is-success");
    if (state) { field.classList.add("is-" + state); if (state !== "loading") msg.classList.add("is-" + state); }
    msg.textContent = text || "";
    input.setAttribute("aria-invalid", String(state === "error"));
  };
  input.addEventListener("input", () => { if (field.classList.contains("is-error")) setState(null, ""); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return setState("error", "Вкажіть email, щоб ми знали, куди писати.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setState("error", "Схоже, в адресі помилка. Перевірте символ @ і домен.");
    setState("loading", "");
    setTimeout(() => {
      setState("success", "Готово. Перший лист прийде на початку місяця.");
      input.value = "";
    }, 1100);
  });
})();
