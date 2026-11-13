import { useState, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { api, errMsg, fieldErrors } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ContactInput, FieldErrors } from '../types';

// Cùng quy tắc với schema Zod ở backend (POST /api/contacts)
const contactSchema = z.object({
  FullName: z.string().trim().min(2, 'Nhập họ tên (tối thiểu 2 ký tự)').max(100, 'Họ tên tối đa 100 ký tự'),
  Email: z.string().trim().email('Email không hợp lệ').max(150),
  Message: z.string().trim().min(10, 'Nội dung tối thiểu 10 ký tự').max(5000, 'Nội dung tối đa 5000 ký tự'),
});

export default function ContactPage() {
  const { user } = useAuth();
  const empty: ContactInput = { FullName: user?.FullName ?? '', Email: user?.Email ?? '', Message: '' };
  const [form, setForm] = useState<ContactInput>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof ContactInput) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) { setErrors(parsed.error.flatten().fieldErrors); return; }
    setErrors({});
    setSending(true);
    try {
      await api.post('/contacts', parsed.data);
      toast.success('Đã gửi liên hệ, chúng tôi sẽ phản hồi sớm!');
      setSent(true);
      setForm(empty);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally { setSending(false); }
  };

  const err = (k: keyof ContactInput) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]?.[0]}</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
        <h1 className="text-2xl font-bold">Liên hệ với GreenLeaf</h1>
        {sent && <p className="rounded bg-green-50 p-3 text-sm text-green-800">Cảm ơn bạn! Tin nhắn đã được gửi.</p>}
        <div><label className="label">Họ và tên *</label><input className="input" value={form.FullName} onChange={set('FullName')} />{err('FullName')}</div>
        <div><label className="label">Email *</label><input className="input" type="email" value={form.Email} onChange={set('Email')} />{err('Email')}</div>
        <div>
          <label className="label">Nội dung *</label>
          <textarea rows={6} className="input" value={form.Message} onChange={set('Message')} placeholder="Bạn cần tư vấn gì về cây cảnh?" />
          <div className="flex justify-between">{err('Message') ?? <span />}<span className="text-xs text-stone-400">{form.Message.length}/5000</span></div>
        </div>
        <button className="btn-primary" disabled={sending}>{sending ? 'Đang gửi...' : 'Gửi liên hệ'}</button>
      </form>
      <aside className="card h-fit space-y-2 p-6 text-sm">
        <h2 className="font-semibold">Thông tin cửa hàng</h2>
        <p>📍 123 Đường Cây Xanh, TP. Hồ Chí Minh</p>
        <p>📞 0909 000 000</p>
        <p>✉️ hotro@greenleaf.vn</p>
        <p>🕘 8:00 – 20:00, Thứ 2 – Chủ nhật</p>
      </aside>
    </div>
  );
}
