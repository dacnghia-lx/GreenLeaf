import { z } from 'zod';

export const PRODUCT_TYPES = ['PLANT', 'BONSAI', 'POT', 'FERTILIZER', 'MEDICINE', 'TOOL'];

export const productInput = z.object({
  ProductName: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(200),
  PathImage: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  ProductType: z.enum(PRODUCT_TYPES),
  Quantity: z.coerce.number().int('Số lượng phải là số nguyên').min(0, 'Số lượng không âm'),
  Unit: z.string().trim().min(1, 'Nhập đơn vị tính').max(30),
  Price: z.coerce.number().min(0, 'Giá không âm'),
  Description: z.string().max(5000).optional().nullable(),
});

export const SORTABLE = ['ProductID', 'ProductName', 'ProductType', 'Quantity', 'Price', 'CreateDate', 'UpdateDate'];

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().optional(),
  type: z.enum(PRODUCT_TYPES).optional().or(z.literal('').transform(() => undefined)),
  sortBy: z.enum(SORTABLE).default('ProductID'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const idsBody = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, 'Chọn ít nhất 1 sản phẩm'),
});
