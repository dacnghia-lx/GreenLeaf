import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { api, errMsg, fieldErrors, imgSrc, money, PAYMENT_METHODS } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import type { CreateOrderInput, FieldErrors, Order, PaymentMethod } from '../types';

// Kiểm tra phía client (server kiểm tra lại bằng schema tương tự)
const checkoutSchema = z.object({
  CustomerName: z.string().trim().min(2, 'Nhập họ tên người nhận').max(100),
  Phone: z.string().trim().regex(/^0\d{9}$/, 'SĐT gồm 10 số, bắt đầu bằng 0'),
  Address: z.string().trim().min(5, 'Nhập địa chỉ nhận hàng').max(500),
  Note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự'),
  PaymentMethod: z.enum(['COD', 'BANK', 'EWALLET']),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { user } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<CheckoutForm>({
    CustomerName: user?.FullName ?? '', Phone: user?.Phone ?? '', Address: user?.Address ?? '', Note: '', PaymentMethod: 'COD',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!cart.items.length && !submitting) return <Navigate to="/gio-hang" replace />;

  const set = (k: keyof CheckoutForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) { setErrors(parsed.error.flatten().fieldErrors); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const body: CreateOrderInput = { ...parsed.data, items: cart.items.map((i) => ({ ProductID: i.ProductID, Quantity: i.Quantity })) };
      const { data } = await api.post<Order>('/orders', body);
      cart.clear();
      qc.invalidateQueries({ queryKey: ['product'] });
      qc.invalidateQueries({ queryKey: ['shop'] });
      toast.success(`Đã tạo đơn hàng #${data.OrderID}`);
      nav(data.PaymentMethod === 'COD' ? `/hoa-don/${data.OrderID}` : `/thanh-toan/${data.OrderID}`, { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
      qc.invalidateQueries({ queryKey: ['product'] }); // có thể tồn kho vừa thay đổi
      setSubmitting(false);
    }
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]?.[0]}</p>;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold">Thanh toán</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Họ tên người nhận *</label><input className="input" value={form.CustomerName} onChange={set('CustomerName')} />{err('CustomerName')}</div>
          <div><label className="label">Số điện thoại *</label><input className="input" inputMode="tel" placeholder="09xxxxxxxx" value={form.Phone} onChange={set('Phone')} />{err('Phone')}</div>
          <div className="sm:col-span-2"><label className="label">Địa chỉ nhận hàng *</label><input className="input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.Address} onChange={set('Address')} />{err('Address')}</div>
          <div className="sm:col-span-2"><label className="label">Ghi chú</label><textarea rows={3} className="input" placeholder="Ví dụ: giao giờ hành chính" value={form.Note} onChange={set('Note')} />{err('Note')}</div>
        </div>
        <fieldset>
          <legend className="label">Phương thức thanh toán *</legend>
          <div className="space-y-2">
            {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, string][]).map(([k, v]) => (
              <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${form.PaymentMethod === k ? 'border-green-600 bg-green-50' : 'hover:bg-stone-50'}`}>
                <input type="radio" name="PaymentMethod" value={k} checked={form.PaymentMethod === k} onChange={() => setForm({ ...form, PaymentMethod: k })} />
                <span>{v}</span>
              </label>
            ))}
          </div>
          {form.PaymentMethod !== 'COD' && <p className="mt-2 text-xs text-stone-500">Sau khi đặt hàng bạn sẽ được chuyển tới cổng thanh toán (mô phỏng) để xác nhận.</p>}
          {err('PaymentMethod')}
        </fieldset>
      </div>

      <aside className="card h-fit space-y-3 p-4">
        <h2 className="font-semibold">Đơn hàng ({cart.count} sản phẩm)</h2>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {cart.items.map((i) => (
            <li key={i.ProductID} className="flex items-center gap-2 text-sm">
              <img src={imgSrc(i.PathImage)} alt="" className="h-10 w-10 rounded object-cover" />
              <span className="flex-1"><span className="line-clamp-1">{i.ProductName}</span><span className="text-xs text-stone-500">{i.Quantity} × {money(i.Price)}</span></span>
              <span className="font-medium">{money(i.Quantity * i.Price)}</span>
            </li>
          ))}
        </ul>
        {err('items')}
        <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Tổng</span><span className="text-red-600">{money(cart.total)}</span></div>
        <p className="text-xs text-stone-500">Tổng tiền cuối cùng được tính lại theo giá hiện tại ở máy chủ.</p>
        <button className="btn-primary w-full justify-center" disabled={submitting}>{submitting ? 'Đang đặt hàng...' : 'Đặt hàng'}</button>
        <Link to="/gio-hang" className="block text-center text-sm text-green-700 underline">← Quay lại giỏ hàng</Link>
      </aside>
    </form>
  );
}
