import { ChevronDown } from 'lucide-react';

export default function MarketsPagination({
  shown = 0,
  total = 0,
  pageSize = 50,
  onLoadMore,
  loading = false,
  className = '',
}) {
  if (total <= 0 || shown >= total) return null;
  const remaining = total - shown;
  const next = Math.min(pageSize, remaining);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 py-4 ${className}`}>
      <p className="text-[11px] sm:text-xs text-zinc-500 tabular-nums">
        Showing <span className="text-white font-semibold">{shown}</span> of{' '}
        <span className="text-white font-semibold">{total}</span> pairs
      </p>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/35 bg-gold/10 text-gold-light text-sm font-bold hover:bg-gold/20 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Loading…' : `Load ${next} more`}
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
