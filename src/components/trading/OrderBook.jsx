import { useEffect, useState, useRef, useCallback } from 'react';
import { marketApi } from '@/services/marketApi';

const fmtP = n => {
  const v = parseFloat(n);
  return v >= 10000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
       : v >= 1000  ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
       : v >= 1     ? v.toFixed(4)
                    : v.toFixed(6);
};
const fmtQ = n => {
  const v = parseFloat(n);
  return v >= 1000000 ? (v / 1000000).toFixed(2) + 'M'
       : v >= 1000    ? (v / 1000).toFixed(2) + 'K'
                      : v.toFixed(3);
};

// ── Single row ─────────────────────────────────────────────────────────────────
function Row({ price, qty, side, pct, cumPct, onPriceClick, flashing }) {
  const isGreen  = side === 'bid';
  const flashCls = flashing
    ? isGreen ? 'bg-green-500/30' : 'bg-red-500/30'
    : '';

  return (
    <div
      onClick={() => onPriceClick?.(fmtP(price))}
      className={`relative flex items-center px-3 py-[9px] cursor-pointer
        hover:bg-white/[.06] transition-colors duration-300 ${flashCls}`}
    >
      {/* Cumulative depth background */}
      <div
        className={`absolute inset-y-0 ${isGreen ? 'left-0' : 'right-0'} transition-all duration-300`}
        style={{ width: `${cumPct}%`, background: isGreen ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)' }}
      />
      {/* Per-level fill bar */}
      <div
        className={`absolute inset-y-0 ${isGreen ? 'left-0' : 'right-0'} transition-all duration-300`}
        style={{ width: `${pct}%`, background: isGreen ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)' }}
      />
      <span className={`relative w-1/3 font-mono font-bold text-[14px] ${isGreen ? 'text-green-400' : 'text-red-400'}`}>
        {fmtP(price)}
      </span>
      <span className="relative w-1/3 text-right text-[#D5D5D0] font-mono text-[13px] font-semibold">{fmtQ(qty)}</span>
      <span className="relative w-1/3 text-right text-[#6B6B70] font-mono text-[12px]">
        {fmtQ(parseFloat(price) * parseFloat(qty))}
      </span>
    </div>
  );
}

// ── Order Book ─────────────────────────────────────────────────────────────────
const DEPTHS = [10, 14, 20];

export default function OrderBook({ symbol, onPriceClick }) {
  const [book,     setBook]     = useState({ asks: [], bids: [] });
  const [loading,  setLoading]  = useState(true);
  const [depth,    setDepth]    = useState(12);
  const [flashing, setFlashing] = useState(new Set());

  const prevRef = useRef({ asks: [], bids: [] });
  const timer   = useRef(null);

  const load = useCallback(() => {
    marketApi.getOrderBook(symbol, depth).then(raw => {
      setLoading(false);
      const prev    = prevRef.current;
      const changed = new Set();
      const prevMap = new Map([
        ...prev.asks.map(([p, q]) => [p, q]),
        ...prev.bids.map(([p, q]) => [p, q]),
      ]);
      [...(raw.asks || []), ...(raw.bids || [])].forEach(([p, q]) => {
        const pv = prevMap.get(p);
        if (pv !== undefined && pv !== q) changed.add(p);
      });
      if (changed.size > 0) {
        setFlashing(changed);
        setTimeout(() => setFlashing(new Set()), 550);
      }
      prevRef.current = raw;
      setBook(raw);
    }).catch(() => {});
  }, [symbol, depth]);

  useEffect(() => {
    setLoading(true);
    setBook({ asks: [], bids: [] });
    load();
    timer.current = setInterval(load, 1500);
    return () => clearInterval(timer.current);
  }, [load]);

  const asks    = [...(book.asks || [])].slice(0, depth).reverse();
  const bids    = (book.bids  || []).slice(0, depth);

  const askTotals = asks.reduce((acc, [p, q]) => [...acc, (acc[acc.length - 1] || 0) + parseFloat(p) * parseFloat(q)], []);
  const bidTotals = bids.reduce((acc, [p, q]) => [...acc, (acc[acc.length - 1] || 0) + parseFloat(p) * parseFloat(q)], []);
  const maxAsk    = askTotals[askTotals.length - 1] || 1;
  const maxBid    = bidTotals[bidTotals.length - 1] || 1;
  const maxTotal  = Math.max(...[...asks, ...bids].map(([p, q]) => parseFloat(p) * parseFloat(q)), 1);

  const bestAsk   = asks.length ? parseFloat(asks[asks.length - 1][0]) : 0;
  const bestBid   = bids.length ? parseFloat(bids[0][0]) : 0;
  const spread    = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;
  const mid       = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0;

  return (
    <div className="flex flex-col h-full bg-surface-DEFAULT select-none">

      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-extrabold text-white tracking-wide">Order Book</span>
        <div className="flex gap-1">
          {DEPTHS.map(d => (
            <button key={d} onClick={() => setDepth(d)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors font-bold ${
                depth === d ? 'bg-gold/20 text-gold-light' : 'text-[#4A4B50] hover:text-white hover:bg-white/5'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex px-3 py-2.5 text-[11px] text-[#4A4B50] uppercase tracking-widest font-bold flex-shrink-0 border-b border-surface-border/50">
        <span className="w-1/3">Price (USDT)</span>
        <span className="w-1/3 text-right">Amount</span>
        <span className="w-1/3 text-right">Total</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* Asks — reversed so lowest ask is nearest the spread */}
          <div className="flex-1 overflow-y-auto flex flex-col-reverse scrollbar-hide min-h-0">
            <div className="flex flex-col">
              <div className="px-3 pt-2 pb-1">
                <span className="text-[11px] text-red-400/80 uppercase tracking-widest font-extrabold">
                  ▼ Asks (Sell)
                </span>
              </div>
              {asks.map(([p, q], i) => {
                const revIdx = asks.length - 1 - i;
                return (
                  <Row key={p}
                    price={p} qty={q} side="ask" onPriceClick={onPriceClick}
                    pct={Math.min((parseFloat(p) * parseFloat(q) / maxTotal) * 100, 100)}
                    cumPct={Math.min((askTotals[revIdx] / maxAsk) * 100, 100)}
                    flashing={flashing.has(p)}
                  />
                );
              })}
            </div>
          </div>

          {/* Spread strip */}
          <button
            onClick={() => mid > 0 && onPriceClick?.(fmtP(mid))}
            className="flex items-center justify-between px-4 py-3.5
              border-y border-surface-border bg-surface-card
              hover:bg-surface-hover flex-shrink-0 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-extrabold text-gold-light font-mono tracking-tight">
                {mid > 0 ? fmtP(mid) : '—'}
              </span>
              <span className="text-[10px] text-[#4A4B50] bg-white/[.04] px-1.5 py-0.5 rounded font-bold">MID</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#4A4B50] font-semibold">
                Spread {spread > 0 ? fmtP(spread) : '—'}
              </div>
              {spreadPct > 0 && (
                <div className="text-[10px] text-[#3a3d45]">{spreadPct.toFixed(3)}%</div>
              )}
            </div>
          </button>

          {/* Bids */}
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
            <div className="px-3 pt-2 pb-1">
              <span className="text-[11px] text-green-400/80 uppercase tracking-widest font-extrabold">
                ▲ Bids (Buy)
              </span>
            </div>
            {bids.map(([p, q], i) => (
              <Row key={p}
                price={p} qty={q} side="bid" onPriceClick={onPriceClick}
                pct={Math.min((parseFloat(p) * parseFloat(q) / maxTotal) * 100, 100)}
                cumPct={Math.min((bidTotals[i] / maxBid) * 100, 100)}
                flashing={flashing.has(p)}
              />
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
