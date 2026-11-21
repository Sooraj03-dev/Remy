// server/src/config/neonStorage.ts
// Neon Object Storage S3 Client & helpers
// Connected to branch-scoped S3 bucket that branches with Lakebase Postgres.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const isStorageConfigured = Boolean(
  process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY,
);

export const s3Client = new S3Client({
  forcePathStyle: true, // Required by Neon Object Storage
  region: process.env.AWS_REGION || 'us-east-2',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const BUCKET_NAME = 'assets';

/**
 * Uploads a buffer directly into Neon Object Storage
 */
export async function uploadToNeonStorage(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ key: string; signedUrl: string; bucket: string }> {
  if (!isStorageConfigured) {
    throw new Error('Neon Object Storage environment variables are not configured.');
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  // Generate a presigned URL valid for 24 hours
  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 86400 },
  );

  return { key, signedUrl, bucket: BUCKET_NAME };
}

/**
 * Lists objects in the Neon assets bucket
 */
export async function listNeonStorageObjects(prefix?: string) {
  if (!isStorageConfigured) {
    throw new Error('Neon Object Storage environment variables are not configured.');
  }

  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    }),
  );

  return response.Contents || [];
}

/**
 * Deletes an object from the Neon assets bucket
 */
export async function deleteFromNeonStorage(key: string) {
  if (!isStorageConfigured) {
    throw new Error('Neon Object Storage environment variables are not configured.');
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );
}

export { isStorageConfigured };

