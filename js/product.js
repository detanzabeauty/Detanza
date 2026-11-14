/* DetanZa — product detail page (/product?id=...) */
DZ.ready.then(({ settings, products, videos }) => {
  const { esc, money, discount, buyLink, waLink, productCard, videoCard, ICONS } = DZ;
  const root = document.getElementById('productRoot');
  const id = new URLSearchParams(location.search).get('id');
  const p = products.find((x) => x.id === id);

  if (!p) {
    document.title = 'Product not found — DetanZa™';
    root.innerHTML = `
      <div class="notice">
        <h1>Product not found</h1>
        <p>This product may have been removed or the link is incorrect.</p>
        <a class="btn btn-primary" href="/#shop">Back to Shop</a>
      </div>`;
    return;
  }

  document.title = `${p.name} — DetanZa™`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = p.tagline || (p.description || "").slice(0, 150) || desc.content;

  const images = [p.image, ...(p.gallery || [])].filter(Boolean);
  const off = discount(p);
  const buy = buyLink(p, settings);
  const ask = waLink(settings.whatsapp, `Hi DetanZa, I have a question about ${p.name}.`);
  const related = videos.filter((v) => v.productId === p.id);

  const mainImg = images.length
    ? `<img id="pdpMainImg" src="${esc(images[0])}" alt="${esc(p.name)}">`
    : `<div class="noimg" style="display:flex;align-items:center;justify-content:center;height:100%;padding:25%"><img src="/logo-cropped.png" alt="" style="opacity:.5;height:auto"></div>`;

  root.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="/#shop">Shop</a>
      ${p.category ? `<span>/</span><span>${esc(p.category)}</span>` : ''}
    </nav>
    <div class="pdp">
      <div class="pdp-gallery">
        <div class="pdp-main">${mainImg}</div>
        ${images.length > 1 ? `<div class="pdp-thumbs">${images
          .map((src, i) => `<button type="button" data-src="${esc(src)}" aria-current="${i === 0}" aria-label="Show image ${i + 1}"><img src="${esc(src)}" alt=""></button>`)
          .join('')}</div>` : ''}
      </div>
      <div class="pdp-info">
        ${p.category ? `<span class="product-cat">${esc(p.category)}</span>` : ''}
        <h1>${esc(p.name)}</h1>
        ${p.tagline ? `<p class="pdp-tagline">${esc(p.tagline)}</p>` : ''}
        ${p.size ? `<span class="pdp-size">${esc(p.size)}</span>` : ''}
        <div class="price-row">
          ${p.price != null ? `<span class="price">${money(p.price)}</span>` : ''}
          ${off ? `<span class="mrp">MRP ${money(p.mrp)}</span><span class="off">${off}% off</span>` : ''}
        </div>
        ${p.price != null ? `<p class="tax-note">Inclusive of all taxes</p>` : ''}
        <div class="pdp-actions">
          <a class="btn ${buy.wa ? 'btn-wa' : 'btn-primary'}" href="${esc(buy.href)}" ${buy.external ? 'target="_blank" rel="noopener"' : ''}>${buy.wa ? ICONS.wa : ''}${esc(buy.label)}</a>
          ${ask && !buy.wa ? `<a class="btn btn-light" href="${esc(ask)}" target="_blank" rel="noopener">${ICONS.wa} Ask a question</a>` : ''}
          ${related.length ? `<a class="btn btn-outline" href="#howto">Watch How to Use</a>` : ''}
        </div>
        ${p.description ? `<div class="pdp-block"><h2>Description</h2><p>${esc(p.description)}</p></div>` : ''}
        ${(p.benefits || []).length ? `<div class="pdp-block"><h2>Key Benefits</h2><ul class="benefit-list">${p.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>` : ''}
        ${(p.howToUse || []).length ? `<div class="pdp-block"><h2>How to Use</h2><ol class="step-list">${p.howToUse.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
        ${p.ingredients ? `<div class="pdp-block"><h2>Ingredients</h2><p>${esc(p.ingredients)}</p></div>` : ''}
      </div>
    </div>
    ${related.length ? `
      <section id="howto" style="padding-bottom:56px">
        <div class="section-head"><div><h2>How to Use — Video</h2><p>Watch and follow along.</p></div></div>
        <div class="video-grid">${related.map((v) => videoCard(v, products)).join('')}</div>
      </section>` : ''}`;

  // Gallery thumbnails
  root.querySelectorAll('.pdp-thumbs button').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.getElementById('pdpMainImg').src = btn.dataset.src;
      root.querySelectorAll('.pdp-thumbs button').forEach((b) => b.setAttribute('aria-current', String(b === btn)));
    })
  );

  // Related products: same category first
  const others = products
    .filter((x) => x.id !== p.id)
    .sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category))
    .slice(0, 4);
  if (others.length) {
    document.getElementById('relatedGrid').innerHTML = others.map((x) => productCard(x, settings)).join('');
    document.getElementById('relatedSection').hidden = false;
  }
});
