import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { api, imgSrc, money } from '../lib/api';
import { useCart } from '../lib/cart';
import type { Product } from '../types';

export default function Cart() {
  const cart = useCart();
  const nav = useNavigate();

  // Lấy tồn kho / giá mới nhất cho các sản phẩm trong giỏ
  const fresh = useQueries({
    queries: cart.items.map((i) => ({
      queryKey: ['product', String(i.ProductID)],
      queryFn: async () => (await api.get<Product>(`/products/${i.ProductID}`)).data,
      staleTime: 10_000,
      retry: false,
    })),
  });
  const freshKey = fresh.map((r) => (r.data ? `${r.data.ProductID}:${r.data.Price}:${r.data.Quantity}` : '')).join('|');
  const missing = cart.items.filter((_, idx) => fresh[idx]?.isError);
  useEffect(() => {
    cart.sync(fresh.flatMap((r) => (r.data ? [r.data] : [])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey]);

  const outOfStock = cart.items.filter((i) => i.Stock <= 0 || i.Quantity <= 0);
  const blocked = outOfStock.length > 0 || missing.length > 0;

  if (!cart.items.length) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-5xl">🛒</p>
        <p className="mt-3 text-lg font-semibold">Giỏ hàng đang trống</p>
        <Link to="/" className="btn-primary mt-4">Tiếp tục mua sắm</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-x-auto">
        <h1 className="border-b px-4 py-3 text-xl font-bold">Giỏ hàng ({cart.count} sản phẩm)</h1>
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600">
            <tr><th className="p-3">Sản phẩm</th><th className="p-3 text-right">Đơn giá</th><th className="p-3 text-center">Số lượng</th><th className="p-3 text-right">Thành tiền</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {cart.items.map((i) => {
              const gone = missing.some((m) => m.ProductID === i.ProductID);
              return (
                <tr key={i.ProductID} className="border-t">
                  <td className="p-3">
                    <Link to={`/san-pham/${i.ProductID}`} className="flex items-center gap-3 hover:text-green-700">
                      <img src={imgSrc(i.PathImage)} alt="" className="h-14 w-14 rounded object-cover" />
                      <div>
                        <p className="font-medium">{i.ProductName}</p>
                        {gone ? <p className="text-xs text-red-600">Sản phẩm không còn bán</p>
                          : i.Stock <= 0 ? <p className="text-xs text-red-600">Hết hàng</p>
                          : <p className="text-xs text-stone-500">Còn {i.Stock} {i.Unit}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="p-3 text-right">{money(i.Price)}</td>
                  <td className="p-3">
                    <div className="mx-auto flex w-fit items-center rounded-lg border">
                      <button className="px-2.5 py-1 disabled:opacity-40" disabled={i.Quantity <= 1} onClick={() => cart.setQty(i.ProductID, i.Quantity - 1)} aria-label="Giảm">−</button>
                      <input
                        className="w-12 border-x py-1 text-center outline-none" type="number" min={1} max={i.Stock} value={i.Quantity}
                        disabled={i.Stock <= 0} onChange={(e) => cart.setQty(i.ProductID, Number(e.target.value))} aria-label="Số lượng"
                      />
                      <button className="px-2.5 py-1 disabled:opacity-40" disabled={i.Quantity >= i.Stock} onClick={() => cart.setQty(i.ProductID, i.Quantity + 1)} aria-label="Tăng">+</button>
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">{money(i.Price * i.Quantity)}</td>
                  <td className="p-3 text-right"><button className="text-red-600 hover:underline" onClick={() => cart.remove(i.ProductID)}>Xoá</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-between border-t p-3">
          <Link to="/" className="text-sm text-green-700 underline">← Tiếp tục mua sắm</Link>
          <button className="text-sm text-stone-500 underline" onClick={() => cart.clear()}>Xoá hết giỏ hàng</button>
        </div>
      </div>

      <aside className="card h-fit space-y-3 p-4">
        <h2 className="font-semibold">Tóm tắt đơn hàng</h2>
        <div className="flex justify-between text-sm"><span>Tạm tính</span><span>{money(cart.total)}</span></div>
        <div className="flex justify-between text-sm"><span>Phí vận chuyển</span><span className="text-green-700">Miễn phí</span></div>
        <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Tổng</span><span className="text-red-600">{money(cart.total)}</span></div>
        {blocked && <p className="rounded bg-red-50 p-2 text-xs text-red-700">Hãy xoá các sản phẩm hết hàng / không còn bán trước khi thanh toán.</p>}
        <button className="btn-primary w-full justify-center" disabled={blocked} onClick={() => nav('/thanh-toan')}>Tiến hành thanh toán</button>
      </aside>
    </div>
  );
}
