/* DetanZa — home page: hero image, shop grid with search/filter, videos, contact */
DZ.ready.then(({ settings, products, videos }) => {
  const { esc, productCard, videoCard, waLink, img, ICONS } = DZ;

  // Hero: an admin-uploaded banner image replaces the 3D box
  const stage = document.getElementById('heroStage');
  if (settings.heroImage && stage) {
    stage.outerHTML = `<img class="hero-custom" src="${esc(img(settings.heroImage, 900))}" alt="DetanZa™ products" fetchpriority="high">`;
  }

  // Spotlight "Order Now" → WhatsApp with Tan Vanish pre-filled
  const spotOrder = document.getElementById('spotOrder');
  const tanVanish = products.find((p) => p.id === 'tan-vanish-cream');
  if (spotOrder && tanVanish) {
    const buy = DZ.buyLink(tanVanish, settings);
    spotOrder.href = buy.href;
    if (buy.external) { spotOrder.target = '_blank'; spotOrder.rel = 'noopener'; }
  }

  // Shop: featured first, then the admin's order
  const sorted = [...products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const grid = document.getElementById('productGrid');
  const chips = document.getElementById('categoryChips');
  const search = document.getElementById('searchInput');
  const categories = [...new Set(sorted.map((p) => p.category).filter(Boolean))];
  let activeCat = '';

  chips.innerHTML = categories.length
    ? ['All', ...categories]
        .map((c, i) => `<button type="button" class="chip" data-cat="${i ? esc(c) : ''}" aria-pressed="${i === 0}">${esc(c)}</button>`)
        .join('')
    : '';
  chips.hidden = !categories.length;

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = sorted.filter(
      (p) =>
        (!activeCat || p.category === activeCat) &&
        (!q || [p.name, p.tagline, p.category, p.description].join(' ').toLowerCase().includes(q))
    );
    if (!products.length) {
      grid.innerHTML = `<div class="empty"><strong>New products are coming soon</strong>Check back shortly, or message us on WhatsApp.</div>`;
    } else if (!list.length) {
      grid.innerHTML = `<div class="empty"><strong>No products found</strong>Try a different search or category.</div>`;
    } else {
      grid.innerHTML = list.map((p) => productCard(p, settings)).join('');
    }
  }

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    activeCat = btn.dataset.cat;
    chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
    render();
  });
  search.addEventListener('input', render);
  render();

  // Latest videos (up to 3)
  if (videos.length) {
    document.getElementById('videoGrid').innerHTML = videos.slice(0, 3).map((v) => videoCard(v, products)).join('');
    document.getElementById('videos').hidden = false;
  }

  // Contact cards
  const cards = [];
  const wa = waLink(settings.whatsapp, 'Hi DetanZa, I have a question.');
  if (wa) cards.push(`<a class="contact-card" href="${esc(wa)}" target="_blank" rel="noopener"><span class="trust-icon">${ICONS.wa}</span><strong>WhatsApp</strong><span>Chat with us for orders &amp; help</span></a>`);
  if (settings.phone) cards.push(`<a class="contact-card" href="tel:${esc(settings.phone.replace(/\s/g, ''))}"><span class="trust-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span><strong>Call us</strong><span>${esc(settings.phone)}</span></a>`);
  if (settings.email) cards.push(`<a class="contact-card" href="mailto:${esc(settings.email)}"><span class="trust-icon">${ICONS.email}</span><strong>Email</strong><span>${esc(settings.email)}</span></a>`);
  if (settings.address) cards.push(`<div class="contact-card"><span class="trust-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span><strong>Visit</strong><span>${esc(settings.address)}</span></div>`);
  document.getElementById('contactGrid').innerHTML =
    cards.join('') || `<div class="empty"><strong>Contact details coming soon</strong></div>`;
});
