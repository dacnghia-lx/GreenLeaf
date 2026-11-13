import { Link, useParams } from 'react-router-dom';
import { dateTime, errMsg, imgSrc, money, PAYMENT_METHODS } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useOrder, useOrderAction } from '../lib/orders';
import StatusBadge from '../components/StatusBadge';

export default function Invoice() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: order, isLoading, error } = useOrder(id);
  const cancel = useOrderAction('cancel');

  if (isLoading) return <p>Đang tải...</p>;
  if (error || !order) return <p className="text-red-600">{errMsg(error)} <Link to="/don-hang" className="text-green-700 underline">Đơn hàng của tôi</Link></p>;

  const isOwner = user?.UserID === order.UserID;
  const canPay = isOwner && order.Status === 'PENDING' && order.PaymentMethod !== 'COD';
  const canCancel = isOwner && order.Status === 'PENDING';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <Link to={user?.Role === 'ADMIN' && !isOwner ? '/admin/orders' : '/don-hang'} className="mr-auto text-sm text-green-700 underline">← Danh sách đơn hàng</Link>
        {canCancel && <button className="btn-outline text-red-600" disabled={cancel.isPending} onClick={() => window.confirm('Huỷ đơn hàng này?') && cancel.mutate(order.OrderID)}>Huỷ đơn</button>}
        {canPay && <Link to={`/thanh-toan/${order.OrderID}`} className="btn-primary">Thanh toán ngay</Link>}
        <button className="btn-outline" onClick={() => window.print()}>🖨 In hoá đơn</button>
      </div>

      <article className="card p-8 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-2xl font-bold text-green-700">🌿 GreenLeaf</p>
            <p className="text-xs text-stone-500">Cửa hàng cây cảnh &amp; vật tư chăm sóc cây</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase">Hoá đơn bán hàng</h1>
            <p className="text-sm">Số: <b>#{order.OrderID}</b></p>
            <p className="text-sm text-stone-600">Ngày: {dateTime(order.CreateDate)}</p>
          </div>
        </header>

        <section className="grid gap-4 py-4 text-sm sm:grid-cols-2">
          <dl className="grid grid-cols-[110px_1fr] gap-y-1">
            <dt className="text-stone-500">Khách hàng</dt><dd className="font-semibold">{order.CustomerName}</dd>
            <dt className="text-stone-500">Điện thoại</dt><dd>{order.Phone}</dd>
            <dt className="text-stone-500">Địa chỉ</dt><dd>{order.Address}</dd>
            {order.user && <><dt className="text-stone-500">Tài khoản</dt><dd>{order.user.Email}</dd></>}
            {order.Note && <><dt className="text-stone-500">Ghi chú</dt><dd className="whitespace-pre-line">{order.Note}</dd></>}
          </dl>
          <dl className="grid grid-cols-[110px_1fr] gap-y-1">
            <dt className="text-stone-500">Trạng thái</dt><dd><StatusBadge status={order.Status} /></dd>
            <dt className="text-stone-500">Thanh toán</dt><dd>{PAYMENT_METHODS[order.PaymentMethod]}</dd>
            {order.PaidDate && <><dt className="text-stone-500">Ngày thanh toán</dt><dd>{dateTime(order.PaidDate)}</dd></>}
          </dl>
        </section>

        <table className="w-full text-sm">
          <thead className="border-y bg-stone-50 text-left text-xs uppercase text-stone-600">
            <tr><th className="p-2">#</th><th className="p-2">Sản phẩm</th><th className="p-2 text-right">Đơn giá</th><th className="p-2 text-center">SL</th><th className="p-2 text-right">Thành tiền</th></tr>
          </thead>
          <tbody>
            {order.items.map((it, idx) => (
              <tr key={it.OrderItemID} className="border-b">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <img src={imgSrc(it.product.PathImage)} alt="" className="h-10 w-10 rounded object-cover print:hidden" />
                    <span>{it.product.ProductName} <span className="text-xs text-stone-500">(#{it.ProductID})</span></span>
                  </div>
                </td>
                <td className="p-2 text-right">{money(it.Price)}</td>
                <td className="p-2 text-center">{it.Quantity} {it.product.Unit}</td>
                <td className="p-2 text-right font-medium">{money(it.LineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4} className="p-2 text-right">Phí vận chuyển</td><td className="p-2 text-right">0 ₫</td></tr>
            <tr className="text-base font-bold"><td colSpan={4} className="p-2 text-right">Tổng cộng</td><td className="p-2 text-right text-red-600">{money(order.Total)}</td></tr>
          </tfoot>
        </table>
        <p className="mt-8 text-center text-xs text-stone-500">Cảm ơn quý khách đã mua hàng tại GreenLeaf!</p>
      </article>
    </div>
  );
}
