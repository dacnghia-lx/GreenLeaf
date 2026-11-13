import axios, { isAxiosError } from 'axios';
import type { ApiErrorBody, FieldErrors, OrderStatus, PaymentMethod, ProductType } from '../types';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (e: unknown): string => {
  if (isAxiosError<ApiErrorBody>(e)) return e.response?.data?.message || e.message || 'Có lỗi xảy ra';
  return e instanceof Error ? e.message : 'Có lỗi xảy ra';
};

/** Lỗi theo từng trường (validate Zod ở server) */
export const fieldErrors = (e: unknown): FieldErrors =>
  (isAxiosError<ApiErrorBody>(e) && e.response?.data?.errors) || {};

export const PRODUCT_TYPES: Record<ProductType, string> = {
  PLANT: 'Cây cảnh', BONSAI: 'Bonsai', POT: 'Chậu', FERTILIZER: 'Phân bón', MEDICINE: 'Thuốc trị bệnh', TOOL: 'Dụng cụ',
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK: 'Chuyển khoản ngân hàng',
  EWALLET: 'Ví điện tử (MoMo, ZaloPay...)',
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xử lý', cls: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Đã thanh toán', cls: 'bg-blue-100 text-blue-800' },
  SHIPPING: { label: 'Đang giao', cls: 'bg-indigo-100 text-indigo-800' },
  DONE: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-stone-200 text-stone-600' },
};

export const money = (v: number | string): string => Number(v).toLocaleString('vi-VN') + ' ₫';
export const dateTime = (v: string | Date): string => new Date(v).toLocaleString('vi-VN');
export const imgSrc = (p?: string | null): string => p || 'https://placehold.co/400x400?text=GreenLeaf';

// Tải file (export) kèm token
export async function download(url: string, params?: Record<string, string | number | undefined>): Promise<void> {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' });
  const disposition = String(res.headers['content-disposition'] ?? '');
  const name = disposition.match(/filename="(.+)"/)?.[1] || 'download';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(res.data);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
