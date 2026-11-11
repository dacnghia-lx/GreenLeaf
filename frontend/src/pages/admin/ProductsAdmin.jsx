import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useHotkeys } from 'react-hotkeys-hook';
import toast from 'react-hot-toast';
import { api, errMsg, download, money, dateTime, imgSrc, PRODUCT_TYPES } from '../../lib/api';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ProductFormModal from '../../components/ProductFormModal';

// Các cột của bảng — người dùng có thể ẩn/hiện, lưu vào localStorage
const COLUMNS = [
  { key: 'ProductID', label: 'Mã SP', sortable: true, render: (p) => `#${p.ProductID}` },
  { key: 'PathImage', label: 'Ảnh', render: (p) => <img src={imgSrc(p.PathImage)} className="h-10 w-10 rounded object-cover" /> },
  { key: 'ProductName', label: 'Tên sản phẩm', sortable: true, render: (p) => <span className="font-medium">{p.ProductName}</span> },
  { key: 'ProductType', label: 'Loại', sortable: true, render: (p) => PRODUCT_TYPES[p.ProductType] },
  { key: 'Quantity', label: 'Số lượng', sortable: true, className: 'text-right' },
  { key: 'Unit', label: 'Đơn vị' },
  { key: 'Price', label: 'Giá', sortable: true, className: 'text-right', render: (p) => money(p.Price) },
  { key: 'Description', label: 'Mô tả', render: (p) => <span className="line-clamp-2 max-w-xs text-stone-600">{p.Description}</span> },
  { key: 'CreateDate', label: 'Ngày tạo', sortable: true, render: (p) => dateTime(p.CreateDate) },
  { key: 'UpdateDate', label: 'Ngày cập nhật', sortable: true, render: (p) => dateTime(p.UpdateDate) },
];
const DEFAULT_HIDDEN = ['Description', 'UpdateDate'];

const SHORTCUTS = [
  ['Alt + N', 'Thêm sản phẩm mới'],
  ['Alt + S', 'Lưu form đang mở'],
  ['Alt + E', 'Sửa sản phẩm đang chọn (chọn đúng 1 dòng)'],
  ['Alt + V', 'Xem chi tiết sản phẩm đang chọn'],
  ['Alt + C', 'Sao chép các sản phẩm đã chọn'],
  ['Delete / Alt + Delete', 'Xoá các sản phẩm đã chọn'],
  ['Alt + A', 'Chọn / bỏ chọn tất cả dòng trong trang'],
  ['/ hoặc Alt + K', 'Tìm kiếm'],
  ['Alt + I', 'Import file (Excel, JSON, XML)'],
  ['Alt + X', 'Export Excel'],
  ['Alt + PageDown / PageUp', 'Trang sau / trang trước'],
  ['Alt + H', 'Hiện bảng phím tắt'],
  ['Esc', 'Đóng hộp thoại / bỏ chọn'],
];

function useDebounce(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function ProductsAdmin() {
  const qc = useQueryClient();
  const searchRef = useRef(null);
  const importRef = useRef(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [type, setType] = useState('');
  const [sort, setSort] = useState({ by: 'ProductID', dir: 'desc' });
  const [selected, setSelected] = useState(new Set());
  const [hidden, setHidden] = useState(() => JSON.parse(localStorage.getItem('productHiddenCols') || 'null') ?? DEFAULT_HIDDEN);
  const [showCols, setShowCols] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [modal, setModal] = useState({ mode: null, product: null });
  const [confirm, setConfirm] = useState(null); // { ids }
  const [importResult, setImportResult] = useState(null);

  useEffect(() => localStorage.setItem('productHiddenCols', JSON.stringify(hidden)), [hidden]);
  useEffect(() => setPage(1), [q, type, pageSize]);

  const { data, isFetching } = useQuery({
    queryKey: ['products', { page, pageSize, q, type, sort }],
    queryFn: async () => (await api.get('/products', { params: { page, pageSize, q, type, sortBy: sort.by, sortDir: sort.dir } })).data,
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const visibleCols = useMemo(() => COLUMNS.filter((c) => !hidden.includes(c.key)), [hidden]);
  const selectedIds = [...selected];
  const allOnPageSelected = items.length > 0 && items.every((p) => selected.has(p.ProductID));
  const anyModalOpen = Boolean(modal.mode || confirm || showHelp || importResult);

  const refresh = () => qc.invalidateQueries({ queryKey: ['products'] });
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((s) => {
    const n = new Set(s);
    items.forEach((p) => (allOnPageSelected ? n.delete(p.ProductID) : n.add(p.ProductID)));
    return n;
  });
  const sortBy = (key) => setSort((s) => ({ by: key, dir: s.by === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  // ---------- Hành động ----------
  const openCreate = () => setModal({ mode: 'create', product: null });
  const findSelectedOne = () => {
    if (selectedIds.length !== 1) { toast('Hãy chọn đúng 1 sản phẩm', { icon: 'ℹ️' }); return null; }
    return items.find((p) => p.ProductID === selectedIds[0]) ?? { ProductID: selectedIds[0] };
  };
  const openWith = async (mode, p) => {
    if (!p) return;
    // Lấy bản mới nhất từ server (phòng khi sản phẩm nằm ở trang khác)
    try { setModal({ mode, product: (await api.get(`/products/${p.ProductID}`)).data }); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const copy = async (ids) => {
    if (!ids.length) return toast('Chưa chọn sản phẩm nào', { icon: 'ℹ️' });
    try {
      // 1 dòng -> POST /products/:id/copy ; nhiều dòng -> POST /products/copy
      if (ids.length === 1) await api.post(`/products/${ids[0]}/copy`);
      else await api.post('/products/copy', { ids });
      toast.success(`Đã sao chép ${ids.length} sản phẩm`);
      setSelected(new Set());
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const askDelete = (ids) => (ids.length ? setConfirm({ ids }) : toast('Chưa chọn sản phẩm nào', { icon: 'ℹ️' }));
  const doDelete = async () => {
    const { ids } = confirm;
    try {
      if (ids.length === 1) await api.delete(`/products/${ids[0]}`);
      else await api.post('/products/bulk-delete', { ids });
      toast.success(`Đã xoá ${ids.length} sản phẩm`);
      setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
      setConfirm(null);
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const doExport = async (format) => {
    try {
      await download('/products/export', { format, q, type, ids: selectedIds.length ? selectedIds.join(',') : undefined });
      toast.success(selectedIds.length ? `Đã export ${selectedIds.length} sản phẩm đã chọn` : 'Đã export danh sách');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const doImport = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/products/import', fd);
      setImportResult(data);
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
    finally { importRef.current.value = ''; }
  };

  // ---------- Phím tắt ----------
  const hk = (keys, fn, opts = {}) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkeys(keys, (e) => { e.preventDefault(); fn(); }, { enableOnFormTags: true, enabled: !anyModalOpen, ...opts }, [fn, anyModalOpen]);

  hk('alt+n', openCreate);
  hk('alt+e', () => openWith('edit', findSelectedOne()));
  hk('alt+v', () => openWith('view', findSelectedOne()));
  hk('alt+c', () => copy(selectedIds));
  hk('alt+delete', () => askDelete(selectedIds));
  hk('delete', () => askDelete(selectedIds), { enableOnFormTags: false });
  hk('alt+a', togglePage);
  hk('alt+k', () => searchRef.current?.focus());
  hk('slash', () => searchRef.current?.focus(), { enableOnFormTags: false });
  hk('alt+i', () => importRef.current?.click());
  hk('alt+x', () => doExport('xlsx'));
  hk('alt+pagedown', () => setPage((p) => Math.min(totalPages, p + 1)));
  hk('alt+pageup', () => setPage((p) => Math.max(1, p - 1)));
  hk('alt+h', () => setShowHelp(true));
  hk('escape', () => setSelected(new Set()));
  // Alt+E trong màn hình xem chi tiết -> chuyển sang sửa
  useHotkeys('alt+e', (e) => { e.preventDefault(); setModal((m) => ({ ...m, mode: 'edit' })); }, { enabled: modal.mode === 'view', enableOnFormTags: true });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Quản lý sản phẩm</h1>
        <button className="btn-primary" onClick={openCreate}>＋ Thêm <kbd className="text-stone-700">Alt+N</kbd></button>
        <button className="btn-outline" onClick={() => importRef.current.click()}>⬆ Import</button>
        <input ref={importRef} type="file" accept=".xlsx,.json,.xml" className="hidden" onChange={(e) => doImport(e.target.files[0])} />
        <div className="relative group">
          <button className="btn-outline">⬇ Export ▾</button>
          <div className="invisible absolute right-0 z-20 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg group-hover:visible group-focus-within:visible">
            {['xlsx', 'json', 'xml'].map((f) => (
              <button key={f} className="block w-full px-4 py-2 text-left text-sm hover:bg-stone-100" onClick={() => doExport(f)}>
                {f === 'xlsx' ? 'Excel (.xlsx)' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-outline" onClick={() => setShowHelp(true)} title="Alt+H">⌨ Phím tắt</button>
      </div>

      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
        <input ref={searchRef} className="input max-w-sm" placeholder="Tìm theo mã, tên, mô tả, đơn vị...  ( / )" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[180px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tất cả loại</option>
          {Object.entries(PRODUCT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input max-w-[130px]" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {[10, 15, 20, 50].map((n) => <option key={n} value={n}>{n} / trang</option>)}
        </select>
        <div className="relative">
          <button className="btn-outline" onClick={() => setShowCols((v) => !v)}>☰ Cột hiển thị</button>
          {showCols && (
            <div className="absolute z-20 mt-1 w-52 rounded-lg border bg-white p-2 shadow-lg" onMouseLeave={() => setShowCols(false)}>
              {COLUMNS.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-100">
                  <input type="checkbox" checked={!hidden.includes(c.key)}
                    onChange={() => setHidden((h) => (h.includes(c.key) ? h.filter((k) => k !== c.key) : [...h, c.key]))} />
                  {c.label}
                </label>
              ))}
              <button className="mt-1 w-full text-xs text-green-700 underline" onClick={() => setHidden(DEFAULT_HIDDEN)}>Mặc định</button>
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Đã chọn <b>{selectedIds.length}</b></span>
            <button className="btn-outline" onClick={() => copy(selectedIds)}>⧉ Sao chép <kbd>Alt+C</kbd></button>
            <button className="btn-danger" onClick={() => askDelete(selectedIds)}>🗑 Xoá <kbd className="text-stone-700">Del</kbd></button>
            <button className="text-stone-500 underline" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600">
            <tr>
              <th className="w-10 p-3"><input type="checkbox" checked={allOnPageSelected} onChange={togglePage} title="Alt+A" /></th>
              {visibleCols.map((c) => (
                <th key={c.key} className={`whitespace-nowrap p-3 ${c.className ?? ''} ${c.sortable ? 'cursor-pointer select-none hover:text-green-700' : ''}`}
                  onClick={() => c.sortable && sortBy(c.key)}>
                  {c.label}{sort.by === c.key && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className={isFetching ? 'opacity-60' : ''}>
            {items.map((p) => (
              <tr key={p.ProductID} onClick={() => toggle(p.ProductID)} onDoubleClick={() => openWith('view', p)}
                className={`cursor-pointer border-t ${selected.has(p.ProductID) ? 'bg-green-50' : 'hover:bg-stone-50'}`}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(p.ProductID)} onChange={() => toggle(p.ProductID)} />
                </td>
                {visibleCols.map((c) => <td key={c.key} className={`p-3 ${c.className ?? ''}`}>{c.render ? c.render(p) : p[c.key]}</td>)}
                <td className="whitespace-nowrap p-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button className="px-1.5 text-blue-600 hover:underline" onClick={() => openWith('view', p)}>Xem</button>
                  <button className="px-1.5 text-green-700 hover:underline" onClick={() => openWith('edit', p)}>Sửa</button>
                  <button className="px-1.5 text-stone-600 hover:underline" onClick={() => copy([p.ProductID])}>Sao chép</button>
                  <button className="px-1.5 text-red-600 hover:underline" onClick={() => askDelete([p.ProductID])}>Xoá</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={visibleCols.length + 2} className="p-8 text-center text-stone-500">Không có sản phẩm</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-sm text-stone-500">Tổng: {data?.total ?? 0} sản phẩm · Trang {page}/{totalPages}</div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ProductFormModal
        mode={modal.mode}
        product={modal.product}
        onClose={() => setModal({ mode: null, product: null })}
        onEdit={() => setModal((m) => ({ ...m, mode: 'edit' }))}
        onSaved={() => { setModal({ mode: null, product: null }); refresh(); }}
      />

      <Modal open={Boolean(confirm)} title="Xác nhận xoá" size="max-w-md" onClose={() => setConfirm(null)}
        footer={<><button className="btn-outline" onClick={() => setConfirm(null)}>Huỷ</button><button autoFocus className="btn-danger" onClick={doDelete}>Xoá</button></>}>
        Bạn có chắc muốn xoá <b>{confirm?.ids.length}</b> sản phẩm? Thao tác này không thể hoàn tác.
      </Modal>

      <Modal open={Boolean(importResult)} title="Kết quả import" size="max-w-md" onClose={() => setImportResult(null)}
        footer={<button className="btn-primary" onClick={() => setImportResult(null)}>OK</button>}>
        {importResult && (
          <div className="space-y-2 text-sm">
            <p>Tổng số dòng: <b>{importResult.total}</b> · Thêm mới: <b className="text-green-700">{importResult.created}</b> · Cập nhật: <b className="text-blue-700">{importResult.updated}</b></p>
            {importResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded bg-red-50 p-2 text-red-700">
                {importResult.errors.map((e) => <p key={e.row}>Dòng {e.row}: {e.message}</p>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showHelp} title="Phím tắt" size="max-w-lg" onClose={() => setShowHelp(false)}>
        <table className="w-full text-sm">
          <tbody>
            {SHORTCUTS.map(([k, d]) => <tr key={k} className="border-b last:border-0"><td className="py-1.5 pr-4"><kbd>{k}</kbd></td><td>{d}</td></tr>)}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}
