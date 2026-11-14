import { cloudinaryConfig, cloudinarySign, isAuthed, readBody } from './_lib.js';

const RULES = {
  image: { folder: 'detanza/images', formats: 'jpg,jpeg,png,webp,avif,gif' },
  video: { folder: 'detanza/videos', formats: 'mp4,webm,mov' },
};

// Returns a short-lived signature so the admin's browser can upload images and
// videos straight to Cloudinary (the API secret never leaves the server).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthed(req)) return res.status(401).json({ error: 'Please log in again.' });

  const kind = readBody(req).kind === 'video' ? 'video' : 'image';
  const rule = RULES[kind];
  try {
    const { apiKey, apiSecret, cloudName } = cloudinaryConfig();
    const params = {
      allowed_formats: rule.formats,
      folder: rule.folder,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return res.status(200).json({
      cloudName,
      apiKey,
      resourceType: kind,
      params,
      signature: cloudinarySign(params, apiSecret),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
