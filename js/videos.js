/* DetanZa — How to Use page: video gallery with product filter */
DZ.ready.then(({ products, videos }) => {
  const { esc, videoCard } = DZ;
  const grid = document.getElementById('videoGrid');
  const filter = document.getElementById('videoFilter');

  const usedProducts = products.filter((p) => videos.some((v) => v.productId === p.id));
  const initial = new URLSearchParams(location.search).get('product') || '';
  let active = usedProducts.some((p) => p.id === initial) ? initial : '';

  if (usedProducts.length) {
    filter.innerHTML = [{ id: '', name: 'All videos' }, ...usedProducts]
      .map((p) => `<button type="button" class="chip" data-id="${esc(p.id)}" aria-pressed="${p.id === active}">${esc(p.name)}</button>`)
      .join('');
  }
  filter.hidden = !usedProducts.length;

  function render() {
    const list = videos.filter((v) => !active || v.productId === active);
    grid.innerHTML = list.length
      ? list.map((v) => videoCard(v, products)).join('')
      : `<div class="empty"><strong>Videos are coming soon</strong>We're preparing step-by-step guides for every product.</div>`;
  }

  filter.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    active = btn.dataset.id;
    filter.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
    render();
  });

  render();
});
