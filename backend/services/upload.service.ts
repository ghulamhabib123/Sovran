import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.ts';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

export async function storeUploadedImage(
  fileBuffer: Buffer,
  originalName: string
): Promise<{ url: string; publicId: string; storage: 'cloudinary' | 'local' }> {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('Unsupported image file type. Allowed: JPG, PNG, WEBP, AVIF.');
  }

  if (isCloudinaryConfigured()) {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'sovran-atelier',
          resource_type: 'image',
        },
        (error, res) => {
          if (error || !res) {
            reject(error || new Error('Cloudinary upload failed'));
            return;
          }
          resolve({ secure_url: res.secure_url, public_id: res.public_id });
        }
      );
      stream.end(fileBuffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      storage: 'cloudinary',
    };
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const targetPath = path.resolve(UPLOAD_DIR, safeName);
  if (!targetPath.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error('Invalid upload path.');
  }
  fs.writeFileSync(targetPath, fileBuffer);
  return {
    url: `/uploads/${safeName}`,
    publicId: safeName,
    storage: 'local',
  };
}
