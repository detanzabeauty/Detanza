import { DEFAULT_CONTENT, isAuthed, normalizeContent, readBody, readContent, writeContent } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const content = await readContent();
      // Public pages are cached at the edge for 30s; the admin passes ?fresh=1
      res.setHeader(
        'Cache-Control',
        req.query && req.query.fresh ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=300'
      );
      return res.status(200).json(content);
    } catch (err) {
      console.error('content GET failed', err);
      if (req.query && req.query.fresh) {
        return res.status(500).json({ error: 'Could not load content from the database. ' + (err.message || '') });
      }
      // Keep the public site working with the default content.
      res.setHeader('Cache-Control', 'public, s-maxage=10');
      return res.status(200).json({ ...DEFAULT_CONTENT, updatedAt: null, fallback: true });
    }
  }

  if (req.method === 'PUT') {
    res.setHeader('Cache-Control', 'no-store');
    if (!isAuthed(req)) return res.status(401).json({ error: 'Please log in again.' });
    try {
      const clean = normalizeContent(readBody(req));
      await writeContent(clean);
      return res.status(200).json(clean);
    } catch (err) {
      console.error('content PUT failed', err);
      return res.status(500).json({ error: 'Could not save. ' + (err.message || '') });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
