import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { errMsg, fieldErrors } from '../lib/api';
import type { FieldErrors } from '../types';

interface RegisterForm { FullName: string; Email: string; Phone: string; Password: string; Confirm: string }

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';
  const [form, setForm] = useState<RegisterForm>({ FullName: '', Email: '', Phone: '', Password: '', Confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (k: keyof RegisterForm) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.Password !== form.Confirm) return setErrors({ Confirm: ['Mật khẩu nhập lại không khớp'] });
    try {
      const { Confirm: _confirm, ...body } = form;
      await register(body);
      toast.success('Đăng ký thành công');
      nav(from, { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    }
  };

  const field = (k: keyof RegisterForm, label: string, type = 'text') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={form[k]} onChange={set(k)} />
      {errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]?.[0]}</p>}
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
      <p className="text-center text-sm">Đã có tài khoản? <Link to="/login" state={location.state} className="text-green-700 underline">Đăng nhập</Link></p>
    </form>
  );
}
