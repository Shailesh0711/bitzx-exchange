import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  futuresApi,
  openAccountWs,
  openMarketsWs,
  openOrderbookWs,
} from '@/services/futuresApi';

/**
 * FuturesContext
 *
 * Source of truth contract:
 *   - The URL (`/futures/:symbol`) owns the active symbol.
 *   - Page calls `setActiveSymbol(symbol)` whenever `useParams().symbol` changes.
 *   - The provider does NOT mutate the URL on its own (that caused the
 *     pair-switch race — selecting a new symbol re-mounted the WS, which
 *     synced the old cache back to the URL).
 *
 * Three WebSocket feeds:
 *   - markets   (public, all symbols)  → mark/index price for header & PnL
 *   - orderbook (public, active symbol) → bids/asks/recent trades
 *   - account   (auth, per-user)       → wallet/positions/open/history
 */

const FuturesContext = createContext(null);

export function FuturesProvider({ children }) {
  const { user } = useAuth();

  const [symbols, setSymbols] = useState([]);
  const [leverageOptions, setLeverageOptions] = useState([1, 5, 10, 20, 50, 100]);
  const [activeSymbol, setActiveSymbol] = useState(null);

  const [markets, setMarkets] = useState({});
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);

  const [wallet, setWallet] = useState(null);
  const [positions, setPositions] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [userTrades, setUserTrades] = useState([]);
  const [settings, setSettings] = useState({});

  // ── Catalog (load once) ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    futuresApi.listSymbols()
      .then((data) => {
        if (cancelled) return;
        setSymbols(data?.symbols || []);
        setLeverageOptions(data?.leverage_options || [1, 5, 10, 20, 50, 100]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── Markets WS (public, fan-out for every supported symbol) ───────────
  const marketsWsRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let ws = null;
    let timer = null;

    const connect = () => {
      if (cancelled) return;
      ws = openMarketsWs((msg) => {
        if (msg?.type !== 'futures_markets') return;
        const next = {};
        for (const m of msg.markets || []) next[m.symbol] = m;
        setMarkets((prev) => ({ ...prev, ...next }));
      });
      marketsWsRef.current = ws;
      ws.onclose = () => { if (!cancelled) timer = setTimeout(connect, 3000); };
    };
    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, []);

  // ── Binance public miniTicker WS — live index prices ──────────────────
  // The backend mark-price worker may lag or be unreachable.  Binance's
  // public stream (no API key, CORS-open for WebSocket) gives us a
  // sub-second index feed directly in the browser.
  //
  // Rule: always overwrite `index_price` with the Binance live price.
  //       Only overwrite `mark_price` when the backend hasn't supplied one
  //       yet (i.e. mark_price is 0 / absent) — the backend's blended mark
  //       takes precedence for PnL / liquidation math once it arrives.
  //
  // Symbol mapping: futures "BTCUSDT-PERP" → Binance "btcusdt" (strip -PERP).
  useEffect(() => {
    // Build stream list from the known futures symbols.
    const FUTURES_SYMBOLS = [
      'BTCUSDT-PERP', 'ETHUSDT-PERP', 'BNBUSDT-PERP', 'SOLUSDT-PERP',
      'XRPUSDT-PERP', 'DOGEUSDT-PERP', 'ADAUSDT-PERP', 'POLUSDT-PERP',
      'AVAXUSDT-PERP', 'DOTUSDT-PERP',
    ];
    // binance stream name → futures symbol
    const binToFut = {};
    for (const sym of FUTURES_SYMBOLS) {
      const binSym = sym.replace('-PERP', '').toLowerCase();
      binToFut[binSym] = sym;
    }
    const streams = Object.keys(binToFut).map(s => `${s}@miniTicker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    let cancelled   = false;
    let ws          = null;
    let timer       = null;
    // Throttle: buffer incoming prices and flush to state max every 300 ms.
    // This prevents every single tick (~100 ms) from triggering a React
    // re-render and causing the header / trade-form to "jump" visually.
    const pendingPrices = {};
    let flushTimer = null;

    const flush = () => {
      flushTimer = null;
      const snapshot = { ...pendingPrices };
      for (const k in pendingPrices) delete pendingPrices[k];
      setMarkets((prev) => {
        const next = { ...prev };
        for (const [sym, px] of Object.entries(snapshot)) {
          const existing = next[sym] || {};
          next[sym] = {
            ...existing,
            symbol:      sym,
            index_price: px,
            mark_price:  existing.mark_price > 0 ? existing.mark_price : px,
          };
        }
        return next;
      });
    };

    const connect = () => {
      if (cancelled) return;
      try {
        ws = new WebSocket(url);
        ws.onmessage = (e) => {
          try {
            const msg  = JSON.parse(e.data);
            const tick = msg?.data;
            if (!tick?.s || !tick?.c) return;
            const futSym = binToFut[tick.s.toLowerCase()];
            if (!futSym) return;
            const price = parseFloat(tick.c);
            if (!price || price <= 0) return;
            // Buffer and schedule a batched flush
            pendingPrices[futSym] = price;
            if (!flushTimer) flushTimer = setTimeout(flush, 300);
          } catch { /* ignore parse errors */ }
        };
        ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
        ws.onclose = () => {
          if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
          if (!cancelled) timer = setTimeout(connect, 4000);
        };
      } catch { /* ignore — connect will retry */ }
    };
    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (flushTimer) clearTimeout(flushTimer);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, []);

  // ── Orderbook WS (per active symbol) ──────────────────────────────────
  useEffect(() => {
    if (!activeSymbol) return undefined;
    let cancelled = false;
    let ws = null;
    let timer = null;
    let markTimer = null;

    setOrderbook({ bids: [], asks: [] });
    setRecentTrades([]);

    // Seed headline/orderbook sections immediately on symbol switch so
    // the header never stays empty while WS reconnects.
    const refreshMark = () => {
      futuresApi.markPrice(activeSymbol)
        .then((snap) => {
          if (cancelled || !snap) return;
          setMarkets((prev) => ({ ...prev, [activeSymbol]: { ...(prev[activeSymbol] || {}), ...snap } }));
        })
        .catch(() => {});
    };
    refreshMark();
    // Keep mark/index fresh even when WS source gets temporarily stale.
    markTimer = setInterval(refreshMark, 2000);
    futuresApi.marketTrades(activeSymbol, 30)
      .then((snap) => {
        if (cancelled) return;
        const rows = Array.isArray(snap?.trades) ? snap.trades : [];
        if (rows.length) setRecentTrades(rows);
      })
      .catch(() => {});
    futuresApi.orderbook(activeSymbol, 25)
      .then((snap) => {
        if (cancelled) return;
        if (snap?.book) setOrderbook(snap.book);
      })
      .catch(() => {});

    const connect = () => {
      if (cancelled) return;
      ws = openOrderbookWs(activeSymbol, (msg) => {
        if (msg?.type !== 'futures_orderbook') return;
        if (msg.symbol !== activeSymbol) return;
        setOrderbook(msg.book || { bids: [], asks: [] });
        setRecentTrades(msg.recent_trades || []);
      });
      ws.onclose = () => { if (!cancelled) timer = setTimeout(connect, 3000); };
    };
    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (markTimer) clearInterval(markTimer);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, [activeSymbol]);

  // ── Account WS (per logged-in user) ───────────────────────────────────
  useEffect(() => {
    if (!user) {
      setWallet(null); setPositions([]); setOpenOrders([]);
      setOrderHistory([]); setUserTrades([]);
      return undefined;
    }
    let cancelled = false;
    let ws = null;
    let timer = null;

    const connect = () => {
      if (cancelled) return;
      ws = openAccountWs((msg) => {
        if (msg?.type !== 'futures_account') return;
        setWallet(msg.wallet);
        setPositions(msg.positions || []);
        setOpenOrders(msg.open_orders || []);
        setOrderHistory(msg.order_history || []);
        setUserTrades(msg.user_trades || []);
      });
      if (ws) ws.onclose = () => { if (!cancelled) timer = setTimeout(connect, 3000); };
    };
    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, [user]);

  // ── Settings (per symbol) ─────────────────────────────────────────────
  const fetchSettings = useCallback(async (symbol) => {
    if (!user || !symbol) return null;
    try {
      const s = await futuresApi.settings(symbol);
      setSettings((prev) => ({ ...prev, [symbol]: s }));
      return s;
    } catch { return null; }
  }, [user]);

  useEffect(() => {
    if (activeSymbol && user) fetchSettings(activeSymbol);
  }, [activeSymbol, user, fetchSettings]);

  const setLeverage = useCallback(async (symbol, leverage) => {
    const res = await futuresApi.setLeverage({ symbol, leverage });
    setSettings((prev) => ({ ...prev, [symbol]: { ...(prev[symbol] || {}), ...res } }));
    return res;
  }, []);

  const setMarginMode = useCallback(async (symbol, mode) => {
    const res = await futuresApi.setMarginMode({ symbol, mode });
    setSettings((prev) => ({ ...prev, [symbol]: { ...(prev[symbol] || {}), ...res } }));
    return res;
  }, []);

  const placeOrder    = useCallback((body) => futuresApi.placeOrder(body), []);
  const cancelOrder   = useCallback((orderId) => futuresApi.cancelOrder(orderId), []);
  const closePosition = useCallback((body) => futuresApi.closePosition(body), []);
  const transfer      = useCallback((body) => futuresApi.transfer(body), []);
  const syncLocked    = useCallback(() => futuresApi.syncLocked(), []);

  const value = useMemo(() => ({
    symbols, leverageOptions, activeSymbol, setActiveSymbol,
    markets, orderbook, recentTrades,
    wallet, positions, openOrders, orderHistory, userTrades,
    settings, setLeverage, setMarginMode,
    placeOrder, cancelOrder, closePosition, transfer, syncLocked,
    activeMark: activeSymbol ? markets[activeSymbol] : null,
  }), [
    symbols, leverageOptions, activeSymbol, markets, orderbook, recentTrades,
    wallet, positions, openOrders, orderHistory, userTrades, settings,
    setLeverage, setMarginMode, placeOrder, cancelOrder, closePosition, transfer, syncLocked,
  ]);

  return <FuturesContext.Provider value={value}>{children}</FuturesContext.Provider>;
}

export function useFutures() {
  const ctx = useContext(FuturesContext);
  if (!ctx) throw new Error('useFutures must be used inside <FuturesProvider>');
  return ctx;
}
