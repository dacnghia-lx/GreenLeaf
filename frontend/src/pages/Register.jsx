import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { errMsg } from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ FullName: '', Email: '', Phone: '', Password: '', Confirm: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.Password !== form.Confirm) return setErrors({ Confirm: ['Mật khẩu nhập lại không khớp'] });
    try {
      const { Confirm, ...body } = form;
      await register(body);
      toast.success('Đăng ký thành công');
      nav('/');
    } catch (err) {
      setErrors(err?.response?.data?.errors || {});
      toast.error(errMsg(err));
    }
  };

  const field = (k, label, type = 'text') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={form[k]} onChange={set(k)} />
      {errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k][0]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="card mx-auto mt-8 max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
      {field('FullName', 'Họ và tên')}
      {field('Email', 'Email', 'email')}
      {field('Phone', 'Số điện thoại')}
      {field('Password', 'Mật khẩu', 'password')}
      {field('Confirm', 'Nhập lại mật khẩu', 'password')}
      <button className="btn-primary w-full justify-center">Đăng ký</button>
      <p className="text-center text-sm">Đã có tài khoản? <Link to="/login" className="text-green-700 underline">Đăng nhập</Link></p>
    </form>
  );
}
