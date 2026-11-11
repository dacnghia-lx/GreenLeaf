import jwt from 'jsonwebtoken';
import { HttpError } from './error.js';

const SECRET = () => process.env.JWT_SECRET || 'dev-secret';

export const signToken = (user) =>
  jwt.sign({ id: user.UserID, role: user.Role, name: user.FullName }, SECRET(), { expiresIn: '7d' });

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new HttpError(401, 'Bạn cần đăng nhập'));
  try { req.user = jwt.verify(token, SECRET()); next(); }
  catch { next(new HttpError(401, 'Phiên đăng nhập hết hạn')); }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'ADMIN') return next(new HttpError(403, 'Chỉ quản trị viên được thao tác'));
    next();
  });
}
