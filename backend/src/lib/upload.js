import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

export const UPLOAD_DIR = path.resolve('uploads');

// Ảnh sản phẩm / ảnh lá cây: lưu xuống thư mục uploads
export const imageUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận ảnh PNG, JPG, WEBP, GIF'));
  },
});

// File import (xlsx/json/xml): giữ trong bộ nhớ
export const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
