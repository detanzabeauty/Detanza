/* ==========================================================================
   DetanZa — shared server helpers (auth, content storage, validation)
   Files in /api that start with "_" are not exposed as routes by Vercel.
   ========================================================================== */
import crypto from 'node:crypto';
import { get, put } from '@vercel/blob';

export const CONTENT_PATH = 'site/content.json';
const COOKIE_NAME = 'dz_admin';
const SESSION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const DEFAULT_CONTENT = {
  settings: {
    announcement: 'Welcome to DetanZa™ — order easily on WhatsApp',
    heroEyebrow: 'New from DetanZa™',
    heroTitle: 'Reveal your natural glow',
    heroSubtitle: 'Skin-loving beauty essentials made for everyday care. Watch how to use every product and order in one tap.',
    heroCta: 'Shop Now',
    heroImage: '',
    aboutTitle: 'About DetanZa™',
    aboutText: 'DetanZa™ is a beauty and skincare brand focused on simple, effective care for every skin. We create products you will love to use every day — and show you exactly how to use them for the best results.',
    whatsapp: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  products: [],
  videos: [],
};

/* ---------------- Auth ---------------- */
function adminPassword() {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error('ADMIN_PASSWORD is not configured on the server.');
  return p;
}

function sign(value) {
  return crypto
    .createHmac('sha256', `detanza-session:${adminPassword()}`)
    .update(value)
    .digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(input) {
  return safeEqual(input || '', adminPassword());
}

export function sessionCookie() {
  const exp = String(Date.now() + SESSION_SECONDS * 1000);
  return `${COOKIE_NAME}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export const clearedCookie = `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAuthed(req) {
  try {
    const raw = req.headers.cookie || '';
    const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (!match) return false;
    const [exp, sig] = match[1].split('.');
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    return safeEqual(sig, sign(exp));
  } catch {
    return false;
  }
}

export function readBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return {}; }
  }
  return b;
}

/* ---------------- Validation ---------------- */
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};
const bool = (v, fallback = false) => (typeof v === 'boolean' ? v : fallback);
const url = (v) => {
  const s = str(v, 1000);
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
};
const lines = (v, maxItems = 20, maxLen = 300) =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : [])
    .map((x) => str(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
const id = (v) => {
  const s = str(v, 60).replace(/[^a-z0-9-]/gi, '');
  return s || crypto.randomBytes(6).toString('hex');
};

export function normalizeContent(input) {
  const src = input && typeof input === 'object' ? input : {};
  const s = src.settings || {};
  const d = DEFAULT_CONTENT.settings;

  const settings = {
    announcement: str(s.announcement ?? d.announcement, 200),
    heroEyebrow: str(s.heroEyebrow ?? d.heroEyebrow, 80),
    heroTitle: str(s.heroTitle ?? d.heroTitle, 120),
    heroSubtitle: str(s.heroSubtitle ?? d.heroSubtitle, 400),
    heroCta: str(s.heroCta ?? d.heroCta, 40),
    heroImage: url(s.heroImage),
    aboutTitle: str(s.aboutTitle ?? d.aboutTitle, 120),
    aboutText: str(s.aboutText ?? d.aboutText, 3000),
    whatsapp: str(s.whatsapp, 20).replace(/[^\d]/g, ''),
    email: str(s.email, 120),
    phone: str(s.phone, 30),
    address: str(s.address, 300),
    instagram: url(s.instagram),
    facebook: url(s.facebook),
    youtube: url(s.youtube),
  };

  const products = (Array.isArray(src.products) ? src.products : [])
    .slice(0, 300)
    .map((p) => ({
      id: id(p.id),
      name: str(p.name, 120),
      tagline: str(p.tagline, 200),
      category: str(p.category, 60),
      price: num(p.price),
      mrp: num(p.mrp),
      size: str(p.size, 40),
      badge: str(p.badge, 30),
      image: url(p.image),
      gallery: (Array.isArray(p.gallery) ? p.gallery : []).map(url).filter(Boolean).slice(0, 8),
      description: str(p.description, 5000),
      benefits: lines(p.benefits),
      ingredients: str(p.ingredients, 3000),
      howToUse: lines(p.howToUse),
      buyLink: url(p.buyLink),
      featured: bool(p.featured),
      visible: bool(p.visible, true),
    }))
    .filter((p) => p.name);

  const videos = (Array.isArray(src.videos) ? src.videos : [])
    .slice(0, 300)
    .map((v) => ({
      id: id(v.id),
      title: str(v.title, 150),
      description: str(v.description, 1000),
      source: v.source === 'youtube' ? 'youtube' : 'upload',
      url: url(v.url),
      poster: url(v.poster),
      productId: str(v.productId, 60),
      visible: bool(v.visible, true),
    }))
    .filter((v) => v.title && v.url);

  return { settings, products, videos, updatedAt: new Date().toISOString() };
}

/* ---------------- Storage (Vercel Blob) ---------------- */
export async function readContent() {
  let result = null;
  try {
    // useCache:false reads straight from storage so admin edits show up immediately
    result = await get(CONTENT_PATH, { access: 'public', useCache: false });
  } catch (err) {
    if (err && err.name === 'BlobNotFoundError') result = null;
    else throw err;
  }
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { ...structuredClone(DEFAULT_CONTENT), updatedAt: null };
  }
  const text = await new Response(result.stream).text();
  const data = JSON.parse(text);
  return { ...normalizeContent(data), updatedAt: data.updatedAt || null };
}

export async function writeContent(content) {
  await put(CONTENT_PATH, JSON.stringify(content), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export function isBlobUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}
