import { useEffect, useState } from 'react';
import { exchangeWsPath, marketApi, normalizeMarketsList } from '@/services/marketApi';

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'BZXUSDT', 'SOLUSDT'];

function formatPrice(price) {
  const px = parseFloat(price || 0);
  if (!Number.isFinite(px) || px <= 0) return '—';
  return `$${px.toLocaleString(undefined, { maximumFractionDigits: px >= 100 ? 2 : 4 })}`;
}

function pickRows(allMarkets) {
  const bySymbol = new Map((allMarkets || []).map((m) => [m.symbol, m]));
  return PAIRS.map((sym) => bySymbol.get(sym)).filter(Boolean);
}

export default function RegisterLiveMarketPreview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let closed = false;
    let reconnectTimer = null;
    let ws = null;

    marketApi.getMarkets().then((list) => {
      if (closed) return;
      const picked = pickRows(list);
      if (picked.length) setRows(picked);
      setLoading(false);
    }).catch(() => {
      if (!closed) setLoading(false);
    });

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(exchangeWsPath('/api/ws/exchange/markets'));
      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(ev.data);
          if (j.type === 'exchange_markets' && Array.isArray(j.markets)) {
            const picked = pickRows(normalizeMarketsList(j.markets));
            if (picked.length) {
              setRows(picked);
              setLoading(false);
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
  }, []);

  return (
    <div className="space-y-2">
      {loading && !rows.length ? (
        PAIRS.map((sym) => (
          <div key={sym} className="flex items-center justify-between animate-pulse">
            <span className="h-3 w-16 rounded bg-white/10" />
            <div className="flex items-center gap-3">
              <span className="h-3 w-14 rounded bg-white/10" />
              <span className="h-3 w-10 rounded bg-white/10" />
            </div>
          </div>
        ))
      ) : rows.length ? (
        rows.map((t) => {
          const pct = parseFloat(t.priceChangePercent ?? 0);
          const base = t.symbol.replace('USDT', '');
          return (
            <div key={t.symbol} className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{base}/USDT</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-mono">{formatPrice(t.price)}</span>
                <span className={`text-[11px] font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-xs text-white/45">Market data unavailable</p>
      )}
    </div>
  );
}
