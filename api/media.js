import { cloudinaryConfig, cloudinarySign, isAuthed, parseMediaUrl, readBody } from './_lib.js';

// Deletes uploaded images/videos from Cloudinary when they are no longer used.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthed(req)) return res.status(401).json({ error: 'Please log in again.' });

  const body = readBody(req);
  const targets = (Array.isArray(body.urls) ? body.urls : [])
    .slice(0, 50)
    .map(parseMediaUrl)
    .filter(Boolean);
  if (!targets.length) return res.status(200).json({ deleted: 0 });

  let config;
  try {
    config = cloudinaryConfig();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const results = await Promise.allSettled(
    targets.map(async ({ resourceType, publicId }) => {
      const params = { invalidate: 'true', public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
      const form = new URLSearchParams({
        ...params,
        timestamp: String(params.timestamp),
        api_key: config.apiKey,
        signature: cloudinarySign(params, config.apiSecret),
      });
      const r = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`, {
        method: 'POST',
        body: form,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data.result !== 'ok' && data.result !== 'not found')) {
        throw new Error(data.error?.message || data.result || `HTTP ${r.status}`);
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) console.error('media delete failures', failed.map((f) => f.reason?.message));
  return res.status(200).json({ deleted: targets.length - failed.length, failed: failed.length });
}
