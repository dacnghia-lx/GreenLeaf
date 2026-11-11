import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, money, imgSrc, PRODUCT_TYPES } from '../lib/api';
import Pagination from '../components/Pagination';

export default function Home() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['shop', page, q, type],
    queryFn: async () => (await api.get('/products', { params: { page, pageSize: 12, q, type } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-green-700 to-emerald-500 p-8 text-white">
        <h1 className="text-3xl font-bold">Cây xanh cho mọi không gian</h1>
        <p className="mt-2 max-w-xl opacity-90">Lá cây có đốm lạ? Chụp ảnh và để AI chẩn đoán bệnh, gợi ý thuốc và phân bón phù hợp.</p>
        <Link to="/chan-doan" className="btn mt-4 bg-white text-green-800 hover:bg-green-50">📷 Chẩn đoán bệnh cây ngay</Link>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Tìm sản phẩm..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input max-w-[200px]" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">Tất cả loại</option>
          {Object.entries(PRODUCT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? <p>Đang tải...</p> : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((p) => (
              <Link key={p.ProductID} to={`/san-pham/${p.ProductID}`} className="card overflow-hidden transition hover:shadow-md">
                <img src={imgSrc(p.PathImage)} alt={p.ProductName} className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <p className="text-xs text-green-700">{PRODUCT_TYPES[p.ProductType]}</p>
                  <h3 className="line-clamp-1 font-semibold">{p.ProductName}</h3>
                  <p className="mt-1 font-bold text-red-600">{money(p.Price)}</p>
                </div>
              </Link>
            ))}
          </div>
          {!data.items.length && <p className="py-10 text-center text-stone-500">Không có sản phẩm phù hợp.</p>}
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
