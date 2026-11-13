import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, dateTime, errMsg, money, ORDER_STATUS, PAYMENT_METHODS } from '../../lib/api';
import { useDebounce } from '../../lib/useDebounce';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import type { Order, OrderStatus, OrderSummary, Paginated } from '../../types';

const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];

export default function OrdersAdmin() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [confirmCancel, setConfirmCancel] = useState<OrderSummary | null>(null);

  useEffect(() => setPage(1), [q, status, pageSize]);

  const { data, isFetching } = useQuery({
    queryKey: ['orders', 'admin', { page, pageSize, status, q }],
    queryFn: async () => (await api.get<Paginated<OrderSummary>>('/orders', { params: { page, pageSize, status, q } })).data,
    placeholderData: keepPreviousData,
  });

  const change = useMutation({
    mutationFn: async ({ id, Status }: { id: number; Status: OrderStatus }) => (await api.patch<Order>(`/orders/${id}/status`, { Status })).data,
    onSuccess: (o) => {
      toast.success(`Đơn #${o.OrderID}: ${ORDER_STATUS[o.Status].label}${o.Status === 'CANCELLED' ? ' (đã hoàn tồn kho)' : ''}`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', String(o.OrderID)] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setConfirmCancel(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onSelect = (o: OrderSummary, s: OrderStatus) => {
    if (s === o.Status) return;
    if (s === 'CANCELLED') setConfirmCancel(o);
    else change.mutate({ id: o.OrderID, Status: s });
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Quản lý đơn hàng</h1>
      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
        <input className="input max-w-sm" placeholder="Tìm mã đơn, tên khách, SĐT, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
        <select className="input max-w-[130px]" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {[10, 15, 20, 50].map((n) => <option key={n} value={n}>{n} / trang</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600">
            <tr>
              <th className="p-3">Mã đơn</th><th className="p-3">Ngày đặt</th><th className="p-3">Khách hàng</th><th className="p-3">SĐT</th>
              <th className="p-3 text-right">Tổng tiền</th><th className="p-3">Thanh toán</th><th className="p-3">Trạng thái</th><th className="p-3">Đổi trạng thái</th><th className="p-3" />
            </tr>
          </thead>
          <tbody className={isFetching ? 'opacity-60' : ''}>
            {data?.items.map((o) => (
              <tr key={o.OrderID} className="border-t hover:bg-stone-50">
                <td className="p-3 font-medium">#{o.OrderID}</td>
                <td className="whitespace-nowrap p-3">{dateTime(o.CreateDate)}</td>
                <td className="p-3">{o.CustomerName}<p className="text-xs text-stone-500">{o.UserEmail}</p></td>
                <td className="p-3">{o.Phone}</td>
                <td className="p-3 text-right font-semibold">{money(o.Total)}</td>
                <td className="p-3 text-xs">{PAYMENT_METHODS[o.PaymentMethod]}</td>
                <td className="p-3"><StatusBadge status={o.Status} /></td>
                <td className="p-3">
                  <select
                    className="input py-1" value={o.Status} disabled={o.Status === 'CANCELLED' || change.isPending}
                    onChange={(e) => onSelect(o, e.target.value as OrderStatus)} aria-label={`Trạng thái đơn #${o.OrderID}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right"><Link to={`/hoa-don/${o.OrderID}`} className="text-green-700 hover:underline">Hoá đơn</Link></td>
              </tr>
            ))}
            {!data?.items.length && <tr><td colSpan={9} className="p-8 text-center text-stone-500">Không có đơn hàng</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-sm text-stone-500">Tổng: {data?.total ?? 0} đơn · Trang {page}/{data?.totalPages ?? 1}</div>
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <Modal open={Boolean(confirmCancel)} title="Huỷ đơn hàng" size="max-w-md" onClose={() => setConfirmCancel(null)}
        footer={<>
          <button className="btn-outline" onClick={() => setConfirmCancel(null)}>Không</button>
          <button autoFocus className="btn-danger" disabled={change.isPending} onClick={() => confirmCancel && change.mutate({ id: confirmCancel.OrderID, Status: 'CANCELLED' })}>Huỷ đơn</button>
        </>}>
        Huỷ đơn <b>#{confirmCancel?.OrderID}</b>? Số lượng sản phẩm trong đơn sẽ được hoàn lại tồn kho và đơn đã huỷ không thể đổi lại trạng thái.
      </Modal>
    </div>
  );
}
