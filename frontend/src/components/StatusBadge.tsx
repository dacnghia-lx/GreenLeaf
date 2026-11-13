import { ORDER_STATUS } from '../lib/api';
import type { OrderStatus } from '../types';

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
