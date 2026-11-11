import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, money, imgSrc, PRODUCT_TYPES } from '../lib/api';

export default function ProductDetail() {
  const { id } = useParams();
  const { data: p, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  });
  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Không tìm thấy sản phẩm. <Link to="/" className="text-green-700 underline">Về cửa hàng</Link></p>;

  return (
    <div className="card grid gap-6 p-6 md:grid-cols-2">
      <img src={imgSrc(p.PathImage)} alt={p.ProductName} className="w-full rounded-xl object-cover" />
      <div>
        <p className="text-sm text-green-700">{PRODUCT_TYPES[p.ProductType]} · Mã SP #{p.ProductID}</p>
        <h1 className="mt-1 text-2xl font-bold">{p.ProductName}</h1>
        <p className="mt-3 text-2xl font-bold text-red-600">{money(p.Price)} <span className="text-base font-normal text-stone-500">/ {p.Unit}</span></p>
        <p className="mt-2 text-sm">{p.Quantity > 0 ? `Còn ${p.Quantity} ${p.Unit}` : 'Hết hàng'}</p>
        <p className="mt-4 whitespace-pre-line text-stone-700">{p.Description}</p>
        <button className="btn-primary mt-6" disabled={p.Quantity <= 0}>🛒 Thêm vào giỏ</button>
      </div>
    </div>
  );
}
