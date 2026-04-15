import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { exchangeWsPath } from '@/services/marketApi';
import {
  formatApiDetail,
  parseFastApi422FieldErrors,
  AuthRequestError,
  authFormBannerMessage,
} from '@/lib/authValidation';
import { exchangeApiOrigin } from '@/lib/apiBase';

const AuthContext = createContext(null);

const API = exchangeApiOrigin(import.meta.env.VITE_BACKEND_URL);

// ── Storage helpers ───────────────────────────────────────────────────────────

const store = {
  getUser:  () => { try { return JSON.parse(localStorage.getItem('bitzx_ex_user') || 'null'); } catch { return null; } },
  getToken: () => localStorage.getItem('bitzx_ex_token') || null,
  setUser:  (u) => localStorage.setItem('bitzx_ex_user', JSON.stringify(u)),
  setToken: (t) => localStorage.setItem('bitzx_ex_token', t),
  clear:    () => {
    localStorage.removeItem('bitzx_ex_token');
    localStorage.removeItem('bitzx_ex_user');
  },
};

// ── Authenticated fetch utility (exported for use in pages/components) ────────

export function getStoredExchangeToken() {
  return store.getToken();
}

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function throwAuthFailure(res, data, fallbackMessage) {
  const fe422 = res.status === 422 ? parseFastApi422FieldErrors(data?.detail) : {};
  const hasFields = Object.keys(fe422).length > 0;
  const hint = data?.hint && typeof data.hint === 'string' ? ` ${data.hint.trim()}` : '';
  const detailMsg = (formatApiDetail(data?.detail) || fallbackMessage) + hint;
  const banner = authFormBannerMessage(hasFields ? fe422 : {}, detailMsg);
  throw new AuthRequestError(banner, {
    fieldErrors: hasFields ? fe422 : null,
    status: res.status,
  });
}

function bodyShouldBeJsonStringified(body) {
  if (body == null || typeof body !== 'object') return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return false;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return false;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return false;
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return false;
  const proto = Object.getPrototypeOf(body);
  return proto === Object.prototype || proto === null;
}

export function authFetch(url, options = {}) {
  const token = store.getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (!isFormData && bodyShouldBeJsonStringified(body)) {
    body = JSON.stringify(body);
  }
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers, body });
}

// ── Wallet transform helper ───────────────────────────────────────────────────

function transformWallet(walletAssets) {
  const balance = {};
  const lockedBalance = {};
  for (const w of walletAssets) {
    balance[w.asset]       = w.available;
    lockedBalance[w.asset] = w.locked;
  }
  return { balance, lockedBalance };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(store.getUser);
  const [walletAssets,  setWalletAssets]  = useState([]);
  const [balance,       setBalance]       = useState({});     // available only — for TradeForm backward compat
  const [lockedBalance, setLockedBalance] = useState({});
  const [walletLoading, setWalletLoading] = useState(false);

  // Orders (fetched from API — no more client-side simulation)
  const [openOrders,    setOpenOrders]    = useState([]);
  const [orderHistory,  setOrderHistory]  = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [userTrades,    setUserTrades]    = useState([]);
  const [userTradesLoading, setUserTradesLoading] = useState(false);
  /** Spot P&L rows from `/api/portfolio/positions`; `null` until first REST or account WS message. */
  const [liveSpotPositions, setLiveSpotPositions] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  // KYC status
  const [kyc, setKyc] = useState(null);

  const [impersonationActive, setImpersonationActive] = useState(false);
  const [impersonatorAdminId, setImpersonatorAdminId] = useState(null);
  const [userFeaturesPaused, setUserFeaturesPaused] = useState(false);
  const [userTradingPaused, setUserTradingPaused] = useState(false);
  const [userPauseNote, setUserPauseNote] = useState(null);

  const refreshSession = useCallback(async () => {
    const token = store.getToken();
    if (!token) {
      setImpersonationActive(false);
      setImpersonatorAdminId(null);
      setUserFeaturesPaused(false);
      setUserTradingPaused(false);
      setUserPauseNote(null);
      return;
    }
    try {
      const res = await authFetch(`${API}/api/auth/session`);
      if (!res.ok) return;
      const s = await res.json();
      setImpersonationActive(!!s.impersonation_active);
      setImpersonatorAdminId(s.impersonator_admin_id ?? null);
      setUserFeaturesPaused(!!s.user_features_paused);
      setUserTradingPaused(!!s.user_trading_paused);
      setUserPauseNote(s.user_pause_note ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Fetch KYC status ──────────────────────────────────────────────────────
  const fetchKyc = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/kyc/status`);
      if (res.ok) setKyc(await res.json());
    } catch { /* silent */ }
  }, []);

  // ── Fetch wallet ──────────────────────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res  = await authFetch(`${API}/api/wallet/balances`);
      if (!res.ok) return;
      const data = await res.json();
      setWalletAssets(data);
      const { balance: b, lockedBalance: lb } = transformWallet(data);
      setBalance(b);
      setLockedBalance(lb);
    } catch { /* silent */ }
    finally { setWalletLoading(false); }
  }, []);

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const [openRes, histRes] = await Promise.all([
        authFetch(`${API}/api/orders`),
        authFetch(`${API}/api/orders/history`),
      ]);
      if (openRes.ok)  setOpenOrders(await openRes.json());
      if (histRes.ok)  setOrderHistory(await histRes.json());
    } catch { /* silent */ }
    finally { setOrdersLoading(false); }
  }, []);

  const fetchUserTrades = useCallback(async () => {
    setUserTradesLoading(true);
    try {
      const res = await authFetch(`${API}/api/orders/trades`);
      if (res.ok) setUserTrades(await res.json());
    } catch { /* silent */ }
    finally { setUserTradesLoading(false); }
  }, []);

  const fetchLiveSpotPositions = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/portfolio/positions`);
      if (res.ok) setLiveSpotPositions(await res.json());
    } catch { /* silent */ }
  }, []);

  // ── Live account stream (wallet + orders + fills + spot positions); auto-reconnect like market WS ─
  useEffect(() => {
    if (!user) return undefined;
    const token = store.getToken();
    if (!token) return undefined;

    const url = exchangeWsPath(`/api/ws/exchange/account?token=${encodeURIComponent(token)}`);
    let closed = false;
    let reconnectTimer = null;
    let ws = null;

    const applyAccountMessage = (msg) => {
      if (msg.type !== 'exchange_account') return;
      if (Array.isArray(msg.wallet)) {
        setWalletAssets(msg.wallet);
        const { balance: b, lockedBalance: lb } = transformWallet(msg.wallet);
        setBalance(b);
        setLockedBalance(lb);
      }
      if (Array.isArray(msg.open_orders)) setOpenOrders(msg.open_orders);
      if (Array.isArray(msg.order_history)) setOrderHistory(msg.order_history);
      if (Array.isArray(msg.user_trades)) setUserTrades(msg.user_trades);
      if (Array.isArray(msg.positions)) setLiveSpotPositions(msg.positions);
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        if (!closed) reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }
      ws.onmessage = (ev) => {
        if (closed) return;
        try {
          applyAccountMessage(JSON.parse(ev.data));
        } catch { /* ignore */ }
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
        } catch { /* ignore */ }
      }
    };
  }, [user?.uid]);

  // ── On mount: validate stored token, then load wallet + orders ────────────
  useEffect(() => {
    const token = store.getToken();
    if (!token) { setAuthLoading(false); return; }

    authFetch(`${API}/api/auth/me`)
      .then(res => { if (!res.ok) throw new Error('Token invalid'); return res.json(); })
      .then(userData => {
        setUser(userData);
        store.setUser(userData);
        return Promise.all([
          fetchWallet(),
          fetchOrders(),
          fetchUserTrades(),
          fetchLiveSpotPositions(),
          fetchKyc(),
          refreshSession(),
        ]);
      })
      .catch(() => { store.clear(); setUser(null); })
      .finally(() => setAuthLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await authFetch(`${API}/api/auth/login`, {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throwAuthFailure(res, data, 'Login failed');
    store.setToken(data.access_token);
    store.setUser(data.user);
    setUser(data.user);
    await Promise.all([
      fetchWallet(),
      fetchOrders(),
      fetchUserTrades(),
      fetchLiveSpotPositions(),
      fetchKyc(),
      refreshSession(),
    ]);
    return data.user;
  }, [fetchWallet, fetchOrders, fetchUserTrades, fetchLiveSpotPositions, fetchKyc, refreshSession]);

  // ── Register (one-step) ─────────────────────────────────────────────────────
  const applyTokenResponse = useCallback(async (data) => {
    store.setToken(data.access_token);
    store.setUser(data.user);
    setUser(data.user);
    await Promise.all([
      fetchWallet(),
      fetchOrders(),
      fetchUserTrades(),
      fetchLiveSpotPositions(),
      fetchKyc(),
      refreshSession(),
    ]);
    return data.user;
  }, [fetchWallet, fetchOrders, fetchUserTrades, fetchLiveSpotPositions, fetchKyc, refreshSession]);

  const register = useCallback(async (name, email, password) => {
    const payload = {
      name: String(name ?? '').trim(),
      email: String(email ?? '').trim(),
      password: String(password ?? ''),
    };
    const body = JSON.stringify(payload);
    const res = await authFetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body,
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throwAuthFailure(res, data, 'Registration failed');
    return applyTokenResponse(data);
  }, [applyTokenResponse]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    store.clear();
    setUser(null);
    setWalletAssets([]); setBalance({}); setLockedBalance({});
    setOpenOrders([]); setOrderHistory([]);
    setUserTrades([]);
    setLiveSpotPositions(null);
    setKyc(null);
    setImpersonationActive(false);
    setImpersonatorAdminId(null);
    setUserFeaturesPaused(false);
    setUserTradingPaused(false);
    setUserPauseNote(null);
  }, []);

  const updateUser = useCallback((next) => {
    setUser((prev) => {
      const merged = typeof next === 'function' ? next(prev) : { ...prev, ...next };
      if (merged) store.setUser(merged);
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, authLoading, updateUser,
      // Wallet
      walletAssets, balance, lockedBalance, walletLoading, fetchWallet,
      // Orders & fills (read-only — mutations via API; live updates via /ws/exchange/account)
      openOrders, orderHistory, ordersLoading, fetchOrders,
      userTrades, userTradesLoading, fetchUserTrades,
      liveSpotPositions, fetchLiveSpotPositions,
      // KYC
      kyc, fetchKyc,
      // Auth
      login, register, logout,
      impersonationActive, impersonatorAdminId, refreshSession,
      userFeaturesPaused, userTradingPaused, userPauseNote,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
