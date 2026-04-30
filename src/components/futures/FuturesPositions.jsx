import { useState } from 'react';
import { useFutures } from '@/context/FuturesContext';

function PnlCell({ value }) {
  const v = Number(value || 0);
  const cls = v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-white/70';
  return <span className={`font-mono ${cls}`}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>;
}

export default function FuturesPositions() {
  const { positions, closePosition, markets } = useFutures();
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  const close = async (p, fraction) => {
    setBusyId(p.id); setErr(null);
    try {
      const qty = fraction ? Math.max(0, Math.abs(p.qty) * fraction) : null;
      await closePosition({ symbol: p.symbol, quantity: qty });
    } catch (e) { setErr(e?.detail || e?.message || 'close failed'); }
    finally { setBusyId(null); }
  };

  if (!positions.length) {
    return <div className="px-4 py-8 text-center text-sm text-white/40">No open positions.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/40 uppercase tracking-wider text-[10px]">
            <th className="text-left px-3 py-2">Symbol</th>
            <th className="text-left px-3 py-2">Side</th>
            <th className="text-right px-3 py-2">Size</th>
            <th className="text-right px-3 py-2">Entry</th>
            <th className="text-right px-3 py-2">Mark</th>
            <th className="text-right px-3 py-2">PnL</th>
            <th className="text-right px-3 py-2">Margin</th>
            <th className="text-right px-3 py-2">Liq.</th>
            <th className="text-right px-3 py-2">Lev</th>
            <th className="text-right px-3 py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const mark = Number(markets[p.symbol]?.mark_price || p.mark_price || p.entry_price);
            const upnl = Number(p.unrealized_pnl || 0);
            const sideColor = p.side === 'long' ? 'text-emerald-300' : 'text-rose-300';
            return (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-medium text-white/90">{p.symbol}</td>
                <td className={`px-3 py-2 font-semibold ${sideColor}`}>{p.side.toUpperCase()}</td>
                <td className="px-3 py-2 text-right font-mono">{Math.abs(Number(p.qty)).toFixed(4)}</td>
                <td className="px-3 py-2 text-right font-mono">{Number(p.entry_price).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{mark.toFixed(2)}</td>
                <td className="px-3 py-2 text-right"><PnlCell value={upnl} /></td>
                <td className="px-3 py-2 text-right font-mono">{Number(p.isolated_margin).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-300">{Number(p.liquidation_price || 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{p.leverage}x</td>
                <td className="px-3 py-2 text-right pr-4 space-x-2 whitespace-nowrap">
                  <button disabled={busyId === p.id}
                    onClick={() => close(p, 0.5)}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80">50%</button>
                  <button disabled={busyId === p.id}
                    onClick={() => close(p, null)}
                    className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40 hover:bg-rose-500/30">Close</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {err && <div className="px-3 py-2 text-xs text-rose-400">{String(err)}</div>}
    </div>
  );
}
