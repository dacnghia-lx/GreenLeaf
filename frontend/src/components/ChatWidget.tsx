// Nút chat nổi góc phải dưới: chatbot tư vấn chăm sóc cây (POST /api/ai/chat)
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg, imgSrc, money } from '../lib/api';
import type { ChatMessage, ChatResponse, Product } from '../types';

interface UiMessage extends ChatMessage {
  products?: Product[];
  mock?: boolean;
  error?: boolean;
}

const GREETING: UiMessage = {
  role: 'assistant',
  content: 'Xin chào! Mình là trợ lý GreenLeaf 🌿. Bạn cần tư vấn chọn cây, cách tưới, bón phân hay xử lý sâu bệnh?',
};
const SUGGESTIONS = ['Cây nào hợp để bàn làm việc ít nắng?', 'Lá cây bị vàng phải làm sao?', 'Bao lâu thì nên bón phân?'];
const MAX_HISTORY = 20;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // Bỏ lời chào và tin lỗi, chỉ gửi lịch sử gần nhất cho server
      const history: ChatMessage[] = next.slice(1).filter((m) => !m.error).slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }));
      const { data } = await api.post<ChatResponse>('/ai/chat', { messages: history });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, products: data.products, mock: data.mock }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: errMsg(e), error: true }]);
    } finally { setLoading(false); }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  return (
    <div className="print:hidden">
      {open && (
        <section className="fixed bottom-24 right-4 z-40 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl" aria-label="Chatbot tư vấn">
          <header className="flex items-center justify-between bg-green-700 px-4 py-3 text-white">
            <div><p className="font-semibold">Trợ lý GreenLeaf</p><p className="text-xs opacity-80">Tư vấn chăm sóc cây bằng AI</p></div>
            <div className="flex gap-2">
              <button className="text-xs underline opacity-80 hover:opacity-100" onClick={() => setMessages([GREETING])}>Làm mới</button>
              <button className="text-2xl leading-none" onClick={() => setOpen(false)} aria-label="Đóng chat">×</button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-green-700 text-white' : m.error ? 'bg-red-50 text-red-700' : 'border bg-white'}`}>
                  <p className="whitespace-pre-line">{m.content}</p>
                  {m.mock && <p className="mt-1 text-[11px] text-amber-700">(Dữ liệu mẫu – chưa cấu hình OPENAI_API_KEY)</p>}
                  {!!m.products?.length && (
                    <div className="mt-2 space-y-1">
                      {m.products.map((p) => (
                        <Link key={p.ProductID} to={`/san-pham/${p.ProductID}`} className="flex items-center gap-2 rounded-lg border p-1.5 hover:bg-stone-50" onClick={() => setOpen(false)}>
                          <img src={imgSrc(p.PathImage)} alt="" className="h-9 w-9 rounded object-cover" />
                          <span className="min-w-0 flex-1"><span className="line-clamp-1 font-medium">#{p.ProductID} {p.ProductName}</span><span className="text-xs text-red-600">{money(p.Price)}</span></span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1">
                {SUGGESTIONS.map((s) => <button key={s} className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-green-50" onClick={() => void send(s)}>{s}</button>)}
              </div>
            )}
            {loading && <p className="text-xs text-stone-500">Trợ lý đang trả lời...</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t p-2">
            <input ref={inputRef} className="input" placeholder="Nhập câu hỏi..." value={input} maxLength={4000} onChange={(e) => setInput(e.target.value)} />
            <button className="btn-primary" disabled={loading || !input.trim()}>Gửi</button>
          </form>
        </section>
      )}
      <button
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-2xl text-white shadow-lg hover:bg-green-800"
        onClick={() => setOpen((v) => !v)} aria-label={open ? 'Đóng chatbot' : 'Mở chatbot tư vấn'} title="Chatbot tư vấn"
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
