interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
  const btn = 'min-w-9 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40';
  return (
    <div className="mt-4 flex items-center justify-center gap-1 print:hidden">
      <button className={btn} disabled={page === 1} onClick={() => onChange(1)}>«</button>
      <button className={btn} disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p) => (
        <button key={p} className={`${btn} ${p === page ? 'border-green-700 bg-green-700 text-white' : 'bg-white'}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className={btn} disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
      <button className={btn} disabled={page === totalPages} onClick={() => onChange(totalPages)}>»</button>
    </div>
  );
}
