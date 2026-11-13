import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, type NavLinkProps } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { useCart } from './lib/cart';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Diagnose from './pages/Diagnose';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import Invoice from './pages/Invoice';
import MyOrders from './pages/MyOrders';
import ContactPage from './pages/Contact';
import ProductsAdmin from './pages/admin/ProductsAdmin';
import OrdersAdmin from './pages/admin/OrdersAdmin';
import ContactsAdmin from './pages/admin/ContactsAdmin';
import ChatWidget from './components/ChatWidget';

// Trang cần đăng nhập: chuyển tới /login và quay lại sau khi đăng nhập
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.Role !== 'ADMIN') return <p className="p-8 text-center">Bạn không có quyền truy cập trang quản trị.</p>;
  return <>{children}</>;
}

const navCls: NavLinkProps['className'] = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? 'bg-green-100 text-green-800' : 'hover:bg-stone-100'}`;

export default function App() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-3">
          <Link to="/" className="mr-4 text-xl font-bold text-green-700">🌿 GreenLeaf</Link>
          <NavLink to="/" end className={navCls}>Cửa hàng</NavLink>
          <NavLink to="/chan-doan" className={navCls}>AI chẩn đoán bệnh</NavLink>
          <NavLink to="/lien-he" className={navCls}>Liên hệ</NavLink>
          {user && <NavLink to="/don-hang" className={navCls}>Đơn hàng của tôi</NavLink>}
          {user?.Role === 'ADMIN' && (
            <div className="group relative">
              <button className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100">Quản trị ▾</button>
              <div className="invisible absolute left-0 z-40 w-48 rounded-lg border bg-white py-1 shadow-lg group-focus-within:visible group-hover:visible">
                <NavLink to="/admin/products" className="block px-4 py-2 text-sm hover:bg-stone-100">Quản lý sản phẩm</NavLink>
                <NavLink to="/admin/orders" className="block px-4 py-2 text-sm hover:bg-stone-100">Quản lý đơn hàng</NavLink>
                <NavLink to="/admin/contacts" className="block px-4 py-2 text-sm hover:bg-stone-100">Danh sách liên hệ</NavLink>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <NavLink to="/gio-hang" className={navCls} aria-label={`Giỏ hàng (${count} sản phẩm)`}>
              🛒 Giỏ hàng
              {count > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">{count}</span>}
            </NavLink>
            {user ? (
              <>
                <span className="hidden sm:inline">Xin chào, <b>{user.FullName}</b></span>
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
          <Route path="/gio-hang" element={<Cart />} />
          <Route path="/thanh-toan" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/thanh-toan/:id" element={<RequireAuth><Payment /></RequireAuth>} />
          <Route path="/hoa-don/:id" element={<RequireAuth><Invoice /></RequireAuth>} />
          <Route path="/don-hang" element={<RequireAuth><MyOrders /></RequireAuth>} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="/admin/products" element={<AdminRoute><ProductsAdmin /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><OrdersAdmin /></AdminRoute>} />
          <Route path="/admin/contacts" element={<AdminRoute><ContactsAdmin /></AdminRoute>} />
          <Route path="*" element={<p className="p-8 text-center">Không tìm thấy trang</p>} />
        </Routes>
      </main>
      <footer className="border-t py-4 text-center text-xs text-stone-500 print:hidden">GreenLeaf © 2026 – Đồ án môn Ngôn ngữ kịch bản</footer>
      <ChatWidget />
    </div>
  );
}
