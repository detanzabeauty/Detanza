/* ==========================================================================
   DetanZa — motion engine (no dependencies)
   Preloader, split-text headline, scroll reveals, header hide/show,
   mouse-tilt 3D box with parallax bubbles, scroll-driven product spotlight,
   steps progress line, count-up stats, parallax, magnetic buttons.
   ========================================================================== */
(function () {
  window.__dzAnim = true;
  const root = document.documentElement;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOn = () => root.classList.contains('anim');
  const fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Preloader ---------- */
  const pre = $('#preloader');
  if (pre && motionOn() && !root.classList.contains('seen')) {
    const countEl = $('#plCount');
    const bar = $('#plBar');
    let shown = 0;
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    const start = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      countEl.textContent = '100';
      bar.style.width = '100%';
      setTimeout(() => {
        pre.classList.add('done');
        startHero();
        setTimeout(() => pre.remove(), 1000);
      }, 180);
    };
    (function tick(now) {
      if (finished) return;
      const t = now - start;
      // fast to 80%, then wait for page load (max ~2.6s total)
      const target = loaded || t > 2600 ? 100 : Math.min(85, (t / 900) * 80);
      shown += (target - shown) * 0.12;
      countEl.textContent = Math.round(shown);
      bar.style.width = shown + '%';
      if (target === 100 && shown > 99.4) return finish();
      requestAnimationFrame(tick);
    })(start);
    // Timer backup: frames can be paused (background tabs), never block the page.
    setTimeout(finish, 3200);
    try { sessionStorage.setItem('dz_seen', '1'); } catch (e) { /* private mode */ }
  } else {
    if (pre) pre.remove();
    setTimeout(startHero, 0);
  }

  /* ---------- Split headline ---------- */
  function splitWords(el) {
    if (el.dataset.splitText === el.textContent) return;
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span></span>`)
      .join(' ');
    el.dataset.splitText = el.textContent;
    el.classList.add('split-done');
  }

  let heroStarted = false;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    const go = () => {
      $$('[data-split]').forEach((el) => {
        splitWords(el);
        el.getBoundingClientRect(); // commit start state so the transition runs
        setTimeout(() => el.classList.add('is-in'), 30);
      });
    };
    // Wait for live hero text so the split uses the admin's headline.
    (window.DZ && DZ.ready ? DZ.ready.then(go, go) : Promise.resolve().then(go));
  }

  /* ---------- Scroll reveals ---------- */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;

  function watch(el) {
    if (!io) return el.classList.add('is-in');
    io.observe(el);
  }
  $$('[data-reveal]').forEach(watch);

  // Cards rendered later (products, videos) get a staggered reveal too.
  new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const cards = n.matches('.product-card, .video-card, .contact-card') ? [n] : $$('.product-card, .video-card, .contact-card', n);
      cards.forEach((c) => {
        const idx = [...c.parentNode.children].indexOf(c);
        c.setAttribute('data-reveal', '');
        c.style.setProperty('--d', `${(idx % 4) * 0.08}s`);
        watch(c);
      });
      $$('[data-reveal]', n).forEach(watch);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- Header: shadow + hide on scroll down ---------- */
  const header = $('.site-header');
  let lastY = scrollY;

  /* ---------- Spotlight, steps, parallax: one scroll loop ---------- */
  const spot = $('#spotlight');
  const spotBox = $('#spotBox');
  const spotPanels = spot ? $$('.spot-panel', spot) : [];
  const spotNum = $('#spotNum');
  const spotBar = $('#spotBar');
  const stepsWrap = $('.steps2-wrap');
  const stepsLine = $('#stepsLine');
  const parallax = $$('[data-parallax]');
  let activePanel = 0;
  let ticking = false;

  function onScroll() {
    const y = scrollY;
    const vh = innerHeight;

    if (header) {
      header.classList.toggle('scrolled', y > 10);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      const navOpen = $('#mainNav.open');
      if (goingDown && y > 500 && !navOpen) header.classList.add('hide');
      else if (goingUp || y < 200) header.classList.remove('hide');
      lastY = y;
    }

    if (!motionOn()) return;

    if (spot && spotBox) {
      const r = spot.getBoundingClientRect();
      const total = r.height - vh;
      const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      spotBox.style.setProperty('--spin', `${-28 + p * 360}deg`);
      const idx = Math.min(spotPanels.length - 1, Math.floor(p * spotPanels.length * 0.999));
      if (idx !== activePanel && spotPanels.length) {
        spotPanels[activePanel].classList.remove('is-active');
        spotPanels[idx].classList.add('is-active');
        activePanel = idx;
        if (spotNum) spotNum.textContent = String(idx + 1).padStart(2, '0');
      }
      if (spotBar) spotBar.style.width = `${Math.max(6, p * 100)}%`;
    }

    if (stepsWrap && stepsLine) {
      const r = stepsWrap.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.2), 0, 1);
      stepsLine.style.width = `${p * 100}%`;
    }

    parallax.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const center = r.top + r.height / 2 - vh / 2;
      el.style.translate = `0 ${(-center * parseFloat(el.dataset.parallax)).toFixed(1)}px`;
    });
  }

  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Hero: mouse tilt + parallax bubbles ---------- */
  const visual = $('#heroVisual');
  const tilt = $('#heroTilt');
  if (visual && tilt && fine && !reduced) {
    const layers = $$('[data-depth]', visual);
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const hero = $('.hero2');
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    function loop() {
      if (!motionOn()) { raf = 0; return; }
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      tilt.style.setProperty('--ty', `${(cx * 26).toFixed(2)}deg`);
      tilt.style.setProperty('--tx', `${(-cy * 14).toFixed(2)}deg`);
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth) || 0;
        l.style.setProperty('--px', `${(-cx * d).toFixed(1)}px`);
        l.style.setProperty('--py', `${(-cy * d).toFixed(1)}px`);
      });
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    }
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduced) {
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        if (!motionOn()) return;
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Count-up stats ---------- */
  const counters = $$('[data-count]');
  if (counters.length && motionOn() && io) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target;
        const end = parseFloat(el.dataset.count);
        const t0 = performance.now();
        const dur = 1400;
        (function step(now) {
          const k = clamp((now - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(end * eased);
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => { c.textContent = '0'; cio.observe(c); });
  }

  /* ---------- Pause / resume animations ---------- */
  const toggle = $('#motionToggle');
  if (toggle) {
    const sync = () => { toggle.textContent = root.classList.contains('motion-off') ? 'Play animations' : 'Pause animations'; };
    sync();
    toggle.addEventListener('click', () => {
      const off = !root.classList.contains('motion-off');
      root.classList.toggle('motion-off', off);
      try { localStorage.setItem('dz_motion', off ? 'off' : 'on'); } catch (e) { /* ignore */ }
      if (off) {
        // show everything in its final state
        $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
        root.classList.remove('anim');
      } else if (!reduced) {
        root.classList.add('anim');
        $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
        onScroll();
      }
      sync();
    });
  }
})();
