import type { Request } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../../middleware/error.js';
import { prisma } from '../../lib/prisma.js';
import * as service from './product.service.js';
import { productInput, listQuery, idsBody, PRODUCT_TYPES } from './product.schema.js';
import { FORMATS, isFormat, parseImportFile, pickFields } from './product.io.js';

export const parseId = (req: Request, label = 'ProductID'): number => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw new HttpError(400, `${label} không hợp lệ`);
  return id;
};

export const list = asyncHandler(async (req, res) => {
  res.json(await service.list(listQuery.parse(req.query)));
});

export const detail = asyncHandler(async (req, res) => {
  res.json(await service.getById(parseId(req)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(productInput.parse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await service.update(parseId(req), productInput.parse(req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(parseId(req));
  res.status(204).end();
});

export const removeMany = asyncHandler(async (req, res) => {
  const { ids } = idsBody.parse(req.body);
  res.json({ deleted: await service.removeMany(ids) });
});

export const copyOne = asyncHandler(async (req, res) => {
  const [copy] = await service.copyMany([parseId(req)]);
  if (!copy) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  res.status(201).json(copy);
});

export const copyMany = asyncHandler(async (req, res) => {
  const { ids } = idsBody.parse(req.body);
  const items = await service.copyMany(ids);
  res.status(201).json({ copied: items.length, items });
});

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Chưa chọn ảnh');
  res.status(201).json({ path: `/uploads/${req.file.filename}` });
});

const exportQuery = z.object({
  format: z.string().toLowerCase().default('xlsx'),
  q: z.string().trim().optional(),
  type: z.enum(PRODUCT_TYPES).optional().or(z.literal('').transform(() => undefined)),
  ids: z.string().optional(),
});

// GET /api/products/export?format=xlsx|json|xml&q=&type=&ids=1,2,3
export const exportFile = asyncHandler(async (req, res) => {
  const query = exportQuery.parse(req.query);
  if (!isFormat(query.format)) throw new HttpError(400, 'format phải là xlsx, json hoặc xml');
  const f = FORMATS[query.format];
  const ids = query.ids ? query.ids.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0) : undefined;
  const products = await service.findAll({ q: query.q, type: query.type, ids });
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Content-Disposition', `attachment; filename="products-${stamp}.${query.format}"`);
  res.send(await f.fn(products));
});

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

// POST /api/products/import  (multipart: file)
// Dòng có ProductID đã tồn tại -> cập nhật, ngược lại -> tạo mới
export const importFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Chưa chọn file');
  const rows = await parseImportFile(req.file);
  const result: ImportResult = { total: rows.length, created: 0, updated: 0, errors: [] };

  for (const [i, raw] of rows.entries()) {
    const row = pickFields(raw);
    const parsed = productInput.safeParse({ ...row, Description: row.Description ?? null, PathImage: row.PathImage ?? null });
    if (!parsed.success) {
      result.errors.push({ row: i + 2, message: Object.values(parsed.error.flatten().fieldErrors).flat().join('; ') });
      continue;
    }
    const id = Number(row.ProductID);
    const exists = Number.isInteger(id) && id > 0 && id <= 2147483647 && (await prisma.product.findUnique({ where: { ProductID: id } }));
    if (exists) {
      await service.update(id, parsed.data);
      result.updated++;
    } else {
      await service.create(parsed.data);
      result.created++;
    }
  }
  res.json(result);
});
