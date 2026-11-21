// server/src/config/cloudinary.ts
// Cloudinary SDK initialisation — server-side only.
// API secret is NEVER sent to the mobile client.

import { v2 as cloudinary } from 'cloudinary';

const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (!isConfigured) {
  console.warn(
    '[Cloudinary] Credentials not set. ' +
      'Image upload will fail until CLOUDINARY_CLOUD_NAME, ' +
      'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are configured in server/.env',
  );
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('[Cloudinary] Configured ✓');
}

export { cloudinary };

