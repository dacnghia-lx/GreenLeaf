import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Diagnose from './pages/Diagnose';
import ProductsAdmin from './pages/admin/ProductsAdmin';

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.Role !== 'ADMIN') return <p className="p-8 text-center">Bạn không có quyền truy cập trang quản trị.</p>;
  return children;
}

const navCls = ({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-green-100 text-green-800' : 'hover:bg-stone-100'}`;

export default function App() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          <Link to="/" className="mr-4 text-xl font-bold text-green-700">🌿 GreenLeaf</Link>
          <NavLink to="/" end className={navCls}>Cửa hàng</NavLink>
          <NavLink to="/chan-doan" className={navCls}>AI chẩn đoán bệnh</NavLink>
          {user?.Role === 'ADMIN' && <NavLink to="/admin/products" className={navCls}>Quản lý sản phẩm</NavLink>}
          <div className="ml-auto flex items-center gap-2 text-sm">
            {user ? (
              <>
                <span>Xin chào, <b>{user.FullName}</b></span>
                <button className="btn-outline" onClick={logout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <Link className="btn-outline" to="/login">Đăng nhập</Link>
                <Link className="btn-primary" to="/register">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/san-pham/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chan-doan" element={<Diagnose />} />
          <Route path="/admin/products" element={<AdminRoute><ProductsAdmin /></AdminRoute>} />
          <Route path="*" element={<p className="p-8 text-center">Không tìm thấy trang</p>} />
        </Routes>
      </main>
      <footer className="border-t py-4 text-center text-xs text-stone-500">GreenLeaf © 2026 – Đồ án môn Ngôn ngữ kịch bản</footer>
    </div>
  );
}
