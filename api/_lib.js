/* ==========================================================================
   DetanZa — shared server helpers (auth, content storage, validation)
   Files in /api that start with "_" are not exposed as routes by Vercel.
   ========================================================================== */
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';
import defaults from '../data/defaults.js';

const CONTENT_COLLECTION = 'site';
const CONTENT_ID = 'content';
const COOKIE_NAME = 'dz_admin';
const SESSION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const DEFAULT_CONTENT = defaults;

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
  // Site-relative asset paths like /images/tan-vanish/front.webp
  if (/^\/(?!\/)[A-Za-z0-9._\-/]+$/.test(s)) return s;
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
      ingredients: str(p.ingredients, 4000),
      caution: str(p.caution, 3000),
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

/* ---------------- Data storage (MongoDB) ---------------- */
// Reuse one connection across serverless invocations.
function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured on the server.');
  if (!globalThis.__dzMongo) {
    globalThis.__dzMongo = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
      .connect()
      .catch((err) => {
        globalThis.__dzMongo = null;
        throw err;
      });
  }
  return globalThis.__dzMongo.then((client) => client.db(process.env.MONGODB_DB || 'detanza'));
}

export async function readContent() {
  const db = await getDb();
  const doc = await db.collection(CONTENT_COLLECTION).findOne({ _id: CONTENT_ID });
  if (!doc) return { ...structuredClone(DEFAULT_CONTENT), updatedAt: null };
  const { _id, ...data } = doc;
  return { ...normalizeContent(data), updatedAt: data.updatedAt || null };
}

export async function writeContent(content) {
  const db = await getDb();
  await db
    .collection(CONTENT_COLLECTION)
    .replaceOne({ _id: CONTENT_ID }, { _id: CONTENT_ID, ...content }, { upsert: true });
}

/* ---------------- Media storage (Cloudinary) ---------------- */
export function cloudinaryConfig() {
  const raw = process.env.CLOUDINARY_URL || '';
  const m = raw.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) throw new Error('CLOUDINARY_URL is not configured on the server.');
  return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
}

/** Cloudinary signature: sorted "k=v&k2=v2" + api_secret, SHA-1 hex. */
export function cloudinarySign(params, apiSecret) {
  const str = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(str + apiSecret).digest('hex');
}

/** Returns { resourceType, publicId } for a URL in our Cloudinary account, else null. */
export function parseMediaUrl(value) {
  try {
    const { cloudName } = cloudinaryConfig();
    const u = new URL(value);
    if (u.hostname !== 'res.cloudinary.com') return null;
    const parts = u.pathname.split('/').filter(Boolean); // [cloud, type, 'upload', ..., 'v123', ...id]
    if (parts[0] !== cloudName || parts[2] !== 'upload') return null;
    const resourceType = parts[1];
    if (!['image', 'video'].includes(resourceType)) return null;
    let rest = parts.slice(3);
    const vIdx = rest.findIndex((p) => /^v\d+$/.test(p));
    if (vIdx >= 0) rest = rest.slice(vIdx + 1);
    const publicId = decodeURIComponent(rest.join('/')).replace(/\.[^/.]+$/, '');
    if (!publicId.startsWith('detanza/')) return null; // only delete files this site uploaded
    return { resourceType, publicId };
  } catch {
    return null;
  }
}
