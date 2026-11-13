import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../middleware/error.js';
import { requireAdmin } from '../../middleware/auth.js';
import { pageQuery, totalPages } from '../../lib/pagination.js';
import { parseId } from '../product/product.controller.js';

const r = Router();

export const contactInput = z.object({
  FullName: z.string().trim().min(2, 'Nhập họ tên (tối thiểu 2 ký tự)').max(100, 'Họ tên tối đa 100 ký tự'),
  Email: z.string().trim().toLowerCase().email('Email không hợp lệ').max(150),
  Message: z.string().trim().min(10, 'Nội dung tối thiểu 10 ký tự').max(5000, 'Nội dung tối đa 5000 ký tự'),
});

// Công khai: gửi liên hệ
r.post('/', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.create({ data: contactInput.parse(req.body) });
  res.status(201).json(contact);
}));

// Quản trị: danh sách liên hệ
r.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { page, pageSize } = pageQuery.parse(req.query);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const where: Prisma.ContactWhereInput = q
    ? { OR: ['FullName', 'Email', 'Message'].map((k) => ({ [k]: { contains: q, mode: 'insensitive' } })) }
    : {};
  const [total, items] = await prisma.$transaction([
    prisma.contact.count({ where }),
    prisma.contact.findMany({ where, orderBy: { ContactID: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ items, total, page, pageSize, totalPages: totalPages(total, pageSize) });
}));

r.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await prisma.contact.delete({ where: { ContactID: parseId(req, 'Mã liên hệ') } });
  res.status(204).end();
}));

export default r;
