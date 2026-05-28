function num(v, d = 4) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

export default function BZXTicker({ ticker }) {
  const flash = Number(ticker?.change24h || 0) >= 0 ? 'up' : 'down';
  const cls =
    flash === 'up'
      ? 'text-green-400 bg-green-500/10 animate-pulse'
      : flash === 'down'
        ? 'text-red-400 bg-red-500/10 animate-pulse'
        : 'text-white';

  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-white/10 bg-[#0d0f14]">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55 font-bold">Price</div>
        <div key={String(ticker?.price ?? '')} className={`font-mono text-2xl font-extrabold px-2 py-1 rounded ${cls}`}>${num(ticker?.price, 6)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55 font-bold">24h Change</div>
        <div className={`font-mono text-lg font-bold ${Number(ticker?.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {Number(ticker?.change24h || 0) >= 0 ? '+' : ''}
          {num(ticker?.change24h, 3)}%
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55 font-bold">24h Volume</div>
        <div className="font-mono text-lg text-white font-bold">{num(ticker?.volume24h, 2)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/55 font-bold">Market Cap</div>
        <div className="font-mono text-lg text-white font-bold">${num(ticker?.marketCap, 0)}</div>
      </div>
    </div>
  );
}
