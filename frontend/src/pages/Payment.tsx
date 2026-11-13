// Cổng thanh toán MÔ PHỎNG cho chuyển khoản / ví điện tử (không kết nối ngân hàng thật)
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errMsg, money, PAYMENT_METHODS } from '../lib/api';
import { useOrder, useOrderAction } from '../lib/orders';
import StatusBadge from '../components/StatusBadge';

// Ô vuông giả lập mã QR (sinh từ mã đơn, chỉ để minh hoạ)
function FakeQR({ seed }: { seed: string }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const x = i % 21, y = Math.floor(i / 21);
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    if (finder) {
      const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y;
      return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
    }
    return (h >> 16) % 2 === 0;
  });
  return (
    <svg viewBox="0 0 21 21" className="h-48 w-48 rounded border bg-white p-2" shapeRendering="crispEdges" role="img" aria-label="Mã QR minh hoạ">
      {cells.map((on, i) => on && <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" />)}
    </svg>
  );
}

export default function Payment() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: order, isLoading, error } = useOrder(id);
  const pay = useOrderAction('pay', (o) => nav(`/hoa-don/${o.OrderID}`, { replace: true }));
  const cancel = useOrderAction('cancel', (o) => nav(`/hoa-don/${o.OrderID}`, { replace: true }));

  if (isLoading) return <p>Đang tải...</p>;
  if (error || !order) return <p className="text-red-600">{errMsg(error)} <Link to="/don-hang" className="text-green-700 underline">Đơn hàng của tôi</Link></p>;

  if (order.PaymentMethod === 'COD' || order.Status !== 'PENDING') {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
        <p>Đơn hàng #{order.OrderID} <StatusBadge status={order.Status} /></p>
        <p className="text-stone-600">{order.PaymentMethod === 'COD' ? 'Đơn COD sẽ thanh toán khi nhận hàng.' : 'Đơn hàng không còn chờ thanh toán.'}</p>
        <Link to={`/hoa-don/${order.OrderID}`} className="btn-primary">Xem hoá đơn</Link>
      </div>
    );
  }

  const content = `GREENLEAF ${order.OrderID}`;
  const busy = pay.isPending || cancel.isPending;
  return (
    <div className="card mx-auto max-w-2xl p-6">
      <p className="mb-4 rounded bg-amber-50 p-2 text-center text-xs text-amber-800">Đây là cổng thanh toán mô phỏng cho đồ án – không có giao dịch tiền thật.</p>
      <h1 className="text-2xl font-bold">Thanh toán đơn hàng #{order.OrderID}</h1>
      <p className="text-sm text-stone-600">{PAYMENT_METHODS[order.PaymentMethod]}</p>
      <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <FakeQR seed={`${order.PaymentMethod}-${order.OrderID}-${order.Total}`} />
        <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
          {order.PaymentMethod === 'BANK' ? (
            <>
              <dt className="text-stone-500">Ngân hàng</dt><dd>Ngân hàng Mô Phỏng (GLBank)</dd>
              <dt className="text-stone-500">Số tài khoản</dt><dd className="font-mono">0000 1234 5678</dd>
              <dt className="text-stone-500">Chủ tài khoản</dt><dd>CỬA HÀNG GREENLEAF</dd>
            </>
          ) : (
            <>
              <dt className="text-stone-500">Ví</dt><dd>Ví điện tử (mô phỏng)</dd>
              <dt className="text-stone-500">Hướng dẫn</dt><dd>Mở ứng dụng ví và quét mã QR</dd>
            </>
          )}
          <dt className="text-stone-500">Số tiền</dt><dd className="text-lg font-bold text-red-600">{money(order.Total)}</dd>
          <dt className="text-stone-500">Nội dung</dt><dd className="font-mono">{content}</dd>
        </dl>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button className="btn-outline text-red-600" disabled={busy} onClick={() => cancel.mutate(order.OrderID)}>Huỷ đơn</button>
        <Link className="btn-outline" to={`/hoa-don/${order.OrderID}`}>Thanh toán sau</Link>
        <button className="btn-primary" disabled={busy} onClick={() => pay.mutate(order.OrderID)}>
          {pay.isPending ? 'Đang xác nhận...' : '✔ Tôi đã thanh toán'}
        </button>
      </div>
    </div>
  );
}
