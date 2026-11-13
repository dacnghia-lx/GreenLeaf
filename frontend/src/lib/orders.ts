import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, errMsg } from './api';
import type { Order } from '../types';

export const useOrder = (id?: string) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });

/** Thanh toán mô phỏng / huỷ đơn của khách */
export function useOrderAction(action: 'pay' | 'cancel', onDone?: (o: Order) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post<Order>(`/orders/${id}/${action}`)).data,
    onSuccess: (o) => {
      qc.setQueryData(['order', String(o.OrderID)], o);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success(action === 'pay' ? 'Thanh toán thành công' : 'Đã huỷ đơn hàng');
      onDone?.(o);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
