import { useFutures } from '@/context/FuturesContext';

export default function FuturesRecentTrades() {
  const { recentTrades } = useFutures();
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10 text-sm font-medium text-white/80">Trades</div>
      <div className="grid grid-cols-3 gap-2 px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/40">
        <span>Price</span><span className="text-right">Qty</span><span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {(recentTrades || []).slice(0, 30).map((t) => {
          const buy = t.side === 'buy';
          const time = (t.created_at || '').slice(11, 19);
          return (
            <div key={t.id} className="grid grid-cols-3 gap-2 px-3 py-0.5 text-xs font-mono">
              <span className={buy ? 'text-emerald-300' : 'text-rose-300'}>{Number(t.price).toFixed(2)}</span>
              <span className="text-right text-white/80">{Number(t.qty).toFixed(4)}</span>
              <span className="text-right text-white/40">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
