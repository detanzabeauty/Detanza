import { checkPassword, clearedCookie, isAuthed, readBody, sessionCookie } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ authed: isAuthed(req) });
  }

  if (req.method === 'POST') {
    let ok = false;
    try {
      ok = checkPassword(readBody(req).password);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!ok) {
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return res.status(401).json({ error: 'Wrong password.' });
    }
    res.setHeader('Set-Cookie', sessionCookie());
    return res.status(200).json({ authed: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearedCookie);
    return res.status(200).json({ authed: false });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
