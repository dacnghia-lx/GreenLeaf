import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { HttpError } from './error.js';
import type { JwtUser } from '../types/express.js';

const SECRET = () => process.env.JWT_SECRET || 'dev-secret';

export const signToken = (user: Pick<User, 'UserID' | 'Role' | 'FullName'>): string =>
  jwt.sign({ id: user.UserID, role: user.Role, name: user.FullName } satisfies JwtUser, SECRET(), { expiresIn: '7d' });

function isJwtUser(v: unknown): v is JwtUser {
  return typeof v === 'object' && v !== null && typeof (v as JwtUser).id === 'number' && typeof (v as JwtUser).role === 'string';
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new HttpError(401, 'Bạn cần đăng nhập'));
  try {
    const payload = jwt.verify(token, SECRET());
    if (!isJwtUser(payload)) throw new Error('payload');
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch {
    next(new HttpError(401, 'Phiên đăng nhập hết hạn'));
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (req.user?.role !== 'ADMIN') return next(new HttpError(403, 'Chỉ quản trị viên được thao tác'));
    next();
  });
};

// Lấy user đã đăng nhập (dùng sau requireAuth)
export function currentUser(req: Request): JwtUser {
  if (!req.user) throw new HttpError(401, 'Bạn cần đăng nhập');
  return req.user;
}
