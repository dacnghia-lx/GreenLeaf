import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, money, imgSrc, PRODUCT_TYPES } from '../lib/api';
import { useCart } from '../lib/cart';
import { useDebounce } from '../lib/useDebounce';
import Pagination from '../components/Pagination';
import type { Paginated, Product, ProductType } from '../types';

export default function Home() {
  const cart = useCart();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [type, setType] = useState<ProductType | ''>('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop', page, q, type],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { page, pageSize: 12, q, type } })).data,
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
        <input className="input max-w-xs" placeholder="Tìm sản phẩm..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input max-w-[200px]" value={type} onChange={(e) => { setType(e.target.value as ProductType | ''); setPage(1); }}>
          <option value="">Tất cả loại</option>
          {Object.entries(PRODUCT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? <p>Đang tải...</p> : isError || !data ? <p className="text-red-600">Không tải được danh sách sản phẩm.</p> : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((p) => (
              <div key={p.ProductID} className="card flex flex-col overflow-hidden transition hover:shadow-md">
                <Link to={`/san-pham/${p.ProductID}`}>
                  <img src={imgSrc(p.PathImage)} alt={p.ProductName} className="aspect-square w-full object-cover" />
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-xs text-green-700">{PRODUCT_TYPES[p.ProductType]}</p>
                  <Link to={`/san-pham/${p.ProductID}`} className="line-clamp-1 font-semibold hover:text-green-700">{p.ProductName}</Link>
                  <p className="mt-1 font-bold text-red-600">{money(p.Price)}</p>
                  <button
                    className="btn-outline mt-auto justify-center pt-2"
                    disabled={p.Quantity <= 0 || cart.quantityOf(p.ProductID) >= p.Quantity}
                    onClick={() => cart.add(p)}
                  >
                    {p.Quantity <= 0 ? 'Hết hàng' : '🛒 Thêm vào giỏ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!data.items.length && <p className="py-10 text-center text-stone-500">Không có sản phẩm phù hợp.</p>}
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
