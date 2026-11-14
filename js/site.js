/* ==========================================================================
   DetanZa — shared storefront helpers (loaded on every public page)
   ========================================================================== */
(function () {
  const FALLBACK = {
    settings: {
      announcement: 'Welcome to DetanZa™ — order easily on WhatsApp',
      heroEyebrow: 'New from DetanZa™',
      heroTitle: 'Reveal your natural glow',
      heroSubtitle: 'Skin-loving beauty essentials made for everyday care. Watch how to use every product and order in one tap.',
      heroCta: 'Shop Now',
      aboutTitle: 'About DetanZa™',
      aboutText: 'DetanZa™ is a beauty and skincare brand focused on simple, effective care for every skin.',
    },
    products: [],
    videos: [],
  };

  const ICONS = {
    wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.45-5.03c0-5.2 4.24-9.43 9.45-9.43a9.38 9.38 0 0 1 9.43 9.44c0 5.2-4.23 9.44-9.44 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.6 23.3l5.7-1.5a11.33 11.33 0 0 0 5.44 1.39h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.33-8.04"/></svg>',
    play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>',
    facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    youtube: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>',
    email: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  };

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (n) =>
    n == null || n === '' ? '' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const discount = (p) =>
    p.mrp && p.price != null && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  function waLink(number, text) {
    const digits = String(number || '').replace(/\D/g, '');
    if (!digits) return '';
    return `https://wa.me/${digits}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  }

  function buyLink(p, settings) {
    if (p.buyLink) return { href: p.buyLink, label: 'Buy Now', external: true, wa: false };
    const wa = waLink(settings.whatsapp, `Hi DetanZa, I want to order: ${p.name}${p.size ? ' (' + p.size + ')' : ''}`);
    if (wa) return { href: wa, label: 'Order on WhatsApp', external: true, wa: true };
    return { href: '/#contact', label: 'Enquire', external: false, wa: false };
  }

  const productUrl = (p) => `/product?id=${encodeURIComponent(p.id)}`;

  /** Cloudinary on-the-fly resize + best format/quality. Non-Cloudinary URLs pass through. */
  function img(url, width) {
    if (!url || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return url;
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }

  /** Auto thumbnail (frame at 1s) for a video uploaded to Cloudinary. */
  function videoPoster(url, width = 640) {
    if (!url || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url)) return '';
    return url
      .replace('/video/upload/', `/video/upload/so_1,f_jpg,q_auto,c_limit,w_${width}/`)
      .replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg');
  }

  function youtubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      return m ? m[2] : '';
    } catch {
      return '';
    }
  }

  function videoThumb(v) {
    if (v.poster) return `<img src="${esc(img(v.poster, 640))}" alt="" loading="lazy">`;
    if (v.source === 'youtube') {
      const id = youtubeId(v.url);
      if (id) return `<img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy">`;
    }
    if (v.source === 'upload') {
      const auto = videoPoster(v.url);
      if (auto) return `<img src="${esc(auto)}" alt="" loading="lazy">`;
      return `<video src="${esc(v.url)}#t=0.5" preload="metadata" muted playsinline></video>`;
    }
    return '';
  }

  function productCard(p, settings) {
    const off = discount(p);
    const buy = buyLink(p, settings);
    const media = p.image
      ? `<img src="${esc(img(p.image, 600))}" alt="${esc(p.name)}" loading="lazy">`
      : `<div class="noimg"><img src="/logo-cropped.png" alt=""></div>`;
    return `
      <article class="product-card">
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
        <div class="product-media">${media}</div>
        <div class="product-body">
          ${p.category ? `<span class="product-cat">${esc(p.category)}</span>` : ''}
          <h3 class="product-name"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          ${p.tagline ? `<p class="product-tagline">${esc(p.tagline)}</p>` : ''}
          <div class="price-row">
            ${p.price != null ? `<span class="price">${money(p.price)}</span>` : ''}
            ${off ? `<span class="mrp">${money(p.mrp)}</span><span class="off">${off}% off</span>` : ''}
          </div>
          <a class="btn ${buy.wa ? 'btn-wa' : 'btn-primary'} btn-sm btn-block" href="${esc(buy.href)}"
             ${buy.external ? 'target="_blank" rel="noopener"' : ''}>${buy.wa ? ICONS.wa : ''}${esc(buy.label)}</a>
        </div>
      </article>`;
  }

  function videoCard(v, products) {
    const product = products.find((p) => p.id === v.productId);
    return `
      <button type="button" class="video-card" data-video-id="${esc(v.id)}">
        <div class="video-thumb">${videoThumb(v)}<span class="play">${ICONS.play}</span></div>
        <div class="video-info">
          ${product ? `<span class="video-tag">${esc(product.name)}</span>` : ''}
          <h3>${esc(v.title)}</h3>
          ${v.description ? `<p>${esc(v.description)}</p>` : ''}
        </div>
      </button>`;
  }

  /* ---- Video modal (shared) ---- */
  function setupVideoModal(videos) {
    let dialog = document.getElementById('videoModal');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'videoModal';
      dialog.className = 'video-modal';
      dialog.innerHTML = `
        <div class="modal-frame">
          <button type="button" class="modal-close" aria-label="Close video">&times;</button>
          <div class="modal-player"></div>
        </div>
        <div class="modal-caption"><h3></h3><p></p></div>`;
      document.body.appendChild(dialog);
      const close = () => dialog.close();
      dialog.querySelector('.modal-close').addEventListener('click', close);
      dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
      dialog.addEventListener('close', () => { dialog.querySelector('.modal-player').innerHTML = ''; });
    }

    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-video-id]');
      if (!card) return;
      const v = videos.find((x) => x.id === card.dataset.videoId);
      if (!v) return;
      const player = dialog.querySelector('.modal-player');
      if (v.source === 'youtube') {
        const id = youtubeId(v.url);
        player.innerHTML = id
          ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}?autoplay=1&rel=0" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
          : `<p style="color:#fff;padding:40px;text-align:center">This video link is not valid.</p>`;
      } else {
        const poster = v.poster ? img(v.poster, 1280) : videoPoster(v.url, 1280);
        player.innerHTML = `<video src="${esc(v.url)}" ${poster ? `poster="${esc(poster)}"` : ''} controls autoplay playsinline></video>`;
      }
      dialog.querySelector('.modal-caption h3').textContent = v.title;
      dialog.querySelector('.modal-caption p').textContent = v.description || '';
      dialog.showModal();
    });
  }

  /* ---- Header, footer & contact bits shared by every page ---- */
  function applySettings(s) {
    const bar = document.getElementById('announceBar');
    if (bar && s.announcement) {
      bar.textContent = s.announcement;
      bar.hidden = false;
    }

    const wa = waLink(s.whatsapp, 'Hi DetanZa, I have a question.');
    document.querySelectorAll('[data-wa-link]').forEach((a) => {
      if (wa) {
        a.href = wa;
        a.target = '_blank';
        a.rel = 'noopener';
        a.hidden = false;
      } else {
        a.hidden = true;
      }
    });

    const socials = ['instagram', 'facebook', 'youtube']
      .filter((k) => s[k])
      .map((k) => `<a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${k}">${ICONS[k]}</a>`);
    if (s.email) socials.push(`<a href="mailto:${esc(s.email)}" aria-label="Email">${ICONS.email}</a>`);
    document.querySelectorAll('[data-socials]').forEach((el) => {
      el.innerHTML = socials.join('');
      el.hidden = !socials.length;
    });

    document.querySelectorAll('[data-setting]').forEach((el) => {
      const val = s[el.dataset.setting];
      if (val) el.textContent = val;
    });

    const contact = document.getElementById('footerContact');
    if (contact) {
      const items = [];
      if (s.phone) items.push(`<li><a href="tel:${esc(s.phone.replace(/\s/g, ''))}">${esc(s.phone)}</a></li>`);
      if (s.email) items.push(`<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`);
      if (wa) items.push(`<li><a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp us</a></li>`);
      if (s.address) items.push(`<li>${esc(s.address)}</li>`);
      contact.innerHTML = items.join('') || '<li>Contact details coming soon</li>';
    }

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  function setupMenu() {
    const btn = document.querySelector('[data-menu-toggle]');
    const nav = document.getElementById('mainNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  async function loadContent() {
    try {
      const res = await fetch('/api/content', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return {
        settings: { ...FALLBACK.settings, ...(data.settings || {}) },
        products: (data.products || []).filter((p) => p.visible !== false),
        videos: (data.videos || []).filter((v) => v.visible !== false),
      };
    } catch (err) {
      console.warn('[DetanZa] Could not load live content, showing defaults.', err);
      return structuredClone(FALLBACK);
    }
  }

  setupMenu();
  const ready = loadContent().then((content) => {
    applySettings(content.settings);
    setupVideoModal(content.videos);
    return content;
  });

  window.DZ = { ready, esc, money, discount, waLink, buyLink, productUrl, productCard, videoCard, youtubeId, img, videoPoster, ICONS };
})();
