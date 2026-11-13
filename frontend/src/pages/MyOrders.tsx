import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, dateTime, money, ORDER_STATUS, PAYMENT_METHODS } from '../lib/api';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import type { OrderStatus, OrderSummary, Paginated } from '../types';

export default function MyOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'my', page, status],
    queryFn: async () => (await api.get<Paginated<OrderSummary>>('/orders/my', { params: { page, pageSize: 10, status } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Đơn hàng của tôi</h1>
        <select className="input max-w-[200px]" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {isLoading ? <p>Đang tải...</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600">
              <tr><th className="p-3">Mã đơn</th><th className="p-3">Ngày đặt</th><th className="p-3">Số SP</th><th className="p-3 text-right">Tổng tiền</th><th className="p-3">Thanh toán</th><th className="p-3">Trạng thái</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {data?.items.map((o) => (
                <tr key={o.OrderID} className="border-t hover:bg-stone-50">
                  <td className="p-3 font-medium">#{o.OrderID}</td>
                  <td className="p-3">{dateTime(o.CreateDate)}</td>
                  <td className="p-3">{o.ItemCount}</td>
                  <td className="p-3 text-right font-semibold">{money(o.Total)}</td>
                  <td className="p-3">{PAYMENT_METHODS[o.PaymentMethod]}</td>
                  <td className="p-3"><StatusBadge status={o.Status} /></td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {o.Status === 'PENDING' && o.PaymentMethod !== 'COD' && <Link to={`/thanh-toan/${o.OrderID}`} className="mr-3 text-red-600 hover:underline">Thanh toán</Link>}
                    <Link to={`/hoa-don/${o.OrderID}`} className="text-green-700 hover:underline">Xem hoá đơn</Link>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr><td colSpan={7} className="p-8 text-center text-stone-500">Bạn chưa có đơn hàng nào. <Link to="/" className="text-green-700 underline">Mua sắm ngay</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}
