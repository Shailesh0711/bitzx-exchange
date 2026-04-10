import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

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

export function authFetch(url, options = {}) {
  const token = store.getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
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

  const [authLoading, setAuthLoading] = useState(true);

  // KYC status
  const [kyc, setKyc] = useState(null);

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

  // ── On mount: validate stored token, then load wallet + orders ────────────
  useEffect(() => {
    const token = store.getToken();
    if (!token) { setAuthLoading(false); return; }

    authFetch(`${API}/api/auth/me`)
      .then(res => { if (!res.ok) throw new Error('Token invalid'); return res.json(); })
      .then(userData => {
        setUser(userData);
        store.setUser(userData);
        return Promise.all([fetchWallet(), fetchOrders(), fetchKyc()]);
      })
      .catch(() => { store.clear(); setUser(null); })
      .finally(() => setAuthLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await authFetch(`${API}/api/auth/login`, {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    store.setToken(data.access_token);
    store.setUser(data.user);
    setUser(data.user);
    await Promise.all([fetchWallet(), fetchOrders(), fetchKyc()]);
    return data.user;
  }, [fetchWallet, fetchOrders, fetchKyc]);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    const res  = await authFetch(`${API}/api/auth/register`, {
      method: 'POST', body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    store.setToken(data.access_token);
    store.setUser(data.user);
    setUser(data.user);
    await fetchWallet();
    return data.user;
  }, [fetchWallet]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    store.clear();
    setUser(null);
    setWalletAssets([]); setBalance({}); setLockedBalance({});
    setOpenOrders([]); setOrderHistory([]);
    setKyc(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, authLoading,
      // Wallet
      walletAssets, balance, lockedBalance, walletLoading, fetchWallet,
      // Orders (read-only state — mutations go through API in TradeForm / OpenOrders)
      openOrders, orderHistory, ordersLoading, fetchOrders,
      // KYC
      kyc, fetchKyc,
      // Auth
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
