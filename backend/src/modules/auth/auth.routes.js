import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, HttpError } from '../../middleware/error.js';
import { signToken, requireAuth } from '../../middleware/auth.js';

const r = Router();

const registerSchema = z.object({
  FullName: z.string().trim().min(2, 'Nhập họ tên'),
  Email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  Password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  Phone: z.string().trim().regex(/^0\d{9}$/, 'SĐT gồm 10 số, bắt đầu bằng 0').optional().or(z.literal('')),
});
const loginSchema = z.object({ Email: z.string().trim().toLowerCase().email(), Password: z.string().min(1) });

const publicUser = ({ Password, ...u }) => u;

r.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { Email: data.Email } })) throw new HttpError(409, 'Email đã được đăng ký');
  const user = await prisma.user.create({ data: { ...data, Phone: data.Phone || null, Password: await bcrypt.hash(data.Password, 10) } });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

r.post('/login', asyncHandler(async (req, res) => {
  const { Email, Password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { Email } });
  if (!user || !(await bcrypt.compare(Password, user.Password))) throw new HttpError(401, 'Sai email hoặc mật khẩu');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

r.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json(publicUser(await prisma.user.findUniqueOrThrow({ where: { UserID: req.user.id } })));
}));

export default r;
