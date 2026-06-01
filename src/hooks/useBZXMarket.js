import { useEffect, useMemo, useRef, useState } from 'react';
import { exchangeApiOrigin } from '@/lib/apiBase';
import { exchangeWsPath } from '@/services/marketApi';
const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);
const MAX_TRADES = 50;

const scaleNum = (n, ratio) => {
  if (!ratio || ratio === 1) return Number(n);
  return Number(n) * ratio;
};

const scaleCandle = (c, ratio) => {
  if (!c || ratio === 1 || !ratio) return c;
  return {
    ...c,
    open: scaleNum(c.open, ratio),
    high: scaleNum(c.high, ratio),
    low: scaleNum(c.low, ratio),
    close: scaleNum(c.close, ratio),
  };
};

const scaleOb = (ob, ratio) => {
  if (!ob || ratio === 1 || !ratio) return ob;
  const scaleRow = (r) => [scaleNum(r[0], ratio).toFixed(8), r[1]];
  return {
    asks: (ob.asks || []).map(scaleRow),
    bids: (ob.bids || []).map(scaleRow),
  };
};

const scaleTradesArr = (ts, ratio) => {
  if (!ts || ratio === 1 || !ratio) return ts;
  return ts.map((t) => ({ ...t, price: scaleNum(t.price, ratio) }));
};

export function useBZXMarket({ symbol = 'BZXUSDT', interval = '1m', enabled = true } = {}) {
  const [candles, setCandles] = useState([]);
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [ticker, setTicker] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const retryRef = useRef(0);
  const ratioRef = useRef(1);

  // Clear data immediately when symbol/interval changes
  useEffect(() => {
    setCandles([]);
    setOrderbook({ bids: [], asks: [] });
    setTrades([]);
    setTicker(null);
    setError(null);
    ratioRef.current = 1;
  }, [symbol, interval]);

  // REST Bootstrap + WS connection in a single effect to handle reconnections properly
  useEffect(() => {
    if (!enabled) return undefined;

    const sym = String(symbol).toUpperCase();
    const iv = String(interval).toLowerCase();
    const abortController = new AbortController();
    let dead = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const [cRes, obRes, trRes, tkRes] = await Promise.all([
          fetch(`${API}/api/bzx/candles?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(iv)}&limit=200`, { signal: abortController.signal }),
          fetch(`${API}/api/bzx/orderbook?symbol=${encodeURIComponent(sym)}`, { signal: abortController.signal }),
          fetch(`${API}/api/bzx/trades?symbol=${encodeURIComponent(sym)}&limit=20`, { signal: abortController.signal }),
          fetch(`${API}/api/bzx/ticker?symbol=${encodeURIComponent(sym)}`, { signal: abortController.signal }),
        ]);
        if (dead) return;
        if (!cRes.ok || !obRes.ok || !trRes.ok || !tkRes.ok) {
          const bad = [cRes, obRes, trRes, tkRes].find((r) => !r.ok);
          let detail = bad ? `Market API ${bad.status}` : 'Market API error';
          try {
            const errBody = bad ? await bad.json() : null;
            if (errBody?.detail) detail = typeof errBody.detail === 'string' ? errBody.detail : detail;
          } catch {
            // ignore parse errors
          }
          throw new Error(detail);
        }
        const [cData, obData, trData, tkData] = await Promise.all([
          cRes.json(),
          obRes.json(),
          trRes.json(),
          tkRes.json(),
        ]);
        if (dead) return;

        const tk = tkData && typeof tkData === 'object' ? tkData : null;
        let r = 1;
        if (tk && tk.price && Array.isArray(cData) && cData.length > 0) {
          const lastClose = Number(cData[cData.length - 1].close);
          if (lastClose > 0) r = Number(tk.price) / lastClose;
        }
        if (!Number.isFinite(r) || r <= 0) r = 1;
        ratioRef.current = r;

        setCandles(Array.isArray(cData) ? cData.map(c => scaleCandle(c, r)) : []);
        setOrderbook(scaleOb(obData && typeof obData === 'object' ? { bids: obData.bids || [], asks: obData.asks || [] } : { bids: [], asks: [] }, r));
        setTrades(Array.isArray(trData) ? scaleTradesArr(trData, r) : []);
        setTicker(tk);
        setLoading(false);
      } catch (err) {
        if (!dead && err.name !== 'AbortError') {
          setCandles([]);
          setOrderbook({ bids: [], asks: [] });
          setTrades([]);
          setTicker(null);
          setError(err.message || 'Failed to load market data');
          setLoading(false);
        }
      }
    }

    const connectWS = () => {
      if (dead) return;
      const url = exchangeWsPath(`/api/ws/bzx-market?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(iv)}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (!msg || typeof msg !== 'object') return;
          if (msg.type === 'snapshot') {
            const tk = msg.ticker || null;
            let r = 1;
            const msgCandles = Array.isArray(msg.candles) ? msg.candles : [];
            if (tk && tk.price && msgCandles.length > 0) {
               const lastClose = Number(msgCandles[msgCandles.length - 1].close);
               if (lastClose > 0) r = Number(tk.price) / lastClose;
            }
            if (!Number.isFinite(r) || r <= 0) r = 1;
            ratioRef.current = r;

            setCandles(msgCandles.map(c => scaleCandle(c, r)));
            setOrderbook(scaleOb(msg.orderbook && typeof msg.orderbook === 'object' ? { bids: msg.orderbook.bids || [], asks: msg.orderbook.asks || [] } : { bids: [], asks: [] }, r));
            setTrades(Array.isArray(msg.trades) ? scaleTradesArr(msg.trades, r) : []);
            setTicker(tk);
            return;
          }
          if (msg.type === 'candle' && msg.candle) {
            const scaled = scaleCandle(msg.candle, ratioRef.current);
            setCandles((prev) => {
              const next = [...prev];
              const idx = next.findIndex((c) => Number(c.time) === Number(scaled.time));
              if (idx >= 0) next[idx] = scaled;
              else next.push(scaled);
              return next.slice(-500);
            });
          } else if (msg.type === 'orderbook') {
            setOrderbook(scaleOb({ bids: msg.bids || [], asks: msg.asks || [] }, ratioRef.current));
          } else if (msg.type === 'trade') {
            const scaledRow = scaleTradesArr([{
              side: msg.side,
              price: msg.price,
              qty: msg.qty,
              timestamp: msg.timestamp,
            }], ratioRef.current)[0];
            setTrades((prev) => [scaledRow, ...prev].slice(0, MAX_TRADES));
          } else if (msg.type === 'ticker') {
            setTicker(msg);
          }
        } catch {
          // Ignore malformed frame.
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        if (dead) return;
        retryRef.current += 1;
        if (retryRef.current > 8) return;
        const delay = Math.min(15000, 1000 * 2 ** retryRef.current);
        reconnectRef.current = setTimeout(() => {
          bootstrap().then(() => connectWS());
        }, delay);
      };
    };

    // Initial flow: Bootstrap REST -> Connect WS
    bootstrap().then(() => {
      if (!dead) connectWS();
    });

    return () => {
      dead = true;
      abortController.abort();
      setConnected(false);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // noop
        }
      }
    };
  }, [symbol, interval, enabled]);

  return useMemo(
    () => ({ candles, orderbook, trades, ticker, connected, loading, error }),
    [candles, orderbook, trades, ticker, connected, loading, error],
  );
}

export default useBZXMarket;
