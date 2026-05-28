function fmtPrice(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toFixed(6);
}

function fmtQty(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function withCum(levels) {
  let running = 0;
  return levels.map((r) => {
    running += Number(r.qty || 0);
    return { ...r, cum: running };
  });
}

export default function BZXOrderbook({ orderbook }) {
  const bids = withCum((orderbook?.bids || []).slice(0, 12));
  const asks = withCum((orderbook?.asks || []).slice(0, 12));
  const maxCum = Math.max(
    1,
    bids[bids.length - 1]?.cum || 0,
    asks[asks.length - 1]?.cum || 0,
  );
  const bestBid = Number(bids[0]?.price || 0);
  const bestAsk = Number(asks[0]?.price || 0);
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#0d0f14]">
      <div className="px-4 py-3 border-b border-white/10 text-white font-bold">Order Book</div>
      <div className="grid grid-cols-2 gap-0 border-b border-white/10">
        <div className="px-3 py-2 text-[11px] uppercase text-green-400 font-bold">Bids</div>
        <div className="px-3 py-2 text-[11px] uppercase text-red-400 font-bold">Asks</div>
      </div>

      <div className="grid grid-cols-2 gap-0 flex-1 min-h-0">
        <div className="border-r border-white/10 overflow-y-auto">
          {bids.map((r, i) => {
            const pct = Math.min(100, (r.cum / maxCum) * 100);
            return (
              <div key={`b-${i}-${r.price}`} className="relative px-3 py-1.5 text-xs font-mono">
                <div className="absolute inset-y-0 left-0 bg-green-500/10" style={{ width: `${pct}%` }} />
                <div className="relative flex justify-between">
                  <span className="text-green-400">{fmtPrice(r.price)}</span>
                  <span className="text-white">{fmtQty(r.qty)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="overflow-y-auto">
          {asks.map((r, i) => {
            const pct = Math.min(100, (r.cum / maxCum) * 100);
            return (
              <div key={`a-${i}-${r.price}`} className="relative px-3 py-1.5 text-xs font-mono">
                <div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${pct}%` }} />
                <div className="relative flex justify-between">
                  <span className="text-red-400">{fmtPrice(r.price)}</span>
                  <span className="text-white">{fmtQty(r.qty)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-white/10 text-xs text-white/70 font-mono flex justify-between">
        <span>Spread</span>
        <span>
          {spread > 0 ? fmtPrice(spread) : '—'} ({spreadPct.toFixed(3)}%)
        </span>
      </div>
    </div>
  );
}
