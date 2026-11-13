import { useEffect, useState, type ChangeEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { api, errMsg, fieldErrors, PRODUCT_TYPES, imgSrc, money, dateTime } from '../lib/api';
import type { FieldErrors, Product, ProductType } from '../types';

export type FormMode = 'create' | 'edit' | 'view';

/** State của form: các ô input trả về chuỗi nên Quantity/Price có thể là string */
interface ProductForm {
  ProductName: string;
  PathImage: string;
  ProductType: ProductType;
  Quantity: number | string;
  Unit: string;
  Price: number | string;
  Description: string;
}

const EMPTY: ProductForm = { ProductName: '', PathImage: '', ProductType: 'PLANT', Quantity: 0, Unit: 'cây', Price: 0, Description: '' };

const toForm = (p: Product): ProductForm => ({
  ProductName: p.ProductName, PathImage: p.PathImage ?? '', ProductType: p.ProductType,
  Quantity: p.Quantity, Unit: p.Unit, Price: p.Price, Description: p.Description ?? '',
});

interface Props {
  mode: FormMode | null;
  product: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
  onEdit: (p: Product) => void;
}

export default function ProductFormModal({ mode, product, onClose, onSaved, onEdit }: Props) {
  const open = Boolean(mode);
  const readOnly = mode === 'view';
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(product ? toForm(product) : EMPTY);
  }, [open, product]);

  const set = (k: keyof ProductForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const uploadImage = async (file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      setForm((f) => ({ ...f, PathImage: '' }));
      const { data } = await api.post<{ path: string }>('/products/upload-image', fd);
      setForm((f) => ({ ...f, PathImage: data.path }));
    } catch (e) { toast.error(errMsg(e)); }
  };

  const save = async () => {
    if (readOnly || saving) return;
    setSaving(true);
    try {
      const res = mode === 'edit' && product
        ? await api.put<Product>(`/products/${product.ProductID}`, form)
        : await api.post<Product>('/products', form);
      toast.success(mode === 'edit' ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm');
      onSaved(res.data);
    } catch (e) {
      setErrors(fieldErrors(e));
      toast.error(errMsg(e));
    } finally { setSaving(false); }
  };

  // Alt+S: lưu (hoạt động cả khi đang gõ trong ô input)
  useHotkeys('alt+s', (e) => { e.preventDefault(); void save(); }, { enabled: open && !readOnly, enableOnFormTags: true }, [form, mode]);

  const title = mode ? { create: 'Thêm sản phẩm', edit: `Sửa sản phẩm #${product?.ProductID}`, view: `Chi tiết sản phẩm #${product?.ProductID}` }[mode] : '';
  const err = (k: keyof ProductForm) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]?.[0]}</p>;

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={readOnly ? (
        <>
          <button className="btn-outline" onClick={onClose}>Đóng <kbd>Esc</kbd></button>
          <button className="btn-primary" onClick={() => product && onEdit(product)}>Sửa <kbd className="text-stone-700">Alt+E</kbd></button>
        </>
      ) : (
        <>
          <button className="btn-outline" onClick={onClose}>Huỷ <kbd>Esc</kbd></button>
          <button className="btn-primary" onClick={() => void save()} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'} <kbd className="text-stone-700">Alt+S</kbd></button>
        </>
      )}
    >
      {readOnly && product ? (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <img src={imgSrc(product.PathImage)} alt={product.ProductName} className="w-full rounded-lg object-cover" />
          <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
            <dt className="text-stone-500">Mã SP</dt><dd>{product.ProductID}</dd>
            <dt className="text-stone-500">Tên</dt><dd className="font-semibold">{product.ProductName}</dd>
            <dt className="text-stone-500">Loại</dt><dd>{PRODUCT_TYPES[product.ProductType]}</dd>
            <dt className="text-stone-500">Số lượng</dt><dd>{product.Quantity} {product.Unit}</dd>
            <dt className="text-stone-500">Giá</dt><dd>{money(product.Price)}</dd>
            <dt className="text-stone-500">Ngày tạo</dt><dd>{dateTime(product.CreateDate)}</dd>
            <dt className="text-stone-500">Cập nhật</dt><dd>{dateTime(product.UpdateDate)}</dd>
            <dt className="text-stone-500">Mô tả</dt><dd className="whitespace-pre-line">{product.Description}</dd>
          </dl>
        </div>
      ) : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="sm:col-span-2"><label className="label">Tên sản phẩm *</label><input autoFocus className="input" value={form.ProductName} onChange={set('ProductName')} />{err('ProductName')}</div>
          <div>
            <label className="label">Loại *</label>
            <select className="input" value={form.ProductType} onChange={set('ProductType')}>
              {Object.entries(PRODUCT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Đơn vị tính *</label><input className="input" value={form.Unit} onChange={set('Unit')} />{err('Unit')}</div>
          <div><label className="label">Số lượng *</label><input className="input" type="number" min="0" value={form.Quantity} onChange={set('Quantity')} />{err('Quantity')}</div>
          <div><label className="label">Giá (VNĐ) *</label><input className="input" type="number" min="0" step="1000" value={form.Price} onChange={set('Price')} />{err('Price')}</div>
          <div className="sm:col-span-2">
            <label className="label">Ảnh (URL hoặc tải lên)</label>
            <div className="flex gap-3">
              {form.PathImage && <img src={form.PathImage} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1 space-y-2">
                <input className="input" value={form.PathImage} onChange={set('PathImage')} placeholder="https://..." />
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => void uploadImage(e.target.files?.[0])} />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2"><label className="label">Mô tả</label><textarea rows={4} className="input" value={form.Description} onChange={set('Description')} /></div>
          <button type="submit" className="hidden" />
        </form>
      )}
    </Modal>
  );
}
