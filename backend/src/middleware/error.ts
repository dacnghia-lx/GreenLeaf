import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Bọc controller async để lỗi tự chuyển tới errorHandler
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const MULTER_MESSAGES: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: 'File quá lớn',
  LIMIT_UNEXPECTED_FILE: 'Tên trường file không đúng',
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: err.flatten().fieldErrors });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    if (err.code === 'P2002') return res.status(409).json({ message: 'Dữ liệu bị trùng' });
    if (err.code === 'P2003') return res.status(409).json({ message: 'Bản ghi đang được sử dụng ở bảng khác' });
  }
  // Vi phạm khoá ngoại RESTRICT (Postgres 23001/23503) mà Prisma không gắn mã P2003
  if (err instanceof Prisma.PrismaClientUnknownRequestError && /\b2300[13]\b|foreign key/i.test(err.message)) {
    return res.status(409).json({ message: 'Bản ghi đang được sử dụng ở bảng khác' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: MULTER_MESSAGES[err.code] ?? 'Lỗi tải file' });
  }
  // JSON gửi lên sai cú pháp
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'JSON không hợp lệ' });
  }
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  const message = err instanceof HttpError ? err.message : 'Lỗi máy chủ';
  res.status(status).json({ message });
}
