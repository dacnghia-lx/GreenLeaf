import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Bọc controller async để lỗi tự chuyển tới errorHandler
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: err.flatten().fieldErrors });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    if (err.code === 'P2002') return res.status(409).json({ message: 'Dữ liệu bị trùng' });
    if (err.code === 'P2003') return res.status(409).json({ message: 'Bản ghi đang được sử dụng ở bảng khác' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
}
