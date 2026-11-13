
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

export function requireCloudinary() {
  if (!configured) {
    const e = new Error('Cloudinary ntiyashyizweho. Reba CLOUDINARY_* muri backend/.env.');
    e.status = 503;
    throw e;
  }
  return cloudinary;
}

export function uploadImage(buffer, folder) {
  const client = requireCloudinary();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }]
      },
      (err, result) => err ? reject(err) : resolve(result)
    );

    stream.end(buffer);
  });
}

export function uploadVideo(buffer, folder) {
  const client = requireCloudinary();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: 'video'
      },
      (err, result) => err ? reject(err) : resolve(result)
    );

    stream.end(buffer);
  });
}
