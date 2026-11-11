import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { errMsg } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ Email: '', Password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(form); toast.success('Đăng nhập thành công'); nav('/'); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="card mx-auto mt-8 max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      <div><label className="label">Email</label><input className="input" type="email" required value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} /></div>
      <div><label className="label">Mật khẩu</label><input className="input" type="password" required value={form.Password} onChange={(e) => setForm({ ...form, Password: e.target.value })} /></div>
      <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
      <p className="text-center text-sm">Chưa có tài khoản? <Link to="/register" className="text-green-700 underline">Đăng ký</Link></p>
      <p className="text-center text-xs text-stone-500">Tài khoản quản trị mẫu: admin@greenleaf.vn / admin123</p>
    </form>
  );
}
