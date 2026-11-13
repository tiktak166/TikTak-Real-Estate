import multer from 'multer';
const allowed=new Set(['image/jpeg','image/png','image/webp','image/avif']);
export const listingImageUpload=multer({
  storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:10},
  fileFilter(req,file,cb){
    if(!allowed.has(file.mimetype)){const e=new Error('Amafoto yemerewe ni JPG, PNG, WEBP cyangwa AVIF gusa.');e.status=400;return cb(e);}
    cb(null,true);
  }
}).array('images',10);
