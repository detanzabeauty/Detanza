import { handleUpload } from '@vercel/blob/client';
import { isAuthed, readBody } from './_lib.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO = 500 * 1024 * 1024; // 500 MB

// Issues short-lived upload tokens so the admin's browser can upload images and
// videos straight to Vercel Blob (bypassing the 4.5 MB serverless body limit).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handleUpload({
      body: readBody(req),
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAuthed(req)) throw new Error('Please log in again.');
        const folder = pathname.split('/')[0];
        if (folder === 'images') {
          return { allowedContentTypes: IMAGE_TYPES, maximumSizeInBytes: MAX_IMAGE, addRandomSuffix: true };
        }
        if (folder === 'videos') {
          return { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: MAX_VIDEO, addRandomSuffix: true };
        }
        throw new Error('Invalid upload location.');
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Upload failed.' });
  }
}
