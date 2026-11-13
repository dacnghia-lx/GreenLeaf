import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, dateTime, errMsg } from '../../lib/api';
import { useDebounce } from '../../lib/useDebounce';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import type { Contact, Paginated } from '../../types';

export default function ContactsAdmin() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [viewing, setViewing] = useState<Contact | null>(null);
  useEffect(() => setPage(1), [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['contacts', { page, q }],
    queryFn: async () => (await api.get<Paginated<Contact>>('/contacts', { params: { page, pageSize: 10, q } })).data,
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}`),
    onSuccess: () => { toast.success('Đã xoá liên hệ'); setViewing(null); qc.invalidateQueries({ queryKey: ['contacts'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Danh sách liên hệ</h1>
        <input className="input max-w-sm" placeholder="Tìm theo tên, email, nội dung..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600">
            <tr><th className="p-3">#</th><th className="p-3">Ngày gửi</th><th className="p-3">Họ tên</th><th className="p-3">Email</th><th className="p-3">Nội dung</th><th className="p-3" /></tr>
          </thead>
          <tbody className={isFetching ? 'opacity-60' : ''}>
            {data?.items.map((c) => (
              <tr key={c.ContactID} className="cursor-pointer border-t hover:bg-stone-50" onClick={() => setViewing(c)}>
                <td className="p-3">{c.ContactID}</td>
                <td className="whitespace-nowrap p-3">{dateTime(c.CreateDate)}</td>
                <td className="p-3 font-medium">{c.FullName}</td>
                <td className="p-3"><a href={`mailto:${c.Email}`} className="text-green-700 hover:underline" onClick={(e) => e.stopPropagation()}>{c.Email}</a></td>
                <td className="p-3"><span className="line-clamp-2 max-w-md text-stone-600">{c.Message}</span></td>
                <td className="p-3 text-right"><button className="text-blue-600 hover:underline">Xem</button></td>
              </tr>
            ))}
            {!data?.items.length && <tr><td colSpan={6} className="p-8 text-center text-stone-500">Chưa có liên hệ nào</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-sm text-stone-500">Tổng: {data?.total ?? 0} liên hệ</div>
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <Modal open={Boolean(viewing)} title={`Liên hệ #${viewing?.ContactID ?? ''}`} onClose={() => setViewing(null)}
        footer={<>
          <button className="btn-danger" disabled={remove.isPending} onClick={() => viewing && window.confirm('Xoá liên hệ này?') && remove.mutate(viewing.ContactID)}>Xoá</button>
          <a className="btn-primary" href={`mailto:${viewing?.Email}`}>Trả lời qua email</a>
        </>}>
        {viewing && (
          <dl className="grid grid-cols-[90px_1fr] gap-y-2 text-sm">
            <dt className="text-stone-500">Họ tên</dt><dd className="font-semibold">{viewing.FullName}</dd>
            <dt className="text-stone-500">Email</dt><dd>{viewing.Email}</dd>
            <dt className="text-stone-500">Ngày gửi</dt><dd>{dateTime(viewing.CreateDate)}</dd>
            <dt className="text-stone-500">Nội dung</dt><dd className="whitespace-pre-line">{viewing.Message}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}
