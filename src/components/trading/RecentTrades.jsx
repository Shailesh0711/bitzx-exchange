import { useEffect, useState, useRef } from 'react';
import { exchangeWsPath } from '@/services/marketApi';
import { useAuth } from '@/context/AuthContext';

const fmtP = n => {
  const v = parseFloat(n);
  return v >= 10000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
       : v >= 1     ? v.toFixed(4)
                    : v.toFixed(6);
};
const fmtQ = n => {
  const v = parseFloat(n);
  return v >= 1e6 ? (v / 1e6).toFixed(2) + 'M'
       : v >= 1e3 ? (v / 1e3).toFixed(2) + 'K'
                 : v.toFixed(3);
};
const ts = ms => new Date(ms).toLocaleTimeString('en-US', {
  hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
});

export default function RecentTrades({ symbol }) {
  const { orderHistory } = useAuth();

  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [newestId, setNewestId] = useState(null);

  const prevTopId = useRef(null);

  useEffect(() => {
    setLoading(true);
    setTrades([]);
    prevTopId.current = null;
    const qs = new URLSearchParams({ symbol, limit: '40' });
    const url = exchangeWsPath(`/api/ws/exchange/trades?${qs.toString()}`);
    let closed = false;
    let reconnectTimer = null;
    let ws = null;
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data);
          if (j.type === 'exchange_trades' && Array.isArray(j.trades)) {
            const data = j.trades;
            if (!data.length) {
              setLoading(false);
              return;
            }
            setLoading(false);
            setTrades(data);
            const topId = data[0]?.id ?? data[0]?.tradeId ?? null;
            if (topId && topId !== prevTopId.current) {
              prevTopId.current = topId;
              setNewestId(topId);
              setTimeout(() => setNewestId(null), 900);
            }
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        ws = null;
        if (!closed) reconnectTimer = window.setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [symbol]);

  // Collect prices from user's filled orders (for "your fill" highlighting)
  const myFilledPrices = new Set(
    (orderHistory || [])
      .filter(o => o.status === 'filled' && o.avg_price)
      .map(o => fmtP(o.avg_price))
  );

  return (
    <div className="flex flex-col bg-surface-DEFAULT" style={{ minHeight: 0 }}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          {trades.map((t, i) => {
            const isBuy      = !t.isBuyerMaker;
            const priceStr   = fmtP(t.price);
            const qty        = parseFloat(t.qty);
            const id         = t.id ?? t.tradeId ?? i;
            const isNewest   = id === newestId;
            const isMyFill   = myFilledPrices.has(priceStr);

            return (
              <div
                key={id}
                className={`flex items-center px-3 py-[8px] text-[13px] transition-all duration-500 ${
                  isNewest
                    ? isBuy ? 'bg-green-500/20' : 'bg-red-500/20'
                    : isMyFill
                    ? 'bg-gold/10'
                    : 'hover:bg-white/[.04]'
                }`}
              >
                <span className={`w-2/5 font-mono font-semibold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                  {priceStr}
                </span>
                <span className="w-1/3 text-right text-[#D5D5D0] font-mono">{fmtQ(qty)}</span>
                <span className="flex-1 text-right text-[#4A4B50] tabular-nums">{ts(t.time)}</span>
                {isMyFill && (
                  <span className="ml-1.5 px-1 py-0 text-[8px] rounded bg-gold/20 text-gold-light font-bold uppercase leading-tight">
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
