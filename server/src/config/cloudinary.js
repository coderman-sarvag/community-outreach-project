import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

let configured = null;

export function cloudinaryEnabled() {
  if (configured !== null) return configured;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  configured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
  if (configured) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return configured;
}

// Uploads an image buffer. Uses Cloudinary when configured, otherwise saves to server/uploads.
export async function uploadImage(buffer, mimetype) {
  if (cloudinaryEnabled()) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'community-outreach/complaints',
          resource_type: 'image',
          transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  const ext = (mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, name), buffer);
  return { url: `/uploads/${name}`, publicId: null };
}
