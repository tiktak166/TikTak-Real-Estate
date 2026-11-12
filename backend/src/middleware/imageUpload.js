import multer from 'multer';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']);
const memory = multer.memoryStorage();

export const listingImageUpload = multer({
  storage: memory,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter(req, file, cb) {
    if (!imageTypes.has(file.mimetype)) {
      const error = new Error('Amafoto yemerewe ni JPG, PNG, WEBP cyangwa AVIF gusa.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  }
}).array('images', 10);

export const listingVideoUpload = multer({
  storage: memory,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!videoTypes.has(file.mimetype)) {
      const error = new Error('Video yemerewe ni MP4, WEBM cyangwa MOV gusa.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  }
}).single('video');
