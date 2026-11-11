import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errMsg, money, imgSrc } from '../lib/api';

const SEVERITY = { none: 'Không', mild: 'Nhẹ', moderate: 'Trung bình', severe: 'Nặng' };

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="ml-5 list-disc text-sm text-stone-700">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

export default function Diagnose() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const pick = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    const fd = new FormData();
    fd.append('image', file);
    setLoading(true);
    try { setResult((await api.post('/ai/diagnose', fd)).data); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">🔬 AI chẩn đoán bệnh cây</h1>
        <p className="mt-1 text-sm text-stone-600">Chụp rõ phần lá/thân bị bệnh, đủ sáng. AI sẽ nhận diện bệnh và gợi ý sản phẩm điều trị.</p>
        <label
          className="mt-4 flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-green-300 bg-green-50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
        >
          {preview ? <img src={preview} className="h-full w-full object-contain" /> : <span className="text-green-700">Bấm hoặc kéo thả ảnh vào đây</span>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files[0])} />
        </label>
        <button className="btn-primary mt-4 w-full justify-center" disabled={!file || loading} onClick={submit}>
          {loading ? 'AI đang phân tích...' : 'Chẩn đoán'}
        </button>
      </div>

      <div className="card space-y-4 p-6">
        {!result ? <p className="text-stone-500">Kết quả chẩn đoán sẽ hiện ở đây.</p> : !result.isPlant ? (
          <p>Ảnh này có vẻ không phải cây trồng. Hãy thử ảnh khác.</p>
        ) : (
          <>
            {result.mock && <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Đang dùng dữ liệu mẫu (chưa cấu hình ANTHROPIC_API_KEY).</p>}
            <div>
              <p className="text-sm text-stone-500">{result.plantName}</p>
              <h2 className={`text-xl font-bold ${result.healthy ? 'text-green-700' : 'text-red-600'}`}>
                {result.healthy ? '✅ Cây khoẻ mạnh' : `⚠️ ${result.diseaseName}`}
              </h2>
              <p className="text-sm">Độ tin cậy: {Math.round(result.confidence * 100)}% · Mức độ: {SEVERITY[result.severity]}</p>
            </div>
            <List title="Triệu chứng" items={result.symptoms} />
            <List title="Nguyên nhân" items={result.causes} />
            <List title="Cách xử lý" items={result.treatment} />
            <List title="Phòng ngừa" items={result.prevention} />
            {result.products?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Sản phẩm gợi ý</h3>
                <div className="grid grid-cols-2 gap-3">
                  {result.products.map((p) => (
                    <Link key={p.ProductID} to={`/san-pham/${p.ProductID}`} className="flex items-center gap-2 rounded-lg border p-2 hover:bg-stone-50">
                      <img src={imgSrc(p.PathImage)} className="h-12 w-12 rounded object-cover" />
                      <div className="text-sm"><p className="line-clamp-1 font-medium">{p.ProductName}</p><p className="text-red-600">{money(p.Price)}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
