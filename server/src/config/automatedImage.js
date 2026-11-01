import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryEnabled } from './cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
export const LOCAL_AUTOMATED_IMAGE = '/static/automated-complaint.jpg';

let cached = null;

// The picture attached to every sensor complaint.
// With Cloudinary set up it is uploaded there once (same public_id, never duplicated);
// otherwise it is served by this server from server/assets.
export function automatedImage() {
  if (!cached) {
    cached = (async () => {
      if (!cloudinaryEnabled()) return { url: LOCAL_AUTOMATED_IMAGE, publicId: null };
      try {
        const res = await cloudinary.uploader.upload(path.join(ASSETS_DIR, 'automated-complaint.jpg'), {
          public_id: 'community-outreach/automated-complaint',
          overwrite: false,
          resource_type: 'image',
        });
        return { url: res.secure_url, publicId: res.public_id };
      } catch (e) {
        console.error('Could not upload the automated-complaint image to Cloudinary:', e.message);
        cached = null; // try again on the next sensor complaint
        return { url: LOCAL_AUTOMATED_IMAGE, publicId: null };
      }
    })();
  }
  return cached;
}
