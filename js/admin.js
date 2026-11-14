/* ==========================================================================
   DetanZa — Admin panel
   Products, how-to videos and site settings, saved via /api (MongoDB + Cloudinary).
   ========================================================================== */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif,image/gif';
const VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime';
const MAX_IMAGE_MB = 10;   // Cloudinary free plan limit
const MAX_VIDEO_MB = 100;  // Cloudinary free plan limit
const CHUNK_BYTES = 20 * 1024 * 1024;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n == null ? '' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const makeId = (name) => `${slugify(name) || 'item'}-${Math.random().toString(36).slice(2, 6)}`;
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);
const isMediaUrl = (s) => {
  try { return new URL(s).hostname === 'res.cloudinary.com'; } catch { return false; }
};

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

let content = null;

/* ---------------- API ---------------- */
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && path !== '/api/login') {
    showLogin('Your session has expired. Please log in again.');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(message, type = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast show ${type === 'error' ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------------- Media helpers ---------------- */
function mediaUrls(c) {
  const set = new Set();
  if (!c) return set;
  if (c.settings?.heroImage) set.add(c.settings.heroImage);
  (c.products || []).forEach((p) => {
    if (p.image) set.add(p.image);
    (p.gallery || []).forEach((g) => set.add(g));
  });
  (c.videos || []).forEach((v) => {
    if (v.url) set.add(v.url);
    if (v.poster) set.add(v.poster);
  });
  return set;
}

async function deleteMedia(urls) {
  const list = urls.filter(isMediaUrl);
  if (!list.length) return;
  try { await api('DELETE', '/api/media', { urls: list }); } catch { /* not critical */ }
}

/** Delete files uploaded in a form that never got saved. */
function cleanupUploads(uploads) {
  const used = mediaUrls(content);
  const unused = [...uploads].filter((u) => !used.has(u));
  uploads.clear();
  deleteMedia(unused);
}

/** POST one request to Cloudinary with upload progress. */
function xhrUpload(url, form, headers, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(form);
  });
}

/** Upload a file directly to Cloudinary using a signature from /api/upload. */
async function uploadFile(file, kind, onProgress) {
  const sig = await api('POST', '/api/upload', { kind });
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/${sig.resourceType}/upload`;
  const makeForm = (blob) => {
    const fd = new FormData();
    fd.append('file', blob, file.name);
    fd.append('api_key', sig.apiKey);
    fd.append('signature', sig.signature);
    Object.entries(sig.params).forEach(([k, v]) => fd.append(k, String(v)));
    return fd;
  };
  const report = (pct) => onProgress && onProgress(Math.min(100, pct));

  let result;
  if (file.size <= CHUNK_BYTES) {
    result = await xhrUpload(endpoint, makeForm(file), null, (p) => report(p * 100));
  } else {
    // Large videos: upload in chunks so a slow connection doesn't time out.
    const uploadId = `dz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    for (let start = 0; start < file.size; start += CHUNK_BYTES) {
      const end = Math.min(start + CHUNK_BYTES, file.size);
      result = await xhrUpload(
        endpoint,
        makeForm(file.slice(start, end)),
        { 'X-Unique-Upload-Id': uploadId, 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` },
        (p) => report(((start + p * (end - start)) / file.size) * 100)
      );
    }
  }
  if (!result || !result.secure_url) throw new Error('Upload did not finish. Please try again.');
  return result.secure_url;
}

function checkFile(file, kind) {
  const types = (kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES).split(',');
  const maxMb = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (!types.includes(file.type)) {
    return kind === 'video' ? 'Please choose an MP4, WebM or MOV video.' : 'Please choose a JPG, PNG, WebP, AVIF or GIF image.';
  }
  if (file.size > maxMb * 1024 * 1024) return `File is too large. Maximum is ${maxMb} MB.`;
  return '';
}

/** Single image/video picker: upload a file or paste a URL. */
function mediaField(el, { kind, uploads }) {
  el.innerHTML = `
    <div class="media-field">
      <div class="media-row">
        <div class="media-preview ${kind === 'video' ? 'video' : ''}"></div>
        <div class="media-controls">
          <div class="media-buttons">
            <label class="btn btn-light btn-sm">Upload ${kind}<input type="file" accept="${kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES}" hidden></label>
            <button type="button" class="btn btn-light btn-sm" data-remove hidden>Remove</button>
          </div>
          <input type="url" class="media-url" placeholder="…or paste a${kind === 'image' ? 'n image' : ' video'} URL" aria-label="${kind} URL">
          <div class="progress" hidden><div></div></div>
          <span class="media-status" aria-live="polite"></span>
        </div>
      </div>
    </div>`;
  const preview = $('.media-preview', el);
  const fileInput = $('input[type="file"]', el);
  const urlInput = $('.media-url', el);
  const removeBtn = $('[data-remove]', el);
  const progress = $('.progress', el);
  const bar = $('.progress > div', el);
  const status = $('.media-status', el);
  let value = '';
  let busy = false;

  function set(url) {
    value = url || '';
    urlInput.value = value;
    removeBtn.hidden = !value;
    preview.innerHTML = value
      ? kind === 'video'
        ? `<video src="${esc(value)}#t=0.5" muted preload="metadata" playsinline></video>`
        : `<img src="${esc(value)}" alt="">`
      : `No ${kind}`;
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const problem = checkFile(file, kind);
    if (problem) { status.textContent = problem; return; }
    busy = true;
    progress.hidden = false;
    bar.style.width = '0%';
    status.textContent = `Uploading ${file.name}…`;
    try {
      const url = await uploadFile(file, kind, (pct) => {
        bar.style.width = `${pct}%`;
        status.textContent = `Uploading… ${Math.round(pct)}%`;
      });
      uploads.add(url);
      set(url);
      status.textContent = 'Uploaded ✓ — remember to save.';
    } catch (err) {
      status.textContent = 'Upload failed: ' + (err.message || 'please try again');
    } finally {
      busy = false;
      progress.hidden = true;
    }
  });
  urlInput.addEventListener('change', () => {
    const v = urlInput.value.trim();
    if (v && !isHttpUrl(v)) { status.textContent = 'Please paste a full link starting with https://'; return; }
    status.textContent = '';
    set(v);
  });
  removeBtn.addEventListener('click', () => { set(''); status.textContent = ''; });

  set('');
  return { get: () => value, set: (v) => { set(v); status.textContent = ''; }, isBusy: () => busy };
}

/** Multiple images (product gallery). */
function galleryField(el, { uploads }) {
  el.innerHTML = `
    <div class="media-field">
      <div class="gallery-list"></div>
      <label class="btn btn-light btn-sm">+ Add images<input type="file" accept="${IMAGE_TYPES}" multiple hidden></label>
      <span class="media-status" aria-live="polite"></span>
    </div>`;
  const listEl = $('.gallery-list', el);
  const input = $('input[type="file"]', el);
  const status = $('.media-status', el);
  let items = [];
  let busy = 0;

  function render() {
    listEl.innerHTML = items
      .map((u, i) => `<div class="gallery-item"><img src="${esc(u)}" alt=""><button type="button" data-i="${i}" aria-label="Remove image">&times;</button></div>`)
      .join('');
  }
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    items.splice(Number(b.dataset.i), 1);
    render();
  });
  input.addEventListener('change', async () => {
    const files = [...input.files].slice(0, 8 - items.length);
    input.value = '';
    for (const file of files) {
      const problem = checkFile(file, 'image');
      if (problem) { status.textContent = `${file.name}: ${problem}`; continue; }
      busy++;
      status.textContent = `Uploading ${file.name}…`;
      try {
        const url = await uploadFile(file, 'image');
        uploads.add(url);
        items.push(url);
        render();
        status.textContent = 'Uploaded ✓ — remember to save.';
      } catch (err) {
        status.textContent = 'Upload failed: ' + (err.message || 'please try again');
      } finally {
        busy--;
      }
    }
  });

  return {
    get: () => [...items],
    set: (arr) => { items = [...(arr || [])]; status.textContent = ''; render(); },
    isBusy: () => busy > 0,
  };
}

/* ---------------- Saving ---------------- */
async function save(next, message) {
  const before = mediaUrls(content);
  const saved = await api('PUT', '/api/content', next);
  content = saved;
  renderAll();
  const after = mediaUrls(saved);
  deleteMedia([...before].filter((u) => !after.has(u)));
  toast(message || 'Saved ✓  Changes appear on the website within a minute.');
}

/* ---------------- Auth & views ---------------- */
function showLogin(message = '') {
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
  $('#loginError').textContent = message;
  $$('dialog[open]').forEach((d) => d.close());
  $('#loginPassword').focus();
}

async function enterApp() {
  content = await api('GET', `/api/content?fresh=1&t=${Date.now()}`);
  $('#loginView').hidden = true;
  $('#appView').hidden = false;
  renderAll();
  fillSettings();
  const tab = location.hash.slice(1);
  if (['products', 'videos', 'settings'].includes(tab)) selectTab(tab);
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in…';
  $('#loginError').textContent = '';
  try {
    await api('POST', '/api/login', { password: $('#loginPassword').value });
    $('#loginPassword').value = '';
    await enterApp();
  } catch (err) {
    $('#loginError').textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log in';
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  try { await api('DELETE', '/api/login'); } catch { /* ignore */ }
  showLogin();
});

/* ---------------- Tabs ---------------- */
function selectTab(name) {
  $$('.admin-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  $$('.panel').forEach((p) => { p.hidden = p.id !== `panel-${name}`; });
  history.replaceState(null, '', `#${name}`);
}
$$('.admin-tab').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));

/* ---------------- Lists ---------------- */
const ICON_UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';
const ICON_DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const ICON_TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
const ICON_VIEW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

function moveButtons(i, len) {
  return `
    <button type="button" class="icon-btn" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ICON_UP}</button>
    <button type="button" class="icon-btn" data-act="down" data-i="${i}" ${i === len - 1 ? 'disabled' : ''} aria-label="Move down">${ICON_DOWN}</button>`;
}

function renderProducts() {
  const products = content.products || [];
  $('#productCount').textContent = products.length;
  $('#productList').innerHTML = products.length
    ? products
        .map(
          (p, i) => `
      <div class="item ${p.visible === false ? 'is-hidden' : ''}">
        <div class="item-thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : '—'}</div>
        <div class="item-main">
          <div class="item-title">${esc(p.name)}</div>
          <div class="item-meta">
            <span>${money(p.price)}${p.mrp && p.mrp > p.price ? ` <s>${money(p.mrp)}</s>` : ''}</span>
            ${p.category ? `<span>${esc(p.category)}</span>` : ''}
            ${p.featured ? '<span class="tag tag-pink">Featured</span>' : ''}
            ${p.visible === false ? '<span class="tag tag-grey">Hidden</span>' : ''}
          </div>
        </div>
        <div class="item-actions">
          ${moveButtons(i, products.length)}
          <a class="icon-btn" href="/product?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener" aria-label="View on website">${ICON_VIEW}</a>
          <button type="button" class="btn btn-light btn-sm" data-act="edit" data-i="${i}">Edit</button>
          <button type="button" class="icon-btn danger" data-act="delete" data-i="${i}" aria-label="Delete">${ICON_TRASH}</button>
        </div>
      </div>`
        )
        .join('')
    : `<div class="empty-admin"><strong>No products yet</strong>Click “+ Add product” to add your first product.</div>`;
}

function videoThumb(v) {
  if (v.poster) return `<img src="${esc(v.poster)}" alt="">`;
  if (v.source === 'youtube' && youtubeId(v.url)) return `<img src="https://i.ytimg.com/vi/${esc(youtubeId(v.url))}/default.jpg" alt="">`;
  if (v.source === 'upload') return `<video src="${esc(v.url)}#t=0.5" muted preload="metadata"></video>`;
  return '▶';
}

function renderVideos() {
  const videos = content.videos || [];
  $('#videoCount').textContent = videos.length;
  $('#videoList').innerHTML = videos.length
    ? videos
        .map((v, i) => {
          const product = (content.products || []).find((p) => p.id === v.productId);
          return `
      <div class="item ${v.visible === false ? 'is-hidden' : ''}">
        <div class="item-thumb">${videoThumb(v)}</div>
        <div class="item-main">
          <div class="item-title">${esc(v.title)}</div>
          <div class="item-meta">
            <span class="tag">${v.source === 'youtube' ? 'YouTube' : 'Uploaded'}</span>
            <span>${product ? esc(product.name) : 'General'}</span>
            ${v.visible === false ? '<span class="tag tag-grey">Hidden</span>' : ''}
          </div>
        </div>
        <div class="item-actions">
          ${moveButtons(i, videos.length)}
          <button type="button" class="btn btn-light btn-sm" data-act="edit" data-i="${i}">Edit</button>
          <button type="button" class="icon-btn danger" data-act="delete" data-i="${i}" aria-label="Delete">${ICON_TRASH}</button>
        </div>
      </div>`;
        })
        .join('')
    : `<div class="empty-admin"><strong>No videos yet</strong>Click “+ Add video” to upload a how-to-use video or add a YouTube link.</div>`;
}

function renderAll() {
  renderProducts();
  renderVideos();
}

async function listAction(e, key, openEditor, label) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const items = [...content[key]];
  const act = btn.dataset.act;
  if (act === 'edit') return openEditor(items[i]);

  let next = { ...content };
  if (act === 'up' || act === 'down') {
    const j = act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    next[key] = items;
  } else if (act === 'delete') {
    const name = items[i].name || items[i].title;
    if (!confirm(`Delete “${name}”? This cannot be undone.`)) return;
    const [removed] = items.splice(i, 1);
    next[key] = items;
    if (key === 'products') {
      next.videos = content.videos.map((v) => (v.productId === removed.id ? { ...v, productId: '' } : v));
    }
  } else {
    return;
  }
  try {
    await save(next, act === 'delete' ? `${label} deleted` : 'Order updated');
  } catch (err) {
    toast(err.message, 'error');
  }
}

$('#productList').addEventListener('click', (e) => listAction(e, 'products', openProduct, 'Product'));
$('#videoList').addEventListener('click', (e) => listAction(e, 'videos', openVideo, 'Video'));

/* ---------------- Dialog helpers ---------------- */
const fieldOf = (form, name) => form.elements.namedItem(name);
const valOf = (form, name) => (fieldOf(form, name).value || '').trim();

function wireDialog(dialog, uploads) {
  $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => cleanupUploads(uploads));
}

async function submitDialog(form, dialog, buildNext, message) {
  const error = $('[data-error]', form);
  const submit = $('[data-submit]', form);
  error.textContent = '';
  let next;
  try {
    next = buildNext();
  } catch (err) {
    error.textContent = err.message;
    return;
  }
  submit.disabled = true;
  const label = submit.textContent;
  submit.textContent = 'Saving…';
  try {
    await save(next, message);
    dialog.close();
  } catch (err) {
    error.textContent = err.message;
  } finally {
    submit.disabled = false;
    submit.textContent = label;
  }
}

/* ---------------- Product editor ---------------- */
const productDialog = $('#productDialog');
const productForm = $('#productForm');
const productUploads = new Set();
const productImage = mediaField($('[data-media="image"]', productForm), { kind: 'image', uploads: productUploads });
const productGallery = galleryField($('[data-gallery="gallery"]', productForm), { uploads: productUploads });
let editingProductId = null;
wireDialog(productDialog, productUploads);

function openProduct(p = null) {
  editingProductId = p ? p.id : null;
  productForm.reset();
  $('#productDialogTitle').textContent = p ? 'Edit product' : 'Add product';
  const set = (n, v) => { fieldOf(productForm, n).value = v ?? ''; };
  ['name', 'tagline', 'category', 'size', 'badge', 'description', 'ingredients', 'buyLink'].forEach((n) => set(n, p?.[n]));
  set('price', p?.price);
  set('mrp', p?.mrp);
  set('benefits', (p?.benefits || []).join('\n'));
  set('howToUse', (p?.howToUse || []).join('\n'));
  fieldOf(productForm, 'visible').checked = p ? p.visible !== false : true;
  fieldOf(productForm, 'featured').checked = !!p?.featured;
  productImage.set(p?.image);
  productGallery.set(p?.gallery);
  $('#categoryOptions').innerHTML = [...new Set(content.products.map((x) => x.category).filter(Boolean))]
    .map((c) => `<option value="${esc(c)}">`)
    .join('');
  $('[data-error]', productForm).textContent = '';
  productDialog.showModal();
  fieldOf(productForm, 'name').focus();
}

$('#addProductBtn').addEventListener('click', () => openProduct());

productForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitDialog(productForm, productDialog, () => {
    if (productImage.isBusy() || productGallery.isBusy()) throw new Error('Please wait for the upload to finish.');
    const name = valOf(productForm, 'name');
    const price = valOf(productForm, 'price');
    const mrp = valOf(productForm, 'mrp');
    const buyLink = valOf(productForm, 'buyLink');
    if (!name) throw new Error('Please enter the product name.');
    if (price === '' || Number(price) < 0) throw new Error('Please enter a valid selling price.');
    if (mrp !== '' && Number(mrp) < 0) throw new Error('MRP cannot be negative.');
    if (buyLink && !isHttpUrl(buyLink)) throw new Error('Buy link must start with https://');

    const product = {
      id: editingProductId || makeId(name),
      name,
      tagline: valOf(productForm, 'tagline'),
      category: valOf(productForm, 'category'),
      size: valOf(productForm, 'size'),
      badge: valOf(productForm, 'badge'),
      price: Number(price),
      mrp: mrp === '' ? null : Number(mrp),
      image: productImage.get(),
      gallery: productGallery.get(),
      description: valOf(productForm, 'description'),
      benefits: lines(fieldOf(productForm, 'benefits').value),
      howToUse: lines(fieldOf(productForm, 'howToUse').value),
      ingredients: valOf(productForm, 'ingredients'),
      buyLink,
      visible: fieldOf(productForm, 'visible').checked,
      featured: fieldOf(productForm, 'featured').checked,
    };
    const products = [...content.products];
    const idx = products.findIndex((x) => x.id === product.id);
    if (idx >= 0) products[idx] = product;
    else products.unshift(product);
    return { ...content, products };
  }, editingProductId ? 'Product updated ✓' : 'Product added ✓');
});

/* ---------------- Video editor ---------------- */
const videoDialog = $('#videoDialog');
const videoForm = $('#videoForm');
const videoUploads = new Set();
const videoFile = mediaField($('[data-media="videoFile"]', videoForm), { kind: 'video', uploads: videoUploads });
const videoPoster = mediaField($('[data-media="poster"]', videoForm), { kind: 'image', uploads: videoUploads });
let editingVideoId = null;
wireDialog(videoDialog, videoUploads);

function syncSource() {
  const source = videoForm.elements.namedItem('source').value;
  $$('[data-source]', videoForm).forEach((el) => { el.hidden = el.dataset.source !== source; });
}
$$('input[name="source"]', videoForm).forEach((r) => r.addEventListener('change', syncSource));

function openVideo(v = null) {
  editingVideoId = v ? v.id : null;
  videoForm.reset();
  $('#videoDialogTitle').textContent = v ? 'Edit video' : 'Add video';
  fieldOf(videoForm, 'title').value = v?.title || '';
  fieldOf(videoForm, 'description').value = v?.description || '';
  const select = fieldOf(videoForm, 'productId');
  select.innerHTML =
    '<option value="">— General (not linked to a product) —</option>' +
    content.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  select.value = v?.productId || '';
  const source = v?.source || 'upload';
  $(`input[name="source"][value="${source}"]`, videoForm).checked = true;
  videoFile.set(source === 'upload' ? v?.url : '');
  fieldOf(videoForm, 'youtubeUrl').value = source === 'youtube' ? v?.url || '' : '';
  videoPoster.set(v?.poster);
  fieldOf(videoForm, 'visible').checked = v ? v.visible !== false : true;
  syncSource();
  $('[data-error]', videoForm).textContent = '';
  videoDialog.showModal();
  fieldOf(videoForm, 'title').focus();
}

$('#addVideoBtn').addEventListener('click', () => openVideo());

videoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitDialog(videoForm, videoDialog, () => {
    if (videoFile.isBusy() || videoPoster.isBusy()) throw new Error('Please wait for the upload to finish.');
    const title = valOf(videoForm, 'title');
    const source = videoForm.elements.namedItem('source').value;
    const url = source === 'youtube' ? valOf(videoForm, 'youtubeUrl') : videoFile.get();
    if (!title) throw new Error('Please enter a video title.');
    if (!url) throw new Error(source === 'youtube' ? 'Please paste the YouTube link.' : 'Please upload a video file.');
    if (source === 'youtube' && !youtubeId(url)) throw new Error('That does not look like a valid YouTube link.');

    const video = {
      id: editingVideoId || makeId(title),
      title,
      description: valOf(videoForm, 'description'),
      productId: fieldOf(videoForm, 'productId').value,
      source,
      url,
      poster: videoPoster.get(),
      visible: fieldOf(videoForm, 'visible').checked,
    };
    const videos = [...content.videos];
    const idx = videos.findIndex((x) => x.id === video.id);
    if (idx >= 0) videos[idx] = video;
    else videos.unshift(video);
    return { ...content, videos };
  }, editingVideoId ? 'Video updated ✓' : 'Video added ✓');
});

/* ---------------- Settings ---------------- */
const settingsForm = $('#settingsForm');
const settingsUploads = new Set();
const heroImage = mediaField($('[data-media="heroImage"]', settingsForm), { kind: 'image', uploads: settingsUploads });
const SETTING_KEYS = [
  'announcement', 'heroEyebrow', 'heroTitle', 'heroSubtitle', 'heroCta', 'aboutTitle', 'aboutText',
  'whatsapp', 'phone', 'email', 'address', 'instagram', 'facebook', 'youtube',
];

function fillSettings() {
  const s = content.settings || {};
  SETTING_KEYS.forEach((k) => { fieldOf(settingsForm, k).value = s[k] || ''; });
  heroImage.set(s.heroImage);
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (heroImage.isBusy()) return toast('Please wait for the upload to finish.', 'error');
  const settings = { ...content.settings };
  SETTING_KEYS.forEach((k) => { settings[k] = valOf(settingsForm, k); });
  settings.whatsapp = settings.whatsapp.replace(/\D/g, '');
  settings.heroImage = heroImage.get();
  for (const k of ['instagram', 'facebook', 'youtube']) {
    if (settings[k] && !isHttpUrl(settings[k])) return toast(`${k} link must start with https://`, 'error');
  }
  if (settings.whatsapp && settings.whatsapp.length < 10) {
    return toast('WhatsApp number looks too short. Include the country code, e.g. 919876543210', 'error');
  }
  const btn = $('button[type="submit"]', settingsForm);
  btn.disabled = true;
  try {
    await save({ ...content, settings }, 'Settings saved ✓');
    settingsUploads.clear();
    fillSettings();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

/* ---------------- Start ---------------- */
(async function init() {
  try {
    const { authed } = await api('GET', '/api/login');
    if (authed) await enterApp();
    else showLogin();
  } catch (err) {
    showLogin('Could not reach the server: ' + err.message);
  }
})();
