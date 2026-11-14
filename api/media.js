import { del } from '@vercel/blob';
import { CONTENT_PATH, isAuthed, isBlobUrl, readBody } from './_lib.js';

// Deletes uploaded images/videos that are no longer used, to save storage.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthed(req)) return res.status(401).json({ error: 'Please log in again.' });

  const urls = (Array.isArray(readBody(req).urls) ? readBody(req).urls : [])
    .filter((u) => isBlobUrl(u) && !new URL(u).pathname.endsWith(CONTENT_PATH))
    .slice(0, 50);

  if (!urls.length) return res.status(200).json({ deleted: 0 });

  try {
    await del(urls);
    return res.status(200).json({ deleted: urls.length });
  } catch (err) {
    console.error('media DELETE failed', err);
    return res.status(500).json({ error: 'Could not delete files.' });
  }
}
