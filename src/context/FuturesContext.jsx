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

  // ── Orderbook WS (per active symbol) ──────────────────────────────────
  useEffect(() => {
    if (!activeSymbol) return undefined;
    let cancelled = false;
    let ws = null;
    let timer = null;

    setOrderbook({ bids: [], asks: [] });
    setRecentTrades([]);

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

  const value = useMemo(() => ({
    symbols, leverageOptions, activeSymbol, setActiveSymbol,
    markets, orderbook, recentTrades,
    wallet, positions, openOrders, orderHistory, userTrades,
    settings, setLeverage, setMarginMode,
    placeOrder, cancelOrder, closePosition, transfer,
    activeMark: activeSymbol ? markets[activeSymbol] : null,
  }), [
    symbols, leverageOptions, activeSymbol, markets, orderbook, recentTrades,
    wallet, positions, openOrders, orderHistory, userTrades, settings,
    setLeverage, setMarginMode, placeOrder, cancelOrder, closePosition, transfer,
  ]);

  return <FuturesContext.Provider value={value}>{children}</FuturesContext.Provider>;
}

export function useFutures() {
  const ctx = useContext(FuturesContext);
  if (!ctx) throw new Error('useFutures must be used inside <FuturesProvider>');
  return ctx;
}
