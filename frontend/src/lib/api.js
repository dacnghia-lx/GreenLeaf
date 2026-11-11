import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (e) => e?.response?.data?.message || e.message || 'Có lỗi xảy ra';

export const PRODUCT_TYPES = {
  PLANT: 'Cây cảnh', BONSAI: 'Bonsai', POT: 'Chậu', FERTILIZER: 'Phân bón', MEDICINE: 'Thuốc trị bệnh', TOOL: 'Dụng cụ',
};

export const money = (v) => Number(v).toLocaleString('vi-VN') + ' ₫';
export const dateTime = (v) => new Date(v).toLocaleString('vi-VN');
export const imgSrc = (p) => p || 'https://placehold.co/400x400?text=GreenLeaf';

// Tải file (export) kèm token
export async function download(url, params) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const name = res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || 'download';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(res.data);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
