import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const PAYMENT_METHODS = ['COD', 'BANK', 'EWALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const ORDER_STATUSES = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];

export const createOrderInput = z.object({
  CustomerName: z.string().trim().min(2, 'Nhập họ tên người nhận').max(100),
  Phone: z.string().trim().regex(/^0\d{9}$/, 'SĐT gồm 10 số, bắt đầu bằng 0'),
  Address: z.string().trim().min(5, 'Nhập địa chỉ nhận hàng').max(500),
  Note: z.string().trim().max(1000).optional().nullable(),
  PaymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Chọn phương thức thanh toán' }) }),
  items: z
    .array(z.object({
      ProductID: z.coerce.number().int().positive(),
      Quantity: z.coerce.number().int('Số lượng phải là số nguyên').min(1, 'Số lượng tối thiểu là 1').max(1000),
    }))
    .min(1, 'Giỏ hàng đang trống')
    .max(100),
});
export type CreateOrderInput = z.infer<typeof createOrderInput>;

export const listOrderQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(ORDER_STATUSES).optional().or(z.literal('').transform(() => undefined)),
  q: z.string().trim().optional(),
});
export type ListOrderQuery = z.infer<typeof listOrderQuery>;

export const statusInput = z.object({ Status: z.enum(ORDER_STATUSES) });
