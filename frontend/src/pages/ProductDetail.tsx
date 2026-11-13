import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, money, imgSrc, PRODUCT_TYPES } from '../lib/api';
import { useCart } from '../lib/cart';
import type { Product } from '../types';

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const { data: p, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
  });
  if (isLoading) return <p>Đang tải...</p>;
  if (error || !p) return <p>Không tìm thấy sản phẩm. <Link to="/" className="text-green-700 underline">Về cửa hàng</Link></p>;

  const inCart = cart.quantityOf(p.ProductID);
  const canAdd = Math.max(0, p.Quantity - inCart);

  return (
    <div className="card grid gap-6 p-6 md:grid-cols-2">
      <img src={imgSrc(p.PathImage)} alt={p.ProductName} className="w-full rounded-xl object-cover" />
      <div>
        <p className="text-sm text-green-700">{PRODUCT_TYPES[p.ProductType]} · Mã SP #{p.ProductID}</p>
        <h1 className="mt-1 text-2xl font-bold">{p.ProductName}</h1>
        <p className="mt-3 text-2xl font-bold text-red-600">{money(p.Price)} <span className="text-base font-normal text-stone-500">/ {p.Unit}</span></p>
        <p className="mt-2 text-sm">
          {p.Quantity > 0 ? `Còn ${p.Quantity} ${p.Unit}` : 'Hết hàng'}
          {inCart > 0 && <span className="text-stone-500"> · Trong giỏ: {inCart}</span>}
        </p>
        <p className="mt-4 whitespace-pre-line text-stone-700">{p.Description}</p>
        {p.Quantity > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm">−</button>
              <input
                className="w-14 border-x py-2 text-center outline-none" type="number" min={1} max={canAdd || 1} value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, canAdd || 1)))}
                aria-label="Số lượng"
              />
              <button className="px-3 py-2" onClick={() => setQty((q) => Math.min(canAdd || 1, q + 1))} aria-label="Tăng">+</button>
            </div>
            <button className="btn-primary" disabled={canAdd <= 0} onClick={() => cart.add(p, qty) && setQty(1)}>🛒 Thêm vào giỏ</button>
            <button className="btn-outline" disabled={canAdd <= 0} onClick={() => cart.add(p, qty) && nav('/gio-hang')}>Mua ngay</button>
          </div>
        )}
        {p.Quantity > 0 && canAdd <= 0 && <p className="mt-2 text-xs text-amber-700">Bạn đã thêm toàn bộ số lượng còn lại vào giỏ.</p>}
      </div>
    </div>
  );
}
