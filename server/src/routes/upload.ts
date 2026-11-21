// server/src/routes/upload.ts
// Product image upload route supporting Neon Object Storage and Cloudinary

import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth';
import { cloudinary } from '../config/cloudinary';
import {
  uploadToNeonStorage,
  isStorageConfigured as isNeonStorageConfigured,
} from '../config/neonStorage';

export const uploadRouter = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;

// Memory storage so files are streamed directly to cloud storage without local disk clutter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file format '${file.mimetype}'. Only JPEG, PNG, and WebP images are permitted.`,
        ),
      );
    }
  },
});

/**
 * Helper to upload a buffer stream to Cloudinary.
 */
const uploadBufferToCloudinary = (
  file: Express.Multer.File,
): Promise<{ url: string; publicId: string; format: string; size: number }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'campus-marketplace/products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload stream returned empty.'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
          });
        }
      },
    );
    stream.end(file.buffer);
  });
};

/**
 * POST /api/upload/images
 * Uploads up to 5 product images to Neon Object Storage (or Cloudinary if configured).
 * Protected — requires authentication.
 */
uploadRouter.post(
  '/images',
  protect,
  (req, res, next) => {
    upload.array('images', MAX_FILES)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            error: 'FILE_TOO_LARGE',
            message: `Each image must be smaller than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          });
          return;
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          res.status(400).json({
            success: false,
            error: 'TOO_MANY_FILES',
            message: `You can upload at most ${MAX_FILES} images at a time.`,
          });
          return;
        }
        res.status(400).json({
          success: false,
          error: 'UPLOAD_ERROR',
          message: err.message,
        });
        return;
      } else if (err) {
        res.status(400).json({
          success: false,
          error: 'INVALID_FILE',
          message: (err as Error).message,
        });
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const base64Images = req.body.images as string[] | undefined;

      const hasFiles = files && files.length > 0;
      const hasBase64 = Array.isArray(base64Images) && base64Images.length > 0;

      if (!hasFiles && !hasBase64) {
        res.status(400).json({
          success: false,
          error: 'NO_FILES_PROVIDED',
          message: 'Please provide at least one image file (multipart or base64 array).',
        });
        return;
      }

      const isCloudinaryReady =
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET;

      const results: Array<{ url: string; publicId: string; provider: string }> = [];

      // Primary: Cloudinary image storage (preserves Cloudinary integration per architecture)
      if (isCloudinaryReady) {
        if (hasFiles) {
          for (const file of files) {
            const uploaded = await uploadBufferToCloudinary(file);
            results.push({
              url: uploaded.url,
              publicId: uploaded.publicId,
              provider: 'cloudinary',
            });
          }
        } else if (hasBase64) {
          for (const b64 of base64Images.slice(0, MAX_FILES)) {
            const uploadRes = await cloudinary.uploader.upload(b64, {
              folder: 'campus-marketplace/products',
              resource_type: 'image',
            });
            results.push({
              url: uploadRes.secure_url,
              publicId: uploadRes.public_id,
              provider: 'cloudinary',
            });
          }
        }
      } else if (isNeonStorageConfigured) {
        // Fallback: Neon Object Storage bucket
        if (hasFiles) {
          for (const file of files) {
            const ext = file.mimetype.split('/')[1] || 'jpg';
            const key = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const uploaded = await uploadToNeonStorage(key, file.buffer, file.mimetype);
            results.push({
              url: uploaded.signedUrl,
              publicId: uploaded.key,
              provider: 'neon-object-storage',
            });
          }
        } else if (hasBase64) {
          for (const b64 of base64Images.slice(0, MAX_FILES)) {
            const match = b64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            const contentType = match ? match[1] : 'image/jpeg';
            const rawData = match ? match[2] : b64;
            const buffer = Buffer.from(rawData, 'base64');
            const key = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
            const uploaded = await uploadToNeonStorage(key, buffer, contentType);
            results.push({
              url: uploaded.signedUrl,
              publicId: uploaded.key,
              provider: 'neon-object-storage',
            });
          }
        }
      } else {
        res.status(503).json({
          success: false,
          error: 'STORAGE_NOT_CONFIGURED',
          message:
            'Cloudinary credentials are not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env',
        });
        return;
      }

      const urls = results.map((r) => r.url);

      res.status(201).json({
        success: true,
        data: {
          urls,
          files: results,
        },
        message: 'Images uploaded successfully to cloud storage.',
      });
    } catch (err) {
      next(err);
    }
  },
);
