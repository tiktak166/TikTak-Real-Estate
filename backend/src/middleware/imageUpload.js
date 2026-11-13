
import multer from 'multer';

const allowedImages = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif'
]);

export const listingImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter(req, file, cb) {
    if (!allowedImages.has(file.mimetype)) {
      const e = new Error('Amafoto yemerewe ni JPG, PNG, WEBP cyangwa AVIF gusa.');
      e.status = 400;
      return cb(e);
    }
    cb(null, true);
  }
}).array('images', 10);

export const listingVideoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('video/')) {
      const e = new Error('Hitamo dosiye ya video gusa.');
      e.status = 400;
      return cb(e);
    }
    cb(null, true);
  }
}).single('video');
